// ============================================================
// PATHRIX - App Entry Point
// ============================================================

import React, { useEffect } from 'react';
import { StyleSheet, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, SairaStencilOne_400Regular } from '@expo-google-fonts/saira-stencil-one';
import { SofiaSans_400Regular } from '@expo-google-fonts/sofia-sans';
let mobileAds: (() => { initialize: () => Promise<void> }) | null = null;
try {
  mobileAds = require('react-native-google-mobile-ads').default;
} catch {
  // Running in Expo Go — AdMob not available
}
import AppNavigator from './src/core/navigation/AppNavigator';

export default function App() {
  const [fontsLoaded] = useFonts({ SairaStencilOne_400Regular, SofiaSans_400Regular });

  useEffect(() => {
    const initAds = async () => {
      // iOS 14+ — request App Tracking Transparency permission
      if (Platform.OS === 'ios') {
        try {
          const { requestTrackingPermissionsAsync } = await import('expo-tracking-transparency');
          await requestTrackingPermissionsAsync();
        } catch {
          // expo-tracking-transparency not installed — continue without ATT
        }
      }
      // Initialize AdMob SDK (not available in Expo Go)
      if (mobileAds) await mobileAds().initialize();
    };

    initAds();
  }, []);

  if (!fontsLoaded) return (
    <View style={{ flex: 1, backgroundColor: '#000000' }} />
  );

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
