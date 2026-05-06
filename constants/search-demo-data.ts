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
  avatarUrl?: string | null;
  statusLine: string;
  rateLine: string;
  headline: string;
  tags: string[];
  ratingText: string;
  jobsDoneText: string;
  location: string;
  matchReason: string;
  isActive?: boolean;
};

function normalizeValue(value: string) {
  return value.trim().toLowerCase();
}

export function getWorkerResultsHeading(query: string, selectedService?: string | null) {
  const source = selectedService ?? normalizeValue(query);
  if (!source) return 'Showing workers near you';
  return `Showing ${source.toLowerCase()} workers near you`;
}
