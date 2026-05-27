import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdminStatusBadge, AdminTopHeader, adminPalette, type AdminTone } from '@/components/admin/AdminShell';
import { MVP_SERVICE_CATEGORIES, MVP_SERVICE_OPTIONS, getServicesForMvpCategory } from '@/constants/service-taxonomy';
import { color, radius, space } from '@/constants/theme';
import {
  createSignedVerificationFileUrl,
  createEditableJob,
  createEditableService,
  deactivateEditableJob,
  deactivateEditableService,
  getEditableJobStatuses,
  getEditableRateTypes,
  getEditableVerificationFileTypes,
  getEditableUser,
  getInternalDemoEditorAccess,
  listEditableUsers,
  updateEditableJob,
  updateEditableProfile,
  updateEditableService,
  updateVerificationNotes,
  upsertPrivateVerificationFile,
  uploadPublicDemoImage,
  type EditableJob,
  type EditableProfile,
  type EditableService,
  type EditableUserDetail,
  type EditableUserListItem,
  type EditableVerificationFile,
  type EditableVerificationRequest,
  type CreateEditableJobPayload,
  type CreateEditableServicePayload,
  type EditableVerificationFileType,
  type PrivateVerificationFileAsset,
  type InternalDemoAccess,
  type InternalDemoUserFilter,
  type InternalDemoVerificationStatus,
  type PublicDemoImageAsset,
} from '@/services/internal-demo-editor.service';
import type { JobStatus, RateType } from '@/types/marketplace.types';
import { supabase } from '@/utils/supabase';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];
type EditorSection = 'profile' | 'jobs' | 'services' | 'verification' | 'photos' | 'activity';

const USER_FILTERS: { label: string; value: InternalDemoUserFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Verified', value: 'verified' },
  { label: 'Pending', value: 'pending' },
  { label: 'Rejected/Unverified', value: 'unverified' },
  { label: 'Client', value: 'client' },
  { label: 'Worker', value: 'worker' },
  { label: 'Both', value: 'both' },
];

const SECTIONS: { icon: MaterialIconName; label: string; value: EditorSection }[] = [
  { icon: 'person', label: 'Profile', value: 'profile' },
  { icon: 'work-outline', label: 'Jobs', value: 'jobs' },
  { icon: 'handyman', label: 'Services', value: 'services' },
  { icon: 'verified-user', label: 'Verification', value: 'verification' },
  { icon: 'photo-library', label: 'Public Photos', value: 'photos' },
  { icon: 'forum', label: 'Activity', value: 'activity' },
];

const CONTACT_OPTIONS = ['app_message', 'phone', 'email'];

