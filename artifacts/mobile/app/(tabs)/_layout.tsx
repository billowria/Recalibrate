import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { Platform, StyleSheet, View, Pressable, useColorScheme } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, interpolate, Extrapolation } from 'react-native-reanimated';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Dashboard</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="program">
        <Icon sf={{ default: "calendar", selected: "calendar.badge.clock" }} />
        <Label>Program</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="track">
        <Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} />
        <Label>Track</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="journal">
        <Icon sf={{ default: "book", selected: "book.fill" }} />
        <Label>Journal</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="friends">
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <Label>Social</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

// ─── Custom Floating Tab Bar ────────────────────────────────────────────────

const TabBarButton = ({
  options,
  onPress,
  onLongPress,
  isFocused,
  routeName,
}: any) => {
  const colors = useColors();
  const animatedValue = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    animatedValue.value = withSpring(isFocused ? 1 : 0, {
      damping: 15,
      stiffness: 150,
      mass: 0.8,
    });
  }, [isFocused]);

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: interpolate(animatedValue.value, [0, 1], [1, 1.15], Extrapolation.CLAMP),
        },
        {
          translateY: interpolate(animatedValue.value, [0, 1], [0, -2], Extrapolation.CLAMP),
        }
      ],
    };
  });

  const animatedLabelStyle = useAnimatedStyle(() => {
    return {
      opacity: animatedValue.value,
      transform: [
        {
          scale: interpolate(animatedValue.value, [0, 1], [0.8, 1], Extrapolation.CLAMP),
        },
        {
          translateY: interpolate(animatedValue.value, [0, 1], [10, 0], Extrapolation.CLAMP),
        }
      ],
    };
  });

  const animatedPillStyle = useAnimatedStyle(() => {
    return {
      opacity: animatedValue.value,
      transform: [
        {
          scale: interpolate(animatedValue.value, [0, 1], [0.8, 1], Extrapolation.CLAMP),
        }
      ]
    };
  });

  let iconName = "";
  if (routeName === "index") iconName = "home";
  else if (routeName === "program") iconName = "calendar";
  else if (routeName === "track") iconName = "bar-chart";
  else if (routeName === "journal") iconName = "book";
  else if (routeName === "profile") iconName = "person";
  else if (routeName === "friends") iconName = "people";

  const tintColor = isFocused ? colors.primaryForeground : colors.textMuted;
  const isIOS = Platform.OS === 'ios';

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabItem}
      hitSlop={10}
    >
      <Animated.View
        style={[
          styles.pillBackground,
          {
            backgroundColor: `${colors.primary}40`, // Primary with 25% opacity for hex (approx) -> using 40 for stronger visibility
            borderColor: `${colors.primary}80`,
            borderWidth: 1,
          },
          animatedPillStyle,
        ]}
      />
      <Animated.View style={animatedIconStyle}>
        {isIOS ? (
          <SymbolView 
            name={
              routeName === "index" ? (isFocused ? "house.fill" : "house") :
              routeName === "program" ? (isFocused ? "calendar.badge.clock" : "calendar") :
              routeName === "track" ? (isFocused ? "chart.bar.fill" : "chart.bar") :
              routeName === "journal" ? (isFocused ? "book.fill" : "book") :
              routeName === "profile" ? (isFocused ? "person.fill" : "person") :
              (isFocused ? "person.2.fill" : "person.2") as any
            }
            tintColor={tintColor} 
            size={22} 
          />
        ) : (
          <Ionicons 
            name={isFocused ? `${iconName}-sharp` as any : `${iconName}-outline` as any} 
            size={22} 
            color={tintColor} 
          />
        )}
      </Animated.View>
      <Animated.View style={[styles.labelContainer, animatedLabelStyle]}>
        <Animated.Text
          style={[styles.labelText, { color: colors.primaryForeground }]}
          numberOfLines={1}
        >
          {options.title}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
};

const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  
  return (
    <View style={[styles.tabBarContainer, { paddingBottom: Platform.OS === 'ios' ? insets.bottom + 12 : 16 }]}>
      <BlurView
        intensity={60}
        tint="dark"
        style={styles.blurView}
      >
        <View style={styles.tabContent}>
          {state.routes.map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                navigation.navigate({ name: route.name, merge: true });
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: "tabLongPress",
                target: route.key,
              });
            };

            return (
              <TabBarButton
                key={route.key}
                options={options}
                onPress={onPress}
                onLongPress={onLongPress}
                isFocused={isFocused}
                routeName={route.name}
              />
            );
          })}
        </View>
      </BlurView>
    </View>
  );
};

// ─── Main Classic Layout ────────────────────────────────────────────────────

function ClassicTabLayout() {
  const colors = useColors();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="program" options={{ title: "Program" }} />
      <Tabs.Screen name="track" options={{ title: "Track" }} />
      <Tabs.Screen name="journal" options={{ title: "Journal" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="friends" options={{ title: "Social" }} />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: "absolute",
    bottom: 0,
    left: 16,
    right: 16,
    zIndex: 100,
    // Subtle drop shadow/glow from below
    shadowColor: "#5B5EFF",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  blurView: {
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
    height: 72,
    backgroundColor: "rgba(10, 10, 20, 0.4)", // Fallback/darkening for BlurView
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  pillBackground: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    top: 0,
    zIndex: -1,
  },
  labelContainer: {
    position: "absolute",
    bottom: -16, // Move below icon 
    width: "150%",
    alignItems: "center",
  },
  labelText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
});
