import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import type React from 'react';
import { useRef, useState, type ComponentProps } from 'react';
import { ActivityIndicator, ImageBackground, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KonektadoWordmark } from '@/components/KonektadoWordmark';
import { color, radius } from '@/constants/theme';
import type { VerificationUpload } from '@/types/onboarding.types';
import type { CreateVerificationRequestInput, VerificationIdType } from '@/types/verification.types';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

export type VerificationFlowStep =
  | 'intro'
  | 'preflight'
  | 'details'
  | 'code'
  | 'idType'
  | 'idFront'
  | 'idBack'
  | 'certificate'
  | 'facePrep'
  | 'facePhoto'
  | 'review'
  | 'submitted'
  | 'success'
  | 'failure';

export type SelectedVerificationFiles = {
  certificate?: VerificationUpload;
  facePhoto?: VerificationUpload;
  idBack?: VerificationUpload;
  idFront?: VerificationUpload;
};

type VerificationFlowProps = {
  contactCode: string;
  files: SelectedVerificationFiles;
  form: CreateVerificationRequestInput;
  loadingPrefill: boolean;
  pendingRequestId: string | null;
  rejectedReason?: string | null;
  step: VerificationFlowStep;
  submitting: boolean;
  onBack: () => void;
  onChangeContactCode: (value: string) => void;
  onChangeField: (field: keyof CreateVerificationRequestInput, value: string | null) => void;
  onChooseIdType: (idType: VerificationIdType) => void;
  onContinue: () => void;
  onContinueBrowsing: () => void;
  onPickFile: (fileType: VerificationUpload['fileType']) => void;
  onProceedHome: () => void;
  onRemoveFile: (fileType: VerificationUpload['fileType']) => void;
  onResubmit: () => void;
  onViewProfile: () => void;
};

const idTypeOptions: {
  description: string;
  icon: MaterialIconName;
  title: string;
  value: VerificationIdType;
}[] = [
  {
    description: 'Recommended',
    icon: 'workspace-premium',
    title: 'Barangay Certificate',
    value: 'barangay_certificate',
  },
  {
    description: 'Physical or eGovPH Digital ID',
    icon: 'badge',
    title: 'National ID',
    value: 'national_id',
  },
  {
    description: 'Accepted government ID with photo.',
    icon: 'directions-car',
    title: "Driver's License",
    value: 'drivers_license',
  },
  {
    description: 'Accepted government ID with photo.',
    icon: 'article',
    title: 'Passport',
    value: 'passport',
  },
];

const idTypeLabels: Record<VerificationIdType, string> = {
  barangay_certificate: 'Barangay Certificate',
  national_id: 'National ID',
  drivers_license: "Driver's License",
  passport: 'Passport',
};

