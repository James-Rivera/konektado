import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { color, radius } from '@/constants/theme';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

/**
 * Hero metrics measured off the Figma frame (390x844) by sampling pixels:
 *   status bar ends 38 | greeting 65 | location 100 | search bar 143-188
 *   blue band bottom 168 | segmented control 207
 *
 * The band runs BEHIND the search bar: it ends at 168 while the bar spans
 * 143-188, so the bar covers the band's lower 25px. That overlap is what makes
 * the bar read as straddling the blue/white boundary, and it is also what clips
 * the sun - the band itself does not.
 *
 * Kept as named constants and applied as padding/margin rather than absolute
 * positions, so the band reflows when the greeting or address wraps.
 */
const HERO_TOP_GAP = 27; // greeting 65 - status bar 38
const HERO_BAND_BOTTOM_GAP = 49; // band bottom 168 - location bottom 119
const HERO_SEARCH_OVERLAP = 25; // band bottom 168 - search top 143
const HERO_SEARCH_HEIGHT = 45; // search 143 -> 188
const HERO_SEARCH_BOTTOM_GAP = 19; // segmented control 207 - search bottom 188
const HERO_SIDE_PADDING = 24;

// The band's bottom corners are deliberately asymmetric in the design.
const HERO_BAND_RADIUS_LEFT = 50;
const HERO_BAND_RADIUS_RIGHT = 10;

// Sun: #FCC03B circle centred at 77.8% width, sitting on the search bar's top
// edge, so the search bar - not the band - clips its lower half.
const HERO_SUN_RADIUS = 25.5;
const HERO_SUN_RING_RADIUS = 35;
const HERO_SUN_CENTRE_X = '77.8%';

/**
 * Blue hero band, sampled from the Figma rather than approximated. Uses
 * `react-native-svg` for the gradient because the project has no
 * `expo-linear-gradient` dependency.
 *
 *   gradient  shallow diagonal, #4587D7 (top-left) -> #69A4EC (bottom-right,
 *             which is exactly `color.primary`)
 *   sun       #FCC03B circle, r 25.5, centre at 77.8% width sitting on the
 *             search bar's top edge
 *   ring      concentric #FCC03B stroke at r 35, ~35% opacity
 *
 * The horizontal centre is a percentage so it scales across widths; radii stay
 * fixed because they are icon-sized, not layout-sized.
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
      </Svg>
      {/*
        Sun and ring are plain Views anchored to the band's BOTTOM, not SVG
        percentages, because the band's height depends on the safe-area inset
        and on whether the greeting or address wraps. Anchoring to the bottom
        keeps the sun on the search bar's edge at every height.
      */}
      <View style={styles.sunRing} />
      <View style={styles.sun} />
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


const styles = StyleSheet.create({
  hero: {
    paddingBottom: HERO_SEARCH_BOTTOM_GAP,
  },
  heroBand: {
    // Solid fill is the fallback, not decoration: the band's text is white, so
    // if the SVG ever fails to paint it must still be blue, never white.
    backgroundColor: '#4587D7',
    borderBottomLeftRadius: HERO_BAND_RADIUS_LEFT,
    borderBottomRightRadius: HERO_BAND_RADIUS_RIGHT,
    overflow: 'hidden',
    paddingBottom: HERO_BAND_BOTTOM_GAP,
    paddingHorizontal: HERO_SIDE_PADDING,
  },
  sun: {
    backgroundColor: color.accentYellow,
    borderRadius: HERO_SUN_RADIUS,
    // Centre sits on the search bar's top edge, so the bar clips its lower half.
    bottom: -(HERO_SUN_RADIUS - HERO_SEARCH_OVERLAP),
    height: HERO_SUN_RADIUS * 2,
    left: HERO_SUN_CENTRE_X,
    marginLeft: -HERO_SUN_RADIUS,
    position: 'absolute',
    width: HERO_SUN_RADIUS * 2,
  },
  sunRing: {
    borderColor: color.accentYellow,
    borderRadius: HERO_SUN_RING_RADIUS,
    borderWidth: 1.5,
    bottom: -(HERO_SUN_RING_RADIUS - HERO_SEARCH_OVERLAP),
    height: HERO_SUN_RING_RADIUS * 2,
    left: HERO_SUN_CENTRE_X,
    marginLeft: -HERO_SUN_RING_RADIUS,
    opacity: 0.35,
    position: 'absolute',
    width: HERO_SUN_RING_RADIUS * 2,
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
  pressed: {
    opacity: 0.75,
  },
});
