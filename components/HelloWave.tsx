import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { primary } from "@/shared/colors";

export function HelloWave() {
  const rotationAnimation = useSharedValue(0);

  useEffect(() => {
    // Start animation after component mounts
    rotationAnimation.value = withRepeat(
      withSequence(
        withTiming(25, { duration: 150, easing: Easing.ease }),
        withTiming(0, { duration: 150, easing: Easing.ease })
      ),
      4 // Run the animation 4 times
    );

    // Cleanup function
    return () => {
      // Cancel animation if component unmounts
      rotationAnimation.value = 0;
    };
  }, [rotationAnimation]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotationAnimation.value}deg` }],
    };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <ThemedText style={styles.text} color={primary}>
        👋
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Add container styles if needed
  },
  text: {
    fontSize: 28,
    lineHeight: 32,
    marginTop: -6,
  },
});
