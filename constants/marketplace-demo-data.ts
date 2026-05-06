export type DemoWorkerDetailVariant = 'default' | 'match';

export type DemoWorkerSummary = {
  id: string;
  name: string;
  statusLine: string;
  rateLine: string;
  headline: string;
  imageUrl?: string;
  tags: string[];
  ratingText: string;
  jobsDoneText: string;
  location: string;
  about: string;
  services: string[];
  matchReason: string;
  isActive?: boolean;
};

export type DemoJobSummary = {
  id: string;
  postedAt: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl?: string;
  tags: string[];
  clientRatingText: string;
  jobsPostedText: string;
  location: string;
  schedule: string;
  clientName: string;
  category: string;
  whatToBring?: string;
  showActionRow?: boolean;
  matchReason: string;
};

export type DemoWorkerMetric = {
  label: string;
  value: string;
};

export type DemoWorkHistoryItem = {
  id: string;
  title: string;
  service: string;
  schedule: string;
  location: string;
  description: string;
  earningsText: string;
  posterName: string;
  posterMeta: string;
  photoLabel: string;
};

export type DemoWorkerDetail = {
  id: string;
  name: string;
  headline: string;
  location: string;
  verificationText: string;
  ratingText: string;
  jobsDoneText: string;
  rateLine: string;
  about: string;
  services: string[];
  metrics: DemoWorkerMetric[];
  matchSummary?: {
    title: string;
    body: string;
  };
  workHistory: DemoWorkHistoryItem[];
};

export const demoWorkers: DemoWorkerSummary[] = [
  {
    id: 'demo-worker-adrian',
    name: 'Rodel Caranay',
    statusLine: 'Available today near your barangay',
    rateLine: 'Rate ₱200-800 · Available mornings',
    headline: 'Available for home cleaning, laundry help, and organizing for nearby households.',
    imageUrl:
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80',
    tags: ['Cleaning', 'Laundry help', 'Home assistance', 'Minor home fix help'],
    ratingText: '4.8 rating',
    jobsDoneText: '11 jobs done',
    location: 'Barangay San Pedro',
    about:
      'Available for home support work around Barangay San Pedro, including basic cleaning, laundry help, room organizing, and small household tasks.',
    services: ['Cleaning', 'Laundry help', 'Home assistance', 'Minor home fix help'],
    matchReason: 'Matches your search for cleaning and laundry help near Barangay San Pedro.',
    isActive: true,
  },
  {
    id: 'demo-worker-luis',
    name: 'Luis Dela Cruz',
    statusLine: 'Available this afternoon nearby',
    rateLine: 'Rate ₱300-900 · Available afternoons',
    headline: 'Can handle WiFi/router help, printer setup, and basic troubleshooting jobs.',
    tags: ['WiFi/router help', 'Printer setup', 'Basic troubleshooting'],
    ratingText: '4.9 rating',
    jobsDoneText: '18 jobs done',
    location: 'Barangay San Pedro',
    about:
      'Tech support worker for nearby residents. Usually helps with routers, printers, laptops, and other simple home setup issues.',
    services: ['WiFi/router help', 'Computer setup', 'Printer setup'],
    matchReason: 'Matches your search for repair and setup help near Barangay San Pedro.',
    isActive: true,
  },
  {
    id: 'demo-worker-mila',
    name: 'Mila Flores',
    statusLine: 'Unavailable today, back this weekend',
    rateLine: 'Rate ₱250-700 · Available weekends',
    headline: 'Offers minor home fix help, yard help, and quick home maintenance support.',
    imageUrl:
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80',
    tags: ['Minor home fix help', 'Yard or outdoor help', 'Home assistance'],
    ratingText: '4.7 rating',
    jobsDoneText: '9 jobs done',
    location: 'Barangay San Pedro',
    about:
      'Best for quick fixes at home, including leaks, loose hinges, shelves, and other simple maintenance work.',
    services: ['Minor home fix help', 'Yard or outdoor help', 'Home assistance'],
    matchReason: 'Matches your search for repair and home maintenance support nearby.',
    isActive: false,
  },
];

