import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressBars } from '@/components/onboarding/FigmaOnboarding';

/**
 * Shared chrome for the unified onboarding screens, measured off the Figma
 * "Create your Account" (1493:2702) and "Verify your identity" (1493:2645)
 * frames:
 *
 *   header   55px: back chevron left, 4-step progress (144px wide, 6px tall)
 *   intro    title Satoshi-Black 24, supporting copy Satoshi-Regular 13
 *   input    46px tall, 12px radius, #AFAFAF border, 16px text
 *   button   #FCC03B, 43px tall, 14px radius, Satoshi-Black 12 black label
 *
 * The four progress steps are the four phases of joining: account, profile,
 * identity, review. Screens pass the phase they belong to.
 */
export const ACCOUNT_FLOW_STEPS = 4;

export const accountFlowColors = {
  border: '#AFAFAF',
  button: '#FCC03B',
  buttonDisabled: '#E5EAF1',
  link: '#2F6FBF',
  muted: '#46576C',
  placeholder: '#8A8A8A',
  text: '#000000',
} as const;

export function AccountFlowFrame({
  children,
  footer,
  onBack,
  step,
}: {
  children: ReactNode;
  footer?: ReactNode;
  onBack?: () => void;
  step?: number;
}) {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <View style={styles.header}>
          {onBack ? (
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              hitSlop={10}
              onPress={onBack}
              style={styles.backButton}>
              <MaterialIcons color={accountFlowColors.text} name="arrow-back-ios-new" size={22} />
            </Pressable>
          ) : (
            <View style={styles.backButton} />
          )}
          {step ? (
            <View style={styles.progress}>
              <ProgressBars current={step} total={ACCOUNT_FLOW_STEPS} />
            </View>
          ) : null}
          <View style={styles.backButton} />
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AccountFlowIntro({
  centered = false,
  subtitle,
  title,
}: {
  centered?: boolean;
  subtitle?: ReactNode;
  title: string;
}) {
  return (
    <View style={styles.intro}>
      <Text style={[styles.title, centered && styles.centered]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, centered && styles.centered]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

export function AccountFlowInput({
  prefix,
  style,
  ...props
}: TextInputProps & { prefix?: string }) {
  return (
    <View style={styles.inputControl}>
      {prefix ? <Text style={styles.inputPrefix}>{prefix}</Text> : null}
      <TextInput
        placeholderTextColor={accountFlowColors.placeholder}
        style={[styles.inputText, style]}
        {...props}
      />
    </View>
  );
}

export function AccountFlowButton({
  disabled = false,
  label,
  loading = false,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
}) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isDisabled && styles.buttonDisabled,
        pressed && !isDisabled && styles.pressed,
      ]}>
      {loading ? (
        <ActivityIndicator color={accountFlowColors.text} />
      ) : (
        <Text style={styles.buttonText}>{label}</Text>
      )}
    </Pressable>
  );
}

/** Secondary full-width action, styled like the Figma social sign-in buttons. */
export function AccountFlowOutlineButton({
  icon,
  label,
  onPress,
}: {
  icon?: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}>
      {icon ? <MaterialIcons color="#404040" name={icon} size={20} /> : null}
      <Text style={styles.outlineButtonText}>{label}</Text>
    </Pressable>
  );
}

export function AccountFlowDivider({ label = 'or' }: { label?: string }) {
  return (
    <View style={styles.divider}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>{label}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

export function AccountFlowError({ children }: { children: ReactNode }) {
  return (
    <View accessibilityLiveRegion="polite" style={styles.errorBlock}>
      {children}
    </View>
  );
}

export const accountFlowStyles = StyleSheet.create({
  errorText: {
    color: '#B91C1C',
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  link: {
    color: accountFlowColors.link,
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    lineHeight: 20,
  },
  legal: {
    color: accountFlowColors.muted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  legalStrong: {
    fontFamily: 'Satoshi-Bold',
  },
  body: {
    color: accountFlowColors.text,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
  },
});

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 55,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  progress: {
    width: 144,
  },
  scrollContent: {
    flexGrow: 1,
    gap: 24,
    paddingBottom: 24,
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  footer: {
    gap: 4,
    paddingBottom: 12,
    paddingHorizontal: 17,
    paddingTop: 12,
  },
  intro: {
    gap: 12,
  },
  title: {
    color: accountFlowColors.text,
    fontFamily: 'Satoshi-Black',
    fontSize: 24,
    lineHeight: 30,
  },
  subtitle: {
    color: accountFlowColors.text,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  centered: {
    textAlign: 'center',
  },
  inputControl: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: accountFlowColors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  inputPrefix: {
    color: accountFlowColors.text,
    fontFamily: 'Satoshi-Medium',
    fontSize: 16,
    lineHeight: 20,
  },
  inputText: {
    color: accountFlowColors.text,
    flex: 1,
    fontFamily: 'Satoshi-Regular',
    fontSize: 16,
    lineHeight: 20,
    minHeight: 44,
    paddingVertical: 10,
  },
  button: {
    alignItems: 'center',
    backgroundColor: accountFlowColors.button,
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 43,
    padding: 8,
    width: '100%',
  },
  buttonDisabled: {
    backgroundColor: accountFlowColors.buttonDisabled,
  },
  buttonText: {
    color: accountFlowColors.text,
    fontFamily: 'Satoshi-Black',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  outlineButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D4D4D4',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  outlineButtonText: {
    color: '#404040',
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 24,
  },
  divider: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  dividerLine: {
    backgroundColor: '#D4D4D4',
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    color: accountFlowColors.muted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  errorBlock: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  pressed: {
    opacity: 0.82,
  },
});
