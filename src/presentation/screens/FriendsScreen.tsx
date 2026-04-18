// ============================================================
// PATHRIX - Friends Screen
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Alert, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../../core/theme';
import { useAuthStore, eloToRank } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { useI18n } from '../../core/i18n';
import {
  searchUsers, sendFriendRequest, watchFriendRequests, watchSentFriendRequests,
  acceptFriendRequest, declineFriendRequest, removeFriend,
  watchFriendsList, getPendingChallenges,
  acceptFriendChallengeDirect, declineFriendChallengeDirect,
} from '../../data/services/FirebaseService';
import { GlassCard, glassStyle, PageHeader, ConfirmModal } from '../components/ui';
import { MatchType } from '../../domain/enums';
import { hapticChallengeReceived } from '../../core/haptics';
import { ProceduralAvatar } from '../components/ProceduralAvatar';

interface FriendsScreenProps { navigation: any; }

type Tab = 'friends' | 'search' | 'requests' | 'challenges';

function rankColor(rank: string): string {
  const map: Record<string, string> = {
    Bronze: Colors.rankBronze, Silver: Colors.rankSilver, Gold: Colors.rankGold,
    Platinum: Colors.rankPlatinum, Diamond: Colors.rankDiamond, Master: Colors.rankMaster,
  };
  return map[rank] ?? Colors.textPrimary;
}

function statusColor(status?: string): string {
  if (status === 'free') return '#4ade80';     // green
  if (status === 'playing') return Colors.orange; // orange
  return Colors.textMuted;                      // grey = offline
}

