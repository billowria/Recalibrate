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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, Program } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { customFetch } from '@workspace/api-client-react';
import { LinearGradient } from 'expo-linear-gradient';
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

// helper to calculate statistics
const getProgramCommunityStats = (p: Program) => {
  const hash = p.title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const likes = (hash * 3) % 450 + 50;
  const clones = (hash * 7) % 1800 + 120;
  const author = p.isTemplate ? 'System Template' : `@athlete_${hash % 90 + 10}`;
  return { likes, clones, author };
};

const AnimatedProgramCard = ({ item, index, scrollY, colors, setSelectedProgram }: any) => {
  const ITEM_HEIGHT = 180;
  const style = useAnimatedStyle(() => {
    const inputRange = [-1, 0, ITEM_HEIGHT * index, ITEM_HEIGHT * (index + 2)];
    const scale = interpolate(scrollY.value, inputRange, [1, 1, 1, 0.9], 'clamp');
    const opacity = interpolate(scrollY.value, inputRange, [1, 1, 1, 0], 'clamp');
    const translateY = interpolate(scrollY.value, inputRange, [0, 0, 0, 40], 'clamp');
    return { opacity, transform: [{ scale }, { translateY }] };
  });

  const stats = getProgramCommunityStats(item);

  return (
    <AnimatedReanimated.View style={[{ marginBottom: 12 }, style]}>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedProgram(item);
        }}
        activeOpacity={0.8}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <View style={[styles.cardEmojiBg, { backgroundColor: `${item.color}15` }]}>
            <Text style={styles.cardEmoji}>{item.emoji}</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
              <View style={[styles.cardTypeBadge, { borderColor: item.color, backgroundColor: `${item.color}10` }]}>
                <Text style={[styles.cardTypeBadgeText, { color: item.color }]}>
                  {item.isTemplate ? 'OFFICIAL' : 'COMMUNITY'}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>
              by {stats.author}
            </Text>
            {item.description && (
              <Text style={{ fontSize: 12, color: colors.textMuted }} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>
        </View>

        <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

        <View style={styles.cardFooterRow}>
          <View style={styles.cardStatItem}>
            <Ionicons name="heart-outline" size={13} color={colors.textSecondary} />
            <Text style={[styles.cardStatText, { color: colors.textSecondary }]}>{stats.likes}</Text>
          </View>
          <View style={styles.cardStatItem}>
            <Ionicons name="git-compare-outline" size={13} color={colors.textSecondary} />
            <Text style={[styles.cardStatText, { color: colors.textSecondary }]}>{stats.clones} Clones</Text>
          </View>
        </View>
      </TouchableOpacity>
    </AnimatedReanimated.View>
  );
};

