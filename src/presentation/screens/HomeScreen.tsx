// ============================================================
// PATHRIX - Home Screen
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, Dimensions, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Path } from 'react-native-svg';
import { Colors, Typography, Spacing, Radius } from '../../core/theme';
import { BotDifficulty, MatchType } from '../../domain/enums';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { useI18n } from '../../core/i18n';
import {
  getPendingChallenges,
  acceptFriendChallengeDirect,
  declineFriendChallengeDirect,
  watchFriendRequests,
} from '../../data/services/FirebaseService';
import { GlassCard } from '../components/ui';
import { hapticChallengeReceived } from '../../core/haptics';
import { BannerAdWidget } from '../components/ads/AdsManager';
import { ProceduralAvatar } from '../components/ProceduralAvatar';

const { width: SW } = Dimensions.get('window');

interface HomeScreenProps {
  navigation: any;
}


// ── SVG icons ────────────────────────────────────────────────

const IconMachine: React.FC = () => (
  <Svg width={44} height={44} viewBox="0 0 54 54" fill="none">
    <Rect width={54} height={54} rx={12} fill="#052B5E" />
    <Path d="M36.2002 23.75C36.2002 23.0851 35.6438 22.5002 34.9004 22.5H18.0996C17.3562 22.5002 16.7998 23.0851 16.7998 23.75V34.75C16.7998 35.4149 17.3562 35.9998 18.0996 36H34.9004C35.6438 35.9998 36.2002 35.4149 36.2002 34.75V23.75ZM20.7998 30.625V27.875C20.7998 27.0466 21.4715 26.3751 22.2998 26.375C23.1282 26.375 23.7998 27.0466 23.7998 27.875V30.625C23.7998 31.4534 23.1282 32.125 22.2998 32.125C21.4715 32.1249 20.7998 31.4534 20.7998 30.625ZM29.2002 30.625V27.875C29.2002 27.0466 29.8718 26.375 30.7002 26.375C31.5285 26.3751 32.2002 27.0466 32.2002 27.875V30.625C32.2002 31.4534 31.5285 32.1249 30.7002 32.125C29.8718 32.125 29.2002 31.4534 29.2002 30.625ZM39.2002 27.75H40.5C41.3284 27.75 42 28.4216 42 29.25C42 30.0784 41.3284 30.75 40.5 30.75H39.2002V34.75C39.2002 37.1224 37.2494 38.9998 34.9004 39H18.0996C15.7506 38.9998 13.7998 37.1224 13.7998 34.75V30.75H12.5C11.6716 30.75 11 30.0784 11 29.25C11 28.4216 11.6716 27.75 12.5 27.75H13.7998V23.75C13.7998 21.3776 15.7506 19.5002 18.0996 19.5H25V17H20.9004C20.072 17 19.4004 16.3284 19.4004 15.5C19.4004 14.6716 20.072 14 20.9004 14H26.5C27.3284 14 28 14.6716 28 15.5V19.5H34.9004C37.2494 19.5002 39.2002 21.3776 39.2002 23.75V27.75Z" fill="#006FFF" />
  </Svg>
);