const FriendsScreen: React.FC<FriendsScreenProps> = ({ navigation }) => {
  const { user, updateProfile } = useAuthStore();
  const { startOnlineGame } = useGameStore();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('friends');

  // ── Friends list (real-time) ──────────────────────────────
  const [friends, setFriends] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoadingFriends(true);
    const unsub = watchFriendsList(user.friendIds, (list) => {
      setFriends(list);
      setLoadingFriends(false);
    });
    return unsub;
  }, [user?.friendIds.join(',')]);

  const handleRemoveFriend = (friendId: string, friendName: string) => {
    setFriendToRemove({ id: friendId, name: friendName });
    setConfirmVisible(true);
  };

  const confirmRemoveFriend = async () => {
    if (!friendToRemove) return;
    try {
      await removeFriend(user!.uid, friendToRemove.id);
      updateProfile({ friendIds: user!.friendIds.filter(id => id !== friendToRemove.id) });
      setFriends(f => f.filter(fr => fr.id !== friendToRemove.id));
    } catch (err) {
      console.error('Error removing friend:', err);
    } finally {
      setConfirmVisible(false);
      setFriendToRemove(null);
    }
  };

  const handleChallengeFriend = (friend: any) => {
    navigation.navigate('FriendChallenge', { friend });
  };

  // ── Search ────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentRequestsMap, setSentRequestsMap] = useState<Record<string, string>>({}); // toUid -> requestId
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState<{id: string, name: string} | null>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = watchSentFriendRequests(user.uid, (list) => {
      const map: Record<string, string> = {};
      list.forEach(r => { map[r.toUid] = r.id; });
      setSentRequestsMap(map);
    });
    return unsub;
  }, [user?.uid]);

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    const q = searchQuery.trim();
    if (!user || q.length < 2) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    searchDebounce.current = setTimeout(async () => {
      try {
        const results = await searchUsers(q, user.uid);
        setSearchResults(results);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
  }, [searchQuery]);

  const handleAddFriend = async (target: any) => {
    if (!user) return;
    try {
      await sendFriendRequest(user.uid, user.displayName, target.id, target.displayName);
    } catch (err) {
      console.error('Error sending friend request:', err);
      Alert.alert('Error', 'Could not send friend request.');
    }
  };

  const handleCancelRequest = async (targetId: string) => {
    const requestId = sentRequestsMap[targetId];
    if (!requestId) return;
    try {
      await declineFriendRequest(requestId); // decline and cancel are the same: delete doc
    } catch (err) {
      console.error('Error cancelling friend request:', err);
    }
  };

  // ── Incoming friend requests ──────────────────────────────
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsub = watchFriendRequests(user.uid, setRequests);
    return unsub;
  }, [user?.uid]);

  const handleAcceptRequest = async (req: any) => {
    await acceptFriendRequest(req.id, req.fromUid, user!.uid);
    updateProfile({ friendIds: [...user!.friendIds, req.fromUid] });
    setRequests(r => r.filter(x => x.id !== req.id));
  };

  const handleDeclineRequest = async (req: any) => {
    await declineFriendRequest(req.id);
    setRequests(r => r.filter(x => x.id !== req.id));
  };

  // ── Incoming game challenges ──────────────────────────────
  const [challenges, setChallenges] = useState<any[]>([]);
  const prevChallengeCount = useRef(0);

  useEffect(() => {
    if (!user) return;
    const unsub = getPendingChallenges(user.uid, (list) => {
      setChallenges(list);
      if (list.length > prevChallengeCount.current) hapticChallengeReceived();
      prevChallengeCount.current = list.length;
    });
    return unsub;
  }, [user?.uid]);

  const handleAcceptChallenge = async (challenge: any) => {
    if (!user) return;
    await acceptFriendChallengeDirect(challenge.id, challenge.matchId);
    startOnlineGame(challenge.matchId, challenge.fromUid, user.uid, MatchType.VS_FRIEND);
    navigation.navigate('Game', { matchId: challenge.matchId, online: true });
  };

  const handleDeclineChallenge = async (challenge: any) => {
    await declineFriendChallengeDirect(challenge.id, challenge.matchId);
    setChallenges(c => c.filter(x => x.id !== challenge.id));
  };

  const totalBadge = requests.length + challenges.length;

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <PageHeader title={t('friends.title')} onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Ionicons name="people-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyText}>Sign in to manage friends</Text>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.actionBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <PageHeader title={t('friends.title')} onBack={() => navigation.goBack()} />

      {/* ── Tabs ─────────────────────────────────────────── */}
      <View style={styles.tabs}>
        <TabBtn label={t('friends.title')} icon="people" active={tab === 'friends'} onPress={() => setTab('friends')} />
        <TabBtn label={t('friends.search')} icon="search" active={tab === 'search'} onPress={() => setTab('search')} />
        <TabBtn label={t('friends.requests')} icon="person-add" active={tab === 'requests'} onPress={() => setTab('requests')} badge={requests.length} />
        <TabBtn label={t('friends.challenges')} icon="flash" active={tab === 'challenges'} onPress={() => setTab('challenges')} badge={challenges.length} />
      </View>

      {/* ── Friends list ─────────────────────────────────── */}
      {tab === 'friends' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} style={styles.scroll}>
          {loadingFriends ? (
            <ActivityIndicator color={Colors.cyan} style={{ marginTop: 40 }} />
          ) : friends.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="people-outline" size={56} color={Colors.textMuted} />
              <Text style={styles.emptyText}>{t('friends.noFriends')}</Text>
              <Text style={styles.emptySubText}>{t('friends.noFriends.sub')}</Text>
            </View>
          ) : (
            friends.map(fr => (
              <FriendRow
                key={fr.id}
                friend={fr}
                challengeLabel={t('challenge.btn')}
                removeLabel={t('friends.remove')}
                onChallenge={() => handleChallengeFriend(fr)}
                onRemove={() => handleRemoveFriend(fr.id, fr.displayName)}
                onPress={() => navigation.navigate('Profile', { userId: fr.id })}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* ── Search ───────────────────────────────────────── */}
      {tab === 'search' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} style={styles.scroll}>
          <View style={styles.searchRow}>
            <View style={styles.searchInput}>
              <Ionicons name="search-outline" size={18} color={Colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchText}
                placeholder={t('friends.searchPlaceholder')}
                placeholderTextColor={Colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus={tab === 'search'}
              />
              {searching
                ? <ActivityIndicator size="small" color={Colors.textMuted} style={{ marginLeft: 8 }} />
                : searchQuery.length > 0
                  ? <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                    </TouchableOpacity>
                  : null}
            </View>
          </View>

          {searchResults.length === 0 && !searching && searchQuery.length >= 2 && (
            <Text style={styles.emptyText}>{t('friends.noResults')}</Text>
          )}

          {searchResults.map(u => {
            const alreadyFriend = user.friendIds.includes(u.id);
            const requestId = sentRequestsMap[u.id];
            const isSent = !!requestId;
            return (
              <UserRow
                key={u.id}
                user={u}
                rightElement={
                  alreadyFriend ? (
                    <TouchableOpacity 
                      style={[styles.addBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.textMuted }]} 
                      onPress={() => handleRemoveFriend(u.id, u.displayName)}
                    >
                      <Ionicons name="person-remove-outline" size={14} color={Colors.textMuted} />
                      <Text style={[styles.addBtnText, { color: Colors.textMuted }]}>{t('friends.remove')}</Text>
                    </TouchableOpacity>
                  ) : isSent ? (
                    <TouchableOpacity 
                      style={[styles.addBtn, { backgroundColor: 'rgba(255,255,255,0.05)' }]} 
                      onPress={() => handleCancelRequest(u.id)}
                    >
                      <Ionicons name="close-outline" size={16} color={Colors.textMuted} />
                      <Text style={[styles.addBtnText, { color: Colors.textMuted }]}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.addBtn} onPress={() => handleAddFriend(u)}>
                      <Ionicons name="person-add-outline" size={16} color="#000" />
                      <Text style={styles.addBtnText}>{t('friends.add')}</Text>
                    </TouchableOpacity>
                  )
                }
                onPress={() => navigation.navigate('Profile', { userId: u.id })}
              />
            );
          })}
        </ScrollView>
      )}

      {/* ── Friend requests ───────────────────────────────── */}
      {tab === 'requests' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} style={styles.scroll}>
          {requests.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="person-add-outline" size={56} color={Colors.textMuted} />
              <Text style={styles.emptyText}>{t('friends.noPending')}</Text>
            </View>
          ) : (
            requests.map(req => (
              <GlassCard key={req.id} style={styles.reqCard}>
                <View style={styles.reqLeft}>
                  <View style={styles.avatar}>
                    <ProceduralAvatar size={42} config={req.fromAvatarConfig} />
                  </View>
                  <Text style={styles.reqName}>{req.fromName}</Text>
                </View>
                <View style={styles.reqActions}>
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptRequest(req)}>
                    <Ionicons name="checkmark" size={18} color="#000" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.declineBtn} onPress={() => handleDeclineRequest(req)}>
                    <Ionicons name="close" size={18} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </GlassCard>
            ))
          )}
        </ScrollView>
      )}

      {/* ── Game challenges ───────────────────────────────── */}
      {tab === 'challenges' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} style={styles.scroll}>
          {challenges.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="flash-outline" size={56} color={Colors.textMuted} />
              <Text style={styles.emptyText}>{t('friends.noChallenges')}</Text>
            </View>
          ) : (
            challenges.map(ch => (
              <GlassCard key={ch.id} style={styles.reqCard}>
                <View style={styles.reqLeft}>
                  <View style={styles.avatar}>
                    <ProceduralAvatar size={42} config={ch.fromAvatarConfig} />
                  </View>
                  <View>
                    <Text style={styles.reqName}>{ch.fromName}</Text>
                    <Text style={styles.challengeSub}>{t('challenge.btn')} →</Text>
                  </View>
                </View>
                <View style={styles.reqActions}>
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptChallenge(ch)}>
                    <Ionicons name="checkmark" size={18} color="#000" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.declineBtn} onPress={() => handleDeclineChallenge(ch)}>
                    <Ionicons name="close" size={18} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </GlassCard>
            ))
          )}
        </ScrollView>
      )}

      <ConfirmModal
        visible={confirmVisible}
        title={t('friends.remove')}
        message={t('friends.remove.confirm').replace('{name}', friendToRemove?.name ?? '')}
        confirmLabel={t('friends.remove')}
        cancelLabel={t('common.cancel')}
        onConfirm={confirmRemoveFriend}
        onCancel={() => {
          setConfirmVisible(false);
          setFriendToRemove(null);
        }}
        isDestructive
      />
    </SafeAreaView>
  );
};

