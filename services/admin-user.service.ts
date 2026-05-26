import type { ServiceResult } from '@/services/auth.service';
import {
  getPublicPhotoKey,
  type PublicPhotoSourceType,
  type PublicPhotoVisibility,
} from '@/services/content-visibility.service';
import {
  compactText,
  formatPublicLocation,
  isCurrentUserAdmin,
  mapProfile,
  type ProfileRow,
} from '@/services/marketplace.helpers';
import type { PublicProfileSummary } from '@/types/marketplace.types';
import type { VerificationStatus } from '@/types/verification.types';
import { supabase } from '@/utils/supabase';

export type AdminUserFilter = 'all' | 'verified' | 'pending';
export type AdminUserRole = 'worker' | 'client';
export type AdminUserVerificationStatus = 'verified' | 'pending' | 'unverified';

export type AdminUserPublicPhoto = {
  id: string;
  source: 'profile' | 'job' | 'service';
  sourceType: PublicPhotoSourceType;
  sourceId: string;
  title: string;
  imageUrl: string;
  createdAt: string;
  moderationStatus: 'visible' | 'flagged' | 'hidden' | 'cleared';
  visibility: PublicPhotoVisibility;
};

export type AdminUserActivityItem = {
  id: string;
  title: string;
  subtitle: string;
  statusLabel: string;
  createdAt: string;
  photoCount: number;
};

export type AdminUserReportItem = {
  id: string;
  reason: string;
  status: string;
  targetLabel: string;
  createdAt: string;
};

export type AdminUserListItem = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  location: string;
  roles: AdminUserRole[];
  roleLabel: string;
  verificationStatus: AdminUserVerificationStatus;
  verificationLabel: string;
  verificationRequestId: string | null;
  publicPhotosCount: number;
  activeJobsCount: number;
  activeServicesCount: number;
  reportCount: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AdminUserDetail = AdminUserListItem & {
  profile: PublicProfileSummary;
  about: string | null;
  availability: string | null;
  preferredContactMethod: string | null;
  latestVerification: {
    id: string;
    status: VerificationStatus;
    createdAt: string;
    updatedAt: string;
  } | null;
  activeJobs: AdminUserActivityItem[];
  activeServices: AdminUserActivityItem[];
  recentReports: AdminUserReportItem[];
  publicPhotos: AdminUserPublicPhoto[];
};

