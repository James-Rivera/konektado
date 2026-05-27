import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KonektadoWordmark } from '@/components/KonektadoWordmark';
import { adminPalette } from '@/components/admin/AdminShell';
import { color, radius, space } from '@/constants/theme';
import { signInWithEmailPassword } from '@/services/auth.service';
import { getInternalDemoEditorAccess } from '@/services/internal-demo-editor.service';
import { supabase } from '@/utils/supabase';

export default function InternalLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      const access = await getInternalDemoEditorAccess();
      if (!active) return;

      if (access.data) {
        router.replace('/internal/demo-editor');
        return;
      }

      setCheckingSession(false);
    })();

    return () => {
      active = false;
    };
  }, [router]);

  const onLogin = async () => {
    if (loading) return;

    setErrorMessage(null);
    setLoading(true);

    const signIn = await signInWithEmailPassword({ email, password });
    if (signIn.error) {
      setLoading(false);
      setErrorMessage(signIn.error);
      return;
    }

    const access = await getInternalDemoEditorAccess();
    if (access.data) {
      setLoading(false);
      router.replace('/internal/demo-editor');
      return;
    }

    await supabase.auth.signOut();
    setLoading(false);
    setErrorMessage(access.error ?? 'This account is not allowed to use the internal demo editor.');
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <StatusBar backgroundColor={adminPalette.blue} style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.shell}>
            <View style={styles.brandBar}>
              <KonektadoWordmark color="light" size="large" />
              <Text style={styles.brandLabel}>Internal Web Tool</Text>
            </View>

            <View style={styles.panel}>
              <View style={styles.iconBadge}>
                <MaterialIcons color={adminPalette.blue} name="admin-panel-settings" size={34} />
              </View>
              <Text style={styles.title}>Internal Demo Content Editor</Text>
              <Text style={styles.subtitle}>
                Sign in with an allowed admin account to curate demo content. This is separate from the public app flow.
              </Text>

              {errorMessage ? (
                <View style={styles.errorBox}>
                  <MaterialIcons color={adminPalette.dangerDeep} name="error-outline" size={18} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              <View style={styles.form}>
                <View style={styles.field}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="email"
                    editable={!checkingSession && !loading}
                    keyboardType="email-address"
                    onChangeText={setEmail}
                    placeholder="internal@example.com"
                    placeholderTextColor={adminPalette.faint}
                    style={styles.input}
                    textContentType="emailAddress"
                    value={email}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.passwordWrap}>
                    <TextInput
                      autoComplete="password"
                      editable={!checkingSession && !loading}
                      onChangeText={setPassword}
                      placeholder="Password"
                      placeholderTextColor={adminPalette.faint}
                      secureTextEntry={!passwordVisible}
                      style={[styles.input, styles.passwordInput]}
                      textContentType="password"
                      value={password}
                    />
                    <Pressable
                      accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
                      accessibilityRole="button"
                      disabled={checkingSession || loading}
                      hitSlop={8}
                      onPress={() => setPasswordVisible((visible) => !visible)}
                      style={({ pressed }) => [styles.passwordButton, pressed && styles.pressed]}>
                      <Text style={styles.passwordButtonText}>{passwordVisible ? 'Hide' : 'Show'}</Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                disabled={checkingSession || loading}
                onPress={() => void onLogin()}
                style={({ pressed }) => [
                  styles.primaryButton,
                  (checkingSession || loading) && styles.disabled,
                  pressed && !checkingSession && !loading && styles.pressed,
                ]}>
                <Text style={styles.primaryButtonText}>
                  {checkingSession ? 'Checking session...' : loading ? 'Signing in...' : 'Open Internal Editor'}
                </Text>
              </Pressable>

              <View style={styles.notice}>
                <MaterialIcons color={adminPalette.faint} name="lock" size={18} />
                <Text style={styles.noticeText}>
                  This route is for the development team only. It is not part of the official barangay admin experience.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: adminPalette.blue,
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    backgroundColor: adminPalette.canvasSoft,
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  shell: {
    borderRadius: radius.md,
    maxWidth: 520,
    overflow: 'hidden',
    width: '100%',
  },
  brandBar: {
    alignItems: 'center',
    backgroundColor: adminPalette.blue,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 86,
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  brandLabel: {
    color: color.white,
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  panel: {
    backgroundColor: color.white,
    borderColor: adminPalette.line,
    borderWidth: 1,
    gap: 18,
    padding: 24,
  },
  iconBadge: {
    alignItems: 'center',
    backgroundColor: adminPalette.blueSoft,
    borderColor: adminPalette.blueLine,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 66,
    justifyContent: 'center',
    width: 66,
  },
  title: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 24,
    lineHeight: 30,
  },
  subtitle: {
    color: adminPalette.muted,
    fontFamily: 'Satoshi-Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    gap: 14,
  },
  field: {
    gap: 7,
  },
  label: {
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    backgroundColor: color.white,
    borderColor: adminPalette.lineStrong,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: adminPalette.ink,
    fontFamily: 'Satoshi-Regular',
    fontSize: 15,
    minHeight: 46,
    paddingHorizontal: 13,
    paddingVertical: Platform.OS === 'ios' ? 11 : 8,
  },
  passwordWrap: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 72,
  },
  passwordButton: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    position: 'absolute',
    right: 10,
    top: 0,
    width: 52,
  },
  passwordButtonText: {
    color: adminPalette.blue,
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: adminPalette.blue,
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: space.lg,
  },
  primaryButtonText: {
    color: color.white,
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
  },
  notice: {
    alignItems: 'flex-start',
    backgroundColor: adminPalette.canvasSoft,
    borderColor: adminPalette.line,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    padding: 12,
  },
  noticeText: {
    color: adminPalette.muted,
    flex: 1,
    fontFamily: 'Satoshi-Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  errorBox: {
    alignItems: 'flex-start',
    backgroundColor: adminPalette.dangerSoft,
    borderColor: '#F5D3D3',
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    padding: 12,
  },
  errorText: {
    color: adminPalette.dangerDeep,
    flex: 1,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.58,
  },
});