// ── Sub-components ────────────────────────────────────────────

const TabBtn: React.FC<{
  label: string; icon: string; active: boolean;
  onPress: () => void; badge?: number;
}> = ({ label, icon, active, onPress, badge }) => (
  <TouchableOpacity style={[tabStyles.btn, active && tabStyles.btnActive]} onPress={onPress} activeOpacity={0.7}>
    <View style={{ position: 'relative' }}>
      <Ionicons name={icon as any} size={18} color={active ? Colors.textPrimary : Colors.textMuted} />
      {!!badge && badge > 0 && (
        <View style={tabStyles.badge}>
          <Text style={tabStyles.badgeText}>{badge}</Text>
        </View>
      )}
    </View>
    <Text style={[tabStyles.label, active && tabStyles.labelActive]}>{label}</Text>
  </TouchableOpacity>
);

const tabStyles = StyleSheet.create({
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10 },
  btnActive: { borderBottomWidth: 2, borderBottomColor: Colors.cyan },
  label: { color: Colors.textMuted, fontSize: Typography.xs },
  labelActive: { color: Colors.textPrimary, fontWeight: '600' },
  badge: { position: 'absolute', top: -4, right: -8, backgroundColor: Colors.error, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
});

const UserRow: React.FC<{ user: any; rightElement: React.ReactNode; showStatus?: boolean; onPress?: () => void }> = ({ user, rightElement, showStatus, onPress }) => {
  const { t } = useI18n();
  const rank = eloToRank(user.elo ?? 1200);
  const rc = rankColor(rank);
  const sc = statusColor(user.status);
  const statusKey = user.status === 'free' ? 'friends.status.free'
    : user.status === 'playing' ? 'friends.status.playing'
    : 'friends.status.offline';
  return (
    <GlassCard style={rowStyles.card}>
      <TouchableOpacity style={rowStyles.left} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
        <View style={{ position: 'relative' }}>
          <View style={rowStyles.avatar}>
            {user.avatarUrl ? (
              <Text style={rowStyles.avatarInitial}>{user.displayName?.charAt(0)?.toUpperCase()}</Text>
            ) : (
              <ProceduralAvatar size={42} config={user.avatarConfig} />
            )}
          </View>
          {showStatus && (
            <View style={[rowStyles.statusDot, { backgroundColor: sc }]} />
          )}
        </View>
        <View>
          <Text style={rowStyles.name}>{user.displayName}</Text>
          <Text style={[rowStyles.rank, { color: rc }]}>{rank} · {user.elo ?? 1200} ELO</Text>
          {showStatus && (
            <Text style={[rowStyles.statusLabel, { color: sc }]}>{t(statusKey as any)}</Text>
          )}
        </View>
      </TouchableOpacity>
      {rightElement}
    </GlassCard>
  );
};