export function FigmaVerificationFlow({
  contactCode,
  files,
  form,
  loadingPrefill,
  pendingRequestId,
  rejectedReason,
  step,
  submitting,
  onBack,
  onChangeContactCode,
  onChangeField,
  onChooseIdType,
  onContinue,
  onContinueBrowsing,
  onPickFile,
  onProceedHome,
  onRemoveFile,
  onResubmit,
  onViewProfile,
}: VerificationFlowProps) {
  if (step === 'intro') {
    return (
      <LightFrame
        footer={
          <FooterStack>
            <PrimaryButton label="Let's Start" onPress={onContinue} />
            <SecondaryButton label="Continue Browsing" onPress={onContinueBrowsing} />
          </FooterStack>
        }
        headerTitle="Get Verified"
        onBack={onBack}>
        <IntroScreen pending={Boolean(pendingRequestId)} />
      </LightFrame>
    );
  }

  if (step === 'preflight') {
    return (
      <LightFrame
        footer={
          <FooterStack helper="Takes about 2-3 minutes to submit">
            <PrimaryButton label="Start verification" onPress={onContinue} />
          </FooterStack>
        }
        headerTitle="Get Verified"
        onBack={onBack}>
        <PreflightScreen />
      </LightFrame>
    );
  }

  if (step === 'details') {
    return (
      <LightFrame
        footer={<FooterStack><PrimaryButton disabled={loadingPrefill} label="Continue" onPress={onContinue} /></FooterStack>}
        onBack={onBack}
        progress={1}>
        <DetailsScreen
          form={form}
          loading={loadingPrefill}
          onChangeField={onChangeField}
        />
      </LightFrame>
    );
  }

  if (step === 'code') {
    return (
      <LightFrame
        footer={<FooterStack><PrimaryButton label="Continue" onPress={onContinue} /></FooterStack>}
        onBack={onBack}
        progress={1}>
        <CodeScreen
          contactCode={contactCode}
          email={form.email}
          phone={form.phone}
          onChangeContactCode={onChangeContactCode}
        />
      </LightFrame>
    );
  }

  if (step === 'idType') {
    return (
      <LightFrame
        footer={<FooterStack><PrimaryButton label="Continue" onPress={onContinue} /></FooterStack>}
        onBack={onBack}
        progress={2}>
        <IdTypeScreen
          selectedIdType={form.idType}
          onChooseIdType={onChooseIdType}
        />
      </LightFrame>
    );
  }

  if (step === 'idFront') {
    return (
      <CaptureScreen
        file={files.idFront}
        frame="landscape"
        progress={2}
        subtitle="Place the front of your ID inside the frame."
        title="Scan ID front"
        onBack={onBack}
        onCapture={() => onPickFile('id_front')}
        onContinue={onContinue}
        onRemove={() => onRemoveFile('id_front')}
        onUpload={() => onPickFile('id_front')}
      />
    );
  }

  if (step === 'idBack') {
    return (
      <CaptureScreen
        file={files.idBack}
        frame="landscape"
        progress={2}
        subtitle="Place the back of your ID inside the frame."
        title="Scan ID Back"
        onBack={onBack}
        onCapture={() => onPickFile('id_back')}
        onContinue={onContinue}
        onRemove={() => onRemoveFile('id_back')}
        onUpload={() => onPickFile('id_back')}
      />
    );
  }

  if (step === 'certificate') {
    return (
      <CaptureScreen
        file={files.certificate}
        frame="portrait"
        progress={2}
        subtitle="Place the certificate inside the frame."
        title="Scan Certificate"
        onBack={onBack}
        onCapture={() => onPickFile('certification')}
        onContinue={onContinue}
        onRemove={() => onRemoveFile('certification')}
        onUpload={() => onPickFile('certification')}
      />
    );
  }

  if (step === 'facePrep') {
    return (
      <LightFrame
        footer={<FooterStack><PrimaryButton label="Continue" onPress={onContinue} /></FooterStack>}
        onBack={onBack}
        progress={3}>
        <FacePrepScreen />
      </LightFrame>
    );
  }

  if (step === 'facePhoto') {
    return (
      <CaptureScreen
        file={files.facePhoto}
        frame="face"
        progress={3}
        subtitle="Remove masks, hats, or anything covering your face"
        title="Take a face photo"
        onBack={onBack}
        onCapture={() => onPickFile('other')}
        onContinue={onContinue}
        onRemove={() => onRemoveFile('other')}
        onUpload={() => onPickFile('other')}
      />
    );
  }

  if (step === 'review') {
    return (
      <LightFrame
        footer={
          <FooterStack>
            <PrimaryButton
              disabled={submitting}
              label="Continue"
              loading={submitting}
              onPress={onContinue}
            />
          </FooterStack>
        }
        onBack={onBack}
        progress={4}>
        <ReviewScreen
          files={files}
          form={form}
        />
      </LightFrame>
    );
  }

  if (step === 'success') {
    return (
      <ResultScreen
        icon="check-circle"
        iconColor="#2F9E44"
        note="You can now post jobs, show interest in jobs, message users, and receive reviews based on your role."
        primaryLabel="Proceed to Konektado"
        secondaryLabel="View profile"
        subtitle="You have been approved for Konektado"
        title="You are verified"
        onBack={onBack}
        onPrimary={onProceedHome}
        onSecondary={onViewProfile}
      />
    );
  }

  if (step === 'failure') {
    return (
      <ResultScreen
        danger
        icon="sentiment-dissatisfied"
        iconColor={color.verificationBlue}
        note={rejectedReason || 'The ID photo is blurry. Please upload a clearer photo where your name and photo are readable.'}
        noteTitle="Reason for correction"
        primaryLabel="Resubmit documents"
        secondaryLabel="Contact Support"
        subtitle="We could not approve the request yet"
        title="Needs Correction"
        onBack={onBack}
        onPrimary={onResubmit}
        onSecondary={onProceedHome}
      />
    );
  }

  return (
    <ResultScreen
      icon="celebration"
      iconColor={color.verificationBlue}
      note="You can still browse Konektado, but posting, showing interest in jobs, messaging, and reviews are locked until approval."
      noteTitle="Pending Review"
      primaryLabel="Continue"
      subtitle="Barangay staff will review your request"
      title="Verification Submitted"
      onBack={onBack}
      onPrimary={onProceedHome}
    />
  );
}

