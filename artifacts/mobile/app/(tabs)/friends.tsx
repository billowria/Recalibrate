import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  Dimensions,
  RefreshControl,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
  FadeIn,
  FadeOut,
  Layout,
} from 'react-native-reanimated';
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { useFriends, FriendProfile, FriendRequest } from '@/hooks/useFriends';
import { BRAND } from '@/constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;
const TABS = ['Friends', 'Requests', 'Discover'] as const;
type TabType = typeof TABS[number];

// ─── Helper: format relative date ─────────────────────────────────────────────
function formatRelativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Never active';
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (dateStr === today) return 'Active today ✓';
  if (dateStr === yesterday) return 'Active yesterday';
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days < 7) return `Active ${days}d ago`;
  if (days < 30) return `Active ${Math.floor(days / 7)}w ago`;
  return `Active ${Math.floor(days / 30)}mo ago`;
}

// ─── Level Badge ──────────────────────────────────────────────────────────────
function LevelBadge({ level, size = 'sm' }: { level?: number; size?: 'sm' | 'xs' }) {
  const colors = useColors();
  if (!level) return null;
  const isSmall = size === 'xs';
  return (
    <LinearGradient
      colors={[BRAND.primary, BRAND.secondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[badgeStyles.container, isSmall && badgeStyles.xs]}
    >
      <Text style={[badgeStyles.text, isSmall && badgeStyles.textXs]}>Lv {level}</Text>
    </LinearGradient>
  );
}

const badgeStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xs: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    color: '#FFF',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.3,
  },
  textXs: {
    fontSize: 9,
  },
});

// ─── Active Dot ───────────────────────────────────────────────────────────────
function ActiveDot({ isActive }: { isActive: boolean }) {
  if (!isActive) return null;
  return (
    <View style={dotStyles.wrapper}>
      <View style={dotStyles.dot} />
    </View>
  );
}

const dotStyles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: BRAND.success,
  },
});