type AdminProfileRow = ProfileRow & {
  preferred_contact_method?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type UserRoleRow = {
  user_id: string;
  role: string;
  is_active: boolean | null;
};

type VerificationRow = {
  id: string;
  user_id: string;
  status: VerificationStatus;
  created_at: string;
  updated_at: string;
};

type AdminJobRow = {
  id: string;
  owner_id: string;
  client_id: string | null;
  title: string;
  category: string | null;
  service_needed: string | null;
  status: string;
  barangay: string | null;
  location_text: string | null;
  photo_urls: string[] | null;
  created_at: string;
  updated_at: string;
};

type AdminServiceRow = {
  id: string;
  provider_id: string;
  title: string;
  category: string | null;
  is_active: boolean | null;
  barangay: string | null;
  location_text: string | null;
  photo_urls: string[] | null;
  created_at: string;
  updated_at: string;
};

type AdminReportRow = {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  job_id: string | null;
  service_id: string | null;
  conversation_id: string | null;
  reason: string;
  status: string;
  created_at: string;
};

type PhotoActionRow = {
  status: 'flagged' | 'hidden' | 'cleared';
  target_id: string;
};

type PhotoVisibilityRow = {
  content_id: string;
  visibility: PublicPhotoVisibility;
};

type ListAdminUsersInput = {
  filter?: AdminUserFilter;
  limit?: number;
  search?: string;
};

const PROFILE_COLUMNS =
  'id, full_name, first_name, last_name, barangay, purok_sitio, street, subdivision_area, city, about, avatar_url, availability, verified_at, barangay_verified_at, preferred_contact_method, created_at, updated_at';
const ROLE_COLUMNS = 'user_id, role, is_active';
const VERIFICATION_COLUMNS = 'id, user_id, status, created_at, updated_at';
const JOB_COLUMNS =
  'id, owner_id, client_id, title, category, service_needed, status, barangay, location_text, photo_urls, created_at, updated_at';
const SERVICE_COLUMNS =
  'id, provider_id, title, category, is_active, barangay, location_text, photo_urls, created_at, updated_at';
const REPORT_COLUMNS =
  'id, reporter_id, reported_user_id, job_id, service_id, conversation_id, reason, status, created_at';

const ACTIVE_JOB_STATUSES = new Set(['open', 'reviewing', 'in_progress']);

export async function listAdminUsers({
  filter = 'all',
  limit = 120,
  search,
}: ListAdminUsersInput = {}): Promise<ServiceResult<AdminUserListItem[]>> {
  const admin = await requireAdmin();
  if (admin.error) return admin;

  const [profilesResult, rolesResult, verificationsResult, jobsResult, servicesResult, reportsResult] =
    await Promise.all([
      supabase
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .order('updated_at', { ascending: false })
        .limit(normalizeLimit(limit, 200)),
      supabase.from('user_roles').select(ROLE_COLUMNS),
      supabase.from('verifications').select(VERIFICATION_COLUMNS).order('created_at', { ascending: false }),
      supabase.from('jobs').select(JOB_COLUMNS).limit(500),
      supabase.from('services').select(SERVICE_COLUMNS).limit(500),
      supabase.from('reports').select(REPORT_COLUMNS).limit(500),
    ]);

  const error =
    profilesResult.error ??
    rolesResult.error ??
    verificationsResult.error ??
    jobsResult.error ??
    servicesResult.error ??
    reportsResult.error;

  if (error) return { data: null, error: error.message };

  const rows = ((profilesResult.data as AdminProfileRow[] | null) ?? []).filter(Boolean);
  const roles = (rolesResult.data as UserRoleRow[] | null) ?? [];
  const verifications = (verificationsResult.data as VerificationRow[] | null) ?? [];
  const jobs = (jobsResult.data as AdminJobRow[] | null) ?? [];
  const services = (servicesResult.data as AdminServiceRow[] | null) ?? [];
  const reports = (reportsResult.data as AdminReportRow[] | null) ?? [];

  const mapped = rows
    .filter((row) => !hasAdminRole(row.id, roles))
    .map((row) => mapUserListItem(row, roles, verifications, jobs, services, reports))
    .filter((item) => itemMatchesFilter(item, filter))
    .filter((item) => itemMatchesSearch(item, search));

  return { data: mapped, error: null };
}

export async function getAdminUserDetail(userId: string): Promise<ServiceResult<AdminUserDetail>> {
  const admin = await requireAdmin();
  if (admin.error) return admin;

  const cleanUserId = compactText(userId);
  if (!cleanUserId) return { data: null, error: 'Choose a user to review.' };

  const [profileResult, rolesResult, verificationsResult, jobsResult, servicesResult] =
    await Promise.all([
      supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', cleanUserId).maybeSingle<AdminProfileRow>(),
      supabase.from('user_roles').select(ROLE_COLUMNS).eq('user_id', cleanUserId),
      supabase
        .from('verifications')
        .select(VERIFICATION_COLUMNS)
        .eq('user_id', cleanUserId)
        .order('created_at', { ascending: false }),
      supabase
        .from('jobs')
        .select(JOB_COLUMNS)
        .or(`owner_id.eq.${cleanUserId},client_id.eq.${cleanUserId}`)
        .order('created_at', { ascending: false }),
      supabase
        .from('services')
        .select(SERVICE_COLUMNS)
        .eq('provider_id', cleanUserId)
        .order('created_at', { ascending: false }),
    ]);

  const error =
    profileResult.error ??
    rolesResult.error ??
    verificationsResult.error ??
    jobsResult.error ??
    servicesResult.error;

  if (error) return { data: null, error: error.message };
  if (!profileResult.data) return { data: null, error: 'User profile not found.' };

  const profileRow = profileResult.data;
  const roles = (rolesResult.data as UserRoleRow[] | null) ?? [];
  const verifications = (verificationsResult.data as VerificationRow[] | null) ?? [];
  const jobs = (jobsResult.data as AdminJobRow[] | null) ?? [];
  const services = (servicesResult.data as AdminServiceRow[] | null) ?? [];
  const reports = await loadReportsForUser(cleanUserId, jobs, services);
  const listItem = mapUserListItem(profileRow, roles, verifications, jobs, services, reports);
  const profile = mapProfile(profileRow);

  if (!profile) return { data: null, error: 'User profile not found.' };

  const publicPhotos = await mapPublicPhotosWithModeration(profileRow, jobs, services);

  return {
    data: {
      ...listItem,
      profile,
      about: compactText(profileRow.about) || null,
      availability: compactText(profileRow.availability) || null,
      preferredContactMethod: formatPreferredContact(profileRow.preferred_contact_method),
      latestVerification: getLatestVerification(cleanUserId, verifications),
      activeJobs: jobs
        .filter((job) => ACTIVE_JOB_STATUSES.has(job.status))
        .map(mapJobActivity)
        .sort(sortNewestFirst),
      activeServices: services
        .filter((service) => Boolean(service.is_active))
        .map(mapServiceActivity)
        .sort(sortNewestFirst),
      recentReports: reports.map(mapReportItem).sort(sortNewestFirst).slice(0, 5),
      publicPhotos: publicPhotos.sort(sortNewestFirst),
    },
    error: null,
  };
}

export async function getAdminUserPublicPhotos(
  userId: string,
): Promise<ServiceResult<AdminUserPublicPhoto[]>> {
  const detail = await getAdminUserDetail(userId);
  if (detail.error || !detail.data) return { data: null, error: detail.error };

  return { data: detail.data.publicPhotos, error: null };
}

export async function getAdminUserActivity(userId: string): Promise<
  ServiceResult<{
    activeJobs: AdminUserActivityItem[];
    activeServices: AdminUserActivityItem[];
  }>
> {
  const detail = await getAdminUserDetail(userId);
  if (detail.error || !detail.data) return { data: null, error: detail.error };

  return {
    data: {
      activeJobs: detail.data.activeJobs,
      activeServices: detail.data.activeServices,
    },
    error: null,
  };
}

async function requireAdmin(): Promise<ServiceResult<void>> {
  if (!(await isCurrentUserAdmin())) {
    return { data: null, error: 'Barangay admin access is required.' };
  }

  return { data: undefined, error: null };
}

async function loadReportsForUser(
  userId: string,
  jobs: AdminJobRow[],
  services: AdminServiceRow[],
) {
  const reportMap = new Map<string, AdminReportRow>();
  const direct = await supabase
    .from('reports')
    .select(REPORT_COLUMNS)
    .or(`reporter_id.eq.${userId},reported_user_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(100);

  for (const row of (direct.data as AdminReportRow[] | null) ?? []) {
    reportMap.set(row.id, row);
  }

  const jobIds = jobs.map((job) => job.id);
  const serviceIds = services.map((service) => service.id);

  if (jobIds.length) {
    const byJobs = await supabase
      .from('reports')
      .select(REPORT_COLUMNS)
      .in('job_id', jobIds)
      .order('created_at', { ascending: false })
      .limit(100);

    for (const row of (byJobs.data as AdminReportRow[] | null) ?? []) {
      reportMap.set(row.id, row);
    }
  }

  if (serviceIds.length) {
    const byServices = await supabase
      .from('reports')
      .select(REPORT_COLUMNS)
      .in('service_id', serviceIds)
      .order('created_at', { ascending: false })
      .limit(100);

    for (const row of (byServices.data as AdminReportRow[] | null) ?? []) {
      reportMap.set(row.id, row);
    }
  }

  return Array.from(reportMap.values());
}

function mapUserListItem(
  row: AdminProfileRow,
  roles: UserRoleRow[],
  verifications: VerificationRow[],
  jobs: AdminJobRow[],
  services: AdminServiceRow[],
  reports: AdminReportRow[],
): AdminUserListItem {
  const profile = mapProfile(row);
  const userRoles = getUserRoles(row.id, roles);
  const userJobs = jobs.filter((job) => jobOwnerId(job) === row.id);
  const userServices = services.filter((service) => service.provider_id === row.id);
  const userReports = reports.filter((report) =>
    reportInvolvesUser(report, row.id, userJobs, userServices),
  );
  const latestVerification = getLatestVerification(row.id, verifications);
  const verificationStatus = getVerificationStatus(row, latestVerification);

  return {
    id: row.id,
    fullName: profile?.fullName ?? 'Konektado resident',
    avatarUrl: profile?.avatarUrl ?? null,
    location:
      profile?.approximateLocation ??
      formatPublicLocation({
        barangay: row.barangay,
        street: row.street,
        subdivisionArea: row.subdivision_area,
        city: row.city,
      }),
    roles: userRoles,
    roleLabel: formatRoleLabel(userRoles),
    verificationStatus,
    verificationLabel: formatVerificationLabel(verificationStatus),
    verificationRequestId: latestVerification?.id ?? null,
    publicPhotosCount: mapPublicPhotos(row, userJobs, userServices).length,
    activeJobsCount: userJobs.filter((job) => ACTIVE_JOB_STATUSES.has(job.status)).length,
    activeServicesCount: userServices.filter((service) => Boolean(service.is_active)).length,
    reportCount: userReports.length,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

function hasAdminRole(userId: string, roles: UserRoleRow[]) {
  return roles.some((role) => role.user_id === userId && role.role === 'barangay_admin');
}

function getUserRoles(userId: string, roles: UserRoleRow[]): AdminUserRole[] {
  const roleValues = new Set(
    roles
      .filter((role) => role.user_id === userId)
      .map((role) => role.role),
  );
  const mapped: AdminUserRole[] = [];
  if (roleValues.has('provider')) mapped.push('worker');
  if (roleValues.has('client')) mapped.push('client');
  return mapped;
}

function getLatestVerification(userId: string, verifications: VerificationRow[]) {
  const row = verifications.find((verification) => verification.user_id === userId);
  if (!row) return null;

  return {
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getVerificationStatus(
  row: AdminProfileRow,
  latestVerification: { status: VerificationStatus } | null,
): AdminUserVerificationStatus {
  if (row.barangay_verified_at || row.verified_at || latestVerification?.status === 'approved') {
    return 'verified';
  }
  if (latestVerification?.status === 'pending') return 'pending';
  return 'unverified';
}

function formatVerificationLabel(status: AdminUserVerificationStatus) {
  if (status === 'verified') return 'Verified';
  if (status === 'pending') return 'Pending';
  return 'Unverified';
}

function formatRoleLabel(roles: AdminUserRole[]) {
  if (roles.includes('worker') && roles.includes('client')) return 'Worker and Client';
  if (roles.includes('worker')) return 'Worker';
  if (roles.includes('client')) return 'Client';
  return 'Resident';
}

function itemMatchesFilter(item: AdminUserListItem, filter: AdminUserFilter) {
  if (filter === 'verified') return item.verificationStatus === 'verified';
  if (filter === 'pending') return item.verificationStatus === 'pending';
  return true;
}

function itemMatchesSearch(item: AdminUserListItem, search: string | null | undefined) {
  const query = compactText(search).toLowerCase();
  if (!query) return true;

  return [item.fullName, item.location, item.roleLabel, item.verificationLabel]
    .join(' ')
    .toLowerCase()
    .includes(query);
}

function jobOwnerId(job: AdminJobRow) {
  return job.client_id ?? job.owner_id;
}

function reportInvolvesUser(
  report: AdminReportRow,
  userId: string,
  jobs: AdminJobRow[],
  services: AdminServiceRow[],
) {
  if (report.reporter_id === userId || report.reported_user_id === userId) return true;
  if (report.job_id && jobs.some((job) => job.id === report.job_id)) return true;
  if (report.service_id && services.some((service) => service.id === report.service_id)) return true;
  return false;
}

function mapPublicPhotos(
  profile: AdminProfileRow,
  jobs: AdminJobRow[],
  services: AdminServiceRow[],
): AdminUserPublicPhoto[] {
  const photos: AdminUserPublicPhoto[] = [];
  const avatarUrl = compactText(profile.avatar_url);

  if (avatarUrl) {
    photos.push({
      id: getPublicPhotoKey({ imageUrl: avatarUrl, sourceId: profile.id, sourceType: 'profile_photo' }),
      source: 'profile',
      sourceType: 'profile_photo',
      sourceId: profile.id,
      title: 'Profile photo',
      imageUrl: avatarUrl,
      createdAt: profile.updated_at ?? profile.created_at ?? new Date(0).toISOString(),
      moderationStatus: 'visible',
      visibility: 'visible',
    });
  }

  for (const job of jobs) {
    for (const imageUrl of Array.from(new Set((job.photo_urls ?? []).map(compactText).filter(Boolean)))) {
      photos.push({
        id: getPublicPhotoKey({ imageUrl, sourceId: job.id, sourceType: 'job_photo' }),
        source: 'job',
        sourceType: 'job_photo',
        sourceId: job.id,
        title: compactText(job.title) || 'Job photo',
        imageUrl,
        createdAt: job.created_at,
        moderationStatus: 'visible',
        visibility: 'visible',
      });
    }
  }

  for (const service of services) {
    for (const imageUrl of Array.from(new Set((service.photo_urls ?? []).map(compactText).filter(Boolean)))) {
      photos.push({
        id: getPublicPhotoKey({ imageUrl, sourceId: service.id, sourceType: 'service_photo' }),
        source: 'service',
        sourceType: 'service_photo',
        sourceId: service.id,
        title: compactText(service.title) || compactText(service.category) || 'Service photo',
        imageUrl,
        createdAt: service.created_at,
        moderationStatus: 'visible',
        visibility: 'visible',
      });
    }
  }

  return photos;
}

async function mapPublicPhotosWithModeration(
  profile: AdminProfileRow,
  jobs: AdminJobRow[],
  services: AdminServiceRow[],
): Promise<AdminUserPublicPhoto[]> {
  const photos = mapPublicPhotos(profile, jobs, services);
  const keys = photos.map((photo) => photo.id);
  if (!keys.length) return photos;

  const [actionsResult, visibilityResult] = await Promise.all([
    supabase
      .from('admin_moderation_actions')
      .select('target_id, status')
      .eq('target_type', 'photo')
      .in('target_id', keys)
      .order('reviewed_at', { ascending: false }),
    supabase
      .from('content_visibility')
      .select('content_id, visibility')
      .in('content_id', keys),
  ]);
  const actions = new Map<string, PhotoActionRow['status']>();
  const visibility = new Map<string, PublicPhotoVisibility>();

  for (const row of ((actionsResult.data as PhotoActionRow[] | null) ?? [])) {
    if (!actions.has(row.target_id)) actions.set(row.target_id, row.status);
  }

  for (const row of ((visibilityResult.data as PhotoVisibilityRow[] | null) ?? [])) {
    visibility.set(row.content_id, row.visibility);
  }

  return photos.map((photo): AdminUserPublicPhoto => {
    const photoVisibility = visibility.get(photo.id) ?? photo.visibility;
    return {
      ...photo,
      moderationStatus: actions.get(photo.id) ?? (photoVisibility === 'hidden' ? 'hidden' : 'visible'),
      visibility: photoVisibility,
    };
  });
}

function mapJobActivity(job: AdminJobRow): AdminUserActivityItem {
  return {
    id: job.id,
    title: compactText(job.title) || 'Job listing',
    subtitle: compactText(job.service_needed) || compactText(job.category) || 'Job',
    statusLabel: formatStatus(job.status),
    createdAt: job.created_at,
    photoCount: (job.photo_urls ?? []).filter(Boolean).length,
  };
}

function mapServiceActivity(service: AdminServiceRow): AdminUserActivityItem {
  return {
    id: service.id,
    title: compactText(service.title) || 'Service listing',
    subtitle: compactText(service.category) || compactText(service.location_text) || 'Service',
    statusLabel: service.is_active ? 'Active service' : 'Inactive service',
    createdAt: service.created_at,
    photoCount: (service.photo_urls ?? []).filter(Boolean).length,
  };
}

function mapReportItem(report: AdminReportRow): AdminUserReportItem {
  return {
    id: report.id,
    reason: compactText(report.reason) || 'Report',
    status: formatStatus(report.status),
    targetLabel: getReportTargetLabel(report),
    createdAt: report.created_at,
  };
}

function getReportTargetLabel(report: AdminReportRow) {
  if (report.job_id) return `Job ${shortId(report.job_id)}`;
  if (report.service_id) return `Service ${shortId(report.service_id)}`;
  if (report.conversation_id) return `Conversation ${shortId(report.conversation_id)}`;
  if (report.reported_user_id) return `User ${shortId(report.reported_user_id)}`;
  return 'Reported account';
}

function formatStatus(value: string | null | undefined) {
  const cleanValue = compactText(value);
  if (!cleanValue) return 'Unknown';

  return cleanValue
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function formatPreferredContact(value: string | null | undefined) {
  const cleanValue = compactText(value);
  if (!cleanValue) return null;
  if (cleanValue === 'app_message') return 'App message';
  return formatStatus(cleanValue);
}

function normalizeLimit(value: number, max = 120) {
  if (!Number.isFinite(value)) return Math.min(75, max);
  return Math.max(1, Math.min(max, Math.floor(value)));
}

function sortNewestFirst(a: { createdAt: string }, b: { createdAt: string }) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function shortId(value: string) {
  return value.slice(0, 8);
}
