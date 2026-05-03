import type { JobCardProps } from '@/components/JobCard';
import type { WorkerCardProps } from '@/components/WorkerCard';

export const homeFilters = ['For you', 'Jobs', 'Workers'];

export const nearbyJobs: JobCardProps[] = [
  {
    title: 'Moving Furniture',
    postedBy: 'Maria Santos',
    postedAt: '1d ago',
    location: 'Brgy San Pedro (2km)',
    schedule: 'Starts 3:00 PM',
    detail: 'Short task only. Prefer workers nearby who can arrive before 3:00 PM.',
    budget: '₱500 budget',
    description:
      'Need 2 people to help move chairs and tables for a barangay event.',
    tags: ['Near you', 'Hauling', 'Urgent'],
    urgent: true,
  },
  {
    title: 'Need help moving furniture',
    postedBy: 'Maria Santos',
    postedAt: '1d ago',
    location: 'Barangay San Pedro',
    schedule: 'Starts 3:00 PM',
    detail: 'Photo included so workers can quickly judge the scope before messaging.',
    budget: 'Rate to discuss',
    description: 'Move a cabinet and table from the front room to the covered court.',
    photoPlaceholder: true,
    tags: ['Furniture', 'Near you'],
  },
  {
    title: 'Set up Wi-Fi extender',
    postedBy: 'Elena Ramos',
    postedAt: '1d ago',
    location: 'Purok 1, Barangay San Pedro',
    schedule: 'Tomorrow afternoon',
    detail: 'Best for someone who can explain the setup clearly before leaving.',
    budget: 'PHP 500 budget',
    description:
      'Need help installing a Wi-Fi extender and checking the best spot for a stronger signal upstairs.',
    tags: ['IT support', 'Near you'],
  },
];

export const nearbyWorkers: WorkerCardProps[] = [
  {
    name: 'Adrian Caranay',
    serviceTitle: 'General laborer',
    location: 'Sto. Tomas, Batangas',
    availability: 'Available Now',
    headline: 'Available this afternoon for cleaning or hauling jobs.',
    description:
      'Can help within Barangay San Pedro and nearby areas. Fast replies. Barangay-verified.',
    budgetHint: 'From ₱XXX',
    rating: '4.9 rating',
    completedJobs: '18 jobs done',
    tags: ['Cleaning', 'Hauling', 'Urgent'],
    verified: true,
  },
  {
    name: 'Luis Dela Cruz',
    serviceTitle: 'PC repair and home Wi-Fi setup',
    location: 'Purok 2, San Pedro',
    availability: 'On call today',
    headline: 'Can repair laptops, printers, and home Wi-Fi today.',
    description: 'Available for quick checks and simple setup tasks around San Pedro.',
    rating: '4.8 rating',
    completedJobs: '11 jobs done',
    tags: ['IT support', 'Appliance check'],
    verified: true,
  },
  {
    name: 'Mila Flores',
    serviceTitle: 'Basic plumbing and home repairs',
    location: 'San Pedro proper',
    availability: 'Available this weekend',
    headline: 'Open for small plumbing and carpentry jobs this weekend.',
    description: 'Good for leaks, loose hinges, cabinet checks, and basic repairs.',
    rating: '4.7 rating',
    completedJobs: '9 jobs done',
    tags: ['Plumbing', 'Carpentry'],
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
