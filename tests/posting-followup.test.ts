import assert from 'node:assert/strict';
import { describe,it } from 'node:test';
import { formatJobSchedule,getJobScheduleError,manilaDate,parseLegacyJobSchedule,scheduleFromColumns,scheduleToColumns } from '@/services/job-schedule';
import { getPriceSliderMaximum,moveRateThumb } from '@/services/pricing';
import { getJobRepairIssues,getServiceRepairIssues } from '@/services/listing-repair';
import { validateJobPayload } from '@/services/listing-validation';
import { runtimeService } from './helpers/runtime-service';
import { serviceDraftToReview } from '@/services/posting-review';
import type { JobSchedule,JobDraftSummary,ServiceDraftSummary } from '@/types/marketplace.types';

const schedule:JobSchedule={date:'2050-11-15',timePreference:'exact',exactTime:'09:30',flexibility:'flexible',timeZone:'Asia/Manila'};
describe('structured schedule and compatibility',()=>{
  it('stores schedule independently of its readable language',()=>{
    const job={title:'Home help',description:'Careful cleaning needed',category:'Home & Local Help',serviceNeeded:'Cleaning',barangay:'San Pedro',budgetMin:200,budgetMax:500,rateType:'per_job' as const,workersNeeded:1,schedule};
    assert.equal(validateJobPayload({...job,scheduleText:'Ang umaga, maaaring pag-usapan'}),null);
    assert.equal(validateJobPayload({...job,scheduleText:''}),null);
    assert.equal(scheduleFromColumns(scheduleToColumns(schedule))?.exactTime,'09:30');
  });
  it('handles Philippine midnight independently of the host timezone',()=>{
    assert.equal(manilaDate(new Date('2026-11-15T15:59:59Z')),'2026-11-15');
    assert.equal(manilaDate(new Date('2026-11-15T16:00:00Z')),'2026-11-16');
    assert.ok(getJobScheduleError({...schedule,date:'2026-11-15'},new Date('2026-11-15T16:00:00Z')));
  });
  it('never guesses ambiguous or impossible legacy schedules',()=>{
    for(const text of ['Tomorrow morning','Whenever convenient','Feb 30, 2050 · Morning · Can coordinate','15/11/2050']) assert.equal(parseLegacyJobSchedule(text),null);
    const parsed=parseLegacyJobSchedule('Nov 15, 2050 · 12:30 AM · Must be this time')!;
    assert.equal(parsed.exactTime,'00:30');assert.equal(parsed.flexibility,'fixed');
    assert.match(formatJobSchedule({...parsed,exactTime:'12:30'}),/12:30 PM/);
  });
  it('rejects incomplete time preferences and unsupported timezone data',()=>{
    assert.ok(getJobScheduleError({...schedule,exactTime:'25:00'}));
    assert.ok(getJobScheduleError({...schedule,timeZone:'UTC' as 'Asia/Manila'}));
    assert.ok(getJobScheduleError({...schedule,date:'2050-02-30'}));
  });
});
describe('predictable precise pricing',()=>{
  it('starts smaller and expands for exact amounts without a publishing cap',()=>{
    assert.equal(getPriceSliderMaximum(null,null),1000);
    assert.equal(getPriceSliderMaximum(200.25,500.75),1000);
    assert.equal(getPriceSliderMaximum(20000,25000.25),26000);
  });
  it('rounds only the moved thumb to fifty-peso increments',()=>{
    const current={minimum:200.25,maximum:500.75};
    assert.deepEqual(moveRateThumb(current,'minimum',253,0,1000,50),{minimum:250,maximum:500.75});
    assert.deepEqual(moveRateThumb(current,'maximum',648,0,1000,50),{minimum:200.25,maximum:650});
    assert.deepEqual(current,{minimum:200.25,maximum:500.75});
  });
  it('prevents crossing and supports equal fixed-price bounds',()=>{
    assert.deepEqual(moveRateThumb({minimum:200,maximum:500},'minimum',900,0,1000,50),{minimum:500,maximum:500});
    assert.deepEqual(moveRateThumb({minimum:200,maximum:500},'maximum',50,0,1000,50),{minimum:200,maximum:200});
  });
});
describe('actual optimistic draft repository',()=>{
  type Repository={saveOwnDraftRow(args:object):Promise<{data:unknown;error:string|null}>};
  function fixture() {
    const filters:unknown[][]=[];let updated=false;
    const query={update:()=>{updated=true;return query;},eq:(...args:unknown[])=>{filters.push(args);return query;},select:()=>query,maybeSingle:async()=>({data:null,error:null})};
    const service=runtimeService<Repository>('@/services/marketplace-draft.repository',{'@/services/marketplace.helpers':{getCurrentUserId:async()=>({data:'owner',error:null})},'@/utils/supabase':{supabase:{from:()=>query}}});
    return {service,filters,wasUpdated:()=>updated};
  }
  it('sends owner, draft ID and expected revision together',async()=>{
    const {service,filters}=fixture();const result=await service.saveOwnDraftRow({table:'job_drafts',columns:'id,revision',draftId:'draft',expectedRevision:3,payload:{title:'Private change'}});
    assert.deepEqual(filters,[['id','draft'],['revision',3],['user_id','owner']]);
    assert.match(result.error!,/changed in another session/);
  });
  it('refuses an existing-draft save with no known revision',async()=>{
    const {service,wasUpdated}=fixture();const result=await service.saveOwnDraftRow({table:'service_drafts',columns:'id',draftId:'draft',payload:{title:'Private change'}});
    assert.ok(result.error);assert.equal(wasUpdated(),false);
  });
});
describe('review commit and correction contracts',()=>{
  it('retains the service edit identity and reviewed revision',()=>{
    const draft={id:'private-edit',sourceListingId:'original-service',sourceVersion:7,revision:4,rateMin:200.25,rateMax:500.75} as ServiceDraftSummary;
    const review=serviceDraftToReview(draft);
    assert.equal(review.sourceListingId,'original-service');
    assert.equal(review.revision,4);
    assert.equal(review.rateMax,'500.75');
  });
  it('passes the reviewed revision to the atomic server commit',async()=>{
    const calls:unknown[]=[];
    const service=runtimeService<{publishJobDraft(id:string,revision:number):Promise<unknown>}>('@/services/posting-publish.service',{
      '@/services/profile-completion.service':{requireVerifiedCompleteProfile:async()=>({data:'owner',error:null})},
      '@/utils/supabase':{supabase:{rpc:async(...args:unknown[])=>{calls.push(args);return {data:'same-listing',error:null};}}},
      '@/services/job.service':{getJobDetail:async()=>({data:{id:'same-listing'},error:null})},'@/services/service-profile.service':{},
    });
    await service.publishJobDraft('private-edit',4);
    assert.deepEqual(JSON.parse(JSON.stringify(calls)),[['commit_job_draft',{p_draft_id:'private-edit',p_expected_revision:4}]]);
  });
  it('reports multiple correctable legacy fields without rewriting data',()=>{
    const row={title:'Older job',description:null,category:'Home & Local Help',serviceNeeded:'Cleaning',barangay:'San Pedro',budgetMin:200,budgetMax:500,workersNeeded:3,scheduleText:'Whenever convenient'} as JobDraftSummary;
    const before=JSON.stringify(row);const issues=getJobRepairIssues(row);
    assert.deepEqual(issues.map(issue=>issue.field),['description','workersNeeded','scheduleText']);assert.equal(JSON.stringify(row),before);
    assert.ok(getServiceRepairIssues({title:'Old offer',description:null,category:'Cleaning',barangay:'San Pedro',rateMin:null,rateMax:null} as ServiceDraftSummary).some(issue=>issue.field==='rateMin'));
  });
});
