import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { customFetch } from '@workspace/api-client-react';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Design tokens ───────────────────────────────────────────────────────────
const C = {
  bg: '#050508',
  surface: '#0a0a12',
  surfaceHigh: '#10101e',
  border: '#1c1c2e',
  borderFocus: '#5B5EFF',
  accent: '#5B5EFF',
  accentGlow: '#5B5EFF',
  accentLight: '#818CF8',
  text: '#F0F0FF',
  textMuted: '#5a5a7a',
  textDim: '#32324a',
  error: '#FF4560',
  errorBg: 'rgba(255,69,96,0.08)',
  success: '#00D68F',
  warning: '#FFB700',
};

// ─── Animated Brand Icon ──────────────────────────────────────────────────────
function BrandMark({ size = 64 }: { size?: number }) {
  const orbit1 = useRef(new Animated.Value(0)).current;
  const orbit2 = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(orbit1, { toValue: 1, duration: 9000, useNativeDriver: true, easing: Easing.linear })
    ).start();
    Animated.loop(
      Animated.timing(orbit2, { toValue: -1, duration: 6500, useNativeDriver: true, easing: Easing.linear })
    ).start();
    // glow uses JS driver because it drives opacity/shadow (not transform)
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1800, useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0.4, duration: 1800, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const spin1 = orbit1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const spin2 = orbit2.interpolate({ inputRange: [-1, 0], outputRange: ['-360deg', '0deg'] });
  const glowOpacity = glow.interpolate({ inputRange: [0.4, 1], outputRange: [0.05, 0.14] });
  const r1 = size * 0.44;
  const r2 = size * 0.28;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Glow under */}
      <Animated.View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        backgroundColor: C.accent, opacity: glowOpacity,
        transform: [{ scale: 1.3 }],
      }} />
      {/* Outer orbit ring */}
      <Animated.View style={[{
        position: 'absolute',
        width: r1 * 2, height: r1 * 2, borderRadius: r1,
        borderWidth: 1.5, borderColor: C.accent,
        opacity: 0.6,
      }, { transform: [{ rotate: spin1 }] }]}>
        {/* Orbital dot */}
        <View style={{
          position: 'absolute', top: -4, left: r1 - 4,
          width: 7, height: 7, borderRadius: 4,
          backgroundColor: C.accentLight,
          shadowColor: C.accent, shadowOpacity: 1, shadowRadius: 6,
        }} />
      </Animated.View>
      {/* Inner ring */}
      <Animated.View style={[{
        position: 'absolute',
        width: r2 * 2, height: r2 * 2, borderRadius: r2,
        borderWidth: 1.5, borderColor: C.accentLight,
        opacity: 0.8,
      }, { transform: [{ rotate: spin2 }, { scaleX: 0.4 }] }]} />
      {/* Center dot */}
      <View style={{
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: '#fff',
        shadowColor: C.accent, shadowOpacity: 0.9, shadowRadius: 12,
        elevation: 6,
      }} />
    </View>
  );
}

// ─── Password strength ────────────────────────────────────────────────────────
function getStrength(pw: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (pw.length === 0) return { level: 0, label: '', color: C.textDim };
  if (pw.length < 6) return { level: 1, label: 'Weak', color: C.error };
  if (pw.length < 10 || !/\d/.test(pw)) return { level: 2, label: 'Fair', color: C.warning };
  return { level: 3, label: 'Strong', color: C.success };
}

