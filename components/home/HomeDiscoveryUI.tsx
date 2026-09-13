import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { color, radius } from '@/constants/theme';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

/**
 * Hero metrics measured from the Figma frame (390x844):
 *   status bar ends 38, greeting 65, location 100, search 143-188,
 *   blue band bottom ~146, segmented control 207.
 * Kept as named constants so the relationships stay readable, and applied as
 * padding/margin rather than absolute positions so the band reflows when the
 * greeting or address wraps on narrow screens.
 */
const HERO_TOP_GAP = 27; // 65 - 38
const HERO_BAND_BOTTOM_GAP = 27; // band bottom (146) - location bottom (119)
const HERO_SEARCH_OVERLAP = 3; // band bottom (146) - search top (143)
const HERO_SEARCH_HEIGHT = 45;
const HERO_SEARCH_BOTTOM_GAP = 19; // segmented control (207) - search bottom (188)
const HERO_SIDE_PADDING = 24;
const HERO_BAND_RADIUS = 24;

/**
 * Blue hero band used behind the greeting, location, and search entry.
 * Uses `react-native-svg` because the project does not depend on
 * `expo-linear-gradient`.
 */
/**
 * Values sampled from the Figma frame (390x844), so the band matches the design
 * rather than approximating it:
 *   gradient  diagonal, #4587D7 (top-left) -> #69A4EC (bottom-right, = brand primary)
 *   sun       #FCC03B circle, r 25.5, centred at 78% width ON the band's bottom
 *             edge, so the band's `overflow: hidden` clips it to a half sun
 *   ring      concentric white arc, r 39.5
 *
 * Positions are proportional (percentages) so the band scales across widths;
 * only the sun's radius is fixed, because it is an icon, not a layout element.
 */
function HeroBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/*
        `StyleSheet.absoluteFill` on the Svg itself is required: with only
        height="100%"/width="100%" the SVG viewport collapses inside an
        absolutely positioned parent, so the gradient Rect paints a sliver and
        the whole band reads as white.
      */}
      <Svg height="100%" style={StyleSheet.absoluteFill} width="100%">
        <Defs>
          <LinearGradient id="homeHeroGradient" x1="0" x2="1" y1="0" y2="0.65">
            <Stop offset="0" stopColor="#4587D7" />
            <Stop offset="1" stopColor="#69A4EC" />
          </LinearGradient>
        </Defs>
        <Rect fill="url(#homeHeroGradient)" height="100%" width="100%" />
        <Circle
          cx="78%"
          cy="100%"
          fill="none"
          opacity={0.28}
          r="39.5"
          stroke={color.white}
          strokeWidth={1.5}
        />
        <Circle cx="78%" cy="100%" fill={color.accentYellow} r="25.5" />
      </Svg>
    </View>
  );
}

