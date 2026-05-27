import type { ServiceResult } from '@/services/auth.service';
import {
  compactText,
  isCurrentUserAdmin,
  normalizeRateType,
  validateRateRange,
} from '@/services/marketplace.helpers';
import { getStoredMvpServiceOption, isMvpServiceCategory } from '@/constants/service-taxonomy';
import { supabase } from '@/utils/supabase';

const VERIFICATION_BUCKET = 'verification-files';
const VERIFICATION_FILE_SIGNED_URL_SECONDS = 10 * 60;

const ACTIVE_JOB_STATUSES = new Set(['open', 'reviewing', 'in_progress']);
const BANNED_VISIBLE_WORDS = [
  'api key',
  'bearer ',
  'jwt',
  'password',
  'private key',
  'secret',
  'service role',
  'service_role',
  'token',
];

export type DemoEditorVerificationStatus = 'verified' | 'pending' | 'rejected' | 'unverified';
export type DemoEditorUserFilter = DemoEditorVerificationStatus | 'all';

export type DemoEditorCounts = {
  conversations: number;
  jobs: number;
  photos: number;
  reports: number;
  reviews: number;
  services: number;
};

export type DemoEditorUserListItem = {
  avatarUrl: string | null;
  id: string;
  location: string;
  name: string;
  roles: string[];
  status: DemoEditorVerificationStatus;
  counts: DemoEditorCounts;
};

export type DemoEditorProfile = {
  about: string;
  avatarUrl: string;
  barangay: string;
  city: string;
  firstName: string;
  fullName: string;
  id: string;
  lastName: string;
  preferredContactMethod: string;
  street: string;
  availability: string;
};

export type DemoEditorJob = {
  budgetMax: number | null;
  budgetMin: number | null;
  category: string;
  description: string;
  id: string;
  locationText: string;
  photoUrls: string[];
  rateType: string;
  scheduleText: string;
  serviceNeeded: string;
  status: string;
  tags: string[];
  title: string;
  updatedAt: string;
};

export type DemoEditorService = {
  availabilityText: string;
  category: string;
  customCategory: string;
  description: string;
  id: string;
  isActive: boolean;
  locationText: string;
  photoUrls: string[];
  rateMax: number | null;
  rateMin: number | null;
  rateText: string;
  rateType: string;
  tags: string[];
  title: string;
  updatedAt: string;
  yearsExperience: number | null;
};

export type DemoEditorVerification = {
  createdAt: string;
  id: string;
  notes: string;
  reviewerNote: string;
  status: string;
};

export type DemoEditorDocument = {
  createdAt: string;
  fileType: string;
  id: string;
  signedUrl: string;
};

export type DemoEditorActivityItem = {
  createdAt: string;
  id: string;
  meta: string;
  status: string;
  title: string;
};

export type DemoEditorUserDetail = {
  counts: DemoEditorCounts;
  documents: DemoEditorDocument[];
  isVerified: boolean;
  jobs: DemoEditorJob[];
  profile: DemoEditorProfile;
  reports: DemoEditorActivityItem[];
  reviews: DemoEditorActivityItem[];
  roles: string[];
  services: DemoEditorService[];
  conversations: DemoEditorActivityItem[];
  verification: DemoEditorVerification | null;
  status: DemoEditorVerificationStatus;
};

export type DemoEditorProfileDraft = Omit<DemoEditorProfile, 'id'>;
export type DemoEditorJobDraft = Omit<DemoEditorJob, 'id' | 'updatedAt'>;
export type DemoEditorServiceDraft = Omit<DemoEditorService, 'id' | 'updatedAt'>;
export type DemoEditorVerificationDraft = {
  notes: string;
  reviewerNote: string;
};

type ProfileRow = {
  about: string | null;
  avatar_url: string | null;
  barangay: string | null;
  city: string | null;
  first_name: string | null;
  full_name: string | null;
  id: string;
  last_name: string | null;
  preferred_contact_method?: string | null;
  street?: string | null;
  street_address?: string | null;
  availability: string | null;
  barangay_verified_at: string | null;
  verified_at: string | null;
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
  status: string;
  user_id: string;
};

type VerificationFileRow = {
  created_at: string;
  file_path?: string | null;
  file_type: string;
  id: string;
  url?: string | null;
  verification_id: string;
};

