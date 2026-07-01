import React, { useState, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedReanimated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  runOnJS,
  withTiming,
  withSpring,
  Easing as ReanimatedEasing,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import { SoftText } from './SoftText';

interface CommitmentButtonProps {
  onComplete: () => void;
  label: string;
  completedLabel?: string;
  subLabel?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  completedIcon?: React.ComponentProps<typeof Ionicons>['name'];
  color?: string;
  gradient?: readonly [string, string, ...string[]];
  duration?: number;
  disabled?: boolean;
  style?: ViewStyle;
}

const { width } = Dimensions.get('window');

export function CommitmentButton({
  onComplete,
  label,
  completedLabel = 'Committed!',
  subLabel,
  icon = 'finger-print',
  completedIcon = 'checkmark-sharp',
  color,
  gradient,
  duration = 2000,
  disabled = false,
  style,
}: CommitmentButtonProps) {
  const colors = useColors();
  const progress = useSharedValue(0);
  const scale = useSharedValue(1);
  const [completed, setCompleted] = useState(false);

  const activeColor = disabled ? colors.border : (color || colors.brand.success);
  const activeGradient = disabled 
    ? [colors.border, colors.border] as [string, string, ...string[]] 
    : (gradient || [colors.brand.successLight, colors.brand.success] as [string, string, ...string[]]);

  useEffect(() => {
    if (disabled) {
      setCompleted(false);
      progress.value = 0;
      scale.value = 1;
    }
  }, [disabled]);

  const triggerTickHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid); // Stronger tick
  };

  const triggerSuccessHaptic = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  useAnimatedReaction(
    () => progress.value,
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
    if (disabled || completed) return;
    // Deeper scaling for a softer, more responsive feel
    scale.value = withSpring(0.92, { damping: 15, stiffness: 250 });
    progress.value = withTiming(1, { duration, easing: ReanimatedEasing.bezier(0.25, 1, 0.5, 1) }, (finished) => {
      if (finished) {
        runOnJS(triggerSuccessHaptic)();
        runOnJS(setCompleted)(true);
        runOnJS(onComplete)();
      }
    });
  };

  const handlePressOut = () => {
    if (disabled || completed) return;
    scale.value = withSpring(1, { damping: 12, stiffness: 150 }); // Bouncier return
    if (progress.value < 1) {
      progress.value = withTiming(0, { duration: 250 });
    }
  };

  const fillWrapperStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as any,
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const textColor = completed ? '#FFFFFF' : colors.text;
  const shadowStyle = colors.isDark ? colors.shadows.softDark : colors.shadows.softLight;

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        commitStyles.button,
        {
          backgroundColor: colors.surface, // Use soft white/dark card base
          borderColor: colors.borderSubtle,
          opacity: disabled ? 0.5 : 1,
        },
        shadowStyle,
        style,
      ]}
    >
      <AnimatedReanimated.View style={[commitStyles.buttonAnimated, buttonStyle]}>
        {/* Background Fill - Animated Wrapper with Gradient inside */}
        <AnimatedReanimated.View
          style={[commitStyles.fillWrapper, fillWrapperStyle]}
        >
          <LinearGradient
            colors={activeGradient}
            start={[0, 0]}
            end={[1, 1]}
            style={{ width: width - colors.spacing.lg * 2, height: '100%' }} // Fixed gradient width so it doesn't squish
          />
        </AnimatedReanimated.View>
        
        {/* Button Content */}
        <View style={commitStyles.content}>
          <Ionicons name={(completed ? completedIcon : icon) as any} size={24} color={completed ? '#FFFFFF' : activeColor} />
          <View style={commitStyles.textWrap}>
            <SoftText semiBold style={{ color: textColor }}>
              {completed ? completedLabel : label}
            </SoftText>
            {subLabel && !completed && (
              <SoftText caption muted style={{ marginTop: 2 }}>
                {subLabel}
              </SoftText>
            )}
          </View>
        </View>
      </AnimatedReanimated.View>
    </Pressable>
  );
}

const commitStyles = StyleSheet.create({
  button: {
    width: '100%',
    height: 64,
    borderRadius: 20, // Soft UI rounded
    borderWidth: 1,
    justifyContent: 'center',
    marginVertical: 10,
  },
  buttonAnimated: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    borderRadius: 20,
    overflow: 'hidden',
  },
  fillWrapper: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    zIndex: 2,
    paddingHorizontal: 16,
  },
  textWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
