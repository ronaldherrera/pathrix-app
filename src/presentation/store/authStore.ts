// ============================================================
// PATHRIX - Auth Store (Zustand)
// ============================================================

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlayerRank } from '../../domain/enums';

import { AvatarConfig } from '../components/ProceduralAvatar';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  avatarConfig?: AvatarConfig;
  elo: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  currentStreak: number;
  bestStreak: number;
  friendIds: string[];
  createdAt: number;
  rank: PlayerRank;
  useCustomTileColor?: boolean;
}

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  setUser: (user: UserProfile | null) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  signOut: () => Promise<void>;
  loadPersistedUser: () => Promise<void>;
}

export function eloToRank(elo: number): PlayerRank {
  if (elo < 1100) return PlayerRank.BRONZE;
  if (elo < 1300) return PlayerRank.SILVER;
  if (elo < 1500) return PlayerRank.GOLD;
  if (elo < 1700) return PlayerRank.PLATINUM;
  if (elo < 2000) return PlayerRank.DIAMOND;
  return PlayerRank.MASTER;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => {
    set({ user, isAuthenticated: !!user, isLoading: false });
    if (user) {
      AsyncStorage.setItem('@pathrix_user', JSON.stringify(user));
    } else {
      AsyncStorage.removeItem('@pathrix_user');
    }
  },

  updateProfile: (updates) => {
    const { user } = get();
    if (!user) return;
    const updated = { ...user, ...updates };
    set({ user: updated });
    AsyncStorage.setItem('@pathrix_user', JSON.stringify(updated));
  },

  signOut: async () => {
    await AsyncStorage.removeItem('@pathrix_user');
    set({ user: null, isAuthenticated: false });
  },

  loadPersistedUser: async () => {
    try {
      const stored = await AsyncStorage.getItem('@pathrix_user');
      if (stored) {
        const user = JSON.parse(stored) as UserProfile;
        set({ user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
