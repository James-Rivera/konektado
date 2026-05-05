import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import {
  OnboardingButton,
  OnboardingFormScaffold,
  OnboardingTextInput,
  onboardingColors,
} from '@/components/onboarding/FigmaOnboarding';

import type { VerificationUpload } from './onboarding-context';
import { useOnboarding } from './onboarding-context';

export default function VerificationStep() {
  const router = useRouter();
  const { draft, role, updateDraft, setVerificationFiles } = useOnboarding();
  const [wantsVerification, setWantsVerification] = useState(draft.wantsBarangayVerification ?? true);
  const [verificationNote, setVerificationNote] = useState(draft.verificationNote);
  const [files, setFiles] = useState<VerificationUpload[]>(draft.verificationFiles ?? []);

  useEffect(() => {
    if (role === 'client') {
      router.replace('/(onboarding)/review');
    }
  }, [role, router]);

  const pickFile = async (fileType: VerificationUpload['fileType']) => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const next: VerificationUpload = {
      fileType,
      mimeType: asset.mimeType ?? undefined,
      name: asset.name ?? 'upload',
      size: asset.size ?? null,
      uri: asset.uri,
    };

    setFiles((prev) => {
      const updated = [...prev, next];
      setVerificationFiles(updated);
      return updated;
    });
  };

  const removeFile = (uri: string) => {
    setFiles((prev) => {
      const updated = prev.filter((file) => file.uri !== uri);
      setVerificationFiles(updated);
      return updated;
    });
  };

  const next = () => {
    if (wantsVerification) {
      const hasIdFront = files.some((file) => file.fileType === 'id_front');
      const hasIdBack = files.some((file) => file.fileType === 'id_back');

      if (!hasIdFront || !hasIdBack) {
        Alert.alert('ID required for verification', 'Please upload both ID front and ID back.');
        return;
      }
    }

    updateDraft({
      verificationFiles: files,
      verificationNote,
      wantsBarangayVerification: wantsVerification,
    });
    router.push('/(onboarding)/review');
  };

  return (
    <>
      <StatusBar style="dark" />
      <OnboardingFormScaffold
        contentStyle={styles.content}
        currentStep={3}
        footer={<OnboardingButton label="Next" onPress={next} />}
        helper="Barangay verification unlocks posting, messaging, and higher-trust marketplace actions."
        onBack={() => router.back()}
        title="Barangay verification">
        <View style={styles.toggleRow}>
          <View style={styles.toggleCopy}>
            <Text style={styles.toggleTitle}>Request verification now</Text>
            <Text style={styles.toggleDescription}>You can also finish setup and verify later.</Text>
          </View>
          <Switch
            onValueChange={setWantsVerification}
            thumbColor={wantsVerification ? onboardingColors.brandYellow : '#F4F4F4'}
            trackColor={{ false: '#D5D7DA', true: '#F5F5EF' }}
            value={wantsVerification}
          />
        </View>

        {wantsVerification ? (
          <>
            <OnboardingTextInput
              multiline
              onChangeText={setVerificationNote}
              placeholder="Note to barangay (optional)"
              style={styles.noteInput}
              textAlignVertical="top"
              value={verificationNote}
            />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Required ID uploads</Text>
              <View style={styles.fileGrid}>
                <FileButton label="ID front" onPress={() => pickFile('id_front')} />
                <FileButton label="ID back" onPress={() => pickFile('id_back')} />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Optional supporting files</Text>
              <View style={styles.fileGrid}>
                <FileButton label="Certificate" onPress={() => pickFile('certification')} />
                <FileButton label="Work proof" onPress={() => pickFile('experience')} />
              </View>
            </View>

            {files.length ? (
              <View style={styles.fileList}>
                {files.map((file) => (
                  <View key={file.uri} style={styles.fileListItem}>
                    <View style={styles.fileNameRow}>
                      <MaterialIcons color={onboardingColors.textMuted} name="attach-file" size={16} />
                      <Text numberOfLines={1} style={styles.fileName}>
                        {file.name}
                      </Text>
                    </View>
                    <Pressable accessibilityRole="button" hitSlop={8} onPress={() => removeFile(file.uri)}>
                      <Text style={styles.removeText}>Remove</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.skipCard}>
            <Text style={styles.skipText}>You can browse in viewer mode and request verification later in Profile.</Text>
          </View>
        )}
      </OnboardingFormScaffold>
    </>
  );
}

function FileButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.fileButton}>
      <MaterialIcons color={onboardingColors.actionBlue} name="upload-file" size={20} />
      <Text style={styles.fileButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 36,
  },
  toggleRow: {
    alignItems: 'center',
    borderColor: onboardingColors.borderSoft,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    padding: 12,
  },
  toggleCopy: {
    flex: 1,
    gap: 4,
  },
  toggleTitle: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 20,
  },
  toggleDescription: {
    color: onboardingColors.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  noteInput: {
    height: 92,
    paddingTop: 12,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 20,
  },
  fileGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  fileButton: {
    alignItems: 'center',
    borderColor: onboardingColors.borderSoft,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 10,
  },
  fileButtonText: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 16,
  },
  fileList: {
    borderColor: onboardingColors.borderSoft,
    borderRadius: 12,
    borderWidth: 1,
  },
  fileListItem: {
    alignItems: 'center',
    borderBottomColor: onboardingColors.borderSoft,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    padding: 10,
  },
  fileNameRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  fileName: {
    color: onboardingColors.text,
    flex: 1,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  removeText: {
    color: '#B91C1C',
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 16,
  },
  skipCard: {
    backgroundColor: '#F8FAFC',
    borderColor: onboardingColors.borderSoft,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  skipText: {
    color: onboardingColors.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
  },
});
