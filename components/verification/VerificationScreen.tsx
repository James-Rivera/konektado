import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import {
  FigmaVerificationFlow,
  type SelectedVerificationFiles,
  type VerificationFlowMode,
  type VerificationFlowStep,
} from '@/components/verification/FigmaVerificationFlow';
import {
  cancelIncompleteVerificationRequest,
  createVerificationRequest,
  getMyVerificationPrefill,
  sendContactVerificationCode,
  verifyContactVerificationCode,
} from '@/services/verification.service';
import type { VerificationUpload } from '@/types/onboarding.types';
import type {
  ContactOtpDeliveryStatus,
  ContactOtpStatusType,
  CreateVerificationRequestInput,
  VerificationIdType,
  VerificationStatus,
} from '@/types/verification.types';
import type { LegalNameEditPolicy } from '@/types/legal-name.types';
import {
  getLegalNameEditPolicy,
  isNameMismatchCorrectionReason,
  NAME_CORRECTION_MESSAGE,
} from '@/utils/verified-name-policy';
import { showAlert } from '@/utils/alert';

type VerificationFormState = CreateVerificationRequestInput;

const emptyForm: VerificationFormState = {
  barangay: 'San Pedro',
  birthdate: '',
  city: 'Santo Tomas',
  contactOtpChallengeId: null,
  email: null,
  files: [],
  firstName: '',
  idType: 'barangay_certificate',
  lastName: '',
  note: '',
  phone: '',
  servicesOrPurpose: '',
  streetAddress: '',
};

/**
 * Verification controller shared by `/verification` (standalone) and the last
 * phase of onboarding (`/(onboarding)/verify`). The screen state machine is the
 * same; onboarding opens on the requirements screen, can be deferred with
 * "Do this later", and finishes on the all-set screen instead of Home.
 */
