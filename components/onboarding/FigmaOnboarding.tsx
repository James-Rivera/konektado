import { KonektadoWordmark } from '@/components/KonektadoWordmark';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Easing,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    type ImageResizeMode,
    type ImageSourcePropType,
    type ImageStyle,
    type StyleProp,
    type TextInputProps,
    type ViewStyle
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

export const onboardingColors = {
  actionBlue: '#0D99FF',
  actionBluePressed: '#007BD1',
  brandYellow: '#F2E640',
  brandYellowMuted: '#C2B833',
  text: '#000000',
  textMuted: '#46576C',
  placeholder: '#AFAFAF',
  border: '#AFAFAF',
  borderSoft: '#E5E7EB',
  surface: '#FFFFFF',
  white: '#FFFFFF',
  selectedBlue: 'rgba(105, 164, 236, 0.88)',
  disabledBlue: 'rgba(90, 134, 188, 0.78)',
} as const;

export { KonektadoWordmark };

type GradientImageScreenProps = {
  children: ReactNode;
  source: ImageSourcePropType;
  darkness?: number;
  blueOpacity?: number;
  backgroundImageStyle?: StyleProp<ImageStyle>;
  backgroundResizeMode?: ImageResizeMode;
  backgroundTransitionDuration?: number;
  contentStyle?: StyleProp<ViewStyle>;
  safeAreaEdges?: Edge[];
};

type BackgroundLayer = {
  imageStyle?: StyleProp<ImageStyle>;
  resizeMode: ImageResizeMode;
  source: ImageSourcePropType;
};

export function GradientImageScreen({
  children,
  source,
  darkness = 0.2,
  blueOpacity = 0.35,
  backgroundImageStyle,
  backgroundResizeMode = 'cover',
  backgroundTransitionDuration = 420,
  contentStyle,
  safeAreaEdges = ['top', 'bottom'],
}: GradientImageScreenProps) {
  const fade = useRef(new Animated.Value(1)).current;
  const [previousLayer, setPreviousLayer] = useState<BackgroundLayer | null>(null);
  const currentLayerRef = useRef<BackgroundLayer>({
    imageStyle: backgroundImageStyle,
    resizeMode: backgroundResizeMode,
    source,
  });
  const [currentLayer, setCurrentLayer] = useState<BackgroundLayer>(currentLayerRef.current);

  useEffect(() => {
    const nextLayer = {
      imageStyle: backgroundImageStyle,
      resizeMode: backgroundResizeMode,
      source,
    };

    const previous = currentLayerRef.current;
    const sourceChanged = previous.source !== source;
    const layerChanged =
      sourceChanged ||
      previous.imageStyle !== nextLayer.imageStyle ||
      previous.resizeMode !== nextLayer.resizeMode;

    if (!layerChanged) return;

    currentLayerRef.current = nextLayer;
    setCurrentLayer(nextLayer);

    if (!sourceChanged) {
      setPreviousLayer(null);
      fade.setValue(1);
      return;
    }

    setPreviousLayer(previous);
    fade.setValue(0);

    Animated.timing(fade, {
      duration: backgroundTransitionDuration,
      toValue: 1,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setPreviousLayer(null);
      }
    });
  }, [backgroundImageStyle, backgroundResizeMode, backgroundTransitionDuration, fade, source]);

  const previousOpacity = fade.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <View style={styles.imageScreen}>
      {previousLayer ? (
        <OnboardingBackgroundLayer layer={previousLayer} opacity={previousOpacity} />
      ) : null}
      <OnboardingBackgroundLayer layer={currentLayer} opacity={fade} />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: `rgba(0, 0, 0, ${darkness})` }]} />
      <Svg height="100%" pointerEvents="none" style={StyleSheet.absoluteFill} width="100%">
        <Defs>
          <LinearGradient id="onboardingBlueOverlay" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor="#69A4EC" stopOpacity={blueOpacity} />
            <Stop offset="0.5" stopColor="#4B8BDB" stopOpacity={blueOpacity} />
            <Stop offset="0.75" stopColor="#3C7FD2" stopOpacity={blueOpacity} />
          </LinearGradient>
        </Defs>
        <Rect fill="url(#onboardingBlueOverlay)" height="100%" width="100%" />
      </Svg>
      <SafeAreaView edges={safeAreaEdges} style={[styles.imageSafeArea, contentStyle]}>
        {children}
      </SafeAreaView>
    </View>
  );
}