// ─── Animated input ────────────────────────────────────────────────────────────
function AuthInput({
  icon, placeholder, value, onChangeText, secureTextEntry, keyboardType, autoCapitalize, returnKeyType, onSubmitEditing, inputRef,
}: {
  icon: string; placeholder: string; value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean; keyboardType?: any; autoCapitalize?: any;
  returnKeyType?: any; onSubmitEditing?: () => void;
  inputRef?: React.RefObject<TextInput>;
}) {
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
  };

  const handleBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [C.border, C.borderFocus],
  });

  const bgColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [C.surface, C.surfaceHigh],
  });

  return (
    <Animated.View style={[inputStyles.wrap, { borderColor, backgroundColor: bgColor }]}>
      <Ionicons name={icon as any} size={17} color={focused ? C.accentLight : C.textMuted} style={inputStyles.icon} />
      <TextInput
        ref={inputRef}
        style={inputStyles.input}
        placeholder={placeholder}
        placeholderTextColor={C.textDim}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry && !showPw}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'none'}
        onFocus={handleFocus}
        onBlur={handleBlur}
        returnKeyType={returnKeyType ?? 'next'}
        onSubmitEditing={onSubmitEditing}
        selectionColor={C.accent}
      />
      {secureTextEntry && (
        <TouchableOpacity onPress={() => setShowPw(v => !v)} style={inputStyles.eyeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={17} color={C.textMuted} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const inputStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 15, gap: 12,
  },
  icon: {},
  input: { flex: 1, color: C.text, fontSize: 15, fontFamily: 'Inter_400Regular', letterSpacing: 0.1 },
  eyeBtn: { padding: 2 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quickUser, setQuickUser] = useState<{ name: string; email: string } | null>(null);
  const [entryDone, setEntryDone] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // Entry animation values
  const logoAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  const formTranslate = useRef(new Animated.Value(24)).current;

  // Tab slide animation
  const tabAnim = useRef(new Animated.Value(0)).current;

  // Error shake animation
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Field presence animation for signup
  const nameFieldHeight = useRef(new Animated.Value(0)).current;
  const nameFieldOpacity = useRef(new Animated.Value(0)).current;

  // Button shimmer
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Load previously logged-in user
    AsyncStorage.multiGet(['lastSessionName', 'lastSessionEmail']).then(pairs => {
      const n = pairs[0][1];
      const e = pairs[1][1];
      if (n && e) {
        setQuickUser({ name: n, email: e });
        setEmail(e);
      }
    });
  }, []);

  useEffect(() => {
    // Entry sequence
    Animated.stagger(120, [
      Animated.spring(logoAnim, { toValue: 1, friction: 7, tension: 50, useNativeDriver: true }),
      Animated.timing(titleAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(formAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(formTranslate, { toValue: 0, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
    ]).start(() => setEntryDone(true));

    // Shimmer loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const switchMode = (newMode: 'login' | 'signup') => {
    if (newMode === mode) return;
    Animated.spring(tabAnim, {
      toValue: newMode === 'signup' ? 1 : 0,
      friction: 7, tension: 80, useNativeDriver: false,
    }).start();
    if (newMode === 'signup') {
      setMode('signup');
      Animated.parallel([
        Animated.spring(nameFieldHeight, { toValue: 58, friction: 8, tension: 70, useNativeDriver: false }),
        Animated.timing(nameFieldOpacity, { toValue: 1, duration: 250, useNativeDriver: false }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(nameFieldHeight, { toValue: 0, friction: 8, tension: 70, useNativeDriver: false }),
        Animated.timing(nameFieldOpacity, { toValue: 0, duration: 200, useNativeDriver: false }),
      ]).start(() => setMode('login'));
    }
    setError('');
  };

  const shakeError = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -9, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 7, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -5, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  const handleSubmit = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      shakeError(); return;
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your full name.');
      shakeError(); return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      shakeError(); return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const result = await customFetch<{ userId: string; profile: any }>('/users/register', {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
            startDate: new Date().toISOString().split('T')[0],
          }),
        });
        await AsyncStorage.multiSet([
          ['userId', result.userId],
          ['lastSessionName', name.trim()],
          ['lastSessionEmail', email.trim().toLowerCase()],
        ]);
        router.replace('/onboarding');
      } else {
        const result = await customFetch<{ userId: string; profile: any; onboardingComplete: boolean }>('/users/login', {
          method: 'POST',
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
          }),
        });
        await AsyncStorage.multiSet([
          ['userId', result.userId],
          ['lastSessionName', result.profile?.name || email.split('@')[0]],
          ['lastSessionEmail', email.trim().toLowerCase()],
        ]);
        router.replace(result.onboardingComplete ? '/(tabs)' : '/onboarding');
      }
    } catch (err: any) {
      const msg = err?.data?.error || err?.message || 'Something went wrong. Please try again.';
      setError(msg.includes('duplicate') || msg.includes('unique') ? 'This email is already registered.' : msg);
      shakeError();
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAccess = () => {
    if (!quickUser) return;
    setEmail(quickUser.email);
    passwordRef.current?.focus();
  };

  const strength = getStrength(password);

  const tabIndicatorLeft = tabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['2%', '50%'],
  });

  const logoScale = logoAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  const logoOpacity = logoAnim;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 32, paddingBottom: 60 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Logo ── */}
        <Animated.View style={[styles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
          <View style={styles.logoContainer}>
            <BrandMark size={64} />
          </View>
        </Animated.View>

        {/* ── Title ── */}
        <Animated.View style={[styles.titleWrap, { opacity: titleAnim }]}>
          <Text style={styles.appName}>Recalibrate</Text>
          <Text style={styles.tagline}>The discipline engine for the person you're becoming</Text>
        </Animated.View>

        {/* ── Quick Access ── */}
        {quickUser && mode === 'login' && (
          <Animated.View style={{ opacity: formAnim }}>
            <TouchableOpacity
              style={styles.quickChip}
              onPress={handleQuickAccess}
              activeOpacity={0.75}
            >
              <View style={styles.quickAvatar}>
                <Text style={styles.quickAvatarText}>
                  {quickUser.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.quickName}>Continue as {quickUser.name.split(' ')[0]}</Text>
                <Text style={styles.quickEmail}>{quickUser.email}</Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color={C.accent} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── Auth Card ── */}
        <Animated.View style={[
          styles.card,
          {
            opacity: formAnim,
            transform: [{ translateY: formTranslate }, { translateX: shakeAnim }],
          }
        ]}>

          {/* Tab switcher */}
          <View style={styles.tabWrap}>
            <Animated.View style={[styles.tabIndicator, { left: tabIndicatorLeft }]} />
            <TouchableOpacity style={styles.tabBtn} onPress={() => switchMode('login')} activeOpacity={0.75}>
              <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabBtn} onPress={() => switchMode('signup')} activeOpacity={0.75}>
              <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>Create Account</Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Fields */}
          <View style={styles.fields}>
            {/* Name (signup only) — animated in/out */}
            <Animated.View style={{ height: nameFieldHeight, opacity: nameFieldOpacity, overflow: 'hidden' }}>
              <AuthInput
                icon="person-outline"
                placeholder="Full name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
            </Animated.View>

            <AuthInput
              inputRef={emailRef}
              icon="mail-outline"
              placeholder="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <AuthInput
              inputRef={passwordRef}
              icon="lock-closed-outline"
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />

            {/* Password strength */}
            {password.length > 0 && (
              <View style={styles.strengthRow}>
                {[1, 2, 3].map(i => (
                  <View
                    key={i}
                    style={[
                      styles.strengthSegment,
                      { backgroundColor: i <= strength.level ? strength.color : C.border }
                    ]}
                  />
                ))}
                <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
              </View>
            )}
          </View>

          {/* Error */}
          {!!error && (
            <View style={styles.errorWrap}>
              <Ionicons name="alert-circle" size={14} color={C.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit}
            activeOpacity={0.88}
            disabled={loading}
            style={[styles.submitBtn, loading && styles.submitBtnLoading]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.submitText}>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                </Text>
                <Ionicons name="arrow-forward-outline" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          {/* Trust pillars */}
          <View style={styles.trustRow}>
            {[
              { icon: 'shield-checkmark-outline', label: 'Encrypted' },
              { icon: 'cloud-offline-outline', label: 'Offline-first' },
              { icon: 'eye-off-outline', label: 'Private by design' },
            ].map(f => (
              <View key={f.label} style={styles.trustItem}>
                <Ionicons name={f.icon as any} size={12} color={C.textMuted} />
                <Text style={styles.trustLabel}>{f.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── Footer ── */}
        <Animated.Text style={[styles.footer, { opacity: formAnim }]}>
          Your data lives on your device. Never sold, never shared.
        </Animated.Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 20, gap: 0, alignItems: 'stretch' },

  // Logo
  logoWrap: { alignItems: 'center', marginBottom: 20 },
  logoContainer: {
    width: 88, height: 88, borderRadius: 22,
    backgroundColor: C.surfaceHigh,
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.accent, shadowOpacity: 0.2, shadowRadius: 24, elevation: 8,
  },

  // Title
  titleWrap: { alignItems: 'center', gap: 8, marginBottom: 24 },
  appName: {
    fontSize: 36, fontFamily: 'Inter_700Bold',
    color: C.text, letterSpacing: -1.5,
  },
  tagline: {
    fontSize: 13, fontFamily: 'Inter_400Regular',
    color: C.textMuted, textAlign: 'center', lineHeight: 20,
    paddingHorizontal: 20,
  },

  // Quick access chip
  quickChip: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surfaceHigh,
    borderWidth: 1, borderColor: `${C.accent}40`,
    borderRadius: 14, padding: 14, marginBottom: 12,
  },
  quickAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.accent + '22',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.accent + '60',
  },
  quickAvatarText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: C.accentLight },
  quickName: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: C.text },
  quickEmail: { fontSize: 11, fontFamily: 'Inter_400Regular', color: C.textMuted, marginTop: 1 },

  // Card
  card: {
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 18, padding: 20, gap: 14,
    shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 30, elevation: 12,
  },

  // Tab switcher
  tabWrap: {
    flexDirection: 'row', backgroundColor: C.bg,
    borderRadius: 11, padding: 3, position: 'relative', overflow: 'hidden',
  },
  tabIndicator: {
    position: 'absolute', top: 3, bottom: 3, width: '48%',
    backgroundColor: C.accent, borderRadius: 9,
    shadowColor: C.accent, shadowOpacity: 0.5, shadowRadius: 10,
  },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', zIndex: 1 },
  tabText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: C.textMuted },
  tabTextActive: { color: '#fff' },

  divider: { height: 1, backgroundColor: C.border },

  // Fields
  fields: { gap: 10 },

  // Strength meter
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 2 },
  strengthSegment: { flex: 1, height: 3, borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', marginLeft: 4, width: 44, textAlign: 'right' },

  // Error
  errorWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.errorBg, borderWidth: 1, borderColor: C.error + '35',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  errorText: { flex: 1, color: C.error, fontSize: 13, fontFamily: 'Inter_500Medium', lineHeight: 18 },

  // Submit
  submitBtn: {
    backgroundColor: C.accent, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16,
    shadowColor: C.accent, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8,
  },
  submitBtnLoading: { opacity: 0.75 },
  submitText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold', letterSpacing: 0.2 },

  // Trust row
  trustRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingTop: 4 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trustLabel: { fontSize: 10, fontFamily: 'Inter_500Medium', color: C.textMuted },

  // Footer
  footer: {
    textAlign: 'center', color: C.textDim, fontSize: 11,
    fontFamily: 'Inter_400Regular', marginTop: 24, lineHeight: 17,
  },
});
