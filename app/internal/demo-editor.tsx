import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import { AdminStatusBadge, adminPalette, type AdminTone } from '@/components/admin/AdminShell';
import { useFeedback } from '@/components/FeedbackProvider';
import { MVP_SERVICE_CATEGORIES, MVP_SERVICE_OPTIONS, getServicesForMvpCategory } from '@/constants/service-taxonomy';
import { color, radius } from '@/constants/theme';
import {
  createSignedVerificationFileUrl,
  createEditableJob,
  createEditableService,
  deactivateEditableJob,
  deactivateEditableService,
  getEditableConversationStatuses,
  getEditableJobStatuses,
  getEditableRateTypes,
  getEditableReportStatuses,
  getEditableVerificationFileTypes,
  getEditableUser,
  getInternalDemoEditorAccess,
  listEditableUsers,
  moderateEditablePublicPhoto,
  removePublicDemoImage,
  updateEditableConversationStatus,
  updateEditableJob,
  updateEditableProfile,
  updateEditableReportStatus,
  updateEditableService,
  updateVerificationNotes,
  upsertPrivateVerificationFile,
  uploadPublicDemoImage,
  type EditableConversationSummary,
  type EditableJob,
  type EditableJobDraft,
  type EditableProfile,
  type EditablePublicPhotoAction,
  type EditableReportSummary,
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
import { getPublicImageValidationError } from '@/utils/image-processing';
import { supabase } from '@/utils/supabase';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];
type EditorSection = 'overview' | 'profile' | 'jobs' | 'services' | 'photos' | 'verification' | 'activity';
type JobListingFieldsPatch = Partial<Pick<
  CreateEditableJobPayload,
  | 'allowMessages'
  | 'autoCloseEnabled'
  | 'autoReplyEnabled'
  | 'budgetNegotiable'
  | 'certificationNote'
  | 'certificationRequired'
  | 'experienceLevel'
  | 'scheduleText'
  | 'tags'
  | 'workersNeeded'
>>;
type ServiceListingFieldsPatch = Partial<Pick<
  CreateEditableServicePayload,
  | 'allowMessages'
  | 'autoPauseEnabled'
  | 'autoReplyEnabled'
  | 'availabilityText'
  | 'certificationAvailable'
  | 'certificationNote'
  | 'experienceLevel'
  | 'rateNegotiable'
  | 'tags'
  | 'yearsExperience'
>>;

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
  { icon: 'dashboard', label: 'Overview', value: 'overview' },
  { icon: 'person', label: 'Profile', value: 'profile' },
  { icon: 'work-outline', label: 'Jobs', value: 'jobs' },
  { icon: 'handyman', label: 'Services', value: 'services' },
  { icon: 'photo-library', label: 'Photos', value: 'photos' },
  { icon: 'verified-user', label: 'Verification', value: 'verification' },
  { icon: 'forum', label: 'Activity', value: 'activity' },
];

const CONTACT_OPTIONS = ['app_message', 'phone', 'email'];
const EXPERIENCE_LEVEL_OPTIONS = ['any', 'beginner', 'intermediate', 'experienced'];

type PublicPhotoModerationItem = {
  id: string;
  ownerId: string;
  source: string;
  sourceId: string;
  sourceType: 'profile_photo' | 'job_photo' | 'service_photo';
  title: string;
  url: string;
};

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
  const [pickerOpen, setPickerOpen] = useState(false);
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
      await loadUsers();
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

  const selectUser = (userId: string) => {
    setSelectedUserId(userId);
    setSelectedUser(null);
    setSection('profile');
    setPickerOpen(false);
  };

  const previewPublicProfile = (user: EditableUserDetail) => {
    if (user.roles.includes('worker')) {
      router.push({ pathname: '/worker/[workerId]' as never, params: { workerId: user.id } } as never);
      return;
    }

    if (user.roles.includes('client')) {
      router.push({ pathname: '/client/[clientId]' as never, params: { clientId: user.id } } as never);
      return;
    }

    Alert.alert('Preview public profile', 'This resident does not have a worker or client role to preview yet.');
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
        <CompactContextBar
          access={access}
          onRefresh={() => void refreshAll()}
          onSignOut={signOut}
        />

        {message ? <InlineNotice tone="success">{message}</InlineNotice> : null}
        {errorMessage ? <InlineNotice tone="danger">{errorMessage}</InlineNotice> : null}

        <View style={[styles.workspace, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {!selectedUserId ? (
          <View style={styles.browsePane}>
            <UserList
              cardActionLabel="Edit demo user"
              filter={filter}
              headerSubtitle="Search the protected demo user pool, then open one account into the focused editor."
              headerTitle="Find a demo account"
              onFilterChange={setFilter}
              onSearchChange={setSearch}
              onSelect={selectUser}
              search={search}
              selectedUserId={selectedUserId}
              users={filteredUsers}
            />
          </View>
          ) : (
          <View style={styles.editorPane}>
            {!selectedUser ? (
              <CenterState
                body={loadingDetail ? 'Loading selected user...' : 'Choose a resident from the list.'}
                icon="manage-accounts"
                title={loadingDetail ? 'Loading editor' : 'No user selected'}
              />
            ) : (
              <ScrollView
                contentContainerStyle={[styles.editorContent, desktop && styles.editorContentDesktop]}
                keyboardShouldPersistTaps="handled">
                <SelectedUserHeader
                  compact={!desktop}
                  onChangeUser={() => setPickerOpen(true)}
                  onPreview={() => previewPublicProfile(selectedUser)}
                  onRefresh={() => void refreshAll()}
                  onSectionChange={setSection}
                  section={section}
                  user={selectedUser}
                />
                {section === 'overview' ? (
                  <DemoUserOverview
                    onPreview={() => previewPublicProfile(selectedUser)}
                    onSectionChange={setSection}
                    user={selectedUser}
                  />
                ) : null}
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
          )}
        </View>
        <UserPickerModal
          filter={filter}
          onClose={() => setPickerOpen(false)}
          onFilterChange={setFilter}
          onSearchChange={setSearch}
          onSelect={selectUser}
          search={search}
          selectedUserId={selectedUserId}
          users={filteredUsers}
          visible={pickerOpen}
        />
      </View>
    </SafeAreaView>
  );
}

function CompactContextBar({
  access,
  onRefresh,
  onSignOut,
}: {
  access: InternalDemoAccess;
  onRefresh: () => void;
  onSignOut: () => void;
}) {
  return (
    <View style={styles.contextBar}>
      <View style={styles.contextMain}>
        <Text numberOfLines={1} style={styles.contextTitle}>
          Konektado {'\u00B7'} Demo Editor
        </Text>
      </View>
      <Text numberOfLines={1} style={styles.contextAdminEmail}>{access.email ?? access.userId}</Text>
      <View style={styles.contextActions}>
        <Pressable
          accessibilityLabel="Refresh internal demo editor"
          accessibilityRole="button"
          onPress={onRefresh}
          style={({ pressed }) => [styles.contextIconButton, pressed && styles.pressed]}>
          <MaterialIcons color={color.white} name="refresh" size={18} />
        </Pressable>
        <Pressable
          accessibilityLabel="Log out of internal demo editor"
          accessibilityRole="button"
          onPress={onSignOut}
          style={({ pressed }) => [styles.contextIconButton, pressed && styles.pressed]}>
          <MaterialIcons color={color.white} name="logout" size={18} />
        </Pressable>
      </View>
    </View>
  );
}

function UserList({
  cardActionLabel = 'Edit demo user',
  filter,
  headerSubtitle,
  headerTitle,
  onFilterChange,
  onSearchChange,
  onSelect,
  search,
  selectedUserId,
  users,
}: {
  cardActionLabel?: string;
  filter: InternalDemoUserFilter;
  headerSubtitle?: string;
  headerTitle?: string;
  onFilterChange: (value: InternalDemoUserFilter) => void;
  onSearchChange: (value: string) => void;
  onSelect: (userId: string) => void;
  search: string;
  selectedUserId: string | null;
  users: EditableUserListItem[];
}) {
  return (
    <View style={styles.userListWrap}>
      {headerTitle ? (
        <View style={styles.userListIntro}>
          <Text style={styles.userListTitle}>{headerTitle}</Text>
          {headerSubtitle ? <Text style={styles.userListSubtitle}>{headerSubtitle}</Text> : null}
        </View>
      ) : null}
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
              actionLabel={cardActionLabel}
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
  actionLabel,
  onPress,
  selected,
  user,
}: {
  actionLabel: string;
  onPress: () => void;
  selected: boolean;
  user: EditableUserListItem;
}) {
  return (
    <View style={[styles.userCard, selected && styles.userCardSelected]}>
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
        <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.userCardAction, pressed && styles.pressed]}>
          <Text style={styles.userCardActionText}>{actionLabel}</Text>
          <MaterialIcons color={adminPalette.blue} name="arrow-forward" size={16} />
        </Pressable>
      </View>
    </View>
  );
}

function SelectedUserHeader({
  compact,
  onChangeUser,
  onPreview,
  onRefresh,
  onSectionChange,
  section,
  user,
}: {
  compact: boolean;
  onChangeUser: () => void;
  onPreview: () => void;
  onRefresh: () => void;
  onSectionChange: (section: EditorSection) => void;
  section: EditorSection;
  user: EditableUserDetail;
}) {
  const email = getRequiredEmailLabel(user);

  return (
    <View style={styles.selectedHeader}>
      <View style={styles.selectedIdentityRow}>
        <View style={styles.selectedPersonRow}>
          <UserAvatar avatarUrl={user.avatarUrl} name={user.fullName} size={40} />
          <View style={styles.selectedCopy}>
            <View style={styles.selectedTitleRow}>
              <Text numberOfLines={1} style={styles.selectedTitle}>{user.fullName}</Text>
              <AdminStatusBadge label={user.verificationLabel} tone={toneForVerification(user.verificationStatus)} />
            </View>
            <Text numberOfLines={1} style={styles.selectedEmail}>{email}</Text>
          </View>
        </View>
        <View style={styles.selectedIdentityFacts}>
          <IdentityFact label="Role" value={user.roleLabel} />
          <IdentityFact label="Address" value={user.locationLabel} />
          <IdentityFact label="Verification" value={user.verificationLabel} />
        </View>
      </View>
      <View style={styles.selectedToolsRow}>
        <View style={styles.selectedStatsRow}>
          <CountPill label="Jobs" value={user.publicJobsCount} />
          <CountPill label="Services" value={user.publicServicesCount} />
          <CountPill label="Photos" value={user.publicPhotosCount} />
          <CountPill label="Reviews" value={user.reviewsCount} />
        </View>
        <View style={styles.selectedActions}>
          <HeaderAction icon="switch-account" label="Change user" onPress={onChangeUser} />
          <HeaderAction icon="visibility" label="Preview" onPress={onPreview} />
          <HeaderAction icon="refresh" label="Refresh" onPress={onRefresh} />
        </View>
      </View>
      <SectionTabs compact={compact} section={section} onChange={onSectionChange} />
    </View>
  );
}

function IdentityFact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.identityFact}>
      <Text style={styles.identityFactLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.identityFactValue}>{value}</Text>
    </View>
  );
}

