import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AdminEmptyState,
  AdminPrivacyNotice,
  AdminStatusBadge,
  adminPalette,
  type AdminTone,
} from '@/components/admin/AdminShell';
import { useFeedback } from '@/components/FeedbackProvider';
import { color, radius, space } from '@/constants/theme';
import {
  getDemoEditorUserDetail,
  listDemoEditorUsers,
  saveDemoEditorJob,
  saveDemoEditorProfile,
  saveDemoEditorService,
  saveDemoEditorVerificationNotes,
  type DemoEditorActivityItem,
  type DemoEditorDocument,
  type DemoEditorJob,
  type DemoEditorJobDraft,
  type DemoEditorProfileDraft,
  type DemoEditorService,
  type DemoEditorServiceDraft,
  type DemoEditorUserDetail,
  type DemoEditorUserFilter,
  type DemoEditorUserListItem,
  type DemoEditorVerificationDraft,
} from '@/services/internal-demo-editor.service';

type EditorSection =
  | 'profile'
  | 'photos'
  | 'jobs'
  | 'services'
  | 'verification'
  | 'documents'
  | 'activity';

const sectionOptions: { icon: keyof typeof MaterialIcons.glyphMap; label: string; value: EditorSection }[] = [
  { icon: 'person', label: 'Profile', value: 'profile' },
  { icon: 'photo-library', label: 'Public photos', value: 'photos' },
  { icon: 'work-outline', label: 'Jobs/Listings', value: 'jobs' },
  { icon: 'handyman', label: 'Services', value: 'services' },
  { icon: 'verified-user', label: 'Verification notes', value: 'verification' },
  { icon: 'lock', label: 'Private documents', value: 'documents' },
  { icon: 'summarize', label: 'Activity', value: 'activity' },
];