const IconRandomMatch: React.FC = () => (
  <Svg width={44} height={44} viewBox="0 0 54 54" fill="none">
    <Rect width={54} height={54} rx={12} fill="#521E0B" />
    <Path fillRule="evenodd" clipRule="evenodd" d="M35.6667 14C36.8159 14 37.9181 14.4404 38.7308 15.2243C39.5435 16.0081 40 17.0713 40 18.1799V34.8994C40 36.008 39.5435 37.0711 38.7308 37.855C37.9181 38.6389 36.8159 39.0793 35.6667 39.0793H18.3333C17.1841 39.0793 16.0819 38.6389 15.2692 37.855C14.4565 37.0711 14 36.008 14 34.8994V18.1799C14 17.0713 14.4565 16.0081 15.2692 15.2243C16.0819 14.4404 17.1841 14 18.3333 14H35.6667ZM35.6667 16.7866H18.3333C17.9502 16.7866 17.5828 16.9334 17.312 17.1947C17.0411 17.456 16.8889 17.8104 16.8889 18.1799V34.8994C16.8889 35.2689 17.0411 35.6233 17.312 35.8846C17.5828 36.1459 17.9502 36.2927 18.3333 36.2927H35.6667C36.0498 36.2927 36.4172 36.1459 36.688 35.8846C36.9589 35.6233 37.1111 35.2689 37.1111 34.8994V18.1799C37.1111 17.8104 36.9589 17.456 36.688 17.1947C36.4172 16.9334 36.0498 16.7866 35.6667 16.7866ZM21.9444 29.3262C22.4831 29.3262 23.0023 29.5198 23.401 29.8691C23.7998 30.2184 24.0493 30.6984 24.101 31.2155L24.1111 31.4301C24.1108 31.9668 23.8965 32.4829 23.5125 32.8713C23.1285 33.2597 22.6043 33.4908 22.0486 33.5166C21.4928 33.5424 20.948 33.3609 20.5272 33.0098C20.1063 32.6588 19.8416 32.1649 19.7879 31.6307L19.7778 31.4162C19.7778 30.8619 20.0061 30.3303 20.4124 29.9384C20.8187 29.5464 21.3698 29.3262 21.9444 29.3262ZM32.0556 29.3262C32.5942 29.3262 33.1135 29.5198 33.5122 29.8691C33.9109 30.2184 34.1604 30.6984 34.2121 31.2155L34.2222 31.4301C34.2219 31.9668 34.0076 32.4829 33.6236 32.8713C33.2397 33.2597 32.7155 33.4908 32.1597 33.5166C31.6039 33.5424 31.0591 33.3609 30.6383 33.0098C30.2174 32.6588 29.9527 32.1649 29.899 31.6307L29.8889 31.4162C29.8889 30.8619 30.1172 30.3303 30.5235 29.9384C30.9298 29.5464 31.4809 29.3262 32.0556 29.3262ZM27 24.4497C27.5386 24.4497 28.0579 24.6433 28.4566 24.9926C28.8553 25.3418 29.1048 25.8219 29.1566 26.339L29.1667 26.5536C29.1664 27.0903 28.9521 27.6063 28.5681 27.9948C28.1841 28.3832 27.6599 28.6143 27.1041 28.6401C26.5483 28.6659 26.0036 28.4844 25.5827 28.1333C25.1618 27.7822 24.8971 27.2884 24.8434 26.7542L24.8333 26.5396C24.8333 25.9854 25.0616 25.4538 25.4679 25.0618C25.8743 24.6699 26.4254 24.4497 27 24.4497ZM21.9444 19.5732C22.4831 19.5732 23.0023 19.7667 23.401 20.116C23.7998 20.4653 24.0493 20.9453 24.101 21.4625L24.1111 21.677C24.1108 22.2138 23.8965 22.7298 23.5125 23.1182C23.1285 23.5067 22.6043 23.7377 22.0486 23.7635C21.4928 23.7893 20.948 23.6079 20.5272 23.2568C20.1063 22.9057 19.8416 22.4119 19.7879 21.8777L19.7778 21.6631C19.7778 21.1088 20.0061 20.5772 20.4124 20.1853C20.8187 19.7934 21.3698 19.5732 21.9444 19.5732ZM32.0556 19.5732C32.5942 19.5732 33.1135 19.7667 33.5122 20.116C33.9109 20.4653 34.1604 20.9453 34.2121 21.4625L34.2222 21.677C34.2219 22.2138 34.0076 22.7298 33.6236 23.1182C33.2397 23.5067 32.7155 23.7377 32.1597 23.7635C31.6039 23.7893 31.0591 23.6079 30.6383 23.2568C30.2174 22.9057 29.9527 22.4119 29.899 21.8777L29.8889 21.6631C29.8889 21.1088 30.1172 20.5772 30.5235 20.1853C30.9298 19.7934 31.4809 19.5732 32.0556 19.5732Z" fill="#FD4300" />
  </Svg>
);

