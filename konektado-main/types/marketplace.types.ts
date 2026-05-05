export type JobStatus =
  | 'open'
  | 'reviewing'
  | 'in_progress'
  | 'completed'
  | 'closed'
  | 'cancelled';

export type ConversationStatus = 'active' | 'hired' | 'declined' | 'archived' | 'reported';

export type PublicProfileSummary = {
  id: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  barangay: string | null;
  city: string | null;
  about: string | null;
  avatarUrl: string | null;
  availability: string | null;
  barangayVerifiedAt: string | null;
  verifiedAt: string | null;
};

export type JobSummary = {
  id: string;
  clientId: string;
  title: string;
  description: string | null;
  category: string | null;
  serviceNeeded: string | null;
  tags: string[];
  photoUrls: string[];
  barangay: string | null;
  locationText: string | null;
  budgetAmount: number | null;
  workersNeeded: number | null;
  scheduleText: string | null;
  status: JobStatus;
  acceptedProviderId: string | null;
  allowMessages: boolean;
  autoReplyEnabled: boolean;
  autoCloseEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  client: PublicProfileSummary | null;
};

export type JobDetail = JobSummary & {
  closedAt: string | null;
};

export type CreateJobInput = {
  title: string;
  description: string;
  category?: string | null;
  serviceNeeded: string | null;
  tags?: string[];
  photoUrls?: string[];
  barangay?: string | null;
  locationText?: string | null;
  budgetAmount?: number | null;
  workersNeeded?: number | null;
  scheduleText?: string | null;
  allowMessages?: boolean;
  autoReplyEnabled?: boolean;
  autoCloseEnabled?: boolean;
};

export type JobDraftSummary = {
  id: string;
  userId: string;
  title: string | null;
  description: string | null;
  category: string | null;
  serviceNeeded: string | null;
  tags: string[];
  photoUrls: string[];
  barangay: string | null;
  locationText: string | null;
  budgetAmount: number | null;
  workersNeeded: number | null;
  scheduleText: string | null;
  allowMessages: boolean;
  autoReplyEnabled: boolean;
  autoCloseEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UpsertJobDraftInput = {
  title?: string | null;
  description?: string | null;
  category?: string | null;
  serviceNeeded?: string | null;
  tags?: string[];
  photoUrls?: string[];
  barangay?: string | null;
  locationText?: string | null;
  budgetAmount?: number | null;
  workersNeeded?: number | null;
  scheduleText?: string | null;
  allowMessages?: boolean;
  autoReplyEnabled?: boolean;
  autoCloseEnabled?: boolean;
};

export type JobSearchFilters = {
  text?: string;
  category?: string;
  barangay?: string;
};

export type ProviderService = {
  id: string;
  providerId: string;
  category: string;
  title: string;
  description: string | null;
  tags: string[];
  photoUrls: string[];
  yearsExperience: number | null;
  availabilityText: string | null;
  rateText: string | null;
  barangay: string | null;
  locationText: string | null;
  allowMessages: boolean;
  autoReplyEnabled: boolean;
  autoPauseEnabled: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ServiceSearchResult = ProviderService & {
  provider: PublicProfileSummary | null;
  averageRating: number | null;
  reviewCount: number;
  completedJobsCount: number;
};

export type ServiceDetail = ServiceSearchResult & {
  providerServices: ProviderService[];
};

export type CreateServiceInput = {
  category: string;
  title: string;
  description?: string | null;
  tags?: string[];
  photoUrls?: string[];
  yearsExperience?: number | null;
  availabilityText?: string | null;
  rateText?: string | null;
  barangay?: string | null;
  locationText?: string | null;
  allowMessages?: boolean;
  autoReplyEnabled?: boolean;
  autoPauseEnabled?: boolean;
};

export type ConversationMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export type ConversationSummary = {
  id: string;
  jobId: string | null;
  serviceId: string | null;
  clientId: string;
  providerId: string;
  startedBy: string;
  status: ConversationStatus;
  hiredAt: string | null;
  createdAt: string;
  updatedAt: string;
  job: JobSummary | null;
  service: ProviderService | null;
  client: PublicProfileSummary | null;
  provider: PublicProfileSummary | null;
  lastMessage: ConversationMessage | null;
};

export type ConversationDetail = ConversationSummary & {
  messages: ConversationMessage[];
};

export type Review = {
  id: string;
  jobId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  reviewer: PublicProfileSummary | null;
};

export type CreateReviewInput = {
  jobId: string;
  revieweeId: string;
  rating: number;
  comment?: string | null;
};
