/**
 * Programs Tab — Premium Redesign
 * Hold-to-activate, pixel-perfect spacing, micro-interactions
 */

import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Alert,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  PanResponder,
  Modal,
  TextInput,
  Pressable,
  Dimensions,
  Image,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CommitmentButton } from '@/components/CommitmentButton';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  FadeIn,
  FadeInUp,
  FadeOut,
  interpolate,
  Easing,
  runOnJS,
  useAnimatedScrollHandler,
  Extrapolation,
} from 'react-native-reanimated';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { BRAND, FONT, SPACING, RADIUS } from '@/constants/colors';
import { getProgramImage } from '@/constants/program';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ITEM_WIDTH = SCREEN_WIDTH * 0.75;
const SPACING_X = (SCREEN_WIDTH - ITEM_WIDTH) / 2;

const ReanimatedFlatList = Reanimated.createAnimatedComponent(FlatList);
const ReanimatedImage = Reanimated.createAnimatedComponent(Image);

const XP_PER_TASK = 50;

// ─── Task Type Config ──────────────────────────────────────────────────────────
function getTaskTypeConf(task: any, colors: any) {
  const MAP = {
    action:     { color: BRAND.primary,   label: 'Action',  icon: 'flash-outline'         as const },
    reduction:  { color: BRAND.danger,    label: 'Reduce',  icon: 'trending-down-outline' as const },
    reflection: { color: BRAND.warning,   label: 'Reflect', icon: 'bulb-outline'          as const },
  };
  const key = task.type as keyof typeof MAP;
  return MAP[key] ?? MAP.action;
}

// ─── Pulsing Status Dot ────────────────────────────────────────────────────────
function PulsingDot({ color }: { color: string }) {
  const opacity = useSharedValue(1);
  const scale   = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.3, { duration: 900 }), withTiming(1, { duration: 900 })),
      -1, true,
    );
    scale.value = withRepeat(
      withSequence(withTiming(1.4, { duration: 900 }), withTiming(1, { duration: 900 })),
      -1, true,
    );
  }, []);
  const st = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
  return (
    <Reanimated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }, st]} />
  );
}

// ─── Swiss Action Components ──────────────────────────────────────────────────
function SwissActionPill({ title, icon, onPress, colors, gradientColors }: any) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.96, { damping: 12, stiffness: 200 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 200 }); }}
      onPress={onPress}
      style={{ flex: 1 }}
    >
      <Reanimated.View style={[styles.swissPill, { backgroundColor: colors.surfaceHigh, borderColor: colors.border }, animStyle]}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.swissPillContent}>
          <Ionicons name={icon} size={16} color="#fff" style={styles.swissPillIcon} />
          <Text style={styles.swissPillText}>{title}</Text>
        </View>
      </Reanimated.View>
    </Pressable>
  );
}