// ─── Friend Card ──────────────────────────────────────────────────────────────
function FriendCard({ item, onPress }: { item: FriendProfile; onPress: () => void }) {
  const colors = useColors();
  const scale = useRef(new Animated.Value(1)).current;
  const isActiveToday = item.lastActive === new Date().toISOString().split('T')[0];

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={[fcStyles.card, { backgroundColor: colors.surfaceMid, borderColor: colors.border }]}
      >
        <View style={fcStyles.avatarWrap}>
          {item.avatarUrl ? (
            <Image source={{ uri: item.avatarUrl }} style={fcStyles.avatar} contentFit="cover" />
          ) : (
            <LinearGradient colors={[BRAND.primary + '40', BRAND.secondary + '20']} style={fcStyles.avatar}>
              <Text style={fcStyles.avatarInitial}>{item.name?.[0]?.toUpperCase() || '?'}</Text>
            </LinearGradient>
          )}
          <ActiveDot isActive={isActiveToday} />
        </View>
        <View style={fcStyles.info}>
          <View style={fcStyles.nameRow}>
            <Text style={[fcStyles.name, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
            <LevelBadge level={item.level} size="xs" />
          </View>
          <Text style={[fcStyles.meta, { color: isActiveToday ? BRAND.success : colors.textMuted }]} numberOfLines={1}>
            {formatRelativeDate(item.lastActive)}
          </Text>
        </View>
        <View style={[fcStyles.chevronWrap, { backgroundColor: colors.border + '60' }]}>
          <Feather name="chevron-right" size={16} color={colors.textMuted} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const fcStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    marginBottom: 10,
    borderWidth: 1,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFF',
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
  },
  info: { flex: 1, marginLeft: 14 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  name: { fontSize: 15, fontFamily: 'Inter_600SemiBold', flex: 1 },
  meta: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  chevronWrap: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});

// ─── Request Card (Swipeable) ─────────────────────────────────────────────────
function RequestCard({
  item,
  onAccept,
  onReject,
}: {
  item: FriendRequest;
  onAccept: () => void;
  onReject: () => void;
}) {
  const colors = useColors();
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        // Swipe right → accept
        translateX.value = withTiming(SCREEN_WIDTH, { duration: 280 });
        opacity.value = withTiming(0, { duration: 280 });
        runOnJS(onAccept)();
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        // Swipe left → reject
        translateX.value = withTiming(-SCREEN_WIDTH, { duration: 280 });
        opacity.value = withTiming(0, { duration: 280 });
        runOnJS(onReject)();
      } else {
        translateX.value = withSpring(0, { damping: 15, stiffness: 120 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  const acceptBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolate.CLAMP),
  }));
  const rejectBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolate.CLAMP),
  }));

  const req = item.requester;

  return (
    <View style={rcStyles.container}>
      {/* Accept bg hint */}
      <Reanimated.View style={[rcStyles.swipeHint, rcStyles.acceptHint, acceptBgStyle]}>
        <Feather name="check" size={28} color={BRAND.success} />
        <Text style={[rcStyles.swipeLabel, { color: BRAND.success }]}>Accept</Text>
      </Reanimated.View>
      {/* Reject bg hint */}
      <Reanimated.View style={[rcStyles.swipeHint, rcStyles.rejectHint, rejectBgStyle]}>
        <Text style={[rcStyles.swipeLabel, { color: BRAND.danger }]}>Decline</Text>
        <Feather name="x" size={28} color={BRAND.danger} />
      </Reanimated.View>

      <GestureDetector gesture={panGesture}>
        <Reanimated.View style={[rcStyles.card, { backgroundColor: colors.surfaceMid, borderColor: colors.border }, cardStyle]}>
          {/* Avatar with gradient ring */}
          <View style={rcStyles.avatarRingWrap}>
            <LinearGradient
              colors={[BRAND.primary, BRAND.secondary]}
              style={rcStyles.avatarRing}
            >
              {req.avatarUrl ? (
                <Image source={{ uri: req.avatarUrl }} style={rcStyles.avatar} contentFit="cover" />
              ) : (
                <View style={[rcStyles.avatar, { backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={rcStyles.avatarInitial}>{req.name?.[0]?.toUpperCase() || '?'}</Text>
                </View>
              )}
            </LinearGradient>
          </View>

          <View style={rcStyles.info}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[rcStyles.name, { color: colors.text }]} numberOfLines={1}>{req.name}</Text>
              <LevelBadge level={req.level} size="xs" />
            </View>
            {req.bio ? (
              <Text style={[rcStyles.bio, { color: colors.textSecondary }]} numberOfLines={1}>{req.bio}</Text>
            ) : (
              <Text style={[rcStyles.bio, { color: colors.textMuted }]}>Wants to connect</Text>
            )}
            <Text style={[rcStyles.time, { color: colors.textMuted }]}>
              {formatRelativeDate(item.createdAt?.split('T')[0])}
            </Text>
          </View>

          {/* Action buttons */}
          <View style={rcStyles.actions}>
            <TouchableOpacity
              style={[rcStyles.btn, { backgroundColor: BRAND.success + '18', borderColor: BRAND.success + '40' }]}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onAccept();
              }}
            >
              <Feather name="check" size={18} color={BRAND.success} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[rcStyles.btn, { backgroundColor: BRAND.danger + '18', borderColor: BRAND.danger + '40' }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onReject();
              }}
            >
              <Feather name="x" size={18} color={BRAND.danger} />
            </TouchableOpacity>
          </View>
        </Reanimated.View>
      </GestureDetector>
    </View>
  );
}

const rcStyles = StyleSheet.create({
  container: { marginBottom: 12, position: 'relative' },
  swipeHint: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  acceptHint: { left: 0, right: 0, backgroundColor: BRAND.success + '15' },
  rejectHint: { left: 0, right: 0, backgroundColor: BRAND.danger + '15', justifyContent: 'flex-end' },
  swipeLabel: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
  },
  avatarRingWrap: {},
  avatarRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  avatarInitial: { color: '#FFF', fontSize: 22, fontFamily: 'Inter_700Bold' },
  info: { flex: 1 },
  name: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  bio: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  time: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 4 },
  actions: { flexDirection: 'column', gap: 8 },
  btn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});

