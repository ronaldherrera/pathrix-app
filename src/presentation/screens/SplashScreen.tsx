// ============================================================
// PATHRIX - Splash Screen
// ============================================================

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image, Dimensions } from 'react-native';
import { Colors, Typography, Spacing } from '../../core/theme';

const AppIconImage = require('../../../assets/icon.png');

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const logoScale   = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const subOpacity  = useRef(new Animated.Value(0)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // Logo entra
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      // Texto del nombre
      Animated.timing(textOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      // Subtítulo
      Animated.timing(subOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      // Footer
      Animated.timing(footerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      // Espera
      Animated.delay(900),
      // Fade out
      Animated.timing(screenOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => onComplete());
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>

      {/* Centro */}
      <View style={styles.centerContent}>

        {/* Icono app — usa el PNG real */}
        <Animated.View style={[styles.iconWrapper, {
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
        }]}>
          <Image
            source={AppIconImage}
            style={styles.iconImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Nombre */}
        <Animated.Text style={[styles.appName, { opacity: textOpacity }]}>
          <Text style={styles.namePath}>PATH</Text>
          <Text style={styles.nameRix}>RIX</Text>
        </Animated.Text>

        {/* Subtítulo */}
        <Animated.Text style={[styles.subtitle, { opacity: subOpacity }]}>
          Path connection strategy
        </Animated.Text>

      </View>

      {/* Footer */}
      <Animated.Text style={[styles.footer, { opacity: footerOpacity }]}>
        Desarrollado por Ronald Herrera con ❤️
      </Animated.Text>

    </Animated.View>
  );
};

// ── App Icon Component ────────────────────────────────────────
export const AppIcon: React.FC<{ size?: number }> = ({ size = 80 }) => {
  const r = size * 0.2;
  const stroke = size * 0.12;
  const half = size / 2;

  return (
    <View style={{
      width: size, height: size,
      backgroundColor: '#1a1a1a',
      borderRadius: r,
      overflow: 'hidden',
      position: 'relative',
      borderWidth: 1,
      borderColor: '#333',
    }}>
      {/* Arco naranja: esquina inferior-izquierda (SW) */}
      <View style={{
        position: 'absolute',
        width: size * 1.0,
        height: size * 1.0,
        borderRadius: size * 0.5,
        bottom: -size * 0.5,
        left: -size * 0.5,
        borderWidth: stroke,
        borderColor: '#A45F34',
        backgroundColor: 'transparent',
      }} />
      {/* Arco blanco: esquina superior-derecha (NE) */}
      <View style={{
        position: 'absolute',
        width: size * 1.0,
        height: size * 1.0,
        borderRadius: size * 0.5,
        top: -size * 0.5,
        right: -size * 0.5,
        borderWidth: stroke,
        borderColor: '#FBFBFB',
        backgroundColor: 'transparent',
      }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 64,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  iconWrapper: {
    marginBottom: 8,
  },
  iconImage: {
    width: 110,
    height: 110,
  },
  appName: {
    fontSize: 48,
    letterSpacing: 3.36,
  },
  namePath: {
    color: '#ffffff',
    fontFamily: 'SairaStencilOne_400Regular',
  },
  nameRix: {
    color: Colors.orange,
    fontFamily: 'SairaStencilOne_400Regular',
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: Typography.sm,
    letterSpacing: 2,
  },
  footer: {
    color: Colors.textMuted,
    fontSize: Typography.xs,
    letterSpacing: 0.5,
  },
});

export default SplashScreen;