const IconFriends: React.FC = () => (
  <Svg width={44} height={44} viewBox="0 0 54 54" fill="none">
    <Rect width={54} height={54} rx={12} fill="#12383B" />
    <Path d="M37.1111 36.2222H16.8889V16.7778H37.1111M37.1111 14H16.8889C16.1227 14 15.3879 14.2927 14.8461 14.8136C14.3044 15.3345 14 16.0411 14 16.7778V36.2222C14 36.9589 14.3044 37.6655 14.8461 38.1864C15.3879 38.7073 16.1227 39 16.8889 39H37.1111C37.8773 39 38.6121 38.7073 39.1539 38.1864C39.6956 37.6655 40 36.9589 40 36.2222V16.7778C40 16.0411 39.6956 15.3345 39.1539 14.8136C38.6121 14.2927 37.8773 14 37.1111 14ZM33.5 32.4028C33.5 30.3194 29.1667 29.2778 27 29.2778C24.8333 29.2778 20.5 30.3194 20.5 32.4028V33.4444H33.5M27 26.8472C27.862 26.8472 28.6886 26.518 29.2981 25.9319C29.9076 25.3459 30.25 24.551 30.25 23.7222C30.25 22.8934 29.9076 22.0986 29.2981 21.5125C28.6886 20.9265 27.862 20.5972 27 20.5972C26.138 20.5972 25.3114 20.9265 24.7019 21.5125C24.0924 22.0986 23.75 22.8934 23.75 23.7222C23.75 24.551 24.0924 25.3459 24.7019 25.9319C25.3114 26.518 26.138 26.8472 27 26.8472Z" fill="#00E575" />
  </Svg>
);

// ── Static 8×8 board background ──────────────────────────────

// 8×8 grid — fills the container width, container is square
// 8×8 grid — fills the container width, container is square
const CELL_GAP    = 3;
const GRID_COLS   = 8;
const GRID_ROWS   = 8;
const CONTAINER_W = SW - (Spacing?.sm || 8) * 2;
const CELL_SZ     = Math.floor((CONTAINER_W - CELL_GAP * (GRID_COLS - 1)) / GRID_COLS);

const CardsGridBg: React.FC = () => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    {Array.from({ length: GRID_ROWS }, (_, r) => (
      <View key={r} style={cardGridStyles.row}>
        {Array.from({ length: GRID_COLS }, (_, c) => (
          <View key={c} style={cardGridStyles.cell} />
        ))}
      </View>
    ))}
  </View>
);

const cardGridStyles = StyleSheet.create({
  row:  { flexDirection: 'row', gap: CELL_GAP, marginBottom: CELL_GAP },
  cell: { width: CELL_SZ, height: CELL_SZ, backgroundColor: '#131313', borderRadius: 3, borderWidth: 1, borderColor: '#1e1e1e' },
});

