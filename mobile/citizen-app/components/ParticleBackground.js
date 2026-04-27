import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing } from 'react-native';

const { width, height } = Dimensions.get('window');
const PARTICLE_COUNT = 40; // Increased count for better effect

const Particle = ({ color }) => {
  // Random start position
  const position = new Animated.ValueXY({
    x: Math.random() * width,
    y: Math.random() * height
  });

  const opacity = new Animated.Value(Math.random() * 0.5 + 0.3);
  const scale = new Animated.Value(Math.random() * 0.8 + 0.5);

  useEffect(() => {
    const moveParticle = () => {
      const duration = 15000 + Math.random() * 10000; // Slightly faster to be noticeable
      const destX = Math.random() * width;
      const destY = Math.random() * height;

      Animated.parallel([
        Animated.timing(position, {
          toValue: { x: destX, y: destY },
          duration: duration,
          easing: Easing.bezier(0.42, 0, 0.58, 1),
          useNativeDriver: true
        }),
        Animated.sequence([
            Animated.timing(opacity, {
                toValue: Math.random() * 0.3 + 0.2,
                duration: duration / 2,
                useNativeDriver: true
            }),
            Animated.timing(opacity, {
                toValue: Math.random() * 0.5 + 0.3,
                duration: duration / 2,
                useNativeDriver: true
            })
        ])
      ]).start(() => moveParticle());
    };

    moveParticle();
  }, []);

  const size = Math.random() * 8 + 4; // Larger size (4-12px)

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          transform: [
            { translateX: position.x },
            { translateY: position.y },
            { scale: scale }
          ],
          opacity: opacity
        }
      ]}
    />
  );
};

export default function ParticleBackground() {
  const blueColors = ['#0077B6', '#0096C7', '#00B4D8', '#48CAE4', '#90E0EF'];
  const yellowColors = ['#FFD700', '#FFC300'];

  return (
    <View style={styles.container}>
      <View style={styles.gradientOverlay} />
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
        // Even index = Blue, Odd index = Yellow (or vice versa) to ensure 50/50 split
        const isBlue = i % 2 === 0;
        const palette = isBlue ? blueColors : yellowColors;
        const color = palette[Math.floor(Math.random() * palette.length)];
        
        return <Particle key={i} color={color} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f0f4f8', // Slightly darker gray base for contrast
    overflow: 'hidden',
    // zIndex removed to avoid stacking issues
  },
  gradientOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(255,255,255,0.4)', // More transparent overlay to let particles show
  },
  particle: {
    position: 'absolute',
  }
});
