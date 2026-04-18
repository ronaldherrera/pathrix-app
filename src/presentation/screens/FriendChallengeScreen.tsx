// ============================================================
// PATHRIX - Friend Challenge Screen
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../../core/theme';
import { useAuthStore, eloToRank } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { useI18n } from '../../core/i18n';
import {
  createFriendChallengeWithMatch,
  watchChallengeStatus,
  watchFriendsList,
  getRecentOpponentIds,
} from '../../data/services/FirebaseService';
import { GlassCard, glassStyle, PageHeader } from '../components/ui';
import { MatchType } from '../../domain/enums';

interface FriendChallengeScreenProps { navigation: any; route: any; }

type Phase = 'list' | 'waiting' | 'declined';

const FriendChallengeScreen: React.FC<FriendChallengeScreenProps> = ({ navigation, route }) => {
  const { user } = useAuthStore();
  const { startOnlineGame } = useGameStore();
  const { t } = useI18n();

  const preselectedFriend = route?.params?.friend ?? null;

  const [friends, setFriends] = useState<any[]>([]);
  const [recentOpponents, setRecentOpponents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'recent'>('friends');
  const [phase, setPhase] = useState<Phase>('list');
  const [challengedFriend, setChallengedFriend] = useState<any>(null);
  const [matchId, setMatchId] = useState<string | null>(null);

  const radarAnim = useRef(new Animated.Value(0)).current;
  const unsubRef = useRef<(() => void) | null>(null);
  const unmounted = useRef(false);

  useEffect(() => {
    if (!user || user.friendIds.length === 0) {
      setLoading(false);
      return;
    }
    const unsub = watchFriendsList(user.friendIds, (list) => {
      setFriends(list);
      setLoading(false);
    });
    unsubRef.current = unsub;
    return () => { unmounted.current = true; unsubRef.current?.(); };
  }, [user?.friendIds]);

  // Load recent opponents when tab changes (with real-time status)
  useEffect(() => {
    let unsub: (() => void) | null = null;
    
    if (activeTab === 'recent' && user) {
      setLoadingRecent(true);
      
      // 1. Get the IDs of recent opponents
      getRecentOpponentIds(user.uid)
        .then(ids => {
          if (unmounted.current) return;
          
          if (ids.length === 0) {
            setRecentOpponents([]);
            setLoadingRecent(false);
            return;
          }

          // 2. Start watching their profiles in real-time
          unsub = watchFriendsList(ids, (list) => {
            if (!unmounted.current) {
              setRecentOpponents(list);
              setLoadingRecent(false);
            }
          });
        })
        .catch(err => {
          console.error('[FriendChallenge] Error loading recent:', err);
          if (!unmounted.current) setLoadingRecent(false);
        });
    }

    return () => {
      if (unsub) unsub();
    };
  }, [activeTab, user?.uid]);

  // Auto-challenge pre-selected friend once loading is done
  const autoChallengeFired = useRef(false);
  useEffect(() => {
    if (!loading && preselectedFriend && !autoChallengeFired.current) {
      autoChallengeFired.current = true;
      handleChallenge(preselectedFriend);
    }
  }, [loading]);

  useEffect(() => {
    if (phase === 'waiting') {
      Animated.loop(
        Animated.timing(radarAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ).start();
    } else {
      radarAnim.stopAnimation();
      radarAnim.setValue(0);
    }
  }, [phase]);

  const handleChallenge = async (friend: any) => {
    if (!user) return;
    setChallengedFriend(friend);
    setPhase('waiting');

    try {
      const { matchId: mid, challengeId } = await createFriendChallengeWithMatch(
        user.uid, user.displayName, friend.id, friend.displayName, user.avatarConfig
      );
      setMatchId(mid);

      // Watch challenge status
      unsubRef.current = watchChallengeStatus(challengeId, (data) => {
        if (unmounted.current) return;
        if (data.status === 'accepted') {
          unsubRef.current?.();
          startOnlineGame(mid, user.uid, friend.id, MatchType.VS_FRIEND);
          navigation.replace('Game', { matchId: mid, online: true });
        } else if (data.status === 'declined') {
          unsubRef.current?.();
          setPhase('declined');
        }
      });
    } catch {
      setPhase('list');
    }
  };

  const handleCancel = () => {
    unsubRef.current?.();
    setPhase('list');
    setChallengedFriend(null);
    setMatchId(null);
  };

  const radarScale = radarAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2.2] });
  const radarOpacity = radarAnim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0.5, 0.05, 0] });

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <PageHeader title="Challenge Friend" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={styles.emptyText}>Sign in to challenge friends</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Waiting phase ───────────────────────────────────────────
  if (phase === 'waiting' || phase === 'declined') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <PageHeader title="Challenge Friend" onBack={handleCancel} />
        <View style={styles.center}>
          {phase === 'declined' ? (
            <>
              <Ionicons name="close-circle-outline" size={72} color={Colors.error} />
              <Text style={styles.waitTitle}>{challengedFriend?.displayName} declined</Text>
              <Text style={styles.waitSub}>Better luck next time!</Text>
              <TouchableOpacity style={styles.backBtn} onPress={handleCancel}>
                <Text style={styles.backBtnText}>Back to Friends</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.radarWrap}>
                {[1, 2, 3].map(i => (
                  <Animated.View
                    key={i}
                    style={[styles.radarRing, { transform: [{ scale: radarScale }], opacity: radarOpacity }]}
                  />
                ))}
                <GlassCard style={styles.radarCenter}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarInitial}>
                      {challengedFriend?.displayName?.charAt(0)?.toUpperCase()}
                    </Text>
                  </View>
                </GlassCard>
              </View>

              <Text style={styles.waitTitle}>Waiting for {challengedFriend?.displayName}…</Text>
              <Text style={styles.waitSub}>Challenge sent — they need to accept.</Text>

              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ── Friends list phase ──────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <PageHeader title={t('challenge.title')} onBack={() => navigation.goBack()} />

      {/* ── Tabs ───────────────────────────────────────────── */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'friends' && styles.tabActive]} 
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
            {t('challenge.tabs.friends')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'recent' && styles.tabActive]} 
          onPress={() => setActiveTab('recent')}
        >
          <Text style={[styles.tabText, activeTab === 'recent' && styles.tabTextActive]}>
            {t('challenge.tabs.recent')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: '#000000' }}
      >
        {activeTab === 'friends' ? (
          loading ? (
            <ActivityIndicator color={Colors.cyan} style={{ marginTop: 40 }} />
          ) : friends.filter(f => f.status !== 'offline').length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="wifi-outline" size={64} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No friends online.</Text>
              <Text style={styles.emptySub}>Wait for a friend to connect or find new ones.</Text>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => navigation.navigate('Friends')}
              >
                <Text style={styles.backBtnText}>Find Friends</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.sectionLabel}>{t('challenge.select')}</Text>
              {friends
                .filter(friend => friend.status !== 'offline')
                .map(friend => (
                  <FriendCard
                    key={friend.id}
                    friend={friend}
                    t={t}
                    onChallenge={() => handleChallenge(friend)}
                  />
                ))}
            </>
          )
        ) : (
          /* Recent Opponents Tab */
          loadingRecent ? (
            <ActivityIndicator color={Colors.cyan} style={{ marginTop: 40 }} />
          ) : recentOpponents.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="time-outline" size={64} color={Colors.textMuted} />
              <Text style={styles.emptyText}>{t('challenge.noRecent')}</Text>
              <Text style={styles.emptySub}>Play random matches to find opponents.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionLabel}>{t('challenge.recentAvailable')}</Text>
              {recentOpponents.map(rival => (
                <FriendCard
                  key={rival.id}
                  friend={rival}
                  t={t}
                  onChallenge={() => navigation.navigate('Profile', { userId: rival.id })}
                  isRecent
                />
              ))}
            </>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Friend card ───────────────────────────────────────────────

