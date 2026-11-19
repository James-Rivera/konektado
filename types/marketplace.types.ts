import type { MvpServiceCategory, SearchWorkType } from '@/constants/service-taxonomy';
export type JobStatus =
  | 'open'
  | 'reviewing'
  | 'in_progress'
  | 'completed'
  | 'closed'
  | 'cancelled';

export type ConversationStatus = 'active' | 'hired' | 'declined' | 'archived' | 'reported';

export type UnfilledJobCancellationReason = 'not_needed' | 'found_elsewhere' | 'no_worker_found';
export type JobClosureReason = UnfilledJobCancellationReason | 'mutual_cancellation' | 'expired_no_worker';
export type UnfilledJobInterest = 'worker_messaged' | 'awaiting_reply' | 'no_worker_message';
export type HiredJobCancellationAction = 'request' | 'accept' | 'decline' | 'withdraw';
export type HiredJobCancellationState = {
  job_status: JobStatus;
  request: {
    id: string;
    requested_by: string;
    reason: string;
    status: 'pending' | 'accepted' | 'declined' | 'withdrawn';
  } | null;
};

export type RateType =
  | 'per_service'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'per_project'
  | 'per_job'
  | 'per_visit'
  | 'per_load'
  | 'per_order'
  | 'per_meal'
  | 'per_session';

export type ExperienceLevel = 'any' | 'beginner' | 'intermediate' | 'experienced';

export type CustomServiceReviewStatus = 'none' | 'pending' | 'approved' | 'rejected';

export type PublicProfileSummary = {
  id: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  barangay: string | null;
  city: string | null;
  province: string | null;
  publicLocationLabel: string | null;
  approximateLocation: string | null;
  about: string | null;
  avatarUrl: string | null;
  availability: string | null;
  barangayVerifiedAt: string | null;
  verifiedAt: string | null;
};

export type PublicClientProfile = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  publicLocation: string;
  about: string | null;
  coordinationStyle: string | null;
  preferredSchedule: string | null;
  commonNeeds: string[];
  barangayVerifiedAt: string | null;
  verifiedAt: string | null;
  jobsPostedCount: number;
  completedHiresCount: number;
  averageRating: number | null;
  reviewCount: number;
  reviews: PublicProfileReview[];
  hiringHistory: PublicProfileHistoryItem[];
  selectedJob: JobSummary | null;
  activeJobs: JobSummary[];
};

export type PublicProfileHistoryItem = {
  id: string;
  title: string;
  serviceLabel: string | null;
  category: string | null;
  locationText: string | null;
  completedAt: string;
};

export type PublicWorkerProfile = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  publicLocation: string;
  about: string | null;
  availability: string | null;
  skills: string[];
  /** @deprecated Use skills for profile-owned abilities. */
  capabilities: string[];
  serviceArea: string | null;
  barangayVerifiedAt: string | null;
  verifiedAt: string | null;
  completedJobsCount: number;
  averageRating: number | null;
  reviewCount: number;
  credentials: CredentialSummary[];
  reviews: PublicProfileReview[];
  workHistory: PublicProfileHistoryItem[];
  selectedService: ProviderService | null;
  services: ProviderService[];
};

export type JobSchedule = {
  date: string;
  timePreference: 'morning' | 'afternoon' | 'evening' | 'anytime' | 'exact';
  exactTime?: string | null;
  flexibility: 'fixed' | 'flexible';
  timeZone: 'Asia/Manila';
};

export type DraftProvenance = { revision?: number; sourceListingId?: string | null; sourceVersion?: number | null };

export type JobSummary = {
  schedule?: JobSchedule | null;
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
  budgetMin: number | null;
  budgetMax: number | null;
  rateType: RateType;
  budgetNegotiable: boolean;
  workersNeeded: number | null;
  scheduleText: string | null;
  experienceLevel: ExperienceLevel;
  certificationRequired: boolean;
  certificationNote: string | null;
  status: JobStatus;
  closureReason?: JobClosureReason | null;
  unfilledInterest?: UnfilledJobInterest | null;
  acceptedProviderId: string | null;
  allowMessages: boolean;
  autoReplyEnabled: boolean;
  autoCloseEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  client: PublicProfileSummary | null;
  clientAverageRating: number | null;
  clientReviewCount: number;
  clientJobsPostedCount: number;
};

