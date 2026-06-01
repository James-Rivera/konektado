export const homeFilters = ['For you', 'Jobs', 'Services'] as const;

export type HomeFilter = (typeof homeFilters)[number];
