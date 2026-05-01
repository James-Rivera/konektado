import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { NoticeBanner } from '@/components/NoticeBanner';
import { Pill } from '@/components/Pill';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SearchBar } from '@/components/SearchBar';
import { conversations } from '@/constants/demo-data';
import { color, radius, space, typography } from '@/constants/theme';

export default function MessagesScreen() {
  return (
    <View style={styles.screen}>
      <AppHeader
        actionIcon="more-horiz"
        actionLabel="Message options"
        eyebrow="Coordination"
        title="Messages"
        subtitle="Message workers and clients after verification.">
        <SearchBar compact editable={false} placeholder="Search contacts or messages" />
      </AppHeader>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <NoticeBanner
          message="Unverified users can preview the inbox, but sending messages unlocks after barangay approval."
          title="Messaging is locked until verified"
          variant="warning"
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Inbox preview</Text>
          <Pill label="3 conversations" />
        </View>

        <View style={styles.stack}>
          {conversations.map((conversation) => (
            <View key={`${conversation.name}-${conversation.context}`} style={styles.messageCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(conversation.name)}</Text>
              </View>
              <View style={styles.messageBody}>
                <View style={styles.messageTop}>
                  <Text style={styles.name}>{conversation.name}</Text>
                  <Text style={styles.time}>{conversation.time}</Text>
                </View>
                <Text style={styles.context}>{conversation.context}</Text>
                <Text numberOfLines={2} style={styles.preview}>
                  {conversation.preview}
                </Text>
                <View style={styles.messageFooter}>
                  <Pill
                    icon={conversation.unread ? 'markunread' : 'drafts'}
                    label={conversation.status}
                    tone={conversation.unread ? 'primary' : 'neutral'}
                  />
                  {conversation.canMarkHired ? (
                    <PrimaryButton disabled label="Mark Hired" variant="secondary" />
                  ) : null}
                </View>
              </View>
            </View>
          ))}
        </View>

        <EmptyState
          description="The next slice can connect this shell to conversations, quick prompts, and safety reporting."
          icon="chat-bubble-outline"
          title="Chat details are not connected yet"
        />
      </ScrollView>
    </View>
  );
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: color.screenBackground,
    flex: 1,
  },
  content: {
    gap: space.lg,
    padding: space.xl,
    paddingBottom: space['3xl'],
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: color.text,
  },
  stack: {
    gap: space.md,
  },
  messageCard: {
    alignItems: 'flex-start',
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    padding: space.lg,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarText: {
    ...typography.captionMedium,
    color: color.primary,
  },
  messageBody: {
    flex: 1,
    gap: space.xs,
  },
  messageTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'space-between',
  },
  name: {
    ...typography.bodyMedium,
    color: color.text,
    flex: 1,
  },
  time: {
    ...typography.caption,
    color: color.textSubtle,
  },
  context: {
    ...typography.captionMedium,
    color: color.primary,
  },
  preview: {
    ...typography.body,
    color: color.textMuted,
  },
  messageFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    justifyContent: 'space-between',
  },
});
