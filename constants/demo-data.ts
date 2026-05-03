import { demoJobs, demoWorkers, findDemoJobById, findDemoWorkerById } from '@/constants/marketplace-demo-data';

export const homeFilters = ['For you', 'Jobs', 'Workers'] as const;

export type HomeFilter = (typeof homeFilters)[number];

export type DemoWorkerProfile = (typeof demoWorkers)[number];
export type DemoJobPost = (typeof demoJobs)[number];

export type HomeFeedItem =
  | { key: string; type: 'worker'; item: DemoWorkerProfile }
  | { key: string; type: 'job'; item: DemoJobPost };

export const homeForYouFeed: HomeFeedItem[] = [
  { key: 'worker-adrian', type: 'worker', item: demoWorkers[0] },
  { key: 'job-furniture-event', type: 'job', item: demoJobs[0] },
  { key: 'job-moving-photo', type: 'job', item: demoJobs[1] },
];

export const homeJobsFeed: HomeFeedItem[] = [
  { key: 'job-furniture-event', type: 'job', item: demoJobs[0] },
  { key: 'job-wifi', type: 'job', item: demoJobs[2] },
];

export const homeWorkersFeed: HomeFeedItem[] = [
  { key: 'worker-luis', type: 'worker', item: demoWorkers[1] },
  { key: 'worker-adrian', type: 'worker', item: demoWorkers[0] },
];

export function getHomeFeed(filter: HomeFilter) {
  if (filter === 'Jobs') return homeJobsFeed;
  if (filter === 'Workers') return homeWorkersFeed;
  return homeForYouFeed;
}

export { findDemoJobById, findDemoWorkerById };
