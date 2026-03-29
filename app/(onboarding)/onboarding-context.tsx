import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

import { supabase } from '@/utils/supabase';

const DEFAULT_BARANGAY = 'Barangay San Pedro';
const DEFAULT_CITY = 'Sto. Tomas';

const initialDraft = {
  firstName: '',
  lastName: '',
  birthdate: '',
  streetAddress: '',
  city: DEFAULT_CITY,
  barangay: DEFAULT_BARANGAY,
  serviceType: '',
  hasCertifications: null as boolean | null,
  certificationDetails: '',
  wantsBarangayVerification: false,
  verificationNote: '',
  verificationFiles: [] as VerificationUpload[],
};

export type VerificationUpload = {
  uri: string;
  name: string;
  fileType: 'certification' | 'experience' | 'id_front' | 'id_back';
  mimeType?: string | null;
  size?: number | null;
};

export type OnboardingDraft = typeof initialDraft;

export type OnboardingContextValue = {
  draft: OnboardingDraft;
  role: 'client' | 'provider' | null;
  updateDraft: (patch: Partial<OnboardingDraft>) => void;
  loading: boolean;
  saving: boolean;
  setVerificationFiles: (files: VerificationUpload[]) => void;
  saveProfile: (options?: { requiresCertificationReview?: boolean }) => Promise<void>;
};