type OnboardingBackgroundLayerProps = {
  layer: BackgroundLayer;
  opacity: Animated.AnimatedInterpolation<string | number> | Animated.Value;
};

function OnboardingBackgroundLayer({ layer, opacity }: OnboardingBackgroundLayerProps) {
  return (
    <Animated.View pointerEvents="none" style={[styles.backgroundFrame, { opacity }]}>
      <Animated.Image
        resizeMode={layer.resizeMode}
        source={layer.source}
        style={[styles.backgroundLayer, layer.imageStyle]}
      />
    </Animated.View>
  );
}

type ProgressBarsProps = {
  current: number;
  total?: number;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ProgressBars({ current, total = 3, compact = false, style }: ProgressBarsProps) {
  return (
    <View style={[styles.progressRow, compact ? styles.progressCompact : undefined, style]}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.progressSegment,
            compact ? styles.progressSegmentCompact : undefined,
            index < current ? styles.progressSegmentActive : styles.progressSegmentInactive,
          ]}
        />
      ))}
    </View>
  );
}

type OnboardingButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'blue' | 'yellow' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function OnboardingButton({
  label,
  onPress,
  variant = 'blue',
  disabled = false,
  loading = false,
  style,
}: OnboardingButtonProps) {
  const isDisabled = disabled || loading;
  const isYellow = variant === 'yellow';
  const isOutline = variant === 'outline';
  const foreground = isYellow ? onboardingColors.textMuted : isOutline ? onboardingColors.text : onboardingColors.white;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        isYellow ? styles.actionButtonYellow : isOutline ? styles.actionButtonOutline : styles.actionButtonBlue,
        isDisabled && styles.actionButtonDisabled,
        pressed && !isDisabled && styles.actionButtonPressed,
        style,
      ]}>
      {loading ? <ActivityIndicator color={foreground} size="small" /> : <Text style={[styles.actionButtonText, { color: foreground }]}>{label}</Text>}
    </Pressable>
  );
}

type OnboardingBackButtonProps = {
  onPress?: () => void;
  color?: string;
};

export function OnboardingBackButton({ onPress, color = onboardingColors.text }: OnboardingBackButtonProps) {
  return (
    <Pressable accessibilityLabel="Go back" accessibilityRole="button" hitSlop={12} onPress={onPress} style={styles.backButton}>
      <MaterialIcons color={color} name="arrow-back" size={25} />
    </Pressable>
  );
}

type AuthShellProps = {
  children: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  title: string;
};

export function AuthShell({ children, footer, onClose, title }: AuthShellProps) {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.authScreen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.authKeyboard}>
        <View style={styles.authHeader}>
          <View style={styles.authLogoRow}>
            <KonektadoWordmark color="dark" size="medium" />
            {onClose ? (
              <Pressable accessibilityLabel="Close" accessibilityRole="button" hitSlop={12} onPress={onClose} style={styles.closeButton}>
                <MaterialIcons color={onboardingColors.text} name="close" size={26} />
              </Pressable>
            ) : null}
          </View>
          <View style={styles.authDivider} />
        </View>

        <ScrollView contentContainerStyle={styles.authContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.authTitle}>{title}</Text>
          {children}
        </ScrollView>

        {footer ? <View style={styles.authFooter}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type OnboardingFormScaffoldProps = {
  children: ReactNode;
  currentStep: number;
  footer: ReactNode;
  helper?: string;
  onBack?: () => void;
  title: string;
  totalSteps?: number;
  contentStyle?: StyleProp<ViewStyle>;
};

export function OnboardingFormScaffold({
  children,
  currentStep,
  footer,
  helper,
  onBack,
  title,
  totalSteps = 4,
  contentStyle,
}: OnboardingFormScaffoldProps) {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.formScreen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.formKeyboard}>
        <View style={styles.formHeader}>
          <OnboardingBackButton onPress={onBack} />
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={[styles.formContent, contentStyle]} keyboardShouldPersistTaps="handled">
          <View style={styles.formTitleBlock}>
            <Text style={styles.formTitle}>{title}</Text>
            <ProgressBars current={currentStep} total={totalSteps} />
          </View>
          {helper ? <Text style={styles.formHelper}>{helper}</Text> : null}
          {children}
        </ScrollView>

        <View style={styles.formFooter}>{footer}</View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function OnboardingTextInput({ style, placeholderTextColor, ...props }: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={placeholderTextColor ?? onboardingColors.placeholder}
      style={[styles.textInput, style]}
      {...props}
    />
  );
}

