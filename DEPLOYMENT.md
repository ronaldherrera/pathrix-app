# Pathrix - Deployment Guide

## Overview

Pathrix is a cross-platform mobile game (iOS + Android) built with Expo (React Native),
Firebase backend, and AdMob monetization.

---

## Prerequisites

- Node.js 20+
- Expo CLI: `npm install -g expo-cli eas-cli`
- Firebase CLI: `npm install -g firebase-tools`
- Apple Developer Account (for iOS App Store)
- Google Play Developer Account (for Android Play Store)
- Google AdMob Account (for ads)

---

## Step 1: Firebase Setup

### 1.1 Create Firebase Project
1. Go to https://console.firebase.google.com
2. Create a new project called "pathrix"
3. Enable **Authentication** (Email/Password provider)
4. Enable **Firestore** (production mode)
5. Enable **Cloud Functions**
6. Enable **Firebase Analytics**

### 1.2 Configure Firebase in the app
1. In Firebase Console → Project Settings → Add Web App
2. Copy the config object
3. Replace the placeholder in `src/data/services/FirebaseService.ts`:

```typescript
const firebaseConfig = {
  apiKey: 'YOUR_ACTUAL_API_KEY',
  authDomain: 'your-project.firebaseapp.com',
  // ... rest of config
};
```

### 1.3 Deploy Firestore Rules & Indexes
```bash
firebase login
firebase use --add  # select your project
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### 1.4 Deploy Cloud Functions
```bash
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions
```

---

## Step 2: AdMob Setup

### 2.1 Create AdMob Account
1. Go to https://admob.google.com
2. Add your app (iOS and Android separately)
3. Create ad units:
   - **Banner Ad** (for HomeScreen bottom)
   - **Interstitial Ad** (for post-game)

### 2.2 Install AdMob package
```bash
npx expo install react-native-google-mobile-ads
```

### 2.3 Configure Ad Unit IDs
Update `src/presentation/components/ads/AdsManager.tsx`:
```typescript
const AD_UNIT_IDS = {
  banner: Platform.select({
    ios: 'ca-app-pub-XXXXXXXX/XXXXXXXX',    // Your iOS banner ID
    android: 'ca-app-pub-XXXXXXXX/XXXXXXXX', // Your Android banner ID
  }),
  interstitial: Platform.select({
    ios: 'ca-app-pub-XXXXXXXX/XXXXXXXX',
    android: 'ca-app-pub-XXXXXXXX/XXXXXXXX',
  }),
};
```

### 2.4 Update app.json with real AdMob App IDs
```json
{
  "ios": {
    "config": {
      "googleMobileAdsAppId": "ca-app-pub-XXXXXXXX~XXXXXXXX"
    }
  },
  "android": {
    "config": {
      "googleMobileAdsAppId": "ca-app-pub-XXXXXXXX~XXXXXXXX"
    }
  }
}
```

---

## Step 3: EAS Build Setup

### 3.1 Configure EAS
```bash
eas login
eas build:configure
```

### 3.2 Create `eas.json`
```json
{
  "cli": { "version": ">= 7.8.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## Step 4: Build for Production

### Android (APK/AAB for Play Store)
```bash
eas build --platform android --profile production
```

### iOS (IPA for App Store)
```bash
eas build --platform ios --profile production
```

---

## Step 5: App Store Submission

### Google Play Store
1. Create app in Google Play Console
2. Complete Data Safety form (required):
   - Data collected: Name, Email, User IDs, Gameplay data
   - Data shared: Advertising data (AdMob)
3. Set content rating: Everyone
4. Upload AAB from EAS build
5. Add store listing: screenshots, description, icon
6. Submit for review

### Apple App Store
1. Create app in App Store Connect
2. Set Age Rating: 4+
3. Configure Privacy Nutrition Labels:
   - Data Used to Track: Advertising Data
   - Data Linked to You: Email, Name, Gameplay Data
4. Upload IPA via Xcode or Transporter
5. Add screenshots (6.7", 5.5" iPhones, iPad if supported)
6. Submit for review

---

## Step 6: App Store Description

**English:**
> **Pathrix** is an elegant path-connection strategy game for two players. Place tiles to create
> colorful paths, form closed loops, or connect opposite edges of the board to win.
>
> **Game Modes:**
> • vs Bot — Challenge our AI at 4 difficulty levels
> • Random Match — ELO-based online matchmaking
> • Friend Challenge — Invite anyone from your contacts
>
> **Features:**
> • Clean, minimalist dark UI
> • Real-time online multiplayer
> • ELO rating system with 6 rank tiers
> • In-game chat
> • Interactive tutorial
> • Fully offline vs Bot mode

**Keywords:** strategy, board game, puzzle, path, connection, multiplayer, online

---

## Copyright Notice

Pathrix is an original strategy game featuring path-connection mechanics.
The game was designed independently and is not affiliated with, endorsed by,
or connected to any existing board game products.
The tile-connection mechanic is a general game mechanism not subject to copyright protection.
All visual designs, branding, naming, and implementation are original works.

---

## Running Locally (Development)

```bash
cd pathrix-app
npm install
npx expo start

# iOS (requires macOS + Xcode)
npx expo run:ios

# Android (requires Android Studio + emulator)
npx expo run:android
```

---

## Project Structure

```
pathrix-app/
├── src/
│   ├── core/             # Theme, navigation, constants
│   ├── domain/           # Entities, enums (game data types)
│   ├── game-engine/      # Game logic (placement, AI, win detection)
│   ├── data/             # Firebase services, repositories
│   └── presentation/     # Screens, components, Zustand stores
├── functions/            # Firebase Cloud Functions (TypeScript)
├── assets/               # Images, sounds, animations
├── app.json              # Expo configuration
├── firebase.json         # Firebase configuration
├── firestore.rules       # Firestore security rules
└── firestore.indexes.json
```