type JobRow = {
  budget_max?: number | null;
  budget_min?: number | null;
  category: string | null;
  client_id?: string | null;
  description: string | null;
  id: string;
  location_text?: string | null;
  owner_id: string;
  photo_urls?: string[] | null;
  rate_type?: string | null;
  schedule_text?: string | null;
  service_needed?: string | null;
  status: string;
  tags?: string[] | null;
  title: string;
  updated_at: string;
};

type ServiceRow = {
  availability_text: string | null;
  category: string;
  custom_category?: string | null;
  description: string | null;
  id: string;
  is_active: boolean;
  location_text?: string | null;
  photo_urls?: string[] | null;
  provider_id: string;
  rate_max?: number | null;
  rate_min?: number | null;
  rate_text: string | null;
  rate_type?: string | null;
  tags?: string[] | null;
  title: string;
  updated_at: string;
  years_experience: number | null;
};

type ConversationRow = {
  client_id: string;
  created_at: string;
  id: string;
  job_id: string | null;
  provider_id: string;
  service_id: string | null;
  status: string;
  updated_at: string;
};

type ReviewRow = {
  comment: string | null;
  created_at: string;
  id: string;
  rating: number;
  reviewee_id: string;
  reviewer_id: string;
};

type ReportRow = {
  created_at: string;
  id: string;
  reason: string;
  reported_user_id: string | null;
  reporter_id: string;
  status: string;
};

export async function listDemoEditorUsers({
  filter = 'all',
  search = '',
}: {
  filter?: DemoEditorUserFilter;
  search?: string;
} = {}): Promise<ServiceResult<DemoEditorUserListItem[]>> {
  const access = await requireInternalEditorAccess();
  if (access.error) return access;

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select(
      'id, first_name, last_name, full_name, barangay, city, street, street_address, avatar_url, about, availability, preferred_contact_method, verified_at, barangay_verified_at',
    )
    .order('updated_at', { ascending: false })
    .limit(150)
    .returns<ProfileRow[]>();

  if (error) return { data: null, error: error.message };

  const userIds = (profiles ?? []).map((profile) => profile.id);
  const [roles, verifications, jobs, services, conversations, reviews, reports] = await Promise.all([
    fetchRoles(userIds),
    fetchLatestVerifications(userIds),
    fetchJobsForUsers(userIds),
    fetchServicesForUsers(userIds),
    fetchConversationsForUsers(userIds),
    fetchReviewsForUsers(userIds),
    fetchReportsForUsers(userIds),
  ]);

  const cleanSearch = compactText(search).toLowerCase();
  const latestVerifications = verifications.data ?? new Map<string, VerificationRow>();
  const items = (profiles ?? [])
    .map((profile) =>
      mapUserListItem({
        conversations: conversations.data ?? [],
        jobs: jobs.data ?? [],
        profile,
        reports: reports.data ?? [],
        reviews: reviews.data ?? [],
        roles: roles.data ?? [],
        services: services.data ?? [],
        verification: latestVerifications.get(profile.id) ?? null,
      }),
    )
    .filter((item) => filter === 'all' || item.status === filter)
    .filter((item) => {
      if (!cleanSearch) return true;
      return [item.name, item.location, item.roles.join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(cleanSearch);
    });

  return { data: items, error: null };
}

export async function getDemoEditorUserDetail(
  userId: string,
): Promise<ServiceResult<DemoEditorUserDetail>> {
  const access = await requireInternalEditorAccess();
  if (access.error) return access;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(
      'id, first_name, last_name, full_name, barangay, city, street, street_address, avatar_url, about, availability, preferred_contact_method, verified_at, barangay_verified_at',
    )
    .eq('id', userId)
    .maybeSingle<ProfileRow>();

  if (error) return { data: null, error: error.message };
  if (!profile) return { data: null, error: 'Resident not found.' };

  const [roles, verifications, jobs, services, conversations, reviews, reports] = await Promise.all([
    fetchRoles([userId]),
    fetchLatestVerifications([userId]),
    fetchJobsForUsers([userId]),
    fetchServicesForUsers([userId]),
    fetchConversationsForUsers([userId]),
    fetchReviewsForUsers([userId]),
    fetchReportsForUsers([userId]),
  ]);

  const verification = (verifications.data ?? new Map<string, VerificationRow>()).get(userId) ?? null;
  const documents = verification ? await fetchVerificationDocuments(verification.id) : [];
  const roleValues = roles.data?.map((role) => role.role) ?? [];
  const mappedJobs = (jobs.data ?? []).map(mapJob);
  const mappedServices = (services.data ?? []).map(mapService);
  const status = getVerificationStatus(profile, verification);
  const counts = getCounts({
    conversations: conversations.data ?? [],
    jobs: jobs.data ?? [],
    profile,
    reports: reports.data ?? [],
    reviews: reviews.data ?? [],
    services: services.data ?? [],
  });

  return {
    data: {
      conversations: (conversations.data ?? []).map(mapConversation),
      counts,
      documents,
      isVerified: status === 'verified',
      jobs: mappedJobs,
      profile: mapProfile(profile),
      reports: (reports.data ?? []).map(mapReport),
      reviews: (reviews.data ?? []).map(mapReview),
      roles: roleValues,
      services: mappedServices,
      status,
      verification: verification ? mapVerification(verification) : null,
    },
    error: null,
  };
}

export async function saveDemoEditorProfile(
  userId: string,
  draft: DemoEditorProfileDraft,
): Promise<ServiceResult<DemoEditorProfile>> {
  const access = await requireInternalEditorAccess();
  if (access.error) return access;

  const validation = validateVisibleText([
    draft.fullName,
    draft.firstName,
    draft.lastName,
    draft.about,
    draft.availability,
    draft.barangay,
    draft.city,
    draft.street,
  ]);
  if (validation) return { data: null, error: validation };

  const { data, error } = await supabase
    .from('profiles')
    .update({
      about: nullableText(draft.about),
      avatar_url: nullableText(draft.avatarUrl),
      availability: nullableText(draft.availability),
      barangay: nullableText(draft.barangay),
      city: nullableText(draft.city),
      first_name: nullableText(draft.firstName),
      full_name: nullableText(draft.fullName),
      last_name: nullableText(draft.lastName),
      preferred_contact_method: normalizePreferredContact(draft.preferredContactMethod),
      street: nullableText(draft.street),
    })
    .eq('id', userId)
    .select(
      'id, first_name, last_name, full_name, barangay, city, street, street_address, avatar_url, about, availability, preferred_contact_method, verified_at, barangay_verified_at',
    )
    .maybeSingle<ProfileRow>();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: 'Resident not found.' };

  return { data: mapProfile(data), error: null };
}

