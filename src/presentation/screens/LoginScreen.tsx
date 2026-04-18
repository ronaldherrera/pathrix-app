// ============================================================
// PATHRIX - Login / Register Screen
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Colors, Typography, Spacing, Radius } from '../../core/theme';
import { useAuthStore } from '../store/authStore';
import {
  firebaseSignIn, firebaseSignUp, createUserDocument,
  getUserDocument, isOnlineModeAvailable,
  signInWithGoogle, signInWithApple,
  isUsernameAvailable,
} from '../../data/services/FirebaseService';
import { eloToRank } from '../store/authStore';
import { GlassCard, glassStyle } from '../components/ui';
import { useI18n } from '../../core/i18n';

WebBrowser.maybeCompleteAuthSession();

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { t } = useI18n();
  const { setUser } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleMode = () => { setIsLogin(!isLogin); setErrors({}); };

  // ── Google Sign-In ──────────────────────────────────────────
  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    webClientId: '224820063552-vvq28osmjti4dinqc9pn2krhnb41302r.apps.googleusercontent.com',
    androidClientId: '224820063552-g2ir4kdupesb026opjvfgpg2q4e4iu4j.apps.googleusercontent.com',
    iosClientId: '224820063552-nu49rn1fcg181tlfa04d7l83vm1btr6n.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
  });

  React.useEffect(() => {
    if (googleResponse?.type === 'success') {
      const idToken = googleResponse.authentication?.idToken;
      if (idToken) handleSocialLogin('google', idToken);
    }
  }, [googleResponse]);

  // ── Apple Sign-In ───────────────────────────────────────────
  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      // Generate a random raw nonce then hash it for Apple
      const rawNonce = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
      if (credential.identityToken) {
        await handleSocialLogin('apple', credential.identityToken, rawNonce);
      } else {
        Alert.alert('Error', 'Apple Sign-In did not return a token.');
      }
    } catch (err: any) {
      if (err.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Error', 'Apple Sign-In failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple', token: string, nonce?: string) => {
    setLoading(true);
    try {
      const firebaseUser = provider === 'google'
        ? await signInWithGoogle(token)
        : await signInWithApple(token, nonce!);

      // Check if user doc exists, create if not
      let profile = await getUserDocument(firebaseUser.uid);
      if (!profile) {
        const displayName = firebaseUser.displayName ?? firebaseUser.email?.split('@')[0] ?? 'Player';
        await createUserDocument(firebaseUser.uid, displayName, firebaseUser.email ?? '');
        profile = await getUserDocument(firebaseUser.uid);
      }
      setUser({
        uid: firebaseUser.uid,
        displayName: profile?.displayName ?? firebaseUser.displayName ?? 'Player',
        email: firebaseUser.email ?? '',
        avatarUrl: firebaseUser.photoURL ?? null,
        elo: profile?.elo ?? 1200,
        gamesPlayed: profile?.gamesPlayed ?? 0,
        gamesWon: profile?.gamesWon ?? 0,
        gamesLost: profile?.gamesLost ?? 0,
        currentStreak: profile?.currentStreak ?? 0,
        bestStreak: profile?.bestStreak ?? 0,
        friendIds: profile?.friendIds ?? [],
        createdAt: profile?.createdAt?.toMillis?.() ?? Date.now(),
        rank: eloToRank(profile?.elo ?? 1200),
      });
      navigation.navigate('Home');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Invalid email address';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Min. 6 characters';
    if (!isLogin && !displayName.trim()) newErrors.displayName = 'Username is required';
    if (!isLogin && displayName.length > 20) newErrors.displayName = 'Max 20 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      if (isLogin) {
        const cred = await firebaseSignIn(email, password);
        const profile = await getUserDocument(cred.user.uid);
        if (profile) {
          setUser({
            uid: cred.user.uid,
            displayName: profile.displayName,
            email: profile.email,
            avatarUrl: profile.avatarUrl,
            elo: profile.elo ?? 1200,
            gamesPlayed: profile.gamesPlayed ?? 0,
            gamesWon: profile.gamesWon ?? 0,
            gamesLost: profile.gamesLost ?? 0,
            currentStreak: profile.currentStreak ?? 0,
            bestStreak: profile.bestStreak ?? 0,
            friendIds: profile.friendIds ?? [],
            createdAt: profile.createdAt?.toMillis?.() ?? Date.now(),
            rank: eloToRank(profile.elo ?? 1200),
          });
        }
      } else {
        // 1. Check username availability first
        const available = await isUsernameAvailable(displayName);
        if (!available) {
          Alert.alert('Error', t('auth.usernameTaken'));
          setLoading(false);
          return;
        }

        const cred = await firebaseSignUp(email, password, displayName);
        await createUserDocument(cred.user.uid, displayName, email);
        setUser({
          uid: cred.user.uid, displayName, email, avatarUrl: null,
          elo: 1200, gamesPlayed: 0, gamesWon: 0, gamesLost: 0,
          currentStreak: 0, bestStreak: 0, friendIds: [],
          createdAt: Date.now(), rank: eloToRank(1200),
        });
      }
      navigation.navigate('Home');
    } catch (err: any) {
      if (err.message === 'USERNAME_TAKEN') {
        Alert.alert('Error', t('auth.usernameTaken'));
      } else {
        const msg = err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password'
          ? 'Invalid email or password'
          : err.code === 'auth/email-already-in-use'
          ? 'Email already in use'
          : err.message ?? 'Something went wrong';
        Alert.alert('Error', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: '#000000' }}
        >
          {/* Logo */}
          <View style={styles.logoSection}>
            <Text style={styles.logo}>
              <Text style={styles.logoPath}>PATH</Text>
              <Text style={styles.logoRix}>RIX</Text>
            </Text>
            <Text style={styles.logoSub}>Connect. Loop. Conquer.</Text>
          </View>

          <GlassCard style={styles.formCard}>
            {/* Toggle */}
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, isLogin && styles.toggleBtnActive]}
                onPress={() => !isLogin && toggleMode()}
              >
                <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, !isLogin && styles.toggleBtnActive]}
                onPress={() => isLogin && toggleMode()}
              >
                <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>Sign Up</Text>
              </TouchableOpacity>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {!isLogin && (
                <InputField
                  icon="person-outline"
                  placeholder="Username"
                  value={displayName}
                  onChangeText={setDisplayName}
                  error={errors.displayName}
                  autoCapitalize="none"
                />
              )}
              <InputField
                icon="mail-outline"
                placeholder="Email address"
                value={email}
                onChangeText={setEmail}
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <InputField
                icon="lock-closed-outline"
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                error={errors.password}
                secureTextEntry={!showPassword}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textMuted} />
                  </TouchableOpacity>
                }
              />

              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator size="small" color={Colors.textPrimary} />
                  : <Text style={styles.submitBtnText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
                }
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google */}
              <TouchableOpacity
                style={styles.socialBtn}
                onPress={() => promptGoogleAsync()}
                disabled={!googleRequest || loading}
              >
                <Ionicons name="logo-google" size={20} color={Colors.textPrimary} />
                <Text style={styles.socialBtnText}>Continue with Google</Text>
              </TouchableOpacity>

              {/* Apple — only shown on iOS */}
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={[styles.socialBtn, styles.appleBtn]}
                  onPress={handleAppleSignIn}
                  disabled={loading}
                >
                  <Ionicons name="logo-apple" size={20} color="#000" />
                  <Text style={[styles.socialBtnText, { color: '#000' }]}>Continue with Apple</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.guestBtn} onPress={() => navigation.navigate('Home')}>
                <Text style={styles.guestBtnText}>Continue as Guest</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>

          {!isOnlineModeAvailable && (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineBannerText}>
                ⚠️ Firebase not configured — online features disabled.
              </Text>
            </View>
          )}

          <Text style={styles.footerText}>
            {isLogin ? 'Forgot password? Contact support.' : 'By signing up you agree to our Terms of Service.'}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

