// ============================================================
// PATHRIX - Ads Manager (AdMob)
// ============================================================
// Uses react-native-google-mobile-ads v16+
//
// App IDs (configured in app.json plugin):
// Android: ca-app-pub-9218730809381271~3013593648
// iOS:     ca-app-pub-9218730809381271~9644887508

import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Colors } from '../../../core/theme';

// react-native-google-mobile-ads requires a native build — not available in Expo Go
let BannerAd: any = null;
let BannerAdSize: any = null;
let useGoogleInterstitialAd: any = null;
try {
  const ads = require('react-native-google-mobile-ads');
  BannerAd = ads.BannerAd;
  BannerAdSize = ads.BannerAdSize;
  useGoogleInterstitialAd = ads.useInterstitialAd;
} catch {
  // Running in Expo Go — ads disabled
}

// ── Ad Unit IDs ───────────────────────────────────────────────
const AD_UNIT_IDS = {
  bannerHome: Platform.select({
    ios: 'ca-app-pub-9218730809381271/7308061876',
    android: 'ca-app-pub-9218730809381271/2776226822',
  })!,
  bannerGame: Platform.select({
    ios: 'ca-app-pub-9218730809381271/4550036595',
    android: 'ca-app-pub-9218730809381271/2901913006',
  })!,
  interstitial: Platform.select({
    ios: 'ca-app-pub-9218730809381271/5607967399',
    android: 'ca-app-pub-9218730809381271/8234130739',
  })!,
};

// ── Frequency capping: max 1 interstitial every 3 games ──────
let gamesPlayedSinceLastAd = 0;
const MAX_GAMES_BETWEEN_ADS = 3;

export function incrementGameCount() {
  gamesPlayedSinceLastAd++;
}

export function shouldShowInterstitial(): boolean {
  return gamesPlayedSinceLastAd >= MAX_GAMES_BETWEEN_ADS;
}

export function resetAdCounter() {
  gamesPlayedSinceLastAd = 0;
}

// ── Banner Ad Component ───────────────────────────────────────

export const BannerAdWidget: React.FC<{ type: 'home' | 'game' }> = ({ type }) => {
  const [adLoaded, setAdLoaded] = useState(false);
  const unitId = type === 'home' ? AD_UNIT_IDS.bannerHome : AD_UNIT_IDS.bannerGame;

  // Not available in Expo Go
  if (!BannerAd || !BannerAdSize) return null;

  return (
    <View style={[styles.bannerContainer, !adLoaded && styles.bannerHidden]}>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdLoaded={() => setAdLoaded(true)}
        onAdFailedToLoad={() => setAdLoaded(false)}
      />
    </View>
  );
};

// ── Interstitial Ad Hook ──────────────────────────────────────

export function useInterstitialAd() {
  // Not available in Expo Go — return no-op functions
  if (!useGoogleInterstitialAd) {
    return {
      loadAd: () => {},
      showAd: async () => false as boolean,
    };
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { isLoaded, load, show } = useGoogleInterstitialAd(AD_UNIT_IDS.interstitial, {
    requestNonPersonalizedAdsOnly: false,
  });

  const loadAd = () => {
    load();
  };

  const showAd = async (): Promise<boolean> => {
    if (!shouldShowInterstitial()) return false;
    if (!isLoaded) return false;
    try {
      show();
      resetAdCounter();
      return true;
    } catch {
      return false;
    }
  };

  return { loadAd, showAd };
}

const styles = StyleSheet.create({
  bannerContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors?.bgCard || '#2F2F2F',
  },
  bannerHidden: {
    height: 0,
    overflow: 'hidden',
  },
});