export async function saveDemoEditorJob({
  draft,
  isResidentVerified,
  jobId,
  userId,
}: {
  draft: DemoEditorJobDraft;
  isResidentVerified: boolean;
  jobId: string;
  userId: string;
}): Promise<ServiceResult<DemoEditorJob>> {
  const access = await requireInternalEditorAccess();
  if (access.error) return access;

  const validation = validateJobDraft(draft, isResidentVerified);
  if (validation) return { data: null, error: validation };

  const { data, error } = await supabase
    .from('jobs')
    .update({
      budget_max: draft.budgetMax,
      budget_min: draft.budgetMin,
      category: nullableText(draft.category),
      description: nullableText(draft.description),
      location_text: nullableText(draft.locationText),
      photo_urls: cleanStringList(draft.photoUrls),
      rate_type: normalizeRateType(draft.rateType),
      schedule_text: nullableText(draft.scheduleText),
      service_needed: nullableText(draft.serviceNeeded),
      status: normalizeJobStatus(draft.status),
      tags: cleanStringList(draft.tags),
      title: compactText(draft.title),
    })
    .eq('id', jobId)
    .or(`owner_id.eq.${userId},client_id.eq.${userId}`)
    .select(jobSelect)
    .maybeSingle<JobRow>();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: 'Job not found for this resident.' };

  return { data: mapJob(data), error: null };
}

