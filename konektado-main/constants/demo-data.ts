export const homeFilters = ['For you', 'Jobs', 'Workers'] as const;

export type HomeFilter = (typeof homeFilters)[number];