const FriendCard: React.FC<{ 
  friend: any; 
  t: any; 
  onChallenge: () => void;
  isRecent?: boolean;
}> = ({ friend, t, onChallenge, isRecent }) => {
  const rank = eloToRank(friend.elo ?? 1200);
  const rankColors: Record<string, string> = {
    Bronze: Colors.rankBronze, Silver: Colors.rankSilver, Gold: Colors.rankGold,
    Platinum: Colors.rankPlatinum, Diamond: Colors.rankDiamond, Master: Colors.rankMaster,
  };
  const rc = rankColors[rank] ?? Colors.textPrimary;

  const isPlaying = friend.status === 'playing';
  const isOffline = friend.status === 'offline';

  const getStatusColor = () => {
    if (isPlaying) return Colors.orange;
    if (isOffline) return Colors.textMuted;
    return Colors.success;
  };

  const getStatusText = () => {
    if (isPlaying) return t('friends.status.playing').toLowerCase();
    if (isOffline) return t('friends.status.offline').toLowerCase();
    return t('friends.status.free').toLowerCase();
  };

  return (
    <GlassCard style={cardStyles.card}>
      <View style={cardStyles.left}>
        <View style={cardStyles.avatar}>
          <Text style={cardStyles.avatarInitial}>{friend.displayName?.charAt(0)?.toUpperCase()}</Text>
          <View style={[cardStyles.statusDot, { backgroundColor: getStatusColor() }]} />
        </View>
        <View>
          <Text style={cardStyles.name}>{friend.displayName}</Text>
          <Text style={[cardStyles.rank, { color: rc }]}>{rank} · {friend.elo ?? 1200} ELO</Text>
          <Text style={[cardStyles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
      </View>
      <TouchableOpacity 
        style={[
          cardStyles.challengeBtn, 
          isPlaying && !isRecent && cardStyles.challengeBtnDisabled,
          isRecent && { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }
        ]} 
        onPress={onChallenge} 
        activeOpacity={0.8}
        disabled={isPlaying && !isRecent}
      >
        <Ionicons name={isRecent ? "eye-outline" : "flash"} size={16} color={isRecent ? Colors.textSecondary : "#000"} />
        <Text style={[cardStyles.challengeBtnText, isRecent && { color: Colors.textSecondary }]}>
          {isRecent ? t('game.viewProfile') : t('challenge.btn')}
        </Text>
      </TouchableOpacity>
    </GlassCard>
  );
};

const cardStyles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: Radius.xl, padding: Spacing.md, marginBottom: Spacing.sm },
  left: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: Colors.textPrimary, fontSize: Typography.xl, fontWeight: 'bold' },
  statusDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#1a1a1a' },
  name: { color: Colors.textPrimary, fontSize: Typography.md, fontWeight: '600' },
  rank: { fontSize: Typography.xs, marginTop: 2 },
  statusText: { fontSize: 10, fontWeight: 'bold', marginTop: 1 },
  challengeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.orange, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: 8 },
  challengeBtnDisabled: { opacity: 0.5, backgroundColor: Colors.textMuted },
  challengeBtnText: { color: '#000', fontWeight: 'bold', fontSize: Typography.sm },
});

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000' },
  scrollContent: { padding: Spacing.lg, paddingBottom: 48, flexGrow: 1 },
  sectionLabel: { color: Colors.textMuted, fontSize: Typography.xs, fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: Spacing.md },

  emptyText: { color: Colors.textSecondary, fontSize: Typography.lg, textAlign: 'center' },
  emptySub: { color: Colors.textMuted, fontSize: Typography.sm },

  // Tabs
  tabContainer: { 
    flexDirection: 'row', 
    marginHorizontal: Spacing.lg, 
    marginTop: Spacing.md, 
    borderRadius: Radius.lg, 
    backgroundColor: 'rgba(255,255,255,0.04)', 
    padding: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  tab: { 
    flex: 1, 
    paddingVertical: 10, 
    alignItems: 'center', 
    borderRadius: Radius.md 
  },
  tabActive: { 
    backgroundColor: 'rgba(255,255,255,0.08)', 
    shadowColor: '#fff', 
    shadowOpacity: 0.1, 
    shadowRadius: 4 
  },
  tabText: { color: Colors.textMuted, fontSize: Typography.sm, fontWeight: '600' },
  tabTextActive: { color: Colors.textPrimary },

  center: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: Spacing.md,
    paddingBottom: 60 // Un pequeño margen para que no parezca demasiado bajo debido a las pestañas superiores
  },

  radarWrap: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  radarRing: { position: 'absolute', width: 130, height: 130, borderRadius: 65, borderWidth: 0.5, borderColor: Colors.orange },
  radarCenter: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  avatarCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: Colors.textPrimary, fontSize: Typography.xxl, fontWeight: 'bold' },

  waitTitle: { color: Colors.textPrimary, fontSize: Typography.xl, fontWeight: 'bold', textAlign: 'center' },
  waitSub: { color: Colors.textMuted, fontSize: Typography.md, textAlign: 'center' },

  backBtn: { backgroundColor: Colors.orange, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radius.xl, marginTop: Spacing.sm },
  backBtnText: { color: Colors.textPrimary, fontWeight: 'bold', fontSize: Typography.md },

  cancelBtn: { marginTop: Spacing.xl, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: Radius.xl, ...glassStyle },
  cancelBtnText: { color: Colors.textSecondary, fontSize: Typography.md },
});

export default FriendChallengeScreen;