export default function ProgramDiscoverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    enrollProgram,
    unenrollProgram,
    toggleSavedProgram,
    createCustomProgram,
    deleteCustomProgram,
    publishProgram,
    userId,
    profile,
    workoutDays,
    workoutDayExercises
  } = useApp();

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [allPrograms, setAllPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<any | null>(null);
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
      console.warn('Failed to load community splits:', err);
      Alert.alert('Offline Mode', 'Could not connect to the server to load community split plans.');
    } finally {
      setLoading(false);
    }
  };

  const filteredPrograms = useMemo(() => {
    return allPrograms.filter((p) => {
      // Tab filter
      if (activeTab === 'system' && !p.isTemplate) return false;
      if (activeTab === 'community' && (p.isTemplate || p.userId === userId)) return false;
      if (activeTab === 'mine' && !profile.savedProgramIds?.includes(p.id) && !profile.activeProgramIds.includes(p.id)) return false;
      if (activeTab === 'custom' && p.userId !== userId) return false;

      // Search query filter
      const q = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      );
    });
  }, [allPrograms, activeTab, searchQuery, userId, profile.savedProgramIds, profile.activeProgramIds]);

  const handleEnrollToggle = async (programId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      if (isEnrolled) {
        await unenrollProgram(programId);
        Alert.alert('Split Paused', 'You have paused this split routine. It has been removed from active tracking.');
      } else {
        await enrollProgram(programId);
        Alert.alert(
          'Split Activated',
          'This routine split has been activated. Your daily dashboard is updated.',
          [{ text: 'View Split', onPress: () => { setSelectedProgram(null); router.push('/(tabs)/program'); } }]
        );
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to update program split enrollment.');
    }
  };

  const handleEdit = (program: Program) => {
    setSelectedProgram(null);
    router.push({ pathname: '/program-builder', params: { id: program.id } });
  };

  const handleDelete = (program: Program) => {
    Alert.alert(
      'Delete Split?',
      'This permanently removes this custom split routine. This cannot be undone.',
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
              Alert.alert('Error', 'Failed to delete routine split.');
            }
          },
        },
      ]
    );
  };

  const handlePublishToggle = (program: Program) => {
    const nextStatus = !program.isTemplate;
    Alert.alert(
      nextStatus ? 'Publish to Library?' : 'Unpublish?',
      nextStatus ? 'Share this routine split with other lifters?' : 'Remove from public library?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: nextStatus ? 'Publish' : 'Unpublish',
          onPress: async () => {
            try {
              await publishProgram(program.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              fetchDiscoverPrograms();
              setSelectedProgram(null);
            } catch (err) {
              Alert.alert('Error', 'Failed to update publication status.');
            }
          },
        },
      ]
    );
  };

  const handleFork = async (program: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (!program.days || !Array.isArray(program.days)) {
        Alert.alert('Cannot Customize', 'This template contains no workout days split.');
        return;
      }

      const clonedDays = program.days.map((d: any) => {
        const dayExs = (d.exercises || []).map((de: any) => ({
          exerciseId: de.exerciseId,
          targetSets: de.targetSets,
          targetReps: de.targetReps,
          targetRpe: de.targetRpe || 8
        }));

        return {
          title: d.title,
          dayNumber: d.dayNumber,
          targetMuscleGroups: d.targetMuscleGroups || [],
          exercises: dayExs
        };
      });

      const clonedPayload = {
        title: `${program.title} (Clone)`,
        emoji: program.emoji,
        color: program.color,
        description: `Customized version of ${program.title}. ${program.description || ''}`,
      };

      const newProg = await createCustomProgram(clonedPayload, clonedDays);
      if (newProg) {
        Alert.alert(
          'Split Routine Cloned',
          'Duplicated successfully. You can now configure exercises, sets, and reps in the builder.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Configure Split',
              onPress: () => router.push({ pathname: '/program-builder', params: { id: newProg.id } }),
            },
          ]
        );
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to duplicate program split.');
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
          <Text style={{ fontSize: 34, fontFamily: 'Inter_700Bold', color: colors.text, letterSpacing: -1 }}>Discover</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={fetchDiscoverPrograms} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }} activeOpacity={0.7}>
              <Ionicons name="refresh" size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 16, height: 50 }}>
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
          <TextInput
            style={{ flex: 1, color: colors.text, fontSize: 15, fontFamily: 'Inter_500Medium' }}
            placeholder="Search programs, templates..."
            placeholderTextColor={colors.textMuted}
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
                backgroundColor: activeTab === t ? colors.text : colors.surface,
                borderWidth: 1,
                borderColor: activeTab === t ? colors.text : colors.border,
              }}
            >
              <Text style={{
                fontSize: 12,
                fontFamily: activeTab === t ? 'Inter_700Bold' : 'Inter_600SemiBold',
                color: activeTab === t ? colors.background : colors.textSecondary,
                letterSpacing: 0.5
              }}>
                {t === 'system' ? 'OFFICIAL SPLITS' : t === 'community' ? 'COMMUNITY' : t === 'mine' ? 'MY LIFTS' : 'CREATED BY ME'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Content Layout */}
      <View style={{ flex: 1, position: 'relative' }}>
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="small" color={colors.brand.primary} />
          </View>
        ) : filteredPrograms.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={32} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No matching routines found</Text>
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
          />
        )}

        {/* Floating Action Button (FAB) */}
        <AnimatedReanimated.View style={[
          { 
            position: 'absolute', 
            bottom: 30, 
            right: 20, 
            height: 52, 
            backgroundColor: colors.text, 
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
              Build Routine
            </AnimatedReanimated.Text>
          </TouchableOpacity>
        </AnimatedReanimated.View>

        {/* Sliding Inspector Detail Sheet overlay */}
        {selectedProgram && (() => {
          const stats = getProgramCommunityStats(selectedProgram);
          
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
                  <Ionicons name="arrow-back" size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.inspectorNavTitle, { color: colors.text }]}>Routine Overview</Text>
                <TouchableOpacity
                  onPress={() => { setShowMenu(false); setSelectedProgram(null); }}
                  style={[styles.backBtnRound, { backgroundColor: colors.border + '20' }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={[styles.inspectorScrollContent, { paddingBottom: insets.bottom + 120 }]}
                showsVerticalScrollIndicator={false}
              >
                {/* Hero Banner */}
                <View style={[styles.swissHeroBanner, { backgroundColor: selectedProgram.color + '15' }]}>
                  <View style={styles.swissHeroContent}>
                    <View style={[styles.swissTypeBadge, { backgroundColor: selectedProgram.color }]}>
                      <Text style={{ fontSize: 9, fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: 0.5 }}>
                        {selectedProgram.isTemplate ? 'OFFICIAL SYSTEM SPLIT' : 'COMMUNITY SPLIT'}
                      </Text>
                    </View>
                    <Text style={[styles.swissHeroTitle, { color: colors.text }]} numberOfLines={2}>
                      {selectedProgram.emoji} {selectedProgram.title}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                      by <Text style={{ fontFamily: 'Inter_700Bold' }}>{stats.author}</Text> • {selectedProgram.days?.length || 3} Workout Days Split
                    </Text>
                  </View>
                </View>

                {/* vision / identity statement */}
                <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
                  <View style={[styles.descriptionBlock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: colors.textSecondary, letterSpacing: 1 }}>ABOUT THIS ROUTINE</Text>
                    <Text style={{ fontSize: 13, color: colors.text, lineHeight: 18, marginTop: 4 }}>
                      {selectedProgram.description || 'No description provided.'}
                    </Text>
                  </View>
                </View>

                {/* Split Days details */}
                <View style={{ marginTop: 28, paddingHorizontal: 16, gap: 12 }}>
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: colors.textSecondary, letterSpacing: 1 }}>SPLIT DAY ROUTINES</Text>
                  
                  {selectedProgram.days && Array.isArray(selectedProgram.days) && selectedProgram.days.map((day: any) => (
                    <View
                      key={day.dayNumber}
                      style={[
                        styles.dayDetailCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        }
                      ]}
                    >
                      <View style={[styles.dayHeaderRow, { borderBottomColor: colors.border }]}>
                        <View style={[styles.dayCircle, { backgroundColor: selectedProgram.color }]}>
                          <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: '#fff' }}>D{day.dayNumber}</Text>
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: colors.text }}>{day.title}</Text>
                          <Text style={{ fontSize: 11, color: colors.textSecondary }}>Focus: {(day.targetMuscleGroups || []).join(', ')}</Text>
                        </View>
                      </View>

                      {/* Exercises list */}
                      <View style={{ padding: 12, gap: 8 }}>
                        {day.exercises && Array.isArray(day.exercises) && day.exercises.map((de: any, idx: number) => (
                          <View key={de.id || idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, color: colors.text, fontFamily: 'Inter_500Medium' }}>
                              {idx + 1}. {de.exercise ? de.exercise.name : 'Unknown Exercise'}
                            </Text>
                            <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                              {de.targetSets} Sets x {de.targetReps} Reps {de.targetRpe ? `@ RPE ${de.targetRpe}` : ''}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>

              {/* Floating Footer Actions */}
              <View style={[
                styles.inspectorFooter, 
                { 
                  borderTopColor: colors.border, 
                  backgroundColor: colors.surface, 
                  paddingBottom: insets.bottom + 12, 
                  paddingTop: 12,
                  flexDirection: 'row', 
                  gap: 12,
                  alignItems: 'center',
                }
              ]}>
                {selectedProgram.userId === userId ? (
                  <TouchableOpacity
                    onPress={() => handleEdit(selectedProgram)}
                    style={[styles.btnAction, { flex: 1, backgroundColor: colors.border + '30', borderColor: colors.border, borderWidth: 1 }]}
                  >
                    <Ionicons name="pencil" size={16} color={colors.text} />
                    <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.text }}>Edit</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleFork(selectedProgram)}
                    style={[styles.btnAction, { flex: 1, backgroundColor: colors.border + '30', borderColor: colors.border, borderWidth: 1 }]}
                  >
                    <Ionicons name="git-branch" size={16} color={colors.text} />
                    <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: colors.text }}>Customize</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => handleEnrollToggle(selectedProgram.id)}
                  style={[styles.btnAction, { flex: 2, backgroundColor: isEnrolled ? '#FF5E5E' : selectedProgram.color }]}
                >
                  <Ionicons name={isEnrolled ? "pause" : "play"} size={16} color="#fff" />
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: '#fff' }}>
                    {isEnrolled ? 'Stop Active Split' : 'Enroll & Start Split'}
                  </Text>
                </TouchableOpacity>
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
  loaderContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { fontSize: 13, fontFamily: 'Inter_500Medium' },

  card: { padding: 16, borderRadius: 20, borderWidth: 1, marginHorizontal: 20 },
  cardEmojiBg: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardEmoji: { fontSize: 22 },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', maxWidth: '70%' },
  cardTypeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  cardTypeBadgeText: { fontSize: 8, fontFamily: 'Inter_700Bold' },
  cardDivider: { height: 1, marginVertical: 12 },
  cardFooterRow: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  cardStatItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardStatText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },

  inspectorContainer: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, zIndex: 100 },
  inspectorNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1.5 },
  inspectorNavTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', letterSpacing: 1, textTransform: 'uppercase' },
  backBtnRound: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  inspectorScrollContent: { paddingBottom: 120 },

  swissHeroBanner: { height: 160, width: '100%', justifyContent: 'flex-end', overflow: 'hidden' },
  swissHeroContent: { padding: 24, gap: 8 },
  swissTypeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  swissHeroTitle: { fontSize: 24, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },

  descriptionBlock: { padding: 16, borderRadius: 16, borderWidth: 1 },

  dayDetailCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  dayHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderBottomWidth: 1 },
  dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  inspectorFooter: { paddingHorizontal: 16, borderTopWidth: 1 },
  btnAction: { height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