const filterOptions: { label: string; value: DemoEditorUserFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Verified', value: 'verified' },
  { label: 'Pending', value: 'pending' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Unverified', value: 'unverified' },
];

const jobStatusOptions = ['open', 'reviewing', 'in_progress', 'completed', 'closed', 'cancelled'];
const rateTypeOptions = ['per_project', 'hourly', 'daily', 'weekly', 'per_job', 'per_service', 'per_session'];

export default function InternalDemoEditorScreen() {
  const { bottom } = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const { showSuccessToast } = useFeedback();

  const [users, setUsers] = useState<DemoEditorUserListItem[]>([]);
  const [filter, setFilter] = useState<DemoEditorUserFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DemoEditorUserDetail | null>(null);
  const [activeSection, setActiveSection] = useState<EditorSection>('profile');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false);

  const [profileDraft, setProfileDraft] = useState<DemoEditorProfileDraft | null>(null);
  const [jobDrafts, setJobDrafts] = useState<Record<string, DemoEditorJobDraft>>({});
  const [serviceDrafts, setServiceDrafts] = useState<Record<string, DemoEditorServiceDraft>>({});
  const [verificationDraft, setVerificationDraft] = useState<DemoEditorVerificationDraft | null>(null);
  const [expandedJobs, setExpandedJobs] = useState<Record<string, boolean>>({});
  const [expandedServices, setExpandedServices] = useState<Record<string, boolean>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const loadUsers = useCallback(async ({ keepSelection = true }: { keepSelection?: boolean } = {}) => {
    setLoadingUsers(true);
    setErrorMessage(null);
    const result = await listDemoEditorUsers({ filter, search });
    setLoadingUsers(false);

    if (result.error || !result.data) {
      setErrorMessage(result.error ?? 'Could not load demo users.');
      return;
    }

    setUsers(result.data);
    if (!keepSelection) {
      setSelectedUserId(null);
      setDetail(null);
    }
  }, [filter, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, users],
  );

  const openUser = async (userId: string) => {
    setSelectedUserId(userId);
    setMobileEditorOpen(true);
    setLoadingDetail(true);
    setFieldError(null);
    const result = await getDemoEditorUserDetail(userId);
    setLoadingDetail(false);

    if (result.error || !result.data) {
      Alert.alert('Open user', result.error ?? 'Could not load this resident.');
      return;
    }

    hydrateDrafts(result.data);
    setDetail(result.data);
    setActiveSection('profile');
  };

  const hydrateDrafts = (nextDetail: DemoEditorUserDetail) => {
    setProfileDraft({
      about: nextDetail.profile.about,
      avatarUrl: nextDetail.profile.avatarUrl,
      availability: nextDetail.profile.availability,
      barangay: nextDetail.profile.barangay,
      city: nextDetail.profile.city,
      firstName: nextDetail.profile.firstName,
      fullName: nextDetail.profile.fullName,
      lastName: nextDetail.profile.lastName,
      preferredContactMethod: nextDetail.profile.preferredContactMethod,
      street: nextDetail.profile.street,
    });
    setJobDrafts(Object.fromEntries(nextDetail.jobs.map((job) => [job.id, jobToDraft(job)])));
    setServiceDrafts(
      Object.fromEntries(nextDetail.services.map((service) => [service.id, serviceToDraft(service)])),
    );
    setVerificationDraft(
      nextDetail.verification
        ? {
            notes: nextDetail.verification.notes,
            reviewerNote: nextDetail.verification.reviewerNote,
          }
        : null,
    );
    setExpandedJobs(Object.fromEntries(nextDetail.jobs.map((job, index) => [job.id, index === 0])));
    setExpandedServices(
      Object.fromEntries(nextDetail.services.map((service, index) => [service.id, index === 0])),
    );
  };

  const updateDetail = (updater: (current: DemoEditorUserDetail) => DemoEditorUserDetail) => {
    setDetail((current) => (current ? updater(current) : current));
  };

  const saveProfile = async () => {
    if (!detail || !profileDraft) return;
    setSavingKey('profile');
    setFieldError(null);
    const result = await saveDemoEditorProfile(detail.profile.id, profileDraft);
    setSavingKey(null);

    if (result.error || !result.data) {
      setFieldError(result.error ?? 'Could not save profile.');
      return;
    }

    updateDetail((current) => ({ ...current, profile: result.data }));
    setProfileDraft({ ...result.data });
    setUsers((current) =>
      current.map((user) =>
        user.id === result.data.id
          ? { ...user, avatarUrl: result.data.avatarUrl, location: formatLocation(result.data), name: displayName(result.data) }
          : user,
      ),
    );
    showSuccessToast('Profile saved');
  };

  const saveJob = async (jobId: string) => {
    if (!detail || !jobDrafts[jobId]) return;
    setSavingKey(`job:${jobId}`);
    setFieldError(null);
    const result = await saveDemoEditorJob({
      draft: jobDrafts[jobId],
      isResidentVerified: detail.isVerified,
      jobId,
      userId: detail.profile.id,
    });
    setSavingKey(null);

    if (result.error || !result.data) {
      setFieldError(result.error ?? 'Could not save job.');
      return;
    }

    updateDetail((current) => ({
      ...current,
      counts: { ...current.counts, photos: countPhotos(current.profile.avatarUrl, replaceById(current.jobs, result.data), current.services) },
      jobs: replaceById(current.jobs, result.data),
    }));
    setJobDrafts((current) => ({ ...current, [jobId]: jobToDraft(result.data) }));
    showSuccessToast('Job saved');
  };

  const saveService = async (serviceId: string) => {
    if (!detail || !serviceDrafts[serviceId]) return;
    setSavingKey(`service:${serviceId}`);
    setFieldError(null);
    const result = await saveDemoEditorService({
      draft: serviceDrafts[serviceId],
      isResidentVerified: detail.isVerified,
      serviceId,
      userId: detail.profile.id,
    });
    setSavingKey(null);

    if (result.error || !result.data) {
      setFieldError(result.error ?? 'Could not save service.');
      return;
    }

    updateDetail((current) => ({
      ...current,
      counts: { ...current.counts, photos: countPhotos(current.profile.avatarUrl, current.jobs, replaceById(current.services, result.data)) },
      services: replaceById(current.services, result.data),
    }));
    setServiceDrafts((current) => ({ ...current, [serviceId]: serviceToDraft(result.data) }));
    showSuccessToast('Service saved');
  };

  const saveVerification = async () => {
    if (!detail?.verification || !verificationDraft) return;
    setSavingKey('verification');
    setFieldError(null);
    const result = await saveDemoEditorVerificationNotes({
      draft: verificationDraft,
      userId: detail.profile.id,
      verificationId: detail.verification.id,
    });
    setSavingKey(null);

    if (result.error || !result.data) {
      setFieldError(result.error ?? 'Could not save verification notes.');
      return;
    }

    updateDetail((current) => ({ ...current, verification: result.data }));
    setVerificationDraft({ notes: result.data.notes, reviewerNote: result.data.reviewerNote });
    showSuccessToast('Verification notes saved');
  };

  const userList = (
    <UserListPane
      count={users.length}
      filter={filter}
      loading={loadingUsers}
      onFilterChange={setFilter}
      onRefresh={() => loadUsers()}
      onSearchChange={setSearch}
      onSelect={openUser}
      search={search}
      selectedUserId={selectedUserId}
      users={users}
    />
  );

  const editor = (
    <EditorPane
      activeSection={activeSection}
      detail={detail}
      expandedJobs={expandedJobs}
      expandedServices={expandedServices}
      fieldError={fieldError}
      isWide={isWide}
      jobDrafts={jobDrafts}
      loading={loadingDetail}
      onBack={() => setMobileEditorOpen(false)}
      onJobDraftChange={(jobId, draft) => setJobDrafts((current) => ({ ...current, [jobId]: draft }))}
      onProfileDraftChange={setProfileDraft}
      onSaveJob={saveJob}
      onSaveProfile={saveProfile}
      onSaveService={saveService}
      onSaveVerification={saveVerification}
      onSectionChange={setActiveSection}
      onServiceDraftChange={(serviceId, draft) =>
        setServiceDrafts((current) => ({ ...current, [serviceId]: draft }))
      }
      onToggleJob={(jobId) => setExpandedJobs((current) => ({ ...current, [jobId]: !current[jobId] }))}
      onToggleService={(serviceId) =>
        setExpandedServices((current) => ({ ...current, [serviceId]: !current[serviceId] }))
      }
      profileDraft={profileDraft}
      savingKey={savingKey}
      selectedUser={selectedUser}
      serviceDrafts={serviceDrafts}
      verificationDraft={verificationDraft}
      onVerificationDraftChange={setVerificationDraft}
    />
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={[styles.screen, { paddingBottom: Math.max(bottom, 12) }]}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.kicker}>Internal tool</Text>
            <Text style={styles.title}>Demo Content Editor</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => loadUsers()}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <MaterialIcons color={adminPalette.blue} name="refresh" size={22} />
          </Pressable>
        </View>

        {errorMessage ? (
          <View style={styles.errorBanner}>
            <MaterialIcons color={adminPalette.dangerDeep} name="error-outline" size={18} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {isWide ? (
          <View style={styles.desktopShell}>
            <View style={styles.leftPane}>{userList}</View>
            <View style={styles.rightPane}>{editor}</View>
          </View>
        ) : mobileEditorOpen ? (
          editor
        ) : (
          userList
        )}
      </View>
    </SafeAreaView>
  );
}

