import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { CachedRemoteImage } from '@/components/CachedRemoteImage';
import { PresenceDot } from '@/components/PresenceDot';
import { color, radius, space, typography } from '@/constants/theme';
import { useProfile, type ProfileRecord } from '@/hooks/use-profile';
import { isPresenceActive } from '@/services/marketplace.helpers';
import { getAvatarDisplayUrl } from '@/utils/image-processing';

type CurrentUserIdentityRowProps = {
  showEmail?: boolean;
  showPresence?: boolean;
  size?: 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  subtitle?: string;
};

export function CurrentUserIdentityRow({
  showEmail = false,
  showPresence = true,
  size = 'md',
  style,
  subtitle,
}: CurrentUserIdentityRowProps) {
  const { profile } = useProfile();
  const displayName = getProfileDisplayName(profile);
  const secondaryText = showEmail ? profile?.email ?? 'Signed in account' : subtitle;
  const avatarSize = size === 'lg' ? 54 : 46;
  const avatarUrl = getAvatarDisplayUrl({ avatarUrl: profile?.avatar_url });

  return (
    <View style={[styles.row, style]}>
      <View style={[styles.avatar, { height: avatarSize, width: avatarSize }]}>
        {avatarUrl ? (
          <CachedRemoteImage uri={avatarUrl} style={styles.avatarImage} />
        ) : (
          <Text style={[styles.avatarText, size === 'lg' && styles.avatarTextLarge]}>
            {getProfileInitials(displayName)}
          </Text>
        )}
        {showPresence ? (
          <PresenceDot
            active={isPresenceActive(profile?.availability)}
            size={12}
            style={styles.avatarDot}
          />
        ) : null}
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.name}>
          {displayName}
        </Text>
        {secondaryText ? (
          <Text numberOfLines={1} style={styles.meta}>
            {secondaryText}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function getProfileDisplayName(profile: ProfileRecord | null | undefined) {
  return (
    profile?.full_name?.trim() ||
    `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() ||
    'Konektado resident'
  );
}

export function getProfileInitials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'K'
  );
}

const styles = StyleSheet.create({
  row: {
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
    justifyContent: 'center',
    overflow: 'visible',
    position: 'relative',
  },
  avatarImage: {
    borderRadius: radius.pill,
    height: '100%',
    width: '100%',
  },
  avatarText: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 20,
  },
  avatarTextLarge: {
    color: color.verificationBlue,
    fontSize: 18,
    lineHeight: 24,
  },
  avatarDot: {
    bottom: 0,
    right: 0,
  },
  copy: {
    flex: 1,
    gap: space['2xs'],
    minWidth: 0,
  },
  name: {
    ...typography.sectionTitle,
    color: color.text,
  },
  meta: {
    ...typography.caption,
    color: color.textMuted,
  },
});
