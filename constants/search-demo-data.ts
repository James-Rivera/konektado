import { demoJobs, demoWorkers } from '@/constants/marketplace-demo-data';

export const searchModeLabels = {
  jobs: 'Find Jobs',
  workers: 'Find Workers',
} as const;

export type SearchMode = keyof typeof searchModeLabels;

export type PopularService = {
  id: string;
  label: string;
};

export type SearchJobItem = (typeof demoJobs)[number];
export type SearchWorkerItem = (typeof demoWorkers)[number];

export const popularServices: PopularService[] = [
  { id: 'cleaning', label: 'Cleaning' },
  { id: 'laundry', label: 'Laundry' },
  { id: 'plumbing', label: 'Plumbing' },
  { id: 'electrical', label: 'Electrical' },
  { id: 'carpentry', label: 'Carpentry' },
  { id: 'appliance-repair', label: 'Appliance Repair' },
  { id: 'pc-repair', label: 'PC Repair' },
  { id: 'phone-setup', label: 'Phone Setup' },
  { id: 'tutoring', label: 'Tutoring' },
  { id: 'gardening', label: 'Gardening' },
  { id: 'painting', label: 'Painting' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'cooking', label: 'Cooking' },
  { id: 'house-helper', label: 'House Helper' },
  { id: 'construction', label: 'Construction' },
  { id: 'repair', label: 'Repair' },
  { id: 'hauling', label: 'Hauling' },
];

export const searchJobs: SearchJobItem[] = [demoJobs[0], demoJobs[2], demoJobs[3]];

export const searchWorkers: SearchWorkerItem[] = demoWorkers;

function normalizeValue(value: string) {
  return value.trim().toLowerCase();
}

function getTerms(query: string, selectedService?: string | null) {
  const queryTerms = normalizeValue(query)
    .split(/\s+/)
    .filter(Boolean);

  if (selectedService) {
    queryTerms.push(normalizeValue(selectedService));
  }

  return [...new Set(queryTerms)];
}

function includesAllTerms(haystack: string, terms: string[]) {
  const normalizedHaystack = normalizeValue(haystack);
  return terms.every((term) => normalizedHaystack.includes(term));
}

export function filterSearchJobs(query: string, selectedService?: string | null) {
  const terms = getTerms(query, selectedService);
  if (!terms.length) return searchJobs;

  return searchJobs.filter((job) =>
    includesAllTerms(
      [
        job.title,
        job.subtitle,
        job.description,
        job.matchReason,
        job.location,
        job.category,
        ...job.tags,
      ].join(' '),
      terms,
    ),
  );
}

export function filterSearchWorkers(query: string, selectedService?: string | null) {
  const terms = getTerms(query, selectedService);
  if (!terms.length) return searchWorkers;

  return searchWorkers.filter((worker) =>
    includesAllTerms(
      [
        worker.name,
        worker.headline,
        worker.rateLine,
        worker.about,
        worker.matchReason,
        worker.location,
        ...worker.services,
        ...worker.tags,
      ].join(' '),
      terms,
    ),
  );
}

export function getWorkerResultsHeading(query: string, selectedService?: string | null) {
  const source = selectedService ?? normalizeValue(query);
  if (!source) return 'Showing workers near you';
  return `Showing ${source.toLowerCase()} workers near you`;
}
