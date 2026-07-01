import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  Alert,
  Animated,
  Dimensions,
  Linking,
  ScrollView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { useFriends, PublicProfile } from '@/hooks/useFriends';
import { customFetch } from '@workspace/api-client-react';
import { BRAND, GRADIENTS } from '@/constants/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_HEIGHT * 0.52;
const COMPACT_HEADER_HEIGHT = 72;
const SCROLL_COLLAPSE_DISTANCE = HERO_HEIGHT - COMPACT_HEADER_HEIGHT;

// ─── Helper: XP to next level ─────────────────────────────────────────────────
function getXpProgress(totalXP: number): { level: number; progress: number; max: number } {
  const level = Math.floor(Math.sqrt(totalXP / 100)) + 1;
  const currentLevelXP = ((level - 1) ** 2) * 100;
  const nextLevelXP = (level ** 2) * 100;
  const progress = totalXP - currentLevelXP;
  const max = nextLevelXP - currentLevelXP;
  return { level, progress, max };
}

// ─── Helper: format date to "Member since Jun 2025" ──────────────────────────
function formatMemberSince(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `Member since ${d.toLocaleString('default', { month: 'short', year: 'numeric' })}`;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ emoji, label, value, accent }: { emoji: string; label: string; value: string; accent: string }) {
  const colors = useColors();
  return (
    <View style={[scStyles.card, { backgroundColor: colors.surfaceMid, borderColor: colors.border }]}>
      <LinearGradient colors={[accent, 'transparent']} style={scStyles.accentLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
      <Text style={scStyles.emoji}>{emoji}</Text>
      <Text style={[scStyles.value, { color: colors.text }]}>{value}</Text>
      <Text style={[scStyles.label, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const scStyles = StyleSheet.create({
  card: {
    width: '48%',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'flex-start',
    overflow: 'hidden',
    marginBottom: 10,
  },
  accentLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  emoji: { fontSize: 22, marginBottom: 8 },
  value: { fontSize: 22, fontFamily: 'Inter_700Bold', marginBottom: 3 },
  label: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.4, textTransform: 'uppercase' },
});

// ─── Social Link Button ───────────────────────────────────────────────────────
function SocialLinkBtn({ platform, handle }: { platform: 'instagram' | 'snapchat' | 'telegram'; handle: string }) {
  const colors = useColors();
  const configs = {
    instagram: { icon: 'instagram', label: `@${handle}`, color: '#E1306C', url: `https://instagram.com/${handle}` },
    snapchat: { icon: 'camera', label: `@${handle}`, color: '#FFFC00', url: `https://snapchat.com/add/${handle}` },
    telegram: { icon: 'send', label: `@${handle}`, color: '#2AABEE', url: `https://t.me/${handle}` },
  };
  const cfg = configs[platform];

  return (
    <TouchableOpacity
      onPress={() => Linking.openURL(cfg.url).catch(() => {})}
      activeOpacity={0.75}
      style={[slStyles.btn, { backgroundColor: cfg.color + '18', borderColor: cfg.color + '40' }]}
    >
      <Feather name={cfg.icon as any} size={16} color={cfg.color} />
      <Text style={[slStyles.text, { color: cfg.color }]}>{cfg.label}</Text>
    </TouchableOpacity>
  );
}

const slStyles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 99,
    borderWidth: 1,
  },
  text: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
});

// ─── Program Progress Card ────────────────────────────────────────────────────
function ProgramProgressCard({
  prog,
  progress,
}: {
  prog: { id: string; title: string; emoji: string; totalWeeks: number; color: string };
  progress?: { completedWeeks: number[]; currentWeek: number };
}) {
  const colors = useColors();
  const pct = progress ? (progress.completedWeeks.length / prog.totalWeeks) * 100 : 0;
  const isCompleted = pct >= 100;

  return (
    <View style={[ppStyles.card, { backgroundColor: colors.surfaceMid, borderColor: prog.color + '40' }]}>
      {isCompleted && (
        <View style={ppStyles.completedBadge}>
          <Feather name="check-circle" size={14} color={BRAND.success} />
          <Text style={[ppStyles.completedText, { color: BRAND.success }]}>Completed</Text>
        </View>
      )}
      <View style={ppStyles.row}>
        <Text style={ppStyles.emoji}>{prog.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[ppStyles.title, { color: colors.text }]} numberOfLines={1}>{prog.title}</Text>
          <Text style={[ppStyles.meta, { color: colors.textMuted }]}>
            {isCompleted ? `All ${prog.totalWeeks} weeks done` : `Week ${progress?.currentWeek || 1} of ${prog.totalWeeks}`}
          </Text>
        </View>
      </View>
      <View style={[ppStyles.barBg, { backgroundColor: colors.border }]}>
        <LinearGradient
          colors={[prog.color, prog.color + '80']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[ppStyles.barFill, { width: `${Math.min(pct, 100)}%` }]}
        />
      </View>
    </View>
  );
}

const ppStyles = StyleSheet.create({
  card: { padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  completedText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  emoji: { fontSize: 26 },
  title: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  meta: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  barBg: { height: 4, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
});

// ─── Action Button ────────────────────────────────────────────────────────────
function ActionButton({
  status,
  onPress,
  loading,
}: {
  status: string;
  onPress: () => void;
  loading: boolean;
}) {
  const colors = useColors();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    scale.value = withSpring(0.95, { damping: 10 }, () => { scale.value = withSpring(1); });
    onPress();
  };

  const configs: Record<string, { label: string; colors: [string, string]; icon: any }> = {
    none: { label: 'Add Friend', colors: [BRAND.primary, BRAND.secondary], icon: 'user-plus' },
    rejected: { label: 'Add Friend', colors: [BRAND.primary, BRAND.secondary], icon: 'user-plus' },
    friends: { label: 'Friends ✓', colors: [BRAND.success, BRAND.success + 'CC'], icon: 'check' },
    pending_sent: { label: 'Request Sent', colors: [colors.textMuted || '#666', '#555'], icon: 'clock' },
    pending_received: { label: 'Respond', colors: [BRAND.secondary, BRAND.primary], icon: 'inbox' },
  };
  const cfg = configs[status] || configs.none;

  return (
    <Reanimated.View style={animStyle}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.85} disabled={loading}>
        <LinearGradient colors={cfg.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={abStyles.btn}>
          {loading
            ? <ActivityIndicator size="small" color="#FFF" />
            : <>
                <Feather name={cfg.icon} size={16} color="#FFF" />
                <Text style={abStyles.text}>{cfg.label}</Text>
              </>
          }
        </LinearGradient>
      </TouchableOpacity>
    </Reanimated.View>
  );
}

const abStyles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 99,
  },
  text: { color: '#FFF', fontFamily: 'Inter_600SemiBold', fontSize: 14 },
});

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={[shStyles.text, { color: colors.textMuted }]}>{title.toUpperCase()}</Text>
  );
}
const shStyles = StyleSheet.create({
  text: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1.2, marginBottom: 12, marginTop: 24 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PublicProfileScreen() {
  const { userId: profileId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const { userId: currentUserId, availablePrograms, enrollProgram } = useApp();
  const { getRelationshipStatus, sendRequest, removeFriend, isSendingRequest } = useFriends(currentUserId);

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [relationship, setRelationship] = useState<{ status: string; friendshipId: string | null }>({ status: 'none', friendshipId: null });
  const [isLoading, setIsLoading] = useState(true);

  // Scroll animation values
  const scrollY = useRef(new Animated.Value(0)).current;

  // Parallax: hero moves at 0.5x scroll speed
  const heroTranslateY = scrollY.interpolate({
    inputRange: [0, SCROLL_COLLAPSE_DISTANCE],
    outputRange: [0, -SCROLL_COLLAPSE_DISTANCE * 0.5],
    extrapolate: 'clamp',
  });

  // Hero image scale: shrinks as we scroll
  const heroScale = scrollY.interpolate({
    inputRange: [-100, 0, SCROLL_COLLAPSE_DISTANCE],
    outputRange: [1.1, 1, 0.85],
    extrapolate: 'clamp',
  });

  // Compact header fade
  const compactHeaderOpacity = scrollY.interpolate({
    inputRange: [SCROLL_COLLAPSE_DISTANCE * 0.7, SCROLL_COLLAPSE_DISTANCE],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Hero content fade out
  const heroContentOpacity = scrollY.interpolate({
    inputRange: [0, SCROLL_COLLAPSE_DISTANCE * 0.5],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Gradient fade
  const gradientOpacity = scrollY.interpolate({
    inputRange: [0, SCROLL_COLLAPSE_DISTANCE * 0.6],
    outputRange: [1, 0.3],
    extrapolate: 'clamp',
  });

  const loadProfile = useCallback(async () => {
    if (!profileId) return;
    setIsLoading(true);
    try {
      const [profileData, statusData] = await Promise.all([
        customFetch<PublicProfile>(`/users/${profileId}/public-profile`),
        getRelationshipStatus(profileId),
      ]);
      setProfile(profileData);
      setRelationship(statusData);
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Could not load this profile.');
      router.back();
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleAction = async () => {
    if (!profile) return;
    if (relationship.status === 'friends' && relationship.friendshipId) {
      Alert.alert('Remove Friend', 'Are you sure you want to remove this friend?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await removeFriend(relationship.friendshipId!);
            loadProfile();
          },
        },
      ]);
    } else if (relationship.status === 'none' || relationship.status === 'rejected') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await sendRequest(profileId);
      loadProfile();
    } else if (relationship.status === 'pending_sent') {
      Alert.alert('Request Sent', 'Your connection request is pending.');
    } else if (relationship.status === 'pending_received') {
      Alert.alert('Request Pending', 'This person sent you a request. Go to your Requests tab to respond.');
    }
  };

  if (isLoading || !profile) {
    return (
      <View style={[loadStyles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={BRAND.primary} />
      </View>
    );
  }

  const xpData = getXpProgress(profile.totalXP);
  const xpPct = xpData.max > 0 ? (xpData.progress / xpData.max) * 100 : 0;
  const hasSocialLinks = profile.socialLinks &&
    (profile.socialLinks.instagram || profile.socialLinks.snapchat || profile.socialLinks.telegram);
  const isOwnProfile = currentUserId === profileId;
  const activeProgramDetails = profile.activeProgramIds
    .map(id => availablePrograms.find((p: any) => p.id === id))
    .filter(Boolean) as any[];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ─── Parallax Hero ──────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.heroContainer,
          { transform: [{ translateY: heroTranslateY }] },
        ]}
      >
        <Animated.View style={[styles.heroImageWrap, { transform: [{ scale: heroScale }] }]}>
          {profile.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.heroImage} contentFit="cover" />
          ) : (
            <LinearGradient
              colors={[BRAND.primary + '60', BRAND.secondary + '30', '#000']}
              style={styles.heroImage}
            />
          )}
        </Animated.View>

        {/* Gradient overlay */}
        <Animated.View style={[styles.heroGradient, { opacity: gradientOpacity }]}>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.92)']}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Hero content (fades as you scroll) */}
        <Animated.View style={[styles.heroContent, { opacity: heroContentOpacity }]}>
          <Text style={styles.heroName}>{profile.name}</Text>
          {profile.bio ? (
            <Text style={styles.heroBio} numberOfLines={2}>{profile.bio}</Text>
          ) : null}
          <View style={styles.heroStats}>
            <View style={styles.heroStatChip}>
              <LinearGradient colors={[BRAND.primary, BRAND.secondary]} style={styles.heroStatGrad}>
                <Text style={styles.heroStatText}>Lv {xpData.level}</Text>
              </LinearGradient>
            </View>
            <View style={styles.heroStatChip}>
              <Text style={styles.heroStatChipText}>🔥 {profile.highestStreak}d</Text>
            </View>
            <View style={styles.heroStatChip}>
              <Text style={styles.heroStatChipText}>✨ {profile.totalXP} XP</Text>
            </View>
          </View>
        </Animated.View>
      </Animated.View>

      {/* ─── Compact Header (fades in on scroll) ────────────────────────── */}
      <Animated.View
        style={[
          styles.compactHeader,
          {
            paddingTop: insets.top,
            opacity: compactHeaderOpacity,
          },
        ]}
        pointerEvents="none"
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={60} tint={colors.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background + 'EE' }]} />
        )}
        <View style={styles.compactHeaderContent}>
          {profile.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.compactAvatar} contentFit="cover" />
          ) : (
            <View style={[styles.compactAvatar, { backgroundColor: colors.surfaceMid }]} />
          )}
          <Text style={[styles.compactName, { color: colors.text }]}>{profile.name}</Text>
        </View>
      </Animated.View>

      {/* ─── Always-visible top nav ──────────────────────────────────────── */}
      <View style={[styles.topNav, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={[styles.navBtn, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={20} color="#FFF" />
        </TouchableOpacity>
        {!isOwnProfile && (
          <ActionButton
            status={relationship.status}
            onPress={handleAction}
            loading={isSendingRequest}
          />
        )}
      </View>

      {/* ─── Scrollable Content ──────────────────────────────────────────── */}
      <Animated.ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: HERO_HEIGHT - 24, paddingBottom: 100 },
        ]}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        showsVerticalScrollIndicator={false}
      >
        {/* Card surface starts here */}
        <View style={[styles.contentCard, { backgroundColor: colors.background }]}>
          {/* ─── Quick Identity Strip ──────────────────────────────────────── */}
          <View style={styles.identityStrip}>
            <View>
              <Text style={[styles.displayName, { color: colors.text }]}>{profile.name}</Text>
              {profile.startDate ? (
                <Text style={[styles.memberSince, { color: colors.textMuted }]}>{formatMemberSince(profile.startDate)}</Text>
              ) : null}
            </View>
            <View style={styles.identityRight}>
              <Text style={[styles.friendCount, { color: colors.textSecondary }]}>
                <Text style={{ color: colors.text, fontFamily: 'Inter_700Bold' }}>{profile.friendCount}</Text>
                {' '}friends
              </Text>
            </View>
          </View>

          {/* ─── Stats Grid ────────────────────────────────────────────────── */}
          <SectionHeader title="Journey Stats" />
          <View style={styles.statsGrid}>
            <StatCard
              emoji="🔥"
              label="Best Streak"
              value={`${profile.highestStreak}d`}
              accent={BRAND.danger}
            />
            <StatCard
              emoji="📊"
              label="7-Day Avg"
              value={profile.averageScore > 0 ? `${Math.round(profile.averageScore)}%` : '—'}
              accent={BRAND.primary}
            />
            <StatCard
              emoji="📅"
              label="Days Tracked"
              value={`${profile.daysTracked}`}
              accent={BRAND.success}
            />
            <StatCard
              emoji="📝"
              label="Journal Logs"
              value={`${profile.journalCount}`}
              accent={BRAND.calm}
            />
          </View>

          {/* ─── XP & Level ────────────────────────────────────────────────── */}
          <SectionHeader title="Level & Progress" />
          <View style={[styles.levelCard, { backgroundColor: colors.surfaceMid, borderColor: colors.border }]}>
            <View style={styles.levelRow}>
              <LinearGradient colors={[BRAND.primary, BRAND.secondary]} style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>Level {xpData.level}</Text>
              </LinearGradient>
              <Text style={[styles.levelXP, { color: colors.textSecondary }]}>
                {xpData.progress.toLocaleString()} / {xpData.max.toLocaleString()} XP
              </Text>
            </View>
            <View style={[styles.xpBarBg, { backgroundColor: colors.border }]}>
              <LinearGradient
                colors={[BRAND.primary, BRAND.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.xpBarFill, { width: `${Math.min(xpPct, 100)}%` }]}
              />
            </View>
            <Text style={[styles.xpTotal, { color: colors.textMuted }]}>
              {profile.totalXP.toLocaleString()} total XP earned
            </Text>
          </View>

          {/* ─── Social Links ───────────────────────────────────────────────── */}
          {hasSocialLinks && (
            <>
              <SectionHeader title="Connect" />
              <View style={styles.socialLinksRow}>
                {profile.socialLinks?.instagram && (
                  <SocialLinkBtn platform="instagram" handle={profile.socialLinks.instagram} />
                )}
                {profile.socialLinks?.snapchat && (
                  <SocialLinkBtn platform="snapchat" handle={profile.socialLinks.snapchat} />
                )}
                {profile.socialLinks?.telegram && (
                  <SocialLinkBtn platform="telegram" handle={profile.socialLinks.telegram} />
                )}
              </View>
            </>
          )}

          {/* ─── Active Programs ─────────────────────────────────────────────── */}
          {activeProgramDetails.length > 0 && (
            <>
              <SectionHeader title="Active Protocols" />
              {activeProgramDetails.map((prog: any) => {
                const progress = profile.programProgress.find(p => p.programId === prog.id);
                return (
                  <ProgramProgressCard key={prog.id} prog={prog} progress={progress} />
                );
              })}
            </>
          )}

          {/* ─── Published Programs ──────────────────────────────────────────── */}
          {profile.publishedPrograms && profile.publishedPrograms.filter(p => p.isPublished).length > 0 && (
            <>
              <SectionHeader title="Published Protocols" />
              {profile.publishedPrograms.filter(p => p.isPublished).map(prog => (
                <View key={prog.id} style={[styles.publishedCard, { backgroundColor: colors.surfaceMid, borderColor: prog.color + '50' }]}>
                  <View style={styles.publishedRow}>
                    <Text style={styles.publishedEmoji}>{prog.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.publishedTitle, { color: colors.text }]}>{prog.title}</Text>
                      <Text style={[styles.publishedMeta, { color: colors.textMuted }]}>{prog.totalWeeks} weeks</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.cloneBtn, { borderColor: prog.color + '60', backgroundColor: prog.color + '15' }]}
                      onPress={() => {
                        Alert.alert('Clone Protocol', `Enroll in "${prog.title}"?`, [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Enroll', onPress: () => Alert.alert('Success', 'Protocol added!') },
                        ]);
                      }}
                    >
                      <Text style={[styles.cloneBtnText, { color: prog.color || BRAND.primary }]}>Use</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* ─── Completed Challenges Badge ──────────────────────────────────── */}
          {profile.completedChallenges > 0 && (
            <View style={[styles.completedBanner, { backgroundColor: BRAND.success + '18', borderColor: BRAND.success + '40' }]}>
              <Text style={{ fontSize: 24 }}>🏆</Text>
              <Text style={[styles.completedBannerText, { color: BRAND.success }]}>
                {profile.completedChallenges} protocol{profile.completedChallenges > 1 ? 's' : ''} completed
              </Text>
            </View>
          )}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const loadStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Hero
  heroContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HERO_HEIGHT,
    overflow: 'hidden',
    zIndex: 0,
  },
  heroImageWrap: {
    width: '100%',
    height: '100%',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    position: 'absolute',
    bottom: 36,
    left: 20,
    right: 20,
  },
  heroName: {
    color: '#FFF',
    fontSize: 34,
    fontFamily: 'Inter_700Bold',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroBio: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
    marginBottom: 14,
  },
  heroStats: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  heroStatChip: {
    borderRadius: 99,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  heroStatGrad: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99 },
  heroStatChipText: {
    color: '#FFF',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  heroStatText: { color: '#FFF', fontSize: 13, fontFamily: 'Inter_700Bold' },

  // Compact Header
  compactHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    height: COMPACT_HEADER_HEIGHT + 44,
    overflow: 'hidden',
  },
  compactHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  compactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  compactName: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
  },

  // Top Nav
  topNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scroll Content
  scrollContent: {
    zIndex: 10,
  },
  contentCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 24,
    minHeight: SCREEN_HEIGHT,
  },

  // Identity
  identityStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  displayName: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  memberSince: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 3 },
  identityRight: { alignItems: 'flex-end' },
  friendCount: { fontSize: 14, fontFamily: 'Inter_400Regular' },

  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },

  // Level card
  levelCard: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
  },
  levelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  levelBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99 },
  levelBadgeText: { color: '#FFF', fontSize: 14, fontFamily: 'Inter_700Bold' },
  levelXP: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  xpBarBg: { height: 6, borderRadius: 6, overflow: 'hidden', marginBottom: 10 },
  xpBarFill: { height: '100%', borderRadius: 6 },
  xpTotal: { fontSize: 12, fontFamily: 'Inter_400Regular' },

  // Social links
  socialLinksRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },

  // Published programs
  publishedCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  publishedRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  publishedEmoji: { fontSize: 26 },
  publishedTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  publishedMeta: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  cloneBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1,
  },
  cloneBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  // Completed banner
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
  },
  completedBannerText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
