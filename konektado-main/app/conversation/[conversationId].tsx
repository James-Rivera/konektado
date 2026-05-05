import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Pill } from '@/components/Pill';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Skeleton } from '@/components/Skeleton';
import { color, radius, space, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import {
  getConversation,
  markWorkerHired,
  sendMessage,
} from '@/services/conversation.service';
import type { ConversationDetail } from '@/types/marketplace.types';

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default function ConversationDetailScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const params = useLocalSearchParams<{ conversationId?: string | string[] }>();
  const conversationId = getParamValue(params.conversationId);
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = () => {
    if (!conversationId) return;

    getConversation(conversationId).then((result) => {
      if (result.error) {
        Alert.alert('Conversation', result.error);
      } else {
        setConversation(result.data);
      }

      setLoading(false);
    });
  };

  useEffect(load, [conversationId]);

  const other =
    conversation?.clientId === profile?.id ? conversation?.provider : conversation?.client;
  const canMarkHired =
    Boolean(conversation?.jobId) &&
    conversation?.clientId === profile?.id &&
    conversation?.status !== 'hired';

  const onSend = async () => {
    if (!conversationId) return;

    setSending(true);
    const result = await sendMessage({ conversationId, body });
    setSending(false);

    if (result.error) {
      Alert.alert('Message', result.error);
      return;
    }

    setBody('');
    load();
  };

  const onMarkHired = async () => {
    if (!conversationId) return;

    const result = await markWorkerHired({ conversationId });

    if (result.error) {
      Alert.alert('Mark hired', result.error);
      return;
    }

    setConversation(result.data);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerIcon}>
            <MaterialIcons color={color.text} name="arrow-back-ios" size={18} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>{other?.fullName ?? 'Conversation'}</Text>
            <Text style={styles.headerSubtitle}>{conversation?.job?.title ?? conversation?.service?.title ?? ''}</Text>
          </View>
          {conversation ? <Pill label={conversation.status} tone="primary" /> : null}
        </View>

        <ScrollView contentContainerStyle={styles.messages} showsVerticalScrollIndicator={false}>
          {loading ? <ConversationSkeleton /> : null}
          {!loading && !conversation?.messages.length ? (
            <Text style={styles.emptyText}>No messages yet.</Text>
          ) : null}
          {conversation?.messages.map((message) => {
            const mine = message.senderId === profile?.id;
            return (
              <View
                key={message.id}
                style={[styles.messageBubble, mine ? styles.myMessage : styles.theirMessage]}>
                <Text style={[styles.messageText, mine && styles.myMessageText]}>{message.body}</Text>
                <Text style={[styles.messageTime, mine && styles.myMessageTime]}>
                  {formatDate(message.createdAt)}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        {canMarkHired ? (
          <View style={styles.hireBar}>
            <PrimaryButton icon="check-circle" label="Mark Hired" onPress={onMarkHired} />
          </View>
        ) : null}

        <View style={styles.composer}>
          <TextInput
            multiline
            onChangeText={setBody}
            placeholder="Write a message"
            style={styles.input}
            value={body}
          />
          <Pressable disabled={sending} onPress={onSend} style={styles.sendButton}>
            <MaterialIcons color={color.primary} name="send" size={20} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ConversationSkeleton() {
  return (
    <>
      <View style={[styles.messageBubble, styles.theirMessage, styles.skeletonBubble]}>
        <Skeleton height={14} width="85%" />
        <Skeleton height={10} width={52} style={{ marginTop: space.sm }} />
      </View>
      <View style={[styles.messageBubble, styles.myMessage, styles.skeletonBubble]}>
        <Skeleton height={14} width="75%" />
        <Skeleton height={10} width={46} style={{ marginTop: space.sm }} />
      </View>
      <View style={[styles.messageBubble, styles.theirMessage, styles.skeletonBubble]}>
        <Skeleton height={14} width="92%" />
        <Skeleton height={10} width={52} style={{ marginTop: space.sm }} />
      </View>
    </>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
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
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
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
  headerTitle: {
    ...typography.bodyMedium,
    color: color.text,
  },
  headerSubtitle: {
    ...typography.caption,
    color: color.textMuted,
  },
  messages: {
    gap: space.sm,
    padding: space.lg,
  },
  emptyText: {
    ...typography.body,
    color: color.textMuted,
  },
  messageBubble: {
    borderRadius: radius.md,
    maxWidth: '82%',
    padding: space.md,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: color.primary,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: color.background,
    borderColor: color.border,
    borderWidth: 1,
  },
  messageText: {
    ...typography.body,
    color: color.text,
  },
  myMessageText: {
    color: color.background,
  },
  messageTime: {
    ...typography.caption,
    color: color.textSubtle,
    marginTop: space.xs,
  },
  myMessageTime: {
    color: color.background,
    opacity: 0.72,
  },
  skeletonBubble: {
    gap: space.xs,
    minHeight: 68,
    width: '76%',
  },
  hireBar: {
    backgroundColor: color.background,
    borderTopColor: color.border,
    borderTopWidth: 1,
    padding: space.md,
  },
  composer: {
    alignItems: 'flex-end',
    backgroundColor: color.background,
    borderTopColor: color.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    padding: space.md,
  },
  input: {
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    maxHeight: 120,
    minHeight: 42,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  sendButton: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
});
