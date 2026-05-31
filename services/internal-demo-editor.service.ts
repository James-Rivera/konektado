import { File as ExpoFile } from 'expo-file-system';

import {
  MVP_SERVICE_CATEGORIES,
  MVP_SERVICE_OPTIONS,
  getServicesForMvpCategory,
  getStoredMvpServiceOption,
} from '@/constants/service-taxonomy';
import type { ServiceResult } from '@/services/auth.service';
import {
  formatCanonicalAdminVerificationLabel,
  getCanonicalAdminVerificationStatus,
  getCanonicalVerificationRequest,
  type AdminCanonicalVerificationStatus,
} from '@/services/admin-verification-status.service';
import {
  getPublicPhotoKey,
  type PublicPhotoSourceType,
  type PublicPhotoVisibility,
} from '@/services/content-visibility.service';
import { compactText, formatPublicLocation, isCurrentUserAdmin, normalizeRateType } from '@/services/marketplace.helpers';
import type { JobStatus, RateType } from '@/types/marketplace.types';
import type { VerificationStatus } from '@/types/verification.types';
import { supabase } from '@/utils/supabase';

const INTERNAL_ALLOWED_EMAILS = parseEnvList(process.env.EXPO_PUBLIC_INTERNAL_DEMO_EDITOR_EMAILS);
const INTERNAL_ALLOWED_USER_IDS = parseEnvList(process.env.EXPO_PUBLIC_INTERNAL_DEMO_EDITOR_USER_IDS);
const MAX_PUBLIC_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PRIVATE_VERIFICATION_FILE_BYTES = 10 * 1024 * 1024;
const SIGNED_VERIFICATION_URL_SECONDS = 5 * 60;
const PUBLIC_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const PUBLIC_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const PRIVATE_DOCUMENT_BUCKET = 'verification-files';
const EDITABLE_VERIFICATION_FILE_TYPES = ['id_front', 'id_back', 'certification', 'experience', 'other'] as const;

const BANNED_VISIBLE_WORDS = [
  'seed',
  'seeded',
  'demo',
  'test',
  'fake',
  'fictional',
  'sample',
  'placeholder',
  'lorem',
  'mock',
  'dummy',
] as const;

const ACTIVE_JOB_STATUSES = new Set<JobStatus>(['open', 'reviewing', 'in_progress']);
const EDITABLE_JOB_STATUSES: JobStatus[] = ['open', 'reviewing', 'in_progress', 'completed', 'closed', 'cancelled'];
const EDITABLE_RATE_TYPES: RateType[] = [
  'per_service',
  'hourly',
  'daily',
  'weekly',
  'per_project',
  'per_job',
  'per_visit',
  'per_load',
  'per_order',
  'per_meal',
  'per_session',
];
const EDITABLE_CONVERSATION_STATUSES = ['active', 'hired', 'declined', 'archived', 'reported'] as const;
const EDITABLE_REPORT_STATUSES = ['open', 'reviewing', 'resolved', 'dismissed'] as const;

export type InternalDemoAccess = {
  email: string | null;
  isAdmin: boolean;
  whitelistConfigured: boolean;
  whitelisted: boolean;
  userId: string;
};

export type InternalDemoVerificationStatus = AdminCanonicalVerificationStatus;
export type InternalDemoUserRole = 'client' | 'worker';
export type InternalDemoUserFilter = 'all' | 'verified' | 'pending' | 'unverified' | 'client' | 'worker' | 'both';
export type PublicDemoImageTarget = 'profile_photo' | 'job_photo' | 'service_photo';
export type EditablePublicPhotoAction = 'flag' | 'hide' | 'clear';

export type PublicDemoImageAsset = {
  uri: string;
  name?: string | null;
  mimeType?: string | null;
  size?: number | null;
};

export type PrivateVerificationFileAsset = PublicDemoImageAsset;
export type EditableVerificationFileType = (typeof EDITABLE_VERIFICATION_FILE_TYPES)[number];

type PublicDemoImageUploadBody = {
  body: ArrayBuffer;
  contentType: string;
};

export type EditableUserListItem = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  verificationLabel: string;
  verificationStatus: InternalDemoVerificationStatus;
  roles: InternalDemoUserRole[];
  roleLabel: string;
  locationLabel: string;
  publicJobsCount: number;
  publicServicesCount: number;
  publicPhotosCount: number;
  reviewsCount: number;
};

