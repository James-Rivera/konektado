import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type ImageResizeMode,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
  type TextInputProps,
  type ViewStyle
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop, SvgXml } from 'react-native-svg';

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

type KonektadoWordmarkProps = {
  color?: 'dark' | 'light';
  size?: 'small' | 'medium' | 'large';
  style?: StyleProp<ViewStyle>;
};

const KONEKTADO_LOGO_SVG_LIGHT = `
<svg viewBox="0 0 152.156 24.2969" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4.375 23.7031H0V0.03125H4.375V10.4844L11.875 0.03125H17L8.01562 11.6719L17 23.7031H11.8594L4.375 13.2656V23.7031Z" fill="#FFFFFF"/>
  <path d="M24.3544 24.2969C21.7398 24.2969 19.5106 23.3802 17.6669 21.5469C15.8335 19.7031 14.9169 17.4688 14.9169 14.8438C14.9169 12.2188 15.8335 9.98438 17.6669 8.14062C19.5106 6.28646 21.7398 5.35938 24.3544 5.35938C26.9794 5.35938 29.2085 6.28646 31.0419 8.14062C32.8856 9.98438 33.8075 12.2188 33.8075 14.8438C33.8075 17.4688 32.8856 19.7031 31.0419 21.5469C29.2085 23.3802 26.9794 24.2969 24.3544 24.2969ZM24.3544 20.4062C25.8231 20.4062 27.0523 19.875 28.0419 18.8125C29.0315 17.75 29.5262 16.4271 29.5262 14.8438C29.5262 13.2604 29.0315 11.9323 28.0419 10.8594C27.0523 9.78646 25.8231 9.25 24.3544 9.25C22.896 9.25 21.6721 9.78646 20.6825 10.8594C19.6929 11.9323 19.1981 13.2604 19.1981 14.8438C19.1981 16.4271 19.6929 17.75 20.6825 18.8125C21.6721 19.875 22.896 20.4062 24.3544 20.4062Z" fill="#FFFFFF"/>
  <path d="M33.4744 23.7031V5.95312H37.4431V7.48438C38.8181 6.06771 40.464 5.35938 42.3806 5.35938C44.4848 5.35938 46.1515 6.07292 47.3806 7.5C48.6202 8.91667 49.24 10.8333 49.24 13.25V23.7031H44.9744V14.2031C44.9744 12.5781 44.6723 11.3438 44.0681 10.5C43.464 9.65625 42.5837 9.23438 41.4275 9.23438C40.1983 9.23438 39.2765 9.66146 38.6619 10.5156C38.0473 11.3698 37.74 12.651 37.74 14.3594V23.7031H33.4744Z" fill="#FFFFFF"/>
  <path d="M58.3288 24.2969C55.7663 24.2969 53.5788 23.3802 51.7663 21.5469C49.9642 19.7031 49.0631 17.4688 49.0631 14.8438C49.0631 12.2188 49.9642 9.98438 51.7663 8.14062C53.5788 6.28646 55.7663 5.35938 58.3288 5.35938C60.9017 5.35938 63.0892 6.28646 64.8913 8.14062C66.7038 9.98438 67.61 12.2188 67.61 14.8438C67.61 15.4792 67.5579 16.1042 67.4538 16.7188H53.61C53.8496 17.4896 54.2506 18.1875 54.8131 18.8125C55.7819 19.875 56.9902 20.4062 58.4381 20.4062C59.334 20.4062 60.1517 20.1979 60.8913 19.7812C61.6413 19.3646 62.1933 18.8073 62.5475 18.1094H67.0475C66.4746 19.9948 65.3965 21.5 63.8131 22.625C62.2298 23.7396 60.4017 24.2969 58.3288 24.2969ZM63.1569 13.3125C62.9485 12.375 62.5267 11.5573 61.8913 10.8594C60.9329 9.78646 59.7454 9.25 58.3288 9.25C56.9121 9.25 55.7246 9.78646 54.7663 10.8594C54.1517 11.5677 53.7246 12.3854 53.485 13.3125H63.1569Z" fill="#FFFFFF"/>
  <path d="M72.5269 23.7031H68.2612V0.03125H72.5269V14.4219L78.2456 5.95312H83.1987L76.5894 14.5312L83.98 23.7031H78.855L72.5269 15.2344V23.7031Z" fill="#FFFFFF"/>
  <path d="M84.1 23.7031V9.70312H82.0531V5.95312H84.1V0H88.3656V5.95312H90.9437V9.70312H88.3656V23.7031H84.1Z" fill="#FFFFFF"/>
  <path d="M97.7669 24.2969C95.3294 24.2969 93.2513 23.3802 91.5325 21.5469C89.8138 19.7031 88.9544 17.4688 88.9544 14.8438C88.9544 12.2188 89.8138 9.98438 91.5325 8.14062C93.2513 6.28646 95.3346 5.35938 97.7825 5.35938C100.147 5.35938 102.152 6.20833 103.798 7.90625V5.95312H107.72V23.7031H103.798V21.7656C102.131 23.4427 100.121 24.2865 97.7669 24.2969ZM98.47 9.21875C96.9804 9.21875 95.7356 9.76042 94.7356 10.8438C93.7356 11.9167 93.2356 13.25 93.2356 14.8438C93.2356 16.4271 93.7356 17.7552 94.7356 18.8281C95.7356 19.901 96.9752 20.4375 98.4544 20.4375C99.944 20.4375 101.189 19.901 102.189 18.8281C103.199 17.7552 103.704 16.4219 103.704 14.8281C103.704 13.2344 103.204 11.901 102.204 10.8281C101.204 9.75521 99.9596 9.21875 98.47 9.21875Z" fill="#FFFFFF"/>
  <path d="M116.215 24.2969C113.788 24.2969 111.715 23.3802 109.996 21.5469C108.288 19.7031 107.434 17.4688 107.434 14.8438C107.434 12.2188 108.324 9.98438 110.106 8.14062C111.887 6.28646 114.043 5.35938 116.574 5.35938C118.606 5.38021 120.366 6.05208 121.856 7.375V0.03125H126.121V23.7031H122.199V21.7812C120.543 23.4583 118.548 24.2969 116.215 24.2969ZM116.902 9.21875C115.434 9.21875 114.199 9.76042 113.199 10.8438C112.21 11.9167 111.715 13.25 111.715 14.8438C111.715 16.4271 112.21 17.7552 113.199 18.8281C114.189 19.901 115.418 20.4375 116.887 20.4375C118.366 20.4375 119.606 19.901 120.606 18.8281C121.606 17.7552 122.106 16.4219 122.106 14.8281C122.106 13.2344 121.606 11.901 120.606 10.8281C119.616 9.75521 118.382 9.21875 116.902 9.21875Z" fill="#FFFFFF"/>
  <path d="M134.819 24.2969C132.205 24.2969 129.976 23.3802 128.132 21.5469C126.299 19.7031 125.382 17.4688 125.382 14.8438C125.382 12.2188 126.299 9.98438 128.132 8.14062C129.976 6.28646 132.205 5.35938 134.819 5.35938C137.444 5.35938 139.674 6.28646 141.507 8.14062C143.351 9.98438 144.272 12.2188 144.272 14.8438C144.272 17.4688 143.351 19.7031 141.507 21.5469C139.674 23.3802 137.444 24.2969 134.819 24.2969ZM134.819 20.4062C136.288 20.4062 137.517 19.875 138.507 18.8125C139.496 17.75 139.991 16.4271 139.991 14.8438C139.991 13.2604 139.496 11.9323 138.507 10.8594C137.517 9.78646 136.288 9.25 134.819 9.25C133.361 9.25 132.137 9.78646 131.147 10.8594C130.158 11.9323 129.663 13.2604 129.663 14.8438C129.663 16.4271 130.158 17.75 131.147 18.8125C132.137 19.875 133.361 20.4062 134.819 20.4062Z" fill="#FFFFFF"/>
  <path d="M152.156 20.875C152.156 22.4369 150.89 23.7031 149.328 23.7031C147.766 23.7031 146.5 22.4369 146.5 20.875C146.5 19.3131 147.766 18.0469 149.328 18.0469C150.89 18.0469 152.156 19.3131 152.156 20.875Z" fill="#FCC03B"/>
</svg>`;

