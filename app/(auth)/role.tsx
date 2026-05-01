import { useRouter } from 'expo-router';
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

import {
  GradientImageScreen,
  KonektadoWordmark,
  OnboardingButton,
  onboardingColors,
  RoleChoiceStack,
  type RoleChoiceOption,
} from '@/components/onboarding/FigmaOnboarding';
import { saveUserRole, type AppRole } from '@/utils/save-role';
import { supabase } from '@/utils/supabase';

type SessionUser = {
  email: string | null;
  id: string;
};

const roleBackgrounds: Record<AppRole | 'default', ImageSourcePropType> = {
  client: require('../../assets/images/onboarding-role-client-wide.jpg'),
  default: require('../../assets/images/onboarding-role.jpg'),
  provider: require('../../assets/images/onboarding-role-work-wide.jpg'),
};

const roleChoices: RoleChoiceOption<AppRole>[] = [
  {
    bullets: ['Find jobs near your barangay', 'Show your skills and get hired', 'Get paid directly'],
    description: 'Show my skills to people in my barangay',
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

export default function RoleScreen() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android') {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }

    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active || !data.user) return;
      setSessionUser({ id: data.user.id, email: data.user.email ?? null });
    });

    return () => {
      active = false;
    };
  }, []);

  const selectRole = (role: AppRole) => {
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

    if (!sessionUser) {
      router.push(`/(auth)/register?role=${selectedRole}`);
      return;
    }

    setSubmitting(true);
    const saveError = await saveUserRole({
      email: sessionUser.email,
      role: selectedRole,
      userId: sessionUser.id,
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

    router.replace('/(onboarding)');
  };

  const goToLogin = () => {
    router.push('/(auth)/login');
  };

  const backgroundSource = selectedRole ? roleBackgrounds[selectedRole] : roleBackgrounds.default;

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
              label={sessionUser ? 'Continue' : 'Create Account'}
              loading={submitting}
              onPress={continueWithRole}
              variant="yellow"
            />
            <Pressable accessibilityRole="link" onPress={goToLogin} style={styles.loginLink}>
              <Text style={styles.loginText}>
                Already have an account? <Text style={styles.loginTextBold}>Login</Text>
              </Text>
            </Pressable>
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
    gap: 42,
    justifyContent: 'center',
    paddingVertical: 26,
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