// ─── Discover Card ────────────────────────────────────────────────────────────
function DiscoverCard({
  item,
  onPress,
  relationship,
  onAdd,
}: {
  item: FriendProfile;
  onPress: () => void;
  relationship: string;
  onAdd: () => void;
}) {
  const colors = useColors();

  const getRelBtnConfig = () => {
    switch (relationship) {
      case 'friends': return { label: 'Friends ✓', color: BRAND.success, disabled: true };
      case 'pending_sent': return { label: 'Sent ⏳', color: colors.textMuted, disabled: true };
      case 'pending_received': return { label: 'Respond ↩', color: BRAND.secondary, disabled: false };
      default: return { label: 'Add Friend', color: BRAND.primary, disabled: false };
    }
  };
  const btn = getRelBtnConfig();

  return (
    <Reanimated.View entering={FadeIn.duration(250)} layout={Layout.springify()}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={[dcStyles.card, { backgroundColor: colors.surfaceMid, borderColor: colors.border }]}
      >
        <View style={dcStyles.top}>
          {item.avatarUrl ? (
            <Image source={{ uri: item.avatarUrl }} style={dcStyles.avatar} contentFit="cover" />
          ) : (
            <LinearGradient colors={[BRAND.primary + '50', BRAND.secondary + '30']} style={dcStyles.avatar}>
              <Text style={dcStyles.avatarInitial}>{item.name?.[0]?.toUpperCase() || '?'}</Text>
            </LinearGradient>
          )}
          <View style={dcStyles.info}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[dcStyles.name, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
              <LevelBadge level={item.level} size="xs" />
            </View>
            {item.bio ? (
              <Text style={[dcStyles.bio, { color: colors.textSecondary }]} numberOfLines={2}>{item.bio}</Text>
            ) : null}
          </View>
        </View>
        <View style={dcStyles.stats}>
          <View style={dcStyles.statPill}>
            <Text style={dcStyles.statEmoji}>🔥</Text>
            <Text style={[dcStyles.statText, { color: colors.textSecondary }]}>{item.highestStreak}d</Text>
          </View>
          <View style={dcStyles.statPill}>
            <Text style={dcStyles.statEmoji}>✨</Text>
            <Text style={[dcStyles.statText, { color: colors.textSecondary }]}>{item.totalXP} XP</Text>
          </View>
          <TouchableOpacity
            onPress={btn.disabled ? undefined : (e) => { e.stopPropagation?.(); onAdd(); }}
            style={[dcStyles.addBtn, { backgroundColor: btn.color + '20', borderColor: btn.color + '50' }]}
            disabled={btn.disabled}
            activeOpacity={0.7}
          >
            <Text style={[dcStyles.addBtnText, { color: btn.color }]}>{btn.label}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Reanimated.View>
  );
}

const dcStyles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 12 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: '#FFF', fontSize: 22, fontFamily: 'Inter_700Bold' },
  info: { flex: 1 },
  name: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  bio: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 4, lineHeight: 18 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  statEmoji: { fontSize: 12 },
  statText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  addBtn: {
    marginLeft: 'auto',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
  },
  addBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
});

// ─── Empty States ─────────────────────────────────────────────────────────────
function EmptyState({ tab, onAction }: { tab: TabType; onAction?: () => void }) {
  const colors = useColors();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 1600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const configs = {
    Friends: { emoji: '👥', title: 'No connections yet', sub: 'Head to Discover to find people on the same journey as you.', cta: 'Discover People' },
    Requests: { emoji: '🎉', title: "You're all caught up!", sub: 'No pending connection requests right now.', cta: null },
    Discover: { emoji: '🔍', title: 'Search for people', sub: 'Type a name to find accountability partners.', cta: null },
  };
  const { emoji, title, sub, cta } = configs[tab];

  return (
    <Reanimated.View entering={FadeIn.duration(300)} style={esStyles.container}>
      <Animated.Text style={[esStyles.emoji, { transform: [{ scale: pulse }] }]}>{emoji}</Animated.Text>
      <Text style={[esStyles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[esStyles.sub, { color: colors.textMuted }]}>{sub}</Text>
      {cta && onAction && (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.8}
          style={esStyles.ctaWrap}
        >
          <LinearGradient colors={[BRAND.primary, BRAND.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={esStyles.cta}>
            <Text style={esStyles.ctaText}>{cta}</Text>
            <Feather name="arrow-right" size={16} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </Reanimated.View>
  );
}

const esStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 64 },
  emoji: { fontSize: 56, marginBottom: 20 },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold', textAlign: 'center', marginBottom: 10 },
  sub: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 21 },
  ctaWrap: { marginTop: 28, borderRadius: 99, overflow: 'hidden' },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 13 },
  ctaText: { color: '#FFF', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});

// ─── Animated Search Bar ──────────────────────────────────────────────────────
const PLACEHOLDERS = [
  'Search by name...',
  'Find accountability partners...',
  'Connect with friends...',
  "Who's on the same journey?",
];

