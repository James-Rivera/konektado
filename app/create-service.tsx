import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarangayPickerSheet } from '@/components/BarangayPickerSheet';
import { LocationMapPreview } from '@/components/LocationMapPreview';
import { PostOptionPickerSheet } from '@/components/PostOptionPickerSheet';
import { getServiceTagsForCategory, POPULAR_SERVICE_POST_OPTIONS, SERVICE_POST_OPTIONS } from '@/constants/service-post-options';
import { color, radius, space, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { type ServicePhotoAsset, uploadServicePhotos } from '@/services/service-photo.service';

const MAX_SERVICE_PHOTOS = 10;

export default function CreateServiceScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [availability, setAvailability] = useState('');
  const [rate, setRate] = useState('');
  const [allowMessages, setAllowMessages] = useState(true);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoPauseEnabled, setAutoPauseEnabled] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [servicePickerVisible, setServicePickerVisible] = useState(false);
  const [barangayPickerVisible, setBarangayPickerVisible] = useState(false);
  const [photoFolderId] = useState(() => `service-draft-${Date.now()}`);
  const [locationBarangay, setLocationBarangay] = useState('Barangay San Pedro');
  const locationText = locationBarangay;
  const tagOptions = getServiceTagsForCategory(category);

  useEffect(() => {
    if (profile?.barangay) {
      setLocationBarangay(profile.barangay);
    }
  }, [profile?.barangay]);

  const selectCategory = (value: string) => {
    setCategory(value);
    setTags([]);
  };

  const toggleTag = (tag: string) => {
    setTags((current) => {
      if (current.includes(tag)) return current.filter((item) => item !== tag);
      if (current.length >= 4) return current;
      return [...current, tag];
    });
  };

  const onNext = () => {
    if (uploadingPhotos) {
      Alert.alert('Add Photos', 'Wait for the photos to finish uploading.');
      return;
    }
    if (!category.trim()) {
      Alert.alert('Choose a service', 'Pick one service category for this listing.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Add a title', 'Enter a short title for this service listing.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Add service details', 'Describe what clients can expect from this service.');
      return;
    }

    router.push({
      pathname: '/create-service-preview',
      params: {
        draft: JSON.stringify({
          allowMessages,
          autoPauseEnabled,
          autoReplyEnabled,
          availability,
          category,
          description,
          tags,
          locationText,
          photoUrls,
          rate,
          title,
        }),
      },
    });
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.headerIcon, pressed && styles.pressed]}>
            <MaterialIcons color={color.text} name="chevron-left" size={30} />
          </Pressable>
          <Text style={styles.headerTitle}>New service post</Text>
          <Pressable
            accessibilityRole="button"
            onPress={onNext}
            style={({ pressed }) => [pressed && styles.pressed]}>
            <Text style={styles.headerAction}>Next</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.userRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(getDisplayName(profile))}</Text>
              <View style={styles.avatarDot} />
            </View>
            <View style={styles.userCopy}>
              <Text style={styles.userName}>{getDisplayName(profile)}</Text>
              <Text style={styles.userMeta}>Creating a service post</Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Service</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setServicePickerVisible(true)}
              style={({ pressed }) => [styles.selectBox, pressed && styles.pressed]}>
              <Text style={[styles.selectText, !category && styles.placeholderText]} numberOfLines={1}>
                {category || 'Choose a service'}
              </Text>
              <MaterialIcons color={color.verificationBlue} name="keyboard-arrow-down" size={24} />
            </Pressable>
            <Text style={styles.helperText}>One service per post. You can create another post for a different service.</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Tags</Text>
            <Text style={styles.helperText}>Add up to 4 tags to help people find this service.</Text>
            {tagOptions.length ? (
              <View style={styles.chipWrap}>
                {tagOptions.map((tag) => {
                  const active = tags.includes(tag);
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      key={tag}
                      onPress={() => toggleTag(tag)}
                      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{tag}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View
                accessibilityLabel="Select a service to show available tags"
                accessibilityRole="text"
                style={styles.tagEmptyBox}>
                <View style={styles.tagEmptyIcon}>
                  <MaterialIcons color={color.textSubtle} name="local-offer" size={18} />
                </View>
                <Text style={styles.tagEmptyText}>Select a service to show available tags</Text>
              </View>
            )}
          </View>

          {photoUrls.length ? (
            <View style={[styles.photoCard, uploadingPhotos && styles.disabled]}>
              <ScrollView horizontal contentContainerStyle={styles.photoStrip} showsHorizontalScrollIndicator={false}>
                {photoUrls.map((url, index) => (
                  <View key={`${url}-${index}`} style={styles.photoTile}>
                    <Image resizeMode="cover" source={{ uri: url }} style={styles.photoThumb} />
                    <Pressable
                      accessibilityLabel={`Remove photo ${index + 1}`}
                      accessibilityRole="button"
                      onPress={() => setPhotoUrls((current) => current.filter((item) => item !== url))}
                      style={({ pressed }) => [styles.photoRemoveButton, pressed && styles.pressed]}>
                      <MaterialIcons color={color.white} name="close" size={14} />
                    </Pressable>
                  </View>
                ))}
                {photoUrls.length < MAX_SERVICE_PHOTOS ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={uploadingPhotos}
                    onPress={() => void addPhotos(photoUrls, setPhotoUrls, setUploadingPhotos, photoFolderId)}
                    style={({ pressed }) => [
                      styles.photoAddTile,
                      pressed && !uploadingPhotos && styles.pressed,
                      uploadingPhotos && styles.disabled,
                    ]}>
                    <MaterialIcons color={color.verificationBlue} name="add" size={22} />
                    <Text style={styles.photoAddText}>Add more</Text>
                  </Pressable>
                ) : null}
              </ScrollView>
              <Text style={styles.photoCountText}>
                {uploadingPhotos ? 'Uploading photos...' : `${photoUrls.length}/10 photos added`}
              </Text>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              disabled={uploadingPhotos}
              onPress={() => void addPhotos(photoUrls, setPhotoUrls, setUploadingPhotos, photoFolderId)}
              style={({ pressed }) => [
                styles.photoCard,
                styles.photoCardEmpty,
                pressed && !uploadingPhotos && styles.pressed,
                uploadingPhotos && styles.disabled,
              ]}>
              <View style={styles.photoIcon}>
                <MaterialIcons color={color.verificationBlue} name="add-to-photos" size={22} />
              </View>
              <Text style={styles.photoTitle}>{uploadingPhotos ? 'Uploading Photos' : 'Add Photos'}</Text>
            </Pressable>
          )}
          <Text style={styles.helperText}>
            <Text style={styles.helperStrong}>Optional.</Text> Add up to 10 photos to show your past work.
          </Text>

          <Field
            label="Service title"
            onChangeText={setTitle}
            placeholder="e.g. Home cleaning help"
            value={title}
          />
        <Field
          label="Description"
          multiline
          onChangeText={setDescription}
          placeholder="Describe your service, tools, and experience"
          value={description}
        />
        <Field
          label="Availability"
          onChangeText={setAvailability}
          placeholder="e.g. Weekends, afternoons"
          value={availability}
        />
          <Field label="Rate" onChangeText={setRate} placeholder="e.g. Starts at PHP 500" value={rate} />

          <View style={styles.sectionBand}>
            <View style={styles.rowBetween}>
              <View style={styles.flex}>
                <Text style={styles.sectionTitle}>Barangay</Text>
                <Text style={styles.helperText}>Only your barangay will be shown publicly.</Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setBarangayPickerVisible(true)}
              style={({ pressed }) => [styles.selectBox, pressed && styles.pressed]}>
              <Text style={[styles.selectText, !locationText && styles.placeholderText]} numberOfLines={1}>
                {locationText || 'Choose barangay'}
              </Text>
              <MaterialIcons color={color.verificationBlue} name="keyboard-arrow-down" size={24} />
            </Pressable>
            <LocationMapPreview />
          </View>

          <View style={styles.sectionBand}>
            <Text style={styles.sectionTitle}>Listing Options</Text>
            <Text style={styles.helperText}>Control how residents can respond to this listing.</Text>
            <ToggleRow
              description="Let verified residents contact you from this service listing."
              label="Allow messages"
              onValueChange={setAllowMessages}
              value={allowMessages}
            />
            <ToggleRow
              description="Send a quick reply when someone messages from this listing."
              label="Auto-reply"
              onValueChange={setAutoReplyEnabled}
              value={autoReplyEnabled}
            />
            <ToggleRow
              description="Pause this listing when you are no longer available."
              label="Pause listing when unavailable"
              onValueChange={setAutoPauseEnabled}
              value={autoPauseEnabled}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={onNext}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Text style={styles.primaryButtonText}>Review service post</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </View>

      <PostOptionPickerSheet
        allOptions={[...SERVICE_POST_OPTIONS]}
        description="Pick the one service this listing will highlight"
        onClose={() => setServicePickerVisible(false)}
        onSelect={selectCategory}
        popularLabel="Popular services"
        popularOptions={[...POPULAR_SERVICE_POST_OPTIONS]}
        searchPlaceholder="Search services"
        selectedValue={category}
        title="Choose service"
        visible={servicePickerVisible}
      />
      <BarangayPickerSheet
        description="Only your barangay is shown publicly."
        onClose={() => setBarangayPickerVisible(false)}
        onSelect={setLocationBarangay}
        options={['Barangay San Pedro']}
        searchPlaceholder="Search barangay"
        selectedValue={locationText}
        title="Choose barangay"
        visible={barangayPickerVisible}
      />
    </SafeAreaView>
  );
}