function SectionTabs({
  compact,
  onChange,
  section,
}: {
  compact: boolean;
  onChange: (section: EditorSection) => void;
  section: EditorSection;
}) {
  if (compact) {
    return (
      <View style={styles.sectionCardGrid}>
        {SECTIONS.map((item) => {
          const active = item.value === section;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={item.value}
              onPress={() => onChange(item.value)}
              style={({ pressed }) => [styles.sectionCard, active && styles.sectionCardActive, pressed && styles.pressed]}>
              <MaterialIcons color={active ? adminPalette.blue : adminPalette.faint} name={item.icon} size={20} />
              <Text style={[styles.sectionCardText, active && styles.sectionCardTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.sectionTabs}>
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
    </View>
  );
}

function HeaderAction({
  icon,
  label,
  onPress,
}: {
  icon: MaterialIconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}>
      <MaterialIcons color={adminPalette.blue} name={icon} size={18} />
      <Text style={styles.headerActionText}>{label}</Text>
    </Pressable>
  );
}

function UserPickerModal({
  filter,
  onClose,
  onFilterChange,
  onSearchChange,
  onSelect,
  search,
  selectedUserId,
  users,
  visible,
}: {
  filter: InternalDemoUserFilter;
  onClose: () => void;
  onFilterChange: (value: InternalDemoUserFilter) => void;
  onSearchChange: (value: string) => void;
  onSelect: (userId: string) => void;
  search: string;
  selectedUserId: string | null;
  users: EditableUserListItem[];
  visible: boolean;
}) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.pickerBackdrop}>
        <Pressable accessibilityLabel="Close user picker" style={styles.pickerScrim} onPress={onClose} />
        <SafeAreaView edges={['top', 'bottom']} style={styles.pickerPanel}>
          <View style={styles.pickerHeader}>
            <View style={styles.headerCopy}>
              <Text style={styles.pickerTitle}>Change demo user</Text>
              <Text style={styles.pickerSubtitle}>Select another account without keeping the list beside the editor.</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
              <MaterialIcons color={adminPalette.blue} name="close" size={22} />
            </Pressable>
          </View>
          <UserList
            cardActionLabel="Open editor"
            filter={filter}
            onFilterChange={onFilterChange}
            onSearchChange={onSearchChange}
            onSelect={onSelect}
            search={search}
            selectedUserId={selectedUserId}
            users={users}
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function DemoUserOverview({
  onPreview,
  onSectionChange,
  user,
}: {
  onPreview: () => void;
  onSectionChange: (section: EditorSection) => void;
  user: EditableUserDetail;
}) {
  const readinessItems = getReadinessItems(user);

  return (
    <EditorPanel title="Overview">
      <Notice icon="info">
        Use this overview to prepare the selected account for presentation. The checklist is guidance only and does not block saving.
      </Notice>
      <View style={styles.overviewGrid}>
        <DemoReadinessChecklist items={readinessItems} />
        <View style={styles.quickActionGrid}>
          <QuickActionCard icon="person" label="Edit profile" onPress={() => onSectionChange('profile')} />
          <QuickActionCard icon="work-outline" label="Manage jobs" onPress={() => onSectionChange('jobs')} />
          <QuickActionCard icon="handyman" label="Manage services" onPress={() => onSectionChange('services')} />
          <QuickActionCard icon="photo-library" label="Manage photos" onPress={() => onSectionChange('photos')} />
          <QuickActionCard icon="verified-user" label="Review verification" onPress={() => onSectionChange('verification')} />
          <QuickActionCard icon="visibility" label="Preview public profile" onPress={onPreview} />
        </View>
      </View>
      <LockedFields
        rows={[
          ['Selected account', user.fullName],
          ['Email', getRequiredEmailLabel(user)],
          ['Role/mode', user.roleLabel],
          ['Address summary', user.locationLabel],
          ['Verification', user.verificationLabel],
        ]}
      />
    </EditorPanel>
  );
}

function DemoReadinessChecklist({
  items,
}: {
  items: { complete: boolean; helper: string; label: string }[];
}) {
  return (
    <View style={styles.readinessCard}>
      <RecordHeader icon="assignment-turned-in" title="Demo readiness" subtitle="Non-blocking presentation checklist" />
      <View style={styles.readinessList}>
        {items.map((item) => (
          <View key={item.label} style={styles.readinessRow}>
            <MaterialIcons
              color={item.complete ? adminPalette.successDeep : adminPalette.faint}
              name={item.complete ? 'check-circle' : 'radio-button-unchecked'}
              size={20}
            />
            <View style={styles.flex}>
              <Text style={styles.readinessLabel}>{item.label}</Text>
              <Text style={styles.readinessHelper}>{item.helper}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function QuickActionCard({
  icon,
  label,
  onPress,
}: {
  icon: MaterialIconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.quickActionCard, pressed && styles.pressed]}>
      <View style={styles.quickActionIcon}>
        <MaterialIcons color={adminPalette.blue} name={icon} size={21} />
      </View>
      <Text style={styles.quickActionText}>{label}</Text>
    </Pressable>
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
  const [pendingImage, setPendingImage] = useState<PublicDemoImageAsset | null>(null);
  const [savingStage, setSavingStage] = useState<'profile' | 'photo-upload' | 'photo-save' | null>(null);
  const saveActiveRef = useRef(false);
  const { showErrorToast, showInfoToast, showSuccessToast } = useFeedback();
  const saving = Boolean(savingStage);

  useEffect(() => {
    setForm(user.profile);
    setPendingImage(null);
  }, [user.id, user.profile]);

  const chooseImage = async () => {
    if (saveActiveRef.current) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: ['image/jpeg', 'image/png', 'image/webp'],
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const nextImage = {
        mimeType: asset.mimeType ?? null,
        name: asset.name ?? null,
        size: asset.size ?? null,
        uri: asset.uri,
      };
      const validationError = getPublicImageValidationError(nextImage);
      if (validationError) {
        showErrorToast(validationError);
        return;
      }
      setPendingImage(nextImage);
      showInfoToast('Image selected. Press Save Profile to optimize, upload, and save it.');
    } catch {
      showErrorToast('Image selection failed. Try choosing the file again.');
    }
  };

  const save = async () => {
    if (saveActiveRef.current) return;

    saveActiveRef.current = true;
    setSavingStage('profile');
    showInfoToast('Saving profile details...');
    const result = await updateEditableProfile(user.id, {
      about: form.about,
      avatarUrl: form.avatarUrl,
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

    if (result.error || !result.data) {
      saveActiveRef.current = false;
      setSavingStage(null);
      showErrorToast(result.error ?? 'Profile details could not be saved.');
      return;
    }

    let savedProfile = result.data;
    if (pendingImage) {
      setSavingStage('photo-upload');
      showInfoToast('Optimizing and uploading profile photo...');
      const uploaded = await uploadPublicDemoImage(pendingImage, 'profile_photo');
      if (uploaded.error || !uploaded.data) {
        saveActiveRef.current = false;
        setSavingStage(null);
        showErrorToast(uploaded.error ?? 'Profile details were saved, but the photo upload failed.');
        await onSaved('Profile saved; photo upload failed');
        return;
      }

      setSavingStage('photo-save');
      showInfoToast('Saving the uploaded photo to the selected demo user...');
      const photoResult = await updateEditableProfile(user.id, { avatarUrl: uploaded.data });
      if (photoResult.error || !photoResult.data) {
        await cleanupPublicImageUrls([uploaded.data]);
        saveActiveRef.current = false;
        setSavingStage(null);
        showErrorToast(photoResult.error ?? 'The upload was removed because the profile photo URL could not be saved.');
        await onSaved('Profile saved; photo update failed');
        return;
      }
      savedProfile = photoResult.data;
    }

    setForm(savedProfile);
    setPendingImage(null);
    saveActiveRef.current = false;
    setSavingStage(null);
    showSuccessToast(pendingImage ? 'Profile photo uploaded and saved.' : 'Profile saved.');
    await onSaved('Profile saved');
  };

  const previewUrl = pendingImage?.uri || form.avatarUrl;

  return (
    <EditorPanel
      footer={
        <SaveButton
          disabled={saving}
          label={
            savingStage === 'photo-upload'
              ? 'Uploading photo...'
              : savingStage === 'photo-save'
                ? 'Saving photo...'
                : savingStage === 'profile'
                  ? 'Saving profile...'
                  : 'Save Profile'
          }
          onPress={() => void save()}
        />
      }
      hideHeader
      title="Profile">
      {user.verificationStatus === 'verified' ? (
        <InlineNotice tone="warning">
          Internal override: changing a verified name should only be used for demo/admin correction.
        </InlineNotice>
      ) : null}
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
        <Field label="Response expectation" onChangeText={(value) => setForm({ ...form, availability: value })} value={form.availability} />
        <SelectChips
          label="Preferred contact"
          onSelect={(value) => setForm({ ...form, preferredContactMethod: value })}
          options={CONTACT_OPTIONS}
          value={form.preferredContactMethod}
        />
      </TwoColumn>
      <View style={styles.compactPhotoBlock}>
        <View style={styles.photoEditorRow}>
          {previewUrl ? (
            <Image
              onError={() => showErrorToast('Profile photo preview failed. Try another image or check the pasted URL.')}
              source={{ uri: previewUrl }}
              style={styles.profilePreviewCompact}
            />
          ) : (
            <UserAvatar avatarUrl={null} name={form.fullName} size={58} />
          )}
          <View style={styles.flex}>
            <Text style={styles.lockedLabel}>Public profile photo</Text>
            <Text style={styles.helperText}>
              Use public images only. Uploads are compressed; pasted external URLs are saved as-is and are not compressed.
            </Text>
            {pendingImage ? <Text style={styles.helperText}>Selected image will be saved when you press Save Profile.</Text> : null}
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={chooseImage}
              style={({ pressed }) => [styles.secondaryButton, saving && styles.disabled, pressed && !saving && styles.pressed]}>
              <MaterialIcons color={adminPalette.blue} name="upload" size={18} />
              <Text style={styles.secondaryButtonText}>{savingStage === 'photo-upload' ? 'Uploading...' : 'Choose image'}</Text>
            </Pressable>
          </View>
        </View>
        <Field label="Public photo URL" onChangeText={(value) => setForm({ ...form, avatarUrl: value })} value={form.avatarUrl} />
      </View>
      <LockedFields
        rows={[
          ['Full name', form.fullName || user.fullName],
          ['Email', form.email || getRequiredEmailLabel(user)],
          ['Role/mode', user.roleLabel],
          ['Address', user.locationLabel],
          ['Verification status', user.verificationLabel],
          ['Auth/Profile ID', user.id],
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
      {user.jobDrafts.length ? (
        <View style={styles.draftList}>
          <Text style={styles.draftListTitle}>Private job drafts</Text>
          {user.jobDrafts.map((draft) => <JobDraftCard draft={draft} key={`${user.id}-job-draft-${draft.id}`} />)}
        </View>
      ) : null}
      {user.jobs.length ? (
        user.jobs.map((job) => <JobForm key={`${user.id}-job-${job.id}`} job={job} onSaved={onSaved} user={user} />)
      ) : (
        <EmptyBlock text={user.jobDrafts.length ? 'No published jobs found for this user.' : 'No jobs found for this user.'} />
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
  const [uploadedPhotoUrls, setUploadedPhotoUrls] = useState<string[]>([]);
  const { chooseAndUpload, showErrorToast, uploadingPhoto } = usePublicImageUpload('job_photo', 'Job photo');
  const serviceOptions = getServicesForMvpCategory(form.category);

  useEffect(() => {
    setForm(makeInitialJobPayload(user));
    setUploadedPhotoUrls([]);
  }, [user]);

  const addPhoto = async () => {
    const uploaded = await chooseAndUpload();
    if (uploaded) {
      setUploadedPhotoUrls((current) => [...current, uploaded]);
      setForm((current) => ({ ...current, photoUrls: [...(current.photoUrls ?? []), uploaded] }));
    }
  };

  const save = async () => {
    if (uploadingPhoto) {
      showErrorToast('Wait for the job photo upload to finish before saving.');
      return;
    }

    setSaving(true);
    const result = await createEditableJob(user.id, form);
    if (result.error || !result.data) {
      await cleanupPublicImageUrls(uploadedPhotoUrls);
      setForm((current) => ({
        ...current,
        photoUrls: (current.photoUrls ?? []).filter((url) => !uploadedPhotoUrls.includes(url)),
      }));
      setUploadedPhotoUrls([]);
      setSaving(false);
      showErrorToast(result.error ?? 'Could not create this job.');
      return;
    }
    await cleanupPublicImageUrls(uploadedPhotoUrls.filter((url) => !(form.photoUrls ?? []).includes(url)));
    setUploadedPhotoUrls([]);
    setSaving(false);
    await onSaved(result.data.kind === 'draft' ? 'Job saved as draft' : 'Job created');
  };

  const cancel = async () => {
    await cleanupPublicImageUrls(uploadedPhotoUrls);
    setUploadedPhotoUrls([]);
    onCancel();
  };

  return (
    <View style={styles.recordCard}>
      <RecordHeader icon="add-business" title="New job listing" subtitle="Create a public job for this selected resident" />
      {user.verificationStatus !== 'verified' ? (
        <InlineNotice tone="warning">This user is not verified. New jobs are saved as private drafts instead of public listings.</InlineNotice>
      ) : null}
      <Field label="Title" onChangeText={(value) => setForm({ ...form, title: value })} value={form.title} />
      <Field label="Description" multiline onChangeText={(value) => setForm({ ...form, description: value })} value={form.description} />
      <TwoColumn>
        <SelectChips label="Category" onSelect={(value) => setForm({ ...form, category: value, serviceNeeded: '' })} options={[...MVP_SERVICE_CATEGORIES]} value={form.category} />
        <SelectChips label="Service needed" onSelect={(value) => setForm({ ...form, serviceNeeded: value })} options={serviceOptions.length ? serviceOptions : [...MVP_SERVICE_OPTIONS]} value={form.serviceNeeded} />
      </TwoColumn>
      <TwoColumn>
        <Field label="Barangay" onChangeText={(value) => setForm({ ...form, barangay: value })} value={form.barangay ?? ''} />
        <Field label="Public location text" onChangeText={(value) => setForm({ ...form, locationText: value })} value={form.locationText ?? ''} />
      </TwoColumn>
      <TwoColumn>
        {user.verificationStatus === 'verified' ? (
          <SelectChips label="Status" onSelect={(value) => setForm({ ...form, status: value as JobStatus })} options={getEditableJobStatuses()} value={form.status} />
        ) : (
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Status</Text>
            <InfoLine label="Save target" value="Private draft" />
          </View>
        )}
      </TwoColumn>
      <JobListingFields
        form={form}
        onChange={(patch) =>
          setForm({
            ...form,
            ...patch,
            certificationNote: patch.certificationNote ?? form.certificationNote,
            scheduleText: patch.scheduleText ?? form.scheduleText,
          })
        }
      />
      <RateFields
        max={form.budgetMax ?? null}
        min={form.budgetMin ?? null}
        onMax={(value) => setForm({ ...form, budgetMax: value })}
        onMin={(value) => setForm({ ...form, budgetMin: value })}
        onRateType={(value) => setForm({ ...form, rateType: value })}
        rateType={form.rateType}
      />
      <PhotoUrlEditor
        addLabel={uploadingPhoto ? 'Uploading...' : 'Add job photo'}
        disabled={saving || uploadingPhoto}
        onAdd={() => void addPhoto()}
        onChange={(photoUrls) => setForm({ ...form, photoUrls })}
        onPreviewError={showErrorToast}
        photoUrls={form.photoUrls ?? []}
        stablePrefix={`${user.id}-new-job`}
      />
      <View style={styles.actionRow}>
        <SaveButton disabled={saving || uploadingPhoto} label={saving ? 'Creating...' : 'Create Job'} onPress={() => void save()} />
        <Pressable accessibilityRole="button" disabled={saving || uploadingPhoto} onPress={() => void cancel()} style={({ pressed }) => [styles.secondaryButton, (saving || uploadingPhoto) && styles.disabled, pressed && !saving && !uploadingPhoto && styles.pressed]}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

function JobDraftCard({ draft }: { draft: EditableJobDraft }) {
  return (
    <View style={styles.recordCard}>
      <RecordHeader icon="edit" title={draft.title || 'Untitled job draft'} subtitle={`Private draft - ${formatDate(draft.updatedAt)}`} />
      <InfoLine label="Service needed" value={draft.serviceNeeded || draft.category || 'Not set'} />
      <InfoLine label="Location" value={draft.locationText || draft.barangay || 'Not set'} />
      <InfoLine label="Budget" value={formatRange(draft.budgetMin, draft.budgetMax, draft.rateType)} />
      {draft.description ? <Text style={styles.draftDescription}>{draft.description}</Text> : null}
      <InlineNotice tone="warning">Drafts are private and will not appear in public discovery until the resident is verified and publishes a job.</InlineNotice>
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
  const [uploadedPhotoUrls, setUploadedPhotoUrls] = useState<string[]>([]);
  const { chooseAndUpload, showErrorToast, uploadingPhoto } = usePublicImageUpload('job_photo', 'Job photo');
  const serviceOptions = getServicesForMvpCategory(form.category);

  useEffect(() => {
    setForm(job);
    setUploadedPhotoUrls([]);
  }, [job]);

  const addPhoto = async () => {
    const uploaded = await chooseAndUpload();
    if (uploaded) {
      setUploadedPhotoUrls((current) => [...current, uploaded]);
      setForm((current) => ({ ...current, photoUrls: [...current.photoUrls, uploaded] }));
    }
  };

  const save = async () => {
    if (uploadingPhoto) {
      showErrorToast('Wait for the job photo upload to finish before saving.');
      return;
    }

    setSaving(true);
    const result = await updateEditableJob(job.id, form);
    if (result.error || !result.data) {
      await cleanupPublicImageUrls(uploadedPhotoUrls);
      setForm((current) => ({
        ...current,
        photoUrls: current.photoUrls.filter((url) => !uploadedPhotoUrls.includes(url)),
      }));
      setUploadedPhotoUrls([]);
      setSaving(false);
      showErrorToast(result.error ?? 'Could not save this job.');
      return;
    }
    await cleanupPublicImageUrls(uploadedPhotoUrls.filter((url) => !form.photoUrls.includes(url)));
    setUploadedPhotoUrls([]);
    setSaving(false);
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

  const confirmDeactivate = () => {
    Alert.alert('Deactivate this job?', 'This hides the job from public discovery. You can reactivate it later by changing its status.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Deactivate', style: 'destructive', onPress: () => void deactivate() },
    ]);
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
        <Field label="Barangay" onChangeText={(value) => setForm({ ...form, barangay: value })} value={form.barangay} />
        <Field label="Public location text" onChangeText={(value) => setForm({ ...form, locationText: value })} value={form.locationText} />
      </TwoColumn>
      <TwoColumn>
        <SelectChips label="Status" onSelect={(value) => setForm({ ...form, status: value as JobStatus })} options={getEditableJobStatuses()} value={form.status} />
      </TwoColumn>
      <JobListingFields
        form={form}
        onChange={(patch) =>
          setForm({
            ...form,
            ...patch,
            certificationNote: patch.certificationNote ?? form.certificationNote,
            scheduleText: patch.scheduleText ?? form.scheduleText,
          })
        }
      />
      <RateFields
        max={form.budgetMax}
        min={form.budgetMin}
        onMax={(value) => setForm({ ...form, budgetMax: value })}
        onMin={(value) => setForm({ ...form, budgetMin: value })}
        onRateType={(value) => setForm({ ...form, rateType: value })}
        rateType={form.rateType}
      />
      <PhotoUrlEditor
        addLabel={uploadingPhoto ? 'Uploading...' : 'Add job photo'}
        disabled={saving || uploadingPhoto}
        onAdd={() => void addPhoto()}
        onChange={(photoUrls) => setForm({ ...form, photoUrls })}
        onPreviewError={showErrorToast}
        photoUrls={form.photoUrls}
        stablePrefix={`${user.id}-job-${job.id}`}
      />
      <View style={styles.actionRow}>
        <SaveButton disabled={saving || uploadingPhoto} label={saving ? 'Saving...' : 'Save Job'} onPress={() => void save()} />
        <Pressable accessibilityRole="button" disabled={saving || uploadingPhoto} onPress={confirmDeactivate} style={({ pressed }) => [styles.dangerButton, (saving || uploadingPhoto) && styles.disabled, pressed && !saving && !uploadingPhoto && styles.pressed]}>
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
  const [uploadedPhotoUrls, setUploadedPhotoUrls] = useState<string[]>([]);
  const { chooseAndUpload, showErrorToast, uploadingPhoto } = usePublicImageUpload('service_photo', 'Service photo');

  useEffect(() => {
    setForm(makeInitialServicePayload(user));
    setUploadedPhotoUrls([]);
  }, [user]);

  const addPhoto = async () => {
    const uploaded = await chooseAndUpload();
    if (uploaded) {
      setUploadedPhotoUrls((current) => [...current, uploaded]);
      setForm((current) => ({ ...current, photoUrls: [...(current.photoUrls ?? []), uploaded] }));
    }
  };

  const save = async () => {
    if (uploadingPhoto) {
      showErrorToast('Wait for the service photo upload to finish before saving.');
      return;
    }

    setSaving(true);
    const result = await createEditableService(user.id, form);
    if (result.error || !result.data) {
      await cleanupPublicImageUrls(uploadedPhotoUrls);
      setForm((current) => ({
        ...current,
        photoUrls: (current.photoUrls ?? []).filter((url) => !uploadedPhotoUrls.includes(url)),
      }));
      setUploadedPhotoUrls([]);
      setSaving(false);
      showErrorToast(result.error ?? 'Could not create this service.');
      return;
    }
    await cleanupPublicImageUrls(uploadedPhotoUrls.filter((url) => !(form.photoUrls ?? []).includes(url)));
    setUploadedPhotoUrls([]);
    setSaving(false);
    await onSaved(user.verificationStatus === 'verified' ? 'Service created' : 'Service saved inactive');
  };

  const cancel = async () => {
    await cleanupPublicImageUrls(uploadedPhotoUrls);
    setUploadedPhotoUrls([]);
    onCancel();
  };

  return (
    <View style={styles.recordCard}>
      <RecordHeader icon="add-business" title="New service listing" subtitle="Create a public service for this selected resident" />
      {user.verificationStatus !== 'verified' ? (
        <InlineNotice tone="warning">This user is not verified. New services are saved inactive until verification is approved.</InlineNotice>
      ) : null}
      <Field label="Title" onChangeText={(value) => setForm({ ...form, title: value })} value={form.title} />
      <Field label="Description" multiline onChangeText={(value) => setForm({ ...form, description: value })} value={form.description} />
      <TwoColumn>
        <SelectChips label="Category" onSelect={(value) => setForm({ ...form, category: value })} options={[...MVP_SERVICE_OPTIONS]} value={form.category} />
        {user.verificationStatus === 'verified' ? (
          <SelectChips label="Status" onSelect={(value) => setForm({ ...form, isActive: value === 'active' })} options={['active', 'inactive']} value={form.isActive ? 'active' : 'inactive'} />
        ) : (
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Status</Text>
            <InfoLine label="Save target" value="Inactive service" />
          </View>
        )}
      </TwoColumn>
      <TwoColumn>
        <Field label="Barangay" onChangeText={(value) => setForm({ ...form, barangay: value })} value={form.barangay ?? ''} />
        <Field label="Public location text" onChangeText={(value) => setForm({ ...form, locationText: value })} value={form.locationText ?? ''} />
      </TwoColumn>
      <ServiceListingFields
        form={form}
        onChange={(patch) =>
          setForm({
            ...form,
            ...patch,
            availabilityText: patch.availabilityText ?? form.availabilityText,
            certificationNote: patch.certificationNote ?? form.certificationNote,
          })
        }
      />
      <RateFields
        max={form.rateMax ?? null}
        min={form.rateMin ?? null}
        onMax={(value) => setForm({ ...form, rateMax: value })}
        onMin={(value) => setForm({ ...form, rateMin: value })}
        onRateType={(value) => setForm({ ...form, rateType: value })}
        rateType={form.rateType}
      />
      <PhotoUrlEditor
        addLabel={uploadingPhoto ? 'Uploading...' : 'Add service photo'}
        disabled={saving || uploadingPhoto}
        onAdd={() => void addPhoto()}
        onChange={(photoUrls) => setForm({ ...form, photoUrls })}
        onPreviewError={showErrorToast}
        photoUrls={form.photoUrls ?? []}
        stablePrefix={`${user.id}-new-service`}
      />
      <View style={styles.actionRow}>
        <SaveButton disabled={saving || uploadingPhoto} label={saving ? 'Creating...' : 'Create Service'} onPress={() => void save()} />
        <Pressable accessibilityRole="button" disabled={saving || uploadingPhoto} onPress={() => void cancel()} style={({ pressed }) => [styles.secondaryButton, (saving || uploadingPhoto) && styles.disabled, pressed && !saving && !uploadingPhoto && styles.pressed]}>
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
  const [uploadedPhotoUrls, setUploadedPhotoUrls] = useState<string[]>([]);
  const { chooseAndUpload, showErrorToast, uploadingPhoto } = usePublicImageUpload('service_photo', 'Service photo');

  useEffect(() => {
    setForm(service);
    setUploadedPhotoUrls([]);
  }, [service]);

  const addPhoto = async () => {
    const uploaded = await chooseAndUpload();
    if (uploaded) {
      setUploadedPhotoUrls((current) => [...current, uploaded]);
      setForm((current) => ({ ...current, photoUrls: [...current.photoUrls, uploaded] }));
    }
  };

  const save = async () => {
    if (uploadingPhoto) {
      showErrorToast('Wait for the service photo upload to finish before saving.');
      return;
    }

    setSaving(true);
    const result = await updateEditableService(service.id, form);
    if (result.error || !result.data) {
      await cleanupPublicImageUrls(uploadedPhotoUrls);
      setForm((current) => ({
        ...current,
        photoUrls: current.photoUrls.filter((url) => !uploadedPhotoUrls.includes(url)),
      }));
      setUploadedPhotoUrls([]);
      setSaving(false);
      showErrorToast(result.error ?? 'Could not save this service.');
      return;
    }
    await cleanupPublicImageUrls(uploadedPhotoUrls.filter((url) => !form.photoUrls.includes(url)));
    setUploadedPhotoUrls([]);
    setSaving(false);
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

  const confirmDeactivate = () => {
    Alert.alert('Deactivate this service?', 'This hides the service from public discovery. You can reactivate it later from this editor.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Deactivate', style: 'destructive', onPress: () => void deactivate() },
    ]);
  };

  return (
    <View style={styles.recordCard}>
      <RecordHeader icon="handyman" title={service.title || 'Service listing'} subtitle={`${service.isActive ? 'Active' : 'Inactive'} · ${formatDate(service.updatedAt)}`} />
      {user.verificationStatus !== 'verified' ? (
        <InlineNotice tone="warning">This user is not verified. Saving keeps this service inactive until verification is approved.</InlineNotice>
      ) : null}
      <Field label="Title" onChangeText={(value) => setForm({ ...form, title: value })} value={form.title} />
      <Field label="Description" multiline onChangeText={(value) => setForm({ ...form, description: value })} value={form.description} />
      <TwoColumn>
        <SelectChips label="Category" onSelect={(value) => setForm({ ...form, category: value })} options={[...MVP_SERVICE_OPTIONS]} value={form.category} />
        {user.verificationStatus === 'verified' ? (
          <SelectChips label="Status" onSelect={(value) => setForm({ ...form, isActive: value === 'active' })} options={['active', 'inactive']} value={form.isActive ? 'active' : 'inactive'} />
        ) : (
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Status</Text>
            <InfoLine label="Save target" value="Inactive service" />
          </View>
        )}
      </TwoColumn>
      <TwoColumn>
        <Field label="Barangay" onChangeText={(value) => setForm({ ...form, barangay: value })} value={form.barangay} />
        <Field label="Public location text" onChangeText={(value) => setForm({ ...form, locationText: value })} value={form.locationText} />
      </TwoColumn>
      <ServiceListingFields
        form={form}
        onChange={(patch) =>
          setForm({
            ...form,
            ...patch,
            availabilityText: patch.availabilityText ?? form.availabilityText,
            certificationNote: patch.certificationNote ?? form.certificationNote,
          })
        }
      />
      <RateFields
        max={form.rateMax}
        min={form.rateMin}
        onMax={(value) => setForm({ ...form, rateMax: value })}
        onMin={(value) => setForm({ ...form, rateMin: value })}
        onRateType={(value) => setForm({ ...form, rateType: value })}
        rateType={form.rateType}
      />
      <PhotoUrlEditor
        addLabel={uploadingPhoto ? 'Uploading...' : 'Add service photo'}
        disabled={saving || uploadingPhoto}
        onAdd={() => void addPhoto()}
        onChange={(photoUrls) => setForm({ ...form, photoUrls })}
        onPreviewError={showErrorToast}
        photoUrls={form.photoUrls}
        stablePrefix={`${user.id}-service-${service.id}`}
      />
      <View style={styles.actionRow}>
        <SaveButton disabled={saving || uploadingPhoto} label={saving ? 'Saving...' : 'Save Service'} onPress={() => void save()} />
        <Pressable accessibilityRole="button" disabled={saving || uploadingPhoto} onPress={confirmDeactivate} style={({ pressed }) => [styles.dangerButton, (saving || uploadingPhoto) && styles.disabled, pressed && !saving && !uploadingPhoto && styles.pressed]}>
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
  const [moderatingId, setModeratingId] = useState<string | null>(null);
  const [photoStatuses, setPhotoStatuses] = useState<Record<string, string>>({});
  const photos: PublicPhotoModerationItem[] = [
    ...(user.profile.avatarUrl
      ? [{
          id: `${user.id}-profile-photo`,
          ownerId: user.id,
          source: 'Profile photo',
          sourceId: user.id,
          sourceType: 'profile_photo' as const,
          title: user.fullName,
          url: user.profile.avatarUrl,
        }]
      : []),
    ...user.jobs.flatMap((job) =>
      job.photoUrls.map((url, index) => ({
        id: `${user.id}-photo-job-${job.id}-${index}`,
        ownerId: job.ownerId,
        source: 'Job photo',
        sourceId: job.id,
        sourceType: 'job_photo' as const,
        title: job.title,
        url,
      })),
    ),
    ...user.services.flatMap((service) =>
      service.photoUrls.map((url, index) => ({
        id: `${user.id}-photo-service-${service.id}-${index}`,
        ownerId: service.providerId,
        source: 'Service photo',
        sourceId: service.id,
        sourceType: 'service_photo' as const,
        title: service.title,
        url,
      })),
    ),
  ];

  useEffect(() => {
    setModeratingId(null);
    setPhotoStatuses({});
  }, [user.id]);

  const moderate = async (photo: PublicPhotoModerationItem, action: EditablePublicPhotoAction) => {
    setModeratingId(`${photo.id}-${action}`);
    const result = await moderateEditablePublicPhoto({
      action,
      note: 'Updated from internal demo editor.',
      photo: {
        imageUrl: photo.url,
        ownerId: photo.ownerId,
        sourceId: photo.sourceId,
        sourceType: photo.sourceType,
      },
      reason: action === 'clear' ? null : 'Internal demo audit public photo review',
    });
    setModeratingId(null);

    if (result.error || !result.data) {
      Alert.alert('Public photo review', result.error ?? 'Could not save this photo review.');
      return;
    }

    setPhotoStatuses((current) => ({ ...current, [photo.id]: result.data.action }));
    Alert.alert('Public photo review', `${formatStatus(result.data.action)} saved.`);
  };

  return (
    <EditorPanel title="Public Photos Preview">
      <Notice icon="visibility">
        This section shows only public profile, job, and service photos. Use Hide, Flag, or Clear for public-photo moderation.
      </Notice>
      {photos.length ? (
        <View style={styles.photoGrid}>
          {photos.map((photo) => (
            <View key={photo.id} style={styles.publicPhotoCard}>
              <Image source={{ uri: photo.url }} style={styles.publicPhotoImage} />
              <Text style={styles.publicPhotoSource}>{photo.source}</Text>
              <Text numberOfLines={2} style={styles.publicPhotoTitle}>{photo.title}</Text>
              {photoStatuses[photo.id] ? <Text style={styles.publicPhotoStatus}>{formatStatus(photoStatuses[photo.id])}</Text> : null}
              <View style={styles.photoActionRow}>
                {(['hide', 'flag', 'clear'] as const).map((action) => {
                  const busy = moderatingId === `${photo.id}-${action}`;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      disabled={Boolean(moderatingId)}
                      key={`${photo.id}-${action}`}
                      onPress={() => void moderate(photo, action)}
                      style={({ pressed }) => [
                        action === 'hide' ? styles.dangerButtonCompact : styles.secondaryButtonCompact,
                        busy && styles.disabled,
                        pressed && !moderatingId && styles.pressed,
                      ]}>
                      <Text style={action === 'hide' ? styles.dangerButtonCompactText : styles.secondaryButtonText}>
                        {busy ? 'Saving' : formatStatus(action)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
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
  const [conversations, setConversations] = useState<EditableConversationSummary[]>(user.conversations);
  const [reports, setReports] = useState<EditableReportSummary[]>(user.reports);
  const [savingActivityId, setSavingActivityId] = useState<string | null>(null);

  useEffect(() => {
    setConversations(user.conversations);
    setReports(user.reports);
    setSavingActivityId(null);
  }, [user.id, user.conversations, user.reports]);

  const saveConversationStatus = async (conversation: EditableConversationSummary, status: string) => {
    if (conversation.status === status) return;
    setSavingActivityId(`conversation-${conversation.id}`);
    const result = await updateEditableConversationStatus(conversation.id, status);
    setSavingActivityId(null);
    if (result.error || !result.data) {
      Alert.alert('Conversation status', result.error ?? 'Could not update this conversation.');
      return;
    }
    setConversations((current) =>
      current.map((item) =>
        item.id === conversation.id
          ? { ...item, status: result.data.status, updatedAt: result.data.updatedAt, messageCount: item.messageCount }
          : item,
      ),
    );
  };

  const saveReportStatus = async (report: EditableReportSummary, status: string) => {
    if (report.status === status) return;
    setSavingActivityId(`report-${report.id}`);
    const result = await updateEditableReportStatus(report.id, status);
    setSavingActivityId(null);
    if (result.error || !result.data) {
      Alert.alert('Report status', result.error ?? 'Could not update this report.');
      return;
    }
    setReports((current) => current.map((item) => (item.id === report.id ? result.data : item)));
  };

  return (
    <EditorPanel title="Conversations, Reviews, and Reports">
      <Notice icon="info">
        Conversation messages and review text stay read-only. Status fields can be corrected for demo cleanup.
      </Notice>
      <ActivityBlock count={conversations.length} icon="forum" title="Conversations">
        {conversations.slice(0, 8).map((item) => (
          <View key={`conversation-${item.id}`} style={styles.activityRow}>
            <View style={styles.activityMain}>
              <Text style={styles.activityTitle}>{formatStatus(item.status)}</Text>
              <Text style={styles.activityMeta}>{item.messageCount} messages - {formatDate(item.updatedAt)}</Text>
            </View>
            <View style={styles.activityStatusControl}>
              <SelectChips
                label={savingActivityId === `conversation-${item.id}` ? 'Saving status' : 'Status'}
                onSelect={(value) => void saveConversationStatus(item, value)}
                options={getEditableConversationStatuses()}
                value={item.status}
              />
            </View>
          </View>
        ))}
      </ActivityBlock>
      <ActivityBlock count={user.reviews.length} icon="star-rate" title="Reviews/Ratings">
        {user.reviews.slice(0, 8).map((item) => (
          <InfoLine key={`review-${item.id}`} label={`${item.rating}/5`} value={item.comment || `Job ${item.jobId.slice(0, 8)}`} />
        ))}
      </ActivityBlock>
      <ActivityBlock count={reports.length} icon="flag" title="Reports">
        {reports.slice(0, 8).map((item) => (
          <View key={`report-${item.id}`} style={styles.activityRow}>
            <View style={styles.activityMain}>
              <Text style={styles.activityTitle}>{formatStatus(item.status)}</Text>
              <Text style={styles.activityMeta}>{item.reason || 'No reason'} - {formatDate(item.createdAt)}</Text>
            </View>
            <View style={styles.activityStatusControl}>
              <SelectChips
                label={savingActivityId === `report-${item.id}` ? 'Saving status' : 'Status'}
                onSelect={(value) => void saveReportStatus(item, value)}
                options={getEditableReportStatuses()}
                value={item.status}
              />
            </View>
          </View>
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
    allowMessages: true,
    autoCloseEnabled: false,
    autoReplyEnabled: false,
    barangay: location,
    budgetMax: 800,
    budgetMin: 400,
    budgetNegotiable: false,
    category,
    certificationRequired: false,
    description: '',
    experienceLevel: 'any',
    locationText: location,
    photoUrls: [],
    rateType: 'per_service',
    serviceNeeded,
    status: user.verificationStatus === 'verified' ? 'open' : 'cancelled',
    tags: [],
    title: '',
    workersNeeded: 1,
  };
}

function makeInitialServicePayload(user: EditableUserDetail): CreateEditableServicePayload {
  const category = MVP_SERVICE_OPTIONS[0] ?? 'Cleaning';
  const location = user.profile.barangay || user.locationLabel || 'Barangay San Pedro';

  return {
    allowMessages: true,
    autoPauseEnabled: false,
    autoReplyEnabled: false,
    barangay: location,
    category,
    certificationAvailable: false,
    description: '',
    experienceLevel: 'any',
    isActive: user.verificationStatus === 'verified',
    locationText: location,
    photoUrls: [],
    rateMax: 800,
    rateMin: 400,
    rateNegotiable: false,
    rateType: 'per_service',
    tags: [],
    title: '',
    yearsExperience: null,
  };
}

function getReadinessItems(user: EditableUserDetail) {
  const profileBasicsComplete = Boolean(user.profile.fullName && (user.profile.barangay || user.profile.city) && user.profile.about);
  const photoPresent = Boolean(user.profile.avatarUrl);
  const hasJobOrService = user.jobs.length + user.jobDrafts.length + user.services.length > 0;
  const verificationIntentional = user.verificationStatus === 'verified' || user.verificationStatus === 'pending' || user.verifications.length > 0;
  const previewReady = photoPresent && hasJobOrService && profileBasicsComplete;

  return [
    {
      complete: profileBasicsComplete,
      helper: profileBasicsComplete ? 'Name, location, and profile copy are present.' : 'Add name, location, and a short bio.',
      label: 'Profile basics complete',
    },
    {
      complete: photoPresent,
      helper: photoPresent ? 'A public avatar is set.' : 'Add a public photo that is not an ID or verification file.',
      label: 'Public photo/avatar present',
    },
    {
      complete: hasJobOrService,
      helper: hasJobOrService ? 'This account has marketplace content prepared.' : 'Create at least one job, draft, or service.',
      label: 'Has at least one job or service',
    },
    {
      complete: verificationIntentional,
      helper: verificationIntentional ? `Current state: ${user.verificationLabel}.` : 'Review whether this demo user should be pending, verified, or unverified.',
      label: 'Verification status set intentionally',
    },
    {
      complete: previewReady,
      helper: previewReady ? 'Ready for a public preview pass.' : 'Open the public profile after the basics and content are in place.',
      label: 'Public preview reviewed',
    },
  ];
}

type PublicPhotoUploadAttempt =
  | { status: 'cancelled' }
  | { message: string; status: 'error' }
  | { status: 'success'; url: string };

function usePublicImageUpload(target: 'job_photo' | 'service_photo', label: string) {
  const { showErrorToast, showInfoToast, showSuccessToast } = useFeedback();
  const uploadActiveRef = useRef(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const chooseAndUpload = async () => {
    if (uploadActiveRef.current) return null;

    uploadActiveRef.current = true;
    setUploadingPhoto(true);
    showInfoToast(`Optimizing and uploading ${label.toLowerCase()}...`);
    const attempt = await chooseAndUploadPublicImage(target);
    uploadActiveRef.current = false;
    setUploadingPhoto(false);

    if (attempt.status === 'error') {
      showErrorToast(attempt.message);
      return null;
    }
    if (attempt.status === 'cancelled') return null;

    showSuccessToast(`${label} uploaded. Press Save below to keep it on this record.`);
    return attempt.url;
  };

  return { chooseAndUpload, showErrorToast, uploadingPhoto };
}

async function chooseAndUploadPublicImage(
  target: 'job_photo' | 'service_photo',
): Promise<PublicPhotoUploadAttempt> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ['image/jpeg', 'image/png', 'image/webp'],
    });
    if (result.canceled || !result.assets?.[0]) return { status: 'cancelled' };
    const asset = result.assets[0];
    const uploaded = await uploadPublicDemoImage({
      mimeType: asset.mimeType ?? null,
      name: asset.name ?? null,
      size: asset.size ?? null,
      uri: asset.uri,
    }, target);
    if (uploaded.error || !uploaded.data) {
      return { message: uploaded.error ?? 'Could not upload this photo.', status: 'error' };
    }
    return { status: 'success', url: uploaded.data };
  } catch {
    return { message: 'Image selection failed. Try choosing the file again.', status: 'error' };
  }
}

async function cleanupPublicImageUrls(urls: string[]) {
  const uniqueUrls = Array.from(new Set(urls.filter(Boolean)));
  await Promise.all(uniqueUrls.map((url) => removePublicDemoImage(url)));
}

function PhotoUrlEditor({
  addLabel,
  disabled = false,
  onAdd,
  onChange,
  onPreviewError,
  photoUrls,
  stablePrefix,
}: {
  addLabel: string;
  disabled?: boolean;
  onAdd: () => void;
  onChange: (urls: string[]) => void;
  onPreviewError?: (message: string) => void;
  photoUrls: string[];
  stablePrefix: string;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>Public photos</Text>
      <Text style={styles.helperText}>
        Uploaded files are optimized and staged in this form. Press Save below to keep record changes. Pasted external URLs
        are saved as-is and are not compressed.
      </Text>
      <View style={styles.photoStrip}>
        {photoUrls.map((url, index) => (
          <View key={`${stablePrefix}-photo-${index}`} style={styles.photoUrlTile}>
            <Image
              onError={() => onPreviewError?.('Photo preview failed. Check the pasted URL or upload the image again.')}
              source={{ uri: url }}
              style={styles.photoUrlImage}
            />
            <Pressable
              accessibilityLabel={`Remove photo ${index + 1}`}
              accessibilityRole="button"
              onPress={() => onChange(photoUrls.filter((_, itemIndex) => itemIndex !== index))}
              style={styles.removePhotoButton}>
              <MaterialIcons color={color.white} name="close" size={14} />
            </Pressable>
          </View>
        ))}
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={onAdd}
          style={({ pressed }) => [styles.addPhotoTile, disabled && styles.disabled, pressed && !disabled && styles.pressed]}>
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

function JobListingFields({
  form,
  onChange,
}: {
  form: CreateEditableJobPayload | EditableJob;
  onChange: (patch: JobListingFieldsPatch) => void;
}) {
  return (
    <>
      <TextListField label="Tags (up to 4, one per line)" onChange={(tags) => onChange({ tags })} values={form.tags} />
      <TwoColumn>
        <Field label="Schedule" onChangeText={(scheduleText) => onChange({ scheduleText })} value={form.scheduleText ?? ''} />
        <Field keyboardType="numeric" label="Workers needed" onChangeText={(value) => onChange({ workersNeeded: parseAmount(value) })} value={form.workersNeeded ? String(form.workersNeeded) : ''} />
      </TwoColumn>
      <TwoColumn>
        <SelectChips label="Experience level" onSelect={(experienceLevel) => onChange({ experienceLevel })} options={EXPERIENCE_LEVEL_OPTIONS} value={form.experienceLevel} />
        <BooleanChips label="Budget negotiable" onSelect={(budgetNegotiable) => onChange({ budgetNegotiable })} value={form.budgetNegotiable} />
      </TwoColumn>
      <TwoColumn>
        <BooleanChips label="Certification preferred" onSelect={(certificationRequired) => onChange({ certificationRequired })} value={form.certificationRequired} />
        <Field label="Certification note" onChangeText={(certificationNote) => onChange({ certificationNote })} value={form.certificationNote ?? ''} />
      </TwoColumn>
      <TwoColumn>
        <BooleanChips label="Allow messages" onSelect={(allowMessages) => onChange({ allowMessages })} value={form.allowMessages} />
        <BooleanChips label="Auto reply" onSelect={(autoReplyEnabled) => onChange({ autoReplyEnabled })} value={form.autoReplyEnabled} />
        <BooleanChips label="Auto close" onSelect={(autoCloseEnabled) => onChange({ autoCloseEnabled })} value={form.autoCloseEnabled} />
      </TwoColumn>
    </>
  );
}

function ServiceListingFields({
  form,
  onChange,
}: {
  form: CreateEditableServicePayload | EditableService;
  onChange: (patch: ServiceListingFieldsPatch) => void;
}) {
  return (
    <>
      <TextListField label="Tags (up to 4, one per line)" onChange={(tags) => onChange({ tags })} values={form.tags} />
      <TwoColumn>
        <Field label="Availability" onChangeText={(availabilityText) => onChange({ availabilityText })} value={form.availabilityText ?? ''} />
        <Field keyboardType="numeric" label="Years of experience" onChangeText={(value) => onChange({ yearsExperience: parseAmount(value) })} value={form.yearsExperience ? String(form.yearsExperience) : ''} />
      </TwoColumn>
      <TwoColumn>
        <SelectChips label="Experience level" onSelect={(experienceLevel) => onChange({ experienceLevel })} options={EXPERIENCE_LEVEL_OPTIONS} value={form.experienceLevel} />
        <BooleanChips label="Rate negotiable" onSelect={(rateNegotiable) => onChange({ rateNegotiable })} value={form.rateNegotiable} />
      </TwoColumn>
      <TwoColumn>
        <BooleanChips label="Certification available" onSelect={(certificationAvailable) => onChange({ certificationAvailable })} value={form.certificationAvailable} />
        <Field label="Certification note" onChangeText={(certificationNote) => onChange({ certificationNote })} value={form.certificationNote ?? ''} />
      </TwoColumn>
      <TwoColumn>
        <BooleanChips label="Allow messages" onSelect={(allowMessages) => onChange({ allowMessages })} value={form.allowMessages} />
        <BooleanChips label="Auto reply" onSelect={(autoReplyEnabled) => onChange({ autoReplyEnabled })} value={form.autoReplyEnabled} />
        <BooleanChips label="Auto pause" onSelect={(autoPauseEnabled) => onChange({ autoPauseEnabled })} value={form.autoPauseEnabled} />
      </TwoColumn>
    </>
  );
}

function BooleanChips({
  label,
  onSelect,
  value,
}: {
  label: string;
  onSelect: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <SelectChips
      label={label}
      onSelect={(nextValue) => onSelect(nextValue === 'yes')}
      options={['yes', 'no']}
      value={value ? 'yes' : 'no'}
    />
  );
}

function TextListField({
  label,
  onChange,
  values,
}: {
  label: string;
  onChange: (values: string[]) => void;
  values: string[];
}) {
  return (
    <Field
      label={label}
      multiline
      onChangeText={(value) => onChange(value.split('\n').map((item) => item.trim()).filter(Boolean).slice(0, 4))}
      value={values.join('\n')}
    />
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
  hideHeader,
  title,
}: {
  children: ReactNode;
  footer?: ReactNode;
  hideHeader?: boolean;
  title: string;
}) {
  return (
    <View style={styles.editorPanel}>
      {hideHeader ? null : (
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>{title}</Text>
        </View>
      )}
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

function formatRange(min: number | null, max: number | null, rateType: RateType) {
  if (min == null && max == null) return 'Not set';
  const prefix = 'PHP';
  if (min != null && max != null) return `${prefix} ${min.toLocaleString()}-${max.toLocaleString()} ${formatOption(rateType).toLowerCase()}`;
  if (min != null) return `${prefix} ${min.toLocaleString()}+ ${formatOption(rateType).toLowerCase()}`;
  return `Up to ${prefix} ${max?.toLocaleString()} ${formatOption(rateType).toLowerCase()}`;
}

function getRequiredEmailLabel(user: EditableUserDetail) {
  return user.profile.email || 'Missing email in profile row';
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
  contextBar: {
    alignItems: 'center',
    backgroundColor: adminPalette.blue,
    borderBottomColor: adminPalette.blueDeep,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    height: 44,
    paddingHorizontal: 14,
    paddingVertical: 4,
    ...(Platform.OS === 'web' ? { position: 'sticky' as never, top: 0, zIndex: 20 } : {}),
  },
  contextMain: {
    flex: 1,
    minWidth: 0,
  },
  contextTitle: {
    color: color.white,
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
    lineHeight: 19,
  },
  contextAdminEmail: {
    color: color.white,
    flexShrink: 1,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 16,
    maxWidth: 360,
    opacity: 0.92,
  },
  contextActions: {
    flexDirection: 'row',
    gap: 6,
  },
  contextIconButton: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  internalHeader: {
    alignItems: 'center',
    backgroundColor: color.white,
    borderBottomColor: adminPalette.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
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
    alignSelf: 'center',
    flex: 1,
    gap: 6,
    maxWidth: 1280,
    padding: 6,
    width: '100%',
  },
  browsePane: {
    backgroundColor: color.white,
    borderColor: adminPalette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    overflow: 'hidden',
  },
  editorPane: {
    flex: 1,
  },
  userListWrap: {
    flex: 1,
  },
  userListIntro: {
    borderBottomColor: adminPalette.line,
    borderBottomWidth: 1,
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  userListTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 18,
    lineHeight: 24,
  },
  userListSubtitle: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
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
    gap: 8,
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
  userCardAction: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: adminPalette.blueSoft,
    borderColor: adminPalette.blueLine,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
  },
  userCardActionText: {
    color: adminPalette.blue,
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
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
    gap: 6,
    paddingBottom: 12,
  },
  editorContentDesktop: {
    paddingHorizontal: 4,
  },
  selectedHeader: {
    backgroundColor: color.white,
    borderColor: adminPalette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 6,
    padding: 8,
  },
  selectedIdentityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedPersonRow: {
    alignItems: 'center',
    flex: 1.2,
    flexDirection: 'row',
    gap: 8,
    minWidth: 260,
  },
  selectedCopy: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  selectedTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  selectedTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 20,
  },
  selectedEmail: {
    color: adminPalette.blueDeep,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  selectedIdentityFacts: {
    flex: 1.8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    minWidth: 320,
  },
  identityFact: {
    borderColor: adminPalette.line,
    borderRadius: radius.sm,
    borderWidth: 1,
    minHeight: 34,
    minWidth: 132,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  identityFactLabel: {
    color: adminPalette.faint,
    fontFamily: 'Satoshi-Medium',
    fontSize: 10,
    lineHeight: 12,
  },
  identityFactValue: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 11,
    lineHeight: 14,
  },
  selectedStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  selectedActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedToolsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  headerAction: {
    alignItems: 'center',
    borderColor: adminPalette.blueLine,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 30,
    paddingHorizontal: 10,
  },
  headerActionText: {
    color: adminPalette.blue,
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
  },
  sectionTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  sectionTab: {
    alignItems: 'center',
    borderColor: adminPalette.line,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    minHeight: 28,
    paddingHorizontal: 9,
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
  sectionCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sectionCard: {
    alignItems: 'center',
    backgroundColor: color.white,
    borderColor: adminPalette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 46,
    minWidth: 148,
    paddingHorizontal: 12,
  },
  sectionCardActive: {
    backgroundColor: adminPalette.blueSoft,
    borderColor: adminPalette.blueLine,
  },
  sectionCardText: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
  },
  sectionCardTextActive: {
    color: adminPalette.blue,
    fontFamily: 'Satoshi-Bold',
  },
  editorPanel: {
    backgroundColor: color.white,
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
    paddingVertical: 8,
  },
  panelTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 17,
    lineHeight: 22,
  },
  panelBody: {
    gap: 10,
    padding: 10,
  },
  panelFooter: {
    backgroundColor: color.white,
    borderTopColor: adminPalette.line,
    borderTopWidth: 1,
    padding: 16,
    ...(Platform.OS === 'web' ? { bottom: 0, position: 'sticky' as never, zIndex: 2 } : {}),
  },
  overviewGrid: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  readinessCard: {
    borderColor: adminPalette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: 12,
    minWidth: 280,
    padding: 12,
  },
  readinessList: {
    gap: 12,
  },
  readinessRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  readinessLabel: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    lineHeight: 18,
  },
  readinessHelper: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  quickActionGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    minWidth: 280,
  },
  quickActionCard: {
    alignItems: 'center',
    borderColor: adminPalette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 58,
    minWidth: 180,
    padding: 12,
  },
  quickActionIcon: {
    alignItems: 'center',
    backgroundColor: adminPalette.blueSoft,
    borderRadius: radius.sm,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  quickActionText: {
    color: adminPalette.ink,
    flex: 1,
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    lineHeight: 18,
  },
  pickerBackdrop: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  pickerScrim: {
    backgroundColor: 'rgba(17, 24, 39, 0.35)',
    flex: 1,
  },
  pickerPanel: {
    backgroundColor: color.white,
    borderLeftColor: adminPalette.line,
    borderLeftWidth: 1,
    maxWidth: 520,
    width: '92%',
  },
  pickerHeader: {
    alignItems: 'center',
    borderBottomColor: adminPalette.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  pickerTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 18,
    lineHeight: 24,
  },
  pickerSubtitle: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 17,
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
  compactPhotoBlock: {
    borderColor: adminPalette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 12,
    padding: 12,
  },
  profilePreview: {
    backgroundColor: color.surfaceAlt,
    borderColor: adminPalette.line,
    borderRadius: 41,
    borderWidth: 1,
    height: 82,
    width: 82,
  },
  profilePreviewCompact: {
    backgroundColor: color.surfaceAlt,
    borderColor: adminPalette.line,
    borderRadius: 29,
    borderWidth: 1,
    height: 58,
    width: 58,
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
  dangerButtonCompact: {
    alignItems: 'center',
    backgroundColor: adminPalette.dangerSoft,
    borderColor: '#F5D3D3',
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
  dangerButtonCompactText: {
    color: adminPalette.dangerDeep,
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
  draftList: {
    gap: 10,
  },
  draftListTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    lineHeight: 18,
  },
  draftDescription: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 17,
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
  publicPhotoStatus: {
    color: adminPalette.successDeep,
    fontFamily: 'Satoshi-Bold',
    fontSize: 11,
    lineHeight: 15,
    paddingHorizontal: 10,
  },
  photoActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    padding: 10,
    paddingTop: 0,
  },
  activityRow: {
    alignItems: 'flex-start',
    borderTopColor: adminPalette.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 12,
  },
  activityMain: {
    flex: 1,
    gap: 3,
    minWidth: 180,
  },
  activityTitle: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    lineHeight: 18,
  },
  activityMeta: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  activityStatusControl: {
    flex: 1.2,
    minWidth: 220,
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