export type EditableProfile = {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  barangay: string;
  street: string;
  subdivisionArea: string;
  purokSitio: string;
  city: string;
  about: string;
  availability: string;
  preferredContactMethod: string;
  avatarUrl: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type EditableJob = {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  tags: string[];
  category: string;
  serviceNeeded: string;
  barangay: string;
  locationText: string;
  budgetMin: number | null;
  budgetMax: number | null;
  budgetNegotiable: boolean;
  rateType: RateType;
  workersNeeded: number | null;
  scheduleText: string;
  experienceLevel: string;
  certificationRequired: boolean;
  certificationNote: string;
  allowMessages: boolean;
  autoReplyEnabled: boolean;
  autoCloseEnabled: boolean;
  status: JobStatus;
  photoUrls: string[];
  createdAt: string;
  updatedAt: string;
};

export type EditableJobDraft = {
  id: string;
  userId: string;
  title: string;
  description: string;
  tags: string[];
  category: string;
  serviceNeeded: string;
  barangay: string;
  locationText: string;
  budgetMin: number | null;
  budgetMax: number | null;
  budgetNegotiable: boolean;
  rateType: RateType;
  workersNeeded: number | null;
  scheduleText: string;
  experienceLevel: string;
  certificationRequired: boolean;
  certificationNote: string;
  allowMessages: boolean;
  autoReplyEnabled: boolean;
  autoCloseEnabled: boolean;
  photoUrls: string[];
  createdAt: string;
  updatedAt: string;
};

export type EditableService = {
  id: string;
  providerId: string;
  title: string;
  description: string;
  tags: string[];
  category: string;
  barangay: string;
  locationText: string;
  rateMin: number | null;
  rateMax: number | null;
  rateNegotiable: boolean;
  rateType: RateType;
  yearsExperience: number | null;
  availabilityText: string;
  experienceLevel: string;
  certificationAvailable: boolean;
  certificationNote: string;
  allowMessages: boolean;
  autoReplyEnabled: boolean;
  autoPauseEnabled: boolean;
  isActive: boolean;
  photoUrls: string[];
  createdAt: string;
  updatedAt: string;
};

export type EditableVerificationFile = {
  id: string;
  requestId: string;
  credentialId: string | null;
  fileType: string;
  filePath: string | null;
  createdAt: string;
};

export type EditableVerificationRequest = {
  id: string;
  status: VerificationStatus;
  residentNote: string;
  adminNote: string;
  documentType: string;
  createdAt: string;
  updatedAt: string;
  files: EditableVerificationFile[];
};

export type EditableReviewSummary = {
  id: string;
  rating: number;
  comment: string;
  reviewerId: string;
  revieweeId: string;
  jobId: string;
  createdAt: string;
};

export type EditableReportSummary = {
  id: string;
  reason: string;
  details: string;
  status: string;
  createdAt: string;
};

export type EditableConversationSummary = {
  id: string;
  clientId: string;
  providerId: string;
  status: string;
  messageCount: number;
  updatedAt: string;
};

export type EditableUserDetail = EditableUserListItem & {
  conversations: EditableConversationSummary[];
  jobDrafts: EditableJobDraft[];
  jobs: EditableJob[];
  profile: EditableProfile;
  reports: EditableReportSummary[];
  reviews: EditableReviewSummary[];
  services: EditableService[];
  verifications: EditableVerificationRequest[];
};

export type EditablePublicPhotoInput = {
  imageUrl: string;
  ownerId: string;
  sourceId: string;
  sourceType: PublicPhotoSourceType;
};

export type EditablePublicPhotoModerationResult = {
  action: EditablePublicPhotoAction;
  photoKey: string;
  visibility: PublicPhotoVisibility;
};

export type UpdateEditableProfilePayload = {
  about?: string | null;
  avatarUrl?: string | null;
  availability?: string | null;
  barangay?: string | null;
  city?: string | null;
  firstName?: string | null;
  fullName?: string | null;
  lastName?: string | null;
  preferredContactMethod?: string | null;
  purokSitio?: string | null;
  street?: string | null;
  subdivisionArea?: string | null;
};

export type UpdateEditableJobPayload = {
  allowMessages?: boolean;
  autoCloseEnabled?: boolean;
  autoReplyEnabled?: boolean;
  barangay?: string | null;
  budgetMax?: number | null;
  budgetMin?: number | null;
  budgetNegotiable?: boolean;
  category?: string | null;
  certificationNote?: string | null;
  certificationRequired?: boolean;
  description?: string | null;
  experienceLevel?: string | null;
  locationText?: string | null;
  photoUrls?: string[];
  rateType?: RateType | string | null;
  scheduleText?: string | null;
  serviceNeeded?: string | null;
  status?: JobStatus;
  tags?: string[];
  title?: string | null;
  workersNeeded?: number | null;
};

export type EditableConversationStatus = (typeof EDITABLE_CONVERSATION_STATUSES)[number];
export type EditableReportStatus = (typeof EDITABLE_REPORT_STATUSES)[number];

export type CreateEditableJobPayload = {
  allowMessages: boolean;
  autoCloseEnabled: boolean;
  autoReplyEnabled: boolean;
  barangay?: string | null;
  budgetMax?: number | null;
  budgetMin?: number | null;
  budgetNegotiable: boolean;
  category: string;
  certificationNote?: string | null;
  certificationRequired: boolean;
  description: string;
  experienceLevel: string;
  locationText?: string | null;
  photoUrls?: string[];
  rateType: RateType;
  scheduleText?: string | null;
  serviceNeeded: string;
  status: JobStatus;
  tags: string[];
  title: string;
  workersNeeded?: number | null;
};

export type CreateEditableJobResult =
  | { kind: 'job'; record: EditableJob }
  | { kind: 'draft'; record: EditableJobDraft };

export type UpdateEditableServicePayload = {
  allowMessages?: boolean;
  autoPauseEnabled?: boolean;
  autoReplyEnabled?: boolean;
  availabilityText?: string | null;
  barangay?: string | null;
  category?: string | null;
  certificationAvailable?: boolean;
  certificationNote?: string | null;
  description?: string | null;
  experienceLevel?: string | null;
  isActive?: boolean;
  locationText?: string | null;
  photoUrls?: string[];
  rateMax?: number | null;
  rateMin?: number | null;
  rateNegotiable?: boolean;
  rateType?: RateType | string | null;
  tags?: string[];
  title?: string | null;
  yearsExperience?: number | null;
};

export type CreateEditableServicePayload = {
  allowMessages: boolean;
  autoPauseEnabled: boolean;
  autoReplyEnabled: boolean;
  availabilityText?: string | null;
  barangay?: string | null;
  category: string;
  certificationAvailable: boolean;
  certificationNote?: string | null;
  description: string;
  experienceLevel: string;
  isActive: boolean;
  locationText?: string | null;
  photoUrls?: string[];
  rateMax?: number | null;
  rateMin?: number | null;
  rateNegotiable: boolean;
  rateType: RateType;
  tags: string[];
  title: string;
  yearsExperience?: number | null;
};

export type UpdateVerificationNotesPayload = {
  adminNote?: string | null;
  documentType?: string | null;
  residentNote?: string | null;
};

type ProfileRow = {
  about: string | null;
  avatar_url: string | null;
  availability: string | null;
  barangay: string | null;
  city: string | null;
  created_at?: string | null;
  email?: string | null;
  first_name: string | null;
  full_name: string | null;
  id: string;
  last_name: string | null;
  preferred_contact_method?: string | null;
  purok_sitio: string | null;
  street?: string | null;
  subdivision_area?: string | null;
  updated_at?: string | null;
  verified_at: string | null;
  barangay_verified_at: string | null;
};

type RoleRow = {
  role: string;
  user_id: string;
};

type VerificationRow = {
  created_at: string;
  id: string;
  notes: string | null;
  reviewer_note: string | null;
  status: VerificationStatus;
  updated_at: string;
  user_id: string;
};

type VerificationFileRow = {
  created_at: string;
  credential_id: string | null;
  file_path: string | null;
  file_type: string;
  id: string;
  url: string | null;
  verification_id: string;
};

type JobRow = {
  allow_messages?: boolean | null;
  auto_close_enabled?: boolean | null;
  auto_reply_enabled?: boolean | null;
  budget_negotiable?: boolean | null;
  budget_max: number | null;
  budget_min: number | null;
  category: string | null;
  certification_note?: string | null;
  certification_required?: boolean | null;
  client_id: string | null;
  created_at: string;
  description: string | null;
  experience_level?: string | null;
  id: string;
  location_text: string | null;
  owner_id: string;
  photo_urls: string[] | null;
  rate_type: string | null;
  schedule_text?: string | null;
  service_needed: string | null;
  status: JobStatus;
  tags?: string[] | null;
  title: string;
  updated_at: string;
  barangay: string | null;
  workers_needed?: number | null;
};

type JobDraftRow = {
  allow_messages?: boolean | null;
  auto_close_enabled?: boolean | null;
  auto_reply_enabled?: boolean | null;
  barangay: string | null;
  budget_negotiable?: boolean | null;
  budget_max: number | null;
  budget_min: number | null;
  category: string | null;
  certification_note?: string | null;
  certification_required?: boolean | null;
  created_at: string;
  description: string | null;
  experience_level?: string | null;
  id: string;
  location_text: string | null;
  photo_urls: string[] | null;
  rate_type: string | null;
  schedule_text?: string | null;
  service_needed: string | null;
  tags?: string[] | null;
  title: string | null;
  updated_at: string;
  user_id: string;
  workers_needed?: number | null;
};

type ServiceRow = {
  allow_messages?: boolean | null;
  auto_pause_enabled?: boolean | null;
  auto_reply_enabled?: boolean | null;
  availability_text?: string | null;
  category: string;
  certification_available?: boolean | null;
  certification_note?: string | null;
  created_at: string;
  description: string | null;
  experience_level?: string | null;
  id: string;
  is_active: boolean | null;
  location_text: string | null;
  photo_urls: string[] | null;
  provider_id: string;
  rate_max: number | null;
  rate_min: number | null;
  rate_negotiable?: boolean | null;
  rate_type: string | null;
  tags?: string[] | null;
  title: string;
  updated_at: string;
  barangay: string | null;
  years_experience?: number | null;
};

type ReviewRow = {
  comment: string | null;
  created_at: string;
  id: string;
  job_id: string;
  rating: number;
  reviewee_id: string;
  reviewer_id: string;
};

type ReportRow = {
  created_at: string;
  details: string | null;
  id: string;
  reason: string;
  status: string;
};

type ConversationRow = {
  client_id: string;
  id: string;
  provider_id: string;
  status: string;
  updated_at: string;
};

type MessageCountRow = {
  conversation_id: string;
};

const PROFILE_COLUMNS =
  'id, email, full_name, first_name, last_name, barangay, purok_sitio, street, subdivision_area, city, about, avatar_url, availability, preferred_contact_method, verified_at, barangay_verified_at, created_at, updated_at';
const JOB_COLUMNS =
  'id, owner_id, client_id, title, description, tags, category, service_needed, barangay, location_text, budget_min, budget_max, budget_negotiable, rate_type, workers_needed, schedule_text, experience_level, certification_required, certification_note, allow_messages, auto_reply_enabled, auto_close_enabled, status, photo_urls, created_at, updated_at';
const JOB_DRAFT_COLUMNS =
  'id, user_id, title, description, tags, category, service_needed, barangay, location_text, budget_min, budget_max, budget_negotiable, rate_type, workers_needed, schedule_text, experience_level, certification_required, certification_note, allow_messages, auto_reply_enabled, auto_close_enabled, photo_urls, created_at, updated_at';
const SERVICE_COLUMNS =
  'id, provider_id, title, description, tags, category, barangay, location_text, rate_min, rate_max, rate_negotiable, rate_type, years_experience, availability_text, experience_level, certification_available, certification_note, allow_messages, auto_reply_enabled, auto_pause_enabled, is_active, photo_urls, created_at, updated_at';
const VERIFICATION_COLUMNS = 'id, user_id, status, notes, reviewer_note, created_at, updated_at';
const VERIFICATION_FILE_COLUMNS = 'id, verification_id, credential_id, file_type, file_path, url, created_at';

function parseEnvList(value: string | undefined) {
  return new Set(
    (value ?? '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

function hasWhitelistConfig() {
  return INTERNAL_ALLOWED_EMAILS.size > 0 || INTERNAL_ALLOWED_USER_IDS.size > 0;
}

export async function getInternalDemoEditorAccess(): Promise<ServiceResult<InternalDemoAccess>> {
  const { data, error } = await supabase.auth.getUser();
  const user = data.user;
  if (error || !user) {
    return { data: null, error: 'Please sign in with an internal admin account.' };
  }

  const isAdmin = await isCurrentUserAdmin();
  const whitelistConfigured = hasWhitelistConfig();
  const email = user.email?.toLowerCase() ?? null;
  const whitelisted =
    !whitelistConfigured ||
    INTERNAL_ALLOWED_USER_IDS.has(user.id.toLowerCase()) ||
    (email ? INTERNAL_ALLOWED_EMAILS.has(email) : false);

  if (!isAdmin) {
    return { data: null, error: 'Barangay admin access is required for this internal tool.' };
  }

  if (!whitelisted) {
    return { data: null, error: 'This admin account is not on the internal demo editor whitelist.' };
  }

  return {
    data: {
      email,
      isAdmin,
      userId: user.id,
      whitelistConfigured,
      whitelisted,
    },
    error: null,
  };
}

async function requireInternalAccess(): Promise<ServiceResult<InternalDemoAccess>> {
  return getInternalDemoEditorAccess();
}

function profileDisplayName(profile: ProfileRow | null | undefined) {
  return (
    compactText(profile?.full_name) ||
    `${compactText(profile?.first_name)} ${compactText(profile?.last_name)}`.trim() ||
    'Konektado resident'
  );
}

function getRoles(userId: string, roles: RoleRow[]): InternalDemoUserRole[] {
  const userRoles = new Set(roles.filter((role) => role.user_id === userId).map((role) => role.role));
  const mapped: InternalDemoUserRole[] = [];
  if (userRoles.has('provider')) mapped.push('worker');
  if (userRoles.has('client')) mapped.push('client');
  return mapped;
}

function roleLabel(roles: InternalDemoUserRole[]) {
  if (roles.includes('worker') && roles.includes('client')) return 'Worker and Client';
  if (roles.includes('worker')) return 'Worker';
  if (roles.includes('client')) return 'Client';
  return 'Resident';
}

function hasAdminRole(userId: string, roles: RoleRow[]) {
  return roles.some((role) => role.user_id === userId && role.role === 'barangay_admin');
}

function latestVerification(userId: string, verifications: VerificationRow[]) {
  return getCanonicalVerificationRequest(userId, verifications);
}

function isVerifiedStatus(status: InternalDemoVerificationStatus) {
  return status === 'verified';
}

function publicJobCount(jobs: JobRow[], verified: boolean) {
  if (!verified) return 0;
  return jobs.filter((job) => ACTIVE_JOB_STATUSES.has(job.status)).length;
}

function publicServiceCount(services: ServiceRow[], verified: boolean) {
  if (!verified) return 0;
  return services.filter((service) => Boolean(service.is_active)).length;
}

function publicPhotoCount(profile: ProfileRow, jobs: JobRow[], services: ServiceRow[], verified: boolean) {
  const profileCount = compactText(profile.avatar_url) ? 1 : 0;
  if (!verified) return profileCount;
  return (
    profileCount +
    jobs.reduce((total, job) => total + (job.photo_urls ?? []).filter(Boolean).length, 0) +
    services.reduce((total, service) => total + (service.photo_urls ?? []).filter(Boolean).length, 0)
  );
}

function mapUserListItem({
  jobs,
  profile,
  reports,
  reviews,
  roles,
  services,
  verifications,
}: {
  jobs: JobRow[];
  profile: ProfileRow;
  reports: ReportRow[];
  reviews: ReviewRow[];
  roles: RoleRow[];
  services: ServiceRow[];
  verifications: VerificationRow[];
}): EditableUserListItem {
  const request = latestVerification(profile.id, verifications);
  const verificationStatus = getCanonicalAdminVerificationStatus(profile, request);
  const verified = isVerifiedStatus(verificationStatus);
  const userRoles = getRoles(profile.id, roles);
  const userJobs = jobs.filter((job) => (job.client_id ?? job.owner_id) === profile.id);
  const userServices = services.filter((service) => service.provider_id === profile.id);
  const userReviews = verified
    ? reviews.filter((review) => review.reviewee_id === profile.id || review.reviewer_id === profile.id)
    : [];

  return {
    id: profile.id,
    avatarUrl: compactText(profile.avatar_url) || null,
    fullName: profileDisplayName(profile),
    locationLabel: formatPublicLocation({
      barangay: profile.barangay,
      city: profile.city,
      street: profile.street,
      subdivisionArea: profile.subdivision_area,
    }),
    publicJobsCount: publicJobCount(userJobs, verified),
    publicPhotosCount: publicPhotoCount(profile, userJobs, userServices, verified),
    publicServicesCount: publicServiceCount(userServices, verified),
    reviewsCount: userReviews.length,
    roles: userRoles,
    roleLabel: roleLabel(userRoles),
    verificationLabel: formatCanonicalAdminVerificationLabel(verificationStatus),
    verificationStatus,
  };
}

export async function listEditableUsers(): Promise<ServiceResult<EditableUserListItem[]>> {
  const access = await requireInternalAccess();
  if (access.error) return access;

  const [profilesResult, rolesResult, verificationsResult, jobsResult, servicesResult, reviewsResult, reportsResult] =
    await Promise.all([
      supabase.from('profiles').select(PROFILE_COLUMNS).order('updated_at', { ascending: false }).limit(220),
      supabase.from('user_roles').select('user_id, role'),
      supabase.from('verifications').select(VERIFICATION_COLUMNS).order('created_at', { ascending: false }),
      supabase.from('jobs').select(JOB_COLUMNS).limit(800),
      supabase.from('services').select(SERVICE_COLUMNS).limit(800),
      supabase.from('reviews').select('id, job_id, reviewer_id, reviewee_id, rating, comment, created_at').limit(800),
      supabase.from('reports').select('id, reason, details, status, created_at').limit(800),
    ]);

  const error =
    profilesResult.error ??
    rolesResult.error ??
    verificationsResult.error ??
    jobsResult.error ??
    servicesResult.error ??
    reviewsResult.error ??
    reportsResult.error;

  if (error) return { data: null, error: error.message };

  const roles = (rolesResult.data as RoleRow[] | null) ?? [];
  const verifications = (verificationsResult.data as VerificationRow[] | null) ?? [];
  const jobs = (jobsResult.data as JobRow[] | null) ?? [];
  const services = (servicesResult.data as ServiceRow[] | null) ?? [];
  const reviews = (reviewsResult.data as ReviewRow[] | null) ?? [];
  const reports = (reportsResult.data as ReportRow[] | null) ?? [];

  return {
    data: ((profilesResult.data as ProfileRow[] | null) ?? [])
      .filter((profile) => !hasAdminRole(profile.id, roles))
      .map((profile) => mapUserListItem({ jobs, profile, reports, reviews, roles, services, verifications })),
    error: null,
  };
}

export async function getEditableUser(userId: string): Promise<ServiceResult<EditableUserDetail>> {
  const access = await requireInternalAccess();
  if (access.error) return access;

  const cleanUserId = compactText(userId);
  if (!cleanUserId) return { data: null, error: 'Choose a user to edit.' };

  const [
    profileResult,
    rolesResult,
    verificationsResult,
    filesResult,
    jobDraftsResult,
    jobsResult,
    servicesResult,
    reviewsResult,
    reportsResult,
    conversationsResult,
    messagesResult,
  ] = await Promise.all([
    supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', cleanUserId).maybeSingle<ProfileRow>(),
    supabase.from('user_roles').select('user_id, role').eq('user_id', cleanUserId),
    supabase.from('verifications').select(VERIFICATION_COLUMNS).eq('user_id', cleanUserId).order('created_at', { ascending: false }),
    supabase.from('verification_files').select(VERIFICATION_FILE_COLUMNS).limit(200),
    supabase
      .from('job_drafts')
      .select(JOB_DRAFT_COLUMNS)
      .eq('user_id', cleanUserId)
      .order('updated_at', { ascending: false }),
    supabase
      .from('jobs')
      .select(JOB_COLUMNS)
      .or(`owner_id.eq.${cleanUserId},client_id.eq.${cleanUserId}`)
      .order('created_at', { ascending: false }),
    supabase.from('services').select(SERVICE_COLUMNS).eq('provider_id', cleanUserId).order('created_at', { ascending: false }),
    supabase
      .from('reviews')
      .select('id, job_id, reviewer_id, reviewee_id, rating, comment, created_at')
      .or(`reviewer_id.eq.${cleanUserId},reviewee_id.eq.${cleanUserId}`)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('reports')
      .select('id, reason, details, status, created_at')
      .or(`reporter_id.eq.${cleanUserId},reported_user_id.eq.${cleanUserId}`)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('conversations')
      .select('id, client_id, provider_id, status, updated_at')
      .or(`client_id.eq.${cleanUserId},provider_id.eq.${cleanUserId}`)
      .order('updated_at', { ascending: false })
      .limit(100),
    supabase.from('messages').select('conversation_id').limit(1000),
  ]);

  const error =
    profileResult.error ??
    rolesResult.error ??
    verificationsResult.error ??
    filesResult.error ??
    jobDraftsResult.error ??
    jobsResult.error ??
    servicesResult.error ??
    reviewsResult.error ??
    reportsResult.error ??
    conversationsResult.error ??
    messagesResult.error;

  if (error) return { data: null, error: error.message };
  if (!profileResult.data) return { data: null, error: 'User profile not found.' };

  const profile = profileResult.data;
  const roles = (rolesResult.data as RoleRow[] | null) ?? [];
  const verifications = (verificationsResult.data as VerificationRow[] | null) ?? [];
  const verificationFiles = (filesResult.data as VerificationFileRow[] | null) ?? [];
  const jobDrafts = ((jobDraftsResult.data as JobDraftRow[] | null) ?? []).map(mapJobDraft);
  const jobs = ((jobsResult.data as JobRow[] | null) ?? []).map(mapJob);
  const services = ((servicesResult.data as ServiceRow[] | null) ?? []).map(mapService);
  const reviews = ((reviewsResult.data as ReviewRow[] | null) ?? []).map(mapReview);
  const reports = ((reportsResult.data as ReportRow[] | null) ?? []).map(mapReport);
  const conversations = mapConversations(
    (conversationsResult.data as ConversationRow[] | null) ?? [],
    (messagesResult.data as MessageCountRow[] | null) ?? [],
  );

  const listItem = mapUserListItem({
    jobs: (jobsResult.data as JobRow[] | null) ?? [],
    profile,
    reports: (reportsResult.data as ReportRow[] | null) ?? [],
    reviews: (reviewsResult.data as ReviewRow[] | null) ?? [],
    roles,
    services: (servicesResult.data as ServiceRow[] | null) ?? [],
    verifications,
  });
  return {
    data: {
      ...listItem,
      conversations,
      jobDrafts,
      jobs,
      profile: mapProfile(profile),
      reports,
      reviews,
      services,
      verifications: verifications.map((verification) => mapVerification(verification, verificationFiles)),
    },
    error: null,
  };
}

function mapProfile(row: ProfileRow): EditableProfile {
  return {
    about: row.about ?? '',
    avatarUrl: row.avatar_url ?? '',
    availability: row.availability ?? '',
    barangay: row.barangay ?? '',
    city: row.city ?? '',
    createdAt: row.created_at ?? null,
    email: row.email ?? null,
    firstName: row.first_name ?? '',
    fullName: row.full_name ?? '',
    id: row.id,
    lastName: row.last_name ?? '',
    preferredContactMethod: row.preferred_contact_method ?? '',
    purokSitio: row.purok_sitio ?? '',
    street: row.street ?? '',
    subdivisionArea: row.subdivision_area ?? '',
    updatedAt: row.updated_at ?? null,
  };
}

function mapJob(row: JobRow): EditableJob {
  return {
    allowMessages: row.allow_messages ?? true,
    autoCloseEnabled: row.auto_close_enabled ?? false,
    autoReplyEnabled: row.auto_reply_enabled ?? false,
    barangay: row.barangay ?? '',
    budgetMax: row.budget_max ?? null,
    budgetMin: row.budget_min ?? null,
    budgetNegotiable: row.budget_negotiable ?? false,
    category: row.category ?? '',
    certificationNote: row.certification_note ?? '',
    certificationRequired: row.certification_required ?? false,
    createdAt: row.created_at,
    description: row.description ?? '',
    experienceLevel: row.experience_level ?? 'any',
    id: row.id,
    locationText: row.location_text ?? row.barangay ?? '',
    ownerId: row.client_id ?? row.owner_id,
    photoUrls: row.photo_urls ?? [],
    rateType: normalizeRateType(row.rate_type),
    scheduleText: row.schedule_text ?? '',
    serviceNeeded: row.service_needed ?? '',
    status: row.status,
    tags: row.tags ?? [],
    title: row.title,
    updatedAt: row.updated_at,
    workersNeeded: row.workers_needed ?? null,
  };
}

function mapJobDraft(row: JobDraftRow): EditableJobDraft {
  return {
    allowMessages: row.allow_messages ?? true,
    autoCloseEnabled: row.auto_close_enabled ?? false,
    autoReplyEnabled: row.auto_reply_enabled ?? false,
    barangay: row.barangay ?? '',
    budgetMax: row.budget_max ?? null,
    budgetMin: row.budget_min ?? null,
    budgetNegotiable: row.budget_negotiable ?? false,
    category: row.category ?? '',
    certificationNote: row.certification_note ?? '',
    certificationRequired: row.certification_required ?? false,
    createdAt: row.created_at,
    description: row.description ?? '',
    experienceLevel: row.experience_level ?? 'any',
    id: row.id,
    locationText: row.location_text ?? row.barangay ?? '',
    photoUrls: row.photo_urls ?? [],
    rateType: normalizeRateType(row.rate_type),
    scheduleText: row.schedule_text ?? '',
    serviceNeeded: row.service_needed ?? '',
    tags: row.tags ?? [],
    title: row.title ?? '',
    updatedAt: row.updated_at,
    userId: row.user_id,
    workersNeeded: row.workers_needed ?? null,
  };
}

function mapService(row: ServiceRow): EditableService {
  return {
    allowMessages: row.allow_messages ?? true,
    autoPauseEnabled: row.auto_pause_enabled ?? false,
    autoReplyEnabled: row.auto_reply_enabled ?? false,
    availabilityText: row.availability_text ?? '',
    barangay: row.barangay ?? '',
    category: row.category,
    certificationAvailable: row.certification_available ?? false,
    certificationNote: row.certification_note ?? '',
    createdAt: row.created_at,
    description: row.description ?? '',
    experienceLevel: row.experience_level ?? 'any',
    id: row.id,
    isActive: Boolean(row.is_active),
    locationText: row.location_text ?? row.barangay ?? '',
    photoUrls: row.photo_urls ?? [],
    providerId: row.provider_id,
    rateMax: row.rate_max ?? null,
    rateMin: row.rate_min ?? null,
    rateNegotiable: row.rate_negotiable ?? false,
    rateType: normalizeRateType(row.rate_type),
    tags: row.tags ?? [],
    title: row.title,
    updatedAt: row.updated_at,
    yearsExperience: row.years_experience ?? null,
  };
}

function mapVerification(row: VerificationRow, files: VerificationFileRow[]): EditableVerificationRequest {
  const notes = parseVerificationNotes(row.notes);
  return {
    adminNote: row.reviewer_note ?? '',
    createdAt: row.created_at,
    documentType: notes.documentType,
    files: files.filter((file) => file.verification_id === row.id).map(mapVerificationFile),
    id: row.id,
    residentNote: notes.residentNote,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

function mapVerificationFile(row: VerificationFileRow): EditableVerificationFile {
  return {
    createdAt: row.created_at,
    credentialId: row.credential_id ?? null,
    filePath: row.file_path ?? getLegacyVerificationFilePath(row.url),
    fileType: row.file_type,
    id: row.id,
    requestId: row.verification_id,
  };
}

function mapReview(row: ReviewRow): EditableReviewSummary {
  return {
    comment: row.comment ?? '',
    createdAt: row.created_at,
    id: row.id,
    jobId: row.job_id,
    rating: row.rating,
    revieweeId: row.reviewee_id,
    reviewerId: row.reviewer_id,
  };
}

function mapReport(row: ReportRow): EditableReportSummary {
  return {
    createdAt: row.created_at,
    details: row.details ?? '',
    id: row.id,
    reason: row.reason,
    status: row.status,
  };
}

function mapConversations(rows: ConversationRow[], messages: MessageCountRow[]): EditableConversationSummary[] {
  const counts = new Map<string, number>();
  for (const message of messages) {
    counts.set(message.conversation_id, (counts.get(message.conversation_id) ?? 0) + 1);
  }

  return rows.map((row) => ({
    clientId: row.client_id,
    id: row.id,
    messageCount: counts.get(row.id) ?? 0,
    providerId: row.provider_id,
    status: row.status,
    updatedAt: row.updated_at,
  }));
}

function parseVerificationNotes(notes: string | null) {
  if (!notes) return { documentType: '', residentNote: '' };
  try {
    const parsed = JSON.parse(notes) as {
      document?: { idType?: string | null };
      submittedNote?: string | null;
    };
    return {
      documentType: parsed.document?.idType ?? '',
      residentNote: parsed.submittedNote ?? '',
    };
  } catch {
    return { documentType: '', residentNote: notes };
  }
}

function buildVerificationNotes(currentNotes: string | null, payload: UpdateVerificationNotesPayload) {
  let parsed: Record<string, unknown> = {};
  if (currentNotes) {
    try {
      parsed = JSON.parse(currentNotes) as Record<string, unknown>;
    } catch {
      parsed = { submittedNote: currentNotes };
    }
  }

  const document = typeof parsed.document === 'object' && parsed.document ? parsed.document as Record<string, unknown> : {};

  return JSON.stringify({
    ...parsed,
    document: {
      ...document,
      idType: payload.documentType === undefined ? document.idType ?? null : compactText(payload.documentType) || null,
    },
    submittedNote: payload.residentNote === undefined ? parsed.submittedNote ?? null : compactText(payload.residentNote) || null,
    updatedByInternalDemoEditorAt: new Date().toISOString(),
  });
}

export function validateDemoContent(payload: Record<string, unknown>): ServiceResult<void> {
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value !== 'string') continue;
    const banned = findBannedVisibleWord(value);
    if (banned) {
      return { data: null, error: `${formatFieldName(key)} cannot contain "${banned}" in visible demo content.` };
    }
  }

  return { data: undefined, error: null };
}

function findBannedVisibleWord(value: string) {
  const normalized = value.toLowerCase();
  return BANNED_VISIBLE_WORDS.find((word) => new RegExp(`\\b${word}\\b`, 'i').test(normalized)) ?? null;
}

function formatFieldName(value: string) {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase());
}

function validatePublicPhotoUrls(urls: string[] | undefined): ServiceResult<void> {
  if (!urls) return { data: undefined, error: null };

  for (const url of urls.map(compactText).filter(Boolean)) {
    if (url.includes(PRIVATE_DOCUMENT_BUCKET) || /credential|certificate|id-front|id-back|passport|license|government/i.test(url)) {
      return { data: null, error: 'Public photos cannot point to private verification, ID, certificate, or credential assets.' };
    }
  }

  return { data: undefined, error: null };
}

function validateRateBounds(min: number | null | undefined, max: number | null | undefined, label: string) {
  if (min !== null && min !== undefined && (!Number.isFinite(min) || min < 0)) {
    return `${label} minimum must be a valid positive amount.`;
  }
  if (max !== null && max !== undefined && (!Number.isFinite(max) || max < 0)) {
    return `${label} maximum must be a valid positive amount.`;
  }
  if (min !== null && min !== undefined && max !== null && max !== undefined && min > max) {
    return `${label} minimum must be less than or equal to maximum.`;
  }
  return null;
}

function validateActiveRateBounds(min: number | null | undefined, max: number | null | undefined, label: string) {
  const baseError = validateRateBounds(min, max, label);
  if (baseError) return baseError;
  if (min === null || min === undefined || max === null || max === undefined) {
    return `${label} minimum and maximum are required before making this record active.`;
  }
  if (min <= 0 || max <= 0) {
    return `${label} minimum and maximum must be greater than zero before making this record active.`;
  }
  return null;
}

function validatePositiveWholeNumber(value: number | null | undefined, label: string) {
  if (value === null || value === undefined) return null;
  if (!Number.isInteger(value) || value <= 0) return `${label} must be a positive whole number.`;
  return null;
}

function validatePositiveNumber(value: number | null | undefined, label: string) {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value) || value <= 0) return `${label} must be a positive number.`;
  return null;
}

function validateExperienceLevel(value: string | null | undefined) {
  return ['any', 'beginner', 'intermediate', 'experienced'].includes(compactText(value));
}

function cleanTextList(values: string[] | null | undefined) {
  return Array.from(new Set((values ?? []).map(compactText).filter(Boolean))).slice(0, 4);
}

function getValidJobService(category: string, serviceNeeded: string) {
  const storedService = getStoredMvpServiceOption(serviceNeeded);
  if (!storedService) return null;
  return getServicesForMvpCategory(category).includes(storedService) ? storedService : null;
}

async function getEditableOwnerStatus(userId: string): Promise<ServiceResult<InternalDemoVerificationStatus>> {
  const [profileResult, verificationResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, verified_at, barangay_verified_at, full_name, first_name, last_name, barangay, city, about, avatar_url, availability, purok_sitio')
      .eq('id', userId)
      .maybeSingle<ProfileRow>(),
    supabase.from('verifications').select(VERIFICATION_COLUMNS).eq('user_id', userId).order('created_at', { ascending: false }),
  ]);

  if (profileResult.error) return { data: null, error: profileResult.error.message };
  if (verificationResult.error) return { data: null, error: verificationResult.error.message };
  if (!profileResult.data) return { data: null, error: 'Owner profile not found.' };

  const request = latestVerification(userId, (verificationResult.data as VerificationRow[] | null) ?? []);
  return { data: getCanonicalAdminVerificationStatus(profileResult.data, request), error: null };
}

