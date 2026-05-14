import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
    Alert,
    LayoutAnimation,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    UIManager,
    View,
    type ImageSourcePropType,
} from 'react-native';

import { KonektadoWordmark } from '@/components/KonektadoWordmark';
import {
    GradientImageScreen,
    OnboardingButton,
    onboardingColors,
    RoleChoiceStack,
    type RoleChoiceOption,
} from '@/components/onboarding/FigmaOnboarding';
import { useProfile } from '@/hooks/use-profile';
import { saveUserRole, type OnboardingIntent } from '@/utils/save-role';
import { supabase } from '@/utils/supabase';

type SessionUser = {
  email: string | null;
  id: string;
};

const roleBackgrounds: Record<OnboardingIntent | 'default', ImageSourcePropType> = {
  client: require('../../assets/images/onboarding-role-client-wide.jpg'),
  default: require('../../assets/images/onboarding-role.jpg'),
  provider: require('../../assets/images/onboarding-role-work-wide.jpg'),
};

const roleChoices: RoleChoiceOption<OnboardingIntent>[] = [
  {
    bullets: ['Find jobs near your barangay', 'Show your services and get hired', 'Browse before verification'],
    description: 'Show my services to people in my barangay',
    icon: 'business-center',
    selectedDescription: 'Find jobs and earn in your barangay',
    title: 'I want to find work',
    value: 'provider',
  },
  {
    bullets: ['Hire people near you', 'View ratings and past work', 'Support your community'],
    description: 'Find trusted workers near you',
    icon: 'search',
    title: 'I want to hire someone',
    value: 'client',
  },
];

function getSafeReturnTo(value: string | string[] | undefined) {
  const returnTo = Array.isArray(value) ? value[0] : value;

  if (
    returnTo === '/(onboarding)' ||
    returnTo === '/(onboarding)/location' ||
    returnTo === '/(onboarding)/job' ||
    returnTo === '/(onboarding)/review'
  ) {
    return returnTo;
  }

  return '/(onboarding)';
}

export default function RoleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const {
    authenticated,
    loading: profileLoading,
    refresh: refreshProfile,
    user,
  } = useProfile();
  const [selectedRole, setSelectedRole] = useState<OnboardingIntent | null>(null);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android') {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }

    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;

      setSessionUser(data.user ? { id: data.user.id, email: data.user.email ?? null } : null);
      setCheckingSession(false);
    });

    return () => {
      active = false;
    };

  }, []);

  const selectRole = (role: OnboardingIntent) => {
    if (selectedRole === role) return;

    LayoutAnimation.configureNext({
      create: {
        property: LayoutAnimation.Properties.opacity,
        type: LayoutAnimation.Types.easeInEaseOut,
      },
      delete: {
        property: LayoutAnimation.Properties.opacity,
        type: LayoutAnimation.Types.easeInEaseOut,
      },
      duration: 320,
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
    });
    setSelectedRole(role);
  };

  const continueWithRole = async () => {
    if (!selectedRole) {
      Alert.alert('Choose how you will use Konektado', 'Select one option to continue.');
      return;
    }

    if (profileLoading || checkingSession) {
      return;
    }

    const recoveredUser = user ? { id: user.id, email: user.email ?? null } : sessionUser;

    if (!authenticated && !recoveredUser) {
      router.push(`/(auth)/register?role=${selectedRole}`);
      return;
    }

    if (!recoveredUser) {
      Alert.alert('Session still loading', 'Please wait a moment, then try again.');
      return;
    }

    setSubmitting(true);
    const saveError = await saveUserRole({
      email: recoveredUser.email,
      role: selectedRole,
      userId: recoveredUser.id,
    });

    if (saveError) {
      setSubmitting(false);
      Alert.alert('Could not save role', saveError.message);
      return;
    }

    const { error: metaError } = await supabase.auth.updateUser({
      data: { app_role: selectedRole, role: selectedRole },
    });

    setSubmitting(false);

    if (metaError) {
      Alert.alert('Role saved', 'Role was saved, but account metadata sync failed. You can continue.');
    }

    await refreshProfile();
    router.replace(getSafeReturnTo(params.returnTo));
  };

  const goToLogin = () => {
    router.push('/(auth)/login');
  };

  const backgroundSource = selectedRole ? roleBackgrounds[selectedRole] : roleBackgrounds.default;
  const hasResolvedSignedInUser = authenticated || Boolean(sessionUser);
  const primaryLabel = profileLoading || checkingSession || hasResolvedSignedInUser ? 'Continue' : 'Create Account';

  return (
    <View style={styles.screen}>
      <StatusBar style="light" translucent />
      <GradientImageScreen
        backgroundTransitionDuration={460}
        blueOpacity={0.4}
        darkness={0.2}
        source={backgroundSource}>
        <View style={styles.content}>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>How will you use</Text>
            <KonektadoWordmark color="light" size="large" />
          </View>

          <RoleChoiceStack onSelect={selectRole} options={roleChoices} selectedValue={selectedRole} style={styles.cards} />

          <View style={styles.footer}>
            <OnboardingButton
              disabled={!selectedRole}
              label={primaryLabel}
              loading={submitting}
              onPress={continueWithRole}
              variant="yellow"
            />
            {!hasResolvedSignedInUser ? (
              <Pressable accessibilityRole="link" onPress={goToLogin} style={styles.loginLink}>
                <Text style={styles.loginText}>
                  Already have an account? <Text style={styles.loginTextBold}>Login</Text>
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </GradientImageScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#1D4F91',
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 8,
    paddingHorizontal: 20,
    paddingTop: 70,
  },
  titleBlock: {
    gap: 8,
    paddingHorizontal: 4,
  },
  title: {
    color: onboardingColors.white,
    fontFamily: 'Satoshi-Black',
    fontSize: 38,
    lineHeight: 50,
  },
  cards: {
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    paddingVertical: 18,
  },
  footer: {
    gap: 4,
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
  },
  loginTextBold: {
    fontFamily: 'Satoshi-Bold',
    textDecorationLine: 'underline',
  },
});