export default function InternalDemoContentEditorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const [access, setAccess] = useState<InternalDemoAccess | null>(null);
  const [users, setUsers] = useState<EditableUserListItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<EditableUserDetail | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [section, setSection] = useState<EditorSection>('profile');
  const [filter, setFilter] = useState<InternalDemoUserFilter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadUsers = useCallback(async ({ autoSelect = false }: { autoSelect?: boolean } = {}) => {
    setErrorMessage(null);
    setMessage(null);
    const result = await listEditableUsers();
    if (result.error || !result.data) {
      setErrorMessage(result.error ?? 'Could not load editable users.');
      return;
    }
    setUsers(result.data);
    if (autoSelect && result.data.length) {
      setSelectedUserId(result.data[0].id);
    }
  }, []);

  const loadSelectedUser = useCallback(async (userId: string) => {
    setLoadingDetail(true);
    const result = await getEditableUser(userId);
    if (result.error || !result.data) {
      setErrorMessage(result.error ?? 'Could not load this user.');
    } else {
      setSelectedUser(result.data);
    }
    setLoadingDetail(false);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      const accessResult = await getInternalDemoEditorAccess();
      if (!active) return;

      if (accessResult.error || !accessResult.data) {
        if ((accessResult.error ?? '').toLowerCase().includes('sign in')) {
          router.replace('/internal/login');
          return;
        }

        setErrorMessage(accessResult.error ?? 'Internal access is required.');
        setLoading(false);
        return;
      }

      setAccess(accessResult.data);
      await loadUsers({ autoSelect: true });
      if (active) setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [loadUsers, router]);

  useEffect(() => {
    if (!selectedUserId) return;
    void loadSelectedUser(selectedUserId);
  }, [loadSelectedUser, selectedUserId]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const filterMatches =
        filter === 'all' ||
        (filter === 'verified' && user.verificationStatus === 'verified') ||
        (filter === 'pending' && user.verificationStatus === 'pending') ||
        (filter === 'unverified' && user.verificationStatus === 'unverified') ||
        (filter === 'client' && user.roles.includes('client')) ||
        (filter === 'worker' && user.roles.includes('worker')) ||
        (filter === 'both' && user.roles.includes('client') && user.roles.includes('worker'));

      if (!filterMatches) return false;
      if (!query) return true;

      return [user.fullName, user.locationLabel, user.roleLabel, user.verificationLabel]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [filter, search, users]);

  const refreshAll = async () => {
    await loadUsers();
    if (selectedUserId) await loadSelectedUser(selectedUserId);
  };

  const signOut = () => {
    Alert.alert('Log out', 'End this internal editor session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/internal/login');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <CenterState icon="lock" title="Checking internal access" body="Preparing the protected demo editor..." />
      </SafeAreaView>
    );
  }

  if (!access) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <CenterState
          actionLabel="Use internal login"
          body={errorMessage ?? 'This route is only available to allowed internal admin accounts.'}
          icon="lock"
          onAction={() => router.replace('/internal/login')}
          title="Internal access required"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.screen}>
        <AdminTopHeader onLogout={signOut} />
        <View style={styles.internalHeader}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Internal Demo Content Editor</Text>
            <Text style={styles.subtitle}>Curate safe demo profiles, listings, services, photos, documents, and conversations.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => void refreshAll()}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <MaterialIcons color={adminPalette.blue} name="refresh" size={22} />
          </Pressable>
        </View>

        <View style={[styles.statusLine, access.whitelistConfigured ? styles.statusLineStrict : null]}>
          <MaterialIcons color={access.whitelistConfigured ? adminPalette.successDeep : adminPalette.orange} name="security" size={18} />
          <Text style={styles.statusText}>
            {access.whitelistConfigured
              ? `Admin plus whitelist: ${access.email ?? access.userId}`
              : 'Admin role guard active. Add whitelist env vars to tighten this route.'}
          </Text>
        </View>

        {message ? <InlineNotice tone="success">{message}</InlineNotice> : null}
        {errorMessage ? <InlineNotice tone="danger">{errorMessage}</InlineNotice> : null}

        <View style={[styles.workspace, desktop && styles.workspaceDesktop, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={[styles.userPane, desktop && styles.userPaneDesktop]}>
            <UserList
              filter={filter}
              onFilterChange={setFilter}
              onSearchChange={setSearch}
              onSelect={(userId) => {
                setSelectedUserId(userId);
                setSection('profile');
              }}
              search={search}
              selectedUserId={selectedUserId}
              users={filteredUsers}
            />
          </View>

          <View style={[styles.editorPane, desktop && styles.editorPaneDesktop]}>
            {!selectedUser ? (
              <CenterState
                body={loadingDetail ? 'Loading selected user...' : 'Choose a resident from the list.'}
                icon="manage-accounts"
                title={loadingDetail ? 'Loading editor' : 'No user selected'}
              />
            ) : (
              <ScrollView contentContainerStyle={styles.editorContent} keyboardShouldPersistTaps="handled">
                <SelectedUserHeader user={selectedUser} />
                <SectionTabs section={section} onChange={setSection} />
                {section === 'profile' ? (
                  <ProfileEditor
                    onSaved={async (nextMessage) => {
                      setMessage(nextMessage);
                      await refreshAll();
                    }}
                    user={selectedUser}
                  />
                ) : null}
                {section === 'jobs' ? (
                  <JobsEditor
                    onSaved={async (nextMessage) => {
                      setMessage(nextMessage);
                      await refreshAll();
                    }}
                    user={selectedUser}
                  />
                ) : null}
                {section === 'services' ? (
                  <ServicesEditor
                    onSaved={async (nextMessage) => {
                      setMessage(nextMessage);
                      await refreshAll();
                    }}
                    user={selectedUser}
                  />
                ) : null}
                {section === 'verification' ? <VerificationEditor user={selectedUser} /> : null}
                {section === 'photos' ? <PublicPhotosPreview user={selectedUser} /> : null}
                {section === 'activity' ? <ActivitySummary user={selectedUser} /> : null}
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function UserList({
  filter,
  onFilterChange,
  onSearchChange,
  onSelect,
  search,
  selectedUserId,
  users,
}: {
  filter: InternalDemoUserFilter;
  onFilterChange: (value: InternalDemoUserFilter) => void;
  onSearchChange: (value: string) => void;
  onSelect: (userId: string) => void;
  search: string;
  selectedUserId: string | null;
  users: EditableUserListItem[];
}) {
  return (
    <View style={styles.userListWrap}>
      <View style={styles.searchBox}>
        <MaterialIcons color={adminPalette.faint} name="search" size={19} />
        <TextInput
          autoCapitalize="none"
          onChangeText={onSearchChange}
          placeholder="Search by name, barangay, or role"
          placeholderTextColor={adminPalette.faint}
          style={styles.searchInput}
          value={search}
        />
      </View>
      <ScrollView horizontal contentContainerStyle={styles.filterRow} showsHorizontalScrollIndicator={false}>
        {USER_FILTERS.map((item) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: filter === item.value }}
            key={item.value}
            onPress={() => onFilterChange(item.value)}
            style={({ pressed }) => [styles.filterChip, filter === item.value && styles.filterChipActive, pressed && styles.pressed]}>
            <Text style={[styles.filterChipText, filter === item.value && styles.filterChipTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView contentContainerStyle={styles.userList} showsVerticalScrollIndicator={false}>
        {users.length ? (
          users.map((user) => (
            <UserCard
              key={`internal-user-${user.id}`}
              onPress={() => onSelect(user.id)}
              selected={selectedUserId === user.id}
              user={user}
            />
          ))
        ) : (
          <Text style={styles.emptyText}>No residents match this search.</Text>
        )}
      </ScrollView>
    </View>
  );
}

function UserCard({
  onPress,
  selected,
  user,
}: {
  onPress: () => void;
  selected: boolean;
  user: EditableUserListItem;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.userCard, selected && styles.userCardSelected, pressed && styles.pressed]}>
      <UserAvatar avatarUrl={user.avatarUrl} name={user.fullName} size={48} />
      <View style={styles.userCardCopy}>
        <View style={styles.userNameRow}>
          <Text numberOfLines={2} style={styles.userName}>{user.fullName}</Text>
          <AdminStatusBadge label={user.verificationLabel} tone={toneForVerification(user.verificationStatus)} />
        </View>
        <MetaLine icon="place" text={user.locationLabel} />
        <MetaLine icon={user.roles.includes('worker') ? 'engineering' : 'person-search'} text={user.roleLabel} />
        <View style={styles.countGrid}>
          <CountPill label="Jobs" value={user.publicJobsCount} />
          <CountPill label="Services" value={user.publicServicesCount} />
          <CountPill label="Photos" value={user.publicPhotosCount} />
          <CountPill label="Reviews" value={user.reviewsCount} />
        </View>
      </View>
    </Pressable>
  );
}

function SelectedUserHeader({ user }: { user: EditableUserDetail }) {
  return (
    <View style={styles.selectedHeader}>
      <UserAvatar avatarUrl={user.avatarUrl} name={user.fullName} size={58} />
      <View style={styles.selectedCopy}>
        <Text style={styles.selectedTitle}>{user.fullName}</Text>
        <Text style={styles.selectedSubtitle}>{user.roleLabel} · {user.locationLabel}</Text>
      </View>
      <AdminStatusBadge label={user.verificationLabel} tone={toneForVerification(user.verificationStatus)} />
    </View>
  );
}

function SectionTabs({
  onChange,
  section,
}: {
  onChange: (section: EditorSection) => void;
  section: EditorSection;
}) {
  return (
    <ScrollView horizontal contentContainerStyle={styles.sectionTabs} showsHorizontalScrollIndicator={false}>
      {SECTIONS.map((item) => {
        const active = item.value === section;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            key={item.value}
            onPress={() => onChange(item.value)}
            style={({ pressed }) => [styles.sectionTab, active && styles.sectionTabActive, pressed && styles.pressed]}>
            <MaterialIcons color={active ? adminPalette.blue : adminPalette.faint} name={item.icon} size={18} />
            <Text style={[styles.sectionTabText, active && styles.sectionTabTextActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function ProfileEditor({
  onSaved,
  user,
}: {
  onSaved: (message: string) => Promise<void>;
  user: EditableUserDetail;
}) {
  const [form, setForm] = useState<EditableProfile>(user.profile);
  const [saving, setSaving] = useState(false);
  const [pendingImage, setPendingImage] = useState<PublicDemoImageAsset | null>(null);

  useEffect(() => {
    setForm(user.profile);
    setPendingImage(null);
  }, [user.id, user.profile]);

  const chooseImage = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ['image/jpeg', 'image/png', 'image/webp'],
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setPendingImage({
      mimeType: asset.mimeType ?? null,
      name: asset.name ?? null,
      size: asset.size ?? null,
      uri: asset.uri,
    });
  };

  const save = async () => {
    setSaving(true);
    let avatarUrl = form.avatarUrl;
    if (pendingImage) {
      const uploaded = await uploadPublicDemoImage(pendingImage, 'profile_photo');
      if (uploaded.error || !uploaded.data) {
        setSaving(false);
        Alert.alert('Profile photo', uploaded.error ?? 'Could not upload this image.');
        return;
      }
      avatarUrl = uploaded.data;
    }

    const result = await updateEditableProfile(user.id, {
      about: form.about,
      avatarUrl,
      availability: form.availability,
      barangay: form.barangay,
      city: form.city,
      firstName: form.firstName,
      fullName: form.fullName,
      lastName: form.lastName,
      preferredContactMethod: form.preferredContactMethod,
      purokSitio: form.purokSitio,
      street: form.street,
      subdivisionArea: form.subdivisionArea,
    });
    setSaving(false);

    if (result.error || !result.data) {
      Alert.alert('Save profile', result.error ?? 'Could not save profile.');
      return;
    }

    await onSaved('Profile saved');
  };

  const previewUrl = pendingImage?.uri || form.avatarUrl;

  return (
    <EditorPanel
      footer={
        <SaveButton disabled={saving} label={saving ? 'Saving...' : 'Save Profile'} onPress={() => void save()} />
      }
      title="Profile">
      <Notice icon="photo-camera">
        Use only photos your group owns or has permission to use. Do not upload IDs, certificates, screenshots, or private information.
      </Notice>
      <View style={styles.photoEditorRow}>
        {previewUrl ? <Image source={{ uri: previewUrl }} style={styles.profilePreview} /> : <UserAvatar avatarUrl={null} name={form.fullName} size={82} />}
        <View style={styles.flex}>
          <Text style={styles.lockedLabel}>Public profile photo</Text>
          <Text style={styles.helperText}>Uploads use the public profile photo bucket. Signed verification files are never used here.</Text>
          <Pressable accessibilityRole="button" onPress={chooseImage} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
            <MaterialIcons color={adminPalette.blue} name="upload" size={18} />
            <Text style={styles.secondaryButtonText}>Choose image</Text>
          </Pressable>
        </View>
      </View>
      <Field label="Public photo URL" onChangeText={(value) => setForm({ ...form, avatarUrl: value })} value={form.avatarUrl} />
      <TwoColumn>
        <Field label="First name" onChangeText={(value) => setForm({ ...form, firstName: value })} value={form.firstName} />
        <Field label="Last name" onChangeText={(value) => setForm({ ...form, lastName: value })} value={form.lastName} />
      </TwoColumn>
      <Field label="Full name" onChangeText={(value) => setForm({ ...form, fullName: value })} value={form.fullName} />
      <TwoColumn>
        <Field label="Barangay/address label" onChangeText={(value) => setForm({ ...form, barangay: value })} value={form.barangay} />
        <Field label="City" onChangeText={(value) => setForm({ ...form, city: value })} value={form.city} />
      </TwoColumn>
      <TwoColumn>
        <Field label="Purok/address line" onChangeText={(value) => setForm({ ...form, purokSitio: value })} value={form.purokSitio} />
        <Field label="Street/road" onChangeText={(value) => setForm({ ...form, street: value })} value={form.street} />
      </TwoColumn>
      <TwoColumn>
        <Field label="Subdivision/area" onChangeText={(value) => setForm({ ...form, subdivisionArea: value })} value={form.subdivisionArea} />
      </TwoColumn>
      <Field label="Bio/about" multiline onChangeText={(value) => setForm({ ...form, about: value })} value={form.about} />
      <TwoColumn>
        <Field label="Availability" onChangeText={(value) => setForm({ ...form, availability: value })} value={form.availability} />
        <SelectChips
          label="Preferred contact"
          onSelect={(value) => setForm({ ...form, preferredContactMethod: value })}
          options={CONTACT_OPTIONS}
          value={form.preferredContactMethod}
        />
      </TwoColumn>
      <LockedFields
        rows={[
          ['Auth/Profile ID', user.id],
          ['Cached auth email', form.email ?? 'Not shown'],
          ['Roles', user.roleLabel],
          ['Created', formatDate(form.createdAt)],
          ['Updated', formatDate(form.updatedAt)],
        ]}
      />
    </EditorPanel>
  );
}

function JobsEditor({
  onSaved,
  user,
}: {
  onSaved: (message: string) => Promise<void>;
  user: EditableUserDetail;
}) {
  const [creating, setCreating] = useState(false);

  return (
    <EditorPanel title="Jobs/Listings">
      <Notice icon="admin-panel-settings">
        Internal job creation uses an admin-only helper and keeps active public jobs limited to verified residents.
      </Notice>
      {creating ? (
        <NewJobForm
          onCancel={() => setCreating(false)}
          onSaved={async (nextMessage) => {
            setCreating(false);
            await onSaved(nextMessage);
          }}
          user={user}
        />
      ) : (
        <Pressable accessibilityRole="button" onPress={() => setCreating(true)} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
          <MaterialIcons color={adminPalette.blue} name="add" size={18} />
          <Text style={styles.secondaryButtonText}>New job</Text>
        </Pressable>
      )}
      {user.jobs.length ? (
        user.jobs.map((job) => <JobForm key={`${user.id}-job-${job.id}`} job={job} onSaved={onSaved} user={user} />)
      ) : (
        <EmptyBlock text="No jobs found for this user." />
      )}
    </EditorPanel>
  );
}

function NewJobForm({
  onCancel,
  onSaved,
  user,
}: {
  onCancel: () => void;
  onSaved: (message: string) => Promise<void>;
  user: EditableUserDetail;
}) {
  const [form, setForm] = useState<CreateEditableJobPayload>(() => makeInitialJobPayload(user));
  const [saving, setSaving] = useState(false);
  const serviceOptions = getServicesForMvpCategory(form.category);

  useEffect(() => setForm(makeInitialJobPayload(user)), [user]);

  const addPhoto = async () => {
    const uploaded = await chooseAndUploadPublicImage('job_photo');
    if (uploaded) setForm((current) => ({ ...current, photoUrls: [...(current.photoUrls ?? []), uploaded] }));
  };

  const save = async () => {
    setSaving(true);
    const result = await createEditableJob(user.id, form);
    setSaving(false);
    if (result.error || !result.data) {
      Alert.alert('Create job', result.error ?? 'Could not create this job.');
      return;
    }
    await onSaved('Job created');
  };

  return (
    <View style={styles.recordCard}>
      <RecordHeader icon="add-business" title="New job listing" subtitle="Create a public job for this selected resident" />
      {user.verificationStatus !== 'verified' ? (
        <InlineNotice tone="warning">This user is not verified. Creating an active/open job will be blocked.</InlineNotice>
      ) : null}
      <Field label="Title" onChangeText={(value) => setForm({ ...form, title: value })} value={form.title} />
      <Field label="Description" multiline onChangeText={(value) => setForm({ ...form, description: value })} value={form.description} />
      <TwoColumn>
        <SelectChips label="Category" onSelect={(value) => setForm({ ...form, category: value, serviceNeeded: '' })} options={[...MVP_SERVICE_CATEGORIES]} value={form.category} />
        <SelectChips label="Service needed" onSelect={(value) => setForm({ ...form, serviceNeeded: value })} options={serviceOptions.length ? serviceOptions : [...MVP_SERVICE_OPTIONS]} value={form.serviceNeeded} />
      </TwoColumn>
      <TwoColumn>
        <Field label="Location/barangay" onChangeText={(value) => setForm({ ...form, locationText: value, barangay: value })} value={form.locationText ?? ''} />
        <SelectChips label="Status" onSelect={(value) => setForm({ ...form, status: value as JobStatus })} options={getEditableJobStatuses()} value={form.status} />
      </TwoColumn>
      <RateFields
        max={form.budgetMax ?? null}
        min={form.budgetMin ?? null}
        onMax={(value) => setForm({ ...form, budgetMax: value })}
        onMin={(value) => setForm({ ...form, budgetMin: value })}
        onRateType={(value) => setForm({ ...form, rateType: value })}
        rateType={form.rateType}
      />
      <PhotoUrlEditor
        addLabel="Add job photo"
        onAdd={() => void addPhoto()}
        onChange={(photoUrls) => setForm({ ...form, photoUrls })}
        photoUrls={form.photoUrls ?? []}
        stablePrefix={`${user.id}-new-job`}
      />
      <View style={styles.actionRow}>
        <SaveButton disabled={saving} label={saving ? 'Creating...' : 'Create Job'} onPress={() => void save()} />
        <Pressable accessibilityRole="button" disabled={saving} onPress={onCancel} style={({ pressed }) => [styles.secondaryButton, saving && styles.disabled, pressed && !saving && styles.pressed]}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

function JobForm({
  job,
  onSaved,
  user,
}: {
  job: EditableJob;
  onSaved: (message: string) => Promise<void>;
  user: EditableUserDetail;
}) {
  const [form, setForm] = useState(job);
  const [saving, setSaving] = useState(false);
  const serviceOptions = getServicesForMvpCategory(form.category);

  useEffect(() => setForm(job), [job]);

  const addPhoto = async () => {
    const uploaded = await chooseAndUploadPublicImage('job_photo');
    if (uploaded) setForm((current) => ({ ...current, photoUrls: [...current.photoUrls, uploaded] }));
  };

  const save = async () => {
    setSaving(true);
    const result = await updateEditableJob(job.id, form);
    setSaving(false);
    if (result.error || !result.data) {
      Alert.alert('Save job', result.error ?? 'Could not save this job.');
      return;
    }
    await onSaved('Job saved');
  };

  const deactivate = async () => {
    setSaving(true);
    const result = await deactivateEditableJob(job.id);
    setSaving(false);
    if (result.error || !result.data) {
      Alert.alert('Deactivate job', result.error ?? 'Could not deactivate this job.');
      return;
    }
    await onSaved('Job deactivated');
  };

  return (
    <View style={styles.recordCard}>
      <RecordHeader icon="work-outline" title={job.title || 'Job listing'} subtitle={`${formatStatus(job.status)} · ${formatDate(job.updatedAt)}`} />
      {user.verificationStatus !== 'verified' ? (
        <InlineNotice tone="warning">This user is not verified. Saving an active/open job will be blocked.</InlineNotice>
      ) : null}
      <Field label="Title" onChangeText={(value) => setForm({ ...form, title: value })} value={form.title} />
      <Field label="Description" multiline onChangeText={(value) => setForm({ ...form, description: value })} value={form.description} />
      <TwoColumn>
        <SelectChips label="Category" onSelect={(value) => setForm({ ...form, category: value, serviceNeeded: '' })} options={[...MVP_SERVICE_CATEGORIES]} value={form.category} />
        <SelectChips label="Service needed" onSelect={(value) => setForm({ ...form, serviceNeeded: value })} options={serviceOptions.length ? serviceOptions : [...MVP_SERVICE_OPTIONS]} value={form.serviceNeeded} />
      </TwoColumn>
      <TwoColumn>
        <Field label="Location/barangay" onChangeText={(value) => setForm({ ...form, locationText: value, barangay: value })} value={form.locationText} />
        <SelectChips label="Status" onSelect={(value) => setForm({ ...form, status: value as JobStatus })} options={getEditableJobStatuses()} value={form.status} />
      </TwoColumn>
      <RateFields
        max={form.budgetMax}
        min={form.budgetMin}
        onMax={(value) => setForm({ ...form, budgetMax: value })}
        onMin={(value) => setForm({ ...form, budgetMin: value })}
        onRateType={(value) => setForm({ ...form, rateType: value })}
        rateType={form.rateType}
      />
      <PhotoUrlEditor
        addLabel="Add job photo"
        onAdd={() => void addPhoto()}
        onChange={(photoUrls) => setForm({ ...form, photoUrls })}
        photoUrls={form.photoUrls}
        stablePrefix={`${user.id}-job-${job.id}`}
      />
      <View style={styles.actionRow}>
        <SaveButton disabled={saving} label={saving ? 'Saving...' : 'Save Job'} onPress={() => void save()} />
        <Pressable accessibilityRole="button" disabled={saving} onPress={() => void deactivate()} style={({ pressed }) => [styles.dangerButton, saving && styles.disabled, pressed && !saving && styles.pressed]}>
          <Text style={styles.dangerButtonText}>Deactivate</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ServicesEditor({
  onSaved,
  user,
}: {
  onSaved: (message: string) => Promise<void>;
  user: EditableUserDetail;
}) {
  const [creating, setCreating] = useState(false);

  return (
    <EditorPanel title="Services">
      <Notice icon="admin-panel-settings">
        Internal service creation uses an admin-only helper and keeps active public services limited to verified residents.
      </Notice>
      {creating ? (
        <NewServiceForm
          onCancel={() => setCreating(false)}
          onSaved={async (nextMessage) => {
            setCreating(false);
            await onSaved(nextMessage);
          }}
          user={user}
        />
      ) : (
        <Pressable accessibilityRole="button" onPress={() => setCreating(true)} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
          <MaterialIcons color={adminPalette.blue} name="add" size={18} />
          <Text style={styles.secondaryButtonText}>New service</Text>
        </Pressable>
      )}
      {user.services.length ? (
        user.services.map((service) => (
          <ServiceForm key={`${user.id}-service-${service.id}`} onSaved={onSaved} service={service} user={user} />
        ))
      ) : (
        <EmptyBlock text="No services found for this user." />
      )}
    </EditorPanel>
  );
}

function NewServiceForm({
  onCancel,
  onSaved,
  user,
}: {
  onCancel: () => void;
  onSaved: (message: string) => Promise<void>;
  user: EditableUserDetail;
}) {
  const [form, setForm] = useState<CreateEditableServicePayload>(() => makeInitialServicePayload(user));
  const [saving, setSaving] = useState(false);

  useEffect(() => setForm(makeInitialServicePayload(user)), [user]);

  const addPhoto = async () => {
    const uploaded = await chooseAndUploadPublicImage('service_photo');
    if (uploaded) setForm((current) => ({ ...current, photoUrls: [...(current.photoUrls ?? []), uploaded] }));
  };

  const save = async () => {
    setSaving(true);
    const result = await createEditableService(user.id, form);
    setSaving(false);
    if (result.error || !result.data) {
      Alert.alert('Create service', result.error ?? 'Could not create this service.');
      return;
    }
    await onSaved('Service created');
  };

  return (
    <View style={styles.recordCard}>
      <RecordHeader icon="add-business" title="New service listing" subtitle="Create a public service for this selected resident" />
      {user.verificationStatus !== 'verified' ? (
        <InlineNotice tone="warning">This user is not verified. Creating an active service will be blocked.</InlineNotice>
      ) : null}
      <Field label="Title" onChangeText={(value) => setForm({ ...form, title: value })} value={form.title} />
      <Field label="Description" multiline onChangeText={(value) => setForm({ ...form, description: value })} value={form.description} />
      <TwoColumn>
        <SelectChips label="Category" onSelect={(value) => setForm({ ...form, category: value })} options={[...MVP_SERVICE_OPTIONS]} value={form.category} />
        <SelectChips label="Status" onSelect={(value) => setForm({ ...form, isActive: value === 'active' })} options={['active', 'inactive']} value={form.isActive ? 'active' : 'inactive'} />
      </TwoColumn>
      <TwoColumn>
        <Field label="Location/barangay" onChangeText={(value) => setForm({ ...form, locationText: value, barangay: value })} value={form.locationText ?? ''} />
      </TwoColumn>
      <RateFields
        max={form.rateMax ?? null}
        min={form.rateMin ?? null}
        onMax={(value) => setForm({ ...form, rateMax: value })}
        onMin={(value) => setForm({ ...form, rateMin: value })}
        onRateType={(value) => setForm({ ...form, rateType: value })}
        rateType={form.rateType}
      />
      <PhotoUrlEditor
        addLabel="Add service photo"
        onAdd={() => void addPhoto()}
        onChange={(photoUrls) => setForm({ ...form, photoUrls })}
        photoUrls={form.photoUrls ?? []}
        stablePrefix={`${user.id}-new-service`}
      />
      <View style={styles.actionRow}>
        <SaveButton disabled={saving} label={saving ? 'Creating...' : 'Create Service'} onPress={() => void save()} />
        <Pressable accessibilityRole="button" disabled={saving} onPress={onCancel} style={({ pressed }) => [styles.secondaryButton, saving && styles.disabled, pressed && !saving && styles.pressed]}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ServiceForm({
  onSaved,
  service,
  user,
}: {
  onSaved: (message: string) => Promise<void>;
  service: EditableService;
  user: EditableUserDetail;
}) {
  const [form, setForm] = useState(service);
  const [saving, setSaving] = useState(false);

  useEffect(() => setForm(service), [service]);

  const addPhoto = async () => {
    const uploaded = await chooseAndUploadPublicImage('service_photo');
    if (uploaded) setForm((current) => ({ ...current, photoUrls: [...current.photoUrls, uploaded] }));
  };

  const save = async () => {
    setSaving(true);
    const result = await updateEditableService(service.id, form);
    setSaving(false);
    if (result.error || !result.data) {
      Alert.alert('Save service', result.error ?? 'Could not save this service.');
      return;
    }
    await onSaved('Service saved');
  };

  const deactivate = async () => {
    setSaving(true);
    const result = await deactivateEditableService(service.id);
    setSaving(false);
    if (result.error || !result.data) {
      Alert.alert('Deactivate service', result.error ?? 'Could not deactivate this service.');
      return;
    }
    await onSaved('Service deactivated');
  };

  return (
    <View style={styles.recordCard}>
      <RecordHeader icon="handyman" title={service.title || 'Service listing'} subtitle={`${service.isActive ? 'Active' : 'Inactive'} · ${formatDate(service.updatedAt)}`} />
      {user.verificationStatus !== 'verified' ? (
        <InlineNotice tone="warning">This user is not verified. Saving an active service will be blocked.</InlineNotice>
      ) : null}
      <Field label="Title" onChangeText={(value) => setForm({ ...form, title: value })} value={form.title} />
      <Field label="Description" multiline onChangeText={(value) => setForm({ ...form, description: value })} value={form.description} />
      <TwoColumn>
        <SelectChips label="Category" onSelect={(value) => setForm({ ...form, category: value })} options={[...MVP_SERVICE_OPTIONS]} value={form.category} />
        <SelectChips label="Status" onSelect={(value) => setForm({ ...form, isActive: value === 'active' })} options={['active', 'inactive']} value={form.isActive ? 'active' : 'inactive'} />
      </TwoColumn>
      <TwoColumn>
        <Field label="Location/barangay" onChangeText={(value) => setForm({ ...form, locationText: value, barangay: value })} value={form.locationText} />
      </TwoColumn>
      <RateFields
        max={form.rateMax}
        min={form.rateMin}
        onMax={(value) => setForm({ ...form, rateMax: value })}
        onMin={(value) => setForm({ ...form, rateMin: value })}
        onRateType={(value) => setForm({ ...form, rateType: value })}
        rateType={form.rateType}
      />
      <PhotoUrlEditor
        addLabel="Add service photo"
        onAdd={() => void addPhoto()}
        onChange={(photoUrls) => setForm({ ...form, photoUrls })}
        photoUrls={form.photoUrls}
        stablePrefix={`${user.id}-service-${service.id}`}
      />
      <View style={styles.actionRow}>
        <SaveButton disabled={saving} label={saving ? 'Saving...' : 'Save Service'} onPress={() => void save()} />
        <Pressable accessibilityRole="button" disabled={saving} onPress={() => void deactivate()} style={({ pressed }) => [styles.dangerButton, saving && styles.disabled, pressed && !saving && styles.pressed]}>
          <Text style={styles.dangerButtonText}>Deactivate</Text>
        </Pressable>
      </View>
    </View>
  );
}

function VerificationEditor({ user }: { user: EditableUserDetail }) {
  const [selectedRequestId, setSelectedRequestId] = useState(user.verifications[0]?.id ?? null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState('Verification document');

  useEffect(() => {
    setSelectedRequestId(user.verifications[0]?.id ?? null);
    setViewerUrl(null);
  }, [user.id, user.verifications]);

  const request = user.verifications.find((item) => item.id === selectedRequestId) ?? null;

  return (
    <EditorPanel title="Verification Notes and Documents">
      <Notice icon="privacy-tip">
        Verification documents are private. They are visible only to authorized internal users through short-lived signed links.
      </Notice>
      {user.verifications.length ? (
        <View style={styles.requestSelector}>
          {user.verifications.map((item) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: item.id === selectedRequestId }}
              key={`verification-request-${item.id}`}
              onPress={() => setSelectedRequestId(item.id)}
              style={({ pressed }) => [styles.requestChip, item.id === selectedRequestId && styles.requestChipActive, pressed && styles.pressed]}>
              <Text style={[styles.requestChipText, item.id === selectedRequestId && styles.requestChipTextActive]}>
                {formatStatus(item.status)} · {formatDate(item.createdAt)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <EmptyBlock text="No verification requests found for this user." />
      )}
      {request ? <VerificationRequestEditor request={request} onPreview={(url, title) => { setViewerUrl(url); setViewerTitle(title); }} /> : null}
      <Modal animationType="slide" visible={Boolean(viewerUrl)} onRequestClose={() => setViewerUrl(null)}>
        <SafeAreaView edges={['top', 'bottom']} style={styles.documentViewer}>
          <View style={styles.viewerHeader}>
            <Text style={styles.viewerTitle}>{viewerTitle}</Text>
            <Pressable accessibilityRole="button" onPress={() => setViewerUrl(null)} style={styles.viewerClose}>
              <MaterialIcons color={color.white} name="close" size={24} />
            </Pressable>
          </View>
          {viewerUrl && isPreviewableImage(viewerUrl) ? (
            <Image resizeMode="contain" source={{ uri: viewerUrl }} style={styles.viewerImage} />
          ) : (
            <View style={styles.viewerFallback}>
              <MaterialIcons color={adminPalette.blue} name="insert-drive-file" size={42} />
              <Text style={styles.viewerFallbackTitle}>Preview unavailable</Text>
              <Pressable accessibilityRole="button" onPress={() => viewerUrl && Linking.openURL(viewerUrl)} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Open signed link</Text>
              </Pressable>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </EditorPanel>
  );
}

function VerificationRequestEditor({
  onPreview,
  request,
}: {
  onPreview: (url: string, title: string) => void;
  request: EditableVerificationRequest;
}) {
  const [residentNote, setResidentNote] = useState(request.residentNote);
  const [adminNote, setAdminNote] = useState(request.adminNote);
  const [documentType, setDocumentType] = useState(request.documentType);
  const [files, setFiles] = useState(request.files);
  const [fileType, setFileType] = useState<EditableVerificationFileType>('other');
  const [saving, setSaving] = useState(false);
  const [uploadingFileId, setUploadingFileId] = useState<string | null>(null);

  useEffect(() => {
    setResidentNote(request.residentNote);
    setAdminNote(request.adminNote);
    setDocumentType(request.documentType);
    setFiles(request.files);
    setFileType('other');
    setUploadingFileId(null);
  }, [request]);

  const save = async () => {
    setSaving(true);
    const result = await updateVerificationNotes(request.id, { adminNote, documentType, residentNote });
    setSaving(false);
    if (result.error || !result.data) {
      Alert.alert('Verification notes', result.error ?? 'Could not save verification notes.');
      return;
    }
    Alert.alert('Verification notes', 'Notes saved.');
  };

  const previewFile = async (file: EditableVerificationFile) => {
    const result = await createSignedVerificationFileUrl(file.filePath ?? '');
    if (result.error || !result.data) {
      Alert.alert('Verification document', result.error ?? 'Could not create a signed link.');
      return;
    }
    onPreview(result.data, formatFileType(file.fileType));
  };

  const choosePrivateFile = async (): Promise<PrivateVerificationFileAsset | null> => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    });
    if (result.canceled || !result.assets?.[0]) return null;
    const asset = result.assets[0];
    return {
      mimeType: asset.mimeType ?? null,
      name: asset.name ?? null,
      size: asset.size ?? null,
      uri: asset.uri,
    };
  };

  const uploadPrivateFile = async (targetFile?: EditableVerificationFile) => {
    const asset = await choosePrivateFile();
    if (!asset) return;

    const activeFileType = (targetFile?.fileType ?? fileType) as EditableVerificationFileType;
    setUploadingFileId(targetFile?.id ?? 'new');
    const result = await upsertPrivateVerificationFile({
      file: asset,
      fileId: targetFile?.id,
      fileType: activeFileType,
      requestId: request.id,
    });
    setUploadingFileId(null);

    if (result.error || !result.data) {
      Alert.alert('Verification file', result.error ?? 'Could not upload this private file.');
      return;
    }

    setFiles((current) => {
      if (!targetFile) return [...current, result.data];
      return current.map((item) => (item.id === targetFile.id ? result.data : item));
    });
    Alert.alert('Verification file', targetFile ? 'File replaced.' : 'File added.');
  };

  return (
    <View style={styles.recordCard}>
      <RecordHeader icon="verified-user" title={`Request ${request.id.slice(0, 8)}`} subtitle={`${formatStatus(request.status)} · ${files.length} files`} />
      <TwoColumn>
        <Field label="Document type" onChangeText={setDocumentType} value={documentType} />
      </TwoColumn>
      <Field label="Resident note" multiline onChangeText={setResidentNote} value={residentNote} />
      <Field label="Admin note" multiline onChangeText={setAdminNote} value={adminNote} />
      <SaveButton disabled={saving} label={saving ? 'Saving...' : 'Save Verification Notes'} onPress={() => void save()} />
      <View style={styles.fieldWrap}>
        <SelectChips
          label="New private file type"
          onSelect={(value) => setFileType(value as EditableVerificationFileType)}
          options={getEditableVerificationFileTypes()}
          value={fileType}
        />
        <Pressable
          accessibilityRole="button"
          disabled={Boolean(uploadingFileId)}
          onPress={() => void uploadPrivateFile()}
          style={({ pressed }) => [styles.secondaryButton, uploadingFileId === 'new' && styles.disabled, pressed && !uploadingFileId && styles.pressed]}>
          <MaterialIcons color={adminPalette.blue} name="upload-file" size={18} />
          <Text style={styles.secondaryButtonText}>{uploadingFileId === 'new' ? 'Uploading...' : 'Add private file'}</Text>
        </Pressable>
      </View>
      <View style={styles.fileList}>
        {files.length ? (
          files.map((file, index) => (
            <View key={`${request.id}-verification-file-${file.id}`} style={styles.fileRow}>
              <View style={styles.fileIcon}>
                <MaterialIcons color={adminPalette.blue} name={isPreviewableImage(file.filePath ?? '') ? 'image' : 'insert-drive-file'} size={20} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.fileTitle}>{formatFileType(file.fileType)}</Text>
                <Text style={styles.fileMeta}>Private file {index + 1} · path hidden</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => void previewFile(file)} style={({ pressed }) => [styles.secondaryButtonCompact, pressed && styles.pressed]}>
                <Text style={styles.secondaryButtonText}>Preview</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={Boolean(uploadingFileId)}
                onPress={() => void uploadPrivateFile(file)}
                style={({ pressed }) => [styles.secondaryButtonCompact, uploadingFileId === file.id && styles.disabled, pressed && !uploadingFileId && styles.pressed]}>
                <Text style={styles.secondaryButtonText}>{uploadingFileId === file.id ? 'Uploading...' : 'Replace'}</Text>
              </Pressable>
            </View>
          ))
        ) : (
          <EmptyBlock text="No private files attached." />
        )}
      </View>
      <InlineNotice tone="warning">Private verification files stay in the private bucket and open only through short-lived signed links.</InlineNotice>
    </View>
  );
}

function PublicPhotosPreview({ user }: { user: EditableUserDetail }) {
  const photos = [
    ...(user.profile.avatarUrl ? [{ id: `${user.id}-profile-photo`, source: 'Profile photo', title: user.fullName, url: user.profile.avatarUrl }] : []),
    ...user.jobs.flatMap((job) =>
      job.photoUrls.map((url, index) => ({ id: `${user.id}-photo-job-${job.id}-${index}`, source: 'Job photo', title: job.title, url })),
    ),
    ...user.services.flatMap((service) =>
      service.photoUrls.map((url, index) => ({ id: `${user.id}-photo-service-${service.id}-${index}`, source: 'Service photo', title: service.title, url })),
    ),
  ];

  return (
    <EditorPanel title="Public Photos Preview">
      <Notice icon="visibility">
        This section shows only public profile, job, and service photos. Private verification documents and signed URLs are intentionally excluded.
      </Notice>
      {photos.length ? (
        <View style={styles.photoGrid}>
          {photos.map((photo) => (
            <View key={photo.id} style={styles.publicPhotoCard}>
              <Image source={{ uri: photo.url }} style={styles.publicPhotoImage} />
              <Text style={styles.publicPhotoSource}>{photo.source}</Text>
              <Text numberOfLines={2} style={styles.publicPhotoTitle}>{photo.title}</Text>
            </View>
          ))}
        </View>
      ) : (
        <EmptyBlock text="No public photos found." />
      )}
    </EditorPanel>
  );
}

function ActivitySummary({ user }: { user: EditableUserDetail }) {
  return (
    <EditorPanel title="Conversations, Reviews, and Reports">
      <Notice icon="info">
        Activity is shown for audit context. Conversation messages, reviews, and reports stay content-read-only here.
      </Notice>
      <ActivityBlock count={user.conversations.length} icon="forum" title="Conversations">
        {user.conversations.slice(0, 8).map((item) => (
          <InfoLine key={`conversation-${item.id}`} label={item.status} value={`${item.messageCount} messages · ${formatDate(item.updatedAt)}`} />
        ))}
      </ActivityBlock>
      <ActivityBlock count={user.reviews.length} icon="star-rate" title="Reviews/Ratings">
        {user.reviews.slice(0, 8).map((item) => (
          <InfoLine key={`review-${item.id}`} label={`${item.rating}/5`} value={item.comment || `Job ${item.jobId.slice(0, 8)}`} />
        ))}
      </ActivityBlock>
      <ActivityBlock count={user.reports.length} icon="flag" title="Reports">
        {user.reports.slice(0, 8).map((item) => (
          <InfoLine key={`report-${item.id}`} label={formatStatus(item.status)} value={item.reason} />
        ))}
      </ActivityBlock>
    </EditorPanel>
  );
}

function makeInitialJobPayload(user: EditableUserDetail): CreateEditableJobPayload {
  const category = MVP_SERVICE_CATEGORIES[0] ?? 'Home & Local Help';
  const serviceNeeded = getServicesForMvpCategory(category)[0] ?? MVP_SERVICE_OPTIONS[0] ?? 'Cleaning';
  const location = user.profile.barangay || user.locationLabel || 'Barangay San Pedro';

  return {
    barangay: location,
    budgetMax: 800,
    budgetMin: 400,
    category,
    description: '',
    locationText: location,
    photoUrls: [],
    rateType: 'per_service',
    serviceNeeded,
    status: user.verificationStatus === 'verified' ? 'open' : 'cancelled',
    title: '',
  };
}

function makeInitialServicePayload(user: EditableUserDetail): CreateEditableServicePayload {
  const category = MVP_SERVICE_OPTIONS[0] ?? 'Cleaning';
  const location = user.profile.barangay || user.locationLabel || 'Barangay San Pedro';

  return {
    barangay: location,
    category,
    description: '',
    isActive: user.verificationStatus === 'verified',
    locationText: location,
    photoUrls: [],
    rateMax: 800,
    rateMin: 400,
    rateType: 'per_service',
    title: '',
  };
}

async function chooseAndUploadPublicImage(target: 'job_photo' | 'service_photo') {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: ['image/jpeg', 'image/png', 'image/webp'],
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  const uploaded = await uploadPublicDemoImage({
    mimeType: asset.mimeType ?? null,
    name: asset.name ?? null,
    size: asset.size ?? null,
    uri: asset.uri,
  }, target);
  if (uploaded.error || !uploaded.data) {
    Alert.alert('Public photo', uploaded.error ?? 'Could not upload this photo.');
    return null;
  }
  return uploaded.data;
}

function PhotoUrlEditor({
  addLabel,
  onAdd,
  onChange,
  photoUrls,
  stablePrefix,
}: {
  addLabel: string;
  onAdd: () => void;
  onChange: (urls: string[]) => void;
  photoUrls: string[];
  stablePrefix: string;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>Public photos</Text>
      <View style={styles.photoStrip}>
        {photoUrls.map((url, index) => (
          <View key={`${stablePrefix}-photo-${index}`} style={styles.photoUrlTile}>
            <Image source={{ uri: url }} style={styles.photoUrlImage} />
            <Pressable
              accessibilityLabel={`Remove photo ${index + 1}`}
              accessibilityRole="button"
              onPress={() => onChange(photoUrls.filter((_, itemIndex) => itemIndex !== index))}
              style={styles.removePhotoButton}>
              <MaterialIcons color={color.white} name="close" size={14} />
            </Pressable>
          </View>
        ))}
        <Pressable accessibilityRole="button" onPress={onAdd} style={({ pressed }) => [styles.addPhotoTile, pressed && styles.pressed]}>
          <MaterialIcons color={adminPalette.blue} name="add-photo-alternate" size={22} />
          <Text style={styles.addPhotoText}>{addLabel}</Text>
        </Pressable>
      </View>
      <Field
        label="Photo URLs"
        multiline
        onChangeText={(value) => onChange(value.split('\n').map((item) => item.trim()).filter(Boolean))}
        value={photoUrls.join('\n')}
      />
    </View>
  );
}

function RateFields({
  max,
  min,
  onMax,
  onMin,
  onRateType,
  rateType,
}: {
  max: number | null;
  min: number | null;
  onMax: (value: number | null) => void;
  onMin: (value: number | null) => void;
  onRateType: (value: RateType) => void;
  rateType: RateType;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>Rate range</Text>
      <TwoColumn>
        <Field keyboardType="numeric" label="Min" onChangeText={(value) => onMin(parseAmount(value))} value={min ? String(min) : ''} />
        <Field keyboardType="numeric" label="Max" onChangeText={(value) => onMax(parseAmount(value))} value={max ? String(max) : ''} />
      </TwoColumn>
      <SelectChips label="Rate type" onSelect={(value) => onRateType(value as RateType)} options={getEditableRateTypes()} value={rateType} />
    </View>
  );
}

function SelectChips({
  label,
  onSelect,
  options,
  value,
}: {
  label: string;
  onSelect: (value: string) => void;
  options: readonly string[];
  value: string;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chipWrap}>
        {options.map((option) => {
          const active = option === value;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={`${label}-${option}`}
              onPress={() => onSelect(option)}
              style={({ pressed }) => [styles.choiceChip, active && styles.choiceChipActive, pressed && styles.pressed]}>
              <Text style={[styles.choiceChipText, active && styles.choiceChipTextActive]}>{formatOption(option)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function EditorPanel({
  children,
  footer,
  title,
}: {
  children: ReactNode;
  footer?: ReactNode;
  title: string;
}) {
  return (
    <View style={styles.editorPanel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>{title}</Text>
      </View>
      <View style={styles.panelBody}>{children}</View>
      {footer ? <View style={styles.panelFooter}>{footer}</View> : null}
    </View>
  );
}

function Field({
  keyboardType,
  label,
  multiline,
  onChangeText,
  value,
}: {
  keyboardType?: 'default' | 'numeric';
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  value: string;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholderTextColor={adminPalette.faint}
        style={[styles.input, multiline && styles.textArea]}
        textAlignVertical={multiline ? 'top' : 'center'}
        value={value}
      />
    </View>
  );
}

function TwoColumn({ children }: { children: ReactNode }) {
  return <View style={styles.twoColumn}>{children}</View>;
}

function SaveButton({
  disabled,
  label,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, disabled && styles.disabled, pressed && !disabled && styles.pressed]}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function LockedFields({ rows }: { rows: [string, string][] }) {
  return (
    <View style={styles.lockedBox}>
      <Text style={styles.lockedTitle}>Locked/read-only</Text>
      {rows.map(([label, value]) => (
        <InfoLine key={`locked-${label}`} label={label} value={value} />
      ))}
    </View>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLineLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.infoLineValue}>{value || 'Not provided'}</Text>
    </View>
  );
}

function ActivityBlock({
  children,
  count,
  icon,
  title,
}: {
  children: ReactNode;
  count: number;
  icon: MaterialIconName;
  title: string;
}) {
  return (
    <View style={styles.recordCard}>
      <RecordHeader icon={icon} title={title} subtitle={`${count} row${count === 1 ? '' : 's'} available`} />
      {count ? children : <EmptyBlock text={`No ${title.toLowerCase()} found.`} />}
    </View>
  );
}

function RecordHeader({
  icon,
  subtitle,
  title,
}: {
  icon: MaterialIconName;
  subtitle: string;
  title: string;
}) {
  return (
    <View style={styles.recordHeader}>
      <View style={styles.recordIcon}>
        <MaterialIcons color={adminPalette.blue} name={icon} size={22} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.recordTitle}>{title}</Text>
        <Text style={styles.recordSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function Notice({ children, icon }: { children: ReactNode; icon: MaterialIconName }) {
  return (
    <View style={styles.notice}>
      <MaterialIcons color={adminPalette.blue} name={icon} size={20} />
      <Text style={styles.noticeText}>{children}</Text>
    </View>
  );
}

function InlineNotice({ children, tone }: { children: ReactNode; tone: 'danger' | 'success' | 'warning' }) {
  return (
    <View style={[styles.inlineNotice, styles[`inlineNotice_${tone}`]]}>
      <Text style={[styles.inlineNoticeText, styles[`inlineNoticeText_${tone}`]]}>{children}</Text>
    </View>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return <Text style={styles.emptyBlock}>{text}</Text>;
}

function CenterState({
  actionLabel,
  body,
  icon,
  onAction,
  title,
}: {
  actionLabel?: string;
  body: string;
  icon: MaterialIconName;
  onAction?: () => void;
  title: string;
}) {
  return (
    <View style={styles.centerState}>
      <View style={styles.centerIcon}>
        <MaterialIcons color={adminPalette.blue} name={icon} size={34} />
      </View>
      <Text style={styles.centerTitle}>{title}</Text>
      <Text style={styles.centerBody}>{body}</Text>
      {actionLabel && onAction ? <SaveButton label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

function UserAvatar({
  avatarUrl,
  name,
  size,
}: {
  avatarUrl: string | null;
  name: string;
  size: number;
}) {
  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={[styles.avatar, { borderRadius: size / 2, height: size, width: size }]} />;
  }

  return (
    <View style={[styles.avatarFallback, { borderRadius: size / 2, height: size, width: size }]}>
      <Text style={styles.avatarInitials}>{getInitials(name)}</Text>
    </View>
  );
}

function MetaLine({ icon, text }: { icon: MaterialIconName; text: string }) {
  return (
    <View style={styles.metaLine}>
      <MaterialIcons color={adminPalette.faint} name={icon} size={15} />
      <Text numberOfLines={1} style={styles.metaText}>{text}</Text>
    </View>
  );
}

function CountPill({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.countPill}>
      <Text style={styles.countValue}>{value}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </View>
  );
}

function parseAmount(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatStatus(value: string) {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function formatOption(value: string) {
  return formatStatus(value).replace('Per ', 'Per ');
}

function formatFileType(value: string) {
  return formatStatus(value);
}

function formatDate(value: string | null) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'KR';
}

function isPreviewableImage(value: string) {
  return /\.(png|jpe?g|webp)(\?|$)/i.test(value);
}

function toneForVerification(status: InternalDemoVerificationStatus): AdminTone {
  if (status === 'verified') return 'success';
  if (status === 'pending') return 'warning';
  return 'neutral';
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: adminPalette.blue,
    flex: 1,
  },
  screen: {
    backgroundColor: adminPalette.canvasSoft,
    flex: 1,
  },
  internalHeader: {
    alignItems: 'center',
    backgroundColor: color.white,
    borderBottomColor: adminPalette.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  title: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 23,
    lineHeight: 29,
  },
  subtitle: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  iconButton: {
    alignItems: 'center',
    borderColor: adminPalette.line,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  statusLine: {
    alignItems: 'center',
    backgroundColor: adminPalette.orangeSoft,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  statusLineStrict: {
    backgroundColor: adminPalette.successSoft,
  },
  statusText: {
    color: adminPalette.ink,
    flex: 1,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  workspace: {
    flex: 1,
    gap: 12,
    padding: 12,
  },
  workspaceDesktop: {
    alignSelf: 'center',
    flexDirection: 'row',
    maxWidth: 1280,
    width: '100%',
  },
  userPane: {
    backgroundColor: color.white,
    borderColor: adminPalette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    maxHeight: 360,
    overflow: 'hidden',
  },
  userPaneDesktop: {
    flex: 0.42,
    maxHeight: '100%' as never,
  },
  editorPane: {
    backgroundColor: color.white,
    borderColor: adminPalette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    overflow: 'hidden',
  },
  editorPaneDesktop: {
    flex: 0.58,
  },
  userListWrap: {
    flex: 1,
  },
  searchBox: {
    alignItems: 'center',
    borderBottomColor: adminPalette.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  searchInput: {
    color: adminPalette.ink,
    flex: 1,
    fontFamily: 'Satoshi-Regular',
    fontSize: 14,
    minHeight: 44,
  },
  filterRow: {
    gap: 8,
    padding: 12,
  },
  filterChip: {
    borderColor: adminPalette.line,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  filterChipActive: {
    backgroundColor: adminPalette.blueSoft,
    borderColor: adminPalette.blueLine,
  },
  filterChipText: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
  },
  filterChipTextActive: {
    color: adminPalette.blue,
    fontFamily: 'Satoshi-Bold',
  },
  userList: {
    paddingBottom: 18,
  },
  userCard: {
    alignItems: 'flex-start',
    borderTopColor: adminPalette.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  userCardSelected: {
    backgroundColor: adminPalette.blueSoft,
  },
  avatar: {
    backgroundColor: color.surfaceAlt,
    borderColor: adminPalette.line,
    borderWidth: 1,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: adminPalette.blueSoft,
    borderColor: adminPalette.blueLine,
    borderWidth: 1,
    justifyContent: 'center',
  },
  avatarInitials: {
    color: adminPalette.blueDeep,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
  },
  userCardCopy: {
    flex: 1,
    gap: 5,
    minWidth: 0,
  },
  userNameRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
  },
  userName: {
    color: adminPalette.ink,
    flex: 1,
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
    lineHeight: 20,
  },
  metaLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  metaText: {
    color: adminPalette.muted,
    flex: 1,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  countGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 4,
  },
  countPill: {
    alignItems: 'center',
    backgroundColor: color.white,
    borderColor: adminPalette.line,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    minHeight: 26,
    paddingHorizontal: 8,
  },
  countValue: {
    color: adminPalette.blue,
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
  },
  countLabel: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 11,
  },
  editorContent: {
    gap: 14,
    padding: 16,
  },
  selectedHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  selectedCopy: {
    flex: 1,
    minWidth: 0,
  },
  selectedTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 20,
    lineHeight: 26,
  },
  selectedSubtitle: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTabs: {
    gap: 8,
  },
  sectionTab: {
    alignItems: 'center',
    borderColor: adminPalette.line,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
  },
  sectionTabActive: {
    backgroundColor: adminPalette.blueSoft,
    borderColor: adminPalette.blueLine,
  },
  sectionTabText: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
  },
  sectionTabTextActive: {
    color: adminPalette.blue,
    fontFamily: 'Satoshi-Bold',
  },
  editorPanel: {
    borderColor: adminPalette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  panelHeader: {
    backgroundColor: adminPalette.canvasSoft,
    borderBottomColor: adminPalette.line,
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  panelTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 17,
    lineHeight: 22,
  },
  panelBody: {
    gap: 14,
    padding: 14,
  },
  panelFooter: {
    borderTopColor: adminPalette.line,
    borderTopWidth: 1,
    padding: 14,
  },
  fieldWrap: {
    flex: 1,
    gap: 7,
    minWidth: 0,
  },
  label: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  input: {
    backgroundColor: color.white,
    borderColor: adminPalette.lineStrong,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Regular',
    fontSize: 14,
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
  },
  textArea: {
    minHeight: 94,
  },
  twoColumn: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoEditorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  profilePreview: {
    backgroundColor: color.surfaceAlt,
    borderColor: adminPalette.line,
    borderRadius: 41,
    borderWidth: 1,
    height: 82,
    width: 82,
  },
  helperText: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  secondaryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: adminPalette.blueLine,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  secondaryButtonCompact: {
    alignItems: 'center',
    borderColor: adminPalette.blueLine,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    color: adminPalette.blue,
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: adminPalette.blue,
    borderRadius: radius.pill,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: color.white,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
  },
  dangerButton: {
    alignItems: 'center',
    backgroundColor: adminPalette.dangerSoft,
    borderColor: '#F5D3D3',
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  dangerButtonText: {
    color: adminPalette.dangerDeep,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  lockedBox: {
    backgroundColor: adminPalette.canvasSoft,
    borderColor: adminPalette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  lockedTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    lineHeight: 18,
    padding: 12,
  },
  lockedLabel: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 19,
  },
  infoLine: {
    borderTopColor: adminPalette.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  infoLineLabel: {
    color: adminPalette.muted,
    flex: 1,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  infoLineValue: {
    color: adminPalette.ink,
    flex: 1.2,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'right',
  },
  notice: {
    alignItems: 'flex-start',
    backgroundColor: adminPalette.blueSoft,
    borderColor: adminPalette.blueLine,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  noticeText: {
    color: adminPalette.ink,
    flex: 1,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  inlineNotice: {
    borderRadius: radius.sm,
    marginHorizontal: 12,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  inlineNotice_warning: {
    backgroundColor: adminPalette.orangeSoft,
  },
  inlineNotice_danger: {
    backgroundColor: adminPalette.dangerSoft,
  },
  inlineNotice_success: {
    backgroundColor: adminPalette.successSoft,
  },
  inlineNoticeText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  inlineNoticeText_warning: {
    color: adminPalette.ink,
  },
  inlineNoticeText_danger: {
    color: adminPalette.dangerDeep,
  },
  inlineNoticeText_success: {
    color: adminPalette.successDeep,
  },
  recordCard: {
    borderColor: adminPalette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 14,
    padding: 12,
  },
  recordHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  recordIcon: {
    alignItems: 'center',
    backgroundColor: adminPalette.blueSoft,
    borderRadius: radius.sm,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  recordTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
    lineHeight: 20,
  },
  recordSubtitle: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceChip: {
    borderColor: adminPalette.line,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  choiceChipActive: {
    backgroundColor: adminPalette.blueSoft,
    borderColor: adminPalette.blueLine,
  },
  choiceChipText: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
  },
  choiceChipTextActive: {
    color: adminPalette.blue,
    fontFamily: 'Satoshi-Bold',
  },
  photoStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoUrlTile: {
    height: 76,
    width: 76,
  },
  photoUrlImage: {
    backgroundColor: color.surfaceAlt,
    borderColor: adminPalette.line,
    borderRadius: radius.sm,
    borderWidth: 1,
    height: '100%',
    width: '100%',
  },
  removePhotoButton: {
    alignItems: 'center',
    backgroundColor: adminPalette.ink,
    borderRadius: radius.pill,
    height: 22,
    justifyContent: 'center',
    position: 'absolute',
    right: -6,
    top: -6,
    width: 22,
  },
  addPhotoTile: {
    alignItems: 'center',
    backgroundColor: adminPalette.blueSoft,
    borderColor: adminPalette.blueLine,
    borderRadius: radius.sm,
    borderWidth: 1,
    height: 76,
    justifyContent: 'center',
    padding: 8,
    width: 98,
  },
  addPhotoText: {
    color: adminPalette.blue,
    fontFamily: 'Satoshi-Bold',
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
  requestSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  requestChip: {
    borderColor: adminPalette.line,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  requestChipActive: {
    backgroundColor: adminPalette.blueSoft,
    borderColor: adminPalette.blueLine,
  },
  requestChipText: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
  },
  requestChipTextActive: {
    color: adminPalette.blue,
    fontFamily: 'Satoshi-Bold',
  },
  fileList: {
    borderColor: adminPalette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  fileRow: {
    alignItems: 'center',
    borderTopColor: adminPalette.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 58,
    padding: 10,
  },
  fileIcon: {
    alignItems: 'center',
    backgroundColor: adminPalette.blueSoft,
    borderRadius: radius.sm,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  fileTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    lineHeight: 18,
  },
  fileMeta: {
    color: adminPalette.faint,
    fontFamily: 'Satoshi-Regular',
    fontSize: 11,
    lineHeight: 15,
  },
  documentViewer: {
    backgroundColor: '#111111',
    flex: 1,
  },
  viewerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  viewerTitle: {
    color: color.white,
    flex: 1,
    fontFamily: 'Satoshi-Bold',
    fontSize: 17,
    lineHeight: 22,
  },
  viewerClose: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  viewerImage: {
    flex: 1,
    width: '100%',
  },
  viewerFallback: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
  viewerFallbackTitle: {
    color: color.white,
    fontFamily: 'Satoshi-Bold',
    fontSize: 18,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  publicPhotoCard: {
    borderColor: adminPalette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    width: 148,
  },
  publicPhotoImage: {
    backgroundColor: color.surfaceAlt,
    height: 112,
    width: '100%',
  },
  publicPhotoSource: {
    color: adminPalette.blue,
    fontFamily: 'Satoshi-Bold',
    fontSize: 11,
    lineHeight: 15,
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  publicPhotoTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 16,
    paddingBottom: 10,
    paddingHorizontal: 10,
  },
  emptyText: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
    padding: 18,
    textAlign: 'center',
  },
  emptyBlock: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
    padding: 12,
    textAlign: 'center',
  },
  centerState: {
    alignItems: 'center',
    backgroundColor: color.white,
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    padding: 24,
  },
  centerIcon: {
    alignItems: 'center',
    backgroundColor: adminPalette.blueSoft,
    borderRadius: radius.pill,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  centerTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 20,
    lineHeight: 26,
    textAlign: 'center',
  },
  centerBody: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 520,
    textAlign: 'center',
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.56,
  },
});
