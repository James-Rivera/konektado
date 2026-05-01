import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import {
  GradientImageScreen,
  OnboardingButton,
  onboardingColors,
} from '@/components/onboarding/FigmaOnboarding';

const SLIDE_DURATION_MS = 7000;
const PAGE_TRANSITION_MS = 1100;
const PROGRESS_WIDTH = 144;
const PROGRESS_GAP = 8;
const PROGRESS_SEGMENT_WIDTH = (PROGRESS_WIDTH - PROGRESS_GAP * 2) / 3;

const INTRO_SLIDES = [
  {
    title: 'Opportunities are closer than you think.',
    subtitle: 'Find work within your community.',
    source: require('../../assets/images/onboarding-intro-1-figma.jpg'),
    darkness: 0.2,
  },
  {
    title: 'Work with people you can trust.',
    subtitle: 'Approved by your barangay.',
    source: require('../../assets/images/onboarding-intro-2-figma.jpg'),
    darkness: 0.2,
  },
  {
    title: 'Find help or offer your skills.',
    subtitle: 'Post jobs, apply for work, and connect with verified residents.',
    source: require('../../assets/images/onboarding-intro-3-figma.jpg'),
    darkness: 0.32,
  },
] as const;

const CAROUSEL_SLIDES = [...INTRO_SLIDES, INTRO_SLIDES[0]];

export default function AuthIntroScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pageRef = useRef(0);
  const scrollTransitionRef = useRef<Animated.CompositeAnimation | null>(null);
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);

  const goToLogin = () => {
    router.push('/(auth)/login');
  };

  const goToRole = () => {
    router.push('/(auth)/role');
  };

  const setVisiblePage = useCallback((nextPage: number) => {
    pageRef.current = nextPage;
    setPage(nextPage);
  }, []);

  const showPage = useCallback(
    (nextPage: number) => {
      scrollTransitionRef.current?.stop();

      const fromX = pageRef.current * width;
      const toX = nextPage * width;
      const scrollX = new Animated.Value(fromX);
      const listenerId = scrollX.addListener(({ value }) => {
        scrollRef.current?.scrollTo({ animated: false, x: value });
      });

      const transition = Animated.timing(scrollX, {
        duration: PAGE_TRANSITION_MS,
        easing: Easing.inOut(Easing.cubic),
        toValue: toX,
        useNativeDriver: false,
      });

      scrollTransitionRef.current = transition;

      transition.start(({ finished }) => {
        scrollX.removeListener(listenerId);
        scrollTransitionRef.current = null;

        if (!finished) return;

        if (nextPage >= INTRO_SLIDES.length) {
          scrollRef.current?.scrollTo({ animated: false, x: 0 });
          setVisiblePage(0);
          return;
        }

        setVisiblePage(nextPage);
      });
    },
    [setVisiblePage, width]
  );

  useEffect(() => {
    return () => {
      scrollTransitionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (pageRef.current !== page) {
      pageRef.current = page;
    }
  }, [page]);

  useEffect(() => {
    if (!width) return;
    scrollRef.current?.scrollTo({ animated: false, x: pageRef.current * width });
  }, [width]);

  const snapToPage = useCallback(
    (nextPage: number) => {
      if (nextPage >= INTRO_SLIDES.length) {
        scrollRef.current?.scrollTo({ animated: false, x: 0 });
        setVisiblePage(0);
        return;
      }

      setVisiblePage(nextPage);
    },
    [setVisiblePage]
  );

  useEffect(() => {
    progressAnim.setValue(0);
    const animation = Animated.timing(progressAnim, {
      duration: SLIDE_DURATION_MS,
      easing: Easing.linear,
      toValue: 1,
      useNativeDriver: false,
    });

    animation.start(({ finished }) => {
      if (!finished) return;
      showPage(page === INTRO_SLIDES.length - 1 ? INTRO_SLIDES.length : page + 1);
    });

    return () => {
      animation.stop();
    };
  }, [page, progressAnim, showPage]);

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextPage = Math.round(event.nativeEvent.contentOffset.x / width);
    snapToPage(nextPage);
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" translucent />
      <ScrollView
        ref={scrollRef}
        horizontal
        onMomentumScrollEnd={onMomentumScrollEnd}
        pagingEnabled
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        style={styles.carousel}>
        {CAROUSEL_SLIDES.map((slide, index) => (
          <View key={`${slide.title}-${index}`} style={[styles.slide, { width }]}>
            <GradientImageScreen darkness={slide.darkness} source={slide.source}>
              <View style={styles.slideContent}>
                <View style={styles.copyBlock}>
                  <Text style={styles.title}>{slide.title}</Text>
                  <Text style={styles.subtitle}>{slide.subtitle}</Text>
                  <IntroPagination currentPage={page} progress={progressAnim} />
                </View>

                <View style={styles.actionBlock}>
                  <OnboardingButton label="Get Started" onPress={goToRole} />
                  <Pressable accessibilityRole="link" onPress={goToLogin} style={styles.loginLink}>
                    <Text style={styles.loginText}>
                      Already have an account? <Text style={styles.loginTextBold}>Login</Text>
                    </Text>
                  </Pressable>
                </View>
              </View>
            </GradientImageScreen>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function IntroPagination({
  currentPage,
  progress,
}: {
  currentPage: number;
  progress: Animated.Value;
}) {
  const animatedWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, PROGRESS_SEGMENT_WIDTH],
  });

  return (
    <View style={styles.progressRow}>
      {INTRO_SLIDES.map((slide, index) => (
        <View key={slide.title} style={styles.progressSegment}>
          {index < currentPage ? <View style={styles.progressFillComplete} /> : null}
          {index === currentPage ? <Animated.View style={[styles.progressFillAnimated, { width: animatedWidth }]} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#1D4F91',
    flex: 1,
  },
  carousel: {
    flex: 1,
  },
  slide: {
    flex: 1,
  },
  slideContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 8,
    paddingHorizontal: 26,
    paddingTop: 50,
  },
  copyBlock: {
    alignItems: 'flex-start',
    gap: 10,
    maxWidth: 333,
  },
  title: {
    color: onboardingColors.white,
    fontFamily: 'Satoshi-Black',
    fontSize: 40,
    lineHeight: 39,
  },
  subtitle: {
    color: onboardingColors.white,
    fontFamily: 'Satoshi-Regular',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  actionBlock: {
    gap: 5,
    paddingBottom: 16,
    paddingHorizontal: 3,
  },
  loginLink: {
    alignItems: 'center',
    minHeight: 26,
    justifyContent: 'center',
  },
  loginText: {
    color: onboardingColors.white,
    fontFamily: 'Satoshi-Regular',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  loginTextBold: {
    fontFamily: 'Satoshi-Bold',
    textDecorationLine: 'underline',
  },
  progressRow: {
    flexDirection: 'row',
    gap: PROGRESS_GAP,
    height: 6,
    width: PROGRESS_WIDTH,
  },
  progressSegment: {
    backgroundColor: 'rgba(246, 246, 239, 0.6)',
    borderRadius: 3,
    height: 6,
    overflow: 'hidden',
    width: PROGRESS_SEGMENT_WIDTH,
  },
  progressFillComplete: {
    backgroundColor: '#D7CA09',
    height: '100%',
    width: '100%',
  },
  progressFillAnimated: {
    backgroundColor: '#D7CA09',
    height: '100%',
  },
});
