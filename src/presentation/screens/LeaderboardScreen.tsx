// ============================================================
// PATHRIX - Leaderboard Screen
// ============================================================

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../../core/theme';
import { PlayerRank } from '../../domain/enums';
import { getLeaderboard } from '../../data/services/FirebaseService';
import { useAuthStore, eloToRank } from '../store/authStore';
import { GlassCard, glassStyle, PageHeader } from '../components/ui';
import { ProceduralAvatar, AvatarConfig } from '../components/ProceduralAvatar';

interface LeaderboardEntry {
  uid: string;
  displayName: string;
  elo: number;
  gamesPlayed: number;
  winRate: number;
  rank: PlayerRank;
  avatarConfig?: AvatarConfig;
}
type Period = 'allTime' | 'monthly' | 'weekly';

const RANK_COLORS: Record<number, string> = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };

function getRankColor(rank: string): string {
  const map: Record<string, string> = {
    Bronze: Colors.rankBronze, Silver: Colors.rankSilver, Gold: Colors.rankGold,
    Platinum: Colors.rankPlatinum, Diamond: Colors.rankDiamond, Master: Colors.rankMaster,
  };
  return map[rank] ?? Colors.textSecondary;
}

interface LeaderboardScreenProps { navigation: any; }

const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ navigation }) => {
  const { user } = useAuthStore();
  const [period, setPeriod] = useState<Period>('allTime');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadLeaderboard(period); }, [period]);

  const loadLeaderboard = async (p: Period) => {
    setLoading(true);
    try {
      const raw = await getLeaderboard(p);
      const mapped: LeaderboardEntry[] = raw.map((d: any) => {
        const elo = d.elo ?? 1200;
        const gamesPlayed = d.gamesPlayed ?? 0;
        const gamesWon = d.gamesWon ?? 0;
        
        return {
          uid: d.uid || d.id,
          displayName: d.displayName || 'Anonymous',
          elo: elo,
          gamesPlayed: gamesPlayed,
          winRate: (gamesPlayed > 0) ? Math.round((gamesWon / gamesPlayed) * 100) : 0,
          rank: eloToRank(elo),
          avatarConfig: d.avatarConfig,
        };
      });
      setEntries(mapped);
    } catch (e) {
      console.error('[LeaderboardScreen] Load failed:', e);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const renderEntry = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const pos = index + 1;
    const isMe = item.uid === user?.uid;
    const rankColor = eloToRank(item.elo);
    return (
      <TouchableOpacity 
        style={[styles.entryRow, glassStyle, isMe && styles.entryRowHighlight]}
        onPress={() => navigation.navigate('Profile', { userId: item.uid })}
        activeOpacity={0.8}
      >
        <View style={styles.positionContainer}>
          {pos <= 3
            ? <Text style={[styles.medal, { color: RANK_COLORS[pos] }]}>{pos === 1 ? '🥇' : pos === 2 ? '🥈' : '🥉'}</Text>
            : <Text style={styles.position}>{pos}</Text>}
        </View>
        <View style={styles.avatarSmall}>
          <ProceduralAvatar size={36} config={item.avatarConfig} />
        </View>
        <View style={styles.playerInfo}>
          <Text style={[styles.playerName, isMe && { color: Colors.orange }]}>
            {item.displayName}{isMe ? ' (You)' : ''}
          </Text>
          <Text style={[styles.playerRank, { color: getRankColor(rankColor) }]}>
            {rankColor} · {item.gamesPlayed} games
          </Text>
        </View>
        <View style={styles.eloContainer}>
          <Text style={styles.eloValue}>{item.elo}</Text>
          <Text style={styles.eloLabel}>ELO</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <PageHeader title="Leaderboard" onBack={() => navigation.goBack()} />

      {/* Period tabs */}
      <GlassCard style={styles.tabRow}>
        {(['allTime', 'monthly', 'weekly'] as Period[]).map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.tab, period === p && styles.tabActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.tabText, period === p && styles.tabTextActive]}>
              {p === 'allTime' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </GlassCard>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.orange} />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="trophy-outline" size={60} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No rankings yet</Text>
          <Text style={styles.emptySubText}>Play some games to appear here!</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          renderItem={renderEntry}
          keyExtractor={item => item.uid}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          style={{ backgroundColor: '#000000' }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000' },

  tabRow: { flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, borderRadius: Radius.xl, padding: 4, gap: Spacing.xs },
  tab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.lg },
  tabActive: { backgroundColor: Colors.orange },
  tabText: { color: Colors.textMuted, fontSize: Typography.sm },
  tabTextActive: { color: Colors.textPrimary, fontWeight: '600' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  emptyText: { color: Colors.textSecondary, fontSize: Typography.xl, fontWeight: 'bold' },
  emptySubText: { color: Colors.textMuted, fontSize: Typography.md },

  listContent: { padding: Spacing.md },
  entryRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md, borderRadius: Radius.lg,
    marginBottom: Spacing.sm, gap: Spacing.md,
  },
  entryRowHighlight: { borderTopColor: Colors.orange, borderLeftColor: Colors.orange },

  positionContainer: { width: 32, alignItems: 'center' },
  medal: { fontSize: 22 },
  position: { color: Colors.textMuted, fontSize: Typography.md, fontWeight: 'bold' },

  avatarSmall: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  avatarSmallText: { color: Colors.textPrimary, fontWeight: 'bold', fontSize: Typography.md },

  playerInfo: { flex: 1 },
  playerName: { color: Colors.textPrimary, fontSize: Typography.md, fontWeight: '600' },
  playerRank: { fontSize: Typography.xs, marginTop: 2 },

  eloContainer: { alignItems: 'flex-end' },
  eloValue: { color: Colors.textPrimary, fontSize: Typography.lg, fontWeight: 'bold' },
  eloLabel: { color: Colors.textMuted, fontSize: Typography.xs },
});

export default LeaderboardScreen;
