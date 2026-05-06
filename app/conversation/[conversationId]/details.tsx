import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { PresenceDot } from '@/components/PresenceDot';
import { Skeleton } from '@/components/Skeleton';
import { color } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import {
  archiveConversation,
  getConversation,
  markWorkerHired,
  reportConversation,
} from '@/services/conversation.service';
import {
  formatJobPostTitle,
  formatServicePostTitle,
  getMarketplaceLocation,
  isPresenceActive,
} from '@/services/marketplace.helpers';
import type { ConversationDetail } from '@/types/marketplace.types';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

const REPORT_REASONS = [
  'Fake Profile / Impersonation',
  'Spam / Unwanted Messages',
  'Scam / Fraudulent Activity',
  'Inappropriate Content',
  'Harassment / Bullying',
  'Job Listing Violation',
  'Off-platform Transaction Request',
  'Other Violations',
];

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default function ConversationDetailsScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const params = useLocalSearchParams<{ conversationId?: string | string[] }>();
  const conversationId = getParamValue(params.conversationId);
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportVisible, setReportVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);

  const load = () => {
    if (!conversationId) return;

    getConversation(conversationId).then((result) => {
      if (result.error) {
        Alert.alert('Details', result.error);
      } else {
        setConversation(result.data);
      }

      setLoading(false);
    });
  };

  useEffect(load, [conversationId]);

  const isClient = conversation?.clientId === profile?.id;
  const canMarkHired = Boolean(conversation?.jobId) && isClient && conversation?.status !== 'hired';
  const context = conversation ? getContextSummary(conversation) : null;
  const other = conversation?.clientId === profile?.id ? conversation?.provider : conversation?.client;

  const openPost = () => {
    if (conversation?.jobId) {
      router.push({ pathname: '/job/[jobId]', params: { jobId: conversation.jobId } });
      return;
    }

    if (conversation?.serviceId) {
      router.push({ pathname: '/worker/[workerId]', params: { workerId: conversation.serviceId } });
    }
  };

  const openProfile = () => {
    if (conversation?.serviceId) {
      router.push({ pathname: '/worker/[workerId]', params: { workerId: conversation.serviceId } });
      return;
    }

    Alert.alert('Profile', 'Public client profiles are not a separate route yet.');
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

  const onReport = async (reason: string) => {
    if (!conversationId) return;

    const result = await reportConversation({ conversationId });
    if (result.error) {
      Alert.alert('Report user', result.error);
      return;
    }

    setConversation(result.data);
    setReportVisible(false);
    Alert.alert('Report submitted', `Thanks for the report. Reason: ${reason}`);
  };

  const onDelete = async () => {
    if (!conversationId) return;

    const result = await archiveConversation({ conversationId });
    if (result.error) {
      Alert.alert('Delete chat', result.error);
      return;
    }

    setDeleteVisible(false);
    router.replace('/(tabs)/messages');
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.headerIcon}>
            <MaterialIcons color={color.text} name="arrow-back-ios" size={18} />
          </Pressable>
          <Text style={styles.headerTitle}>Details</Text>
          <View style={styles.headerIcon} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          {loading ? <DetailsSkeleton /> : null}

          {context ? (
            <View style={styles.hero}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(context.title)}</Text>
                <PresenceDot active={isPresenceActive(other?.availability)} size={13} style={styles.onlineDot} />
              </View>
              <Text numberOfLines={2} style={styles.title}>{context.title}</Text>
              <Text numberOfLines={2} style={styles.subtitle}>{context.subtitle}</Text>
              <View style={styles.heroActions}>
                <IconAction
                  icon="article"
                  label={conversation?.jobId ? 'View Post' : 'View Service'}
                  onPress={openPost}
                />
                <IconAction icon="person" label="View Profile" onPress={openProfile} />
              </View>
            </View>
          ) : null}

          {conversation ? (
            <View style={styles.detailsCard}>
              <Text style={styles.sectionTitle}>{conversation.jobId ? 'Job Details' : 'Service Details'}</Text>
              <View style={styles.detailsGrid}>
                {getDetailMetrics(conversation).map((metric) => (
                  <View key={metric.label} style={styles.metric}>
                    <Text style={styles.metricLabel}>{metric.label}</Text>
                    <Text style={styles.metricValue}>{metric.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {conversation ? (
            <>
              <ActionList title="Actions">
                {canMarkHired ? (
                  <ActionRow icon="check-circle" label="Mark worker hired" onPress={onMarkHired} />
                ) : null}
                <ActionRow
                  description="Available after the work is completed"
                  disabled
                  icon="rate-review"
                  label="Leave review"
                  onPress={() => {}}
                />
                <ActionRow
                  icon="search"
                  label="Search a conversation"
                  onPress={() => Alert.alert('Search', 'Use the Messages search field from the inbox.')}
                />
              </ActionList>

              <ActionList title="Privacy and support">
                <ActionRow
                  description="Give feedback and report conversation"
                  icon="report"
                  label="Report"
                  onPress={() => setReportVisible(true)}
                />
                <ActionRow
                  danger
                  description="Remove this conversation from your inbox"
                  icon="logout"
                  label="Delete chat"
                  onPress={() => setDeleteVisible(true)}
                />
              </ActionList>
            </>
          ) : null}
        </ScrollView>
      </View>

      <ReportSheet
        onClose={() => setReportVisible(false)}
        onReport={onReport}
        visible={reportVisible}
      />

      <DeleteChatDialog
        onCancel={() => setDeleteVisible(false)}
        onDelete={onDelete}
        visible={deleteVisible}
      />
    </SafeAreaView>
  );
}

function IconAction({
  icon,
  label,
  onPress,
}: {
  icon: MaterialIconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.iconAction, pressed && styles.pressed]}>
      <MaterialIcons color={color.textMuted} name={icon} size={22} />
      <Text style={styles.iconActionText}>{label}</Text>
    </Pressable>
  );
}

function ActionList({ children, title }: { children: ReactNode; title: string }) {
  return (
    <View style={styles.actionListWrap}>
      <Text style={styles.actionListTitle}>{title}</Text>
      <View style={styles.actionList}>{children}</View>
    </View>
  );
}

function ActionRow({
  danger,
  description,
  disabled,
  icon,
  label,
  onPress,
}: {
  danger?: boolean;
  description?: string;
  disabled?: boolean;
  icon: MaterialIconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionRow,
        danger && styles.actionRowDangerSurface,
        pressed && styles.pressed,
        disabled && styles.actionRowDisabled,
      ]}>
      <MaterialIcons color={danger ? color.danger : color.text} name={icon} size={22} />
      <View style={styles.actionRowCopy}>
        <Text style={[styles.actionRowLabel, danger && styles.actionRowDanger]}>{label}</Text>
        {description ? <Text style={styles.actionRowDescription}>{description}</Text> : null}
      </View>
    </Pressable>
  );
}

