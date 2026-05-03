import type { JobCardProps } from '@/components/JobCard';
import type { WorkerCardProps } from '@/components/WorkerCard';

export const homeFilters = ['For you', 'Jobs', 'Workers'];

export const nearbyJobs: JobCardProps[] = [
  {
    title: 'Fix leaking kitchen sink',
    postedBy: 'Marites Santos',
    location: 'Purok 3, Barangay San Pedro',
    schedule: 'Today after 3:00 PM',
    budget: 'PHP 700 budget',
    description:
      'Need someone nearby to check a kitchen sink leak and replace a small connector if needed.',
    tags: ['Plumbing', 'Verified poster', 'Near you'],
    urgent: true,
  },
  {
    title: 'Weekend house cleaning',
    postedBy: 'Ramon Cruz',
    location: 'San Pedro proper',
    schedule: 'Saturday morning',
    budget: 'Rate to discuss',
    description:
      'Small family home needs general cleaning before visitors arrive. Cleaning materials are available.',
    tags: ['Cleaning', 'Verified poster', 'Weekend'],
  },
];

export const nearbyWorkers: WorkerCardProps[] = [
  {
    name: 'Ana Reyes',
    serviceTitle: 'Home cleaning and laundry help',
    location: 'Barangay San Pedro',
    availability: 'Available mornings',
    rating: '4.9 rating',
    completedJobs: '18 jobs done',
    tags: ['Cleaning', 'Laundry'],
    verified: true,
  },
  {
    name: 'Luis Dela Cruz',
    serviceTitle: 'PC repair and home Wi-Fi setup',
    location: 'Purok 2, San Pedro',
    availability: 'On call today',
    rating: '4.8 rating',
    completedJobs: '11 jobs done',
    tags: ['IT support', 'Appliance check'],
    verified: true,
  },
];

export const postStats = [
  { label: 'Open jobs', value: '3' },
  { label: 'Service posts', value: '2' },
  { label: 'Drafts', value: '1' },
];

export const managedPosts = [
  {
    title: 'Repair kitchen cabinet hinge',
    status: 'Open',
    detail: '2 workers messaged. Last update 10 min ago.',
  },
  {
    title: 'Offer: Basic phone setup help',
    status: 'Active service',
    detail: 'Visible to nearby residents looking for tech help.',
  },
  {
    title: 'Paint front gate',
    status: 'Draft',
    detail: 'Add schedule and location before posting.',
  },
];

export const conversations = [
  {
    name: 'Luis Dela Cruz',
    context: 'Fix leaking kitchen sink',
    preview: 'I can check it after 4 PM. Please send the exact landmark.',
    time: '2m',
    status: 'Interested worker',
    unread: true,
    canMarkHired: true,
  },
  {
    name: 'Ana Reyes',
    context: 'Weekend house cleaning',
    preview: 'Saturday morning works for me. I can bring extra cloths.',
    time: '18m',
    status: 'Service chat',
    unread: false,
    canMarkHired: false,
  },
  {
    name: 'Barangay Verification',
    context: 'Account review',
    preview: 'Your verification request is still being checked by the barangay.',
    time: '1h',
    status: 'System update',
    unread: false,
    canMarkHired: false,
  },
];

export const workHistory = [
  {
    title: 'Installed home Wi-Fi router',
    detail: 'Completed for Santos family, Purok 1',
    rating: '5.0',
  },
  {
    title: 'Fixed laptop startup issue',
    detail: 'Completed for barangay resident',
    rating: '4.8',
  },
];

export const hiringHistory = [
  {
    title: 'House cleaning before fiesta',
    detail: 'Ana Reyes marked hired',
    status: 'Completed',
  },
  {
    title: 'Repair leaking sink',
    detail: '2 interested workers in Messages',
    status: 'Open',
  },
];

export const profileServices = ['IT support', 'Phone setup', 'Home Wi-Fi'];
