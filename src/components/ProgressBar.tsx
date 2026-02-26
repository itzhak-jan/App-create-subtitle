import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

type Props = {
  progress: number; // 0-100
  color?: string;
  height?: number;
  backgroundColor?: string;
  animated?: boolean;
};

export default function ProgressBar({
  progress,
  color = '#e94560',
  height = 8,
  backgroundColor = '#16213e',
  animated = true,
}: Props) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const clampedProgress = Math.max(0, Math.min(100, progress));

    if (animated) {
      Animated.timing(widthAnim, {
        toValue: clampedProgress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      widthAnim.setValue(clampedProgress);
    }
  }, [progress, animated, widthAnim]);

  const widthInterpolated = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, { height, backgroundColor }]}>
      <Animated.View
        style={[
          styles.fill,
          {
            width: widthInterpolated,
            backgroundColor: color,
            height,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 100,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    borderRadius: 100,
  },
});
