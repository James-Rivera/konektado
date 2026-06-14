import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { color, radius, space, typography } from '@/constants/theme';
import { createReview, getMyJobReviewState } from '@/services/review.service';
import type { JobReviewState, JobStatus } from '@/types/marketplace.types';

export function CompletedJobReviewCard({
  jobId,
  status,
  onSubmitted,
}: {
  jobId: string;
  status: JobStatus;
  onSubmitted?: () => void;
}) {
  const [state, setState] = useState<JobReviewState | null>(null);
  const [loading, setLoading] = useState(status === 'completed');
  const [visible, setVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (status !== 'completed') {
      setLoading(false);
      setState(null);
      return;
    }
    setLoading(true);
    void getMyJobReviewState(jobId).then((result) => {
      if (!active) return;
      setState(result.data ?? null);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [jobId, status]);

  if (status !== 'completed' || (!loading && !state)) return null;
  if (state && !state.eligible && state.reason !== 'already_reviewed') return null;

  const roleLabel = state?.revieweeRole === 'client' ? 'client' : 'worker';
  const submit = async () => {
    setSubmitting(true);
    setError(null);
    const result = await createReview({ jobId, rating, comment });
    setSubmitting(false);
    if (result.error || !result.data) {
      setError(result.error ?? 'Could not submit this review.');
      return;
    }
    setState((current) =>
      current
        ? { ...current, eligible: false, reason: 'already_reviewed', review: result.data }
        : current,
    );
    setVisible(false);
    onSubmitted?.();
  };

  return (
    <>
      <View style={styles.card}>
        <View style={styles.header}>
          <MaterialIcons color={color.brandYellow} name="star" size={22} />
          <View style={styles.copy}>
            <Text style={styles.title}>Completed-job review</Text>
            <Text style={styles.body}>
              {loading
                ? 'Checking review status...'
                : state?.review
                  ? `${state.review.rating}/5 submitted`
                  : `Share feedback about the ${roleLabel} as part of this job's trust history.`}
            </Text>
          </View>
        </View>
        {!loading && state?.eligible ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setVisible(true)}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
            <Text style={styles.actionText}>Review {roleLabel}</Text>
          </Pressable>
        ) : null}
      </View>

      <Modal animationType="fade" transparent visible={visible} onRequestClose={() => setVisible(false)}>
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Review {roleLabel}</Text>
            <Text style={styles.body}>
              Reviews are tied to this completed job and cannot be edited after submission.
            </Text>
            <View style={styles.stars}>
              {Array.from({ length: 5 }).map((_, index) => {
                const value = index + 1;
                return (
                  <Pressable
                    accessibilityLabel={`${value} star${value === 1 ? '' : 's'}`}
                    key={value}
                    onPress={() => setRating(value)}>
                    <MaterialIcons
                      color={value <= rating ? color.brandYellow : color.textSubtle}
                      name={value <= rating ? 'star' : 'star-border'}
                      size={30}
                    />
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              maxLength={1000}
              multiline
              onChangeText={setComment}
              placeholder="Optional comment"
              placeholderTextColor={color.textSubtle}
              style={styles.input}
              textAlignVertical="top"
              value={comment}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton
              disabled={rating < 1}
              label="Submit review"
              loading={submitting}
              onPress={submit}
            />
            <Pressable disabled={submitting} onPress={() => setVisible(false)}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: space.md,
    padding: space.lg,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.sm,
  },
  copy: {
    flex: 1,
    gap: space.xs,
  },
  title: {
    ...typography.bodyMedium,
    color: color.text,
  },
  body: {
    ...typography.caption,
    color: color.textMuted,
  },
  action: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    minHeight: 42,
    justifyContent: 'center',
  },
  actionText: {
    ...typography.bodyMedium,
    color: color.primary,
  },
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.42)',
    flex: 1,
    justifyContent: 'center',
    padding: space.xl,
  },
  dialog: {
    backgroundColor: color.background,
    borderRadius: 24,
    gap: space.md,
    maxWidth: 430,
    padding: space.xl,
    width: '100%',
  },
  dialogTitle: {
    ...typography.screenTitle,
    color: color.text,
  },
  stars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  input: {
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: color.text,
    fontFamily: 'Satoshi-Regular',
    minHeight: 96,
    padding: space.md,
  },
  error: {
    ...typography.caption,
    color: color.danger,
  },
  cancel: {
    ...typography.bodyMedium,
    color: color.textMuted,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
});