function LightFrame({
  children,
  footer,
  headerTitle,
  progress,
  onBack,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerTitle?: string;
  progress?: number;
  onBack: () => void;
}) {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screen}>
        <TopHeader onBack={onBack} progress={progress} title={headerTitle} />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
        {footer}
      </View>
    </SafeAreaView>
  );
}

function TopHeader({
  dark,
  progress,
  title,
  onBack,
}: {
  dark?: boolean;
  progress?: number;
  title?: string;
  onBack: () => void;
}) {
  return (
    <View style={[styles.header, dark && styles.darkHeader]}>
      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        hitSlop={10}
        onPress={onBack}
        style={styles.backButton}>
        <MaterialIcons color={dark ? color.white : color.text} name="chevron-left" size={28} />
      </Pressable>
      {title ? <Text style={[styles.headerTitle, dark && styles.darkText]}>{title}</Text> : null}
      {progress ? <StepDots current={progress} /> : null}
    </View>
  );
}

function StepDots({ current }: { current: number }) {
  return (
    <View style={styles.dots}>
      <View style={styles.dotsTrack}>
        {Array.from({ length: 4 }).map((_, index) => (
          <View
            key={index}
            style={[styles.dot, index < current ? styles.dotActive : styles.dotInactive]}
          />
        ))}
      </View>
    </View>
  );
}

function IntroScreen({ pending }: { pending: boolean }) {
  return (
    <>
      <View style={styles.introHeroBlock}>
        <KonektadoWordmark size="small" />
        <Text style={styles.eyebrow}>Barangay E-Verification</Text>
        <ImageBackground
          imageStyle={styles.heroImage}
          source={require('../../assets/images/verification-hero-figma.jpg')}
          style={styles.hero}>
          <Text style={styles.heroText}>Build trust in your community</Text>
        </ImageBackground>
      </View>
      <View style={styles.contentBlock}>
        <Text style={styles.sectionTitle}>Why get verified?</Text>
        <Text style={styles.sectionCaption}>Access more features and connect safely in your community.</Text>
        {pending ? (
          <InfoNote text="Your verification request is already pending barangay review." />
        ) : null}
        <View style={styles.cardStack}>
          <RequirementCard
            filled
            icon="business-center"
            title="Post Jobs"
            description="Find workers in your barangay quickly"
          />
          <RequirementCard
            filled
            icon="chat"
            title="Message verified users"
            description="Connect directly with verified users"
          />
          <RequirementCard
            filled
            icon="description"
            title="Show interest in jobs"
            description="Get hired for nearby opportunities"
          />
          <RequirementCard
            filled
            icon="check-circle"
            title="Build trust in your community"
            description="Connect with real people in your barangay"
          />
        </View>
      </View>
    </>
  );
}

function PreflightScreen() {
  return (
    <>
      <CenteredTitle
        subtitle="Make sure you're ready before you start."
        title="Before you continue"
      />
      <View style={styles.contentBlock}>
        <Text style={styles.centerSectionTitle}>What you will need</Text>
        <View style={styles.cardStack}>
          <RequirementCard
            icon="badge"
            title="A valid government ID"
            description="Accepted IDs: National ID, Driver's License, UMID, Passport + more"
          />
          <RequirementCard
            icon="photo-camera"
            title="A clear photo of your face"
            description="Make sure your face is fully visible and uncovered."
          />
          <RequirementCard
            icon="lightbulb"
            title="Good lighting"
            description="Use a well-lit area so your ID and face are clearly visible."
          />
        </View>
      </View>
    </>
  );
}