export async function saveDemoEditorService({
  draft,
  isResidentVerified,
  serviceId,
  userId,
}: {
  draft: DemoEditorServiceDraft;
  isResidentVerified: boolean;
  serviceId: string;
  userId: string;
}): Promise<ServiceResult<DemoEditorService>> {
  const access = await requireInternalEditorAccess();
  if (access.error) return access;

  const validation = validateServiceDraft(draft, isResidentVerified);
  if (validation) return { data: null, error: validation };

  const { data, error } = await supabase
    .from('services')
    .update({
      availability_text: nullableText(draft.availabilityText),
      category: compactText(draft.category),
      custom_category: nullableText(draft.customCategory),
      description: nullableText(draft.description),
      is_active: Boolean(draft.isActive),
      location_text: nullableText(draft.locationText),
      photo_urls: cleanStringList(draft.photoUrls),
      rate_max: draft.rateMax,
      rate_min: draft.rateMin,
      rate_text: nullableText(draft.rateText),
      rate_type: normalizeRateType(draft.rateType),
      tags: cleanStringList(draft.tags),
      title: compactText(draft.title),
      years_experience: draft.yearsExperience,
    })
    .eq('id', serviceId)
    .eq('provider_id', userId)
    .select(serviceSelect)
    .maybeSingle<ServiceRow>();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: 'Service not found for this resident.' };

  return { data: mapService(data), error: null };
}

export async function saveDemoEditorVerificationNotes({
  draft,
  userId,
  verificationId,
}: {
  draft: DemoEditorVerificationDraft;
  userId: string;
  verificationId: string;
}): Promise<ServiceResult<DemoEditorVerification>> {
  const access = await requireInternalEditorAccess();
  if (access.error) return access;

  const validation = validateVisibleText([draft.notes, draft.reviewerNote]);
  if (validation) return { data: null, error: validation };

  const { data, error } = await supabase
    .from('verifications')
    .update({
      notes: nullableText(draft.notes),
      reviewer_note: nullableText(draft.reviewerNote),
    })
    .eq('id', verificationId)
    .eq('user_id', userId)
    .select('id, user_id, status, notes, reviewer_note, created_at')
    .maybeSingle<VerificationRow>();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: 'Verification request not found for this resident.' };

  return { data: mapVerification(data), error: null };
}

async function requireInternalEditorAccess(): Promise<ServiceResult<true>> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return { data: null, error: 'Only barangay admins can open the internal demo editor.' };
  }

  return { data: true, error: null };
}

const jobSelect =
  'id, owner_id, client_id, title, description, category, service_needed, tags, photo_urls, location_text, budget_min, budget_max, rate_type, schedule_text, status, updated_at';

const serviceSelect =
  'id, provider_id, category, title, description, tags, photo_urls, years_experience, availability_text, rate_text, rate_min, rate_max, rate_type, custom_category, location_text, is_active, updated_at';

async function fetchRoles(userIds: string[]): Promise<ServiceResult<RoleRow[]>> {
  if (!userIds.length) return { data: [], error: null };
  const { data, error } = await supabase
    .from('user_roles')
    .select('user_id, role')
    .in('user_id', userIds)
    .returns<RoleRow[]>();

  return error ? { data: null, error: error.message } : { data: data ?? [], error: null };
}

async function fetchLatestVerifications(
  userIds: string[],
): Promise<ServiceResult<Map<string, VerificationRow>>> {
  if (!userIds.length) return { data: new Map(), error: null };

  const { data, error } = await supabase
    .from('verifications')
    .select('id, user_id, status, notes, reviewer_note, created_at')
    .in('user_id', userIds)
    .order('created_at', { ascending: false })
    .returns<VerificationRow[]>();

  if (error) return { data: null, error: error.message };

  const latest = new Map<string, VerificationRow>();
  (data ?? []).forEach((row) => {
    if (!latest.has(row.user_id)) latest.set(row.user_id, row);
  });

  return { data: latest, error: null };
}

async function fetchJobsForUsers(userIds: string[]): Promise<ServiceResult<JobRow[]>> {
  if (!userIds.length) return { data: [], error: null };
  const { data, error } = await supabase
    .from('jobs')
    .select(jobSelect)
    .or(`owner_id.in.(${userIds.join(',')}),client_id.in.(${userIds.join(',')})`)
    .order('updated_at', { ascending: false })
    .returns<JobRow[]>();

  return error ? { data: null, error: error.message } : { data: data ?? [], error: null };
}

async function fetchServicesForUsers(userIds: string[]): Promise<ServiceResult<ServiceRow[]>> {
  if (!userIds.length) return { data: [], error: null };
  const { data, error } = await supabase
    .from('services')
    .select(serviceSelect)
    .in('provider_id', userIds)
    .order('updated_at', { ascending: false })
    .returns<ServiceRow[]>();

  return error ? { data: null, error: error.message } : { data: data ?? [], error: null };
}

