import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

import {
  FigmaVerificationFlow,
  type SelectedVerificationFiles,
  type VerificationFlowStep,
} from '@/components/verification/FigmaVerificationFlow';
import {
  createVerificationRequest,
  getMyVerificationPrefill,
} from '@/services/verification.service';
import type { VerificationUpload } from '@/types/onboarding.types';
import type {
  CreateVerificationRequestInput,
  VerificationIdType,
} from '@/types/verification.types';

type VerificationFormState = CreateVerificationRequestInput;

const emptyForm: VerificationFormState = {
  barangay: 'Barangay San Pedro',
  birthdate: '',
  city: 'Sto. Tomas',
  email: null,
  files: [],
  firstName: '',
  idType: 'national_id',
  lastName: '',
  note: '',
  phone: '',
  servicesOrPurpose: '',
  streetAddress: '',
};

export default function VerificationGateScreen() {
  const router = useRouter();
  const [step, setStep] = useState<VerificationFlowStep>('intro');
  const [form, setForm] = useState<VerificationFormState>(emptyForm);
  const [contactCode, setContactCode] = useState('');
  const [loadingPrefill, setLoadingPrefill] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [rejectedReason, setRejectedReason] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getMyVerificationPrefill().then((result) => {
      if (!active) return;

      if (result.error) {
        Alert.alert('Verification', result.error);
        setLoadingPrefill(false);
        return;
      }

      if (!result.data) {
        Alert.alert('Verification', 'Could not load your verification details.');
        setLoadingPrefill(false);
        return;
      }

      const prefill = result.data;

      setForm({
        ...emptyForm,
        barangay: prefill.barangay,
        birthdate: prefill.birthdate,
        city: prefill.city,
        email: prefill.email,
        firstName: prefill.firstName,
        lastName: prefill.lastName,
        phone: prefill.phone,
        servicesOrPurpose: prefill.servicesOrPurpose,
        streetAddress: prefill.streetAddress,
      });

      if (prefill.latestRequest?.status === 'pending') {
        setPendingRequestId(prefill.latestRequest.id);
      }

      if (prefill.latestRequest?.status === 'approved') {
        setStep('success');
      }

      if (prefill.latestRequest?.status === 'rejected') {
        setRejectedReason(prefill.latestRequest.reviewerNote);
        setStep('failure');
      }

      setLoadingPrefill(false);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!pendingRequestId || step !== 'submitted') return;

    let active = true;
    const timer = setInterval(() => {
      getMyVerificationPrefill().then((result) => {
        if (!active || result.error || !result.data?.latestRequest) return;

        const latest = result.data.latestRequest;
        if (latest.id !== pendingRequestId) return;

        if (latest.status === 'approved') {
          setStep('success');
        }

        if (latest.status === 'rejected') {
          setRejectedReason(latest.reviewerNote);
          setStep('failure');
        }
      });
    }, 5000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [pendingRequestId, step]);

  const selectedFiles: SelectedVerificationFiles = useMemo(() => {
    return {
      certificate: form.files.find((file) => file.fileType === 'certification'),
      facePhoto: form.files.find((file) => file.fileType === 'other'),
      idBack: form.files.find((file) => file.fileType === 'id_back'),
      idFront: form.files.find((file) => file.fileType === 'id_front'),
    };
  }, [form.files]);

  const setField = (field: keyof VerificationFormState, value: string | null) => {
    setForm((previous) => ({ ...previous, [field]: value }));
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

  const goBack = () => {
    if (step === 'intro') {
      router.back();
      return;
    }

    if (step === 'submitted' || step === 'success') {
      router.replace('/(tabs)');
      return;
    }

    if (step === 'failure') {
      router.back();
      return;
    }

    setStep(getPreviousStep(step, form.idType));
  };

  const pickFile = async (fileType: VerificationUpload['fileType']) => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: fileType === 'other' ? ['image/*'] : ['image/*', 'application/pdf'],
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const nextFile: VerificationUpload = {
      fileType,
      mimeType: asset.mimeType ?? null,
      name: asset.name ?? `${fileType}-upload`,
      size: asset.size ?? null,
      uri: asset.uri,
    };

    setForm((previous) => ({
      ...previous,
      files: [
        ...previous.files.filter((file) => file.fileType !== fileType),
        nextFile,
      ],
    }));
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
        Alert.alert('Verification request', result.error);
        return;
      }

      if (!result.data) {
        Alert.alert('Verification request', 'Could not submit your verification request.');
        return;
      }

      setPendingRequestId(result.data.id);
      setStep('submitted');
      return;
    }

    const validationMessage = validateStep();

    if (validationMessage) {
      Alert.alert('Check your details', validationMessage);
      return;
    }

    setStep(getNextStep(step, form.idType));
  };

  const resubmit = () => {
    setRejectedReason(null);
    setPendingRequestId(null);
    setStep('preflight');
  };

  return (
    <FigmaVerificationFlow
      contactCode={contactCode}
      files={selectedFiles}
      form={form}
      loadingPrefill={loadingPrefill}
      pendingRequestId={pendingRequestId}
      rejectedReason={rejectedReason}
      step={step}
      submitting={submitting}
      onBack={goBack}
      onChangeContactCode={setContactCode}
      onChangeField={setField}
      onChooseIdType={chooseIdType}
      onContinue={continueFlow}
      onContinueBrowsing={() => router.back()}
      onPickFile={pickFile}
      onProceedHome={() => router.replace('/(tabs)')}
      onRemoveFile={removeFile}
      onResubmit={resubmit}
      onViewProfile={() => router.replace('/(tabs)/profile')}
    />
  );
}

function getNextStep(
  step: VerificationFlowStep,
  idType: VerificationIdType,
): VerificationFlowStep {
  if (step === 'preflight') return 'details';
  if (step === 'details') return 'code';
  if (step === 'code') return 'idType';
  if (step === 'idType') return idType === 'barangay_certificate' ? 'certificate' : 'idFront';
  if (step === 'certificate') return 'facePrep';
  if (step === 'idFront') return 'idBack';
  if (step === 'idBack') return 'facePrep';
  if (step === 'facePrep') return 'facePhoto';
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
  if (step === 'idType') return 'code';
  if (step === 'certificate') return 'idType';
  if (step === 'idFront') return 'idType';
  if (step === 'idBack') return 'idFront';
  if (step === 'facePrep') return idType === 'barangay_certificate' ? 'certificate' : 'idBack';
  if (step === 'facePhoto') return 'facePrep';
  if (step === 'review') return 'facePhoto';
  return 'intro';
}