function UserListPane({
  count,
  filter,
  loading,
  onFilterChange,
  onRefresh,
  onSearchChange,
  onSelect,
  search,
  selectedUserId,
  users,
}: {
  count: number;
  filter: DemoEditorUserFilter;
  loading: boolean;
  onFilterChange: (value: DemoEditorUserFilter) => void;
  onRefresh: () => void;
  onSearchChange: (value: string) => void;
  onSelect: (userId: string) => void;
  search: string;
  selectedUserId: string | null;
  users: DemoEditorUserListItem[];
}) {
  return (
    <View style={styles.panelFill}>
      <View style={styles.listHeader}>
        <Text style={styles.panelTitle}>Residents</Text>
        <Text style={styles.countText}>{count} shown</Text>
      </View>
      <View style={styles.searchBox}>
        <MaterialIcons color={adminPalette.faint} name="search" size={20} />
        <TextInput
          autoCapitalize="none"
          onChangeText={onSearchChange}
          placeholder="Search residents"
          placeholderTextColor={adminPalette.faint}
          style={styles.searchInput}
          value={search}
        />
        {search ? (
          <Pressable accessibilityRole="button" onPress={() => onSearchChange('')}>
            <MaterialIcons color={adminPalette.faint} name="close" size={20} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {filterOptions.map((option) => {
          const selected = filter === option.value;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={option.value}
              onPress={() => onFilterChange(option.value)}
              style={({ pressed }) => [styles.filterChip, selected && styles.filterChipActive, pressed && styles.pressed]}>
              <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingBlock}>
          <ActivityIndicator color={adminPalette.blue} />
          <Text style={styles.mutedText}>Loading residents...</Text>
        </View>
      ) : users.length ? (
        <ScrollView contentContainerStyle={styles.userListContent} showsVerticalScrollIndicator={false}>
          {users.map((user) => (
            <UserListCard
              key={user.id}
              onPress={() => onSelect(user.id)}
              selected={selectedUserId === user.id}
              user={user}
            />
          ))}
        </ScrollView>
      ) : (
        <AdminEmptyState
          actionLabel="Refresh"
          description="Try another search or filter."
          icon="person-search"
          onActionPress={onRefresh}
          title="No residents found"
        />
      )}
    </View>
  );
}

function UserListCard({
  onPress,
  selected,
  user,
}: {
  onPress: () => void;
  selected: boolean;
  user: DemoEditorUserListItem;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.userCard, selected && styles.userCardSelected, pressed && styles.pressed]}>
      <Avatar name={user.name} uri={user.avatarUrl} />
      <View style={styles.userCardBody}>
        <View style={styles.userCardTitleRow}>
          <Text numberOfLines={1} style={styles.userName}>
            {user.name}
          </Text>
          <MaterialIcons color={adminPalette.faint} name="chevron-right" size={20} />
        </View>
        <Text numberOfLines={1} style={styles.userMeta}>
          {user.roles.length ? user.roles.join(', ') : 'No role'} · {user.location}
        </Text>
        <View style={styles.userCardFooter}>
          <StatusBadge status={user.status} />
          <Text style={styles.compactCount}>
            {user.counts.jobs} jobs · {user.counts.services} services · {user.counts.photos} photos
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function EditorPane({
  activeSection,
  detail,
  expandedJobs,
  expandedServices,
  fieldError,
  isWide,
  jobDrafts,
  loading,
  onBack,
  onJobDraftChange,
  onProfileDraftChange,
  onSaveJob,
  onSaveProfile,
  onSaveService,
  onSaveVerification,
  onSectionChange,
  onServiceDraftChange,
  onToggleJob,
  onToggleService,
  onVerificationDraftChange,
  profileDraft,
  savingKey,
  selectedUser,
  serviceDrafts,
  verificationDraft,
}: {
  activeSection: EditorSection;
  detail: DemoEditorUserDetail | null;
  expandedJobs: Record<string, boolean>;
  expandedServices: Record<string, boolean>;
  fieldError: string | null;
  isWide: boolean;
  jobDrafts: Record<string, DemoEditorJobDraft>;
  loading: boolean;
  onBack: () => void;
  onJobDraftChange: (jobId: string, draft: DemoEditorJobDraft) => void;
  onProfileDraftChange: (draft: DemoEditorProfileDraft) => void;
  onSaveJob: (jobId: string) => void;
  onSaveProfile: () => void;
  onSaveService: (serviceId: string) => void;
  onSaveVerification: () => void;
  onSectionChange: (section: EditorSection) => void;
  onServiceDraftChange: (serviceId: string, draft: DemoEditorServiceDraft) => void;
  onToggleJob: (jobId: string) => void;
  onToggleService: (serviceId: string) => void;
  onVerificationDraftChange: (draft: DemoEditorVerificationDraft) => void;
  profileDraft: DemoEditorProfileDraft | null;
  savingKey: string | null;
  selectedUser: DemoEditorUserListItem | null;
  serviceDrafts: Record<string, DemoEditorServiceDraft>;
  verificationDraft: DemoEditorVerificationDraft | null;
}) {
  if (!selectedUser && !detail && !loading) {
    return (
      <View style={styles.editorEmpty}>
        <AdminEmptyState
          description="Choose a resident from the list to edit demo-safe public content."
          icon="edit-note"
          title="Select a resident"
        />
      </View>
    );
  }

  if (loading || !detail) {
    return (
      <View style={styles.loadingBlock}>
        <ActivityIndicator color={adminPalette.blue} />
        <Text style={styles.mutedText}>Loading selected resident...</Text>
      </View>
    );
  }

  return (
    <View style={styles.panelFill}>
      {!isWide ? (
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
          <MaterialIcons color={adminPalette.blue} name="arrow-back" size={20} />
          <Text style={styles.backButtonText}>Back to users</Text>
        </Pressable>
      ) : null}

      <SelectedUserHeader detail={detail} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sectionScroll}>
        {sectionOptions.map((section) => {
          const selected = activeSection === section.value;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={section.value}
              onPress={() => onSectionChange(section.value)}
              style={({ pressed }) => [styles.sectionTab, selected && styles.sectionTabActive, pressed && styles.pressed]}>
              <MaterialIcons color={selected ? adminPalette.blue : adminPalette.faint} name={section.icon} size={18} />
              <Text style={[styles.sectionTabText, selected && styles.sectionTabTextActive]}>{section.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {fieldError ? (
        <View style={styles.errorBanner}>
          <MaterialIcons color={adminPalette.dangerDeep} name="error-outline" size={18} />
          <Text style={styles.errorText}>{fieldError}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.editorScrollContent} showsVerticalScrollIndicator={false}>
        {activeSection === 'profile' && profileDraft ? (
          <ProfileSection
            draft={profileDraft}
            onChange={onProfileDraftChange}
            onSave={onSaveProfile}
            saving={savingKey === 'profile'}
          />
        ) : null}
        {activeSection === 'photos' ? <PhotosSection detail={detail} /> : null}
        {activeSection === 'jobs' ? (
          <JobsSection
            detail={detail}
            drafts={jobDrafts}
            expanded={expandedJobs}
            onChange={onJobDraftChange}
            onSave={onSaveJob}
            onToggle={onToggleJob}
            savingKey={savingKey}
          />
        ) : null}
        {activeSection === 'services' ? (
          <ServicesSection
            detail={detail}
            drafts={serviceDrafts}
            expanded={expandedServices}
            onChange={onServiceDraftChange}
            onSave={onSaveService}
            onToggle={onToggleService}
            savingKey={savingKey}
          />
        ) : null}
        {activeSection === 'verification' ? (
          <VerificationSection
            detail={detail}
            draft={verificationDraft}
            onChange={onVerificationDraftChange}
            onSave={onSaveVerification}
            saving={savingKey === 'verification'}
          />
        ) : null}
        {activeSection === 'documents' ? <DocumentsSection documents={detail.documents} /> : null}
        {activeSection === 'activity' ? <ActivitySection detail={detail} /> : null}
      </ScrollView>
    </View>
  );
}

function SelectedUserHeader({ detail }: { detail: DemoEditorUserDetail }) {
  return (
    <View style={styles.selectedHeader}>
      <View style={styles.selectedHeaderTop}>
        <Avatar large name={displayName(detail.profile)} uri={detail.profile.avatarUrl} />
        <View style={styles.selectedCopy}>
          <Text style={styles.selectedName}>{displayName(detail.profile)}</Text>
          <Text style={styles.selectedMeta}>
            {detail.roles.length ? detail.roles.join(', ') : 'No role'} · {formatLocation(detail.profile)}
          </Text>
          <StatusBadge status={detail.status} />
        </View>
      </View>
      <View style={styles.metricWrap}>
        <MiniMetric label="Jobs" value={detail.counts.jobs} />
        <MiniMetric label="Services" value={detail.counts.services} />
        <MiniMetric label="Photos" value={detail.counts.photos} />
        <MiniMetric label="Messages" value={detail.counts.conversations} />
        <MiniMetric label="Reviews" value={detail.counts.reviews} />
      </View>
    </View>
  );
}

function ProfileSection({
  draft,
  onChange,
  onSave,
  saving,
}: {
  draft: DemoEditorProfileDraft;
  onChange: (draft: DemoEditorProfileDraft) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <SectionCard
      helper="Edit public-facing profile copy only. Raw IDs, roles, auth, and private verification fields are not editable here."
      title="Profile">
      <Field label="Full name" onChangeText={(fullName) => onChange({ ...draft, fullName })} value={draft.fullName} />
      <View style={styles.twoColumn}>
        <Field label="First name" onChangeText={(firstName) => onChange({ ...draft, firstName })} value={draft.firstName} />
        <Field label="Last name" onChangeText={(lastName) => onChange({ ...draft, lastName })} value={draft.lastName} />
      </View>
      <TextArea label="About" onChangeText={(about) => onChange({ ...draft, about })} value={draft.about} />
      <TextArea
        label="Availability"
        onChangeText={(availability) => onChange({ ...draft, availability })}
        value={draft.availability}
      />
      <View style={styles.twoColumn}>
        <Field label="Barangay" onChangeText={(barangay) => onChange({ ...draft, barangay })} value={draft.barangay} />
        <Field label="City" onChangeText={(city) => onChange({ ...draft, city })} value={draft.city} />
      </View>
      <Field label="Street / area" onChangeText={(street) => onChange({ ...draft, street })} value={draft.street} />
      <Field
        label="Preferred contact method"
        onChangeText={(preferredContactMethod) => onChange({ ...draft, preferredContactMethod })}
        placeholder="app_message, phone, or email"
        value={draft.preferredContactMethod}
      />
      <Field
        label="Public profile image URL"
        onChangeText={(avatarUrl) => onChange({ ...draft, avatarUrl })}
        value={draft.avatarUrl}
      />
      <PhotoStrip urls={draft.avatarUrl ? [draft.avatarUrl] : []} />
      <SaveButton label="Save profile" onPress={onSave} saving={saving} />
    </SectionCard>
  );
}

function PhotosSection({ detail }: { detail: DemoEditorUserDetail }) {
  const jobPhotos = detail.jobs.flatMap((job) =>
    job.photoUrls.map((url, index) => ({ id: `${job.id}:${index}`, label: job.title, url })),
  );
  const servicePhotos = detail.services.flatMap((service) =>
    service.photoUrls.map((url, index) => ({ id: `${service.id}:${index}`, label: service.title, url })),
  );

  return (
    <View style={styles.sectionStack}>
      <AdminPrivacyNotice icon="photo-camera">
        Use only photos your group owns or has permission to use. Public image URLs are visible in profile,
        job, and service screens.
      </AdminPrivacyNotice>
      <PhotoGroup label="Profile photos" photos={detail.profile.avatarUrl ? [{ id: 'profile', label: 'Profile', url: detail.profile.avatarUrl }] : []} />
      <PhotoGroup label="Job/listing photos" photos={jobPhotos} />
      <PhotoGroup label="Service photos" photos={servicePhotos} />
      <SectionCard
        helper="Photo URL editing lives inside Profile, Jobs/Listings, and Services so each image stays tied to its source content."
        title="Where to edit photos"
      />
    </View>
  );
}

function JobsSection({
  detail,
  drafts,
  expanded,
  onChange,
  onSave,
  onToggle,
  savingKey,
}: {
  detail: DemoEditorUserDetail;
  drafts: Record<string, DemoEditorJobDraft>;
  expanded: Record<string, boolean>;
  onChange: (jobId: string, draft: DemoEditorJobDraft) => void;
  onSave: (jobId: string) => void;
  onToggle: (jobId: string) => void;
  savingKey: string | null;
}) {
  return (
    <View style={styles.sectionStack}>
      {!detail.isVerified ? <UnverifiedNotice /> : null}
      {detail.jobs.length ? (
        detail.jobs.map((job) => {
          const draft = drafts[job.id];
          if (!draft) return null;
          const isOpen = expanded[job.id];
          return (
            <SectionCard key={job.id} helper={`Updated ${formatDate(job.updatedAt)}`} title={job.title || 'Untitled job'}>
              <CollapsibleHeader
                badge={<AdminStatusBadge label={draft.status} tone={toneForJobStatus(draft.status)} />}
                open={isOpen}
                onToggle={() => onToggle(job.id)}
              />
              {isOpen ? (
                <View style={styles.formStack}>
                  <Field label="Title" onChangeText={(title) => onChange(job.id, { ...draft, title })} value={draft.title} />
                  <View style={styles.twoColumn}>
                    <Field label="Category" onChangeText={(category) => onChange(job.id, { ...draft, category })} value={draft.category} />
                    <Field label="Service needed" onChangeText={(serviceNeeded) => onChange(job.id, { ...draft, serviceNeeded })} value={draft.serviceNeeded} />
                  </View>
                  <TextArea label="Description" onChangeText={(description) => onChange(job.id, { ...draft, description })} value={draft.description} />
                  <Field label="Location text" onChangeText={(locationText) => onChange(job.id, { ...draft, locationText })} value={draft.locationText} />
                  <Field label="Schedule" onChangeText={(scheduleText) => onChange(job.id, { ...draft, scheduleText })} value={draft.scheduleText} />
                  <ChoiceRow
                    label="Status"
                    options={jobStatusOptions}
                    value={draft.status}
                    onChange={(status) => onChange(job.id, { ...draft, status })}
                  />
                  <MoneyFields
                    max={draft.budgetMax}
                    min={draft.budgetMin}
                    onChange={(budgetMin, budgetMax) => onChange(job.id, { ...draft, budgetMin, budgetMax })}
                  />
                  <ChoiceRow
                    label="Rate type"
                    options={rateTypeOptions}
                    value={draft.rateType}
                    onChange={(rateType) => onChange(job.id, { ...draft, rateType })}
                  />
                  <ListField label="Tags" onChange={(tags) => onChange(job.id, { ...draft, tags })} values={draft.tags} />
                  <ListField
                    helper="Paste one image URL per line."
                    label="Public job photo URLs"
                    onChange={(photoUrls) => onChange(job.id, { ...draft, photoUrls })}
                    values={draft.photoUrls}
                  />
                  <PhotoStrip urls={draft.photoUrls} />
                  <SaveButton label="Save job" onPress={() => onSave(job.id)} saving={savingKey === `job:${job.id}`} />
                </View>
              ) : null}
            </SectionCard>
          );
        })
      ) : (
        <AdminEmptyState description="This resident has no job listings." icon="work-outline" title="No jobs" />
      )}
    </View>
  );
}

function ServicesSection({
  detail,
  drafts,
  expanded,
  onChange,
  onSave,
  onToggle,
  savingKey,
}: {
  detail: DemoEditorUserDetail;
  drafts: Record<string, DemoEditorServiceDraft>;
  expanded: Record<string, boolean>;
  onChange: (serviceId: string, draft: DemoEditorServiceDraft) => void;
  onSave: (serviceId: string) => void;
  onToggle: (serviceId: string) => void;
  savingKey: string | null;
}) {
  return (
    <View style={styles.sectionStack}>
      {!detail.isVerified ? <UnverifiedNotice /> : null}
      {detail.services.length ? (
        detail.services.map((service) => {
          const draft = drafts[service.id];
          if (!draft) return null;
          const isOpen = expanded[service.id];
          return (
            <SectionCard key={service.id} helper={`Updated ${formatDate(service.updatedAt)}`} title={service.title || 'Untitled service'}>
              <CollapsibleHeader
                badge={<AdminStatusBadge label={draft.isActive ? 'Active' : 'Inactive'} tone={draft.isActive ? 'success' : 'neutral'} />}
                open={isOpen}
                onToggle={() => onToggle(service.id)}
              />
              {isOpen ? (
                <View style={styles.formStack}>
                  <Field label="Title" onChangeText={(title) => onChange(service.id, { ...draft, title })} value={draft.title} />
                  <View style={styles.twoColumn}>
                    <Field label="Category" onChangeText={(category) => onChange(service.id, { ...draft, category })} value={draft.category} />
                    <Field label="Custom category note" onChangeText={(customCategory) => onChange(service.id, { ...draft, customCategory })} value={draft.customCategory} />
                  </View>
                  <TextArea label="Description" onChangeText={(description) => onChange(service.id, { ...draft, description })} value={draft.description} />
                  <Field label="Availability" onChangeText={(availabilityText) => onChange(service.id, { ...draft, availabilityText })} value={draft.availabilityText} />
                  <Field label="Location text" onChangeText={(locationText) => onChange(service.id, { ...draft, locationText })} value={draft.locationText} />
                  <Field label="Rate note" onChangeText={(rateText) => onChange(service.id, { ...draft, rateText })} value={draft.rateText} />
                  <MoneyFields
                    max={draft.rateMax}
                    min={draft.rateMin}
                    onChange={(rateMin, rateMax) => onChange(service.id, { ...draft, rateMin, rateMax })}
                  />
                  <ChoiceRow
                    label="Rate type"
                    options={rateTypeOptions}
                    value={draft.rateType}
                    onChange={(rateType) => onChange(service.id, { ...draft, rateType })}
                  />
                  <Field
                    keyboardType="numeric"
                    label="Years of experience"
                    onChangeText={(value) => onChange(service.id, { ...draft, yearsExperience: parseOptionalNumber(value) })}
                    value={formatOptionalNumber(draft.yearsExperience)}
                  />
                  <ChoiceRow
                    label="Public status"
                    options={['active', 'inactive']}
                    value={draft.isActive ? 'active' : 'inactive'}
                    onChange={(status) => onChange(service.id, { ...draft, isActive: status === 'active' })}
                  />
                  <ListField label="Tags" onChange={(tags) => onChange(service.id, { ...draft, tags })} values={draft.tags} />
                  <ListField
                    helper="Paste one image URL per line."
                    label="Public service photo URLs"
                    onChange={(photoUrls) => onChange(service.id, { ...draft, photoUrls })}
                    values={draft.photoUrls}
                  />
                  <PhotoStrip urls={draft.photoUrls} />
                  <SaveButton label="Save service" onPress={() => onSave(service.id)} saving={savingKey === `service:${service.id}`} />
                </View>
              ) : null}
            </SectionCard>
          );
        })
      ) : (
        <AdminEmptyState description="This resident has no services." icon="handyman" title="No services" />
      )}
    </View>
  );
}

function VerificationSection({
  detail,
  draft,
  onChange,
  onSave,
  saving,
}: {
  detail: DemoEditorUserDetail;
  draft: DemoEditorVerificationDraft | null;
  onChange: (draft: DemoEditorVerificationDraft) => void;
  onSave: () => void;
  saving: boolean;
}) {
  if (!detail.verification || !draft) {
    return <AdminEmptyState description="This resident has no verification request." icon="verified-user" title="No verification notes" />;
  }

  return (
    <SectionCard
      helper="Notes only. Verification decisions and private files remain in Verification Review/internal document handling."
      title="Verification notes">
      <View style={styles.badgeRow}>
        <AdminStatusBadge label={detail.verification.status} tone={toneForVerification(detail.status)} />
        <Text style={styles.mutedText}>Submitted {formatDate(detail.verification.createdAt)}</Text>
      </View>
      <TextArea label="Resident note" onChangeText={(notes) => onChange({ ...draft, notes })} value={draft.notes} />
      <TextArea
        label="Reviewer note"
        onChangeText={(reviewerNote) => onChange({ ...draft, reviewerNote })}
        value={draft.reviewerNote}
      />
      <SaveButton label="Save verification notes" onPress={onSave} saving={saving} />
    </SectionCard>
  );
}

function DocumentsSection({ documents }: { documents: DemoEditorDocument[] }) {
  return (
    <View style={styles.sectionStack}>
      <AdminPrivacyNotice icon="lock">
        Private documents are previewed with short-lived signed links and are never public.
      </AdminPrivacyNotice>
      <SectionCard helper="These are private verification documents, kept separate from public photos." title="Private verification documents">
        {documents.length ? (
          <View style={styles.documentGrid}>
            {documents.map((document) => (
              <DocumentCard document={document} key={document.id} />
            ))}
          </View>
        ) : (
          <Text style={styles.mutedText}>No private verification documents found.</Text>
        )}
      </SectionCard>
    </View>
  );
}

function ActivitySection({ detail }: { detail: DemoEditorUserDetail }) {
  return (
    <View style={styles.sectionStack}>
      <AdminPrivacyNotice icon="visibility">
        Conversations, reviews, and reports are read-only summaries in this Phase 1 internal editor.
      </AdminPrivacyNotice>
      <ActivityGroup icon="chat" items={detail.conversations} title="Conversations" />
      <ActivityGroup icon="star" items={detail.reviews} title="Reviews" />
      <ActivityGroup icon="flag" items={detail.reports} title="Reports" />
    </View>
  );
}

function ActivityGroup({
  icon,
  items,
  title,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  items: DemoEditorActivityItem[];
  title: string;
}) {
  return (
    <SectionCard helper="Read-only" title={title}>
      {items.length ? (
        <View style={styles.activityList}>
          {items.map((item) => (
            <View key={item.id} style={styles.activityRow}>
              <MaterialIcons color={adminPalette.blue} name={icon} size={20} />
              <View style={styles.activityCopy}>
                <Text style={styles.activityTitle}>{item.title}</Text>
                <Text numberOfLines={2} style={styles.mutedText}>
                  {item.meta}
                </Text>
              </View>
              <AdminStatusBadge label={item.status} tone="neutral" />
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.mutedText}>No {title.toLowerCase()} yet.</Text>
      )}
    </SectionCard>
  );
}

function SectionCard({ children, helper, title }: { children?: ReactNode; helper: string; title: string }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionHelper}>{helper}</Text>
      {children ? <View style={styles.formStack}>{children}</View> : null}
    </View>
  );
}

function Field({
  keyboardType,
  label,
  onChangeText,
  placeholder,
  value,
}: {
  keyboardType?: 'default' | 'numeric';
  label: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={adminPalette.faint}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function TextArea({
  label,
  onChangeText,
  value,
}: {
  label: string;
  onChangeText: (value: string) => void;
  value: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        multiline
        onChangeText={onChangeText}
        style={[styles.input, styles.textArea]}
        textAlignVertical="top"
        value={value}
      />
    </View>
  );
}

function ListField({
  helper,
  label,
  onChange,
  values,
}: {
  helper?: string;
  label: string;
  onChange: (values: string[]) => void;
  values: string[];
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {helper ? <Text style={styles.fieldHelper}>{helper}</Text> : null}
      <TextInput
        multiline
        onChangeText={(value) => onChange(parseLines(value))}
        style={[styles.input, styles.textArea]}
        textAlignVertical="top"
        value={values.join('\n')}
      />
    </View>
  );
}

function MoneyFields({
  max,
  min,
  onChange,
}: {
  max: number | null;
  min: number | null;
  onChange: (min: number | null, max: number | null) => void;
}) {
  return (
    <View style={styles.twoColumn}>
      <Field
        keyboardType="numeric"
        label="Minimum amount"
        onChangeText={(value) => onChange(parseOptionalNumber(value), max)}
        value={formatOptionalNumber(min)}
      />
      <Field
        keyboardType="numeric"
        label="Maximum amount"
        onChangeText={(value) => onChange(min, parseOptionalNumber(value))}
        value={formatOptionalNumber(max)}
      />
    </View>
  );
}

function ChoiceRow({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {options.map((option) => {
          const selected = option === value;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={option}
              onPress={() => onChange(option)}
              style={({ pressed }) => [styles.choiceChip, selected && styles.choiceChipActive, pressed && styles.pressed]}>
              <Text style={[styles.choiceText, selected && styles.choiceTextActive]}>{option.replace(/_/g, ' ')}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function SaveButton({
  label,
  onPress,
  saving,
}: {
  label: string;
  onPress: () => void;
  saving: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={saving}
      onPress={onPress}
      style={({ pressed }) => [styles.saveButton, saving && styles.disabled, pressed && !saving && styles.pressed]}>
      {saving ? <ActivityIndicator color={color.white} size="small" /> : <MaterialIcons color={color.white} name="save" size={18} />}
      <Text style={styles.saveButtonText}>{saving ? 'Saving...' : label}</Text>
    </Pressable>
  );
}

function CollapsibleHeader({
  badge,
  onToggle,
  open,
}: {
  badge: ReactNode;
  onToggle: () => void;
  open: boolean;
}) {
  return (
    <View style={styles.collapseHeader}>
      {badge}
      <Pressable accessibilityRole="button" onPress={onToggle} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>{open ? 'Collapse' : 'Edit'}</Text>
        <MaterialIcons color={adminPalette.blue} name={open ? 'expand-less' : 'expand-more'} size={18} />
      </Pressable>
    </View>
  );
}

function Avatar({ large, name, uri }: { large?: boolean; name: string; uri: string | null }) {
  const sizeStyle = large ? styles.avatarLarge : styles.avatar;
  if (uri) {
    return <Image source={{ uri }} style={[sizeStyle, styles.avatarImage]} />;
  }

  return (
    <View style={[sizeStyle, styles.avatarFallback]}>
      <Text style={styles.avatarInitial}>{name.slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: DemoEditorUserFilter }) {
  return <AdminStatusBadge label={statusLabel(status)} tone={toneForVerification(status)} />;
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metricPill}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function PhotoGroup({ label, photos }: { label: string; photos: { id: string; label: string; url: string }[] }) {
  return (
    <SectionCard helper={`${photos.length} photo${photos.length === 1 ? '' : 's'}`} title={label}>
      {photos.length ? (
        <View style={styles.photoGrid}>
          {photos.map((photo) => (
            <View key={photo.id} style={styles.photoCard}>
              <Image source={{ uri: photo.url }} style={styles.photoPreview} />
              <Text numberOfLines={1} style={styles.photoLabel}>
                {photo.label}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.mutedText}>No public photos in this group.</Text>
      )}
    </SectionCard>
  );
}

function PhotoStrip({ urls }: { urls: string[] }) {
  if (!urls.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip}>
      {urls.map((url) => (
        <Image key={url} source={{ uri: url }} style={styles.photoThumb} />
      ))}
    </ScrollView>
  );
}

function DocumentCard({ document }: { document: DemoEditorDocument }) {
  const isImage = /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(document.signedUrl);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => Linking.openURL(document.signedUrl)}
      style={({ pressed }) => [styles.documentCard, pressed && styles.pressed]}>
      {isImage ? (
        <Image source={{ uri: document.signedUrl }} style={styles.documentPreview} />
      ) : (
        <View style={styles.documentIcon}>
          <MaterialIcons color={adminPalette.blue} name="insert-drive-file" size={28} />
        </View>
      )}
      <Text style={styles.documentTitle}>{document.fileType.replace(/_/g, ' ')}</Text>
      <Text style={styles.mutedText}>{formatDate(document.createdAt)}</Text>
    </Pressable>
  );
}

function UnverifiedNotice() {
  return (
    <View style={styles.warningBanner}>
      <MaterialIcons color={adminPalette.orange} name="warning-amber" size={20} />
      <Text style={styles.warningText}>This user is not verified. Active public jobs and services are blocked.</Text>
    </View>
  );
}

function jobToDraft(job: DemoEditorJob): DemoEditorJobDraft {
  return {
    budgetMax: job.budgetMax,
    budgetMin: job.budgetMin,
    category: job.category,
    description: job.description,
    locationText: job.locationText,
    photoUrls: job.photoUrls,
    rateType: job.rateType,
    scheduleText: job.scheduleText,
    serviceNeeded: job.serviceNeeded,
    status: job.status,
    tags: job.tags,
    title: job.title,
  };
}

function serviceToDraft(service: DemoEditorService): DemoEditorServiceDraft {
  return {
    availabilityText: service.availabilityText,
    category: service.category,
    customCategory: service.customCategory,
    description: service.description,
    isActive: service.isActive,
    locationText: service.locationText,
    photoUrls: service.photoUrls,
    rateMax: service.rateMax,
    rateMin: service.rateMin,
    rateText: service.rateText,
    rateType: service.rateType,
    tags: service.tags,
    title: service.title,
    yearsExperience: service.yearsExperience,
  };
}

function replaceById<T extends { id: string }>(items: T[], next: T) {
  return items.map((item) => (item.id === next.id ? next : item));
}

function parseLines(value: string) {
  return Array.from(new Set(value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean)));
}

function parseOptionalNumber(value: string) {
  const clean = value.trim();
  if (!clean) return null;
  const number = Number(clean);
  return Number.isFinite(number) ? number : null;
}

function formatOptionalNumber(value: number | null) {
  return value === null || value === undefined ? '' : String(value);
}

function displayName(profile: { firstName: string; fullName: string; lastName: string }) {
  return profile.fullName || `${profile.firstName} ${profile.lastName}`.trim() || 'Konektado resident';
}

function formatLocation(profile: { barangay: string; city: string }) {
  return [profile.barangay, profile.city].filter(Boolean).join(', ') || 'No address';
}

function formatDate(value: string) {
  if (!value) return 'Unknown date';
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value));
}

function statusLabel(status: DemoEditorUserFilter) {
  if (status === 'all') return 'All';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function toneForVerification(status: DemoEditorUserFilter): AdminTone {
  if (status === 'verified') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'rejected') return 'danger';
  return 'neutral';
}

function toneForJobStatus(status: string): AdminTone {
  if (status === 'open' || status === 'reviewing' || status === 'in_progress') return 'success';
  if (status === 'cancelled') return 'danger';
  return 'neutral';
}

function countPhotos(avatarUrl: string, jobs: DemoEditorJob[], services: DemoEditorService[]) {
  return (
    (avatarUrl ? 1 : 0) +
    jobs.reduce((sum, job) => sum + job.photoUrls.length, 0) +
    services.reduce((sum, service) => sum + service.photoUrls.length, 0)
  );
}

const styles = StyleSheet.create({
  activityCopy: {
    flex: 1,
    gap: 2,
  },
  activityList: {
    gap: space.sm,
  },
  activityRow: {
    alignItems: 'center',
    borderColor: adminPalette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    padding: space.md,
  },
  activityTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
  },
  avatar: {
    height: 46,
    width: 46,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: adminPalette.blueSoft,
    borderRadius: 23,
    justifyContent: 'center',
  },
  avatarImage: {
    borderRadius: 23,
    backgroundColor: adminPalette.canvasSoft,
  },
  avatarInitial: {
    color: adminPalette.blue,
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
  },
  avatarLarge: {
    height: 64,
    width: 64,
  },
  backButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 6,
    minHeight: 44,
    paddingVertical: space.xs,
  },
  backButtonText: {
    color: adminPalette.blue,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
  },
  badgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  choiceChip: {
    borderColor: adminPalette.line,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: space.xs,
    minHeight: 40,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  choiceChipActive: {
    backgroundColor: adminPalette.blueSoft,
    borderColor: adminPalette.blue,
  },
  choiceText: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
  },
  choiceTextActive: {
    color: adminPalette.blue,
    fontFamily: 'Satoshi-Bold',
  },
  collapseHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  compactCount: {
    color: adminPalette.faint,
    flexShrink: 1,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
  },
  countText: {
    color: adminPalette.faint,
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
  },
  desktopShell: {
    flex: 1,
    flexDirection: 'row',
    gap: space.md,
    minHeight: 0,
  },
  disabled: {
    opacity: 0.65,
  },
  documentCard: {
    borderColor: adminPalette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    minWidth: 170,
    padding: space.md,
  },
  documentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  documentIcon: {
    alignItems: 'center',
    aspectRatio: 1.6,
    backgroundColor: adminPalette.blueSoft,
    borderRadius: radius.sm,
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  documentPreview: {
    aspectRatio: 1.6,
    backgroundColor: adminPalette.canvasSoft,
    borderRadius: radius.sm,
    marginBottom: space.sm,
    width: '100%',
  },
  documentTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  editorEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  editorScrollContent: {
    paddingBottom: space.xl,
  },
  errorBanner: {
    alignItems: 'center',
    backgroundColor: adminPalette.dangerSoft,
    borderColor: '#F3B5B5',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    padding: space.md,
  },
  errorText: {
    color: adminPalette.dangerDeep,
    flex: 1,
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
  },
  field: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  fieldHelper: {
    color: adminPalette.faint,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
  },
  filterChip: {
    borderColor: adminPalette.line,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: space.xs,
    minHeight: 40,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  filterChipActive: {
    backgroundColor: adminPalette.blue,
    borderColor: adminPalette.blue,
  },
  filterChipText: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
  },
  filterChipTextActive: {
    color: color.white,
  },
  filterScroll: {
    flexGrow: 0,
    marginBottom: space.sm,
  },
  formStack: {
    gap: space.md,
  },
  iconButton: {
    alignItems: 'center',
    borderColor: adminPalette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  input: {
    backgroundColor: color.white,
    borderColor: adminPalette.lineStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    minHeight: 46,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  kicker: {
    color: adminPalette.blue,
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  label: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
  },
  leftPane: {
    backgroundColor: color.white,
    borderColor: adminPalette.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    maxWidth: 370,
    minWidth: 320,
    padding: space.md,
    width: '32%',
  },
  listHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
  loadingBlock: {
    alignItems: 'center',
    flex: 1,
    gap: space.sm,
    justifyContent: 'center',
    padding: space.xl,
  },
  metricLabel: {
    color: adminPalette.faint,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
  },
  metricPill: {
    backgroundColor: adminPalette.canvasSoft,
    borderColor: adminPalette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    minWidth: 82,
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
  },
  metricValue: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
  },
  metricWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  mutedText: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 14,
  },
  panelFill: {
    flex: 1,
    minHeight: 0,
  },
  panelTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 18,
  },
  photoCard: {
    borderColor: adminPalette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: 150,
    flexGrow: 1,
    maxWidth: 220,
    overflow: 'hidden',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  photoLabel: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    padding: space.sm,
  },
  photoPreview: {
    aspectRatio: 1.2,
    backgroundColor: adminPalette.canvasSoft,
    width: '100%',
  },
  photoStrip: {
    flexGrow: 0,
  },
  photoThumb: {
    backgroundColor: adminPalette.canvasSoft,
    borderRadius: radius.sm,
    height: 86,
    marginRight: space.sm,
    width: 104,
  },
  pressed: {
    opacity: 0.75,
  },
  rightPane: {
    backgroundColor: color.white,
    borderColor: adminPalette.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    minWidth: 0,
    padding: space.md,
  },
  safeArea: {
    backgroundColor: adminPalette.canvasSoft,
    flex: 1,
  },
  saveButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: adminPalette.blue,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: space.xs,
    minHeight: 46,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  saveButtonText: {
    color: color.white,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
  },
  screen: {
    flex: 1,
    gap: space.md,
    padding: space.md,
  },
  searchBox: {
    alignItems: 'center',
    borderColor: adminPalette.lineStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    marginBottom: space.sm,
    minHeight: 46,
    paddingHorizontal: space.md,
  },
  searchInput: {
    color: adminPalette.ink,
    flex: 1,
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    minWidth: 0,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: adminPalette.blueLine,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    minHeight: 40,
    paddingHorizontal: space.md,
  },
  secondaryButtonText: {
    color: adminPalette.blue,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
  },
  sectionCard: {
    backgroundColor: color.white,
    borderColor: adminPalette.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: space.xs,
    padding: space.md,
  },
  sectionHelper: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 14,
    lineHeight: 19,
  },
  sectionScroll: {
    flexGrow: 0,
    marginVertical: space.sm,
  },
  sectionStack: {
    gap: space.md,
  },
  sectionTab: {
    alignItems: 'center',
    borderColor: adminPalette.line,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginRight: space.xs,
    minHeight: 42,
    paddingHorizontal: space.md,
  },
  sectionTabActive: {
    backgroundColor: adminPalette.blueSoft,
    borderColor: adminPalette.blue,
  },
  sectionTabText: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
  },
  sectionTabTextActive: {
    color: adminPalette.blue,
  },
  sectionTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 18,
  },
  selectedCopy: {
    flex: 1,
    gap: space.xs,
    minWidth: 0,
  },
  selectedHeader: {
    backgroundColor: adminPalette.blueSoft,
    borderColor: adminPalette.blueLine,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: space.md,
    padding: space.md,
  },
  selectedHeaderTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
  },
  selectedMeta: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
  },
  selectedName: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 22,
  },
  textArea: {
    minHeight: 104,
  },
  title: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 22,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  twoColumn: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
  },
  userCard: {
    alignItems: 'center',
    borderColor: adminPalette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    padding: space.md,
  },
  userCardBody: {
    flex: 1,
    gap: space.xs,
    minWidth: 0,
  },
  userCardFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  userCardSelected: {
    backgroundColor: adminPalette.blueSoft,
    borderColor: adminPalette.blue,
  },
  userCardTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.xs,
  },
  userListContent: {
    gap: space.sm,
    paddingBottom: space.xl,
  },
  userMeta: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
  },
  userName: {
    color: adminPalette.ink,
    flex: 1,
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
  },
  warningBanner: {
    alignItems: 'center',
    backgroundColor: adminPalette.orangeSoft,
    borderColor: adminPalette.orange,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    padding: space.md,
  },
  warningText: {
    color: adminPalette.ink,
    flex: 1,
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
  },
});