async function fetchConversationsForUsers(userIds: string[]): Promise<ServiceResult<ConversationRow[]>> {
  if (!userIds.length) return { data: [], error: null };
  const { data, error } = await supabase
    .from('conversations')
    .select('id, client_id, provider_id, job_id, service_id, status, created_at, updated_at')
    .or(`client_id.in.(${userIds.join(',')}),provider_id.in.(${userIds.join(',')})`)
    .order('updated_at', { ascending: false })
    .limit(80)
    .returns<ConversationRow[]>();

  return error ? { data: null, error: error.message } : { data: data ?? [], error: null };
}

async function fetchReviewsForUsers(userIds: string[]): Promise<ServiceResult<ReviewRow[]>> {
  if (!userIds.length) return { data: [], error: null };
  const { data, error } = await supabase
    .from('reviews')
    .select('id, reviewer_id, reviewee_id, rating, comment, created_at')
    .or(`reviewer_id.in.(${userIds.join(',')}),reviewee_id.in.(${userIds.join(',')})`)
    .order('created_at', { ascending: false })
    .limit(80)
    .returns<ReviewRow[]>();

  return error ? { data: null, error: error.message } : { data: data ?? [], error: null };
}

async function fetchReportsForUsers(userIds: string[]): Promise<ServiceResult<ReportRow[]>> {
  if (!userIds.length) return { data: [], error: null };
  const { data, error } = await supabase
    .from('reports')
    .select('id, reporter_id, reported_user_id, reason, status, created_at')
    .or(`reporter_id.in.(${userIds.join(',')}),reported_user_id.in.(${userIds.join(',')})`)
    .order('created_at', { ascending: false })
    .limit(80)
    .returns<ReportRow[]>();

  return error ? { data: null, error: error.message } : { data: data ?? [], error: null };
}

async function fetchVerificationDocuments(verificationId: string) {
  const { data } = await supabase
    .from('verification_files')
    .select('id, verification_id, file_type, file_path, url, created_at')
    .eq('verification_id', verificationId)
    .order('created_at', { ascending: false })
    .returns<VerificationFileRow[]>();

  const documents = await Promise.all((data ?? []).map(mapVerificationDocument));
  return documents.filter((document): document is DemoEditorDocument => Boolean(document));
}

async function mapVerificationDocument(file: VerificationFileRow) {
  const filePath = file.file_path ?? getLegacyVerificationFilePath(file.url);
  if (!filePath) return null;

  const { data, error } = await supabase.storage
    .from(VERIFICATION_BUCKET)
    .createSignedUrl(filePath, VERIFICATION_FILE_SIGNED_URL_SECONDS);

  if (error || !data?.signedUrl) return null;

  return {
    createdAt: file.created_at,
    fileType: file.file_type,
    id: file.id,
    signedUrl: data.signedUrl,
  };
}