function DetailsScreen({
  form,
  loading,
  onChangeField,
}: {
  form: CreateVerificationRequestInput;
  loading: boolean;
  onChangeField: (field: keyof CreateVerificationRequestInput, value: string | null) => void;
}) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const selectedDate = form.birthdate ? new Date(form.birthdate) : new Date('2000-01-01');

  const onDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(false);
    if (!date) return;
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    onChangeField('birthdate', `${year}-${month}-${day}`);
  };

  return (
    <>
      <CenteredTitle
        subtitle="We use these details for barangay verification and support."
        title="Confirm Account Details"
      />
      <View style={styles.formBlock}>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={color.verificationBlue} size="small" />
            <Text style={styles.loadingText}>Loading your details...</Text>
          </View>
        ) : (
          <>
            <FigmaInput
              label="First Name"
              onChangeText={(value) => onChangeField('firstName', value)}
              value={form.firstName}
            />
            <FigmaInput
              label="Last Name"
              onChangeText={(value) => onChangeField('lastName', value)}
              value={form.lastName}
            />
            <DateField
              onPress={() => setShowDatePicker(true)}
              value={form.birthdate}
            />
            {showDatePicker ? (
              <DateTimePicker
                display="default"
                maximumDate={new Date()}
                mode="date"
                onChange={onDateChange}
                value={selectedDate}
              />
            ) : null}
            <Text style={styles.inlineHelp}>These came from your account. Edit them first if they do not match your ID.</Text>
            <FigmaInput
              keyboardType="phone-pad"
              label="Phone Number"
              onChangeText={(value) => onChangeField('phone', value)}
              value={form.phone}
            />
            <InfoNote text="Used for verification updates, support, and account recovery. Not shown publicly." />
          </>
        )}
      </View>
    </>
  );
}

function DateField({ onPress, value }: { onPress: () => void; value: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.inputField}>
      {value ? <Text style={styles.inputLabel}>Date of Birth</Text> : null}
      <View style={styles.dateFieldRow}>
        <Text style={[styles.dateText, !value && styles.datePlaceholder]}>
          {value || 'Date of Birth'}
        </Text>
        <MaterialIcons color="#AFAFAF" name="calendar-today" size={22} />
      </View>
    </Pressable>
  );
}

function CodeScreen({
  contactCode,
  email,
  phone,
  onChangeContactCode,
}: {
  contactCode: string;
  email: string | null;
  phone: string;
  onChangeContactCode: (value: string) => void;
}) {
  const inputRef = useRef<TextInput>(null);
  const contact = phone.trim() || email || 'your contact detail';
  const digits = contactCode.padEnd(6, ' ').slice(0, 6).split('');

  return (
    <View style={styles.codeScreen}>
      <Text style={styles.largeTitle}>Enter the code</Text>
      <Text style={styles.codeSubtitle}>We have sent a code to {contact}</Text>
      <Text style={styles.resendText}>Resend in 30s</Text>
      <Pressable
        accessibilityLabel="Enter verification code"
        accessibilityRole="button"
        onPress={() => inputRef.current?.focus()}
        style={styles.otpRow}>
        {digits.map((digit, index) => (
          <View
            key={index}
            style={[styles.otpBox, index === Math.min(contactCode.length, 5) && styles.otpBoxActive]}>
            <Text style={styles.otpText}>{digit.trim()}</Text>
          </View>
        ))}
      </Pressable>
      <TextInput
        accessibilityLabel="Verification code"
        keyboardType="number-pad"
        maxLength={6}
        onChangeText={(value) => onChangeContactCode(value.replace(/\D/g, '').slice(0, 6))}
        ref={inputRef}
        style={styles.hiddenCodeInput}
        value={contactCode}
      />
    </View>
  );
}

function IdTypeScreen({
  selectedIdType,
  onChooseIdType,
}: {
  selectedIdType: VerificationIdType;
  onChooseIdType: (idType: VerificationIdType) => void;
}) {
  return (
    <>
      <CenteredTitle
        subtitle="Choose the document you will submit for manual barangay review."
        title="Select ID type"
      />
      <View style={styles.idOptions}>
        {idTypeOptions.map((option) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: selectedIdType === option.value }}
            key={option.value}
            onPress={() => onChooseIdType(option.value)}
            style={[
              styles.idOption,
              selectedIdType === option.value && styles.idOptionSelected,
            ]}>
            <MaterialIcons color={color.verificationBlue} name={option.icon} size={34} />
            <View style={styles.idOptionCopy}>
              <Text style={styles.cardTitle}>{option.title}</Text>
              <Text style={styles.cardDescription}>{option.description}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </>
  );
}