type OnboardingLoadingOverlayProps = {
  visible: boolean;
};

export function OnboardingLoadingOverlay({ visible }: OnboardingLoadingOverlayProps) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      spin.stopAnimation();
      spin.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.timing(spin, {
        duration: 900,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: true,
      })
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [spin, visible]);

  if (!visible) return null;

  const rotation = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      animationType="fade"
      navigationBarTranslucent
      onRequestClose={() => undefined}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View
        accessibilityRole="progressbar"
        accessibilityViewIsModal
        pointerEvents="auto"
        style={styles.loadingOverlay}
      >
        <Animated.View style={[styles.loadingIndicator, { transform: [{ rotate: rotation }] }]}>
          <Svg height={40} viewBox="0 0 40 40" width={40}>
            <Circle cx={20} cy={20} fill="none" r={17} stroke="#FFFFFF" strokeWidth={4} />
            <Circle
              cx={20}
              cy={20}
              fill="none"
              r={17}
              stroke={onboardingColors.brandYellow}
              strokeDasharray="28 108"
              strokeLinecap="round"
              strokeWidth={4}
            />
          </Svg>
        </Animated.View>
      </View>
    </Modal>
  );
}

type FloatingOnboardingInputProps = TextInputProps & {
  containerStyle?: StyleProp<ViewStyle>;
  label: string;
  trailingIcon?: MaterialIconName;
  trailingIconLabel?: string;
  onTrailingIconPress?: () => void;
};

export function FloatingOnboardingInput({
  containerStyle,
  label,
  onBlur,
  onFocus,
  onTrailingIconPress,
  placeholderTextColor,
  style,
  trailingIcon,
  trailingIconLabel,
  value,
  ...props
}: FloatingOnboardingInputProps) {
  const [focused, setFocused] = useState(false);
  const textValue = typeof value === 'string' ? value : '';
  const floatsLabel = focused || textValue.length > 0;
  const highlighted = focused || textValue.length > 0;

  return (
    <View style={[styles.floatingInputShell, highlighted ? styles.floatingInputShellActive : undefined, containerStyle]}>
      <View style={styles.floatingInputContent}>
        {floatsLabel ? <Text style={styles.floatingInputLabel}>{label}</Text> : null}
        <TextInput
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          placeholder={floatsLabel ? undefined : label}
          placeholderTextColor={placeholderTextColor ?? onboardingColors.placeholder}
          style={[styles.floatingInput, floatsLabel ? styles.floatingInputWithLabel : undefined, style]}
          value={value}
          {...props}
        />
      </View>
      {trailingIcon ? (
        <Pressable
          accessibilityLabel={trailingIconLabel}
          accessibilityRole={onTrailingIconPress ? 'button' : undefined}
          hitSlop={10}
          onPress={onTrailingIconPress}
          style={styles.floatingInputIcon}
        >
          <MaterialIcons color={onboardingColors.placeholder} name={trailingIcon} size={24} />
        </Pressable>
      ) : null}
    </View>
  );
}

type OtpCodeInputProps = {
  autoFocus?: boolean;
  disabled?: boolean;
  onChangeText: (value: string) => void;
  value: string;
};