function buildCertificationDetails(draft: OnboardingDraft) {
  if (!draft.certificationDetails.trim()) {
    return null;
  }
  return draft.certificationDetails.trim();
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState(initialDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userMeta, setUserMeta] = useState<{ id: string; email: string | null } | null>(null);
  const [cachedRole, setCachedRole] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data: userResult, error: userError } = await supabase.auth.getUser();
      if (!active) return;

      if (userError || !userResult.user) {
        Alert.alert('Not signed in', 'Please sign in again to continue.');
        setLoading(false);
        return;
      }

      setUserMeta({ id: userResult.user.id, email: userResult.user.email ?? null });
      const metadataRole = (userResult.user.user_metadata as any)?.role ?? null;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(
          'first_name, last_name, full_name, birthdate, street_address, city, barangay, role, active_role'
        )
        .eq('id', userResult.user.id)
        .maybeSingle();

      if (!active) return;

      if (!profileError && profile) {
        const fallbackName = profile.full_name?.split(' ') ?? [];
        const candidateRole = profile.active_role ?? profile.role ?? metadataRole ?? null;
        const normalizedRole =
          candidateRole === 'client' || candidateRole === 'provider' ? candidateRole : null;

        let providerSnapshot: {
          service_type: string | null;
          has_certifications: boolean | null;
          certification_details: string | null;
        } | null = null;

        if (normalizedRole === 'provider') {
          const { data: providerProfile } = await supabase
            .from('provider_profiles')
            .select('service_type, has_certifications, certification_details')
            .eq('user_id', userResult.user.id)
            .maybeSingle();
          providerSnapshot = providerProfile ?? null;
        }

        setDraft((prev) => ({
          ...prev,
          firstName: profile.first_name ?? fallbackName[0] ?? '',
          lastName: profile.last_name ?? fallbackName.slice(1).join(' ') ?? '',
          birthdate: profile.birthdate ?? '',
          streetAddress: profile.street_address ?? '',
          city: profile.city || DEFAULT_CITY,
          barangay: profile.barangay || DEFAULT_BARANGAY,
          serviceType: providerSnapshot?.service_type ?? '',
          hasCertifications:
            typeof providerSnapshot?.has_certifications === 'boolean'
              ? providerSnapshot.has_certifications
              : null,
          certificationDetails: providerSnapshot?.certification_details ?? '',
          wantsBarangayVerification: false,
          verificationNote: '',
        }));
        setCachedRole(normalizedRole);
      } else {
        const normalizedRole =
          metadataRole === 'client' || metadataRole === 'provider' ? metadataRole : null;
        setCachedRole(normalizedRole);
      }

      setLoading(false);
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  const updateDraft = useCallback((patch: Partial<OnboardingDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const setVerificationFiles = useCallback((files: VerificationUpload[]) => {
    setDraft((prev) => ({ ...prev, verificationFiles: files }));
  }, []);

  const saveProfile = useCallback(
    async ({ requiresCertificationReview }: { requiresCertificationReview?: boolean } = {}) => {
      if (!userMeta) {
        Alert.alert('Not signed in', 'Please sign in again to continue.');
        return;
      }

      setSaving(true);

      const payload: Record<string, any> = {
        id: userMeta.id,
        email: userMeta.email,
        first_name: draft.firstName.trim(),
        last_name: draft.lastName.trim(),
        full_name: `${draft.firstName.trim()} ${draft.lastName.trim()}`.trim(),
        birthdate: draft.birthdate ? draft.birthdate : null,
        street_address: draft.streetAddress.trim() || null,
        city: draft.city.trim() || DEFAULT_CITY,
        barangay: draft.barangay || DEFAULT_BARANGAY,
      };

      if (cachedRole) {
        payload.role = cachedRole;
        payload.active_role = cachedRole;
      }

      const { error: profileError } = await supabase.from('profiles').upsert(payload);

      if (profileError) {
        setSaving(false);
        Alert.alert('Could not save profile', profileError.message);
        return;
      }

      if (cachedRole === 'provider') {
        const { error: providerProfileError } = await supabase.from('provider_profiles').upsert({
          user_id: userMeta.id,
          service_type: draft.serviceType.trim() || null,
          has_certifications:
            typeof draft.hasCertifications === 'boolean' ? draft.hasCertifications : null,
          certification_details: buildCertificationDetails(draft),
          certification_status: requiresCertificationReview ? 'pending' : null,
          updated_at: new Date().toISOString(),
        });

        if (providerProfileError) {
          setSaving(false);
          Alert.alert('Could not save provider profile', providerProfileError.message);
          return;
        }
      }

      if (cachedRole === 'client') {
        const { error: clientProfileError } = await supabase.from('client_profiles').upsert({
          user_id: userMeta.id,
          updated_at: new Date().toISOString(),
        });

        if (clientProfileError) {
          setSaving(false);
          Alert.alert('Could not save client profile', clientProfileError.message);
          return;
        }
      }

      if (cachedRole === 'provider' && draft.verificationFiles.length) {
        const { data: verification, error: verificationError } = await supabase
          .from('verifications')
          .insert({ user_id: userMeta.id, status: 'pending', notes: draft.verificationNote || null })
          .select()
          .maybeSingle();

        if (verificationError || !verification) {
          setSaving(false);
          Alert.alert('Profile saved, but could not start verification', verificationError?.message ?? 'Unknown error');
          return;
        }

        for (const file of draft.verificationFiles) {
          const response = await fetch(file.uri);
          const blob = await response.blob();
          const extension = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
          const path = `${userMeta.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

          const { data: storageResult, error: storageError } = await supabase.storage
            .from('verification-files')
            .upload(path, blob, {
              contentType: file.mimeType || blob.type || 'application/octet-stream',
              upsert: false,
            });

          if (storageError || !storageResult?.path) {
            setSaving(false);
            Alert.alert('Verification upload failed', storageError?.message ?? 'Unknown error');
            return;
          }

          const publicUrl = supabase.storage.from('verification-files').getPublicUrl(storageResult.path).data
            .publicUrl;

          const { error: vfError } = await supabase.from('verification_files').insert({
            verification_id: verification.id,
            file_type: file.fileType,
            url: publicUrl,
          });

          if (vfError) {
            setSaving(false);
            Alert.alert('Verification record failed', vfError.message);
            return;
          }
        }
      } else if (cachedRole === 'provider' && draft.wantsBarangayVerification) {
        await supabase
          .from('verifications')
          .insert({ user_id: userMeta.id, status: 'skipped', notes: draft.verificationNote || null });
      }

      setSaving(false);
    },
    [cachedRole, draft, userMeta]
  );

  const value = useMemo(
    () => ({ role: cachedRole as 'client' | 'provider' | null, draft, updateDraft, setVerificationFiles, loading, saving, saveProfile }),
    [cachedRole, draft, loading, saving, saveProfile, setVerificationFiles, updateDraft]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within the OnboardingProvider');
  }
  return ctx;
}

// This file is a provider, not a route; export a noop component to satisfy Expo Router
export default function OnboardingContextFile() {
  return null;
}