function FacePrepScreen() {
  return (
    <>
      <CenteredTitle
        subtitle="Barangay staff will compare this photo with your submitted document."
        title="Get ready for your face photo"
      />
      <View style={styles.contentBlock}>
        <Text style={styles.centerSectionTitle}>Before taking your photo</Text>
        <View style={styles.cardStack}>
          <RequirementCard
            icon="photo-camera"
            title="Use your own photo"
            description="Do not upload another person's photo."
          />
          <RequirementCard
            icon="center-focus-strong"
            title="Show your full face"
            description="Remove masks, hats, sunglasses, or anything covering your face."
          />
          <RequirementCard
            icon="lightbulb"
            title="Use good lighting"
            description="Take the photo in a bright area so your face is clear."
          />
        </View>
      </View>
    </>
  );
}

function ReviewScreen({
  files,
  form,
}: {
  files: SelectedVerificationFiles;
  form: CreateVerificationRequestInput;
}) {
  const fullName = `${form.firstName} ${form.lastName}`.trim() || 'Not provided';
  const usesCertificate = form.idType === 'barangay_certificate';

  return (
    <>
      <CenteredTitle
        subtitle="Check your details before sending them for verification"
        title="Review and submit"
      />
      <View style={styles.reviewBlock}>
        <View style={styles.reviewCard}>
          <ReviewSection title="Personal Details">
            <ReviewLine label="Full Name:" value={fullName} />
            <ReviewLine label="Email:" value={form.email || 'Not provided'} />
          </ReviewSection>
          <ReviewSection title="Documents">
            <ReviewLine label="ID Type:" value={idTypeLabels[form.idType]} />
            {usesCertificate ? (
              <ReviewLine link label="Certificate:" value={files.certificate ? 'Uploaded' : 'Missing'} />
            ) : (
              <>
                <ReviewLine link label="ID Front:" value={files.idFront ? 'Uploaded' : 'Missing'} />
                <ReviewLine link label="ID Back:" value={files.idBack ? 'Uploaded' : 'Missing'} />
              </>
            )}
            <ReviewLine link label="Face Photo:" value={files.facePhoto ? 'Uploaded' : 'Missing'} />
          </ReviewSection>
          <ReviewSection title="Barangay">
            <Text style={styles.reviewText}>
              Verification handled by{'\n'}
              <Text style={styles.reviewBold}>{form.barangay || 'Barangay San Pedro'}.</Text>
            </Text>
            <Text style={styles.reviewText}>
              Not your barangay? <Text style={styles.reviewLink}>Edit</Text>
            </Text>
          </ReviewSection>
        </View>
        <InfoNote text="Your documents are only visible to authorized barangay admins for verification" />
      </View>
    </>
  );
}