function ProgramCapsule({ program, isEnrolled, progress, onPress, colors, pickerOpen }: any) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (isEnrolled) {
      glow.value = withRepeat(withTiming(0.15, { duration: 1500, easing: Easing.inOut(Easing.ease) }), -1, true);
    } else {
      glow.value = 0;
    }
  }, [isEnrolled]);

  useEffect(() => {
    rotation.value = pickerOpen ? 180 : 0;
  }, [pickerOpen]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${withSpring(rotation.value, { damping: 14 })}deg` }]
  }));

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 250 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 250 }); }}
      onPress={onPress}
    >
      <Reanimated.View style={[styles.capsuleContainer, { backgroundColor: colors.surfaceHigh, borderColor: pickerOpen ? program?.color : colors.border }, animStyle]}>
        <Reanimated.View style={[StyleSheet.absoluteFillObject, styles.capsuleGlow, { backgroundColor: program?.color }, glowStyle]} />
        
        <View style={styles.capsuleInner}>
          <View style={styles.capsuleEmojiWrapper}>
            <Text style={styles.capsuleEmoji}>{program?.emoji ?? '📋'}</Text>
          </View>
          <View style={styles.capsuleTextCol}>
            <Text style={[styles.capsuleLabel, { color: colors.textSecondary }]}>ACTIVE PROGRAM</Text>
            <Text style={[styles.capsuleTitle, { color: colors.text }]} numberOfLines={1}>{program?.title ?? 'Select Program'}</Text>
          </View>
          <View style={styles.capsuleRight}>
            {isEnrolled && progress && (
              <View style={[styles.capsuleBadge, { backgroundColor: `${program?.color}20` }]}>
                <Text style={[styles.capsuleBadgeText, { color: program?.color }]}>W{progress.currentWeek}</Text>
              </View>
            )}
            <Reanimated.View style={chevronStyle}>
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
            </Reanimated.View>
          </View>
        </View>
      </Reanimated.View>
    </Pressable>
  );
}

// ─── Program Selector Modal ────────────────────────────────────────────────────
interface ProgramPickerModalProps {
  visible: boolean;
  onClose: () => void;
  programs: any[];
  activeProgramIds: string[];
  selectedId: string;
  onSelect: (id: string) => void;
  onToggleActive: (id: string) => Promise<void>;
  colors: any;
}

function ProgramCarouselBackdrop({ program, index, scrollX }: any) {
  const style = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollX.value,
      [(index - 1) * ITEM_WIDTH, index * ITEM_WIDTH, (index + 1) * ITEM_WIDTH],
      [0, 1, 0],
      Extrapolation.CLAMP
    );
    return { opacity };
  });
  return (
    <ReanimatedImage
      source={{ uri: program.imageUrl || getProgramImage(program.id) }}
      style={[StyleSheet.absoluteFillObject, style]}
      blurRadius={20}
    />
  );
}

export function parseProgramDescription(desc: string) {
  if (!desc || !desc.startsWith('{')) return { text: desc };
  try {
    const parsed = JSON.parse(desc);
    return {
      text: parsed.text || desc,
      identityStatement: parsed.identityStatement || undefined,
      stakes: parsed.stakes || undefined,
      gatingThreshold: parsed.gatingThreshold || undefined,
    };
  } catch {
    return { text: desc };
  }
}

function ProgramCarouselCard({ item, index, scrollX, isActive, isSelected, onSelect, onClose, onToggleActive, colors }: any) {
  const style = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * ITEM_WIDTH, index * ITEM_WIDTH, (index + 1) * ITEM_WIDTH];
    const scale = interpolate(scrollX.value, inputRange, [0.85, 1, 0.85], Extrapolation.CLAMP);
    const rotateZ = interpolate(scrollX.value, inputRange, [5, 0, -5], Extrapolation.CLAMP);
    const translateY = interpolate(scrollX.value, inputRange, [60, 0, 60], Extrapolation.CLAMP);
    
    return {
      transform: [
        { translateY },
        { scale },
        { rotateZ: `${rotateZ}deg` }
      ],
    };
  });

  const parsedDesc = parseProgramDescription(item.description);

  return (
    <Reanimated.View style={[{ width: ITEM_WIDTH, height: SCREEN_HEIGHT * 0.55 }, style]}>
      <View style={{ flex: 1, borderRadius: 28, overflow: 'hidden', backgroundColor: colors.card, marginHorizontal: 8, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
        <Image 
          source={{ uri: item.imageUrl || getProgramImage(item.id) }} 
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
        <LinearGradient 
          colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.92)']} 
          style={StyleSheet.absoluteFillObject} 
        />
        
        <View style={{ flex: 1, padding: 24, justifyContent: 'space-between', zIndex: 2 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 36 }}>{item.emoji}</Text>
            {isActive && (
              <View style={{ backgroundColor: '#10b98125', borderWidth: 1, borderColor: '#10b98160', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: '#10b981', letterSpacing: 0.5 }}>ACTIVE</Text>
              </View>
            )}
          </View>
          
          <View style={{ flex: 1, justifyContent: 'flex-end', marginBottom: 16 }}>
            <Text style={{ fontSize: 24, fontFamily: 'Inter_700Bold', color: '#fff', lineHeight: 28, letterSpacing: -0.5 }} numberOfLines={2}>{item.title}</Text>
            
            {parsedDesc.identityStatement ? (
              <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', fontStyle: 'italic', color: 'rgba(255,255,255,0.7)', marginTop: 8, lineHeight: 18 }} numberOfLines={2}>
                "{parsedDesc.identityStatement}"
              </Text>
            ) : (
              <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)', marginTop: 8, lineHeight: 18 }} numberOfLines={2}>
                {parsedDesc.text}
              </Text>
            )}
          </View>
          
          {/* Actions Row */}
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <TouchableOpacity
              style={{ flex: 1, height: 48, borderRadius: 24, backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isSelected ? '#fff' : 'rgba(255,255,255,0.2)' }}
              onPress={() => {
                onSelect(item.id);
                onClose();
              }}
            >
              <Text style={{ color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>{isSelected ? 'Viewing' : 'Details'}</Text>
            </TouchableOpacity>
            
            <View style={{ flex: 1.2 }}>
              <CommitmentButton
                key={`${item.id}-${isActive}`}
                onComplete={async () => { await onToggleActive(item.id); }}
                label={isActive ? "Pause" : "Activate"}
                color={isActive ? BRAND.danger : item.color}
                icon={isActive ? "pause" : "rocket"}
                duration={1000}
                style={{ height: 48, paddingHorizontal: 0, paddingVertical: 0, marginVertical: 0, borderRadius: 24 }}
              />
            </View>
          </View>
        </View>
      </View>
    </Reanimated.View>
  );
}

function ProgramPickerModal({
  visible,
  onClose,
  programs,
  activeProgramIds,
  selectedId,
  onSelect,
  onToggleActive,
  colors,
}: ProgramPickerModalProps) {
  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
  });

  const initialIndex = programs.findIndex(p => p.id === selectedId);
  const startIdx = initialIndex >= 0 ? initialIndex : 0;

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {/* Dynamic Backdrops */}
        {programs.map((p, index) => (
          <ProgramCarouselBackdrop key={`bg-${p.id}`} program={p} index={index} scrollX={scrollX} />
        ))}
        {/* Dark overlay for text readability */}
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />

        {/* Top Header */}
        <View style={{ position: 'absolute', top: Platform.OS === 'web' ? 40 : 60, width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, zIndex: 10 }}>
          <Text style={{ color: '#fff', fontSize: 20, fontFamily: 'Inter_700Bold' }}>Select Program</Text>
          <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Horizontal FlatList */}
        <ReanimatedFlatList
          data={programs}
          keyExtractor={(item: any) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={ITEM_WIDTH}
          decelerationRate="fast"
          bounces={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingHorizontal: SPACING_X, alignItems: 'center', justifyContent: 'center', height: '100%' }}
          initialScrollIndex={startIdx}
          getItemLayout={(_, index) => ({ length: ITEM_WIDTH, offset: ITEM_WIDTH * index, index })}
          renderItem={({ item, index }: any) => {
            const isActive = activeProgramIds.includes(item.id);
            const isSelected = item.id === selectedId;
            return (
              <ProgramCarouselCard 
                item={item} 
                index={index} 
                scrollX={scrollX}
                isActive={isActive} 
                isSelected={isSelected} 
                onSelect={onSelect} 
                onClose={onClose} 
                onToggleActive={onToggleActive} 
                colors={colors}
              />
            );
          }}
        />
      </View>
    </Modal>
  );
}

// Removed old ProgramItem as it is no longer needed since cards are inlined in the Carousel

// ─── Task Item Row ─────────────────────────────────────────────────────────────
function TaskItem({
  task, weekNum, programId, isComplete, isEnrolled, isActiveWeek, onToggle, colors, programColor,
}: any) {
  const scale   = useSharedValue(1);
  const bounce  = useSharedValue(1);

  const handlePress = useCallback(() => {
    if (!isEnrolled || !isActiveWeek) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    scale.value = withSequence(
      withSpring(0.93, { damping: 10, stiffness: 300 }),
      withSpring(1,    { damping: 12, stiffness: 250 }),
    );
    onToggle(weekNum, task.id);
  }, [isEnrolled, isActiveWeek, weekNum, task.id, onToggle]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const typeConf = getTaskTypeConf(task, colors);

  return (
    <Reanimated.View style={animStyle}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.75}
        style={[
          styles.taskCard,
          {
            backgroundColor: isComplete
              ? `${BRAND.success}0C`
              : colors.surfaceHigh,
            borderColor: isComplete
              ? `${BRAND.success}25`
              : colors.border,
          }
        ]}
      >
        {/* Check circle */}
        <View style={[
          styles.taskCheck,
          {
            backgroundColor: isComplete ? BRAND.success : 'transparent',
            borderColor:      isComplete ? BRAND.success : colors.border,
          }
        ]}>
          {isComplete && (
            <Ionicons name="checkmark" size={12} color="#fff" />
          )}
        </View>

        {/* Content */}
        <View style={styles.taskContent}>
          <Text
            style={[
              styles.taskTitle,
              {
                color: isComplete ? colors.textMuted : colors.text,
                textDecorationLine: isComplete ? 'line-through' : 'none',
              }
            ]}
            numberOfLines={2}
          >
            {task.title}
          </Text>
          {!!task.description && (
            <Text style={[styles.taskDesc, { color: colors.textSecondary }]} numberOfLines={2}>
              {task.description}
            </Text>
          )}
          {task.isPersistent && (
            <View style={[styles.persistPill, { backgroundColor: `${programColor}12` }]}>
              <Ionicons name="repeat" size={9} color={programColor} />
              <Text style={[styles.persistText, { color: programColor }]}>Daily Requirement</Text>
            </View>
          )}
        </View>

        {/* Right meta */}
        <View style={styles.taskMeta}>
          <View style={[styles.typePill, { backgroundColor: `${typeConf.color}15` }]}>
            <Ionicons name={typeConf.icon} size={9} color={typeConf.color} />
            <Text style={[styles.typePillText, { color: typeConf.color }]}>{typeConf.label}</Text>
          </View>
          <Text style={[styles.xpLabel, { color: isComplete ? BRAND.success : colors.textMuted }]}>
            +{XP_PER_TASK} XP
          </Text>
        </View>
      </TouchableOpacity>
    </Reanimated.View>
  );
}

// ─── Week Pill ─────────────────────────────────────────────────────────────────
function WeekPill({
  week, status, isSelected, programColor, onPress, colors,
}: any) {
  const scale = useSharedValue(1);
  const handlePress = useCallback(() => {
    // Allows tapping locked weeks to preview contents when not enrolled
    scale.value = withSequence(
      withSpring(0.9, { damping: 10 }),
      withSpring(1,   { damping: 14 }),
    );
    onPress(week.weekNumber);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [week.weekNumber, onPress]);

  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const isActive   = status === 'active';
  const isComplete = status === 'complete';
  const isLocked   = status === 'locked';

  let border = colors.border;
  let bg     = colors.surfaceMid;
  let numCol = colors.textSecondary;

  if (isSelected)  { border = programColor; bg = `${programColor}14`; numCol = programColor; }
  if (isComplete && !isSelected) { border = `${BRAND.success}35`; bg = `${BRAND.success}08`; numCol = BRAND.success; }

  return (
    <Reanimated.View style={anim}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        style={[
          styles.weekPill,
          { borderColor: border, backgroundColor: bg, opacity: isLocked ? 0.45 : 1 }
        ]}
      >
        <View style={styles.weekPillTop}>
          {isLocked ? (
            <Ionicons name="lock-closed" size={10} color={colors.textMuted} />
          ) : isComplete ? (
            <Ionicons name="checkmark-circle" size={11} color={BRAND.success} />
          ) : isActive ? (
            <View style={[styles.activeDot, { backgroundColor: programColor }]} />
          ) : (
            <View style={[styles.activeDot, { backgroundColor: colors.textMuted }]} />
          )}
          <Text style={[styles.weekPillNum, { color: numCol }]}>WK {week.weekNumber}</Text>
        </View>
        <Text style={[styles.weekPillTheme, { color: isSelected ? colors.text : colors.textSecondary }]} numberOfLines={2}>
          {week.theme}
        </Text>
      </TouchableOpacity>
    </Reanimated.View>
  );
}

// ─── Gauge Bar ─────────────────────────────────────────────────────────────────
function GaugeBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const met = value >= max;
  return (
    <View style={styles.gaugeRow}>
      <View style={styles.gaugeLabelRow}>
        <Text style={styles.gaugeLabel}>{label}</Text>
        <Text style={[styles.gaugeValue, { color: met ? BRAND.success : '#A0A0CC' }]}>
          {value}/{max}
        </Text>
      </View>
      <View style={styles.gaugeTrack}>
        <View style={[styles.gaugeFill, { width: `${pct * 100}%` as any, backgroundColor: met ? BRAND.success : color }]} />
      </View>
    </View>
  );
}

// ─── Section Label ─────────────────────────────────────────────────────────────
function SectionLabel({ children, color }: { children: string; color: string }) {
  return (
    <Text style={[styles.sectionLabel, { color }]}>{children}</Text>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function ProgramScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    profile, toggleWeekTask, isWeekTaskComplete,
    totalXP, currentLevel, currentStreak,
    availablePrograms, enrollProgram, unenrollProgram, toggleSavedProgram,
    advanceProgramWeek, restartProgramWeek,
    getWeekGatingStatus, getProgramProgress,
    addXP, deleteCustomProgram, publishProgram,
  } = useApp();

  const savedPrograms = useMemo(() => {
    return availablePrograms.filter(p => profile.savedProgramIds?.includes(p.id) || profile.activeProgramIds.includes(p.id));
  }, [availablePrograms, profile.savedProgramIds, profile.activeProgramIds]);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const [selectedId, setSelectedId]   = useState<string>(
    profile.activeProgramIds[0] ?? ''
  );
  const [activeWeek, setActiveWeek]   = useState<number>(1);
  const [pickerOpen, setPickerOpen]   = useState(false);

  const selectedProgram = availablePrograms.find(p => p.id === selectedId);
  const parsedHeroDesc = selectedProgram ? parseProgramDescription(selectedProgram.description) : null;
  const progress        = getProgramProgress(selectedId);
  const isEnrolled      = profile.activeProgramIds.includes(selectedId);
  const gating          = isEnrolled ? getWeekGatingStatus(selectedId) : null;
  const programColor    = (selectedProgram?.color as string) ?? BRAND.primary;
  const activeWeekData  = selectedProgram?.weeks[activeWeek - 1];

  // Sync active week tab when switching programs
  useEffect(() => {
    setActiveWeek(progress?.currentWeek ?? 1);
  }, [selectedId]);

  // Auto-select valid program from saved/active list if selectedId is not valid
  useEffect(() => {
    const isValid = savedPrograms.some(p => p.id === selectedId);
    if (!isValid) {
      if (profile.activeProgramIds.length > 0) {
        setSelectedId(profile.activeProgramIds[0]);
      } else if (savedPrograms.length > 0) {
        setSelectedId(savedPrograms[0].id);
      } else {
        setSelectedId('');
      }
    }
  }, [profile.activeProgramIds, savedPrograms, selectedId]);

  // Chevron animation
  const chevron = useSharedValue(0);
  useEffect(() => {
    chevron.value = withSpring(pickerOpen ? 180 : 0, { damping: 14, stiffness: 150 });
  }, [pickerOpen]);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevron.value}deg` }],
  }));

  const getWeekStatus = useCallback((n: number): 'active' | 'complete' | 'locked' => {
    if (!progress) return 'locked';
    if (progress.completedWeeks.includes(n)) return 'complete';
    if (n === progress.currentWeek) return 'active';
    if (n < progress.currentWeek) return 'complete';
    return 'locked';
  }, [progress]);

  const getWeekXP = useCallback((weekNum: number) => {
    const week = selectedProgram?.weeks[weekNum - 1];
    if (!week) return { earned: 0, total: 0 };
    const earned = week.tasks.filter(t => isWeekTaskComplete(weekNum, t.id, selectedId)).length * XP_PER_TASK;
    const total  = week.tasks.length * XP_PER_TASK;
    return { earned, total };
  }, [selectedProgram, selectedId, isWeekTaskComplete]);

  const overallPct = useMemo(() => {
    if (!selectedProgram || !progress) return 0;
    return Math.round((progress.completedWeeks.length / selectedProgram.totalWeeks) * 100);
  }, [selectedProgram, progress]);

  const handleTaskToggle = useCallback((weekNum: number, taskId: string) => {
    if (!isEnrolled) return;
    const weekStatus = getWeekStatus(weekNum);
    if (weekStatus !== 'active') {
      Alert.alert('Inactive Week', 'You can only check tasks for your current active week.');
      return;
    }
    const wasComplete = isWeekTaskComplete(weekNum, taskId, selectedId);
    toggleWeekTask(weekNum, taskId, selectedId);
    if (!wasComplete) {
      addXP(XP_PER_TASK);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [isEnrolled, selectedId, getWeekStatus, isWeekTaskComplete, toggleWeekTask, addXP]);

  const handleAdvanceWeek = async () => {
    if (!gating?.canAdvance) {
      Alert.alert(
        'Requirements Not Met',
        `To advance:\n• ${gating?.weekPassThreshold ?? 5} days tracked (${gating?.daysTracked ?? 0})\n• 1 journal entry (${gating?.daysJournaled ?? 0})\n• 50%+ tasks done (${gating?.tasksCompleted ?? 0}/${gating?.totalTasks ?? 0})`,
        [{ text: 'Got it' }]
      );
      return;
    }
    await advanceProgramWeek(selectedId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleRestart = () => {
    Alert.alert(
      'Restart Week?',
      'This clears task checkboxes and resets your 7-day window. Logs and journals are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restart', style: 'destructive',
          onPress: async () => {
            await restartProgramWeek(selectedId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  };

  const { earned: wkEarned, total: wkTotal } = getWeekXP(activeWeek);
  const activeWeekStatus = getWeekStatus(activeWeek);

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.container, { paddingTop: topPadding + 20, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Ambient gradient blob */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.blob, { backgroundColor: `${programColor}0A` }]} />
      </View>

      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Programs</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            {profile.activeProgramIds.length} active · {availablePrograms.length} total
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/calendar')}
          style={[styles.iconBtn, { backgroundColor: colors.surfaceHigh, borderColor: colors.border }]}
          activeOpacity={0.75}
        >
          <Ionicons name="calendar-outline" size={19} color={programColor} />
        </TouchableOpacity>
      </View>

      {/* ── Quick Actions ───────────────────────────────────────── */}
      {/* ── Swiss Action Deck ───────────────────────────────────────── */}
      <Reanimated.View entering={FadeInUp.duration(600).delay(100).springify()} style={styles.swissActionDeck}>
        <ProgramCapsule 
          program={selectedProgram}
          isEnrolled={isEnrolled}
          progress={progress}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPickerOpen(true); }}
          colors={colors}
          pickerOpen={pickerOpen}
        />
        
        <View style={styles.swissPillRow}>
          <SwissActionPill 
            title="Create Custom"
            icon="hammer"
            gradientColors={[`${BRAND.primary}E6`, `${BRAND.primary}99`]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/program-builder'); }}
            colors={colors}
          />
          <SwissActionPill 
            title="Explore Library"
            icon="planet"
            gradientColors={[`${BRAND.success}E6`, `${BRAND.success}99`]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/program-discover'); }}
            colors={colors}
          />
        </View>
      </Reanimated.View>

      {selectedProgram && (
        <>
          {/* ── Program Hero Card ─────────────────────────────────── */}
          <View style={[styles.heroCard, { backgroundColor: colors.surfaceHigh, borderColor: `${programColor}28` }]}>
            {/* Top row */}
            <View style={styles.heroTop}>
              <View style={[styles.heroEmoji, { backgroundColor: `${programColor}14` }]}>
                <Text style={{ fontSize: 28 }}>{selectedProgram.emoji}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 14, gap: 3 }}>
                <Text style={[styles.heroProgramLabel, { color: colors.textMuted }]}>
                  {selectedProgram.isSystem ? 'SYSTEM PROGRAM' : 'CUSTOM PROGRAM'}
                </Text>
                <Text style={[styles.heroTitle, { color: colors.text }]} numberOfLines={2}>
                  {selectedProgram.title}
                </Text>
                {isEnrolled && progress && (
                  <View style={styles.heroProgressRow}>
                    <View style={[styles.heroProgressTrack, { backgroundColor: colors.border }]}>
                      <View style={[styles.heroProgressFill, {
                        width: `${overallPct}%` as any,
                        backgroundColor: programColor,
                      }]} />
                    </View>
                    <Text style={[styles.heroProgressLabel, { color: programColor }]}>{overallPct}%</Text>
                  </View>
                )}
              </View>
              {isEnrolled && progress && (
                <View style={[styles.levelBadge, { backgroundColor: `${programColor}14`, borderColor: `${programColor}30` }]}>
                  <Text style={[styles.levelBadgeText, { color: programColor }]}>WK {progress.currentWeek}</Text>
                  <Text style={[styles.levelBadgeOf, { color: colors.textSecondary }]}>of {selectedProgram.totalWeeks}</Text>
                </View>
              )}
            </View>

            {parsedHeroDesc?.identityStatement ? (
              <View style={{ marginVertical: 16, padding: 16, backgroundColor: colors.background, borderRadius: 12, borderLeftWidth: 3, borderLeftColor: programColor }}>
                <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: colors.textSecondary, letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' }}>The Vision</Text>
                <Text style={{ fontSize: 15, fontFamily: 'Inter_400Regular', fontStyle: 'italic', color: colors.text, lineHeight: 22 }}>
                  "{parsedHeroDesc.identityStatement}"
                </Text>
              </View>
            ) : (
              <Text style={[styles.heroDesc, { color: colors.textSecondary }]} numberOfLines={3}>
                {parsedHeroDesc?.text}
              </Text>
            )}

            {parsedHeroDesc?.stakes ? (
              <View style={{ marginBottom: 16, padding: 12, backgroundColor: `${BRAND.danger}15`, borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: `${BRAND.danger}30` }}>
                <Ionicons name="warning" size={16} color={BRAND.danger} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: BRAND.danger, letterSpacing: 1, marginBottom: 2, textTransform: 'uppercase' }}>The Stakes</Text>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: BRAND.danger }}>{parsedHeroDesc.stakes}</Text>
                </View>
              </View>
            ) : null}

            {/* Stats row */}
            {isEnrolled && (
              <View style={[styles.statsRow, { borderColor: colors.border }]}>
                <View style={styles.statItem}>
                  <Text style={[styles.statNum, { color: colors.text }]}>{totalXP}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total XP</Text>
                </View>
                <View style={[styles.statDiv, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statNum, { color: colors.text }]}>🔥 {currentStreak}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Streak</Text>
                </View>
                <View style={[styles.statDiv, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statNum, { color: colors.text }]}>{progress?.completedWeeks.length ?? 0}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Weeks Done</Text>
                </View>
              </View>
            )}

            {/* Management Buttons Row (Compact UI inside Hero Card) */}
            {!selectedProgram.isSystem && (
              <View style={styles.heroMgmtRow}>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/program-builder', params: { id: selectedProgram.id } })}
                  style={[styles.heroMgmtBtn, { backgroundColor: colors.surfaceMid, borderColor: colors.border }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil" size={13} color={colors.textSecondary} />
                  <Text style={[styles.heroMgmtBtnText, { color: colors.text }]}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={async () => {
                    Alert.alert(
                      selectedProgram.isPublished ? 'Unpublish?' : 'Publish to Community?',
                      selectedProgram.isPublished
                        ? 'Remove this from the public library?'
                        : 'Share this program with the community?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: selectedProgram.isPublished ? 'Unpublish' : 'Publish',
                          onPress: async () => {
                            await publishProgram(selectedProgram.id, !selectedProgram.isPublished);
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          },
                        },
                      ]
                    );
                  }}
                  style={[styles.heroMgmtBtn, { backgroundColor: colors.surfaceMid, borderColor: colors.border }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name={selectedProgram.isPublished ? 'eye-off' : 'share-social'} size={13} color={colors.textSecondary} />
                  <Text style={[styles.heroMgmtBtnText, { color: colors.text }]}>
                    {selectedProgram.isPublished ? 'Unpublish' : 'Share'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      'Delete Program?',
                      'This permanently removes this custom program. This cannot be undone.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete', style: 'destructive',
                          onPress: async () => {
                            const id = selectedProgram.id;
                            setSelectedId('dopamine-detox-protocol');
                            await deleteCustomProgram(id);
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                          },
                        },
                      ]
                    );
                  }}
                  style={[styles.heroMgmtBtn, { backgroundColor: `${BRAND.danger}10`, borderColor: `${BRAND.danger}20` }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash" size={13} color={BRAND.danger} />
                  <Text style={[styles.heroMgmtBtnText, { color: BRAND.danger }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ── Hold to Activate / Pause Program ─────────────────── */}
          <CommitmentButton
            onComplete={async () => {
              if (isEnrolled) {
                await unenrollProgram(selectedId);
              } else {
                await enrollProgram(selectedId);
              }
            }}
            label={isEnrolled ? "Hold to Pause Program" : "Hold to Activate Program"}
            completedLabel={isEnrolled ? "Paused!" : "Activated!"}
            color={isEnrolled ? BRAND.danger : programColor}
            icon={isEnrolled ? "pause" : "rocket"}
            duration={1500}
            key={`${selectedId}-${isEnrolled}`}
          />

          {/* ── Week Timeline ─────────────────────────────────────── */}
          {!isEnrolled && (
            <View style={[styles.enrollHint, { backgroundColor: colors.surfaceHigh, borderColor: `${programColor}25`, marginTop: 4, marginBottom: 12 }]}>
              <Text style={[styles.enrollHintText, { color: colors.textSecondary }]}>
                Hold the button above to activate this program and start tracking your progress.
              </Text>
            </View>
          )}

          <SectionLabel color={colors.textMuted}>WEEK TIMELINE</SectionLabel>
          <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.weekScroll}
              >
                {selectedProgram.weeks.map(w => (
                  <WeekPill
                    key={w.weekNumber}
                    week={w}
                    status={getWeekStatus(w.weekNumber)}
                    isSelected={activeWeek === w.weekNumber}
                    programColor={programColor}
                    onPress={setActiveWeek}
                    colors={colors}
                  />
                ))}
              </ScrollView>

              {/* ── Current Focus Card ──────────────────────────────── */}
              {activeWeekData && (
                <View style={[styles.focusCard, { backgroundColor: colors.surfaceHigh, borderColor: `${activeWeek === progress?.currentWeek ? programColor : colors.border}30` }]}>
                  {/* Week badge + status */}
                  <View style={styles.focusBadgeRow}>
                    <View style={[styles.focusWeekBadge, { backgroundColor: activeWeek === progress?.currentWeek ? programColor : colors.surfaceMid }]}>
                      <Text style={[styles.focusWeekBadgeText, { color: activeWeek === progress?.currentWeek ? '#fff' : colors.text }]}>
                        Week {activeWeek}
                      </Text>
                    </View>
                    <Text style={[
                      styles.focusStatusText,
                      {
                        color: activeWeekStatus === 'complete' ? BRAND.success :
                               activeWeekStatus === 'active'   ? programColor :
                               colors.textMuted,
                      }
                    ]}>
                      {activeWeekStatus === 'complete' ? '✓ Completed' :
                       activeWeekStatus === 'active'   ? 'Current Focus' :
                       '🔒 Locked'}
                    </Text>
                  </View>

                  <Text style={[styles.focusTheme, { color: colors.text }]}>{activeWeekData.theme}</Text>

                  {/* Goal */}
                  <View style={[styles.infoBlock, { backgroundColor: colors.surfaceMid }]}>
                    <Text style={[styles.infoBlockLabel, { color: colors.textMuted }]}>🎯 GOAL</Text>
                    <Text style={[styles.infoBlockText, { color: colors.text }]}>{activeWeekData.goal}</Text>
                  </View>

                  {/* Rationale */}
                  <View style={[styles.infoBlock, { backgroundColor: `${programColor}08`, borderLeftWidth: 2.5, borderLeftColor: programColor }]}>
                    <View style={styles.rationaleHeader}>
                      <Ionicons name="flask-outline" size={12} color={programColor} />
                      <Text style={[styles.infoBlockLabel, { color: programColor, marginLeft: 5 }]}>BEHAVIORAL RATIONALE</Text>
                    </View>
                    <Text style={[styles.infoBlockText, { color: colors.textSecondary }]}>{activeWeekData.psychologyRationale}</Text>
                  </View>

                  {/* Compliance gauges */}
                  {activeWeekStatus === 'active' && gating && (
                    <View style={[styles.complianceBlock, { backgroundColor: colors.surfaceMid }]}>
                      <Text style={[styles.infoBlockLabel, { color: colors.textMuted, marginBottom: 10 }]}>WEEK PASS REQUIREMENTS</Text>
                      <GaugeBar label="Days logged"  value={gating.daysTracked}   max={gating.weekPassThreshold} color={programColor} />
                      <GaugeBar label="Journal done" value={gating.daysJournaled} max={1}                        color={programColor} />
                      <GaugeBar label="Tasks done"   value={gating.tasksCompleted} max={gating.totalTasks}       color={programColor} />
                    </View>
                  )}

                  {/* Journal prompt quick action */}
                  {(activeWeekData as any).dailyJournalPrompt && activeWeekStatus === 'active' && (
                    <TouchableOpacity
                      style={[styles.journalPrompt, { backgroundColor: colors.surfaceMid, borderColor: colors.border }]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/(tabs)/journal'); }}
                      activeOpacity={0.75}
                    >
                      <View style={styles.journalPromptLeft}>
                        <Ionicons name="book-outline" size={16} color={BRAND.primary} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.journalPromptLabel, { color: colors.textSecondary }]}>TODAY'S JOURNAL PROMPT</Text>
                          <Text style={[styles.journalPromptText, { color: colors.text }]} numberOfLines={2}>
                            {(activeWeekData as any).dailyJournalPrompt}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}

                  {/* Task checklist */}
                  <View>
                    <View style={styles.taskHeadRow}>
                      <SectionLabel color={colors.textMuted}>WEEKLY TASKS</SectionLabel>
                      <Text style={[styles.xpTally, { color: programColor }]}>
                        {wkEarned} / {wkTotal} XP
                      </Text>
                    </View>
                    <View style={styles.taskList}>
                      {activeWeekData.tasks.map(task => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          weekNum={activeWeek}
                          programId={selectedId}
                          isComplete={isWeekTaskComplete(activeWeek, task.id, selectedId)}
                          isEnrolled={isEnrolled}
                          isActiveWeek={activeWeekStatus === 'active'}
                          onToggle={handleTaskToggle}
                          colors={colors}
                          programColor={programColor}
                        />
                      ))}
                    </View>
                  </View>

                  {/* Week complete celebration */}
                  {activeWeekStatus === 'complete' && (
                    <View style={[styles.weekCompleteBar, { backgroundColor: `${BRAND.success}10`, borderColor: `${BRAND.success}20` }]}>
                      <Ionicons name="trophy" size={18} color={BRAND.success} />
                      <Text style={[styles.weekCompleteText, { color: BRAND.success }]}>
                        Week {activeWeek} complete · +{wkTotal} XP earned
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* ── Advance / Restart Controls ───────────────────────── */}
              {progress && (
                <View style={styles.controlsBlock}>
                  {gating?.canAdvance && progress.currentWeek < selectedProgram.totalWeeks ? (
                    <TouchableOpacity onPress={handleAdvanceWeek} activeOpacity={0.85} style={{ borderRadius: RADIUS.button }}>
                      <LinearGradient
                        colors={[BRAND.success, BRAND.successLight]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={styles.advanceBtn}
                      >
                        <Ionicons name="trophy-outline" size={17} color="#fff" />
                        <Text style={styles.advanceBtnText}>Advance to Week {progress.currentWeek + 1}</Text>
                        <Ionicons name="arrow-forward" size={15} color="#ffffffCC" />
                      </LinearGradient>
                    </TouchableOpacity>
                  ) : !gating?.canAdvance ? (
                    <View style={[styles.lockedAdvance, { backgroundColor: colors.surfaceHigh, borderColor: colors.border }]}>
                      <Ionicons name="lock-closed-outline" size={15} color={colors.textMuted} />
                      <Text style={[styles.lockedAdvanceText, { color: colors.textMuted }]}>
                        Meet requirements to advance week
                      </Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    onPress={handleRestart}
                    style={[styles.secondaryBtn, { backgroundColor: colors.surfaceHigh, borderColor: colors.border }]}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>Restart Week</Text>
                  </TouchableOpacity>
                </View>
              )}


        </>
      )}

      {!selectedProgram && (
        <View style={{ backgroundColor: colors.surfaceHigh, borderColor: colors.border, borderWidth: 1, padding: 24, borderRadius: 20, alignItems: 'center', marginTop: 20 }}>
          <Ionicons name="compass-outline" size={40} color={colors.textMuted} style={{ marginBottom: 12 }} />
          <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.text, marginBottom: 6 }}>No Active Programs</Text>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.textSecondary, textAlign: 'center', marginBottom: 20 }}>
            You haven't activated any programs yet. Explore the community library or create your own custom program to start tracking your progress.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/program-discover')}
            style={{ backgroundColor: BRAND.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 }}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 14 }}>Explore Programs</Text>
          </TouchableOpacity>
        </View>
      )}

      <ProgramPickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        programs={savedPrograms}
        activeProgramIds={profile.activeProgramIds}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onToggleActive={async (id) => {
          if (profile.activeProgramIds.includes(id)) {
            await unenrollProgram(id);
          } else {
            await enrollProgram(id);
          }
        }}
        colors={colors}
      />
    </ScrollView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:     { flex: 1 },
  container:  { paddingHorizontal: 20, gap: 14 },

  // Ambient blob
  blob: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.6,
  },

  // Header
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  headerTitle: { fontSize: 26, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  headerSub:   { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  iconBtn:     { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  // ── Swiss Action Deck ─────────────────────────────────────────
  swissActionDeck: { gap: 12, marginBottom: 16 },
  
  capsuleContainer: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
  capsuleGlow: { opacity: 0.15 },
  capsuleInner: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14 },
  capsuleEmojiWrapper: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  capsuleEmoji: { fontSize: 22 },
  capsuleTextCol: { flex: 1, gap: 3 },
  capsuleLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.5, textTransform: 'uppercase' },
  capsuleTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', letterSpacing: -0.3 },
  capsuleRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  capsuleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  capsuleBadgeText: { fontSize: 12, fontFamily: 'Inter_700Bold' },

  swissPillRow: { flexDirection: 'row', gap: 12 },
  swissPill: { flex: 1, borderRadius: 16, overflow: 'hidden', borderWidth: 1, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 8 },
  swissPillContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  swissPillIcon: { opacity: 0.9 },
  swissPillText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold', letterSpacing: -0.2, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },

  // Dropdown
  dropdownCard: { borderRadius: 18, borderWidth: 1, padding: 10, gap: 2 },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: 11, borderRadius: 12, gap: 12,
    borderLeftWidth: 3,
  },
  dropdownEmoji: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dropdownName:  { fontSize: 13, letterSpacing: -0.1 },
  dropdownMeta:  { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 1 },
  enrollBadge:   { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  divider:       { height: 1, marginVertical: 8 },
  sectionLabel:  { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 2, paddingHorizontal: 2 },

  // Hero card
  heroCard: { borderRadius: 22, borderWidth: 1.5, padding: 18, gap: 12 },
  heroTop:  { flexDirection: 'row', alignItems: 'flex-start' },
  heroEmoji: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  heroProgramLabel: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1.5 },
  heroTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', letterSpacing: -0.3, lineHeight: 23 },
  heroProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  heroProgressTrack: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  heroProgressFill:  { height: 4, borderRadius: 2 },
  heroProgressLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', width: 30 },
  levelBadge: {
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 14, borderWidth: 1, marginLeft: 12, flexShrink: 0,
  },
  levelBadgeText: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  levelBadgeOf:   { fontSize: 9, fontFamily: 'Inter_400Regular', marginTop: 1 },
  heroDesc:        { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 14, marginTop: 2 },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statNum:  { fontSize: 19, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  statDiv:   { width: 1, height: 28, alignSelf: 'center' },
  heroMgmtRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  heroMgmtBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  heroMgmtBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },

  // Hold button
  holdBtn: {
    borderRadius: RADIUS.button + 2,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  holdBtnInner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingVertical: 14,
  },
  holdBtnLabel: { fontSize: 14, fontFamily: 'Inter_700Bold', letterSpacing: -0.2 },
  holdBtnSub:   { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 },

  // Week timeline
  weekScroll: { gap: 8, paddingBottom: 2, paddingHorizontal: 2 },
  weekPill: { width: 120, padding: 12, borderRadius: 16, borderWidth: 1.5, gap: 7 },
  weekPillTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  activeDot:   { width: 6, height: 6, borderRadius: 3 },
  weekPillNum: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  weekPillTheme: { fontSize: 11, fontFamily: 'Inter_500Medium', lineHeight: 16 },

  // Focus card
  focusCard: { borderRadius: 22, borderWidth: 1.5, padding: 18, gap: 14 },
  focusBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  focusWeekBadge: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 10 },
  focusWeekBadgeText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  focusStatusText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  focusTheme: { fontSize: 20, fontFamily: 'Inter_700Bold', letterSpacing: -0.4, lineHeight: 26 },

  // Info blocks
  infoBlock: { padding: 12, borderRadius: 14, gap: 5 },
  infoBlockLabel: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1.5 },
  infoBlockText:  { fontSize: 13, fontFamily: 'Inter_500Medium', lineHeight: 20 },
  rationaleHeader: { flexDirection: 'row', alignItems: 'center' },

  // Compliance
  complianceBlock: { padding: 14, borderRadius: 14, gap: 10 },
  gaugeRow:       { gap: 5 },
  gaugeLabelRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gaugeLabel:     { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#A0A0CC' },
  gaugeValue:     { fontSize: 11, fontFamily: 'Inter_700Bold' },
  gaugeTrack:     { height: 5, borderRadius: 3, backgroundColor: '#1C1C2E', overflow: 'hidden' },
  gaugeFill:      { height: 5, borderRadius: 3 },

  // Journal prompt
  journalPrompt: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  journalPromptLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 },
  journalPromptLabel: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1.5, marginBottom: 3 },
  journalPromptText:  { fontSize: 13, fontFamily: 'Inter_500Medium', lineHeight: 19, fontStyle: 'italic' },

  // Task list
  taskHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  xpTally: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  taskList: { gap: 8 },
  taskCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 12, borderRadius: 14, borderWidth: 1, gap: 10,
  },
  taskCheck: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  taskContent: { flex: 1, gap: 3 },
  taskTitle:   { fontSize: 13, fontFamily: 'Inter_600SemiBold', lineHeight: 19 },
  taskDesc:    { fontSize: 11, fontFamily: 'Inter_400Regular', lineHeight: 16 },
  persistPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 8, marginTop: 3,
  },
  persistText: { fontSize: 9, fontFamily: 'Inter_600SemiBold' },
  taskMeta:    { alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  typePill:    { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 7 },
  typePillText: { fontSize: 9, fontFamily: 'Inter_700Bold' },
  xpLabel:    { fontSize: 10, fontFamily: 'Inter_700Bold' },

  // Week complete
  weekCompleteBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 13, borderRadius: 12, borderWidth: 1,
  },
  weekCompleteText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', flex: 1 },

  // Controls
  controlsBlock: { gap: 10 },
  advanceBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: RADIUS.button,
  },
  advanceBtnText: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#fff', flex: 1, textAlign: 'center' },
  lockedAdvance: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13, borderRadius: RADIUS.button, borderWidth: 1,
  },
  lockedAdvanceText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: RADIUS.button, borderWidth: 1,
  },
  secondaryBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  // Enroll hint
  enrollHint: { padding: 18, borderRadius: 16, borderWidth: 1.5 },
  enrollHintText: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20, textAlign: 'center' },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '75%',
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    padding: 0,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 8,
    gap: 12,
  },
  emojiBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 18,
  },
  name: {
    fontSize: 14,
  },
  desc: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  meta: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
  },
  activeBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
});