const FriendRow: React.FC<{
  friend: any;
  challengeLabel: string;
  removeLabel: string;
  onChallenge: () => void;
  onRemove: () => void;
  onPress: () => void;
}> = ({ friend, challengeLabel, removeLabel, onChallenge, onRemove, onPress }) => (
  <UserRow
    user={friend}
    showStatus
    onPress={onPress}
    rightElement={
      <View style={rowStyles.actions}>
        <TouchableOpacity style={rowStyles.challengeBtn} onPress={onChallenge} activeOpacity={0.8}>
          <Ionicons name="flash" size={14} color="#000" />
          <Text style={rowStyles.challengeBtnText}>{challengeLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onRemove} style={rowStyles.removeBtn}>
          <Ionicons name="person-remove-outline" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>
    }
  />
);

const rowStyles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: Radius.xl, padding: Spacing.md, marginBottom: Spacing.sm },
  left: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  avatar: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: Colors.textPrimary, fontSize: Typography.lg, fontWeight: 'bold' },
  statusDot: { position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: '#000' },
  name: { color: Colors.textPrimary, fontSize: Typography.md, fontWeight: '600' },
  rank: { fontSize: Typography.xs, marginTop: 2 },
  statusLabel: { fontSize: 10, marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  challengeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.orange, borderRadius: Radius.lg, paddingHorizontal: Spacing.sm, paddingVertical: 6 },
  challengeBtnText: { color: '#000', fontWeight: 'bold', fontSize: Typography.xs },
  removeBtn: { padding: 6 },
});

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000' },
  scroll: { backgroundColor: '#000000' },
  tabs: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.08)', backgroundColor: '#000000' },
  scrollContent: { padding: Spacing.lg, paddingBottom: 48, flexGrow: 1 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, paddingTop: 80 },
  emptyText: { color: Colors.textSecondary, fontSize: Typography.md, textAlign: 'center' },
  emptySubText: { color: Colors.textMuted, fontSize: Typography.sm },

  actionBtn: { backgroundColor: Colors.orange, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radius.xl },
  actionBtnText: { color: Colors.textPrimary, fontWeight: 'bold', fontSize: Typography.md },

  searchRow: { marginBottom: Spacing.lg },
  searchInput: { flex: 1, flexDirection: 'row', alignItems: 'center', ...glassStyle, borderRadius: Radius.xl, paddingHorizontal: Spacing.md },
  searchText: { flex: 1, color: Colors.textPrimary, fontSize: Typography.md, paddingVertical: Spacing.md },

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.cyan, borderRadius: Radius.lg, paddingHorizontal: Spacing.sm, paddingVertical: 6 },
  addBtnText: { color: '#000', fontWeight: 'bold', fontSize: Typography.sm },
  badge: { borderRadius: Radius.lg, paddingHorizontal: Spacing.sm, paddingVertical: 5, ...glassStyle },
  badgeText: { color: Colors.textMuted, fontSize: Typography.xs },

  reqCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: Radius.xl, padding: Spacing.md, marginBottom: Spacing.sm },
  reqLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  avatar: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: Colors.textPrimary, fontSize: Typography.lg, fontWeight: 'bold' },
  reqName: { color: Colors.textPrimary, fontSize: Typography.md, fontWeight: '600' },
  challengeSub: { color: Colors.orange, fontSize: Typography.xs, marginTop: 2 },
  reqActions: { flexDirection: 'row', gap: Spacing.sm },
  acceptBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.cyan, alignItems: 'center', justifyContent: 'center' },
  declineBtn: { width: 36, height: 36, borderRadius: 18, ...glassStyle, alignItems: 'center', justifyContent: 'center' },
});

export default FriendsScreen;