export function OtpCodeInput({ autoFocus = false, disabled = false, onChangeText, value }: OtpCodeInputProps) {
  const inputRef = useRef<TextInput>(null);
  const digits = value.split('');
  const activeIndex = Math.min(value.length, 5);

  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={() => inputRef.current?.focus()} style={styles.otpPressable}>
      <TextInput
        ref={inputRef}
        autoFocus={autoFocus}
        caretHidden
        editable={!disabled}
        keyboardType="number-pad"
        maxLength={6}
        onChangeText={(nextValue) => onChangeText(nextValue.replace(/\D/g, '').slice(0, 6))}
        style={styles.otpHiddenInput}
        textContentType="oneTimeCode"
        value={value}
      />
      <View style={styles.otpRow}>
        {Array.from({ length: 6 }).map((_, index) => (
          <View key={index} style={[styles.otpBox, index === activeIndex ? styles.otpBoxActive : undefined]}>
            <Text style={styles.otpDigit}>{digits[index] ?? ''}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

type PasswordRequirementRowProps = {
  checked: boolean;
  children: ReactNode;
};

export function PasswordRequirementRow({ checked, children }: PasswordRequirementRowProps) {
  return (
    <View style={styles.passwordRequirementRow}>
      <View style={[styles.passwordRequirementMark, checked ? styles.passwordRequirementMarkChecked : undefined]}>
        {checked ? <MaterialIcons color={onboardingColors.brandYellow} name="check" size={11} /> : null}
      </View>
      <Text style={styles.passwordRequirementText}>{children}</Text>
    </View>
  );
}

type ReadonlyFieldProps = {
  label: string;
  value: string;
  icon?: MaterialIconName;
};

export function ReadonlyField({ icon, label, value }: ReadonlyFieldProps) {
  return (
    <View style={[styles.textInput, styles.readonlyField]}>
      <View>
        <Text style={styles.readonlyLabel}>{label}</Text>
        <Text style={styles.readonlyValue}>{value}</Text>
      </View>
      {icon ? <MaterialIcons color={onboardingColors.placeholder} name={icon} size={20} /> : null}
    </View>
  );
}

type ReviewFieldProps = {
  label: string;
  value: ReactNode;
  multiline?: boolean;
};

export function ReviewField({ label, value, multiline = false }: ReviewFieldProps) {
  return (
    <View style={[styles.reviewField, multiline ? styles.reviewFieldTall : undefined]}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value}</Text>
    </View>
  );
}

type CheckRowProps = {
  checked: boolean;
  children: ReactNode;
  onPress: () => void;
};

export function CheckRow({ checked, children, onPress }: CheckRowProps) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onPress} style={styles.checkRow}>
      <View style={[styles.checkbox, checked ? styles.checkboxChecked : undefined]}>
        {checked ? <MaterialIcons color={onboardingColors.brandYellow} name="check" size={12} /> : null}
      </View>
      <Text style={styles.checkText}>{children}</Text>
    </Pressable>
  );
}

type RoleChoiceCardProps = {
  description: string;
  dimmed?: boolean;
  disabled?: boolean;
  icon: MaterialIconName;
  onPress: () => void;
  selected?: boolean;
  selectedDescription?: string;
  state?: 'default' | 'dimmed' | 'selected';
  title: string;
  bullets: string[];
};

export type RoleChoiceOption<RoleValue extends string = string> = {
  bullets: string[];
  description: string;
  icon: MaterialIconName;
  selectedDescription?: string;
  title: string;
  value: RoleValue;
};

type RoleChoiceStackProps<RoleValue extends string> = {
  onSelect: (value: RoleValue) => void;
  options: RoleChoiceOption<RoleValue>[];
  selectedValue: RoleValue | null;
  style?: StyleProp<ViewStyle>;
};

export function RoleChoiceStack<RoleValue extends string>({ onSelect, options, selectedValue, style }: RoleChoiceStackProps<RoleValue>) {
  return (
    <View style={[styles.roleChoiceStack, style]}>
      {options.map((option) => {
        const isSelected = selectedValue === option.value;
        const state = isSelected ? 'selected' : selectedValue ? 'dimmed' : 'default';

        return (
          <RoleChoiceCard
            key={option.value}
            bullets={option.bullets}
            description={option.description}
            icon={option.icon}
            onPress={() => onSelect(option.value)}
            selectedDescription={option.selectedDescription}
            state={state}
            title={option.title}
          />
        );
      })}
    </View>
  );
}