function CaptureScreen({
  file,
  frame,
  progress,
  subtitle,
  title,
  onBack,
  onCapture,
  onContinue,
  onRemove,
  onUpload,
}: {
  file?: VerificationUpload;
  frame: 'face' | 'landscape' | 'portrait';
  progress: number;
  subtitle: string;
  title: string;
  onBack: () => void;
  onCapture: () => void;
  onContinue: () => void;
  onRemove: () => void;
  onUpload: () => void;
}) {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.darkSafeArea}>
      <View style={styles.darkScreen}>
        <TopHeader dark onBack={onBack} progress={progress} />
        <View style={styles.cameraStage}>
          <Text style={styles.cameraTitle}>{title}</Text>
          <Text style={styles.cameraSubtitle}>{subtitle}</Text>
          <View
            style={[
              styles.captureFrame,
              frame === 'portrait' && styles.captureFramePortrait,
              frame === 'face' && styles.captureFrameFace,
            ]}>
            {file ? (
              <View style={styles.uploadedBadge}>
                <MaterialIcons color={color.brandYellow} name="check-circle" size={28} />
                <Text style={styles.uploadedText}>Uploaded</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.reminderTitle}>Reminder</Text>
          <Text style={styles.reminderText}>Make sure the name and photo are readable.</Text>
          {file ? <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text> : null}
        </View>
        <View style={styles.darkFooter}>
          <PrimaryButton label={file ? 'Continue' : 'Capture'} onPress={file ? onContinue : onCapture} />
          <SecondaryButton
            dark
            label={file ? 'Remove upload' : 'Upload from Gallery'}
            onPress={file ? onRemove : onUpload}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function ResultScreen({
  danger,
  icon,
  iconColor,
  note,
  noteTitle,
  primaryLabel,
  secondaryLabel,
  subtitle,
  title,
  onBack,
  onPrimary,
  onSecondary,
}: {
  danger?: boolean;
  icon: MaterialIconName;
  iconColor: string;
  note: string;
  noteTitle?: string;
  primaryLabel: string;
  secondaryLabel?: string;
  subtitle: string;
  title: string;
  onBack: () => void;
  onPrimary: () => void;
  onSecondary?: () => void;
}) {
  return (
    <LightFrame
      footer={
        <FooterStack>
          <PrimaryButton label={primaryLabel} onPress={onPrimary} />
          {secondaryLabel && onSecondary ? (
            <SecondaryButton label={secondaryLabel} onPress={onSecondary} />
          ) : null}
        </FooterStack>
      }
      onBack={onBack}>
      <View style={styles.resultIntro}>
        <MaterialIcons color={iconColor} name={icon} size={82} />
        <View style={styles.resultCopy}>
          <Text style={styles.resultTitle}>{title}</Text>
          <Text style={styles.resultSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.resultBody}>
        <View style={[styles.statusCard, danger && styles.statusCardDanger]}>
          {noteTitle ? <Text style={styles.statusTitle}>{noteTitle}</Text> : null}
          <Text style={styles.statusText}>{note}</Text>
        </View>
      </View>
    </LightFrame>
  );
}

function CenteredTitle({ subtitle, title }: { subtitle: string; title: string }) {
  return (
    <View style={styles.centeredTitleBlock}>
      <Text style={styles.centeredTitle}>{title}</Text>
      <Text style={styles.centeredSubtitle}>{subtitle}</Text>
    </View>
  );
}

function RequirementCard({
  description,
  filled,
  icon,
  title,
}: {
  description: string;
  filled?: boolean;
  icon: MaterialIconName;
  title: string;
}) {
  return (
    <View style={[styles.requirementCard, filled && styles.requirementCardFilled]}>
      <MaterialIcons color={color.accentYellow} name={icon} size={filled ? 24 : 34} />
      <View style={styles.cardCopy}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>
    </View>
  );
}

function FigmaInput({
  keyboardType,
  label,
  onChangeText,
  value,
}: {
  keyboardType?: 'default' | 'phone-pad';
  label: string;
  onChangeText: (value: string) => void;
  value: string;
}) {
  return (
    <View style={styles.inputField}>
      {value ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <TextInput
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor="#AFAFAF"
        style={styles.textInput}
        value={value}
      />
    </View>
  );
}

function InfoNote({ text }: { text: string }) {
  return (
    <View style={styles.infoNote}>
      <MaterialIcons color={color.verificationBlue} name="info-outline" size={24} />
      <Text style={styles.infoNoteText}>{text}</Text>
    </View>
  );
}

function FooterStack({
  children,
  helper,
}: {
  children: React.ReactNode;
  helper?: string;
}) {
  return (
    <View style={styles.footer}>
      {children}
      {helper ? <Text style={styles.footerHelper}>{helper}</Text> : null}
    </View>
  );
}

function PrimaryButton({
  disabled,
  label,
  loading,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        disabled && styles.disabledButton,
        pressed && !disabled && styles.pressed,
      ]}>
      {loading ? (
        <ActivityIndicator color={color.white} size="small" />
      ) : (
        <Text style={styles.primaryButtonText}>{label}</Text>
      )}
    </Pressable>
  );
}

