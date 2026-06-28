import React, { useState, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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

interface CommitmentButtonProps {
  onComplete: () => void;
  label: string;
  completedLabel?: string;
  subLabel?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  completedIcon?: React.ComponentProps<typeof Ionicons>['name'];
  color?: string;
  duration?: number;
  disabled?: boolean;
  style?: ViewStyle;
}

export function CommitmentButton({
  onComplete,
  label,
  completedLabel = 'Committed!',
  subLabel,
  icon = 'finger-print',
  completedIcon = 'checkmark-sharp',
  color = '#00D68F',
  duration = 2000,
  disabled = false,
  style,
}: CommitmentButtonProps) {
  const colors = useColors();
  const progress = useSharedValue(0);
  const scale = useSharedValue(1);
  const [completed, setCompleted] = useState(false);

  // Reset completion if disabled or if label/triggers change reset state
  useEffect(() => {
    if (disabled) {
      setCompleted(false);
      progress.value = 0;
      scale.value = 1;
    }
  }, [disabled]);

  const triggerTickHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    scale.value = withSpring(0.96, { damping: 15, stiffness: 200 });
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
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
    if (progress.value < 1) {
      progress.value = withTiming(0, { duration: 300 });
    }
  };

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as any,
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const activeColor = disabled ? colors.border : color;
  const textColor = completed ? '#000' : colors.text;

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        commitStyles.button,
        {
          backgroundColor: colors.surfaceHigh,
          borderColor: colors.border,
          shadowColor: activeColor,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <AnimatedReanimated.View style={[commitStyles.buttonAnimated, buttonStyle]}>
        {/* Background Fill */}
        <AnimatedReanimated.View
          style={[
            commitStyles.fill,
            {
              backgroundColor: activeColor,
            },
            fillStyle,
          ]}
        />
        
        {/* Button Content */}
        <View style={commitStyles.content}>
          <Ionicons name={(completed ? completedIcon : icon) as any} size={24} color={completed ? '#000' : activeColor} />
          <View style={commitStyles.textWrap}>
            <Text style={[commitStyles.text, { color: textColor }]}>
              {completed ? completedLabel : label}
            </Text>
            {subLabel && !completed && (
              <Text style={[commitStyles.subtext, { color: colors.textSecondary }]}>
                {subLabel}
              </Text>
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
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    marginVertical: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonAnimated: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 17,
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
  text: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  subtext: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
});
