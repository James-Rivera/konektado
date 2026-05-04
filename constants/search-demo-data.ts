export const searchModeLabels = {
  jobs: 'Find Jobs',
  workers: 'Find Workers',
} as const;

export type SearchMode = keyof typeof searchModeLabels;

export type PopularService = {
  id: string;
  label: string;
};

export type SearchJobItem = {
  id: string;
  postedAt: string;
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
  clientRatingText: string;
  jobsPostedText: string;
  location: string;
  matchReason: string;
};

export type SearchWorkerItem = {
  id: string;
  name: string;
  statusLine: string;
  rateLine: string;
  headline: string;
  tags: string[];
  ratingText: string;
  jobsDoneText: string;
  location: string;
  matchReason: string;
};

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

function normalizeValue(value: string) {
  return value.trim().toLowerCase();
}

export function getWorkerResultsHeading(query: string, selectedService?: string | null) {
  const source = selectedService ?? normalizeValue(query);
  if (!source) return 'Showing workers near you';
  return `Showing ${source.toLowerCase()} workers near you`;
}