interface InputFieldProps {
  icon: string; placeholder: string; value: string;
  onChangeText: (v: string) => void; error?: string;
  secureTextEntry?: boolean; keyboardType?: any;
  autoCapitalize?: any; rightIcon?: React.ReactNode;
}

const InputField: React.FC<InputFieldProps> = ({
  icon, placeholder, value, onChangeText, error,
  secureTextEntry, keyboardType, autoCapitalize, rightIcon,
}) => (
  <View style={inputStyles.container}>
    <View style={[inputStyles.inputRow, error && inputStyles.inputError]}>
      <Ionicons name={icon as any} size={20} color={Colors.textMuted} style={inputStyles.icon} />
      <TextInput
        style={inputStyles.input}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
      />
      {rightIcon}
    </View>
    {error && <Text style={inputStyles.errorText}>{error}</Text>}
  </View>
);

const inputStyles = StyleSheet.create({
  container: { marginBottom: Spacing.sm },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    ...glassStyle,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
  },
  inputError: { borderTopColor: Colors.error, borderLeftColor: Colors.error },
  icon: { marginRight: Spacing.sm },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Typography.md,
    paddingVertical: Spacing.md,
  },
  errorText: { color: Colors.error, fontSize: Typography.xs, marginTop: 4, marginLeft: 4 },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000' },
  scrollContent: { flexGrow: 1, padding: Spacing.lg, justifyContent: 'center', paddingBottom: 48 },

  logoSection: { alignItems: 'center', marginBottom: Spacing.xl },
  logo: { fontSize: 42, letterSpacing: 2.94 },
  logoPath: { color: '#ffffff', fontFamily: 'SairaStencilOne_400Regular' },
  logoRix:  { color: Colors.orange, fontFamily: 'SairaStencilOne_400Regular' },
  logoSub: { color: Colors.textMuted, fontSize: Typography.xs, letterSpacing: 2, marginTop: 4 },

  formCard: { borderRadius: Radius.xxl, padding: Spacing.lg, marginBottom: Spacing.md },

  toggleRow: {
    flexDirection: 'row',
    ...glassStyle,
    borderRadius: Radius.xl,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  toggleBtn: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.lg },
  toggleBtnActive: { backgroundColor: Colors.orange },
  toggleText: { color: Colors.textMuted, fontSize: Typography.md },
  toggleTextActive: { color: Colors.textPrimary, fontWeight: '600' },

  form: { gap: Spacing.xs },

  submitBtn: {
    backgroundColor: Colors.orange,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: Colors.textPrimary, fontSize: Typography.md, fontWeight: 'bold' },

  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginVertical: Spacing.md },
  dividerLine: { flex: 1, height: 0.5, backgroundColor: 'rgba(255,255,255,0.15)' },
  dividerText: { color: Colors.textMuted, fontSize: Typography.sm },

  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing?.sm || 8,
    paddingVertical: Spacing?.md || 16,
    borderRadius: Radius?.xl || 16,
    ...glassStyle,
    marginBottom: Spacing?.xs || 4,
  },
  appleBtn: {
    backgroundColor: '#ffffff',
    borderTopColor: 'rgba(0,0,0,0.1)',
    borderLeftColor: 'rgba(0,0,0,0.1)',
  },
  socialBtnText: { color: Colors.textPrimary, fontSize: Typography.md, fontWeight: '600' },

  guestBtn: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: Radius.xl,
    ...glassStyle,
  },
  guestBtnText: { color: Colors.textSecondary, fontSize: Typography.md },

  offlineBanner: {
    backgroundColor: 'rgba(164, 95, 52, 0.15)',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderTopWidth: 0.4,
    borderLeftWidth: 0.4,
    borderTopColor: Colors.orange,
    borderLeftColor: Colors.orange,
    borderBottomWidth: 0.1,
    borderRightWidth: 0.1,
    borderBottomColor: 'rgba(164,95,52,0.1)',
    borderRightColor: 'rgba(164,95,52,0.1)',
    marginTop: Spacing.md,
  },
  offlineBannerText: { color: Colors.warning, fontSize: Typography.xs, textAlign: 'center' },

  footerText: { color: Colors.textMuted, fontSize: Typography.xs, textAlign: 'center', marginTop: Spacing.lg },
});

export default LoginScreen;