export const demoJobs: DemoJobSummary[] = [
  {
    id: 'demo-job-furniture-event',
    postedAt: 'Posted 2 hours ago',
    title: 'Need help with moving chairs for barangay event',
    subtitle: 'Budget ₱300 · Less than a day to finish',
    description:
      'Need 2 people to help move chairs and tables for a barangay event. This is a short task only and we prefer workers who can arrive before 3 PM.',
    imageUrl:
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    tags: ['Home assistance', 'Event help', 'Short task'],
    clientRatingText: '4.8 client rating',
    jobsPostedText: '11 jobs posted',
    location: 'Barangay San Pedro',
    schedule: 'Starts 3:00 PM',
    clientName: 'Maria Santos',
    category: 'Home & Local Help',
    whatToBring: 'Bring water and wear comfortable shoes. No special tools needed.',
    matchReason: 'Matched because this job needs moving help nearby.',
  },
  {
    id: 'demo-job-moving-photo',
    postedAt: 'Today',
    title: 'Looking for moving help',
    subtitle: 'Posted by Maria Santos',
    description: 'Photo included so workers can quickly judge the scope before messaging.',
    tags: ['One-time job'],
    clientRatingText: '4.8 client rating',
    jobsPostedText: '11 jobs posted',
    location: 'Barangay San Pedro',
    schedule: 'Starts 3:00 PM',
    clientName: 'Maria Santos',
    category: 'Home & Local Help',
    whatToBring: 'Bring gloves if available. Final details can be confirmed in Messages.',
    showActionRow: true,
    matchReason: 'Matched because this job is close and can be finished the same day.',
  },
  {
    id: 'demo-job-wifi',
    postedAt: 'Posted 5 hours ago',
    title: 'Need help with Wi-Fi extender setup',
    subtitle: 'Budget ₱500 · One afternoon only',
    description:
      'Need help installing a Wi-Fi extender and checking the best location for a stronger signal upstairs.',
    tags: ['Tech & Document Support', 'WiFi/router help', 'Home tech'],
    clientRatingText: '4.9 client rating',
    jobsPostedText: '6 jobs posted',
    location: 'Barangay San Pedro',
    schedule: 'Tomorrow afternoon',
    clientName: 'Elena Ramos',
    category: 'Tech & Document Support',
    whatToBring: 'Bring any basic setup tools you normally use for routers or cable checks.',
    matchReason: 'Matched because this job needs home tech support nearby.',
  },
  {
    id: 'demo-job-cleaning',
    postedAt: 'Today',
    title: 'Need help with cleaning before visitors arrive',
    subtitle: 'Budget ₱400 · Morning help needed',
    description: 'Looking for someone who can help clean the sala and kitchen before noon.',
    tags: ['Cleaning', 'Home help', 'Urgent'],
    clientRatingText: '4.7 client rating',
    jobsPostedText: '4 jobs posted',
    location: 'Barangay San Pedro',
    schedule: 'Morning help needed',
    clientName: 'Joan Reyes',
    category: 'Home & Local Help',
    whatToBring: 'Bring your usual cleaning tools if available. Supplies for the kitchen are ready.',
    matchReason: 'Matched because this cleaning job is near your barangay.',
  },
];