export function VerificationScreen({ mode = 'standalone' }: { mode?: VerificationFlowMode }) {
  const router = useRouter();
  const isOnboarding = mode === 'onboarding';
  const [step, setStep] = useState<VerificationFlowStep>(isOnboarding ? 'preflight' : 'intro');
  const [form, setForm] = useState<VerificationFormState>(emptyForm);
  const [contactCode, setContactCode] = useState('');
  const [contactSending, setContactSending] = useState(false);
  const [contactVerifying, setContactVerifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<ContactOtpStatusType>('info');
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);
  const [canVerify, setCanVerify] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<ContactOtpDeliveryStatus | null>(null);
  const [loadingPrefill, setLoadingPrefill] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [rejectedReason, setRejectedReason] = useState<string | null>(null);
  const [latestRequestStatus, setLatestRequestStatus] = useState<VerificationStatus | null>(null);
  const [legalNameEdit, setLegalNameEdit] = useState<LegalNameEditPolicy>(
    getLegalNameEditPolicy({ status: null }),
  );

  useEffect(() => {
    let active = true;

    getMyVerificationPrefill().then((result) => {
      if (!active) return;

      if (result.error) {
        showAlert('Verification', result.error);
        setLoadingPrefill(false);
        return;
      }

      if (!result.data) {
        showAlert('Verification', 'Could not load your verification details.');
        setLoadingPrefill(false);
        return;
      }

      const prefill = result.data;
      setLegalNameEdit(prefill.legalNameEdit);
      setLatestRequestStatus(prefill.latestRequest?.status ?? null);

      setForm({
        ...emptyForm,
        barangay: prefill.barangay,
        birthdate: prefill.birthdate,
        city: prefill.city,
        email: prefill.email,
        firstName: prefill.firstName,
        idType: prefill.latestRequest?.idType ?? emptyForm.idType,
        lastName: prefill.lastName,
        phone: prefill.phone,
        servicesOrPurpose: prefill.servicesOrPurpose,
        streetAddress: prefill.streetAddress,
      });

      if (prefill.latestRequest?.status === 'pending') {
        setPendingRequestId(prefill.latestRequest.id);
        if (prefill.latestRequest.uploadComplete === false) {
          setRejectedReason('Your documents did not finish uploading. Start again to submit a complete request.');
          setStep('failure');
        } else if (isOnboarding) {
          // Re-entering onboarding after submitting goes straight to the status.
          setStep('submitted');
        }
      }

      if (prefill.latestRequest?.status === 'approved') {
        setStep('success');
      }

      if (prefill.latestRequest?.status === 'rejected' || prefill.latestRequest?.status === 'needs_more_info') {
        setRejectedReason(getReturnedVerificationMessage(prefill.latestRequest.status, prefill.latestRequest.reviewerNote));
        setStep('failure');
      }

      setLoadingPrefill(false);
    });

    return () => {
      active = false;
    };
  }, [isOnboarding]);

  useEffect(() => {
    if (retryAfterSeconds <= 0) return;
    const timer = setInterval(() => {
      setRetryAfterSeconds((value) => Math.max(value - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [retryAfterSeconds]);

  useEffect(() => {
    if (!pendingRequestId || step !== 'submitted') return;

    let active = true;
    const timer = setInterval(() => {
      getMyVerificationPrefill().then((result) => {
        if (!active || result.error || !result.data?.latestRequest) return;

        const latest = result.data.latestRequest;
        if (latest.id !== pendingRequestId) return;

        if (latest.status === 'pending' && latest.uploadComplete === false) {
          setRejectedReason('Your documents did not finish uploading. Start again to submit a complete request.');
          setStep('failure');
          return;
        }

        if (latest.status === 'cancelled') {
          setPendingRequestId(null);
          setLatestRequestStatus(latest.status);
          setStep(isOnboarding ? 'preflight' : 'intro');
          return;
        }

        if (latest.status === 'approved') {
          setLatestRequestStatus(latest.status);
          setLegalNameEdit(getLegalNameEditPolicy({ status: latest.status, isVerified: true }));
          setStep('success');
        }

        if (latest.status === 'rejected' || latest.status === 'needs_more_info') {
          setLatestRequestStatus(latest.status);
          setLegalNameEdit(getLegalNameEditPolicy({
            reviewerNote: latest.reviewerNote,
            status: latest.status,
          }));
          setRejectedReason(getReturnedVerificationMessage(latest.status, latest.reviewerNote));
          setStep('failure');
        }
      });
    }, 5000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [isOnboarding, pendingRequestId, step]);

  const selectedFiles: SelectedVerificationFiles = useMemo(() => {
    return {
      certificate: form.files.find((file) => file.fileType === 'certification'),
      facePhoto: form.files.find((file) => file.fileType === 'other'),
      idBack: form.files.find((file) => file.fileType === 'id_back'),
      idFront: form.files.find((file) => file.fileType === 'id_front'),
    };
  }, [form.files]);

  const setField = (field: keyof VerificationFormState, value: string | null) => {
    setForm((previous) => ({
      ...previous,
      ...(field === 'phone' && value !== previous.phone
        ? { contactOtpChallengeId: null }
        : {}),
      [field]: value,
    }));
    if (field === 'phone') {
      setContactCode('');
      setStatusMessage(null);
      setStatusType('info');
      setRetryAfterSeconds(0);
      setCanVerify(false);
      setDeliveryStatus(null);
    }
  };

  /**
   * Resolves to 'code' when the resident must enter an SMS code, 'confirmed'
   * when the number was already confirmed at mobile signup (no SMS, skip the
   * code step), or null when contact verification could not start.
   */
  const sendContactCode = async (
    source: 'initial' | 'resend' = 'initial',
  ): Promise<'code' | 'confirmed' | null> => {
    if (!form.phone.trim()) {
      setStatusMessage('Enter a contact number for verification updates.');
      setStatusType('error');
      return null;
    }

    setContactSending(true);
    const result = await sendContactVerificationCode(form.phone);
    setContactSending(false);
    if (result.error || !result.data) {
      const message = result.error ?? 'Could not send a verification code.';
      const hasUsableChallenge = Boolean(form.contactOtpChallengeId && canVerify);
      if (result.errorCode === 'unauthorized') {
        showAlert('Contact verification', message);
        return null;
      }

      if (
        (result.errorCode === 'rate_limited' ||
          result.errorCode === 'invalid_phone') &&
        !hasUsableChallenge
      ) {
        setStatusMessage(
          result.errorCode === 'rate_limited'
            ? 'Please wait before requesting another code.'
            : message,
        );
        setStatusType('error');
        setRetryAfterSeconds(result.retryAfterSeconds ?? 0);
        setCanVerify(false);
        return null;
      }

      if (!hasUsableChallenge) {
        showAlert(
          'Contact verification unavailable',
          'We could not start contact verification right now. Please try again shortly.',
        );
        return null;
      }

      setStatusMessage(message);
      setStatusType('warning');
      return 'code';
    }

    if (!result.data.canVerify) {
      showAlert('Contact verification', 'Could not start contact verification.');
      return null;
    }

    setForm((previous) => ({
      ...previous,
      contactOtpChallengeId: result.data?.challengeId ?? null,
    }));

    if (result.data.deliveryStatus === 'auth_phone_confirmed' && result.data.verified) {
      setContactCode('');
      setRetryAfterSeconds(0);
      setCanVerify(true);
      setDeliveryStatus(result.data.deliveryStatus);
      setStatusMessage(result.data.message ?? 'Your mobile number is already confirmed.');
      setStatusType('success');
      return 'confirmed';
    }

    if (
      source === 'initial' ||
      result.data.deliveryStatus === 'sent' ||
      result.data.deliveryStatus === 'failed' ||
      result.data.deliveryStatus === 'simulated'
    ) {
      setContactCode('');
    }
    setRetryAfterSeconds(result.data.retryAfterSeconds ?? result.data.resendAfter);
    setCanVerify(result.data.canVerify);
    setDeliveryStatus(result.data.deliveryStatus);
    setStatusMessage(
      getContactOtpDeliveryMessage(
        result.data.deliveryStatus,
        form.phone,
        result.data.message,
      ),
    );
    setStatusType(getContactOtpStatusType(result.data.deliveryStatus));
    return 'code';
  };

  const changeContactCode = (value: string) => {
    setContactCode(value);
    if (statusType === 'error' && canVerify) {
      setStatusMessage(null);
      setStatusType('info');
    }
  };

  const chooseIdType = (idType: VerificationIdType) => {
    setForm((previous) => ({
      ...previous,
      files:
        idType === 'barangay_certificate'
          ? previous.files.filter((file) => file.fileType !== 'id_front' && file.fileType !== 'id_back')
          : previous.files.filter((file) => file.fileType !== 'certification'),
      idType,
    }));
  };

  const finish = () => {
    router.replace(isOnboarding ? '/(onboarding)/complete' : '/(tabs)');
  };

  const doLater = () => {
    router.replace({ pathname: '/(onboarding)/complete', params: { verification: 'later' } });
  };

  const goBack = () => {
    if (step === 'intro' || (isOnboarding && step === 'preflight')) {
      if (isOnboarding) {
        doLater();
        return;
      }
      router.back();
      return;
    }

    if (step === 'submitted' || step === 'success') {
      finish();
      return;
    }

    if (step === 'failure') {
      router.back();
      return;
    }

    const previousStep = getPreviousStep(step, form.idType);
    // An Auth-confirmed number never showed the code step, so back skips it.
    setStep(
      previousStep === 'code' && deliveryStatus === 'auth_phone_confirmed'
        ? 'details'
        : previousStep,
    );
  };

  const savePickedImage = (
    fileType: VerificationUpload['fileType'],
    image: {
      fileName?: string | null;
      fileSize?: number | null;
      mimeType?: string | null;
      uri: string;
    },
  ) => {
    const nextFile: VerificationUpload = {
      fileType,
      mimeType: image.mimeType ?? 'image/jpeg',
      name: image.fileName ?? `${fileType}-${Date.now()}.jpg`,
      size: image.fileSize ?? null,
      uri: image.uri,
    };

    setForm((previous) => ({
      ...previous,
      files: [
        ...previous.files.filter((file) => file.fileType !== fileType),
        nextFile,
      ],
    }));
  };

  const pickFile = async (fileType: VerificationUpload['fileType']) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      showAlert(
        'Upload from Gallery',
        'Photo library access is needed to choose an image. You can try again or use the camera.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      allowsMultipleSelection: false,
      mediaTypes: ['images'],
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    savePickedImage(fileType, {
      fileName: asset.fileName,
      fileSize: asset.fileSize,
      mimeType: asset.mimeType,
      uri: asset.uri,
    });
  };

  const capturePhoto = (
    fileType: VerificationUpload['fileType'],
    photo: { uri: string },
  ) => {
    savePickedImage(fileType, {
      fileName: `${fileType}-${Date.now()}.jpg`,
      fileSize: null,
      mimeType: 'image/jpeg',
      uri: photo.uri,
    });
  };

  const removeFile = (fileType: VerificationUpload['fileType']) => {
    setForm((previous) => ({
      ...previous,
      files: previous.files.filter((file) => file.fileType !== fileType),
    }));
  };

  const validateStep = () => {
    if (step === 'details') {
      if (!form.firstName.trim() || !form.lastName.trim()) {
        return 'Enter your first and last name as shown on your ID.';
      }

      if (!form.birthdate.trim()) {
        return 'Enter your date of birth.';
      }

      if (!form.phone.trim()) {
        return 'Enter a contact number for verification updates.';
      }
    }

    if (step === 'certificate' && !selectedFiles.certificate) {
      return 'Upload your barangay certificate.';
    }

    if (step === 'idFront' && !selectedFiles.idFront) {
      return 'Upload the front of your ID.';
    }

    if (step === 'idBack' && !selectedFiles.idBack) {
      return 'Upload the back of your ID.';
    }

    if (step === 'facePhoto' && !selectedFiles.facePhoto) {
      return 'Upload a clear face photo.';
    }

    return null;
  };

  const continueFlow = async () => {
    if (step === 'intro') {
      if (pendingRequestId) {
        setStep('submitted');
        return;
      }

      setStep('preflight');
      return;
    }

    if (step === 'review') {
      setSubmitting(true);
      const result = await createVerificationRequest(form);
      setSubmitting(false);

      if (result.error) {
        showAlert('Verification request', result.error);
        return;
      }

      if (!result.data) {
        showAlert('Verification request', 'Could not submit your verification request.');
        return;
      }

      setPendingRequestId(result.data.id);
      setLatestRequestStatus(result.data.status);
      setLegalNameEdit(getLegalNameEditPolicy({ status: result.data.status }));
      setStep('submitted');
      return;
    }

    const validationMessage = validateStep();

    if (validationMessage) {
      showAlert('Check your details', validationMessage);
      return;
    }

    if (step === 'details') {
      const contactResult = await sendContactCode('initial');
      if (!contactResult) return;
      if (contactResult === 'confirmed') {
        // Mobile signup already confirmed this number; no second SMS.
        setStep(getNextStep('code', form.idType));
        return;
      }
    }

    if (step === 'code') {
      if (!form.contactOtpChallengeId || contactCode.length !== 6) {
        setStatusMessage('Enter the complete 6-digit code.');
        setStatusType('error');
        return;
      }

      setContactVerifying(true);
      const result = await verifyContactVerificationCode({
        challengeId: form.contactOtpChallengeId,
        code: contactCode,
      });
      setContactVerifying(false);
      if (result.error) {
        if (result.errorCode === 'unauthorized') {
          showAlert('Contact verification', result.error);
          return;
        }

        if (result.errorCode === 'invalid_code') {
          setStatusMessage('The code is incorrect. Please try again.');
          setStatusType('error');
          return;
        }

        if (
          result.errorCode === 'attempt_limit_reached' ||
          result.errorCode === 'code_expired' ||
          result.errorCode === 'challenge_consumed' ||
          result.errorCode === 'challenge_not_found'
        ) {
          setCanVerify(false);
        }
        setStatusMessage(
          result.errorCode === 'code_expired'
            ? 'This code has expired. Please request a new code.'
            : result.error,
        );
        setStatusType('error');
        return;
      }
    }

    setStep(getNextStep(step, form.idType));
  };

  const resubmit = async () => {
    if (submitting) return;
    if (latestRequestStatus === 'pending' && pendingRequestId) {
      setSubmitting(true);
      const cancelled = await cancelIncompleteVerificationRequest(pendingRequestId);
      setSubmitting(false);
      if (cancelled.error) {
        showAlert('Verification request', cancelled.error);
        return;
      }
      setLatestRequestStatus('cancelled');
    }
    setRejectedReason(null);
    setPendingRequestId(null);
    setStep('preflight');
  };

  return (
    <FigmaVerificationFlow
      contactCode={contactCode}
      contactCanVerify={canVerify}
      contactDeliveryStatus={deliveryStatus}
      contactSending={contactSending}
      contactStatusMessage={statusMessage}
      contactStatusType={statusType}
      contactVerifying={contactVerifying}
      files={selectedFiles}
      form={form}
      loadingPrefill={loadingPrefill}
      legalNameEdit={legalNameEdit}
      latestRequestStatus={latestRequestStatus}
      pendingRequestId={pendingRequestId}
      rejectedReason={rejectedReason}
      step={step}
      submitting={submitting}
      onBack={goBack}
      onChangeContactCode={changeContactCode}
      onChangeField={setField}
      onChooseIdType={chooseIdType}
      onCapturePhoto={capturePhoto}
      onContinue={continueFlow}
      mode={mode}
      onContinueBrowsing={() => router.back()}
      onDoLater={doLater}
      onPickFile={pickFile}
      onProceedHome={finish}
      onUseDifferentIdType={() => setStep('idType')}
      onRemoveFile={removeFile}
      onResendContactCode={() => {
        if (!contactSending && retryAfterSeconds === 0) void sendContactCode('resend');
      }}
      onResubmit={resubmit}
      onViewProfile={() => router.replace('/(tabs)/profile')}
      retryAfterSeconds={retryAfterSeconds}
    />
  );
}

function getContactOtpDeliveryMessage(
  deliveryStatus: ContactOtpDeliveryStatus,
  phone: string,
  serverMessage?: string,
) {
  if (deliveryStatus === 'sent') {
    return `We sent a verification code to ${phone.trim()}.`;
  }
  if (
    deliveryStatus === 'already_sent' ||
    deliveryStatus === 'rate_limited_existing_challenge'
  ) {
    return 'A code was already sent. Please enter it below. You may request a new code later.';
  }
  if (deliveryStatus === 'failed') {
    return 'SMS delivery may be delayed. You can still enter a valid code.';
  }
  if (deliveryStatus === 'auth_phone_confirmed') {
    return 'Your mobile number is already confirmed.';
  }
  return serverMessage ?? 'A verification challenge is ready.';
}

function getContactOtpStatusType(
  deliveryStatus: ContactOtpDeliveryStatus,
): ContactOtpStatusType {
  if (deliveryStatus === 'sent' || deliveryStatus === 'auth_phone_confirmed') return 'success';
  if (deliveryStatus === 'failed') return 'warning';
  return 'info';
}

function getNextStep(
  step: VerificationFlowStep,
  idType: VerificationIdType,
): VerificationFlowStep {
  if (step === 'preflight') return 'details';
  if (step === 'details') return 'code';
  // Barangay Certificate is the default document (DEC-103), so the scan opens
  // directly. "Use a different ID type" on the scan screen opens the chooser.
  if (step === 'code') return idType === 'barangay_certificate' ? 'certificate' : 'idFront';
  if (step === 'idType') return idType === 'barangay_certificate' ? 'certificate' : 'idFront';
  if (step === 'certificate') return 'facePhoto';
  if (step === 'idFront') return 'idBack';
  if (step === 'idBack') return 'facePhoto';
  if (step === 'facePhoto') return 'review';
  return 'intro';
}

function getPreviousStep(
  step: VerificationFlowStep,
  idType: VerificationIdType,
): VerificationFlowStep {
  if (step === 'preflight') return 'intro';
  if (step === 'details') return 'preflight';
  if (step === 'code') return 'details';
  // The chooser is opened from a scan screen, so backing out returns there.
  if (step === 'idType') return idType === 'barangay_certificate' ? 'certificate' : 'idFront';
  if (step === 'certificate') return 'code';
  if (step === 'idFront') return 'code';
  if (step === 'idBack') return 'idFront';
  if (step === 'facePhoto') return idType === 'barangay_certificate' ? 'certificate' : 'idBack';
  if (step === 'review') return 'facePhoto';
  return 'intro';
}

function getReturnedVerificationMessage(status: VerificationStatus, reviewerNote: string | null) {
  if (status === 'needs_more_info' && isNameMismatchCorrectionReason(reviewerNote)) {
    return NAME_CORRECTION_MESSAGE;
  }

  return reviewerNote;
}
