import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { PrimaryButton } from '@/components/PrimaryButton';
import { color, radius, space, typography } from '@/constants/theme';
import type { UnfilledJobCancellationReason } from '@/types/marketplace.types';

const reasons: { value: UnfilledJobCancellationReason; label: string }[] = [
  { value: 'not_needed', label: 'I no longer need this service' },
  { value: 'found_elsewhere', label: 'I found someone else' },
  { value: 'no_worker_found', label: 'I could not find a worker' },
];

type Props = { onClose: () => void } & (
  | { mode: 'unfilled'; onSubmit: (reason: UnfilledJobCancellationReason) => Promise<string | null> }
  | { mode: 'hired'; onSubmit: (reason: string) => Promise<string | null> }
);

export function JobCancellationSheet(props: Props) {
  const [selected, setSelected] = useState<UnfilledJobCancellationReason | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const pending = useRef(false);
  const hired = props.mode === 'hired';

  const submit = async () => {
    if (pending.current || (hired ? !reason.trim() : !selected)) return;
    pending.current = true;
    setSending(true);
    setError(null);
    try {
      const failure = props.mode === 'hired' ? await props.onSubmit(reason.trim()) : await props.onSubmit(selected!);
      if (failure) setError(failure);
      else props.onClose();
    } catch {
      setError('Could not confirm the update. Check your connection and try again.');
    } finally {
      pending.current = false;
      setSending(false);
    }
  };

  return (
    <BottomSheet avoidKeyboard={hired} onClose={() => { if (!pending.current) props.onClose(); }} visible>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>{hired ? 'Request cancellation' : 'Cancel job request'}</Text>
        <Text style={styles.description}>
          {hired
            ? 'The other person will see your reason and can accept or decline. Completion is paused while you wait.'
            : 'Choose a reason. The post will be removed from search, and workers who messaged about it will get a notice.'}
        </Text>
        {hired ? (
          <TextInput accessibilityLabel="Reason for cancellation" editable={!sending} maxLength={500} multiline
            onChangeText={setReason} placeholder="Why do you want to cancel?" placeholderTextColor={color.textSubtle}
            style={styles.input} textAlignVertical="top" value={reason} />
        ) : reasons.map((item) => (
          <PrimaryButton key={item.value} disabled={sending} label={item.label}
            icon={selected === item.value ? 'radio-button-checked' : 'radio-button-unchecked'}
            onPress={() => setSelected(item.value)} variant={selected === item.value ? 'secondary' : 'outline'} />
        ))}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <PrimaryButton disabled={hired ? !reason.trim() : !selected} loading={sending}
          label={hired ? 'Send request' : 'Cancel job permanently'} onPress={submit} variant="danger" />
        <PrimaryButton disabled={sending} label="Go back" onPress={props.onClose} variant="ghost" />
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.sm },
  title: { color: color.text, fontSize: 20, fontWeight: '700' },
  description: { color: color.textSubtle, fontSize: 14, lineHeight: 20 },
  input: { ...typography.body, borderWidth: 1, borderColor: color.border, borderRadius: radius.md, color: color.text, minHeight: 96, padding: space.md },
  error: { color: color.danger, fontSize: 14 },
});
