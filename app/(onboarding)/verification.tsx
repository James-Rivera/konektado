import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

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
      uri: asset.uri,
      name: asset.name ?? 'upload',
      fileType,
      mimeType: asset.mimeType ?? undefined,
      size: asset.size ?? null,
    };

    setFiles((prev) => {
      const updated = [...prev, next];
      setVerificationFiles(updated);
      return updated;
    });
  };

  const removeFile = (uri: string) => {
    setFiles((prev) => {
      const updated = prev.filter((f) => f.uri !== uri);
      setVerificationFiles(updated);
      return updated;
    });
  };

  const next = () => {
    if (wantsVerification) {
      const hasIdFront = files.some((file) => file.fileType === 'id_front');
      const hasIdBack = files.some((file) => file.fileType === 'id_back');

      if (!hasIdFront || !hasIdBack) {
        Alert.alert(
          'ID required for verification',
          'Please upload both ID front and ID back to request barangay verification.'
        );
        return;
      }
    }

    updateDraft({
      wantsBarangayVerification: wantsVerification,
      verificationNote,
      verificationFiles: files,
    });
    router.push('/(onboarding)/review');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Barangay verification</ThemedText>
      <ThemedText style={styles.helper}>
        Verified providers are easier to trust for nearby jobs. This is recommended.
      </ThemedText>

      <View style={styles.rowBetween}>
        <ThemedText>Request barangay verification</ThemedText>
        <Switch value={wantsVerification} onValueChange={setWantsVerification} />
      </View>

      {wantsVerification ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Note to barangay (optional)"
            multiline
            value={verificationNote}
            onChangeText={setVerificationNote}
          />

          <ThemedText type="subtitle">Required ID uploads</ThemedText>
          <View style={styles.fileRow}>
            <Pressable style={styles.fileButton} onPress={() => pickFile('id_front')}>
              <ThemedText>Add ID front</ThemedText>
            </Pressable>
            <Pressable style={styles.fileButton} onPress={() => pickFile('id_back')}>
              <ThemedText>Add ID back</ThemedText>
            </Pressable>
          </View>

          <ThemedText type="subtitle">Optional supporting files</ThemedText>
          <View style={styles.fileRow}>
            <Pressable style={styles.fileButton} onPress={() => pickFile('certification')}>
              <ThemedText>Add cert proof</ThemedText>
            </Pressable>
            <Pressable style={styles.fileButton} onPress={() => pickFile('experience')}>
              <ThemedText>Add work proof</ThemedText>
            </Pressable>
          </View>

          {files.length ? (
            <View style={styles.list}>
              {files.map((file) => (
                <View key={file.uri} style={styles.listItem}>
                  <ThemedText>{file.fileType}: {file.name}</ThemedText>
                  <Pressable onPress={() => removeFile(file.uri)}>
                    <ThemedText style={styles.remove}>Remove</ThemedText>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
        </>
      ) : (
        <View style={styles.skippedCard}>
          <ThemedText>You can skip for now and request verification later in profile settings.</ThemedText>
        </View>
      )}

      <View style={styles.row}>
        <TouchableOpacity style={styles.secondary} onPress={() => router.back()}>
          <ThemedText>Back</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primary} onPress={next}>
          <ThemedText type="defaultSemiBold" style={styles.primaryText}>Continue</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 12,
    justifyContent: 'center',
  },
  title: {
    marginBottom: 6,
    textAlign: 'center',
  },
  helper: {
    color: '#6b7280',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  fileRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fileButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  list: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 8,
    gap: 6,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  remove: {
    color: '#ef4444',
  },
  skippedCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  secondary: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  primary: {
    flex: 1,
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryText: {
    color: '#fff',
  },
});
