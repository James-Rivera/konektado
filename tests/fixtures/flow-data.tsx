// Synthetic local I/O for full-screen interaction checks. Never contacts Supabase.
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import type { HiringProfileInput, WorkProfileInput, CoreProfileInput } from '@/types/profile.types';

type Row = Record<string, unknown>;
type Store = { tables:Record<string,Row[]>; offline:boolean; serial:number; publications:Record<string,{id:string;revision:number}>; profile:Record<string,unknown> };
export const owner = '91000000-0000-4000-8000-000000000001';
const key = 'konektado-synthetic-flow-v2';
export const resident = { id:owner, full_name:'Test Resident', first_name:'Test', last_name:'Resident', barangay:'Barangay San Pedro', city:'Santo Tomas', email:'resident@example.invalid', avatar_url:null, verified_at:'2026-11-15', barangay_verified_at:'2026-11-15' };
const core = {firstName:'Test',lastName:'Resident',province:'Batangas',barangay:'Barangay San Pedro',purokSitio:'',street:'Test area',subdivisionArea:'',blockLot:'',houseNumber:'',landmarkNote:'',city:'Santo Tomas',preferredContactMethod:'app_message',about:'',avatarUrl:null};
const work = {headline:'',bio:'Careful home help',offeredServices:['Cleaning'],customOfferedServices:[],serviceArea:'Barangay San Pedro',availability:'Weekends',completedAt:null};
const hiring = {headline:'',bio:'Home help needed',neededServices:['Cleaning'],customNeededServices:[],coordinationStyle:'App messages',preferredSchedule:'Weekends',completedAt:null};
function initial():Store {
  const common = {title:'Original public listing',description:'This description stays public until Save changes.',barangay:'Barangay San Pedro',location_text:'Barangay San Pedro',photo_urls:[],tags:[],allow_messages:true,rate_type:'per_job',created_at:new Date().toISOString(),updated_at:new Date().toISOString(),content_version:1};
  return {serial:0,offline:false,publications:{},profile:{core,work,hiring},tables:{
    jobs:[{...common,id:'job-one',owner_id:owner,client_id:owner,category:'Home & Local Help',service_needed:'Cleaning',budget_min:200,budget_max:500,workers_needed:1,status:'open',scheduled_date:'2050-11-15',time_preference:'morning',schedule_flexibility:'flexible',schedule_timezone:'Asia/Manila',schedule_text:'Nov 15, 2050 · Morning · Can coordinate'}, {...common,id:'job-legacy',owner_id:owner,client_id:owner,category:'Home & Local Help',service_needed:'Cleaning',budget_min:200,budget_max:500,workers_needed:3,status:'open',schedule_text:'Whenever convenient'}],
    services:[{...common,id:'service-one',provider_id:owner,category:'Cleaning',rate_type:'per_visit',rate_min:200.25,rate_max:500.75,is_active:true,availability_text:'Weekends',rate_text:'Supplies included'}],job_drafts:[],service_drafts:[]}};
}
export function readStore():Store { try { return JSON.parse(localStorage.getItem(key) || '') as Store; } catch { return initial(); } }
export function writeStore(value:Store) { localStorage.setItem(key,JSON.stringify(value)); window.dispatchEvent(new Event('qa-store')); }
export function resetStore() { writeStore(initial()); sessionStorage.removeItem('qa-navigation'); window.location.reload(); }
export function useStore() { const [store,setStore] = useState(readStore); useEffect(() => { const update = () => setStore(readStore()); window.addEventListener('qa-store',update); return () => window.removeEventListener('qa-store',update); },[]); return store; }
function failure(message:string) { return {data:null,error:{message,code:'QA_ERROR'}}; }
export const supabase = {
  auth:{getSession:async () => ({data:{session:{user:{id:owner,email:resident.email}}},error:null})},
  from(table:string) {
    let action = 'select'; let payload:Row = {}; const filters:((row:Row) => boolean)[] = []; let single=false;
    const query = {
      select() { return query; }, order() { return query; }, limit() { return query; },
      eq(column:string,value:unknown) { filters.push(row => row[column]===value); return query; },
      in(column:string,values:unknown[]) { filters.push(row => values.includes(row[column])); return query; },
      neq(column:string,value:unknown) { filters.push(row => row[column]!==value); return query; },
      maybeSingle() { single=true; return query; }, single() { single=true; return query; },
      insert(value:Row) { action='insert';payload=value;return query; },
      update(value:Row) { action='update';payload=value;return query; },
      delete() { action='delete'; return query; },
      then(resolve:(value:unknown) => unknown,reject:(reason:unknown) => unknown) {
        return new Promise(done => setTimeout(done,120)).then(() => {
          const store=readStore(); if(store.offline) return failure('Offline: your draft has not saved. Reconnect and retry.');
          const rows=store.tables[table] ?? []; let matching=rows.filter(row => filters.every(filter => filter(row)));
          if(action==='insert') { const row={...payload,id:`draft-${++store.serial}`,user_id:owner,revision:1,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};rows.push(row);matching=[row];store.tables[table]=rows;writeStore(store); }
          if(action==='update') { for(const row of matching) Object.assign(row,payload,{revision:Number(row.revision)+1,updated_at:new Date().toISOString()});writeStore(store); }
          if(action==='delete') { store.tables[table]=rows.filter(row=>!matching.includes(row));writeStore(store); }
          return {data:single ? matching[0] ?? null : matching,error:null};
        }).then(resolve,reject);
      },
    }; return query;
  },
  async rpc(name:string,args:Record<string,unknown> = {}) {
    await new Promise(done => setTimeout(done,120));
    const store=readStore(); if(store.offline) return failure('Offline: reconnect and retry.');
    const kind=name.includes('service') ? 'service' : 'job'; const table=kind==='job'?'jobs':'services'; const drafts=store.tables[kind+'_drafts'];
    if(name.startsWith('begin_')) {
      const source=store.tables[table].find(row=>row.id===args.p_listing_id);if(!source)return failure('Owned listing not found.');
      let draft=drafts.find(row=>row.source_listing_id===source.id);
      if(!draft){draft={...source,id:`draft-${++store.serial}`,source_listing_id:source.id,source_version:source.content_version,user_id:owner,revision:1};drafts.push(draft);writeStore(store);}
      return {data:draft.id,error:null};
    }
    if(name.startsWith('commit_') || name.startsWith('publish_')) {
      const committed=store.publications[String(args.p_draft_id)];if(committed)return committed.revision===args.p_expected_revision ? {data:committed.id,error:null}:failure('This review is out of date.');
      const draft=drafts.find(row=>row.id===args.p_draft_id);if(!draft)return failure('Draft not found.');
      if(draft.revision!==args.p_expected_revision)return failure('This draft changed after review. Reopen it before saving.');
      let listing=store.tables[table].find(row=>row.id===draft.source_listing_id);
      if(listing && listing.content_version!==draft.source_version)return failure('This listing changed in another session. Your draft is safe; reopen the listing before applying changes.');
      if(listing)Object.assign(listing,draft,{id:listing.id,content_version:Number(listing.content_version)+1});
      else {listing={...draft,id:`published-${++store.serial}`,content_version:1,owner_id:owner,client_id:owner,provider_id:owner,status:'open',is_active:true};store.tables[table].push(listing);}
      store.publications[String(draft.id)]={id:String(listing.id),revision:Number(draft.revision)};
      store.tables[kind+'_drafts']=drafts.filter(row=>row!==draft);writeStore(store);return {data:listing.id,error:null};
    }
    if(name.startsWith('restart_')) {
      const draft=drafts.find(row=>row.id===args.p_draft_id);const source=store.tables[table].find(row=>row.id===draft?.source_listing_id);
      if(!draft || !source || draft.revision!==args.p_expected_revision)return failure('This draft changed. Reopen it first.');
      Object.assign(draft,source,{id:draft.id,revision:Number(draft.revision)+1,source_version:source.content_version,editor_state:{}});writeStore(store);return {data:draft.id,error:null};
    }
    return {data:[],error:null};
  },
};
export function useProfile() { return {profile:resident,loading:false,refresh:async()=>{},latestVerificationStatus:'approved'}; }
export function profileStatus() {
  const store=readStore();const mode=(value:Row,fields:string[])=>({state:fields.every(f=>Boolean(value[f]))?'ready':'incomplete',statusLabel:'Ready',percent:100,completedSteps:4,totalSteps:4,missingItems:[],optionalItems:[],nextRecommendedAction:null});
  return {userId:owner,isVerified:true,coreComplete:true,workComplete:true,hiringComplete:true,marketplaceSetupState:'ready',...store.profile,
    coreCompletion:mode(store.profile.core as Row,['firstName','street']),workCompletion:mode(store.profile.work as Row,['bio','availability']),hiringCompletion:mode(store.profile.hiring as Row,['bio','preferredSchedule']),
    verification:{status:'approved',label:'Verified',description:'Synthetic verified resident',reviewerNote:null,submittedAt:null,reviewedAt:null,action:null},legalNameEdit:{canEdit:false,canRequestCorrection:true,state:'verified',message:'Verified name'},photoRecommended:true,missingCore:[],missingWork:[],missingHiring:[]};
}
export const getMyProfileCompletion=async()=>({data:profileStatus(),error:null});
async function saveProfile(mode:string,input:unknown) {const store=readStore();store.profile[mode]=input;writeStore(store);return getMyProfileCompletion();}
export const saveCoreProfile=(input:CoreProfileInput)=>saveProfile('core',input);
export const saveWorkProfile=(input:WorkProfileInput)=>saveProfile('work',input);
export const saveHiringProfile=(input:HiringProfileInput)=>saveProfile('hiring',input);
export const requireVerifiedCompleteProfile=async()=>({data:owner,error:null});
export const addServiceToWorkProfile=async()=>getMyProfileCompletion();
export const isProfileCompletionRequiredError=()=>false;
export const getCompletionModeForError=()=>null;
export const getCompletionTitleForMode=()=> 'Complete profile';
export const getProfileSetupGateMessage=()=> 'Complete your profile before posting.';
export const getJobDetail=async(id:string)=>({data:readStore().tables.jobs.find(row=>row.id===id),error:null});
export const getMyService=async(id:string)=>({data:readStore().tables.services.find(row=>row.id===id),error:null});
export function LocationMapPreview() { return <View accessibilityLabel="Barangay location"><Text>Barangay San Pedro · approximate area</Text></View>; }
