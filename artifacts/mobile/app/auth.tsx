import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
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
import * as Haptics from 'expo-haptics';
import { customFetch } from '@workspace/api-client-react';
import { useApp } from '@/context/AppContext';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedReanimated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withTiming,
  withSpring,
  withRepeat,
  runOnJS,
  interpolateColor,
  Easing as REasing,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Ambient Top Glow ────────────────────────────────────────────────────────
function AmbientGlow() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['rgba(120,80,255,0.28)', 'rgba(80,50,200,0.10)', 'transparent']}
        style={{
          position: 'absolute',
          top: -80,
          left: -SCREEN_W * 0.3,
          width: SCREEN_W * 1.6,
          height: SCREEN_H * 0.55,
          borderRadius: SCREEN_W,
        }}
      />
      <LinearGradient
        colors={['rgba(180,80,255,0.12)', 'transparent']}
        style={{
          position: 'absolute',
          top: 60,
          right: -SCREEN_W * 0.2,
          width: SCREEN_W * 0.8,
          height: SCREEN_W * 0.8,
          borderRadius: SCREEN_W,
        }}
      />
    </View>
  );
}

// ─── Password Strength ────────────────────────────────────────────────────────
function getStrength(pw: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (pw.length === 0) return { level: 0, label: '', color: '#555' };
  if (pw.length < 6) return { level: 1, label: 'Weak', color: '#ef4444' };
  if (pw.length < 10 || !/\d/.test(pw)) return { level: 2, label: 'Fair', color: '#f59e0b' };
  return { level: 3, label: 'Strong', color: '#10b981' };
}

// ─── Dark Auth Input ──────────────────────────────────────────────────────────
function AuthInput({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  returnKeyType,
  onSubmitEditing,
  inputRef,
}: {
  icon: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  returnKeyType?: any;
  onSubmitEditing?: () => void;
  inputRef?: React.RefObject<TextInput | null>;
}) {
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  };
  const handleBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.50)'],
  });

  return (
    <Animated.View style={[darkInputStyles.wrap, { borderColor }]}>
      <Ionicons
        name={icon as any}
        size={16}
        color={focused ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)'}
        style={{ marginRight: 10 }}
      />
      <TextInput
        ref={inputRef}
        style={darkInputStyles.input}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.28)"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry && !showPw}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'none'}
        onFocus={handleFocus}
        onBlur={handleBlur}
        returnKeyType={returnKeyType ?? 'next'}
        onSubmitEditing={onSubmitEditing}
        selectionColor="rgba(160,100,255,0.9)"
      />
      {secureTextEntry && (
        <TouchableOpacity onPress={() => setShowPw(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons
            name={showPw ? 'eye-off-outline' : 'eye-outline'}
            size={16}
            color="rgba(255,255,255,0.35)"
          />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const darkInputStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
});

// ─── Half-width Auth Input (for side-by-side name row) ───────────────────────
function HalfAuthInput({
  icon,
  placeholder,
  value,
  onChangeText,
  returnKeyType,
  onSubmitEditing,
  inputRef,
}: {
  icon: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  returnKeyType?: any;
  onSubmitEditing?: () => void;
  inputRef?: React.RefObject<TextInput | null>;
}) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  };
  const handleBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.50)'],
  });

  return (
    <Animated.View style={[darkInputStyles.wrap, { borderColor, flex: 1 }]}>
      <Ionicons
        name={icon as any}
        size={14}
        color={focused ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)'}
        style={{ marginRight: 8 }}
      />
      <TextInput
        ref={inputRef}
        style={[darkInputStyles.input, { fontSize: 14 }]}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.28)"
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="words"
        onFocus={handleFocus}
        onBlur={handleBlur}
        returnKeyType={returnKeyType ?? 'next'}
        onSubmitEditing={onSubmitEditing}
        selectionColor="rgba(160,100,255,0.9)"
      />
    </Animated.View>
  );
}

