// ============================================================
// PATHRIX - Matchmaking Screen (Firestore-based, no Cloud Functions)
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../../core/theme';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { useI18n } from '../../core/i18n';
import {
  joinMatchmakingQueue,
  leaveMatchmakingQueue,
  findMatchInQueue,
  watchMatchmakingEntry,
} from '../../data/services/FirebaseService';
import { MatchType } from '../../domain/enums';
import { GlassCard, PageHeader } from '../components/ui';

interface MatchmakingScreenProps { navigation: any; route: any; }

const MatchmakingScreen: React.FC<MatchmakingScreenProps> = ({ navigation }) => {
  const { user } = useAuthStore();
  const { startOnlineGame } = useGameStore();
  const { t } = useI18n();
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const radarAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unmounted = useRef(false);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    Animated.loop(
      Animated.timing(radarAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
    ).start();
    timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
    startSearching();
    return () => {
      unmounted.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      unsubRef.current?.();
      if (user) leaveMatchmakingQueue(user.uid).catch(() => {});
    };
  }, []);

  const startSearching = async () => {
    try {
      if (!user) throw new Error('Debes iniciar sesión para jugar online');

      // Join the queue
      await joinMatchmakingQueue(user.uid, user.displayName, user.elo, user.avatarConfig);
      if (unmounted.current) return;

      // Try to match immediately
      const match = await findMatchInQueue(user.uid, user.displayName, user.elo, user.avatarConfig);
      if (unmounted.current) return;

      if (match) {
        await leaveMatchmakingQueue(user.uid).catch(() => {});
        navigateToGame(match.matchId, match.playerCyanId, match.playerOrangeId);
        return;
      }

      // No match found — wait and listen for someone to match us
      unsubRef.current = watchMatchmakingEntry(user.uid, (data) => {
        if (unmounted.current) return;
        if (data.status === 'matched' && data.matchId) {
          unsubRef.current?.();
          // We were matched by another player — we are orange
          const cyanId = data.opponentId ?? data.matchId; // the other player created it
          leaveMatchmakingQueue(user.uid).catch(() => {});
          navigateToGame(data.matchId, data.opponentId ?? user.uid, user.uid);
        }
      });

      // Retry finding a match every 5 seconds
      const retryInterval = setInterval(async () => {
        if (unmounted.current) { clearInterval(retryInterval); return; }
        const m = await findMatchInQueue(user.uid, user.displayName, user.elo, user.avatarConfig).catch(() => null);
        if (!m || unmounted.current) return;
        clearInterval(retryInterval);
        unsubRef.current?.();
        await leaveMatchmakingQueue(user.uid).catch(() => {});
        navigateToGame(m.matchId, m.playerCyanId, m.playerOrangeId);
      }, 5000);

    } catch (err: any) {
      if (!unmounted.current) setError(err.message ?? 'No se pudo buscar partida');
    }
  };

  const navigateToGame = (matchId: string, cyanId: string, orangeId: string) => {
    startOnlineGame(matchId, cyanId, orangeId, MatchType.VS_RANDOM);
    navigation.replace('Game', { matchId, online: true });
  };

  const handleCancel = async () => {
    unmounted.current = true;
    unsubRef.current?.();
    if (user) await leaveMatchmakingQueue(user.uid).catch(() => {});
    navigation.goBack();
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const radarScale = radarAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2] });
  const radarOpacity = radarAnim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0.6, 0.1, 0] });

  return (
    <SafeAreaView style={styles.safeArea}>
      <PageHeader title={t('matchmaking.title')} onBack={handleCancel} />

      <View style={styles.content}>
        {error ? (
          <View style={styles.center}>
            <Ionicons name="alert-circle-outline" size={60} color={Colors.error} />
            <Text style={styles.errorTitle}>{t('matchmaking.error')}</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => { setError(null); setElapsed(0); unmounted.current = false; startSearching(); }}
            >
              <Text style={styles.retryBtnText}>{t('matchmaking.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.radarContainer}>
              {[1, 2, 3].map(i => (
                <Animated.View
                  key={i}
                  style={[styles.radarRing, { transform: [{ scale: radarScale }], opacity: radarOpacity }]}
                />
              ))}
              <GlassCard style={styles.radarCenter}>
                <Ionicons name="search" size={32} color={Colors.orange} />
              </GlassCard>
            </View>

            <Text style={styles.searchingText}>{t('matchmaking.searching')}</Text>
            <Text style={styles.eloText}>{t('matchmaking.elo').replace('{elo}', String(user?.elo ?? '—'))}</Text>
            <Text style={styles.timerText}>{formatTime(elapsed)}</Text>

            <GlassCard style={styles.infoCard}>
              <Text style={styles.infoText}>
                {t('matchmaking.info').replace('{range}', String(elapsed < 30 ? 100 : elapsed < 60 ? 200 : 500))}
              </Text>
            </GlassCard>

            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelBtnText}>{t('matchmaking.cancel')}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  center: { alignItems: 'center', gap: Spacing.md },

  radarContainer: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  radarRing: { position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 0.5, borderColor: Colors.orange },
  radarCenter: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },

  searchingText: { color: Colors.textPrimary, fontSize: Typography.xl, fontWeight: 'bold', marginBottom: Spacing.sm },
  eloText: { color: Colors.textSecondary, fontSize: Typography.md, marginBottom: Spacing.sm },
  timerText: { color: Colors.orange, fontSize: Typography.xxl, fontWeight: 'bold' },

  infoCard: { borderRadius: Radius.lg, padding: Spacing.md, marginTop: Spacing.xl },
  infoText: { color: Colors.textMuted, fontSize: Typography.sm, textAlign: 'center' },

  cancelBtn: { marginTop: Spacing.xl, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: Radius.xl, borderWidth: 0.4, borderColor: 'rgba(255,255,255,0.15)' },
  cancelBtnText: { color: Colors.textSecondary, fontSize: Typography.md },

  errorTitle: { color: Colors.error, fontSize: Typography.xl, fontWeight: 'bold' },
  errorText: { color: Colors.textSecondary, fontSize: Typography.md, textAlign: 'center' },
  retryBtn: { backgroundColor: Colors.orange, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radius.xl, marginTop: Spacing.sm },
  retryBtnText: { color: Colors.textPrimary, fontWeight: 'bold', fontSize: Typography.md },
});

export default MatchmakingScreen;
