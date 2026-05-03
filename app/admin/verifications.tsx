import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Pill } from '@/components/Pill';
import { PrimaryButton } from '@/components/PrimaryButton';
import { color, radius, space, typography } from '@/constants/theme';
import {
  listPendingVerificationRequests,
  reviewVerificationRequest,
  type VerificationRequestDetail,
} from '@/services/admin.service';

export default function AdminVerificationQueueScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<VerificationRequestDetail[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const load = () => {
    listPendingVerificationRequests().then((result) => {
      if (result.error || !result.data) {
        Alert.alert('Admin verifications', result.error ?? 'Could not load verification requests.');
      } else {
        setRequests(result.data);
      }

      setLoading(false);
    });
  };

  useEffect(load, []);

  const review = async (requestId: string, decision: 'approved' | 'rejected') => {
    setReviewingId(requestId);
    const result = await reviewVerificationRequest({
      requestId,
      decision,
      note: notes[requestId],
    });
    setReviewingId(null);

    if (result.error) {
      Alert.alert('Review request', result.error);
      return;
    }

    setRequests((current) => current.filter((request) => request.id !== requestId));
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerIcon}>
            <MaterialIcons color={color.text} name="arrow-back-ios" size={18} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Verification Queue</Text>
            <Text style={styles.subtitle}>Hidden barangay admin review route</Text>
          </View>
          <Pill label={loading ? 'Loading' : `${requests.length} pending`} tone="primary" />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {!loading && !requests.length ? (
            <View style={styles.emptyCard}>
              <Text style={styles.sectionTitle}>No pending requests</Text>
              <Text style={styles.body}>New barangay verification submissions will appear here.</Text>
            </View>
          ) : null}

          {requests.map((request) => (
            <View key={request.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.sectionTitle}>{request.profile?.fullName ?? 'Resident'}</Text>
                  <Text style={styles.body}>
                    {[request.profile?.barangay, request.profile?.city].filter(Boolean).join(', ') ||
                      'No location'}
                  </Text>
                </View>
                <Pill label={request.status} tone="warning" />
              </View>

              <View style={styles.metaGrid}>
                <Meta label="Request ID" value={request.id} />
                <Meta label="Submitted" value={formatDate(request.createdAt)} />
                <Meta label="Files" value={`${request.files.length}`} />
              </View>

              {request.notes ? (
                <Text numberOfLines={6} style={styles.notes}>
                  {request.notes}
                </Text>
              ) : null}

              {request.files.length ? (
                <View style={styles.files}>
                  {request.files.map((file) => (
                    <Pill key={file.id} label={file.fileType} />
                  ))}
                </View>
              ) : null}

              <TextInput
                multiline
                onChangeText={(value) =>
                  setNotes((current) => ({
                    ...current,
                    [request.id]: value,
                  }))
                }
                placeholder="Reviewer note"
                style={styles.input}
                value={notes[request.id] ?? ''}
              />

              <View style={styles.actions}>
                <PrimaryButton
                  disabled={reviewingId === request.id}
                  label="Reject"
                  onPress={() => review(request.id, 'rejected')}
                  variant="secondary"
                />
                <PrimaryButton
                  disabled={reviewingId === request.id}
                  icon="verified"
                  label="Approve"
                  onPress={() => review(request.id, 'approved')}
                />
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.metaValue}>
        {value}
      </Text>
    </View>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: color.background,
    flex: 1,
  },
  screen: {
    backgroundColor: color.screenBackground,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderBottomColor: color.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    padding: space.lg,
  },
  headerIcon: {
    alignItems: 'center',
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  headerCopy: {
    flex: 1,
    gap: space['2xs'],
  },
  title: {
    ...typography.screenTitle,
    color: color.text,
  },
  subtitle: {
    ...typography.caption,
    color: color.textMuted,
  },
  content: {
    gap: space.lg,
    padding: space.xl,
    paddingBottom: space['3xl'],
  },
  card: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: space.md,
    padding: space.lg,
  },
  emptyCard: {
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: space.sm,
    padding: space.lg,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: color.text,
  },
  body: {
    ...typography.body,
    color: color.textMuted,
  },
  metaGrid: {
    gap: space.sm,
  },
  metaItem: {
    gap: space['2xs'],
  },
  metaLabel: {
    ...typography.captionMedium,
    color: color.textSubtle,
  },
  metaValue: {
    ...typography.caption,
    color: color.text,
  },
  notes: {
    ...typography.caption,
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.sm,
    color: color.textMuted,
    padding: space.md,
  },
  files: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  input: {
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 82,
    padding: space.md,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'flex-end',
  },
});
