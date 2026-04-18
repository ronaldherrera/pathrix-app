// ============================================================
// PATHRIX - App Navigator
// ============================================================

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, AppState } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Colors } from '../theme';
import { useAuthStore } from '../../presentation/store/authStore';
import { useI18n } from '../i18n';
import { setUserStatus, watchUserDocument } from '../../data/services/FirebaseService';

// Screens
import SplashScreen from '../../presentation/screens/SplashScreen';
import HomeScreen from '../../presentation/screens/HomeScreen';
import LoginScreen from '../../presentation/screens/LoginScreen';
import GameScreen from '../../presentation/screens/GameScreen';
import TutorialScreen from '../../presentation/screens/TutorialScreen';
import MatchmakingScreen from '../../presentation/screens/MatchmakingScreen';
import ProfileScreen from '../../presentation/screens/ProfileScreen';
import LeaderboardScreen from '../../presentation/screens/LeaderboardScreen';
import SettingsScreen from '../../presentation/screens/SettingsScreen';
import FriendsScreen from '../../presentation/screens/FriendsScreen';
import FriendChallengeScreen from '../../presentation/screens/FriendChallengeScreen';

const Stack = createStackNavigator();

const PathrixTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.cyan,
    background: Colors.bg,
    card: Colors.bgCard,
    text: Colors.textPrimary,
    border: Colors.border,
    notification: Colors.orange,
  },
};

const AppNavigator: React.FC = () => {
  const { loadPersistedUser, isLoading } = useAuthStore();
  const { loadSavedLang } = useI18n();
  const [showSplash, setShowSplash] = useState(true);

  const { user } = useAuthStore();

  useEffect(() => {
    loadPersistedUser();
    loadSavedLang();
  }, []);

  // Track online/offline status via AppState
  useEffect(() => {
    if (!user?.uid) return;
    setUserStatus(user.uid, 'free');
    const sub = AppState.addEventListener('change', (state) => {
      if (!user?.uid) return;
      setUserStatus(user.uid, state === 'active' ? 'free' : 'offline');
    });
    return () => {
      sub.remove();
      setUserStatus(user.uid, 'offline');
    };
  }, [user?.uid]);

  // Sync user profile in real-time (important for friends list, elo, etc.)
  const { updateProfile } = useAuthStore();
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = watchUserDocument(user.uid, (data) => {
      updateProfile(data);
    });
    return unsub;
  }, [user?.uid]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.cyan} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={PathrixTheme}>
      <Stack.Navigator
        initialRouteName={showSplash ? 'Splash' : 'Home'}
        screenOptions={{ headerShown: false, cardStyle: { backgroundColor: Colors.bg } }}
      >
        <Stack.Screen name="Splash">
          {(props) => (
            <SplashScreen
              onComplete={() => {
                setShowSplash(false);
                props.navigation.replace('Home');
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Game" component={GameScreen} />
        <Stack.Screen name="Tutorial" component={TutorialScreen} />
        <Stack.Screen name="Matchmaking" component={MatchmakingScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Friends" component={FriendsScreen} />
        <Stack.Screen name="FriendChallenge" component={FriendChallengeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AppNavigator;