// ─── Social Icons Row ─────────────────────────────────────────────────────────
function SocialIconsRow() {
  const socialIcons: { name: any; color: string }[] = [
    { name: 'logo-facebook', color: '#1877F2' },
    { name: 'logo-instagram', color: '#E1306C' },
    { name: 'logo-apple', color: '#FFFFFF' },
    { name: 'logo-twitter', color: '#1DA1F2' },
  ];

  return (
    <View style={socialStyles.container}>
      <View style={socialStyles.orRow}>
        <View style={socialStyles.line} />
        <Text style={socialStyles.orText}>or</Text>
        <View style={socialStyles.line} />
      </View>
      <View style={socialStyles.iconsRow}>
        {socialIcons.map((s, i) => (
          <TouchableOpacity
            key={i}
            style={socialStyles.iconBtn}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Coming Soon', 'Social sign-in is coming in a future update.')}
          >
            <Ionicons name={s.name} size={20} color={s.color} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const socialStyles = StyleSheet.create({
  container: { gap: 16, marginTop: 4 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  line: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  orText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.35)' },
  iconsRow: { flexDirection: 'row', justifyContent: 'center', gap: 14 },
  iconBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#1C1C1C',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ─── Main Auth Screen ─────────────────────────────────────────────────────────
export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useApp();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authStatus, setAuthStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const nextRouteRef = useRef<any>(null);
  const [error, setError] = useState('');
  const [quickUser, setQuickUser] = useState<{ name: string; email: string } | null>(null);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);

  // Entry animations
  const heroAnim = useRef(new Animated.Value(0)).current;
  const heroTranslate = useRef(new Animated.Value(-20)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  const formTranslate = useRef(new Animated.Value(30)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Signup field animations
  const signupFieldsHeight = useRef(new Animated.Value(0)).current;
  const signupFieldsOpacity = useRef(new Animated.Value(0)).current;
  const confirmFieldHeight = useRef(new Animated.Value(0)).current;
  const confirmFieldOpacity = useRef(new Animated.Value(0)).current;

  // Button Animation
  const buttonWidthAnim = useRef(new Animated.Value(Dimensions.get('window').width - 48)).current; // 24 padding on each side
  const buttonRadiusAnim = useRef(new Animated.Value(20)).current;
  const buttonTextOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
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
    Animated.stagger(80, [
      Animated.parallel([
        Animated.timing(heroAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(heroTranslate, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(formAnim, { toValue: 1, duration: 450, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(formTranslate, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const switchMode = (newMode: 'login' | 'signup') => {
    if (newMode === mode) return;
    setError('');
    if (newMode === 'signup') {
      setMode('signup');
      Animated.parallel([
        Animated.spring(signupFieldsHeight, { toValue: 68, friction: 8, tension: 70, useNativeDriver: false }),
        Animated.timing(signupFieldsOpacity, { toValue: 1, duration: 250, useNativeDriver: false }),
        Animated.spring(confirmFieldHeight, { toValue: 68, friction: 8, tension: 70, useNativeDriver: false }),
        Animated.timing(confirmFieldOpacity, { toValue: 1, duration: 250, useNativeDriver: false }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(signupFieldsHeight, { toValue: 0, friction: 8, tension: 70, useNativeDriver: false }),
        Animated.timing(signupFieldsOpacity, { toValue: 0, duration: 180, useNativeDriver: false }),
        Animated.spring(confirmFieldHeight, { toValue: 0, friction: 8, tension: 70, useNativeDriver: false }),
        Animated.timing(confirmFieldOpacity, { toValue: 0, duration: 180, useNativeDriver: false }),
      ]).start(() => setMode('login'));
    }
  };

  const shakeError = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -9, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 7, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -5, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 35, useNativeDriver: true }),
    ]).start();
  };

  const handleSubmit = async () => {
    if (authStatus !== 'idle') return;
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      shakeError();
      return;
    }
    if (mode === 'signup') {
      if (!firstName.trim()) {
        setError('Please enter your first name.');
        shakeError();
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        shakeError();
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        shakeError();
        return;
      }
    }

    setAuthStatus('loading');
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      if (mode === 'signup') {
        const result = await customFetch<{ userId: string; profile: any }>('/users/register', {
          method: 'POST',
          body: JSON.stringify({
            name: fullName,
            email: email.trim().toLowerCase(),
            password,
            startDate: new Date().toISOString().split('T')[0],
          }),
        });
        await AsyncStorage.multiSet([
          ['userId', result.userId],
          ['lastSessionName', fullName],
          ['lastSessionEmail', email.trim().toLowerCase()],
        ]);
        await login(result.userId);
        nextRouteRef.current = '/onboarding';
        setAuthStatus('success');
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
        await login(result.userId);
        nextRouteRef.current = result.onboardingComplete ? '/(tabs)' : '/onboarding';
        setAuthStatus('success');
      }
    } catch (err: any) {
      const msg = err?.data?.error || err?.message || 'Something went wrong. Please try again.';
      setError(msg.includes('duplicate') || msg.includes('unique') ? 'This email is already registered.' : msg);
      shakeError();
      setAuthStatus('error');
      setTimeout(() => setAuthStatus('idle'), 300);
    }
  };

  const handleQuickAccess = () => {
    if (!quickUser) return;
    setEmail(quickUser.email);
    passwordRef.current?.focus();
  };

  const strength = getStrength(password);

  return (
    <KeyboardAvoidingView
      style={authStyles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Ambient background glow */}
      <AmbientGlow />

      <ScrollView
        contentContainerStyle={[authStyles.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero: Brand Wordmark ─────────────────────────────────── */}
        <Animated.View style={[authStyles.heroWrap, { opacity: heroAnim, transform: [{ translateY: heroTranslate }] }]}>
          {/* Logo mark */}
          <View style={authStyles.logoRing}>
            <View style={authStyles.logoDot} />
          </View>

          <Text style={authStyles.brandName}>Recalibrate</Text>
          <Text style={authStyles.brandTagline}>
            {mode === 'login' ? 'Welcome back.' : 'Start your journey.'}
          </Text>
        </Animated.View>

        {/* ── Quick Access Chip ────────────────────────────────────── */}
        {quickUser && mode === 'login' && (
          <Animated.View style={{ opacity: formAnim }}>
            <TouchableOpacity
              style={authStyles.quickChip}
              onPress={handleQuickAccess}
              activeOpacity={0.75}
            >
              <View style={authStyles.quickAvatar}>
                <Text style={authStyles.quickAvatarText}>
                  {quickUser.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={authStyles.quickName}>Continue as {quickUser.name.split(' ')[0]}</Text>
                <Text style={authStyles.quickEmail}>{quickUser.email}</Text>
              </View>
              <Ionicons name="arrow-forward" size={15} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── Form Fields ──────────────────────────────────────────── */}
        <Animated.View
          style={[
            authStyles.fieldsContainer,
            { opacity: formAnim, transform: [{ translateY: formTranslate }, { translateX: shakeAnim }] },
          ]}
        >
          {/* Signup: First + Last name row */}
          <Animated.View style={{ height: signupFieldsHeight, opacity: signupFieldsOpacity, overflow: 'hidden', marginBottom: mode === 'signup' ? 0 : 0 }}>
            <View style={{ flexDirection: 'row', gap: 10, paddingBottom: 10 }}>
              <HalfAuthInput
                icon="person-outline"
                placeholder="First name"
                value={firstName}
                onChangeText={setFirstName}
                returnKeyType="next"
                onSubmitEditing={() => lastNameRef.current?.focus()}
              />
              <HalfAuthInput
                inputRef={lastNameRef}
                icon="person-outline"
                placeholder="Last name"
                value={lastName}
                onChangeText={setLastName}
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
            </View>
          </Animated.View>

          {/* Email */}
          <AuthInput
            inputRef={emailRef}
            icon="mail-outline"
            placeholder="Email or username"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          {/* Password */}
          <AuthInput
            inputRef={passwordRef}
            icon="lock-closed-outline"
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType={mode === 'signup' ? 'next' : 'go'}
            onSubmitEditing={() => {
              if (mode === 'signup') confirmPasswordRef.current?.focus();
              else handleSubmit();
            }}
          />

          {/* Forgot Password — login only */}
          {mode === 'login' && (
            <TouchableOpacity
              onPress={() => Alert.alert('Forgot Password', 'Password reset is coming soon. Contact support@recalibrate.app for help.')}
              style={authStyles.forgotBtn}
              activeOpacity={0.7}
            >
              <Text style={authStyles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          {/* Password strength — signup only */}
          {mode === 'signup' && password.length > 0 && (
            <View style={authStyles.strengthRow}>
              {[1, 2, 3].map(i => (
                <View
                  key={i}
                  style={[authStyles.strengthSegment, { backgroundColor: i <= strength.level ? strength.color : 'rgba(255,255,255,0.1)' }]}
                />
              ))}
              <Text style={[authStyles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
            </View>
          )}

          {/* Confirm Password — signup only */}
          <Animated.View style={{ height: confirmFieldHeight, opacity: confirmFieldOpacity, overflow: 'hidden' }}>
            <View style={{ paddingTop: 0 }}>
              <AuthInput
                inputRef={confirmPasswordRef}
                icon="lock-closed-outline"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
              />
            </View>
          </Animated.View>

          {/* Error banner */}
          {!!error && (
            <View style={authStyles.errorWrap}>
              <Ionicons name="alert-circle" size={14} color="#ef4444" />
              <Text style={authStyles.errorText}>{error}</Text>
            </View>
          )}

          {/* Exploding CTA Button */}
          <ExplodingAuthButton
            mode={mode}
            status={authStatus}
            onPress={handleSubmit}
            onExplodeComplete={() => {
              if (nextRouteRef.current) {
                router.replace(nextRouteRef.current);
              }
            }}
          />

          {/* Social Icons */}
          <SocialIconsRow />

          {/* Mode Switcher */}
          <TouchableOpacity
            onPress={() => switchMode(mode === 'login' ? 'signup' : 'login')}
            style={authStyles.switchRow}
            activeOpacity={0.7}
          >
            <Text style={authStyles.switchText}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <Text style={authStyles.switchLink}>
                {mode === 'login' ? 'Sign Up' : 'Sign In'}
              </Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const authStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  scroll: {
    paddingHorizontal: 24,
    gap: 0,
  },

  // ── Hero ──
  heroWrap: {
    alignItems: 'center',
    marginBottom: 36,
    gap: 10,
  },
  logoRing: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(160,100,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    backgroundColor: 'rgba(120,60,255,0.1)',
    shadowColor: '#7B5EFF',
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 8,
  },
  logoDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#fff',
    shadowColor: '#A070FF',
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 6,
  },
  brandName: {
    fontSize: 38,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    letterSpacing: -1.5,
  },
  brandTagline: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.1,
  },

  // ── Quick Access ──
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(160,100,255,0.25)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  quickAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(120,60,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(160,100,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAvatarText: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: '#C4A0FF',
  },
  quickName: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
  quickEmail: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 1,
  },

  // ── Fields container ──
  fieldsContainer: {
    gap: 12,
  },

  // ── Forgot password ──
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: -2,
    marginBottom: 2,
  },
  forgotText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.45)',
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(255,255,255,0.25)',
  },

  // ── Password strength ──
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 2,
    marginTop: -2,
  },
  strengthSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 4,
    width: 44,
    textAlign: 'right',
  },

  // ── Error ──
  errorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#ef4444',
    lineHeight: 18,
  },

  // ── White Pill CTA ──
  ctaBtn: {
    backgroundColor: '#FFFFFF',
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    marginTop: 4,
  },
  ctaText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#0D0D0D',
    letterSpacing: 0.2,
  },

  // ── Mode switcher ──
  switchRow: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 8,
  },
  switchText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.4)',
  },
  switchLink: {
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
  },
});

// ─── Component: Exploding Auth Button ────────────────────────────────────────
function ExplodingAuthButton({ mode, status, onPress, onExplodeComplete }: any) {
  const width = useSharedValue(SCREEN_W - 48);
  const textOpacity = useSharedValue(1);
  const circleOffset = useSharedValue(0);
  const rotation = useSharedValue(0);
  const explodeScale = useSharedValue(1);
  const holdProgress = useSharedValue(0);
  const pillScale = useSharedValue(1);

  const triggerTickHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const triggerSuccessHaptic = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  useAnimatedReaction(
    () => holdProgress.value,
    (curr, prev) => {
      if (!prev) return;
      const steps = 15;
      const prevStep = Math.floor(prev * steps);
      const currStep = Math.floor(curr * steps);
      if (currStep > prevStep && currStep < steps) {
        runOnJS(triggerTickHaptic)();
      }
    }
  );

  const handlePressIn = () => {
    if (status !== 'idle') return;
    pillScale.value = withTiming(0.96, { duration: 300 });
    holdProgress.value = withTiming(1, { duration: 800, easing: REasing.bezier(0.25, 1, 0.5, 1) }, (finished) => {
      if (finished) {
        runOnJS(triggerSuccessHaptic)();
        runOnJS(onPress)();
      }
    });
  };

  const handlePressOut = () => {
    if (status !== 'idle') return;
    pillScale.value = withTiming(1, { duration: 200 });
    if (holdProgress.value < 1) {
      holdProgress.value = withTiming(0, { duration: 300 });
    }
  };

  useEffect(() => {
    if (status === 'loading') {
      textOpacity.value = withTiming(0, { duration: 150 });
      width.value = withTiming(56, { duration: 300, easing: REasing.out(REasing.exp) }, () => {
        circleOffset.value = withSpring(18, { damping: 10, stiffness: 80 });
        rotation.value = withRepeat(
          withTiming(360, { duration: 700, easing: REasing.linear }),
          -1,
          false
        );
      });
    } else if (status === 'success') {
      // Pull together
      circleOffset.value = withTiming(0, { duration: 250, easing: REasing.in(REasing.exp) }, () => {
        explodeScale.value = withTiming(35, { duration: 500, easing: REasing.in(REasing.exp) }, () => {
          runOnJS(onExplodeComplete)();
        });
      });
    } else if (status === 'idle') {
      width.value = withTiming(SCREEN_W - 48, { duration: 300 });
      textOpacity.value = withTiming(1, { duration: 150 });
      circleOffset.value = withTiming(0);
      rotation.value = 0;
      explodeScale.value = 1;
      holdProgress.value = 0;
    }
  }, [status]);

  const mainStyle = useAnimatedStyle(() => {
    return {
      width: width.value,
      height: 56,
      alignSelf: 'center',
      transform: [{ scale: pillScale.value }],
    };
  });

  const ball1Style = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      left: (width.value - 56) / 2, // Centered in the container
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: interpolateColor(explodeScale.value, [1, 35], ['#7850FF', '#0D0D0D']),
      transform: [
        { rotate: `${rotation.value}deg` },
        { translateX: -circleOffset.value },
        { scale: explodeScale.value }
      ],
      opacity: width.value <= 60 ? 1 : 0,
      zIndex: 10,
    };
  });

  const ball2Style = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      left: (width.value - 56) / 2,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: interpolateColor(explodeScale.value, [1, 35], ['#7850FF', '#0D0D0D']),
      transform: [
        { rotate: `${rotation.value}deg` },
        { translateX: circleOffset.value },
      ],
      opacity: width.value <= 60 && status !== 'success' ? 1 : 0, // hide ball 2 when exploding
      zIndex: 9,
    };
  });

  const pillStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      borderRadius: width.value > 60 ? 20 : 28,
      backgroundColor: '#1E1E1E',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
      opacity: width.value > 60 ? 1 : 0,
      overflow: 'hidden',
    };
  });

  const fillStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: `${holdProgress.value * 100}%` as any,
      backgroundColor: '#7850FF',
    };
  });

  return (
    <View style={{ alignItems: 'center', marginTop: 12, height: 56, zIndex: 9999 }}>
      <AnimatedReanimated.View style={mainStyle}>
        <TouchableOpacity
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          delayPressIn={0}
          activeOpacity={0.88}
          disabled={status !== 'idle'}
          style={StyleSheet.absoluteFill}
        >
          {/* Main Dark Pill Background */}
          <AnimatedReanimated.View style={pillStyle}>
             {/* Progressive Fill inside Pill */}
             <AnimatedReanimated.View style={fillStyle} />
          </AnimatedReanimated.View>

          {/* Splitting Balls (visible only when shrunk) */}
          <AnimatedReanimated.View style={ball1Style} />
          <AnimatedReanimated.View style={ball2Style} />

          {/* Text */}
          <AnimatedReanimated.Text
            style={[authStyles.ctaText, { color: '#FFFFFF', opacity: textOpacity, position: 'absolute', width: '100%', textAlign: 'center', top: 18 }]}
          >
            {mode === 'login' ? 'Hold to Sign in' : 'Hold to Register'}
          </AnimatedReanimated.Text>
        </TouchableOpacity>
      </AnimatedReanimated.View>
    </View>
  );
}
