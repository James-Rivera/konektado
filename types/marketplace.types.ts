export type JobStatus =
  | 'open'
  | 'reviewing'
  | 'in_progress'
  | 'completed'
  | 'closed'
  | 'cancelled';

export type ConversationStatus = 'active' | 'hired' | 'declined' | 'archived' | 'reported';

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
  purokSitio: string | null;
  street: string | null;
  subdivisionArea: string | null;
  city: string | null;
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
  availability: string | null;
  barangayVerifiedAt: string | null;
  verifiedAt: string | null;
  jobsPostedCount: number;
  averageRating: number | null;
  reviewCount: number;
  selectedJob: JobSummary | null;
  activeJobs: JobSummary[];
};

export type PublicWorkerProfile = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  publicLocation: string;
  about: string | null;
  availability: string | null;
  barangayVerifiedAt: string | null;
  verifiedAt: string | null;
  completedJobsCount: number;
  averageRating: number | null;
  reviewCount: number;
  selectedService: ProviderService | null;
  services: ProviderService[];
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