function getLegacyVerificationFilePath(value: string | null | undefined) {
  const clean = compactText(value);
  if (!clean) return null;
  if (!/^https?:\/\//i.test(clean)) return clean;

  const marker = `/storage/v1/object/public/${VERIFICATION_BUCKET}/`;
  const markerIndex = clean.indexOf(marker);
  if (markerIndex < 0) return null;

  return decodeURIComponent(clean.slice(markerIndex + marker.length).replace(/\?.*$/, ''));
}

function mapUserListItem({
  conversations,
  jobs,
  profile,
  reports,
  reviews,
  roles,
  services,
  verification,
}: {
  conversations: ConversationRow[];
  jobs: JobRow[];
  profile: ProfileRow;
  reports: ReportRow[];
  reviews: ReviewRow[];
  roles: RoleRow[];
  services: ServiceRow[];
  verification: VerificationRow | null;
}): DemoEditorUserListItem {
  return {
    avatarUrl: profile.avatar_url,
    counts: getCounts({ conversations, jobs, profile, reports, reviews, services }),
    id: profile.id,
    location: formatLocation(profile),
    name: getProfileName(profile),
    roles: roles.filter((role) => role.user_id === profile.id).map((role) => role.role),
    status: getVerificationStatus(profile, verification),
  };
}

function mapProfile(profile: ProfileRow): DemoEditorProfile {
  return {
    about: compactText(profile.about),
    avatarUrl: compactText(profile.avatar_url),
    availability: compactText(profile.availability),
    barangay: compactText(profile.barangay),
    city: compactText(profile.city),
    firstName: compactText(profile.first_name),
    fullName: compactText(profile.full_name),
    id: profile.id,
    lastName: compactText(profile.last_name),
    preferredContactMethod: compactText(profile.preferred_contact_method),
    street: compactText(profile.street) || compactText(profile.street_address),
  };
}

function mapJob(job: JobRow): DemoEditorJob {
  return {
    budgetMax: job.budget_max ?? null,
    budgetMin: job.budget_min ?? null,
    category: compactText(job.category),
    description: compactText(job.description),
    id: job.id,
    locationText: compactText(job.location_text),
    photoUrls: cleanStringList(job.photo_urls),
    rateType: normalizeRateType(job.rate_type),
    scheduleText: compactText(job.schedule_text),
    serviceNeeded: compactText(job.service_needed),
    status: compactText(job.status) || 'open',
    tags: cleanStringList(job.tags),
    title: compactText(job.title),
    updatedAt: job.updated_at,
  };
}

function mapService(service: ServiceRow): DemoEditorService {
  return {
    availabilityText: compactText(service.availability_text),
    category: compactText(service.category),
    customCategory: compactText(service.custom_category),
    description: compactText(service.description),
    id: service.id,
    isActive: Boolean(service.is_active),
    locationText: compactText(service.location_text),
    photoUrls: cleanStringList(service.photo_urls),
    rateMax: service.rate_max ?? null,
    rateMin: service.rate_min ?? null,
    rateText: compactText(service.rate_text),
    rateType: normalizeRateType(service.rate_type),
    tags: cleanStringList(service.tags),
    title: compactText(service.title),
    updatedAt: service.updated_at,
    yearsExperience: service.years_experience ?? null,
  };
}

function mapVerification(verification: VerificationRow): DemoEditorVerification {
  return {
    createdAt: verification.created_at,
    id: verification.id,
    notes: compactText(verification.notes),
    reviewerNote: compactText(verification.reviewer_note),
    status: verification.status,
  };
}

function mapConversation(conversation: ConversationRow): DemoEditorActivityItem {
  return {
    createdAt: conversation.updated_at || conversation.created_at,
    id: conversation.id,
    meta: [conversation.job_id ? 'Job' : null, conversation.service_id ? 'Service' : null]
      .filter(Boolean)
      .join(' / ') || 'Direct conversation',
    status: conversation.status,
    title: 'Conversation',
  };
}

function mapReview(review: ReviewRow): DemoEditorActivityItem {
  return {
    createdAt: review.created_at,
    id: review.id,
    meta: compactText(review.comment) || 'No written comment',
    status: `${review.rating}/5`,
    title: 'Review',
  };
}

function mapReport(report: ReportRow): DemoEditorActivityItem {
  return {
    createdAt: report.created_at,
    id: report.id,
    meta: report.reason,
    status: report.status,
    title: 'Report',
  };
}

function getCounts({
  conversations,
  jobs,
  profile,
  reports,
  reviews,
  services,
}: {
  conversations: ConversationRow[];
  jobs: JobRow[];
  profile: ProfileRow;
  reports: ReportRow[];
  reviews: ReviewRow[];
  services: ServiceRow[];
}): DemoEditorCounts {
  const userId = profile.id;
  const userJobs = jobs.filter((job) => job.owner_id === userId || job.client_id === userId);
  const userServices = services.filter((service) => service.provider_id === userId);
  const photos =
    (profile.avatar_url ? 1 : 0) +
    userJobs.reduce((sum, job) => sum + cleanStringList(job.photo_urls).length, 0) +
    userServices.reduce((sum, service) => sum + cleanStringList(service.photo_urls).length, 0);

  return {
    conversations: conversations.filter(
      (conversation) => conversation.client_id === userId || conversation.provider_id === userId,
    ).length,
    jobs: userJobs.length,
    photos,
    reports: reports.filter(
      (report) => report.reporter_id === userId || report.reported_user_id === userId,
    ).length,
    reviews: reviews.filter((review) => review.reviewer_id === userId || review.reviewee_id === userId)
      .length,
    services: userServices.length,
  };
}

function getVerificationStatus(
  profile: ProfileRow,
  verification: VerificationRow | null,
): DemoEditorVerificationStatus {
  if (profile.barangay_verified_at || profile.verified_at || verification?.status === 'approved') {
    return 'verified';
  }

  if (verification?.status === 'rejected') return 'rejected';
  if (verification?.status === 'pending' || verification?.status === 'needs_more_info') return 'pending';
  return 'unverified';
}

function getProfileName(profile: ProfileRow) {
  return (
    compactText(profile.full_name) ||
    `${compactText(profile.first_name)} ${compactText(profile.last_name)}`.trim() ||
    'Konektado resident'
  );
}

function formatLocation(profile: ProfileRow) {
  return [compactText(profile.barangay), compactText(profile.city)].filter(Boolean).join(', ') || 'No address';
}

function validateJobDraft(draft: DemoEditorJobDraft, isResidentVerified: boolean) {
  if (!compactText(draft.title)) return 'Job title is required.';
  if (!compactText(draft.category)) return 'Job category is required.';
  if (!compactText(draft.serviceNeeded)) return 'Service needed is required.';
  if (!isSupportedTaxonomyValue(draft.category) && !isSupportedTaxonomyValue(draft.serviceNeeded)) {
    return 'Use an MVP service category or service label for jobs.';
  }
  if (!isResidentVerified && ACTIVE_JOB_STATUSES.has(normalizeJobStatus(draft.status))) {
    return 'This user is not verified. Active public jobs and services are blocked.';
  }

  const visibleTextError = validateVisibleText([
    draft.title,
    draft.description,
    draft.category,
    draft.serviceNeeded,
    draft.locationText,
    draft.scheduleText,
    ...draft.tags,
  ]);
  if (visibleTextError) return visibleTextError;

  const range = validateRateRange({
    max: draft.budgetMax,
    min: draft.budgetMin,
    rateType: draft.rateType,
  });
  if (!range.valid) return range.error;

  return null;
}

function validateServiceDraft(draft: DemoEditorServiceDraft, isResidentVerified: boolean) {
  if (!compactText(draft.title)) return 'Service title is required.';
  if (!compactText(draft.category)) return 'Service category is required.';
  if (!isSupportedTaxonomyValue(draft.category) && !compactText(draft.customCategory)) {
    return 'Use an MVP service category or provide a custom category note.';
  }
  if (!isResidentVerified && draft.isActive) {
    return 'This user is not verified. Active public jobs and services are blocked.';
  }

  const visibleTextError = validateVisibleText([
    draft.title,
    draft.description,
    draft.category,
    draft.customCategory,
    draft.availabilityText,
    draft.locationText,
    draft.rateText,
    ...draft.tags,
  ]);
  if (visibleTextError) return visibleTextError;

  const range = validateRateRange({
    max: draft.rateMax,
    min: draft.rateMin,
    rateType: draft.rateType,
  });
  if (!range.valid) return range.error;

  if (draft.yearsExperience !== null && draft.yearsExperience < 0) {
    return 'Years of experience cannot be negative.';
  }

  return null;
}

function isSupportedTaxonomyValue(value: string) {
  const clean = compactText(value);
  return Boolean(clean && (isMvpServiceCategory(clean) || getStoredMvpServiceOption(clean)));
}

function validateVisibleText(values: string[]) {
  const body = values.join(' ').toLowerCase();
  const blocked = BANNED_VISIBLE_WORDS.find((word) => body.includes(word));
  return blocked ? `Remove unsafe visible text: "${blocked}".` : null;
}

function cleanStringList(values: string[] | null | undefined) {
  return Array.from(new Set((values ?? []).map(compactText).filter(Boolean)));
}

function nullableText(value: string) {
  return compactText(value) || null;
}

function normalizePreferredContact(value: string) {
  const clean = compactText(value);
  if (clean === 'phone' || clean === 'email' || clean === 'app_message') return clean;
  return null;
}

function normalizeJobStatus(value: string) {
  const clean = compactText(value);
  if (['open', 'reviewing', 'in_progress', 'completed', 'closed', 'cancelled'].includes(clean)) {
    return clean;
  }
  return 'closed';
}