function Field({
  label,
  multiline,
  onChangeText,
  placeholder,
  value,
}: {
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        multiline={multiline}
        onChangeText={onChangeText}
        placeholderTextColor="#AFAFAF"
        placeholder={placeholder}
        style={[styles.input, multiline && styles.multiline]}
        value={value}
      />
    </View>
  );
}

function ToggleRow({
  description,
  label,
  onValueChange,
  value,
}: {
  description: string;
  label: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleTitle}>{label}</Text>
        <Text style={styles.toggleDescription}>{description}</Text>
      </View>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
        onPress={() => onValueChange(!value)}
        style={[styles.toggleTrack, value && styles.toggleTrackOn]}>
        <View style={[styles.toggleKnob, value && styles.toggleKnobOn]} />
      </Pressable>
    </View>
  );
}

function getDisplayName(profile: ReturnType<typeof useProfile>['profile']) {
  return (
    profile?.full_name?.trim() ||
    `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() ||
    'Konektado resident'
  );
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

async function addPhotos(
  currentPhotos: string[],
  setPhotoUrls: (value: string[] | ((current: string[]) => string[])) => void,
  setUploadingPhotos: (value: boolean) => void,
  folderId: string,
) {
  const remaining = MAX_SERVICE_PHOTOS - currentPhotos.length;
  if (remaining <= 0) {
    Alert.alert('Add Photos', 'You can add up to 10 photos.');
    return;
  }

  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: true,
    type: ['image/*'],
  });

  if (result.canceled || !result.assets?.length) return;

  const assets: ServicePhotoAsset[] = result.assets.slice(0, remaining).map((asset) => ({
    uri: asset.uri,
    mimeType: asset.mimeType ?? null,
    name: asset.name ?? null,
    size: asset.size ?? null,
  }));

  setUploadingPhotos(true);
  const uploaded = await uploadServicePhotos({ assets, folderId });
  setUploadingPhotos(false);

  if (uploaded.error || !uploaded.data) {
    Alert.alert('Add Photos', uploaded.error ?? 'Could not upload photos.');
    return;
  }

  setPhotoUrls((existing) =>
    Array.from(new Set([...existing, ...uploaded.data])).slice(0, MAX_SERVICE_PHOTOS),
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: color.background,
    flex: 1,
  },
  screen: {
    backgroundColor: color.background,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
    minHeight: 55,
    paddingHorizontal: space.xl,
  },
  headerIcon: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  headerTitle: {
    ...typography.sectionTitle,
    color: color.text,
    flex: 1,
  },
  headerAction: {
    ...typography.bodyMedium,
    color: color.verificationBlue,
  },
  content: {
    gap: space.lg,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space['3xl'],
  },
  userRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: color.cardTint,
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    position: 'relative',
    width: 46,
  },
  avatarText: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 20,
  },
  avatarDot: {
    backgroundColor: color.brandYellow,
    borderColor: color.background,
    borderRadius: radius.pill,
    borderWidth: 2,
    bottom: 0,
    height: 12,
    position: 'absolute',
    right: 0,
    width: 12,
  },
  userCopy: {
    flex: 1,
    gap: space['2xs'],
  },
  userName: {
    ...typography.sectionTitle,
    color: color.text,
  },
  userMeta: {
    ...typography.caption,
    color: color.textMuted,
  },
  fieldGroup: {
    gap: space.sm,
  },
  label: {
    ...typography.body,
    color: color.textMuted,
  },
  selectBox: {
    alignItems: 'center',
    borderColor: '#AFAFAF',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 46,
    paddingHorizontal: space.md,
    width: '100%',
  },
  selectText: {
    ...typography.body,
    color: color.text,
    flex: 1,
    paddingVertical: space.md,
  },
  placeholderText: {
    color: '#AFAFAF',
  },
  helperText: {
    ...typography.caption,
    color: color.textMuted,
  },
  helperStrong: {
    fontFamily: 'Satoshi-Bold',
  },
  tagEmptyBox: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    minHeight: 46,
    paddingHorizontal: space.md,
  },
  tagEmptyIcon: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  tagEmptyText: {
    ...typography.captionMedium,
    color: color.textSubtle,
    flex: 1,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  photoCard: {
    borderColor: color.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: space.sm,
    padding: space.md,
    width: '100%',
  },
  photoCardEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  photoIcon: {
    alignItems: 'center',
    borderColor: color.verificationBlue,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  photoTitle: {
    ...typography.sectionTitle,
    color: color.text,
  },
  photoStrip: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
    paddingVertical: space.xs,
  },
  photoTile: {
    height: 84,
    position: 'relative',
    width: 84,
  },
  photoThumb: {
    backgroundColor: color.cardTint,
    borderColor: color.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    height: '100%',
    overflow: 'hidden',
    width: '100%',
  },
  photoRemoveButton: {
    alignItems: 'center',
    backgroundColor: color.text,
    borderColor: color.white,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: -6,
    top: -6,
    width: 24,
  },
  photoAddTile: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderColor: color.primary,
    borderRadius: radius.sm,
    borderWidth: 1,
    height: 84,
    justifyContent: 'center',
    width: 84,
  },
  photoAddText: {
    ...typography.captionMedium,
    color: color.primary,
    fontFamily: 'Satoshi-Bold',
    marginTop: space.xs,
  },
  photoCountText: {
    ...typography.caption,
    color: color.textMuted,
    paddingHorizontal: space.xs,
    textAlign: 'center',
  },
  chip: {
    alignItems: 'center',
    borderColor: color.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 32,
    minWidth: 81,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  chipActive: {
    backgroundColor: color.cardTint,
    borderColor: color.primary,
  },
  chipText: {
    ...typography.captionMedium,
    color: color.textMuted,
    textAlign: 'center',
  },
  chipTextActive: {
    color: color.primary,
    fontFamily: 'Satoshi-Bold',
  },
  moreChip: {
    backgroundColor: color.primarySoft,
    borderColor: color.primary,
  },
  moreChipText: {
    color: color.primary,
  },
  input: {
    ...typography.body,
    backgroundColor: color.background,
    borderColor: '#AFAFAF',
    borderRadius: radius.md,
    borderWidth: 1,
    color: color.text,
    minHeight: 46,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  sectionBand: {
    borderTopColor: color.border,
    borderTopWidth: 1,
    gap: space.sm,
    marginHorizontal: -space.xl,
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
  },
  flex: {
    flex: 1,
  },
  sectionTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  editLink: {
    ...typography.bodyMedium,
    color: color.primary,
  },
  locationText: {
    ...typography.bodyMedium,
    color: color.text,
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
    minHeight: 44,
  },
  toggleCopy: {
    flex: 1,
    gap: space['2xs'],
  },
  toggleTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  toggleDescription: {
    ...typography.caption,
    color: color.text,
  },
  toggleTrack: {
    backgroundColor: '#A1A1AA',
    borderRadius: radius.pill,
    height: 24,
    justifyContent: 'center',
    padding: 4,
    width: 40,
  },
  toggleTrackOn: {
    backgroundColor: color.verificationBlue,
  },
  toggleKnob: {
    backgroundColor: color.background,
    borderRadius: radius.pill,
    height: 16,
    width: 16,
  },
  toggleKnobOn: {
    alignSelf: 'flex-end',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: color.verificationBlue,
    borderRadius: radius.md,
    marginTop: space.sm,
    paddingVertical: space.md,
  },
  primaryButtonText: {
    ...typography.button,
    color: color.white,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: space.md,
  },
  secondaryButtonText: {
    ...typography.button,
    color: color.text,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.6,
  },
});