export const demoWorkerDetails: DemoWorkerDetail[] = [
  {
    id: 'demo-worker-adrian',
    name: 'Adrian Caranay',
    headline: 'Cleaning and laundry support for nearby households',
    location: 'Barangay San Pedro',
    verificationText: 'Verified resident',
    ratingText: '4.8 rating',
    jobsDoneText: '11 jobs done',
    rateLine: '₱200-800 per task',
    about:
      'Adrian helps nearby households with daily cleaning, laundry, room organizing, and light household support. Best for short notice home help around Barangay San Pedro.',
    services: ['Cleaning', 'Laundry help', 'Home assistance', 'Minor home fix help'],
    metrics: [
      { label: 'Availability', value: 'Mornings' },
      { label: 'Response time', value: 'Usually within 15 min' },
      { label: 'Experience', value: '2 years' },
      { label: 'Jobs completed', value: '11' },
    ],
    matchSummary: {
      title: 'Why this worker fits',
      body: 'Matches your search for cleaning and laundry help near Barangay San Pedro. Adrian is available this morning and has recent home-support reviews.',
    },
    workHistory: [
      {
        id: 'work-adrian-1',
        title: 'Whole-house cleaning before family visit',
        service: 'Cleaning',
        schedule: 'Finished last week',
        location: 'Barangay San Pedro',
        description: 'Cleaned the sala, kitchen, and two bedrooms before guests arrived.',
        earningsText: 'Earned ₱650',
        posterName: 'Maria Santos',
        posterMeta: 'Client from Barangay San Pedro',
        photoLabel: 'Reference photo',
      },
      {
        id: 'work-adrian-2',
        title: 'Laundry and room organizing help',
        service: 'Laundry help',
        schedule: 'Finished 2 weeks ago',
        location: 'Barangay San Pedro',
        description: 'Helped sort, wash, and organize clothing and storage bins for one household.',
        earningsText: 'Earned ₱450',
        posterName: 'Celia Dizon',
        posterMeta: 'Client from Barangay San Pedro',
        photoLabel: 'Reference photo',
      },
    ],
  },
  {
    id: 'demo-worker-luis',
    name: 'Luis Dela Cruz',
    headline: 'Home tech setup and troubleshooting support',
    location: 'Barangay San Pedro',
    verificationText: 'Verified resident',
    ratingText: '4.9 rating',
    jobsDoneText: '18 jobs done',
    rateLine: '₱300-900 per visit',
    about:
      'Luis helps with Wi-Fi extender setup, router checks, printer pairing, and simple PC troubleshooting. Good fit for residents who need same-day home tech help.',
    services: ['WiFi/router help', 'Computer setup', 'Printer setup'],
    metrics: [
      { label: 'Availability', value: 'Afternoons' },
      { label: 'Response time', value: 'Usually within 10 min' },
      { label: 'Experience', value: '3 years' },
      { label: 'Jobs completed', value: '18' },
    ],
    matchSummary: {
      title: 'Why this worker fits',
      body: 'Matches your search for repair and setup help near Barangay San Pedro. Luis is available this afternoon and has recent Wi-Fi setup work nearby.',
    },
    workHistory: [
      {
        id: 'work-luis-1',
        title: 'Wi-Fi extender setup for upstairs bedrooms',
        service: 'WiFi/router help',
        schedule: 'Finished yesterday',
        location: 'Barangay San Pedro',
        description: 'Checked router placement, paired the extender, and tested the upstairs signal.',
        earningsText: 'Earned ₱500',
        posterName: 'Elena Ramos',
        posterMeta: 'Client from Barangay San Pedro',
        photoLabel: 'Reference photo',
      },
    ],
  },
  {
    id: 'demo-worker-mila',
    name: 'Mila Flores',
    headline: 'Quick home maintenance and minor home fix support',
    location: 'Barangay San Pedro',
    verificationText: 'Verified resident',
    ratingText: '4.7 rating',
    jobsDoneText: '9 jobs done',
    rateLine: '₱250-700 per task',
    about:
      'Mila handles shelf and hinge fixes, minor home fix help, and outdoor support for nearby homes. Good for quick maintenance needs around the barangay.',
    services: ['Minor home fix help', 'Yard or outdoor help', 'Home assistance'],
    metrics: [
      { label: 'Availability', value: 'Weekends' },
      { label: 'Response time', value: 'Usually within 20 min' },
      { label: 'Experience', value: '2 years' },
      { label: 'Jobs completed', value: '9' },
    ],
    workHistory: [],
  },
];

export function findDemoJobById(jobId: string) {
  return demoJobs.find((job) => job.id === jobId) ?? null;
}

export function findDemoWorkerById(workerId: string) {
  return demoWorkers.find((worker) => worker.id === workerId) ?? null;
}

export function findDemoWorkerDetailById(workerId: string) {
  return demoWorkerDetails.find((worker) => worker.id === workerId) ?? null;
}