export type JobDetail = JobSummary & {
  closedAt: string | null;
};

export type CreateJobInput = {
  schedule?: JobSchedule | null;
  title: string;
  description: string;
  category?: string | null;
  serviceNeeded: string | null;
  tags?: string[];
  photoUrls?: string[];
  barangay?: string | null;
  locationText?: string | null;
  privateLocationNotes?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  rateType?: RateType;
  budgetNegotiable?: boolean;
  workersNeeded?: number | null;
  scheduleText?: string | null;
  experienceLevel?: ExperienceLevel;
  certificationRequired?: boolean;
  certificationNote?: string | null;
  allowMessages?: boolean;
  autoReplyEnabled?: boolean;
  autoCloseEnabled?: boolean;
};

export type JobDraftSummary = DraftProvenance & {
  schedule?: JobSchedule | null;
  priceInput?: { minimum: string; maximum: string };
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
  budgetMin: number | null;
  budgetMax: number | null;
  rateType: RateType;
  budgetNegotiable: boolean;
  privateLocationNotes: string | null;
  workersNeeded: number | null;
  scheduleText: string | null;
  experienceLevel: ExperienceLevel;
  certificationRequired: boolean;
  certificationNote: string | null;
  allowMessages: boolean;
  autoReplyEnabled: boolean;
  autoCloseEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UpsertJobDraftInput = {
  schedule?: JobSchedule | null;
  priceInput?: { minimum: string; maximum: string };
  title?: string | null;
  description?: string | null;
  category?: string | null;
  serviceNeeded?: string | null;
  tags?: string[];
  photoUrls?: string[];
  barangay?: string | null;
  locationText?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  rateType?: RateType;
  budgetNegotiable?: boolean;
  privateLocationNotes?: string | null;
  workersNeeded?: number | null;
  scheduleText?: string | null;
  experienceLevel?: ExperienceLevel;
  certificationRequired?: boolean;
  certificationNote?: string | null;
  allowMessages?: boolean;
  autoReplyEnabled?: boolean;
  autoCloseEnabled?: boolean;
};

export type JobSearchFilters = {
  text?: string;
  category?: string;
  serviceNeeded?: string;
  serviceNeededIn?: string[];
  discoveryCategory?: MvpServiceCategory;
  discoveryWorkType?: SearchWorkType;
  barangay?: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  rateType?: RateType | 'any';
  experienceLevel?: ExperienceLevel | 'all';
  certificationRequired?: boolean;
  verifiedOnly?: boolean;
  excludeUserId?: string | null;
  excludeCurrentUser?: boolean;
  limit?: number;
};

export type ServiceSearchFilters = {
  text?: string;
  category?: string;
  categories?: string[];
  barangay?: string;
  rateMin?: number | null;
  rateMax?: number | null;
  rateType?: RateType | 'any';
  experienceLevel?: ExperienceLevel | 'all';
  certificationAvailable?: boolean;
  verifiedOnly?: boolean;
  excludeUserId?: string | null;
  excludeCurrentUser?: boolean;
  limit?: number;
  compareReputation?: boolean;
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
  rateMin: number | null;
  rateMax: number | null;
  rateType: RateType;
  rateNegotiable: boolean;
  experienceLevel: ExperienceLevel;
  certificationAvailable: boolean;
  certificationNote: string | null;
  customCategory: string | null;
  customCategoryReviewStatus: CustomServiceReviewStatus;
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
  rateMin?: number | null;
  rateMax?: number | null;
  rateType?: RateType;
  rateNegotiable?: boolean;
  experienceLevel?: ExperienceLevel;
  certificationAvailable?: boolean;
  certificationNote?: string | null;
  customCategory?: string | null;
  barangay?: string | null;
  locationText?: string | null;
  allowMessages?: boolean;
  autoReplyEnabled?: boolean;
  autoPauseEnabled?: boolean;
};

export type ServiceDraftSummary = DraftProvenance & {
  priceInput?: { minimum: string; maximum: string };
  id: string;
  userId: string;
  category: string | null;
  customCategory: string | null;
  title: string | null;
  description: string | null;
  tags: string[];
  photoUrls: string[];
  yearsExperience: number | null;
  availabilityText: string | null;
  rateText: string | null;
  rateMin: number | null;
  rateMax: number | null;
  rateType: RateType;
  rateNegotiable: boolean;
  experienceLevel: ExperienceLevel;
  certificationAvailable: boolean;
  certificationNote: string | null;
  barangay: string | null;
  locationText: string | null;
  allowMessages: boolean;
  autoReplyEnabled: boolean;
  autoPauseEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UpsertServiceDraftInput = {
  priceInput?: { minimum: string; maximum: string };
  category?: string | null;
  customCategory?: string | null;
  title?: string | null;
  description?: string | null;
  tags?: string[];
  photoUrls?: string[];
  yearsExperience?: number | null;
  availabilityText?: string | null;
  rateText?: string | null;
  rateMin?: number | null;
  rateMax?: number | null;
  rateType?: RateType;
  rateNegotiable?: boolean;
  experienceLevel?: ExperienceLevel;
  certificationAvailable?: boolean;
  certificationNote?: string | null;
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
  attachmentPath: string | null;
  attachmentMimeType: string | null;
  attachmentWidth: number | null;
  attachmentHeight: number | null;
  attachmentUrl: string | null;
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
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  job: JobSummary | null;
  service: ProviderService | null;
  client: PublicProfileSummary | null;
  provider: PublicProfileSummary | null;
  lastMessage: ConversationMessage | null;
  unreadCount: number;
};

export type ConversationDetail = ConversationSummary & {
  messages: ConversationMessage[];
  jobRequestExpired?: boolean;
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
  jobContext: {
    id: string;
    title: string;
    serviceLabel: string | null;
    completedAt: string;
  } | null;
};

export type CreateReviewInput = {
  jobId: string;
  rating: number;
  comment?: string | null;
};

export type PublicProfileReview = {
  id: string;
  authorRole: 'client' | 'worker';
  rating: number;
  comment: string | null;
};

export type JobReviewState = {
  eligible: boolean;
  reason:
    | 'eligible'
    | 'already_reviewed'
    | 'invalid_counterparty'
    | 'not_completed'
    | 'not_found'
    | 'not_hired_participant'
    | 'not_participant'
    | 'not_verified';
  revieweeId: string | null;
  revieweeRole: 'client' | 'worker' | null;
  review: Review | null;
};

export type PublicProfileTrustSummary = {
  averageRating: number | null;
  reviewCount: number;
  completedJobsCount: number;
  jobsPostedCount: number;
  reviews: PublicProfileReview[];
  history: {
    id: string;
    title: string;
    serviceLabel: string | null;
    completedAt: string;
  }[];
};

export type CredentialStatus = 'pending' | 'approved' | 'rejected';

export type CredentialType =
  | 'tesda'
  | 'training_certificate'
  | 'barangay_certificate'
  | 'work_proof'
  | 'portfolio'
  | 'other';

export type CredentialSummary = {
  id: string;
  providerId: string;
  serviceId: string | null;
  type: CredentialType;
  title: string;
  issuer: string | null;
  issuedAt: string | null;
  status: CredentialStatus;
  reviewerNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateCredentialInput = {
  serviceId?: string | null;
  type: CredentialType;
  title: string;
  issuer?: string | null;
  issuedAt?: string | null;
  file?: {
    uri: string;
    name?: string | null;
    mimeType?: string | null;
  } | null;
};
