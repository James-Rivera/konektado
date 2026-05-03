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
  barangay: string | null;
  locationText: string | null;
  budgetAmount: number | null;
  scheduleText: string | null;
  status: JobStatus;
  acceptedProviderId: string | null;
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
  barangay?: string | null;
  locationText?: string | null;
  budgetAmount?: number | null;
  scheduleText?: string | null;
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
  yearsExperience: number | null;
  availabilityText: string | null;
  rateText: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ServiceSearchResult = ProviderService & {
  provider: PublicProfileSummary | null;
  averageRating: number | null;
  reviewCount: number;
};

export type CreateServiceInput = {
  category: string;
  title: string;
  description?: string | null;
  yearsExperience?: number | null;
  availabilityText?: string | null;
  rateText?: string | null;
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