function SecondaryButton({
  dark,
  label,
  onPress,
}: {
  dark?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        dark && styles.secondaryButtonDark,
        pressed && styles.pressed,
      ]}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function ReviewSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <View style={styles.reviewSection}>
      <Text style={styles.reviewSectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ReviewLine({
  label,
  link,
  value,
}: {
  label: string;
  link?: boolean;
  value: string;
}) {
  return (
    <Text style={styles.reviewText}>
      {label}{'\n'}
      <Text style={link ? styles.reviewLink : styles.reviewValue}>{value}</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: color.background,
    flex: 1,
  },
  darkSafeArea: {
    backgroundColor: '#090909',
    flex: 1,
  },
  screen: {
    backgroundColor: color.background,
    flex: 1,
  },
  darkScreen: {
    backgroundColor: '#090909',
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: color.background,
    flexDirection: 'row',
    height: 55,
    paddingHorizontal: 18,
    position: 'relative',
  },
  darkHeader: {
    backgroundColor: '#090909',
  },
  backButton: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    marginRight: 8,
    width: 32,
    zIndex: 2,
  },
  headerTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 18,
    lineHeight: 24,
  },
  darkText: {
    color: color.white,
  },
  dots: {
    alignItems: 'center',
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    top: 0,
    pointerEvents: 'none',
  },
  dotsTrack: {
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'center',
    width: 144,
  },
  dot: {
    borderRadius: 3,
    flex: 1,
    height: 6,
  },
  dotActive: {
    backgroundColor: color.brandYellow,
  },
  dotInactive: {
    backgroundColor: 'rgba(241, 240, 228, 0.7)',
  },
  introHeroBlock: {
    backgroundColor: color.background,
    paddingHorizontal: 21,
    paddingTop: 8,
  },
  eyebrow: {
    color: color.verificationBlue,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 18,
  },
  hero: {
    height: 135,
    justifyContent: 'flex-end',
    marginTop: 10,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    width: '100%',
  },
  heroImage: {
    borderRadius: radius.sm,
  },
  heroText: {
    color: color.white,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 18,
    paddingBottom: 12,
    paddingHorizontal: 10,
  },
  contentBlock: {
    backgroundColor: color.background,
    gap: 8,
    paddingHorizontal: 19,
    paddingTop: 17,
  },
  sectionTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 18,
  },
  sectionCaption: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 10,
    lineHeight: 14,
  },
  centerSectionTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  cardStack: {
    gap: 10,
  },
  requirementCard: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderColor: '#FFF0F0',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 10,
    minHeight: 72,
    padding: 16,
  },
  requirementCardFilled: {
    backgroundColor: color.verificationCard,
    borderBottomColor: 'rgba(0, 0, 0, 0.25)',
    borderBottomWidth: 1,
    borderColor: color.verificationCard,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 0,
    elevation: 1,
  },
  cardCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  cardTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Medium',
    fontSize: 15,
    lineHeight: 20,
  },
  cardDescription: {
    color: 'rgba(60,60,67,0.6)',
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  centeredTitleBlock: {
    alignItems: 'center',
    backgroundColor: color.background,
    gap: 8,
    paddingBottom: 16,
    paddingHorizontal: 18,
    paddingTop: 26,
  },
  centeredTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Black',
    fontSize: 20,
    lineHeight: 26,
    textAlign: 'center',
  },
  centeredSubtitle: {
    color: color.text,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 292,
    textAlign: 'center',
  },
  formBlock: {
    gap: 12,
    paddingHorizontal: 19,
    paddingTop: 16,
  },
  inputField: {
    borderColor: '#AFAFAF',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  inputLabel: {
    color: '#AFAFAF',
    fontFamily: 'Satoshi-Regular',
    fontSize: 10,
    lineHeight: 12,
  },
  textInput: {
    color: color.text,
    fontFamily: 'Satoshi-Regular',
    fontSize: 16,
    lineHeight: 20,
    minHeight: 24,
    padding: 0,
  },
  dateFieldRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 24,
  },
  dateText: {
    color: color.text,
    fontFamily: 'Satoshi-Regular',
    fontSize: 16,
    lineHeight: 20,
  },
  datePlaceholder: {
    color: '#AFAFAF',
  },
  inlineHelp: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 11,
    lineHeight: 15,
    paddingHorizontal: 3,
  },
  infoNote: {
    alignItems: 'center',
    backgroundColor: color.verificationCard,
    borderRadius: 13,
    flexDirection: 'row',
    gap: 10,
    minHeight: 68,
    padding: 16,
  },
  infoNoteText: {
    color: color.textMuted,
    flex: 1,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 16,
  },
  loadingText: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  codeScreen: {
    paddingHorizontal: 18,
    paddingTop: 74,
  },
  largeTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Black',
    fontSize: 24,
    lineHeight: 39,
  },
  codeSubtitle: {
    color: color.text,
    fontFamily: 'Satoshi-Light',
    fontSize: 13,
    lineHeight: 20,
  },
  resendText: {
    color: color.primary,
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },
  otpRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 36,
    justifyContent: 'center',
    width: '100%',
  },
  otpBox: {
    alignItems: 'center',
    borderColor: '#D5D7DA',
    borderRadius: 10,
    borderWidth: 1,
    height: 54,
    justifyContent: 'center',
    width: 47,
  },
  otpBoxActive: {
    borderColor: color.accentYellow,
  },
  otpText: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 18,
    lineHeight: 24,
  },
  hiddenCodeInput: {
    color: 'transparent',
    height: 1,
    opacity: 0.01,
    width: 1,
  },
  idOptions: {
    gap: 11,
    paddingHorizontal: 12,
    paddingTop: 20,
  },
  idOption: {
    alignItems: 'center',
    borderColor: '#FFF0F0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 71,
    padding: 16,
  },
  idOptionSelected: {
    backgroundColor: '#ECF4FF',
    borderColor: color.verificationBlue,
  },
  idOptionCopy: {
    flex: 1,
    gap: 2,
  },
  cameraStage: {
    alignItems: 'center',
    backgroundColor: '#AFAFAF',
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 58,
  },
  cameraTitle: {
    color: color.white,
    fontFamily: 'Satoshi-Bold',
    fontSize: 21,
    lineHeight: 28,
    textAlign: 'center',
  },
  cameraSubtitle: {
    color: color.white,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    maxWidth: 292,
    textAlign: 'center',
  },
  captureFrame: {
    alignItems: 'center',
    borderColor: color.brandYellow,
    borderRadius: 24,
    borderStyle: 'dashed',
    borderWidth: 2,
    height: 210,
    justifyContent: 'center',
    marginTop: 42,
    width: '100%',
  },
  captureFramePortrait: {
    height: 315,
    marginTop: 34,
    width: 242,
  },
  captureFrameFace: {
    borderRadius: 145,
    height: 343,
    marginTop: 34,
    width: 290,
  },
  uploadedBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(9, 9, 9, 0.45)',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  uploadedText: {
    color: color.white,
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    lineHeight: 18,
  },
  reminderTitle: {
    color: color.white,
    fontFamily: 'Satoshi-Black',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 24,
    textAlign: 'center',
  },
  reminderText: {
    color: color.white,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  fileName: {
    color: color.white,
    fontFamily: 'Satoshi-Regular',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
    maxWidth: 320,
  },
  darkFooter: {
    backgroundColor: '#090909',
    gap: 20,
    paddingHorizontal: 17,
    paddingTop: 22,
    paddingBottom: 24,
  },
  reviewBlock: {
    gap: 16,
    paddingHorizontal: 17,
    paddingTop: 10,
  },
  reviewCard: {
    borderColor: '#E8E8ED',
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    paddingHorizontal: 21,
    paddingVertical: 26,
  },
  reviewSection: {
    gap: 14,
  },
  reviewSectionTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
    lineHeight: 20,
  },
  reviewText: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  reviewValue: {
    color: color.textMuted,
  },
  reviewBold: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Bold',
  },
  reviewLink: {
    color: color.verificationBlue,
    fontFamily: 'Satoshi-Bold',
    textDecorationLine: 'underline',
  },
  resultIntro: {
    alignItems: 'center',
    gap: 28,
    paddingHorizontal: 18,
    paddingTop: 72,
  },
  resultCopy: {
    alignItems: 'center',
    gap: 8,
  },
  resultTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Black',
    fontSize: 20,
    lineHeight: 26,
    textAlign: 'center',
  },
  resultSubtitle: {
    color: color.text,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  resultBody: {
    paddingHorizontal: 19,
    paddingTop: 34,
  },
  statusCard: {
    backgroundColor: '#ECF4FF',
    borderColor: color.verificationBlue,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
    minHeight: 124,
    padding: 21,
  },
  statusCardDanger: {
    backgroundColor: '#FFF0F0',
    borderColor: '#C21717',
  },
  statusTitle: {
    color: color.text,
    fontFamily: 'Satoshi-Black',
    fontSize: 16,
    lineHeight: 20,
  },
  statusText: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 13,
    lineHeight: 19,
  },
  footer: {
    alignItems: 'center',
    backgroundColor: color.background,
    gap: 10,
    paddingBottom: 12,
    paddingHorizontal: 17,
    paddingTop: 12,
  },
  footerHelper: {
    color: color.textMuted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: color.verificationBlue,
    borderRadius: 14,
    height: 43,
    justifyContent: 'center',
    width: '100%',
  },
  primaryButtonText: {
    color: color.white,
    fontFamily: 'Satoshi-Black',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: color.background,
    borderColor: '#FFF0F0',
    borderRadius: 14,
    borderWidth: 1,
    height: 43,
    justifyContent: 'center',
    width: '100%',
  },
  secondaryButtonDark: {
    backgroundColor: color.white,
    borderColor: color.white,
  },
  secondaryButtonText: {
    color: color.text,
    fontFamily: 'Satoshi-Black',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: color.textSubtle,
  },
  pressed: {
    opacity: 0.78,
  },
});