// ── Main screen ───────────────────────────────────────────────

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user } = useAuthStore();
  const { startLocalGame, startOnlineGame } = useGameStore();
  const { t } = useI18n();

  // ── Incoming challenge listener ───────────────────────────
  const [incomingChallenges, setIncomingChallenges] = useState<any[]>([]);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const unsubRef = useRef<(() => void) | null>(null);
  const unsubReqRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!user) return;
    unsubRef.current = getPendingChallenges(user.uid, (challenges) => {
      setIncomingChallenges(challenges);
      if (challenges.length > 0) {
        setShowChallengeModal(true);
        hapticChallengeReceived();
      } else {
        setShowChallengeModal(false);
      }
    });
    unsubReqRef.current = watchFriendRequests(user.uid, setFriendRequests);
    return () => { unsubRef.current?.(); unsubReqRef.current?.(); };
  }, [user?.uid]);

  const friendsBadge = friendRequests.length + incomingChallenges.length;

  const handleAcceptChallenge = async (challenge: any) => {
    if (!user) return;
    setShowChallengeModal(false);
    await acceptFriendChallengeDirect(challenge.id, challenge.matchId, user.avatarConfig);
    startOnlineGame(challenge.matchId, challenge.fromUid, user.uid, MatchType.VS_FRIEND);
    navigation.navigate('Game', { matchId: challenge.matchId, online: true });
  };

  const handleDeclineChallenge = async (challenge: any) => {
    await declineFriendChallengeDirect(challenge.id, challenge.matchId);
    const remaining = incomingChallenges.filter(c => c.id !== challenge.id);
    setIncomingChallenges(remaining);
    if (remaining.length === 0) setShowChallengeModal(false);
  };

  // ── Navigation handlers ───────────────────────────────────
  const handleVsBot = () => {
    startLocalGame(BotDifficulty.EXPERT);
    navigation.navigate('Game');
  };

  const handleVsRandom = () => {
    if (!user) { navigation.navigate('Login'); return; }
    navigation.navigate('Matchmaking', { type: 'random' });
  };

  const handleVsFriend = () => {
    if (!user) { navigation.navigate('Login'); return; }
    navigation.navigate('FriendChallenge');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={styles.topContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>
              <Text style={styles.logoPath}>PATH</Text>
              <Text style={styles.logoRix}>RIX</Text>
            </Text>
            <Text style={styles.logoSub}>Path Connection Strategy</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate(user ? 'Profile' : 'Login')}
            style={styles.profileBtn}
          >
            {user ? (
              <View>
                {user.avatarUrl ? (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {user.displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                ) : (
                  <ProceduralAvatar size={36} config={user.avatarConfig} />
                )}
                {friendsBadge > 0 && (
                  <View style={styles.avatarBadge}>
                    <Text style={styles.avatarBadgeText}>{friendsBadge > 9 ? '9+' : friendsBadge}</Text>
                  </View>
                )}
              </View>
            ) : (
              <Ionicons name="person-circle-outline" size={36} color={Colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>
        <BannerAdWidget type="home" />
      </View>

      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: Spacing?.sm || 8 }}>
        <View style={styles.cardsContainer}>
          <CardsGridBg />
          {/* Cards overlay centradas verticalmente sobre el grid */}
          <View style={styles.cardsInner}>
            <PlayCard icon={<IconMachine />}     title={t('home.vsBot')}  description={t('home.vsBot.desc')}   onPress={handleVsBot} />
            <PlayCard icon={<IconRandomMatch />} title={t('home.random')} description={t('home.random.desc')}  onPress={handleVsRandom} />
            <PlayCard icon={<IconFriends />}     title={t('home.friend')} description={t('home.friend.desc')}  onPress={handleVsFriend} />
          </View>
        </View>
      </View>
      <View style={styles.bottomBarWrapper}>
        <View style={styles.bottomBar}>
          <BottomBtn icon="book-outline"     label={t('home.tutorial')} onPress={() => navigation.navigate('Tutorial')} />
          <BottomBtn icon="trophy-outline"   label={t('home.ranking')}  color={Colors.orange} onPress={() => navigation.navigate('Leaderboard')} />
<BottomBtn icon="settings-outline" label={t('home.settings')} onPress={() => navigation.navigate('Settings')} />
        </View>
      </View>

      {/* ── Incoming challenge modal ── */}
      <Modal visible={showChallengeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.challengeSheet}>
            <View style={styles.sheetHandle} />
            <Ionicons name="flash" size={32} color={Colors.orange} style={{ alignSelf: 'center', marginBottom: Spacing.sm }} />
            <Text style={styles.challengeSheetTitle}>{t('friends.incomingChallenge')}</Text>
            {incomingChallenges.map(challenge => (
              <View key={challenge.id} style={styles.challengeRow}>
                <View style={styles.challengeInfo}>
                  <View style={styles.challengeAvatar}>
                    <ProceduralAvatar size={40} config={challenge.fromAvatarConfig} />
                  </View>
                  <Text style={styles.challengeName}>{challenge.fromName}</Text>
                </View>
                <View style={styles.challengeBtns}>
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptChallenge(challenge)}>
                    <Text style={styles.acceptBtnText}>{t('common.accept')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.declineBtn} onPress={() => handleDeclineChallenge(challenge)}>
                    <Text style={styles.declineBtnText}>{t('common.decline')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </GlassCard>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ── Sub-components ────────────────────────────────────────────

const PlayCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  onPress: () => void;
}> = ({ icon, title, description, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
    {icon}
    <View style={styles.cardText}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDesc}>{description}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
  </TouchableOpacity>
);

const BottomBtn: React.FC<{
  icon: string;
  label: string;
  color?: string;
  badge?: number;
  onPress: () => void;
}> = ({ icon, label, color = Colors.textSecondary, badge = 0, onPress }) => (
  <TouchableOpacity style={styles.bottomBtn} onPress={onPress} activeOpacity={0.7}>
    <View>
      <Ionicons name={icon as any} size={22} color={color} />
      {badge > 0 && (
        <View style={styles.bottomBtnBadge}>
          <Text style={styles.bottomBtnBadgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </View>
    <Text style={[styles.bottomBtnLabel, { color }]}>{label}</Text>
  </TouchableOpacity>
);

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    padding: Spacing?.lg || 24,
    paddingBottom: Spacing?.md || 16,
  },

  // Cards container with grid background — square 8×8
  cardsContainer: {
    width: CONTAINER_W || 300,
    height: CONTAINER_W || 300,
    justifyContent: 'center',
  },
  cardsInner: {
    paddingHorizontal: Spacing?.md || 16,
    gap: Spacing?.sm || 8,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing?.xl || 32,
  },
  logo: {
    fontSize: 30,
    letterSpacing: 2.1,
  },
  logoPath: {
    color: '#ffffff',
    fontFamily: 'SairaStencilOne_400Regular',
  },
  logoRix: {
    color: Colors.orange,
    fontFamily: 'SairaStencilOne_400Regular',
  },
  logoSub: {
    color: Colors.textMuted,
    fontSize: Typography.xs,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  profileBtn: { marginTop: 4 },
  avatar: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#4da6ff', fontWeight: 'bold', fontSize: Typography.md },
  avatarBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: Colors.error, borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#000' },
  avatarBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  topContent: { paddingHorizontal: Spacing?.lg || 24, paddingTop: Spacing?.lg || 24 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(38, 38, 42, 0.82)', borderRadius: Radius?.lg || 12, padding: Spacing?.md || 16, gap: Spacing?.md || 16, borderTopWidth: 0.8, borderLeftWidth: 0.8, borderBottomWidth: 0.2, borderRightWidth: 0.2, borderTopColor: 'rgba(255, 255, 255, 0.30)', borderLeftColor: 'rgba(255, 255, 255, 0.30)', borderBottomColor: 'rgba(255, 255, 255, 0.04)', borderRightColor: 'rgba(255, 255, 255, 0.04)', shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8, backdropFilter: 'blur(6px) saturate(140%)', WebkitBackdropFilter: 'blur(6px) saturate(140%)' } as any,
  cardText: { flex: 1 },
  cardTitle: { color: Colors.textPrimary, fontSize: Typography.md, fontWeight: '700' },
  cardDesc: { color: Colors.textMuted, fontSize: Typography.xs, marginTop: 2 },
  adBanner: { backgroundColor: '#000000', height: 90, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing?.lg || 24, borderWidth: 1, borderColor: '#3a3a3a' },
  adText: { color: '#444444', fontSize: Typography.xxl, fontWeight: '600', letterSpacing: 10 },
  bottomBarWrapper: { alignItems: 'center', paddingBottom: 20, paddingTop: 8 },
  bottomBar: { flexDirection: 'row', backgroundColor: 'rgba(30, 30, 30, 0.75)', borderRadius: Radius?.full || 9999, paddingVertical: 10, paddingHorizontal: Spacing?.xl || 32, gap: 60, borderTopWidth: 0.4, borderLeftWidth: 0.4, borderBottomWidth: 0.1, borderRightWidth: 0.1, borderTopColor: 'rgba(255, 255, 255, 0.25)', borderLeftColor: 'rgba(255, 255, 255, 0.25)', borderBottomColor: 'rgba(255, 255, 255, 0.03)', borderRightColor: 'rgba(255, 255, 255, 0.04)', shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6, backdropFilter: 'blur(6px) saturate(140%)', WebkitBackdropFilter: 'blur(6px) saturate(140%)' } as any,
  bottomBtn: { alignItems: 'center', gap: 4 },
  bottomBtnLabel: { fontSize: Typography.xs },
  bottomBtnBadge: { position: 'absolute', top: -4, right: -6, backgroundColor: Colors.error, borderRadius: 10, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, borderWidth: 1.5, borderColor: '#000' },
  bottomBtnBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: 'rgba(38, 38, 38, 0.75)', borderTopLeftRadius: Radius?.xxl || 24, borderTopRightRadius: Radius?.xxl || 24, padding: Spacing?.lg || 24, paddingBottom: 48, backdropFilter: 'blur(20px) saturate(140%)', WebkitBackdropFilter: 'blur(20px) saturate(140%)' } as any,
  sheetHandle: { width: 36, height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, alignSelf: 'center', marginBottom: Spacing?.lg || 24 },
  sheetTitle: { color: Colors.textPrimary, fontSize: Typography.xl, fontWeight: 'bold', textAlign: 'center', marginBottom: Spacing?.lg || 24 },
  diffRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing?.md || 16, padding: Spacing?.md || 16, borderRadius: Radius?.lg || 12, backgroundColor: 'rgba(20, 20, 20, 0.55)', marginBottom: Spacing?.sm || 8, borderTopWidth: 0.4, borderLeftWidth: 0.4, borderBottomWidth: 0.1, borderRightWidth: 0.1, borderTopColor: 'rgba(255,255,255,0.18)', borderLeftColor: 'rgba(255,255,255,0.18)', borderBottomColor: 'rgba(255,255,255,0.03)', borderRightColor: 'rgba(255,255,255,0.03)' },
  diffDot: { width: 12, height: 12, borderRadius: 6 },
  diffLabel: { color: Colors.textPrimary, fontSize: Typography.md, fontWeight: '600' },
  diffDesc:  { color: Colors.textMuted,   fontSize: Typography.xs, marginTop: 2 },
  challengeSheet: { borderRadius: Radius?.xxl || 24, padding: Spacing?.lg || 24, margin: Spacing?.lg || 24 },
  challengeSheetTitle: { color: Colors.textPrimary, fontSize: Typography.xl, fontWeight: 'bold', textAlign: 'center', marginBottom: Spacing?.lg || 24 },
  challengeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing?.sm || 8 },
  challengeInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing?.md || 16 },
  challengeAvatar: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  challengeInitial: { color: Colors.textPrimary, fontSize: Typography.lg, fontWeight: 'bold' },
  challengeName: { color: Colors.textPrimary, fontSize: Typography.md, fontWeight: '600' },
  challengeBtns: { flexDirection: 'row', gap: Spacing?.sm || 8 },
  acceptBtn: { backgroundColor: Colors.orange, borderRadius: Radius?.lg || 12, paddingHorizontal: Spacing?.md || 16, paddingVertical: 8 },
  acceptBtnText: { color: '#000', fontWeight: 'bold', fontSize: Typography.sm },
  declineBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: Radius?.lg || 12, paddingHorizontal: Spacing?.md || 16, paddingVertical: 8 },
  declineBtnText: { color: Colors.textMuted, fontSize: Typography.sm },
});

export default HomeScreen;