export function RoleChoiceCard({
  bullets,
  description,
  dimmed = false,
  disabled = false,
  icon,
  onPress,
  selected = false,
  selectedDescription,
  state,
  title,
}: RoleChoiceCardProps) {
  const cardState = state ?? (selected ? 'selected' : dimmed ? 'dimmed' : 'default');
  const isSelected = cardState === 'selected';
  const isDimmed = cardState === 'dimmed';
  const displayedDescription = isSelected ? selectedDescription ?? description : description;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.roleCard,
        isSelected ? styles.roleCardSelected : styles.roleCardDefault,
        isDimmed ? styles.roleCardDimmed : undefined,
      ]}>
      <View style={[styles.roleCardTop, isSelected ? styles.roleCardTopSelected : undefined]}>
        <MaterialIcons color={onboardingColors.brandYellow} name={icon} size={62} style={isDimmed ? styles.roleIconDimmed : undefined} />
        <View style={[styles.roleCopy, isDimmed ? styles.roleCopyDimmed : undefined]}>
          <Text style={styles.roleTitle}>{title}</Text>
          <Text style={styles.roleDescription}>{displayedDescription}</Text>
        </View>
      </View>

      {isSelected ? (
        <View style={styles.roleBullets}>
          {bullets.map((bullet) => (
            <View key={bullet} style={styles.roleBulletRow}>
              <MaterialIcons color="#4FFF70" name="check" size={16} />
              <Text style={styles.roleBulletText}>{bullet}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  imageScreen: {
    backgroundColor: '#1D4F91',
    flex: 1,
    overflow: 'hidden',
  },
  backgroundFrame: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    height: '100%',
    width: '100%',
  },
  imageSafeArea: {
    flex: 1,
  },
  wordmark: {
    fontFamily: 'Satoshi-Black',
  },
  wordmarkSmall: {
    fontSize: 29,
    lineHeight: 34,
  },
  wordmarkLarge: {
    fontSize: 46,
    lineHeight: 50,
  },
  wordmarkDot: {
    color: onboardingColors.brandYellow,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
    height: 6,
    width: '100%',
  },
  progressCompact: {
    width: 144,
  },
  progressSegment: {
    borderRadius: 3,
    flex: 1,
    height: 6,
  },
  progressSegmentCompact: {
    minWidth: 1,
  },
  progressSegmentActive: {
    backgroundColor: onboardingColors.brandYellow,
  },
  progressSegmentInactive: {
    backgroundColor: '#F6F6EF',
    opacity: 0.7,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 24,
    flexDirection: 'row',
    height: 46,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  actionButtonBlue: {
    backgroundColor: onboardingColors.actionBlue,
  },
  actionButtonYellow: {
    backgroundColor: onboardingColors.brandYellow,
  },
  actionButtonOutline: {
    backgroundColor: onboardingColors.surface,
    borderColor: onboardingColors.borderSoft,
    borderWidth: 1,
  },
  actionButtonDisabled: {
    backgroundColor: onboardingColors.brandYellowMuted,
  },
  actionButtonPressed: {
    opacity: 0.82,
  },
  actionButtonText: {
    fontFamily: 'Satoshi-Black',
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
  },
  backButton: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  authScreen: {
    backgroundColor: onboardingColors.surface,
    flex: 1,
  },
  authKeyboard: {
    flex: 1,
  },
  authHeader: {
    gap: 28,
    paddingHorizontal: 24,
    paddingTop: 58,
  },
  authLogoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  closeButton: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  authDivider: {
    backgroundColor: onboardingColors.brandYellow,
    height: 4,
    width: '100%',
  },
  authContent: {
    gap: 20,
    paddingHorizontal: 24,
    paddingTop: 34,
  },
  authTitle: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 24,
    lineHeight: 39,
  },
  authFooter: {
    paddingBottom: 18,
    paddingHorizontal: 24,
  },
  formScreen: {
    backgroundColor: onboardingColors.surface,
    flex: 1,
  },
  formKeyboard: {
    flex: 1,
  },
  formHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 55,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  headerSpacer: {
    height: 24,
    width: 24,
  },
  formContent: {
    flexGrow: 1,
    gap: 14,
    paddingHorizontal: 26,
    paddingTop: 60,
  },
  formTitleBlock: {
    gap: 10,
  },
  formTitle: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Black',
    fontSize: 24,
    lineHeight: 39,
  },
  formHelper: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 20,
  },
  formFooter: {
    paddingBottom: 22,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  textInput: {
    backgroundColor: onboardingColors.surface,
    borderColor: onboardingColors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Regular',
    fontSize: 16,
    height: 46,
    lineHeight: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  loadingOverlay: {
    alignItems: 'center',
    backgroundColor: '#D9D9D9',
    flex: 1,
    justifyContent: 'center',
  },
  loadingIndicator: {
    height: 40,
    width: 40,
  },
  floatingInputShell: {
    alignItems: 'center',
    backgroundColor: onboardingColors.surface,
    borderColor: onboardingColors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    height: 46,
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: '100%',
  },
  floatingInputShellActive: {
    borderColor: '#FCC03B',
  },
  floatingInputContent: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  floatingInputLabel: {
    color: onboardingColors.placeholder,
    fontFamily: 'Satoshi-Regular',
    fontSize: 10,
    lineHeight: 12,
  },
  floatingInput: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Regular',
    fontSize: 16,
    height: 30,
    includeFontPadding: false,
    lineHeight: 20,
    margin: 0,
    padding: 0,
  },
  floatingInputWithLabel: {
    height: 20,
  },
  floatingInputIcon: {
    alignItems: 'center',
    height: 30,
    justifyContent: 'center',
    marginLeft: 10,
    width: 30,
  },
  otpPressable: {
    width: '100%',
  },
  otpHiddenInput: {
    height: 40,
    left: -9999,
    position: 'absolute',
    width: 40,
  },
  otpRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  otpBox: {
    alignItems: 'center',
    backgroundColor: onboardingColors.surface,
    borderColor: '#D5D7DA',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    height: 54,
    justifyContent: 'center',
    minWidth: 0,
  },
  otpBoxActive: {
    borderColor: '#FCC03B',
  },
  otpDigit: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Black',
    fontSize: 22,
    lineHeight: 28,
  },
  passwordRequirementRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  passwordRequirementMark: {
    alignItems: 'center',
    borderColor: '#D5D7DA',
    borderRadius: 8,
    borderWidth: 1,
    height: 16,
    justifyContent: 'center',
    width: 16,
  },
  passwordRequirementMarkChecked: {
    backgroundColor: '#F5F5EF',
    borderColor: onboardingColors.brandYellow,
  },
  passwordRequirementText: {
    color: onboardingColors.text,
    flex: 1,
    fontFamily: 'Satoshi-Light',
    fontSize: 11,
    lineHeight: 20,
  },
  readonlyField: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  readonlyLabel: {
    color: onboardingColors.placeholder,
    fontFamily: 'Satoshi-Regular',
    fontSize: 10,
    lineHeight: 12,
  },
  readonlyValue: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Regular',
    fontSize: 16,
    lineHeight: 20,
  },
  reviewField: {
    borderBottomColor: onboardingColors.borderSoft,
    borderBottomWidth: 1,
    gap: 2,
    minHeight: 48,
    padding: 8,
  },
  reviewFieldTall: {
    minHeight: 96,
  },
  reviewLabel: {
    color: onboardingColors.placeholder,
    fontFamily: 'Satoshi-Regular',
    fontSize: 10,
    lineHeight: 12,
  },
  reviewValue: {
    color: onboardingColors.text,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 20,
  },
  checkRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  checkbox: {
    alignItems: 'center',
    borderColor: '#D5D7DA',
    borderRadius: 8,
    borderWidth: 1,
    height: 16,
    justifyContent: 'center',
    marginTop: 2,
    width: 16,
  },
  checkboxChecked: {
    backgroundColor: '#F5F5EF',
    borderColor: onboardingColors.brandYellow,
  },
  checkText: {
    color: onboardingColors.text,
    flex: 1,
    fontFamily: 'Satoshi-Light',
    fontSize: 12,
    lineHeight: 20,
  },
  roleChoiceStack: {
    gap: 42,
  },
  roleCard: {
    borderRadius: 24,
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    width: '100%',
  },
  roleCardDefault: {
    backgroundColor: onboardingColors.selectedBlue,
    height: 118,
    minHeight: 118,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  roleCardDimmed: {
    backgroundColor: onboardingColors.disabledBlue,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
  },
  roleCardSelected: {
    backgroundColor: onboardingColors.selectedBlue,
    gap: 10,
    height: 243,
    minHeight: 243,
    paddingBottom: 26,
    paddingTop: 1,
  },
  roleCardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 17,
    justifyContent: 'center',
  },
  roleCardTopSelected: {
    backgroundColor: '#69A4EC',
    borderRadius: 24,
    elevation: 6,
    height: 120,
    minHeight: 120,
    paddingHorizontal: 24,
    paddingVertical: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    width: '100%',
  },
  roleCopy: {
    flex: 1,
    gap: 10,
  },
  roleCopyDimmed: {
    opacity: 0.62,
  },
  roleIconDimmed: {
    opacity: 0.62,
  },
  roleTitle: {
    color: onboardingColors.white,
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 20,
  },
  roleDescription: {
    color: onboardingColors.white,
    fontFamily: 'Satoshi-Light',
    fontSize: 14,
    lineHeight: 20,
  },
  roleBullets: {
    gap: 10,
    paddingHorizontal: 35,
    paddingTop: 16,
  },
  roleBulletRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  roleBulletText: {
    color: onboardingColors.white,
    flex: 1,
    fontFamily: 'Satoshi-Light',
    fontSize: 14,
    lineHeight: 16,
  },
});