const KONEKTADO_LOGO_SVG_DARK = KONEKTADO_LOGO_SVG_LIGHT.replaceAll('#FFFFFF', '#0F172A');

export function KonektadoWordmark({ color = 'dark', size = 'small', style }: KonektadoWordmarkProps) {
  const sizeMap = {
    small: { width: 152, height: 24 },
    medium: { width: 170, height: 27 },
    large: { width: 212, height: 34 },
  };

  const dimensions = sizeMap[size];
  const xml = color === 'light' ? KONEKTADO_LOGO_SVG_LIGHT : KONEKTADO_LOGO_SVG_DARK;

  return (
    <View style={style}>
      <SvgXml height={dimensions.height} width={dimensions.width} xml={xml} />
    </View>
  );
}

type GradientImageScreenProps = {
  children: ReactNode;
  source: ImageSourcePropType;
  darkness?: number;
  blueOpacity?: number;
  backgroundImageStyle?: StyleProp<ImageStyle>;
  backgroundResizeMode?: ImageResizeMode;
  backgroundTransitionDuration?: number;
  contentStyle?: StyleProp<ViewStyle>;
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
}: GradientImageScreenProps) {
  const { width, height } = useWindowDimensions();
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
        <OnboardingBackgroundLayer height={height} layer={previousLayer} opacity={previousOpacity} width={width} />
      ) : null}
      <OnboardingBackgroundLayer height={height} layer={currentLayer} opacity={fade} width={width} />
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
      <SafeAreaView edges={['top', 'bottom']} style={[styles.imageSafeArea, contentStyle]}>
        {children}
      </SafeAreaView>
    </View>
  );
}

type OnboardingBackgroundLayerProps = {
  height: number;
  layer: BackgroundLayer;
  opacity: Animated.AnimatedInterpolation<string | number> | Animated.Value;
  width: number;
};

function OnboardingBackgroundLayer({ height, layer, opacity, width }: OnboardingBackgroundLayerProps) {
  return (
    <Animated.View pointerEvents="none" style={[styles.backgroundFrame, { height, opacity, width }]}>
      <Animated.Image
        resizeMode={layer.resizeMode}
        source={layer.source}
        style={[styles.backgroundLayer, { height, width }, layer.imageStyle]}
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
    left: 0,
    position: 'absolute',
    top: 0,
  },
  backgroundLayer: {
    left: 0,
    position: 'absolute',
    top: 0,
  },
  imageSafeArea: {
    flex: 1,
  },
  wordmark: {
    fontFamily: 'AvantGarde',
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
    fontFamily: 'Satoshi-Bold',
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