function AnimatedSearchBar({ value, onChange, isSearching }: { value: string; onChange: (t: string) => void; isSearching: boolean }) {
  const colors = useColors();
  const [pIndex, setPIndex] = useState(0);
  const [focused, setFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (value.length > 0) return;
    const id = setInterval(() => setPIndex(i => (i + 1) % PLACEHOLDERS.length), 2800);
    return () => clearInterval(id);
  }, [value]);

  useEffect(() => {
    Animated.timing(focusAnim, { toValue: focused ? 1 : 0, duration: 200, useNativeDriver: false }).start();
  }, [focused]);

  const borderColor = focusAnim.interpolate({ inputRange: [0, 1], outputRange: [colors.border, BRAND.primary] });

  return (
    <Animated.View style={[sbStyles.container, { backgroundColor: colors.surfaceMid, borderColor }]}>
      <Feather name="search" size={18} color={focused ? BRAND.primary : colors.textMuted} />
      <TextInput
        style={[sbStyles.input, { color: colors.text }]}
        placeholder={PLACEHOLDERS[pIndex]}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCapitalize="none"
        returnKeyType="search"
      />
      {isSearching
        ? <ActivityIndicator size="small" color={BRAND.primary} />
        : value.length > 0
          ? <TouchableOpacity onPress={() => onChange('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          : null
      }
    </Animated.View>
  );
}

const sbStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1.5,
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  input: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular', paddingVertical: 0 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function FriendsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useApp();

  const [activeTab, setActiveTab] = useState<TabType>('Friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [searchRelationships, setSearchRelationships] = useState<Record<string, string>>({});
  const [isSearching, setIsSearching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Animated tab indicator linked to ScrollView paging
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useSharedValue(0);
  const TAB_WIDTH = (SCREEN_WIDTH - 32) / TABS.length;

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleMomentumScrollEnd = (event: any) => {
    const x = event.nativeEvent.contentOffset.x;
    const idx = Math.round(x / SCREEN_WIDTH);
    const newTab = TABS[idx];
    if (newTab && newTab !== activeTab) {
      setActiveTab(newTab);
      Haptics.selectionAsync();
    }
  };

  const {
    friends,
    isLoadingFriends,
    requests,
    isLoadingRequests,
    respondToRequest,
    sendRequest,
    searchUsers,
    getRelationshipStatus,
    refetchAll,
  } = useFriends(userId);

  const handleTabChange = (tab: TabType) => {
    const idx = TABS.indexOf(tab);
    scrollViewRef.current?.scrollTo({ x: idx * SCREEN_WIDTH, animated: true });
    setActiveTab(tab);
    Haptics.selectionAsync();
  };

  const tabIndicatorStyle = useAnimatedStyle(() => {
    const translateX = (scrollX.value / SCREEN_WIDTH) * TAB_WIDTH;
    return {
      transform: [{ translateX }],
    };
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    refetchAll();
    setTimeout(() => setIsRefreshing(false), 1200);
  };

  const handleSearch = useCallback(async (text: string) => {
    setSearchQuery(text);
    if (text.length >= 2) {
      setIsSearching(true);
      try {
        const results = await searchUsers(text);
        setSearchResults(results);

        // Fetch relationship status for all results in parallel
        const statuses: Record<string, string> = {};
        await Promise.all(
          results.map(async (user) => {
            if (!userId) return;
            const s = await getRelationshipStatus(user.id);
            statuses[user.id] = s.status;
          })
        );
        setSearchRelationships(statuses);
      } catch { /* silent */ }
      finally { setIsSearching(false); }
    } else {
      setSearchResults([]);
      setSearchRelationships({});
    }
  }, [userId]);

  const handleAdd = async (user: FriendProfile) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await sendRequest(user.id);
      setSearchRelationships(prev => ({ ...prev, [user.id]: 'pending_sent' }));
    } catch { /* silent */ }
  };

  // ─── Friends Tab Content ─────────────────────────────────────────────────
  const renderFriendsContent = () => {
    if (isLoadingFriends) {
      return <ActivityIndicator style={{ marginTop: 60 }} color={BRAND.primary} size="large" />;
    }
    if (friends.length === 0) {
      return <EmptyState tab="Friends" onAction={() => handleTabChange('Discover')} />;
    }
    return (
      <FlatList
        data={friends}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <FriendCard
            item={item}
            onPress={() => router.push(`/user-profile/${item.id}` as any)}
          />
        )}
        contentContainerStyle={listStyles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={BRAND.primary} />
        }
      />
    );
  };

  // ─── Requests Tab Content ────────────────────────────────────────────────
  const renderRequestsContent = () => {
    if (isLoadingRequests) {
      return <ActivityIndicator style={{ marginTop: 60 }} color={BRAND.primary} size="large" />;
    }
    if (requests.length === 0) {
      return <EmptyState tab="Requests" />;
    }
    return (
      <FlatList
        data={requests}
        keyExtractor={item => item.friendshipId}
        renderItem={({ item }) => (
          <RequestCard
            item={item}
            onAccept={async () => {
              await respondToRequest({ friendshipId: item.friendshipId, action: 'accept' });
            }}
            onReject={async () => {
              await respondToRequest({ friendshipId: item.friendshipId, action: 'reject' });
            }}
          />
        )}
        contentContainerStyle={listStyles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={BRAND.primary} />
        }
      />
    );
  };

  // ─── Discover Tab Content ────────────────────────────────────────────────
  const renderDiscoverContent = () => (
    <View style={{ flex: 1 }}>
      <AnimatedSearchBar value={searchQuery} onChange={handleSearch} isSearching={isSearching} />
      {searchResults.length === 0 && searchQuery.length < 2 ? (
        <EmptyState tab="Discover" />
      ) : searchResults.length === 0 && !isSearching ? (
        <Reanimated.View entering={FadeIn.duration(200)} style={{ alignItems: 'center', marginTop: 48 }}>
          <Text style={{ fontSize: 32, marginBottom: 12 }}>🤷</Text>
          <Text style={[{ color: colors.textSecondary, fontSize: 16, fontFamily: 'Inter_600SemiBold' }]}>No results found</Text>
          <Text style={[{ color: colors.textMuted, fontSize: 13, marginTop: 6 }]}>Try a different name or spelling</Text>
        </Reanimated.View>
      ) : (
        <FlatList
          data={searchResults}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: 16 }}>
              <DiscoverCard
                item={item}
                relationship={searchRelationships[item.id] || 'none'}
                onPress={() => router.push(`/user-profile/${item.id}` as any)}
                onAdd={() => handleAdd(item)}
              />
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        {/* ─── Header ──────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Social</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {friends.length} {friends.length === 1 ? 'connection' : 'connections'}
            </Text>
          </View>
          {requests.length > 0 && (
            <TouchableOpacity
              onPress={() => handleTabChange('Requests')}
              activeOpacity={0.7}
              style={styles.requestsBadge}
            >
              <LinearGradient colors={[BRAND.primary, BRAND.secondary]} style={styles.requestsBadgeGrad}>
                <Feather name="bell" size={14} color="#FFF" />
                <Text style={styles.requestsBadgeText}>{requests.length}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* ─── Animated Tab Switcher ────────────────────────────────────── */}
        <View style={[styles.tabBar, { backgroundColor: colors.surfaceMid }]}>
          {/* Sliding indicator */}
          <Reanimated.View
            style={[styles.tabIndicator, { width: TAB_WIDTH - 6 }, tabIndicatorStyle]}
          >
            <LinearGradient
              colors={[BRAND.primary + 'CC', BRAND.secondary + 'CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Reanimated.View>

          {TABS.map(tab => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, { width: TAB_WIDTH }]}
                onPress={() => handleTabChange(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, { color: isActive ? '#FFF' : colors.textMuted }]}>
                  {tab}
                  {tab === 'Requests' && requests.length > 0 ? ` (${requests.length})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ─── Content ─────────────────────────────────────────────────── */}
        <Reanimated.ScrollView
          ref={scrollViewRef as any}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={scrollHandler}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          scrollEventThrottle={16}
          style={styles.content}
        >
          <View style={{ width: SCREEN_WIDTH }}>
            {renderFriendsContent()}
          </View>
          <View style={{ width: SCREEN_WIDTH }}>
            {renderRequestsContent()}
          </View>
          <View style={{ width: SCREEN_WIDTH }}>
            {renderDiscoverContent()}
          </View>
        </Reanimated.ScrollView>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  requestsBadge: { borderRadius: 99, overflow: 'hidden' },
  requestsBadgeGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
  },
  requestsBadgeText: { color: '#FFF', fontSize: 13, fontFamily: 'Inter_700Bold' },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    height: 44,
    position: 'relative',
    overflow: 'hidden',
  },
  tabIndicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: 11,
    overflow: 'hidden',
  },
  tabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  content: { flex: 1 },
});

const listStyles = StyleSheet.create({
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
});