function ReportSheet({
  onClose,
  onReport,
  visible,
}: {
  onClose: () => void;
  onReport: (reason: string) => void;
  visible: boolean;
}) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.sheetBackdrop}>
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={styles.reportSheet}>
          <Text style={styles.reportTitle}>Report user</Text>
          <Text style={styles.reportBody}>
            We will not let the person know who reported them. If someone is in immediate danger,
            call local emergency services. Do not wait.
          </Text>
          {REPORT_REASONS.map((reason) => (
            <Pressable key={reason} onPress={() => onReport(reason)} style={styles.reportReason}>
              <Text style={styles.reportReasonText}>{reason}</Text>
              <MaterialIcons color={color.verificationBlue} name="chevron-right" size={24} />
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

function DeleteChatDialog({
  onCancel,
  onDelete,
  visible,
}: {
  onCancel: () => void;
  onDelete: () => void;
  visible: boolean;
}) {
  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={visible}>
      <View style={styles.dialogBackdrop}>
        <View style={styles.dialogCard}>
          <Text style={styles.dialogTitle}>Delete chat?</Text>
          <Text style={styles.dialogBody}>This removes the conversation from your active inbox.</Text>
          <PrimaryButton label="Delete" onPress={onDelete} />
          <Pressable onPress={onCancel} style={styles.dialogCancel}>
            <Text style={styles.dialogCancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function DetailsSkeleton() {
  return (
    <>
      <View style={styles.hero}>
        <Skeleton height={52} width={52} borderRadius={26} />
        <Skeleton height={18} width="46%" />
        <Skeleton height={14} width="60%" />
      </View>
      <View style={styles.detailsCard}>
        <Skeleton height={16} width="32%" />
        <View style={styles.detailsGrid}>
          <Skeleton height={42} width="46%" />
          <Skeleton height={42} width="46%" />
          <Skeleton height={42} width="46%" />
          <Skeleton height={42} width="46%" />
        </View>
      </View>
    </>
  );
}

function getContextSummary(conversation: ConversationDetail) {
  if (conversation.job) {
    const budget = conversation.job.budgetAmount ? `PHP ${conversation.job.budgetAmount}` : 'Budget to coordinate';
    return {
      title: formatJobPostTitle({
        title: conversation.job.title,
        serviceNeeded: conversation.job.serviceNeeded,
        category: conversation.job.category,
      }),
      subtitle: `Job by ${conversation.client?.fullName ?? 'Konektado resident'} - ${getMarketplaceLocation(conversation.job)} - ${conversation.job.scheduleText ?? 'Schedule to coordinate'} - ${budget}`,
    };
  }

  if (conversation.service) {
    return {
      title: formatServicePostTitle({
        title: conversation.service.title,
        category: conversation.service.category,
        cue: conversation.service.isActive ? 'availableFor' : 'offers',
      }),
      subtitle: `Service by ${conversation.provider?.fullName ?? 'Konektado resident'} - ${getMarketplaceLocation(conversation.service)} - ${conversation.service.rateText ?? 'Rate to coordinate'}`,
    };
  }

  return {
    title: 'Marketplace chat',
    subtitle: 'Konektado conversation',
  };
}

function getDetailMetrics(conversation: ConversationDetail) {
  if (conversation.job) {
    return [
      { label: 'Budget', value: conversation.job.budgetAmount ? `PHP ${conversation.job.budgetAmount}` : 'To coordinate' },
      { label: 'Location', value: getMarketplaceLocation(conversation.job) },
      { label: 'Schedule', value: conversation.job.scheduleText ?? 'Not yet agreed' },
      { label: 'Job Status', value: formatStatus(conversation.status) },
    ];
  }

  if (conversation.service) {
    return [
      { label: 'Rate', value: conversation.service.rateText ?? 'To coordinate' },
      { label: 'Location', value: getMarketplaceLocation(conversation.service) },
      { label: 'Availability', value: conversation.service.availabilityText ?? 'To coordinate' },
      { label: 'Status', value: formatStatus(conversation.status) },
    ];
  }

  return [{ label: 'Status', value: formatStatus(conversation.status) }];
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function formatStatus(value: string) {
  return value
    .split('_')
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ');
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
    backgroundColor: color.background,
    borderBottomColor: color.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: 20,
  },
  headerIcon: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 17,
    lineHeight: 23,
  },
  content: {
    backgroundColor: color.background,
    gap: 18,
    paddingBottom: 48,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  hero: {
    alignItems: 'center',
    gap: 7,
    paddingVertical: 2,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    position: 'relative',
    width: 52,
  },
  avatarText: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 22,
  },
  onlineDot: {
    bottom: 0,
    right: 0,
  },
  title: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 18,
    lineHeight: 23,
    textAlign: 'center',
  },
  subtitle: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    width: '100%',
  },
  iconAction: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderColor: color.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  iconActionText: {
    color: color.text,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 18,
  },
  detailsCard: {
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  sectionTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 18,
  },
  detailsGrid: {
    columnGap: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 14,
  },
  metric: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  metricLabel: {
    color: color.textSubtle,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  metricValue: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  actionListWrap: {
    gap: 8,
  },
  actionListTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 18,
  },
  actionList: {
    backgroundColor: color.surfaceAlt,
    borderColor: color.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    padding: 6,
  },
  actionRow: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 12,
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionRowDangerSurface: {
    backgroundColor: color.dangerSoft,
  },
  actionRowDisabled: {
    opacity: 0.58,
  },
  actionRowCopy: {
    flex: 1,
    gap: 3,
  },
  actionRowLabel: {
    color: color.text,
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  actionRowDanger: {
    color: color.danger,
  },
  actionRowDescription: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 11,
    lineHeight: 15,
  },
  sheetBackdrop: {
    backgroundColor: 'rgba(58,58,58,0.5)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  reportSheet: {
    backgroundColor: color.cardTint,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 10,
    minHeight: '88%',
    padding: 24,
  },
  reportTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 22,
  },
  reportBody: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  reportReason: {
    alignItems: 'center',
    borderBottomColor: '#C0C0C0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 36,
    paddingVertical: 6,
  },
  reportReasonText: {
    color: color.text,
    flex: 1,
    fontFamily: 'Satoshi-Regular',
    fontSize: 16,
    lineHeight: 22,
  },
  dialogBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(58,58,58,0.35)',
    flex: 1,
    justifyContent: 'center',
    padding: 27,
  },
  dialogCard: {
    backgroundColor: color.background,
    borderRadius: 16,
    gap: 12,
    padding: 24,
    width: '100%',
  },
  dialogTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  dialogBody: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  dialogCancel: {
    alignItems: 'center',
    backgroundColor: color.cardTint,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 38,
  },
  dialogCancelText: {
    color: color.text,
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.72,
  },
});
