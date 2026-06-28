import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { parseProgramDescription } from './(tabs)/program';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { Program, getProgramImage } from '@/constants/program';
import { customFetch } from '@workspace/api-client-react';
import { LinearGradient } from 'expo-linear-gradient';
import { CommitmentButton } from '@/components/CommitmentButton';
import AnimatedReanimated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  withSpring,
  SlideInDown,
  SlideOutDown,
  Easing,
} from 'react-native-reanimated';

const getProgramCommunityStats = (p: Program) => {
  // Deterministic generator so it looks consistent but varied
  const hash = p.title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const likes = (hash * 3) % 450 + 50;
  const clones = (hash * 7) % 1800 + 120;
  const author = p.isSystem ? 'system' : `@discipline_${hash % 90 + 10}`;
  
  const tagPools = [
    ['Focus', 'Cognition', 'Habits'],
    ['Dopamine Reset', 'Detox', 'Mindfulness'],
    ['Morning routine', 'Consistency', 'Sleep'],
    ['Fitness', 'Endurance', 'Physical health'],
    ['Community', 'Accountability', 'Habits']
  ];
  const tags = tagPools[hash % tagPools.length];
  
  return { likes, clones, author, tags };
};

const AnimatedProgramCard = ({ item, index, scrollY, colors, setSelectedProgram }: any) => {
  const ITEM_HEIGHT = 280;
  const style = useAnimatedStyle(() => {
    const inputRange = [-1, 0, ITEM_HEIGHT * index, ITEM_HEIGHT * (index + 2)];
    const scale = interpolate(scrollY.value, inputRange, [1, 1, 1, 0.85], 'clamp');
    const opacity = interpolate(scrollY.value, inputRange, [1, 1, 1, 0], 'clamp');
    const translateY = interpolate(scrollY.value, inputRange, [0, 0, 0, 80], 'clamp');
    return { opacity, transform: [{ scale }, { translateY }] };
  });

  const parsed = parseProgramDescription(item.description);
  const coverImage = item.imageUrl || (parsed as any).customImageBase64 || getProgramImage(item.id);
  const stats = getProgramCommunityStats(item);

  return (
    <AnimatedReanimated.View style={[{ marginBottom: 20 }, style]}>
      <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedProgram(item); }} activeOpacity={0.9} style={{ height: 260, borderRadius: 28, overflow: 'hidden', backgroundColor: colors.card, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10, borderWidth: 1, borderColor: colors.border }}>
        <Image source={{ uri: coverImage }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        <LinearGradient colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.95)']} style={StyleSheet.absoluteFillObject} />
        <View style={{ flex: 1, padding: 24, justifyContent: 'space-between' }}>
          <View style={{ alignSelf: 'flex-start', backgroundColor: item.color, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
            <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: 1 }}>{item.isSystem ? 'OFFICIAL' : 'COMMUNITY'}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>{item.emoji}</Text>
            <Text style={{ fontSize: 26, fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: -0.5, marginBottom: 6 }} numberOfLines={2}>{item.title}</Text>
            <Text style={{ fontSize: 14, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.7)' }}>by <Text style={{ color: item.color, fontFamily: 'Inter_700Bold' }}>{stats.author}</Text> • {item.totalWeeks} Weeks</Text>
          </View>
        </View>
      </TouchableOpacity>
    </AnimatedReanimated.View>
  );
};