export function HomeHero({
  activeFilterCount = 0,
  greeting,
  locationLabel,
  onNotifications,
  onOpenFilters,
  onOpenLocation,
  onOpenSearch,
  topInset,
  unreadCount = 0,
}: {
  activeFilterCount?: number;
  greeting: string;
  locationLabel: string;
  onNotifications: () => void;
  onOpenFilters: () => void;
  onOpenLocation?: () => void;
  onOpenSearch: () => void;
  topInset: number;
  unreadCount?: number;
}) {
  return (
    <View style={styles.hero}>
      {/*
        The blue band wraps only the greeting and location. The search bar sits
        below it and overlaps its bottom edge by SEARCH_OVERLAP, which is what
        makes it read as straddling the blue/white boundary in the Figma.
        The band is sized by its content, not a fixed height, so it stays
        correct when the greeting or address wraps.
      */}
      <View style={[styles.heroBand, { paddingTop: Math.max(topInset, 8) + HERO_TOP_GAP }]}>
        <HeroBackground />

        <View style={styles.heroTopRow}>
          <Text numberOfLines={1} style={styles.greeting}>
            {greeting}
          </Text>
          <Pressable
            accessibilityLabel="Notifications"
            accessibilityRole="button"
            onPress={onNotifications}
            style={({ pressed }) => [styles.bellButton, pressed && styles.pressed]}>
            <MaterialIcons color={color.white} name="notifications" size={24} />
            {unreadCount > 0 ? (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <Pressable
          accessibilityHint={onOpenLocation ? 'Opens your service area' : undefined}
          accessibilityLabel={`Your location: ${locationLabel}`}
          accessibilityRole={onOpenLocation ? 'button' : 'text'}
          disabled={!onOpenLocation}
          onPress={onOpenLocation}
          style={({ pressed }) => [styles.locationRow, pressed && styles.pressed]}>
          <MaterialIcons color={color.accentYellow} name="location-on" size={19} />
          <Text numberOfLines={1} style={styles.locationText}>
            {locationLabel}
          </Text>
          {onOpenLocation ? (
            <MaterialIcons color={color.white} name="keyboard-arrow-down" size={18} />
          ) : null}
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <Pressable
          accessibilityHint="Opens search with filters, categories, and rate range"
          accessibilityLabel="Search for a job or service"
          accessibilityRole="search"
          onPress={onOpenSearch}
          style={({ pressed }) => [styles.searchBar, pressed && styles.pressed]}>
          <MaterialIcons color={color.accentYellow} name="search" size={22} />
          <Text numberOfLines={1} style={styles.searchPlaceholder}>
            Kailangan ko ng ...
          </Text>
          <View style={styles.searchDivider} />
          <Pressable
            accessibilityLabel="Feed filters"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onOpenFilters}
            style={({ pressed }) => [styles.searchTune, pressed && styles.pressed]}>
            <MaterialIcons color={color.textMuted} name="tune" size={20} />
            {activeFilterCount > 0 ? (
              <View style={styles.tuneBadge}>
                <Text style={styles.tuneBadgeText}>
                  {activeFilterCount > 9 ? '9+' : activeFilterCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </View>
    </View>
  );
}

export function HomeSectionLink({
  actionLabel = 'See all',
  onAction,
  title,
}: {
  actionLabel?: string;
  onAction?: () => void;
  title: string;
}) {
  return (
    <View style={styles.sectionLink}>
      <Text style={styles.sectionLinkTitle}>{title}</Text>
      {onAction ? (
        <Pressable
          accessibilityLabel={`${actionLabel}: ${title}`}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onAction}
          style={({ pressed }) => [styles.sectionLinkAction, pressed && styles.pressed]}>
          <Text style={styles.sectionLinkActionText}>{actionLabel}</Text>
          <MaterialIcons color={color.verificationBlue} name="chevron-right" size={18} />
        </Pressable>
      ) : null}
    </View>
  );
}

export type HomeCategoryTile = {
  key: string;
  icon: MaterialIconName;
  label: string;
};

/**
 * Category shortcuts into Search. Tiles are generated from the controlled
 * service taxonomy, so this grid never invents category names.
 */
export function HomeCategoryGrid({
  onSelect,
  tiles,
}: {
  onSelect: (key: string) => void;
  tiles: HomeCategoryTile[];
}) {
  return (
    <View style={styles.categoryGrid}>
      {tiles.map((tile) => (
        <Pressable
          accessibilityLabel={tile.label}
          accessibilityRole="button"
          key={tile.key}
          onPress={() => onSelect(tile.key)}
          style={({ pressed }) => [styles.categoryTile, pressed && styles.pressed]}>
          <View style={styles.categoryIcon}>
            <MaterialIcons color={color.verificationBlue} name={tile.icon} size={28} />
          </View>
          <Text numberOfLines={2} style={styles.categoryLabel}>
            {tile.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function HomePromoBanner() {
  return (
    <View style={styles.promoOuter}>
      <View style={styles.promoCard}>
        <View style={styles.promoBadge}>
          <MaterialIcons color={color.text} name="star" size={12} />
          <Text style={styles.promoBadgeText}>Featured</Text>
        </View>
        <Text style={styles.promoTitle}>Support Local.{'\n'}Hire with Confidence.</Text>
        <Text style={styles.promoBody}>
          Barangay-verified neighbours, right here in your community. Payment and the final
          agreement happen outside Konektado.
        </Text>
        <View pointerEvents="none" style={styles.promoGlyph}>
          <MaterialIcons color={color.accentYellow} name="volunteer-activism" size={72} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingBottom: HERO_SEARCH_BOTTOM_GAP,
  },
  heroBand: {
    // Solid fill is the fallback, not decoration: the band's text is white, so
    // if the SVG ever fails to paint it must still be blue, never white.
    backgroundColor: '#4587D7',
    borderBottomLeftRadius: HERO_BAND_RADIUS,
    borderBottomRightRadius: HERO_BAND_RADIUS,
    // Clips the sun circle into the half sun the Figma shows.
    overflow: 'hidden',
    paddingBottom: HERO_BAND_BOTTOM_GAP,
    paddingHorizontal: HERO_SIDE_PADDING,
  },
  heroTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  greeting: {
    color: color.white,
    flex: 1,
    fontFamily: 'Satoshi-Bold',
    fontSize: 24,
    lineHeight: 32,
  },
  bellButton: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    position: 'relative',
    width: 28,
  },
  bellBadge: {
    alignItems: 'center',
    backgroundColor: color.accentYellow,
    borderColor: color.white,
    borderRadius: 8,
    borderWidth: 1,
    height: 16,
    justifyContent: 'center',
    minWidth: 16,
    paddingHorizontal: 4,
    position: 'absolute',
    right: -6,
    top: -5,
  },
  bellBadgeText: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 9,
    lineHeight: 11,
  },
  locationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 3, // Figma: greeting bottom 97 -> location top 100
    minHeight: 19,
  },
  locationText: {
    color: color.white,
    flexShrink: 1,
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  searchRow: {
    // Negative margin pulls the bar up over the band's bottom edge so it
    // straddles the blue/white boundary, as measured in the Figma.
    marginTop: -HERO_SEARCH_OVERLAP,
    paddingHorizontal: HERO_SIDE_PADDING,
  },
  searchBar: {
    alignItems: 'center',
    backgroundColor: color.white,
    borderRadius: 24,
    elevation: 3,
    flexDirection: 'row',
    gap: 10,
    minHeight: HERO_SEARCH_HEIGHT,
    paddingHorizontal: 16,
    shadowColor: '#0B2545',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  searchPlaceholder: {
    color: color.textSubtle,
    flex: 1,
    fontFamily: 'Satoshi-Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  searchDivider: {
    backgroundColor: color.border,
    height: 22,
    width: 1,
  },
  searchTune: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    position: 'relative',
    width: 28,
  },
  tuneBadge: {
    alignItems: 'center',
    backgroundColor: color.accentYellow,
    borderColor: color.white,
    borderRadius: 8,
    borderWidth: 1,
    height: 16,
    justifyContent: 'center',
    minWidth: 16,
    paddingHorizontal: 4,
    position: 'absolute',
    right: -6,
    top: -5,
  },
  tuneBadgeText: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 9,
    lineHeight: 11,
  },
  sectionLink: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionLinkTitle: {
    color: color.text,
    flex: 1,
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 22,
  },
  sectionLinkAction: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  sectionLinkActionText: {
    color: color.verificationBlue,
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  categoryTile: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    paddingVertical: 10,
    width: '33.333%',
  },
  categoryIcon: {
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: radius.lg,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  categoryLabel: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 11,
    lineHeight: 15,
    minHeight: 30,
    textAlign: 'center',
  },
  promoOuter: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  promoCard: {
    backgroundColor: color.cardTint,
    borderRadius: radius.lg,
    gap: 8,
    overflow: 'hidden',
    padding: 16,
  },
  promoBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: color.accentYellow,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  promoBadgeText: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 10,
    lineHeight: 14,
  },
  promoTitle: {
    color: '#0B2545',
    fontFamily: 'Satoshi-Bold',
    fontSize: 18,
    lineHeight: 24,
  },
  promoBody: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 18,
    maxWidth: '78%',
  },
  promoGlyph: {
    bottom: -8,
    opacity: 0.35,
    position: 'absolute',
    right: -6,
  },
  pressed: {
    opacity: 0.75,
  },
});
