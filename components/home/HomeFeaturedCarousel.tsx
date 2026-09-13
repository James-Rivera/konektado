import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';

import { color, radius } from '@/constants/theme';

export type HomeFeaturedCard = {
  id: string;
  badge?: string;
  title: string;
  body?: string;
  /**
   * Optional artwork sitting on the right of the card.
   *
   * To swap it: drop a PNG into `assets/images/` and set
   * `image: require('@/assets/images/<file>.png')`. Nothing else needs to
   * change - the card lays out the same with or without an image, so a missing
   * or not-yet-exported illustration never breaks the carousel.
   */
  image?: ImageSourcePropType;
  onPress?: () => void;
};

/**
 * Card copy and artwork for the Home featured carousel.
 *
 * This is deliberately a plain exported array so it can be edited without
 * touching the carousel itself. Add, remove, or reorder entries freely; the
 * dots and paging follow the array length.
 */
export const HOME_FEATURED_CARDS: HomeFeaturedCard[] = [
  {
    id: 'support-local',
    badge: 'Featured',
    title: 'Support Local.\nHire with Confidence.',
    body: 'Barangay-verified neighbours, right here in your community.',
    // image: require('@/assets/images/featured-support-local.png'),
  },
  {
    id: 'verified-neighbours',
    badge: 'Trust',
    title: 'Barangay verified.',
    body: 'Every provider is reviewed by your barangay before they can be hired.',
    // image: require('@/assets/images/featured-verified.png'),
  },
  {
    id: 'agree-outside',
    badge: 'How it works',
    title: 'Agree on the details\nbetween you.',
    body: 'Konektado helps you find and coordinate. Payment happens outside the app.',
    // image: require('@/assets/images/featured-agreement.png'),
  },
];

const CARD_HEIGHT = 130; // Figma: banner frame is 362 x 130

export function HomeFeaturedCarousel({
  cards = HOME_FEATURED_CARDS,
}: {
  cards?: HomeFeaturedCard[];
}) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  if (!cards.length) return null;

  const slideWidth = containerWidth || 0;

  return (
    <View
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
      style={styles.wrapper}>
      <ScrollView
        horizontal
        onMomentumScrollEnd={(event) => {
          if (!slideWidth) return;
          const next = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
          setActiveIndex(Math.min(Math.max(next, 0), cards.length - 1));
        }}
        pagingEnabled
        scrollEnabled={cards.length > 1}
        showsHorizontalScrollIndicator={false}>
        {cards.map((card) => (
          <View key={card.id} style={slideWidth ? { width: slideWidth } : undefined}>
            <FeaturedCard card={card} />
          </View>
        ))}
      </ScrollView>

      {cards.length > 1 ? (
        <View style={styles.dots}>
          {cards.map((card, index) => (
            <View
              key={card.id}
              style={[styles.dot, index === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function FeaturedCard({ card }: { card: HomeFeaturedCard }) {
  const content = (
    <View style={styles.card}>
      <View style={styles.cardCopy}>
        {card.badge ? (
          <View style={styles.badge}>
            <MaterialIcons color={color.text} name="star" size={12} />
            <Text style={styles.badgeText}>{card.badge}</Text>
          </View>
        ) : null}
        <Text style={styles.cardTitle}>{card.title}</Text>
        {card.body ? (
          <Text numberOfLines={2} style={styles.cardBody}>
            {card.body}
          </Text>
        ) : null}
      </View>

      {card.image ? (
        <Image resizeMode="contain" source={card.image} style={styles.cardImage} />
      ) : null}
    </View>
  );

  if (!card.onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={card.onPress}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: 20,
  },
  card: {
    backgroundColor: '#FCF9F3', // sampled from the Figma banner fill
    borderRadius: radius.lg,
    flexDirection: 'row',
    height: CARD_HEIGHT,
    overflow: 'hidden',
    padding: 16,
  },
  cardCopy: {
    flex: 1,
    gap: 6,
    justifyContent: 'center',
    minWidth: 0,
  },
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: color.accentYellow,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 10,
    lineHeight: 14,
  },
  cardTitle: {
    color: '#0B2545',
    fontFamily: 'Satoshi-Bold',
    fontSize: 17,
    lineHeight: 22,
  },
  cardBody: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  cardImage: {
    alignSelf: 'center',
    height: '100%',
    marginLeft: 8,
    width: 110,
  },
  dots: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    paddingTop: 10,
  },
  dot: {
    backgroundColor: color.border,
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  dotActive: {
    backgroundColor: color.accentYellow,
    width: 16,
  },
  pressed: {
    opacity: 0.85,
  },
});