export default function ProgramDiscoverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { enrollProgram, unenrollProgram, toggleSavedProgram, createCustomProgram, deleteCustomProgram, publishProgram, userId, profile } = useApp();

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [allPrograms, setAllPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [activeTab, setActiveTab] = useState<'system' | 'community' | 'mine' | 'custom'>('system');
  const [showMenu, setShowMenu] = useState(false);

  const isEnrolled = useMemo(() => {
    if (!selectedProgram || !profile) return false;
    return profile.activeProgramIds.includes(selectedProgram.id);
  }, [selectedProgram, profile]);

  const isSaved = useMemo(() => {
    if (!selectedProgram || !profile) return false;
    return profile.savedProgramIds?.includes(selectedProgram.id);
  }, [selectedProgram, profile]);

  const topPadding = Platform.OS === 'web' ? 24 : insets.top + 12;

  // Fetch published programs from server on boot
  useEffect(() => {
    fetchDiscoverPrograms();
  }, [userId]);

  const fetchDiscoverPrograms = async () => {
    try {
      setLoading(true);
      const url = userId ? `/programs?authorId=${userId}` : '/programs';
      const res = await customFetch<Program[]>(url);
      if (res && Array.isArray(res)) {
        setAllPrograms(res);
      }
    } catch (err) {
      console.warn('Failed to load community programs:', err);
      Alert.alert('Offline Mode', 'Could not connect to the server to load community plans.');
    } finally {
      setLoading(false);
    }
  };

  const filteredPrograms = useMemo(() => {
    return allPrograms.filter((p) => {
      // Tab filter
      if (activeTab === 'system' && !p.isSystem) return false;
      if (activeTab === 'community' && (p.isSystem || p.authorId === userId)) return false;
      if (activeTab === 'mine' && !profile.savedProgramIds?.includes(p.id) && !profile.activeProgramIds.includes(p.id)) return false;
      if (activeTab === 'custom' && p.authorId !== userId) return false;

      // Search query filter
      const q = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p as any).authorId?.toLowerCase().includes(q)
      );
    });
  }, [allPrograms, activeTab, searchQuery]);

  const handleEnrollToggle = async (programId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      if (isEnrolled) {
        await unenrollProgram(programId);
        Alert.alert('Protocol Paused', 'You have paused this protocol. It has been removed from your active tracking tab.');
      } else {
        await enrollProgram(programId);
        Alert.alert(
          'Protocol Activated',
          'This protocol has been activated. Your habit tracker and daily journal prompts have been updated.',
          [{ text: 'View Protocol', onPress: () => { setSelectedProgram(null); router.push('/(tabs)/program'); } }]
        );
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to update protocol enrollment.');
    }
  };

  const handleEdit = (program: Program) => {
    setSelectedProgram(null);
    router.push({ pathname: '/program-builder', params: { id: program.id } });
  };

  const handleDelete = (program: Program) => {
    Alert.alert(
      'Delete Protocol?',
      'This permanently removes this custom protocol. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await deleteCustomProgram(program.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              setSelectedProgram(null);
              fetchDiscoverPrograms();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete protocol.');
            }
          },
        },
      ]
    );
  };

  const handlePublishToggle = (program: Program) => {
    const nextStatus = !program.isPublished;
    Alert.alert(
      nextStatus ? 'Publish to Community?' : 'Unpublish?',
      nextStatus
        ? 'Share this protocol with the community?'
        : 'Remove this from the public library?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: nextStatus ? 'Publish' : 'Unpublish',
          onPress: async () => {
            try {
              await publishProgram(program.id, nextStatus);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setAllPrograms(prev => prev.map(p => p.id === program.id ? { ...p, isPublished: nextStatus } : p));
              setSelectedProgram(prev => prev && prev.id === program.id ? { ...prev, isPublished: nextStatus } : prev);
            } catch (err) {
              Alert.alert('Error', 'Failed to update publication status.');
            }
          },
        },
      ]
    );
  };

  const handleFork = async (program: Program) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const clonedWeeks = program.weeks.map((w) => ({
        weekNumber: w.weekNumber,
        theme: w.theme,
        goal: w.goal,
        psychologyRationale: w.psychologyRationale,
        dailyJournalPrompt: (w as any).dailyJournalPrompt || '',
        tasks: w.tasks.map((t) => ({
          id: t.id || `t-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          title: t.title,
          description: t.description,
          type: t.type,
          isPersistent: t.isPersistent,
          isHabit: (t as any).isHabit ?? (t.type !== 'reflection'),
          metricCategory: (t as any).metricCategory ?? (t.type === 'reduction' ? 'reduce' : 'build'),
          metricInputType: (t as any).metricInputType ?? 'boolean',
          metricScoreWeight: (t as any).metricScoreWeight ?? 5,
        })),
      }));

      const clonedPayload = {
        title: `${program.title} (Clone)`,
        emoji: program.emoji,
        color: program.color,
        description: `Customized version of ${program.title}. ${program.description}`,
        totalWeeks: program.totalWeeks,
        forkedFromId: program.id,
        weeks: clonedWeeks,
      };

      const newProg = await createCustomProgram(clonedPayload);
      if (newProg) {
        Alert.alert(
          'Protocol Cloned',
          'Duplicated successfully. You can now tweak the tasks, journal prompts, and habits in the builder.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Configure Code',
              onPress: () => router.push({ pathname: '/program-builder', params: { id: newProg.id } }),
            },
          ]
        );
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to duplicate protocol.');
    }
  };

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const fabWidth = useAnimatedStyle(() => {
    const width = interpolate(scrollY.value, [0, 80], [150, 52], 'clamp');
    const scale = interpolate(scrollY.value, [0, 80], [1, 0.95], 'clamp');
    return { width, transform: [{ scale }] };
  });

  const fabTextOpacity = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, 40], [1, 0], 'clamp');
    return { opacity };
  });

  const renderAnimatedCard = ({ item, index }: any) => {
    return (
      <AnimatedProgramCard
        item={item}
        index={index}
        scrollY={scrollY}
        colors={colors}
        setSelectedProgram={setSelectedProgram}
      />
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Top Header & Search Area */}
      <View style={{ paddingTop: topPadding, paddingHorizontal: 20, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 34, fontFamily: 'Inter_700Bold', color: colors.foreground, letterSpacing: -1 }}>Discover</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={fetchDiscoverPrograms} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }} activeOpacity={0.7}>
              <Ionicons name="refresh" size={20} color={colors.foreground} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 16, height: 50 }}>
          <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
          <TextInput
            style={{ flex: 1, color: colors.foreground, fontSize: 15, fontFamily: 'Inter_500Medium' }}
            placeholder="Search programs, authors..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Pill Filter Tabs */}
      <View style={{ marginVertical: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
          {(['system', 'community', 'mine', 'custom'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab(t); }}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 20,
                backgroundColor: activeTab === t ? colors.foreground : colors.card,
                borderWidth: 1,
                borderColor: activeTab === t ? colors.foreground : colors.border,
              }}
            >
              <Text style={{
                fontSize: 12,
                fontFamily: activeTab === t ? 'Inter_700Bold' : 'Inter_600SemiBold',
                color: activeTab === t ? colors.background : colors.mutedForeground,
                letterSpacing: 1
              }}>
                {t === 'community' ? 'EXPLORE' : t === 'mine' ? 'MY PROGRAMS' : t === 'custom' ? 'CUSTOM' : t.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Content Layout */}
      <View style={{ flex: 1, position: 'relative' }}>
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : filteredPrograms.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No matching programs found</Text>
          </View>
        ) : (
          <AnimatedReanimated.FlatList
            data={filteredPrograms}
            keyExtractor={(item: any) => item.id}
            renderItem={renderAnimatedCard}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={() => {
              const featured = filteredPrograms.filter(p => p.isSystem).slice(0, 3);
              if (featured.length === 0) return null;
              
              return (
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: colors.foreground, marginBottom: 12 }}>Featured Programs</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
                    {featured.map((p) => {
                      const parsed = parseProgramDescription(p.description);
                      const cover = p.imageUrl || (parsed as any).customImageBase64 || getProgramImage(p.id);
                      return (
                        <TouchableOpacity
                          key={`feat-${p.id}`}
                          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedProgram(p); }}
                          activeOpacity={0.9}
                          style={{
                            width: 320,
                            height: 200,
                            borderRadius: 24,
                            overflow: 'hidden',
                            backgroundColor: colors.card,
                            borderWidth: 1,
                            borderColor: colors.border
                          }}
                        >
                          <Image source={{ uri: cover }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                          <LinearGradient colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.6)']} style={StyleSheet.absoluteFillObject} />
                          <View style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
                            <Text style={{ fontSize: 12, color: colors.primary, fontFamily: 'Inter_700Bold', letterSpacing: 1, marginBottom: 4 }}>EDITOR'S CHOICE</Text>
                            <Text style={{ fontSize: 24, color: '#fff', fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>{p.title}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              );
            }}
          />
        )}

        {/* Floating Action Button (FAB) */}
        <AnimatedReanimated.View style={[
          { 
            position: 'absolute', 
            bottom: 30, 
            right: 20, 
            height: 52, 
            backgroundColor: colors.foreground, 
            borderRadius: 26, 
            overflow: 'hidden', 
            shadowColor: '#000', 
            shadowOffset: { width: 0, height: 8 }, 
            shadowOpacity: 0.25, 
            shadowRadius: 16, 
            elevation: 8,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center'
          }, 
          fabWidth
        ]}>
          <TouchableOpacity 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/program-builder');
            }} 
            style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: 150, 
              height: '100%',
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={22} color={colors.background} />
            <AnimatedReanimated.Text 
              style={[
                { 
                  color: colors.background, 
                  fontFamily: 'Inter_700Bold', 
                  fontSize: 14, 
                  marginLeft: 6 
                }, 
                fabTextOpacity
              ]} 
              numberOfLines={1}
            >
              Create Plan
            </AnimatedReanimated.Text>
          </TouchableOpacity>
        </AnimatedReanimated.View>

        {/* REDESIGNED: Sliding Inspector Detail Sheet overlay */}
        {selectedProgram && (() => {
          const parsed = parseProgramDescription(selectedProgram.description);
          const coverImage = selectedProgram.imageUrl || (parsed as any).customImageBase64 || getProgramImage(selectedProgram.id);
          const stats = getProgramCommunityStats(selectedProgram);
          const isSaved = profile.savedProgramIds?.includes(selectedProgram.id);
          
          return (
            <AnimatedReanimated.View
              entering={SlideInDown.duration(350).easing(Easing.out(Easing.poly(4)))}
              exiting={SlideOutDown}
              style={[
                styles.inspectorContainer,
                {
                  backgroundColor: colors.background,
                  paddingTop: insets.top,
                }
              ]}
            >
              {/* Header Nav Bar */}
              <View style={[styles.inspectorNav, { borderBottomColor: colors.border }]}>
                <TouchableOpacity
                  onPress={() => setSelectedProgram(null)}
                  style={[styles.backBtnRound, { backgroundColor: colors.border + '20' }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={20} color={colors.foreground} />
                </TouchableOpacity>
                <Text style={[styles.inspectorNavTitle, { color: colors.foreground }]}>Syllabus & Blueprint</Text>
                <TouchableOpacity
                  onPress={() => { setShowMenu(false); setSelectedProgram(null); }}
                  style={[styles.backBtnRound, { backgroundColor: colors.border + '20' }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={[styles.inspectorScrollContent, { paddingBottom: insets.bottom + 120 }]}
                showsVerticalScrollIndicator={false}
              >
                {/* Hero Banner */}
                <View style={styles.swissHeroBanner}>
                  {coverImage ? (
                    <Image source={{ uri: coverImage }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                  ) : (
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: selectedProgram.color + '15' }]} />
                  )}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.85)']}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View style={styles.swissHeroContent}>
                    <View style={[styles.swissTypeBadge, { backgroundColor: selectedProgram.color }]}>
                      <Text style={{ fontSize: 9, fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: 1 }}>
                        {selectedProgram.isSystem ? 'OFFICIAL SYSTEM PLAN' : 'COMMUNITY BLUEPRINT'}
                      </Text>
                    </View>
                    <Text style={styles.swissHeroTitle} numberOfLines={2}>
                      {selectedProgram.emoji} {selectedProgram.title}
                    </Text>
                    <Text style={styles.swissHeroAuthor}>
                      by <Text style={{ fontFamily: 'Inter_700Bold' }}>{stats.author}</Text> • {selectedProgram.totalWeeks} Weeks Plan
                    </Text>
                  </View>
                </View>

                {/* Swiss Grid: Vision & Stakes */}
                <View style={styles.swissGridContainer}>
                  <View style={[styles.swissGridCol, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.swissGridLabel, { color: colors.mutedForeground }]}>01 / THE VISION</Text>
                    <Text style={[styles.swissGridText, { color: colors.foreground }]} numberOfLines={6}>
                      {parsed.identityStatement ? `"${parsed.identityStatement}"` : parsed.text}
                    </Text>
                  </View>
                  
                  {parsed.stakes ? (
                    <View style={[styles.swissGridCol, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Text style={[styles.swissGridLabel, { color: colors.brand.danger }]}>02 / THE STAKES</Text>
                      <Text style={[styles.swissGridText, { color: colors.foreground }]} numberOfLines={6}>
                        {parsed.stakes}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Roadmap / Syllabus */}
                <View style={{ marginTop: 28, paddingHorizontal: 16 }}>
                  <Text style={[styles.syllabusTitle, { color: colors.mutedForeground }]}>CURRICULUM SYLLABUS</Text>
                  
                  {selectedProgram.weeks.map((week) => (
                    <View
                      key={week.weekNumber}
                      style={[
                        styles.swissRoadmapCard,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                        }
                      ]}
                    >
                      <View style={[styles.roadmapHeaderRow, { borderBottomColor: colors.border }]}>
                        <View style={[styles.roadmapWeekCircle, { backgroundColor: selectedProgram.color }]}>
                          <Text style={styles.roadmapWeekNumText}>W{week.weekNumber}</Text>
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={[styles.roadmapWeekTheme, { color: colors.foreground }]}>{week.theme}</Text>
                          <Text style={[styles.roadmapWeekGoal, { color: colors.mutedForeground }]}>Goal: {week.goal}</Text>
                        </View>
                      </View>

                      {week.psychologyRationale ? (
                        <View style={[styles.roadmapRationaleBlock, { backgroundColor: selectedProgram.color + '0C', borderLeftColor: selectedProgram.color }]}>
                          <Ionicons name="flask-outline" size={13} color={selectedProgram.color} style={{ marginTop: 2 }} />
                          <Text style={[styles.roadmapRationaleText, { color: colors.mutedForeground }]}>
                            {week.psychologyRationale}
                          </Text>
                        </View>
                      ) : null}

                      {week.tasks && week.tasks.length > 0 && (
                        <View style={styles.roadmapTasksSection}>
                          <Text style={[styles.roadmapTasksTitle, { color: colors.mutedForeground }]}>DAILY HABITS & RECALIBRATION PROTOCOLS</Text>
                          {week.tasks.map((task) => {
                            const taskType = task.type ?? (
                              task.isHabit
                                ? (task.metricCategory === 'reduce' ? 'reduction' : 'action')
                                : 'reflection'
                            );
                            const typeColors = {
                              action: { color: colors.brand.primary, icon: 'flash-outline' },
                              reduction: { color: colors.brand.danger, icon: 'trending-down-outline' },
                              reflection: { color: colors.brand.warning, icon: 'bulb-outline' },
                            };
                            const conf = typeColors[taskType as 'action' | 'reduction' | 'reflection'] || typeColors.action;
                            return (
                              <View key={task.id} style={[styles.roadmapTaskRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                <View style={[styles.taskIconBg, { backgroundColor: conf.color + '12' }]}>
                                  <Ionicons name={conf.icon as any} size={12} color={conf.color} />
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={[styles.taskTitleText, { color: colors.foreground }]}>{task.title}</Text>
                                  {task.description ? (
                                    <Text style={[styles.taskDescText, { color: colors.mutedForeground }]}>{task.description}</Text>
                                  ) : null}
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </ScrollView>

              {/* Swiss Floating Footer Actions */}
              <View style={[
                styles.inspectorFooter, 
                { 
                  borderTopColor: colors.border, 
                  backgroundColor: colors.card, 
                  paddingBottom: insets.bottom + 12, 
                  paddingTop: 12,
                  flexDirection: 'row', 
                  gap: 12,
                  alignItems: 'center',
                  position: 'relative'
                }
              ]}>
                {showMenu && (
                  <View style={[
                    styles.menuDropdown, 
                    { backgroundColor: colors.card, borderColor: colors.border }
                  ]}>
                    {selectedProgram.authorId === userId ? (
                      <>
                        <TouchableOpacity onPress={() => { setShowMenu(false); handleEdit(selectedProgram); }} style={styles.menuItem}>
                          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#3b82f615', alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="pencil" size={16} color="#3b82f6" />
                          </View>
                          <Text style={[styles.menuItemText, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Edit Program</Text>
                        </TouchableOpacity>
                        
                        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />
                        
                        <TouchableOpacity onPress={() => { setShowMenu(false); handlePublishToggle(selectedProgram); }} style={styles.menuItem}>
                          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#8b5cf615', alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name={selectedProgram.isPublished ? "eye-off" : "share-social"} size={16} color="#8b5cf6" />
                          </View>
                          <Text style={[styles.menuItemText, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                            {selectedProgram.isPublished ? 'Unpublish' : 'Publish'}
                          </Text>
                        </TouchableOpacity>
                        
                        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />
                        
                        <TouchableOpacity onPress={() => { setShowMenu(false); handleDelete(selectedProgram); }} style={styles.menuItem}>
                          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#ef444415', alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="trash" size={16} color="#ef4444" />
                          </View>
                          <Text style={[styles.menuItemText, { color: '#ef4444', fontFamily: 'Inter_600SemiBold' }]}>Delete</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity onPress={() => { setShowMenu(false); handleFork(selectedProgram); }} style={styles.menuItem}>
                        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#10b98115', alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="git-branch" size={16} color="#10b981" />
                        </View>
                        <Text style={[styles.menuItemText, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Customize Plan</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <TouchableOpacity
                  onPress={() => setShowMenu(!showMenu)}
                  style={[
                    styles.compactSaveBtn, 
                    { backgroundColor: colors.border + '30', borderWidth: 1, borderColor: colors.border }
                  ]}
                  activeOpacity={0.8}
                >
                  <Ionicons name="ellipsis-horizontal" size={20} color={colors.foreground} />
                </TouchableOpacity>

                <View style={{ flex: 1 }}>
                  <CommitmentButton
                    key={`${selectedProgram.id}-${isSaved}`}
                    onComplete={async () => {
                      await toggleSavedProgram(selectedProgram.id);
                    }}
                    label={isSaved ? "Hold to Remove Plan" : "Hold to Save Plan"}
                    completedLabel={isSaved ? "Removed!" : "Saved & Synced!"}
                    color={isSaved ? '#ef4444' : '#10b981'}
                    icon={isSaved ? "trash-outline" : "bookmark-outline"}
                    duration={1200}
                    style={{ height: 48, marginVertical: 0, borderRadius: 14 }}
                  />
                </View>
              </View>
            </AnimatedReanimated.View>
          );
        })()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { padding: 4 },
  refreshBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontFamily: 'Inter_700Bold' },

  searchBarContainer: { paddingHorizontal: 16, paddingVertical: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },

  tabsRow: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 8 },
  tabBtn: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnText: { fontSize: 9, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 },

  loaderContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { fontSize: 13, fontFamily: 'Inter_500Medium' },

  listContent: { padding: 16, gap: 12 },

  // Redesigned Community Card
  newProgramCard: {
    padding: 16,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardEmojiBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmoji: {
    fontSize: 22,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  cardAuthorText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  cardTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  cardTypeBadgeText: {
    fontSize: 8,
    fontFamily: 'Inter_700Bold',
  },
  newCardDesc: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  cardTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cardTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardTagText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  cardDivider: {
    height: 1,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardStatText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },

  // Redesigned Swiss Inspector
  inspectorContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    zIndex: 100,
  },
  inspectorNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1.5,
  },
  inspectorNavTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  backBtnRound: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inspectorScrollContent: {
    paddingBottom: 120,
  },
  swissHeroBanner: {
    height: 240,
    width: '100%',
    position: 'relative',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  swissHeroContent: {
    padding: 24,
    gap: 8,
    zIndex: 2,
  },
  swissTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  swissHeroTitle: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    letterSpacing: -1,
  },
  swissHeroAuthor: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  swissGridContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 20,
  },
  swissGridCol: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  swissGridLabel: {
    fontSize: 8,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  swissGridText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  syllabusTitle: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  swissRoadmapCard: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1.5,
    marginBottom: 16,
    gap: 14,
  },
  roadmapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  roadmapWeekCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roadmapWeekNumText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  roadmapWeekTheme: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  roadmapWeekGoal: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  roadmapRationaleBlock: {
    flexDirection: 'row',
    gap: 6,
    borderLeftWidth: 3,
    paddingLeft: 8,
    paddingVertical: 6,
    borderRadius: 4,
  },
  roadmapRationaleText: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  roadmapTasksSection: {
    gap: 6,
  },
  roadmapTasksTitle: {
    fontSize: 8,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    marginBottom: 2,
  },
  roadmapTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    borderRadius: 12,
    gap: 8,
  },
  taskIconBg: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskTitleText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  taskDescText: {
    fontSize: 9,
    fontFamily: 'Inter_400Regular',
    lineHeight: 13,
    marginTop: 1,
  },
  inspectorFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
  },
  inspectorEnrollBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
  },
  inspectorEnrollBtnText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  inspectorForkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  inspectorForkBtnText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  menuDropdown: {
    position: 'absolute',
    bottom: 76,
    left: 16,
    borderWidth: 1,
    borderRadius: 14,
    padding: 8,
    width: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 999,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  menuItemText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  compactSaveBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