export async function updateEditableProfile(
  userId: string,
  payload: UpdateEditableProfilePayload,
): Promise<ServiceResult<EditableProfile>> {
  const access = await requireInternalAccess();
  if (access.error) return access;

  const cleanUserId = compactText(userId);
  if (!cleanUserId) return { data: null, error: 'Choose a user profile to update.' };

  const visibleValidation = validateDemoContent({
    about: payload.about ?? '',
    availability: payload.availability ?? '',
    barangay: payload.barangay ?? '',
    city: payload.city ?? '',
    firstName: payload.firstName ?? '',
    fullName: payload.fullName ?? '',
    lastName: payload.lastName ?? '',
    purokSitio: payload.purokSitio ?? '',
    street: payload.street ?? '',
    subdivisionArea: payload.subdivisionArea ?? '',
  });
  if (visibleValidation.error) return visibleValidation;

  if (payload.avatarUrl !== undefined) {
    const photoValidation = validatePublicPhotoUrls([payload.avatarUrl ?? '']);
    if (photoValidation.error) return photoValidation;
  }

  const fullName = compactText(payload.fullName);
  const firstName = compactText(payload.firstName);
  const lastName = compactText(payload.lastName);
  if (!fullName && !firstName && !lastName) {
    return { data: null, error: 'Enter a public name for this profile.' };
  }

  const updatePayload = {
    about: compactText(payload.about) || null,
    avatar_url: compactText(payload.avatarUrl) || null,
    availability: compactText(payload.availability) || null,
    barangay: compactText(payload.barangay) || null,
    city: compactText(payload.city) || null,
    first_name: firstName || null,
    full_name: fullName || [firstName, lastName].filter(Boolean).join(' ') || null,
    last_name: lastName || null,
    preferred_contact_method: compactText(payload.preferredContactMethod) || null,
    purok_sitio: compactText(payload.purokSitio) || null,
    street: compactText(payload.street) || null,
    subdivision_area: compactText(payload.subdivisionArea) || null,
  };

  const { data, error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', cleanUserId)
    .select(PROFILE_COLUMNS)
    .single<ProfileRow>();

  if (error) return { data: null, error: error.message };
  return { data: mapProfile(data), error: null };
}

export async function listEditableUserJobs(userId: string): Promise<ServiceResult<EditableJob[]>> {
  const user = await getEditableUser(userId);
  if (user.error || !user.data) return { data: null, error: user.error };
  return { data: user.data.jobs, error: null };
}

export async function updateEditableJob(jobId: string, payload: UpdateEditableJobPayload): Promise<ServiceResult<EditableJob>> {
  const access = await requireInternalAccess();
  if (access.error) return access;

  const cleanJobId = compactText(jobId);
  if (!cleanJobId) return { data: null, error: 'Choose a job to update.' };

  const currentResult = await supabase.from('jobs').select(JOB_COLUMNS).eq('id', cleanJobId).maybeSingle<JobRow>();
  if (currentResult.error) return { data: null, error: currentResult.error.message };
  if (!currentResult.data) return { data: null, error: 'Job not found.' };

  const current = currentResult.data;
  const ownerId = current.client_id ?? current.owner_id;
  const nextStatus = payload.status ?? current.status;
  if (!EDITABLE_JOB_STATUSES.includes(nextStatus)) return { data: null, error: 'Choose a valid job status.' };

  const ownerStatus = await getEditableOwnerStatus(ownerId);
  if (ownerStatus.error || !ownerStatus.data) return { data: null, error: ownerStatus.error };
  if (!isVerifiedStatus(ownerStatus.data) && ACTIVE_JOB_STATUSES.has(nextStatus)) {
    return { data: null, error: 'Pending, rejected, or unverified users cannot have active public jobs.' };
  }

  const title = compactText(payload.title ?? current.title);
  const description = compactText(payload.description ?? current.description);
  const category = compactText(payload.category ?? current.category);
  const serviceNeeded = getValidJobService(category, compactText(payload.serviceNeeded ?? current.service_needed));
  const budgetMin = payload.budgetMin === undefined ? current.budget_min : payload.budgetMin;
  const budgetMax = payload.budgetMax === undefined ? current.budget_max : payload.budgetMax;
  const budgetNegotiable = payload.budgetNegotiable ?? current.budget_negotiable ?? false;
  const rateType = normalizeRateType(payload.rateType ?? current.rate_type);
  const workersNeeded = payload.workersNeeded === undefined ? current.workers_needed ?? null : payload.workersNeeded;
  const scheduleText = compactText(payload.scheduleText ?? current.schedule_text);
  const experienceLevel = compactText(payload.experienceLevel ?? current.experience_level) || 'any';
  const certificationRequired = payload.certificationRequired ?? current.certification_required ?? false;
  const certificationNote = compactText(payload.certificationNote ?? current.certification_note);
  const allowMessages = payload.allowMessages ?? current.allow_messages ?? true;
  const autoReplyEnabled = payload.autoReplyEnabled ?? current.auto_reply_enabled ?? false;
  const autoCloseEnabled = payload.autoCloseEnabled ?? current.auto_close_enabled ?? false;
  const tags = cleanTextList(payload.tags ?? current.tags);
  const photoUrls = payload.photoUrls ?? current.photo_urls ?? [];
  const barangay = compactText(payload.barangay ?? current.barangay);
  const locationText = compactText(payload.locationText ?? current.location_text) || barangay;

  if (!title) return { data: null, error: 'Enter a job title.' };
  if (!description) return { data: null, error: 'Enter a job description.' };
  if (!MVP_SERVICE_CATEGORIES.includes(category as never)) return { data: null, error: 'Choose a valid job category.' };
  if (!serviceNeeded) return { data: null, error: 'Choose a service needed that belongs to the selected job category.' };
  if (!validateExperienceLevel(experienceLevel)) return { data: null, error: 'Choose a valid experience level.' };
  const workersError = validatePositiveWholeNumber(workersNeeded, 'Workers needed');
  if (workersError) return { data: null, error: workersError };
  const rateError = ACTIVE_JOB_STATUSES.has(nextStatus)
    ? validateActiveRateBounds(budgetMin, budgetMax, 'Budget')
    : validateRateBounds(budgetMin, budgetMax, 'Budget');
  if (rateError) return { data: null, error: rateError };
  const visibleValidation = validateDemoContent({
    barangay,
    category,
    certificationNote,
    description,
    locationText,
    scheduleText,
    serviceNeeded,
    tags: tags.join(' '),
    title,
  });
  if (visibleValidation.error) return visibleValidation;
  const photoValidation = validatePublicPhotoUrls(photoUrls);
  if (photoValidation.error) return photoValidation;

  const closedAt = ['completed', 'closed', 'cancelled'].includes(nextStatus) ? new Date().toISOString() : null;

  const { data, error } = await supabase
    .from('jobs')
    .update({
      allow_messages: allowMessages,
      auto_close_enabled: autoCloseEnabled,
      auto_reply_enabled: autoReplyEnabled,
      barangay: barangay || null,
      budget_max: budgetMax,
      budget_min: budgetMin,
      budget_negotiable: budgetNegotiable,
      category,
      certification_note: certificationNote || null,
      certification_required: certificationRequired,
      closed_at: closedAt,
      description,
      experience_level: experienceLevel,
      location: locationText || null,
      location_text: locationText || null,
      photo_urls: photoUrls.map(compactText).filter(Boolean),
      public_location_text: locationText || null,
      rate_type: rateType,
      schedule_text: scheduleText || null,
      service_needed: serviceNeeded,
      status: nextStatus,
      tags,
      title,
      workers_needed: workersNeeded,
    })
    .eq('id', cleanJobId)
    .select(JOB_COLUMNS)
    .single<JobRow>();

  if (error) return { data: null, error: error.message };
  return { data: mapJob(data), error: null };
}

export async function createEditableJob(
  ownerId: string,
  payload: CreateEditableJobPayload,
): Promise<ServiceResult<CreateEditableJobResult>> {
  const access = await requireInternalAccess();
  if (access.error) return access;

  const cleanOwnerId = compactText(ownerId);
  if (!cleanOwnerId) return { data: null, error: 'Choose a resident before creating a job.' };

  const nextStatus = payload.status;
  if (!EDITABLE_JOB_STATUSES.includes(nextStatus)) return { data: null, error: 'Choose a valid job status.' };

  const ownerStatus = await getEditableOwnerStatus(cleanOwnerId);
  if (ownerStatus.error || !ownerStatus.data) return { data: null, error: ownerStatus.error };
  const ownerVerified = isVerifiedStatus(ownerStatus.data);

  const title = compactText(payload.title);
  const description = compactText(payload.description);
  const category = compactText(payload.category);
  const serviceNeeded = getValidJobService(category, compactText(payload.serviceNeeded));
  const budgetMin = payload.budgetMin ?? null;
  const budgetMax = payload.budgetMax ?? null;
  const workersNeeded = payload.workersNeeded ?? null;
  const scheduleText = compactText(payload.scheduleText);
  const experienceLevel = compactText(payload.experienceLevel) || 'any';
  const certificationNote = compactText(payload.certificationNote);
  const tags = cleanTextList(payload.tags);
  const rateType = normalizeRateType(payload.rateType);
  const photoUrls = payload.photoUrls ?? [];
  const locationText = compactText(payload.locationText) || compactText(payload.barangay) || 'Barangay San Pedro';

  if (!title) return { data: null, error: 'Enter a job title.' };
  if (!description) return { data: null, error: 'Enter a job description.' };
  if (!MVP_SERVICE_CATEGORIES.includes(category as never)) return { data: null, error: 'Choose a valid job category.' };
  if (!serviceNeeded) return { data: null, error: 'Choose a service needed that belongs to the selected job category.' };
  if (!validateExperienceLevel(experienceLevel)) return { data: null, error: 'Choose a valid experience level.' };
  const workersError = validatePositiveWholeNumber(workersNeeded, 'Workers needed');
  if (workersError) return { data: null, error: workersError };
  const rateError = ownerVerified && ACTIVE_JOB_STATUSES.has(nextStatus)
    ? validateActiveRateBounds(budgetMin, budgetMax, 'Budget')
    : validateRateBounds(budgetMin, budgetMax, 'Budget');
  if (rateError) return { data: null, error: rateError };
  const visibleValidation = validateDemoContent({
    barangay: payload.barangay ?? '',
    certificationNote,
    description,
    locationText,
    scheduleText,
    serviceNeeded,
    tags: tags.join(' '),
    title,
  });
  if (visibleValidation.error) return visibleValidation;
  const photoValidation = validatePublicPhotoUrls(photoUrls);
  if (photoValidation.error) return photoValidation;

  if (!ownerVerified) {
    const { data, error } = await supabase
      .rpc('internal_demo_create_job_draft', {
        p_owner_id: cleanOwnerId,
        p_payload: {
          barangay: compactText(payload.barangay) || 'Barangay San Pedro',
          budgetMax,
          budgetMin,
          budgetNegotiable: payload.budgetNegotiable,
          category,
          certificationNote,
          certificationRequired: payload.certificationRequired,
          description,
          experienceLevel,
          locationText,
          photoUrls: photoUrls.map(compactText).filter(Boolean),
          rateType,
          scheduleText,
          serviceNeeded,
          tags,
          title,
          workersNeeded,
          allowMessages: payload.allowMessages,
          autoReplyEnabled: payload.autoReplyEnabled,
          autoCloseEnabled: payload.autoCloseEnabled,
        },
      })
      .single<JobDraftRow>();

    if (error) return { data: null, error: error.message };
    return { data: { kind: 'draft', record: mapJobDraft(data) }, error: null };
  }

  const { data, error } = await supabase
    .rpc('internal_demo_create_job', {
      p_owner_id: cleanOwnerId,
      p_payload: {
        barangay: compactText(payload.barangay) || 'Barangay San Pedro',
        budgetMax,
        budgetMin,
        budgetNegotiable: payload.budgetNegotiable,
        category,
        certificationNote,
        certificationRequired: payload.certificationRequired,
        description,
        experienceLevel,
        locationText,
        photoUrls: photoUrls.map(compactText).filter(Boolean),
        rateType,
        scheduleText,
        serviceNeeded,
        status: nextStatus,
        tags,
        title,
        workersNeeded,
        allowMessages: payload.allowMessages,
        autoReplyEnabled: payload.autoReplyEnabled,
        autoCloseEnabled: payload.autoCloseEnabled,
      },
    })
    .single<JobRow>();

  if (error) return { data: null, error: error.message };
  return { data: { kind: 'job', record: mapJob(data) }, error: null };
}

export async function deactivateEditableJob(jobId: string): Promise<ServiceResult<EditableJob>> {
  return updateEditableJob(jobId, { status: 'cancelled' });
}

export async function listEditableUserServices(userId: string): Promise<ServiceResult<EditableService[]>> {
  const user = await getEditableUser(userId);
  if (user.error || !user.data) return { data: null, error: user.error };
  return { data: user.data.services, error: null };
}

export async function updateEditableService(
  serviceId: string,
  payload: UpdateEditableServicePayload,
): Promise<ServiceResult<EditableService>> {
  const access = await requireInternalAccess();
  if (access.error) return access;

  const cleanServiceId = compactText(serviceId);
  if (!cleanServiceId) return { data: null, error: 'Choose a service to update.' };

  const currentResult = await supabase.from('services').select(SERVICE_COLUMNS).eq('id', cleanServiceId).maybeSingle<ServiceRow>();
  if (currentResult.error) return { data: null, error: currentResult.error.message };
  if (!currentResult.data) return { data: null, error: 'Service not found.' };

  const current = currentResult.data;
  const ownerStatus = await getEditableOwnerStatus(current.provider_id);
  if (ownerStatus.error || !ownerStatus.data) return { data: null, error: ownerStatus.error };
  const ownerVerified = isVerifiedStatus(ownerStatus.data);
  const nextActive = ownerVerified ? payload.isActive ?? Boolean(current.is_active) : false;

  const title = compactText(payload.title ?? current.title);
  const description = compactText(payload.description ?? current.description);
  const category = compactText(payload.category ?? current.category);
  const rateMin = payload.rateMin === undefined ? current.rate_min : payload.rateMin;
  const rateMax = payload.rateMax === undefined ? current.rate_max : payload.rateMax;
  const rateNegotiable = payload.rateNegotiable ?? current.rate_negotiable ?? false;
  const rateType = normalizeRateType(payload.rateType ?? current.rate_type);
  const yearsExperience = payload.yearsExperience === undefined ? current.years_experience ?? null : payload.yearsExperience;
  const availabilityText = compactText(payload.availabilityText ?? current.availability_text);
  const experienceLevel = compactText(payload.experienceLevel ?? current.experience_level) || 'any';
  const certificationAvailable = payload.certificationAvailable ?? current.certification_available ?? false;
  const certificationNote = compactText(payload.certificationNote ?? current.certification_note);
  const allowMessages = payload.allowMessages ?? current.allow_messages ?? true;
  const autoReplyEnabled = payload.autoReplyEnabled ?? current.auto_reply_enabled ?? false;
  const autoPauseEnabled = payload.autoPauseEnabled ?? current.auto_pause_enabled ?? false;
  const tags = cleanTextList(payload.tags ?? current.tags);
  const photoUrls = payload.photoUrls ?? current.photo_urls ?? [];
  const barangay = compactText(payload.barangay ?? current.barangay);
  const locationText = compactText(payload.locationText ?? current.location_text) || barangay;

  if (!title) return { data: null, error: 'Enter a service title.' };
  if (!description) return { data: null, error: 'Enter a service description.' };
  if (!MVP_SERVICE_OPTIONS.includes(category as never)) return { data: null, error: 'Choose a valid service category.' };
  if (!validateExperienceLevel(experienceLevel)) return { data: null, error: 'Choose a valid experience level.' };
  const experienceError = validatePositiveNumber(yearsExperience, 'Years of experience');
  if (experienceError) return { data: null, error: experienceError };
  const rateError = nextActive ? validateActiveRateBounds(rateMin, rateMax, 'Rate') : validateRateBounds(rateMin, rateMax, 'Rate');
  if (rateError) return { data: null, error: rateError };
  const visibleValidation = validateDemoContent({
    availabilityText,
    barangay,
    category,
    certificationNote,
    description,
    locationText,
    tags: tags.join(' '),
    title,
  });
  if (visibleValidation.error) return visibleValidation;
  const photoValidation = validatePublicPhotoUrls(photoUrls);
  if (photoValidation.error) return photoValidation;

  const { data, error } = await supabase
    .from('services')
    .update({
      allow_messages: allowMessages,
      auto_pause_enabled: autoPauseEnabled,
      auto_reply_enabled: autoReplyEnabled,
      availability_text: availabilityText || null,
      barangay: barangay || null,
      category,
      certification_available: certificationAvailable,
      certification_note: certificationNote || null,
      description,
      experience_level: experienceLevel,
      is_active: nextActive,
      location_text: locationText || null,
      photo_urls: photoUrls.map(compactText).filter(Boolean),
      rate_max: rateMax,
      rate_min: rateMin,
      rate_negotiable: rateNegotiable,
      rate_type: rateType,
      tags,
      title,
      years_experience: yearsExperience,
    })
    .eq('id', cleanServiceId)
    .select(SERVICE_COLUMNS)
    .single<ServiceRow>();

  if (error) return { data: null, error: error.message };
  return { data: mapService(data), error: null };
}

export async function createEditableService(
  providerId: string,
  payload: CreateEditableServicePayload,
): Promise<ServiceResult<EditableService>> {
  const access = await requireInternalAccess();
  if (access.error) return access;

  const cleanProviderId = compactText(providerId);
  if (!cleanProviderId) return { data: null, error: 'Choose a worker before creating a service.' };

  const ownerStatus = await getEditableOwnerStatus(cleanProviderId);
  if (ownerStatus.error || !ownerStatus.data) return { data: null, error: ownerStatus.error };
  const ownerVerified = isVerifiedStatus(ownerStatus.data);
  const nextActive = ownerVerified ? payload.isActive : false;

  const title = compactText(payload.title);
  const description = compactText(payload.description);
  const category = compactText(payload.category);
  const rateMin = payload.rateMin ?? null;
  const rateMax = payload.rateMax ?? null;
  const yearsExperience = payload.yearsExperience ?? null;
  const availabilityText = compactText(payload.availabilityText);
  const experienceLevel = compactText(payload.experienceLevel) || 'any';
  const certificationNote = compactText(payload.certificationNote);
  const tags = cleanTextList(payload.tags);
  const rateType = normalizeRateType(payload.rateType);
  const photoUrls = payload.photoUrls ?? [];
  const locationText = compactText(payload.locationText) || compactText(payload.barangay) || 'Barangay San Pedro';

  if (!title) return { data: null, error: 'Enter a service title.' };
  if (!description) return { data: null, error: 'Enter a service description.' };
  if (!MVP_SERVICE_OPTIONS.includes(category as never)) return { data: null, error: 'Choose a valid service category.' };
  if (!validateExperienceLevel(experienceLevel)) return { data: null, error: 'Choose a valid experience level.' };
  const experienceError = validatePositiveNumber(yearsExperience, 'Years of experience');
  if (experienceError) return { data: null, error: experienceError };
  const rateError = nextActive ? validateActiveRateBounds(rateMin, rateMax, 'Rate') : validateRateBounds(rateMin, rateMax, 'Rate');
  if (rateError) return { data: null, error: rateError };
  const visibleValidation = validateDemoContent({
    availabilityText,
    barangay: payload.barangay ?? '',
    category,
    certificationNote,
    description,
    locationText,
    tags: tags.join(' '),
    title,
  });
  if (visibleValidation.error) return visibleValidation;
  const photoValidation = validatePublicPhotoUrls(photoUrls);
  if (photoValidation.error) return photoValidation;

  const { data, error } = await supabase
    .rpc('internal_demo_create_service', {
      p_payload: {
        barangay: compactText(payload.barangay) || 'Barangay San Pedro',
        category,
        certificationAvailable: payload.certificationAvailable,
        certificationNote,
        description,
        experienceLevel,
        isActive: nextActive,
        locationText,
        photoUrls: photoUrls.map(compactText).filter(Boolean),
        rateMax,
        rateMin,
        rateNegotiable: payload.rateNegotiable,
        rateType,
        tags,
        title,
        yearsExperience,
        availabilityText,
        allowMessages: payload.allowMessages,
        autoReplyEnabled: payload.autoReplyEnabled,
        autoPauseEnabled: payload.autoPauseEnabled,
      },
      p_provider_id: cleanProviderId,
    })
    .single<ServiceRow>();

  if (error) return { data: null, error: error.message };
  return { data: mapService(data), error: null };
}

export async function deactivateEditableService(serviceId: string): Promise<ServiceResult<EditableService>> {
  return updateEditableService(serviceId, { isActive: false });
}

export async function updateEditableConversationStatus(
  conversationId: string,
  status: EditableConversationStatus | string,
): Promise<ServiceResult<EditableConversationSummary>> {
  const access = await requireInternalAccess();
  if (access.error) return access;

  const cleanConversationId = compactText(conversationId);
  const cleanStatus = compactText(status) as EditableConversationStatus;
  if (!cleanConversationId) return { data: null, error: 'Choose a conversation to update.' };
  if (!EDITABLE_CONVERSATION_STATUSES.includes(cleanStatus)) return { data: null, error: 'Choose a valid conversation status.' };

  const { data, error } = await supabase
    .from('conversations')
    .update({ status: cleanStatus })
    .eq('id', cleanConversationId)
    .select('id, client_id, provider_id, status, updated_at')
    .single<ConversationRow>();

  if (error) return { data: null, error: error.message };
  return { data: mapConversations([data], [])[0], error: null };
}

export async function updateEditableReportStatus(
  reportId: string,
  status: EditableReportStatus | string,
): Promise<ServiceResult<EditableReportSummary>> {
  const access = await requireInternalAccess();
  if (access.error || !access.data) return access;

  const cleanReportId = compactText(reportId);
  const cleanStatus = compactText(status) as EditableReportStatus;
  if (!cleanReportId) return { data: null, error: 'Choose a report to update.' };
  if (!EDITABLE_REPORT_STATUSES.includes(cleanStatus)) return { data: null, error: 'Choose a valid report status.' };

  const { data, error } = await supabase
    .from('reports')
    .update({
      reviewed_at: new Date().toISOString(),
      reviewed_by: access.data.userId,
      status: cleanStatus,
    })
    .eq('id', cleanReportId)
    .select('id, reason, details, status, created_at')
    .single<ReportRow>();

  if (error) return { data: null, error: error.message };
  return { data: mapReport(data), error: null };
}

export async function moderateEditablePublicPhoto({
  action,
  note,
  photo,
  reason,
}: {
  action: EditablePublicPhotoAction;
  note?: string | null;
  photo: EditablePublicPhotoInput;
  reason?: string | null;
}): Promise<ServiceResult<EditablePublicPhotoModerationResult>> {
  const access = await requireInternalAccess();
  if (access.error || !access.data) return access;

  const imageUrl = compactText(photo.imageUrl);
  const ownerId = compactText(photo.ownerId);
  const sourceId = compactText(photo.sourceId);
  const sourceType = photo.sourceType;
  const cleanReason = compactText(reason);
  const cleanNote = compactText(note);

  if (!imageUrl || !ownerId || !sourceId) return { data: null, error: 'Choose a public photo to moderate.' };
  if (!['profile_photo', 'job_photo', 'service_photo'].includes(sourceType)) {
    return { data: null, error: 'Choose a valid public photo type.' };
  }
  if ((action === 'flag' || action === 'hide') && !cleanReason) {
    return { data: null, error: 'Enter a reason before saving this photo review.' };
  }

  const photoKey = getPublicPhotoKey({ imageUrl, sourceId, sourceType });
  const reviewedAt = new Date().toISOString();
  const status = action === 'clear' ? 'cleared' : action === 'hide' ? 'hidden' : 'flagged';
  const visibility: PublicPhotoVisibility = action === 'hide' ? 'hidden' : 'visible';

  const { error: actionError } = await supabase.from('admin_moderation_actions').insert({
    action,
    image_path: getStoragePathFromPublicUrl(imageUrl),
    image_url: imageUrl,
    note: cleanNote || null,
    owner_id: ownerId,
    reason: cleanReason || null,
    reviewed_at: reviewedAt,
    reviewed_by: access.data.userId,
    source_id: sourceId,
    source_type: sourceType,
    status,
    target_id: photoKey,
    target_type: 'photo',
  });

  if (actionError) return { data: null, error: actionError.message };

  if (action === 'hide' || action === 'clear') {
    const { error: visibilityError } = await supabase.from('content_visibility').upsert(
      {
        content_id: photoKey,
        content_type: sourceType,
        hidden_at: action === 'hide' ? reviewedAt : null,
        hidden_by: action === 'hide' ? access.data.userId : null,
        hidden_reason: action === 'hide' ? cleanReason || null : null,
        image_url: imageUrl,
        owner_id: ownerId,
        source_id: sourceId,
        visibility,
      },
      { onConflict: 'content_type,content_id' },
    );

    if (visibilityError) return { data: null, error: visibilityError.message };
  }

  return { data: { action, photoKey, visibility }, error: null };
}

export async function updateVerificationNotes(
  requestId: string,
  payload: UpdateVerificationNotesPayload,
): Promise<ServiceResult<EditableVerificationRequest>> {
  const access = await requireInternalAccess();
  if (access.error) return access;

  const cleanRequestId = compactText(requestId);
  if (!cleanRequestId) return { data: null, error: 'Choose a verification request.' };

  const visibleValidation = validateDemoContent({
    documentType: payload.documentType ?? '',
    residentNote: payload.residentNote ?? '',
  });
  if (visibleValidation.error) return visibleValidation;

  const currentResult = await supabase
    .from('verifications')
    .select(VERIFICATION_COLUMNS)
    .eq('id', cleanRequestId)
    .maybeSingle<VerificationRow>();

  if (currentResult.error) return { data: null, error: currentResult.error.message };
  if (!currentResult.data) return { data: null, error: 'Verification request not found.' };

  const { data, error } = await supabase
    .from('verifications')
    .update({
      notes: buildVerificationNotes(currentResult.data.notes, payload),
      reviewer_note: payload.adminNote === undefined ? currentResult.data.reviewer_note : compactText(payload.adminNote) || null,
    })
    .eq('id', cleanRequestId)
    .select(VERIFICATION_COLUMNS)
    .single<VerificationRow>();

  if (error) return { data: null, error: error.message };

  const files = await listPrivateVerificationFiles(cleanRequestId);
  if (files.error || !files.data) return { data: null, error: files.error };
  return { data: mapVerification(data, files.data.map(fileToRow)), error: null };
}

function fileToRow(file: EditableVerificationFile): VerificationFileRow {
  return {
    created_at: file.createdAt,
    credential_id: file.credentialId,
    file_path: file.filePath,
    file_type: file.fileType,
    id: file.id,
    url: null,
    verification_id: file.requestId,
  };
}

export async function listPrivateVerificationFiles(requestId: string): Promise<ServiceResult<EditableVerificationFile[]>> {
  const access = await requireInternalAccess();
  if (access.error) return access;

  const cleanRequestId = compactText(requestId);
  if (!cleanRequestId) return { data: null, error: 'Choose a verification request.' };

  const { data, error } = await supabase
    .from('verification_files')
    .select(VERIFICATION_FILE_COLUMNS)
    .eq('verification_id', cleanRequestId)
    .order('created_at', { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: ((data as VerificationFileRow[] | null) ?? []).map(mapVerificationFile), error: null };
}

export async function createSignedVerificationFileUrl(filePath: string): Promise<ServiceResult<string>> {
  const access = await requireInternalAccess();
  if (access.error) return access;

  const cleanFilePath = compactText(filePath);
  if (!cleanFilePath) return { data: null, error: 'This verification file has no private storage path.' };
  if (/^https?:\/\//i.test(cleanFilePath)) {
    return { data: null, error: 'Legacy public verification URLs are not opened from the internal editor.' };
  }

  const { data, error } = await supabase.storage
    .from(PRIVATE_DOCUMENT_BUCKET)
    .createSignedUrl(cleanFilePath, SIGNED_VERIFICATION_URL_SECONDS);

  if (error || !data?.signedUrl) return { data: null, error: error?.message ?? 'Could not create a signed file link.' };
  return { data: data.signedUrl, error: null };
}

export async function upsertPrivateVerificationFile({
  file,
  fileId,
  fileType,
  requestId,
}: {
  file: PrivateVerificationFileAsset;
  fileId?: string | null;
  fileType: EditableVerificationFileType | string;
  requestId: string;
}): Promise<ServiceResult<EditableVerificationFile>> {
  const access = await requireInternalAccess();
  if (access.error) return access;

  const cleanRequestId = compactText(requestId);
  const cleanFileId = compactText(fileId);
  const cleanFileType = compactText(fileType) as EditableVerificationFileType;
  if (!cleanRequestId) return { data: null, error: 'Choose a verification request first.' };
  if (!EDITABLE_VERIFICATION_FILE_TYPES.includes(cleanFileType)) return { data: null, error: 'Choose a valid verification file type.' };

  const validation = validatePrivateVerificationFileAsset(file);
  if (validation.error) return validation;

  const requestResult = await supabase
    .from('verifications')
    .select('id, user_id')
    .eq('id', cleanRequestId)
    .maybeSingle<{ id: string; user_id: string }>();

  if (requestResult.error) return { data: null, error: requestResult.error.message };
  if (!requestResult.data) return { data: null, error: 'Verification request not found.' };

  const fileName = normalizeFileName(file.name ?? '', `${cleanFileType}.jpg`);
  const path = `${requestResult.data.user_id}/internal-demo/${cleanRequestId}-${cleanFileType}-${Date.now()}-${fileName}`;

  try {
    const uploadBody = await getFileUploadBody(file, fileName);
    if (uploadBody.error || !uploadBody.data) return { data: null, error: uploadBody.error ?? 'Could not read this file.' };

    const uploadResult = await supabase.storage.from(PRIVATE_DOCUMENT_BUCKET).upload(path, uploadBody.data.body, {
      contentType: uploadBody.data.contentType,
      upsert: false,
    });

    if (uploadResult.error) return { data: null, error: uploadResult.error.message };
  } catch {
    return { data: null, error: `Could not upload ${file.name || 'verification file'}.` };
  }

  const query = cleanFileId
    ? supabase
        .from('verification_files')
        .update({ file_path: path, file_type: cleanFileType, url: null })
        .eq('id', cleanFileId)
        .eq('verification_id', cleanRequestId)
    : supabase
        .from('verification_files')
        .insert({ file_path: path, file_type: cleanFileType, url: null, verification_id: cleanRequestId });

  const { data, error } = await query.select(VERIFICATION_FILE_COLUMNS).single<VerificationFileRow>();
  if (error) return { data: null, error: error.message };
  return { data: mapVerificationFile(data), error: null };
}

export async function uploadPublicDemoImage(
  file: PublicDemoImageAsset,
  targetType: PublicDemoImageTarget,
): Promise<ServiceResult<string>> {
  const access = await requireInternalAccess();
  if (access.error || !access.data) return access;

  const validation = validatePublicImageAsset(file);
  if (validation.error) return validation;

  const bucket = targetType === 'profile_photo' ? 'profile-photos' : targetType === 'job_photo' ? 'job-photos' : 'service-photos';
  const fileName = normalizeFileName(file.name ?? '', `${targetType}.jpg`);
  const path = `${access.data.userId}/internal-demo/${targetType}-${Date.now()}-${fileName}`;

  try {
    const uploadBody = await getFileUploadBody(file, fileName);
    if (uploadBody.error || !uploadBody.data) return { data: null, error: uploadBody.error ?? 'Could not read this image.' };

    const { error } = await supabase.storage.from(bucket).upload(path, uploadBody.data.body, {
      contentType: uploadBody.data.contentType,
      upsert: false,
    });

    if (error) return { data: null, error: error.message };
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { data: data.publicUrl, error: null };
  } catch {
    return { data: null, error: `Could not upload ${file.name || 'image'}.` };
  }
}

async function getFileUploadBody(
  file: PublicDemoImageAsset,
  fileName: string,
): Promise<ServiceResult<PublicDemoImageUploadBody>> {
  const contentType = file.mimeType ?? contentTypeFromName(fileName) ?? 'image/jpeg';

  if (/^(blob:|data:|https?:\/\/)/i.test(file.uri)) {
    const response = await fetch(file.uri);
    if (!response.ok) return { data: null, error: `Could not read ${file.name || 'image'}.` };
    const body = await response.arrayBuffer();
    return { data: { body, contentType: response.headers.get('content-type') ?? contentType }, error: null };
  }

  const localFile = new ExpoFile(file.uri);
  const body = await localFile.arrayBuffer();
  return { data: { body, contentType }, error: null };
}

function validatePrivateVerificationFileAsset(file: PrivateVerificationFileAsset): ServiceResult<void> {
  if (!file.uri) return { data: null, error: 'Choose a verification file first.' };
  if (file.size && file.size > MAX_PRIVATE_VERIFICATION_FILE_BYTES) {
    return { data: null, error: 'Choose a verification file under 10 MB.' };
  }

  return { data: undefined, error: null };
}

function validatePublicImageAsset(file: PublicDemoImageAsset): ServiceResult<void> {
  if (!file.uri) return { data: null, error: 'Choose an image file first.' };
  if (file.size && file.size > MAX_PUBLIC_IMAGE_BYTES) {
    return { data: null, error: 'Choose an image under 5 MB.' };
  }

  const mimeType = compactText(file.mimeType).toLowerCase();
  const extension = getExtension(file.name ?? file.uri);

  if (mimeType && !PUBLIC_IMAGE_MIME_TYPES.has(mimeType)) {
    return { data: null, error: 'Public demo images must be JPG, PNG, or WebP.' };
  }

  if (!mimeType && extension && !PUBLIC_IMAGE_EXTENSIONS.has(extension)) {
    return { data: null, error: 'Public demo images must be JPG, PNG, or WebP.' };
  }

  return { data: undefined, error: null };
}

function getExtension(value: string | null | undefined) {
  const cleanValue = compactText(value).split('?')[0] ?? '';
  const extension = cleanValue.includes('.') ? cleanValue.split('.').pop()?.toLowerCase() : '';
  return extension ?? '';
}

function contentTypeFromName(name: string) {
  const extension = getExtension(name);
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  return null;
}

function normalizeFileName(value: string, fallback: string) {
  return (compactText(value) || fallback).replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 90);
}

function getLegacyVerificationFilePath(url: string | null | undefined) {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${PRIVATE_DOCUMENT_BUCKET}/`;
  const markerIndex = url.indexOf(marker);
  if (markerIndex >= 0) {
    return decodeURIComponent(url.slice(markerIndex + marker.length).split('?')[0] ?? '');
  }
  if (!/^https?:\/\//i.test(url)) return url;
  return null;
}

function getStoragePathFromPublicUrl(imageUrl: string) {
  const marker = '/storage/v1/object/public/';
  const markerIndex = imageUrl.indexOf(marker);
  if (markerIndex < 0) return null;

  const pathStart = markerIndex + marker.length;
  const path = imageUrl.slice(pathStart).split('?')[0];
  return path ? decodeURIComponent(path) : null;
}

export function getBannedVisibleWords() {
  return [...BANNED_VISIBLE_WORDS];
}

export function getEditableJobStatuses() {
  return [...EDITABLE_JOB_STATUSES];
}

export function getEditableRateTypes() {
  return [...EDITABLE_RATE_TYPES];
}

export function getEditableVerificationFileTypes() {
  return [...EDITABLE_VERIFICATION_FILE_TYPES];
}

export function getEditableConversationStatuses() {
  return [...EDITABLE_CONVERSATION_STATUSES];
}

export function getEditableReportStatuses() {
  return [...EDITABLE_REPORT_STATUSES];
}
