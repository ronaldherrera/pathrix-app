// ============================================================
// PATHRIX - Game Screen
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  StatusBar, Modal, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { Colors, Typography, Spacing, Radius } from '../../core/theme';
import { glassStyle, ConfirmModal } from '../components/ui';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { PlayerColor, GamePhase, MatchType, BotDifficulty } from '../../domain/enums';
import GameBoard from '../components/board/GameBoard';
import TilePainter from '../components/board/TilePainter';
import { BoardPosition, GameState } from '../../domain/entities';
import { TileType } from '../../domain/enums';
import { watchMatch, forfeitMatch, setUserStatus } from '../../data/services/FirebaseService';
import { hapticSelect, hapticTilePlaced, hapticInvalidMove, hapticWin, hapticLose, hapticTurnChange } from '../../core/haptics';
import { useI18n } from '../../core/i18n';
import { BannerAdWidget, useInterstitialAd, incrementGameCount } from '../components/ads/AdsManager';

interface GameScreenProps {
  navigation: any;
  route: any;
}

// ── Layout constants ──────────────────────────────────────────
const { width: SW, height: SH } = Dimensions.get('window');
const RACK_PAD = Spacing?.lg || 24;
const RACK_GAP = 8;
const TILE_S = Math.floor((SW - RACK_PAD * 2 - RACK_GAP * 3) / 4);

// ── Tile SVGs ─────────────────────────────────────────────────



const IconFlee: React.FC = () => (
  <Svg width={22} height={28} viewBox="0 0 28 35" fill="none">
    <Path d="M17.5729 24.8271C17.2011 24.0868 16.2995 23.7874 15.5592 24.1592C14.8191 24.531 14.5207 25.4326 14.8922 26.1729L16.232 28.8398C16.535 29.4429 17.203 29.7695 17.8649 29.6377L26.7936 27.8604C27.606 27.6986 28.1331 26.9082 27.9713 26.0957C27.8094 25.2834 27.02 24.7562 26.2076 24.918L18.4 26.4717L17.5729 24.8271ZM22.6432 17.5V12.167C22.6432 11.4515 22.1379 10.835 21.4361 10.6953L12.5074 8.91797L12.3238 8.89258C11.8935 8.8612 11.4669 9.01749 11.1569 9.32617L6.05041 14.4102L1.02794 16.0762C0.24177 16.3372 -0.184135 17.1864 0.0767727 17.9727C0.337751 18.7588 1.18704 19.1847 1.97326 18.9238L7.3297 17.1455C7.55022 17.0723 7.75096 16.9491 7.91564 16.7852L11.2154 13.5L12.3707 20.4004L5.96056 25.1865C5.5814 25.4696 5.35809 25.9155 5.35802 26.3887V33.5C5.35802 34.3284 6.0296 35 6.85802 35C7.68632 34.9998 8.35802 34.3283 8.35802 33.5V27.1406L14.8981 22.2578C15.3482 21.9217 15.5728 21.3617 15.4801 20.8076L14.0533 12.2842L19.6432 13.3965V17.5C19.6432 18.3283 20.3149 18.9998 21.1432 19C21.9716 19 22.6432 18.3284 22.6432 17.5ZM10.1432 3.27734C10.1433 3.20598 10.1725 3.13649 10.2252 3.08398C10.2783 3.0312 10.3514 3 10.4293 3C10.5072 3.00004 10.5804 3.03118 10.6334 3.08398C10.6861 3.13648 10.7144 3.20601 10.7145 3.27734C10.7145 3.34885 10.6863 3.41907 10.6334 3.47168C10.5804 3.52449 10.5072 3.55563 10.4293 3.55566C10.3515 3.55566 10.2783 3.52443 10.2252 3.47168C10.1724 3.41907 10.1432 3.34885 10.1432 3.27734ZM7.14318 3.27734C7.14318 4.14873 7.49122 4.98349 8.10802 5.59766C8.72472 6.21161 9.56004 6.55566 10.4293 6.55566C11.2985 6.55563 12.1339 6.21158 12.7506 5.59766C13.3673 4.9835 13.7145 4.14867 13.7145 3.27734C13.7144 2.4062 13.3672 1.57205 12.7506 0.958008C12.1339 0.344082 11.2985 3.67016e-05 10.4293 0C9.56004 0 8.72472 0.344049 8.10802 0.958008C7.49135 1.57207 7.14329 2.40614 7.14318 3.27734Z" fill="#8B7359"/>
  </Svg>
);

const IconGoBack: React.FC = () => (
  <Svg width={26} height={24} viewBox="0 0 36 34" fill="none">
    <Path d="M28.2352 28.625C28.2352 27.996 28.4851 27.3919 28.9315 26.9463C29.378 26.5007 29.9845 26.2501 30.6171 26.25C31.2498 26.25 31.857 26.5006 32.3036 26.9463C32.75 27.3919 32.9999 27.9961 32.9999 28.625C32.9999 29.2539 32.75 29.8581 32.3036 30.3037C31.857 30.7494 31.2498 31 30.6171 31C29.9845 30.9999 29.378 30.7493 28.9315 30.3037C28.4851 29.8581 28.2352 29.254 28.2352 28.625ZM4.94128 28.625C4.94128 27.996 5.19111 27.3919 5.63757 26.9463C6.08406 26.5007 6.69049 26.2501 7.32312 26.25C7.95572 26.25 8.56214 26.5008 9.00867 26.9463C9.45513 27.3919 9.70593 27.996 9.70593 28.625C9.70593 29.254 9.45513 29.8581 9.00867 30.3037C8.56214 30.7492 7.95572 31 7.32312 31C6.69049 30.9999 6.08406 30.7493 5.63757 30.3037C5.19111 29.8581 4.94128 29.254 4.94128 28.625ZM2.55945 10.126C1.97312 9.54076 1.02359 9.54162 0.438354 10.1279C-0.146868 10.7143 -0.146005 11.6638 0.440308 12.249L6.26355 18.0615C6.84907 18.6459 7.79713 18.6459 8.38269 18.0615L14.2069 12.249C14.793 11.6638 14.7938 10.7142 14.2089 10.1279C13.6237 9.54165 12.6741 9.54092 12.0878 10.126L8.82312 13.3838V13.125C8.82312 10.4406 9.89217 7.86582 11.7948 5.9668C13.6975 4.06772 16.2785 3 18.9706 3C21.6626 3.00003 24.2437 4.0677 26.1464 5.9668C28.049 7.86582 29.1171 10.4406 29.1171 13.125V17C29.1171 17.8283 29.7888 18.4998 30.6171 18.5C31.4455 18.5 32.1171 17.8284 32.1171 17V13.125C32.1171 9.64312 30.7314 6.30397 28.2655 3.84277C25.7998 1.38194 22.4563 3.02478e-05 18.9706 0C15.4847 0 12.1405 1.38168 9.67468 3.84277C7.20882 6.30397 5.82312 9.64312 5.82312 13.125V13.3828L2.55945 10.126ZM25.2352 28.625C25.2352 30.0514 25.8027 31.419 26.8124 32.4268C27.8219 33.4343 29.1907 33.9999 30.6171 34C32.0436 34 33.4131 33.4345 34.4227 32.4268C35.4323 31.419 35.9999 30.0514 35.9999 28.625C35.9999 27.1986 35.4323 25.831 34.4227 24.8232C33.4131 23.8155 32.0436 23.25 30.6171 23.25C29.1907 23.2501 27.8219 23.8157 26.8124 24.8232C25.8027 25.831 25.2352 27.1986 25.2352 28.625ZM1.94128 28.625C1.94128 30.0515 2.50874 31.419 3.51843 32.4268C4.52797 33.4344 5.89665 33.9999 7.32312 34C8.74969 34 10.1192 33.4345 11.1288 32.4268C12.1384 31.419 12.7059 30.0514 12.7059 28.625C12.7059 27.1986 12.1384 25.831 11.1288 24.8232C10.1192 23.8155 8.74969 23.25 7.32312 23.25C5.89665 23.2501 4.52797 23.8156 3.51843 24.8232C2.50874 25.831 1.94128 27.1985 1.94128 28.625Z" fill="#8B7359"/>
  </Svg>
);

// ── Main component ────────────────────────────────────────────


const GameScreen: React.FC<GameScreenProps> = ({ navigation, route }) => {
  const { gameState, isAIThinking, winPath, placeTile, goBack, resign, resetGame, startLocalGame, syncOnlineState } = useGameStore();
  const { user } = useAuthStore();
  const { t } = useI18n();
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [forfeitModal, setForfeitModal] = useState<{ reason: 'fled' | 'timeout_abandon'; rivalName: string; isWinner: boolean } | null>(null);
  const [goBackBanner, setGoBackBanner] = useState(false);
  const goBackBannerAnim = useRef(new Animated.Value(0)).current;
  const goBackBannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [rivalDisplayName, setRivalDisplayName] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [turnSeconds, setTurnSeconds] = useState(0);
  const [cyanMs, setCyanMs] = useState(0);
  const [orangeMs, setOrangeMs] = useState(0);
  const cyanStartRef   = useRef<number | null>(null);
  const orangeStartRef = useRef<number | null>(null);
  // Cell-first flow: select cell → rack shows valid tiles → tap tile to place
  const [selectedPos, setSelectedPos] = useState<BoardPosition | null>(null);
  const [validTypesForSelected, setValidTypesForSelected] = useState<TileType[]>([]);
  const [cyanAvatarConfig, setCyanAvatarConfig] = useState<any>(null);
  const [orangeAvatarConfig, setOrangeAvatarConfig] = useState<any>(null);
  const resultScale  = useRef(new Animated.Value(0.5)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const { loadAd, showAd } = useInterstitialAd();

  // ── Online sync ───────────────────────────────────────────
  const isOnline = route?.params?.online === true;
  const onlineMatchId: string | undefined = route?.params?.matchId;
  const watchUnsubRef = useRef<(() => void) | null>(null);

  // Reset forfeit modal whenever a new game session starts
  useEffect(() => { setForfeitModal(null); }, [onlineMatchId]);

  // Online presence: manage status based on game session phase
  useEffect(() => {
    if (!user?.uid) return;
    
    // We are 'playing' only if the game is active and we haven't shown any finish modal (like forfeit)
    const isPlaying = gameState?.phase === GamePhase.ACTIVE && !forfeitModal;
    
    setUserStatus(user.uid, isPlaying ? 'playing' : 'free');

    return () => { 
      // Always revert to 'free' when leaving the screen
      setUserStatus(user.uid, 'free'); 
    };
  }, [user?.uid, gameState?.phase, !!forfeitModal]);

  useEffect(() => {
    if (!isOnline || !onlineMatchId || !user) return;
    watchUnsubRef.current = watchMatch(onlineMatchId, (data) => {
      // Extract rival's display name from match document
      const isCyan = data.playerCyanId === user.uid;
      const rivalName = isCyan ? data.playerOrangeName : data.playerCyanName;
      if (rivalName && !rivalDisplayName) setRivalDisplayName(rivalName);

      // Sincronizar configuraciones de avatar para colores personalizados
      if (data.playerCyanAvatarConfig) setCyanAvatarConfig(data.playerCyanAvatarConfig);
      if (data.playerOrangeAvatarConfig) setOrangeAvatarConfig(data.playerOrangeAvatarConfig);

      // Forfeit: show modal to the winner OR to the loser if they timed out
      if (data.status === 'forfeited') {
        const isWinner = data.winnerId === user.uid;
        const isLoser  = data.loserId  === user.uid;
        if (isWinner || (isLoser && data.endReason === 'timeout_abandon')) {
          watchUnsubRef.current?.();
          setForfeitModal({ reason: data.endReason, rivalName: rivalName ?? 'Rival', isWinner });
          return;
        }
      }

      if (!data.gameStateJson) return;
      try {
        const remote = JSON.parse(data.gameStateJson) as GameState;
        const myColor =
          gameState?.playerCyanId === user.uid ? PlayerColor.CYAN : PlayerColor.ORANGE;

        // Opponent used goBack — always sync and show banner
        if (data.goBackBy && data.goBackBy !== user.uid) {
          syncOnlineState(remote);
          // Show banner for 3 seconds
          if (goBackBannerTimer.current) clearTimeout(goBackBannerTimer.current);
          setGoBackBanner(true);
          Animated.sequence([
            Animated.timing(goBackBannerAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.delay(2400),
            Animated.timing(goBackBannerAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
          ]).start();
          goBackBannerTimer.current = setTimeout(() => setGoBackBanner(false), 3000);
          return;
        }

        if (remote.currentTurn === myColor || remote.phase !== GamePhase.ACTIVE) {
          syncOnlineState(remote);
        }
      } catch { /* ignore parse errors */ }
    });
    return () => watchUnsubRef.current?.();
  }, [isOnline, onlineMatchId, user?.uid]);

  const humanColor = isOnline && gameState?.playerOrangeId === user?.uid
    ? PlayerColor.ORANGE
    : PlayerColor.CYAN;
  const isMyTurn = gameState
    ? gameState.phase === GamePhase.ACTIVE && gameState.currentTurn === humanColor
    : false;
  const isCyanTurn = gameState?.currentTurn === PlayerColor.CYAN;

  // Global timer (for bottom bar display)
  useEffect(() => {
    if (!gameState || gameState.phase !== GamePhase.ACTIVE) return;
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [gameState?.phase]);

  // Per-turn timer — resets each time the turn changes
  useEffect(() => {
    setTurnSeconds(0);
    if (!gameState || gameState.phase !== GamePhase.ACTIVE) return;
    const id = setInterval(() => setTurnSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [gameState?.currentTurn, gameState?.phase]);

  // Per-player time tracking via timestamps (ms-accurate)
  useEffect(() => {
    if (!gameState) return;
    const now = Date.now();

    if (gameState.phase !== GamePhase.ACTIVE) {
      // Game ended — flush any open turn into its bucket
      if (cyanStartRef.current !== null) {
        const elapsed = now - cyanStartRef.current;
        cyanStartRef.current = null;
        setCyanMs(ms => ms + elapsed);
      }
      if (orangeStartRef.current !== null) {
        const elapsed = now - orangeStartRef.current;
        orangeStartRef.current = null;
        setOrangeMs(ms => ms + elapsed);
      }
      return;
    }

    if (gameState.currentTurn === PlayerColor.CYAN) {
      // Flush bot turn if open
      if (orangeStartRef.current !== null) {
        const elapsed = now - orangeStartRef.current;
        orangeStartRef.current = null;
        setOrangeMs(ms => ms + elapsed);
      }
      cyanStartRef.current = now;
    } else {
      // Flush human turn if open
      if (cyanStartRef.current !== null) {
        const elapsed = now - cyanStartRef.current;
        cyanStartRef.current = null;
        setCyanMs(ms => ms + elapsed);
      }
      orangeStartRef.current = now;
    }
  }, [gameState?.currentTurn, gameState?.phase]);

  // Haptic feedback on game end
  useEffect(() => {
    if (gameState?.phase === GamePhase.FINISHED) {
      const isWin = gameState.winner === humanColor;
      const isDraw = !gameState.winner;
      if (!isDraw) { isWin ? hapticWin() : hapticLose(); }
      
      // Ads: Load ad and increment counter when game ends
      incrementGameCount();
      loadAd();
    }
  }, [gameState?.phase]);

  // Haptic on turn change (opponent finished their move)
  const prevTurnRef = useRef<PlayerColor | null>(null);
  useEffect(() => {
    if (!gameState || gameState.phase !== GamePhase.ACTIVE) return;
    if (prevTurnRef.current !== null && prevTurnRef.current !== gameState.currentTurn) {
      if (gameState.currentTurn === humanColor) hapticTurnChange();
    }
    prevTurnRef.current = gameState.currentTurn;
  }, [gameState?.currentTurn]);

  // Result modal
  useEffect(() => {
    if (gameState?.phase === GamePhase.FINISHED && !showResultModal) {
      setTimeout(() => {
        setShowResultModal(true);
        Animated.parallel([
          Animated.spring(resultScale,  { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
          Animated.timing(resultOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();
      }, 800);
    }
  }, [gameState?.phase]);

  // 1. Player taps a cell → select it and compute valid tile types
  const handleCellPress = (pos: BoardPosition, validTypes: TileType[]) => {
    if (validTypes.length === 0) { hapticInvalidMove(); return; }
    if (!isMyTurn) return;
    const isSame = selectedPos?.row === pos.row && selectedPos?.col === pos.col;
    if (isSame) {
      setSelectedPos(null);
      setValidTypesForSelected([]);
    } else {
      setSelectedPos(pos);
      setValidTypesForSelected(validTypes);
      hapticSelect();
    }
  };

  // 2. Player taps a rack tile → place it at the selected cell
  const handleRackPress = (type: TileType) => {
    if (!selectedPos || !validTypesForSelected.includes(type)) { hapticInvalidMove(); return; }
    const pos = selectedPos;
    setSelectedPos(null);
    setValidTypesForSelected([]);
    hapticTilePlaced();
    placeTile(pos, type);
  };

  const getRivalUid = () => {
    if (!gameState || !user) return null;
    return gameState.playerCyanId === user.uid ? gameState.playerOrangeId : gameState.playerCyanId;
  };

  const handleResign = async () => {
    setShowResignConfirm(false);
    // Unsubscribe before writing so the snapshot doesn't fire back to this screen
    watchUnsubRef.current?.();
    watchUnsubRef.current = null;
    if (isOnline && onlineMatchId && user) {
      const rivalUid = getRivalUid();
      if (rivalUid) {
        try { await forfeitMatch(onlineMatchId, user.uid, rivalUid, 'fled'); } catch { /* ignore */ }
      }
    }
    resign();
  };

  // Abandon: opponent took too long — abandoning player WINS
  const handleAbandon = async () => {
    // Unsubscribe before writing so the snapshot doesn't fire back to this screen
    watchUnsubRef.current?.();
    watchUnsubRef.current = null;
    if (isOnline && onlineMatchId && user) {
      const rivalUid = getRivalUid();
      if (rivalUid) {
        try { await forfeitMatch(onlineMatchId, user.uid, rivalUid, 'timeout_abandon'); } catch { /* ignore */ }
      }
    }
    resetGame();
    navigation.navigate('Home');
  };
  
  const handlePlayAgain = async () => {
    setShowResultModal(false);
    setSelectedPos(null);
    setValidTypesForSelected([]);
    setSeconds(0);
    setCyanMs(0);
    setOrangeMs(0);
    cyanStartRef.current = null;
    orangeStartRef.current = null;

    // Show interstitial before starting a new game if capping allows
    await showAd();

    startLocalGame(gameState?.botDifficulty ?? BotDifficulty.MEDIUM);
  };

  const handleGoHome = async () => {
    setShowResultModal(false);
    
    // Show interstitial before leaving if capping allows
    await showAd();
    
    resetGame();
    navigation.navigate('Home');
  };

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;

  if (!gameState) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  const isWinner = gameState.winner === humanColor;
  const isDraw   = gameState.phase === GamePhase.FINISHED && !gameState.winner;

  const youLabel   = t('game.you');
  const rivalLabel = gameState.matchType === MatchType.VS_BOT
    ? 'Bot'
    : (rivalDisplayName ?? 'Rival');


  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* ── Header ───────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>
            <Text style={styles.logoPath}>PATH</Text>
            <Text style={styles.logoRix}>RIX</Text>
          </Text>
          <Text style={styles.logoSub}>Path connection strategy</Text>
        </View>
      </View>

      {/* ── ADS ──────────────────────────────────────────── */}
      <BannerAdWidget type="game" />

      {(() => {
        // --- Seguridad de Color: Detector de Camuflaje ---
        const hexToRgb = (hex: string) => {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return { r, g, b };
        };
        const getColorDistance = (c1: string, c2: string) => {
          const rgb1 = hexToRgb(c1);
          const rgb2 = hexToRgb(c2);
          return Math.sqrt(
            Math.pow(rgb1.r - rgb2.r, 2) +
            Math.pow(rgb1.g - rgb2.g, 2) +
            Math.pow(rgb1.b - rgb2.b, 2)
          );
        };
        const COLOR_CONFLICT_THRESHOLD = 75;

        // En online, usamos la config que viene del servidor. En local, la del humano.
        const configCyan = isOnline ? cyanAvatarConfig : (humanColor === PlayerColor.CYAN ? user?.avatarConfig : null);
        const configOrange = isOnline ? orangeAvatarConfig : (humanColor === PlayerColor.ORANGE ? user?.avatarConfig : null);

        // --- Lógica de asignación simétrica con validación de contraste ---
        const colorCianBase = configCyan?.color || Colors.cyan;
        const isConflictCian = configCyan?.useCustomTileColor && getColorDistance(colorCianBase, Colors.orange) < COLOR_CONFLICT_THRESHOLD;
        const customCyan = (configCyan?.useCustomTileColor && !isConflictCian) ? colorCianBase : undefined;

        const colorOrangeBase = configOrange?.color || Colors.orange;
        const isConflictOrange = configOrange?.useCustomTileColor && getColorDistance(colorOrangeBase, Colors.cyan) < COLOR_CONFLICT_THRESHOLD;
        const customOrange = (configOrange?.useCustomTileColor && !isConflictOrange) ? colorOrangeBase : undefined;

        const badgeColorYou = (humanColor === PlayerColor.CYAN ? (customCyan || Colors.cyan) : (customOrange || Colors.orange));
        const badgeColorRival = (humanColor === PlayerColor.CYAN ? (customOrange || Colors.orange) : (customCyan || Colors.cyan));
        const textColorYou = (humanColor === PlayerColor.CYAN ? (customCyan ? Colors.textPrimary : Colors.textOnCyan) : (customOrange ? Colors.textPrimary : Colors.textOnOrange));
        const textColorRival = (humanColor === PlayerColor.CYAN ? (customOrange ? Colors.textPrimary : Colors.textOnOrange) : (customCyan ? Colors.textPrimary : Colors.textOnCyan));

        return (
          <>
            {/* ── Board ────────────────────────────────────────── */}
            <GameBoard
              gameState={gameState}
              onCellPress={handleCellPress}
              selectedPos={selectedPos}
              isMyTurn={isMyTurn}
              winPath={winPath}
              winner={gameState.winner}
              disabled={isAIThinking || gameState.phase !== GamePhase.ACTIVE || (isOnline && !isMyTurn)}
              customCyanColor={customCyan}
              customOrangeColor={customOrange}
            />

            {/* ── Go Back banner (shown to opponent) ─────────────── */}
            {goBackBanner && (
              <Animated.View style={[styles.goBackBanner, { opacity: goBackBannerAnim }]}>
                <IconGoBack />
                <Text style={styles.goBackBannerText}>
                  {t('game.goBack.banner').replace('{rival}', rivalDisplayName ?? t('game.rival'))}
                </Text>
              </Animated.View>
            )}

            {/* ── Rack + Player row ── */}
            <View style={styles.rackWrapper}>
              {gameState.phase === GamePhase.ACTIVE && !isMyTurn && (
                <View style={[styles.turnFloating, { flexDirection: 'column', gap: 8 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <View style={styles.turnBarLeft}>
                      <View style={[
                        styles.turnDot, 
                        { backgroundColor: gameState.currentTurn === PlayerColor.CYAN ? (customCyan || Colors.cyan) : (customOrange || Colors.orange) }
                      ]} />
                      <Text style={styles.turnName} numberOfLines={1}>{rivalLabel} está jugando</Text>
                    </View>
                    <Text style={[
                      styles.turnTimer, 
                      turnSeconds >= 60 && { color: Colors.error, fontWeight: '800' }
                    ]}>
                      {formatTime(turnSeconds)}
                    </Text>
                  </View>
                  
                  {isOnline && turnSeconds >= 60 && (
                    <TouchableOpacity 
                      style={[styles.abandonBtn, { width: '100%', alignItems: 'center' }]} 
                      onPress={handleAbandon} 
                      activeOpacity={0.7}
                    >
                      <Text style={styles.abandonBtnText}>{t('game.abandon')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              <View style={styles.rackArea}>
                <View style={styles.tileRow}>
                  {([
                    { rot: 0,   type: TileType.TYPE_B },
                    { rot: 90,  type: TileType.TYPE_B_90 },
                    { rot: 180, type: TileType.TYPE_B_180 },
                    { rot: 270, type: TileType.TYPE_B_270 },
                  ] as const).map(({ rot, type }) => {
                    const canPlace = selectedPos && validTypesForSelected.includes(type);
                    return (
                      <View key={rot} style={[styles.rackTile, { width: TILE_S, height: TILE_S }, !canPlace && styles.rackTileDim, canPlace && styles.rackTileSelected]}>
                        <TilePainter 
                          type={type} 
                          size={TILE_S} 
                          customCyanColor={customCyan}
                          customOrangeColor={customOrange}
                        />
                        <TouchableOpacity
                          style={[StyleSheet.absoluteFill, { zIndex: 1 }]}
                          onPress={() => handleRackPress(type)}
                          activeOpacity={0.5}
                        />
                      </View>
                    );
                  })}
                </View>

                <View style={styles.tileRow}>
                  <View style={[
                    styles.playerBadge, 
                    { backgroundColor: badgeColorYou, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
                    !isCyanTurn && { opacity: 0.45 }
                  ]}>
                    <Text style={[styles.youText, { color: textColorYou }]}>{youLabel}</Text>
                  </View>

                  {([
                    { rot: 0,  type: TileType.TYPE_A },
                    { rot: 90, type: TileType.TYPE_A_90 },
                  ] as const).map(({ rot, type }) => {
                    const canPlace = selectedPos && validTypesForSelected.includes(type);
                    return (
                      <View key={rot} style={[styles.rackTile, { width: TILE_S, height: TILE_S }, !canPlace && styles.rackTileDim, canPlace && styles.rackTileSelected]}>
                        <TilePainter 
                          type={type} 
                          size={TILE_S} 
                          customCyanColor={customCyan}
                          customOrangeColor={customOrange}
                        />
                        <TouchableOpacity
                          style={[StyleSheet.absoluteFill, { zIndex: 1 }]}
                          onPress={() => handleRackPress(type)}
                          activeOpacity={0.5}
                        />
                      </View>
                    );
                  })}

                  <View style={[
                    styles.playerBadge, 
                    { backgroundColor: badgeColorRival, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
                    isCyanTurn && { opacity: 0.45 }
                  ]}>
                    <Text style={[styles.rivalText, { color: textColorRival }]}>
                      {(rivalDisplayName || rivalLabel).slice(0, 3).toUpperCase()}
                    </Text>
                    {(isAIThinking || (isOnline && !isMyTurn && gameState?.phase === GamePhase.ACTIVE)) && (
                      <ActivityIndicator
                        size="small"
                        color={textColorRival}
                        style={{ position: 'absolute', top: 4, right: 4, transform: [{ scale: 0.6 }] }}
                      />
                    )}
                  </View>
                </View>
              </View>
            </View>
          </>
        );
      })()}

      {/* ── Bottom bar ───────────────────────────────────── */}
      <View style={styles.bottomBarWrapper}>
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.bottomBtn} onPress={() => setShowResignConfirm(true)} activeOpacity={0.7}>
            <IconFlee />
            <Text style={styles.bottomBtnLabel}>Huir</Text>
          </TouchableOpacity>

          <Text style={styles.timer}>{formatTime(seconds)}</Text>

          {(() => {
            const myGoBackUsed = humanColor === PlayerColor.CYAN
              ? gameState.cyanGoBackUsed
              : gameState.orangeGoBackUsed;
            const opponentColor = humanColor === PlayerColor.CYAN ? PlayerColor.ORANGE : PlayerColor.CYAN;
            const opponentHasMoved = gameState.moveHistory.some(r => r.placedBy === opponentColor && !r.wasForced);
            const canGoBack = !myGoBackUsed && isMyTurn && gameState.phase === GamePhase.ACTIVE && opponentHasMoved;
            return (
              <TouchableOpacity
                style={[styles.bottomBtn, !canGoBack && styles.bottomBtnUsed]}
                onPress={() => goBack(user?.uid)}
                activeOpacity={0.7}
                disabled={!canGoBack}
              >
                <IconGoBack />
                <Text style={[styles.bottomBtnLabel, !canGoBack && styles.bottomBtnLabelUsed]}>{t('game.goBack')}</Text>
              </TouchableOpacity>
            );
          })()}
        </View>
      </View>

      {/* ── Resign modal ─────────────────────────────────── */}
      <ConfirmModal
        visible={showResignConfirm}
        title={t('game.resign')}
        message={t('game.resign.confirm') + ' ' + t('game.resign.body')}
        confirmLabel={t('game.resign.yes')}
        cancelLabel={t('game.resign.no')}
        onConfirm={handleResign}
        onCancel={() => setShowResignConfirm(false)}
        isDestructive
      />

      {/* ── Result overlay (glass, no modal — board stays visible) ── */}
      {showResultModal && (
        <Animated.View style={[styles.resultOverlay, { opacity: resultOpacity }]}>
          <Animated.View style={[styles.resultCard, { transform: [{ scale: resultScale }] }]}>
            <Text style={styles.resultEmoji}>{isDraw ? '🤝' : isWinner ? '🏆' : '😞'}</Text>
            <Text style={[styles.resultTitle, { color: isDraw ? Colors.warning : isWinner ? Colors.success : Colors.error }]}>
              {isDraw ? 'Draw!' : isWinner ? 'You Win!' : 'You Lose'}
            </Text>
            {gameState.result && (
              <Text style={styles.resultSubtitle}>
                {gameState.result === 'loopWin' && '🔄 Loop completed!'}
                {gameState.result === 'edgeWin' && '↔ Edge connected!'}
                {gameState.result === 'resign'  && '🏳 Opponent resigned'}
              </Text>
            )}
            {winPath.length > 0 && (() => {
              const rows = winPath.map(p => p.row);
              const cols = winPath.map(p => p.col);
              const minR = Math.min(...rows), maxR = Math.max(...rows);
              const minC = Math.min(...cols), maxC = Math.max(...cols);
              const gridRows = maxR - minR + 1;
              const gridCols = maxC - minC + 1;
              const MINI = Math.min(34, Math.floor(220 / Math.max(gridRows, gridCols)));
              const winSet = new Set(winPath.map(p => `${p.row}_${p.col}`));
              const winnerColor = gameState.winner === PlayerColor.CYAN ? 'rgba(251,251,251,0.12)' : 'rgba(164,95,52,0.18)';
              const winnerBorder = gameState.winner === PlayerColor.CYAN ? 'rgba(251,251,251,0.3)' : 'rgba(164,95,52,0.5)';
              return (
                <View style={{ gap: 2, marginVertical: 4, padding: 6, borderRadius: 10, backgroundColor: winnerColor, borderWidth: 1, borderColor: winnerBorder }}>
                  {Array.from({ length: gridRows }, (_, ri) => (
                    <View key={ri} style={{ flexDirection: 'row', gap: 2 }}>
                      {Array.from({ length: gridCols }, (_, ci) => {
                        const r = minR + ri, c = minC + ci;
                        const key = `${r}_${c}`;
                        const tile = gameState.board[key];
                        const inPath = winSet.has(key);
                        return (
                          <View key={ci} style={{ width: MINI, height: MINI, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.03)', overflow: 'hidden' }}>
                            {inPath && tile && <TilePainter type={tile.type} size={MINI} />}
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
              );
            })()}
            <View style={styles.resultStats}>
              <View style={styles.resultStat}>
                <Text style={styles.resultStatValue}>{gameState.moveCount}</Text>
                <Text style={styles.resultStatLabel}>Moves</Text>
              </View>
              <View style={styles.resultStat}>
                <Text style={[styles.resultStatValue, { color: Colors.cyan }]}>{formatTime(Math.round(cyanMs / 1000))}</Text>
                <Text style={styles.resultStatLabel}>You</Text>
              </View>
              <View style={styles.resultStat}>
                <Text style={[styles.resultStatValue, { color: Colors.orange }]}>{formatTime(Math.round(orangeMs / 1000))}</Text>
                <Text style={styles.resultStatLabel}>Bot</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.resultBtnPrimary} onPress={handlePlayAgain}>
              <Text style={styles.resultBtnPrimaryText}>Play Again</Text>
            </TouchableOpacity>

            {/* View Profile Action (Random matches only) */}
            {isOnline && gameState?.matchType === MatchType.VS_RANDOM && (
              <TouchableOpacity 
                style={[styles.resultBtnPrimary, { backgroundColor: 'rgba(255,255,255,0.14)', flexDirection: 'row', gap: 12, marginTop: 12, borderColor: 'rgba(255,255,255,0.25)', borderWidth: 1 }]} 
                onPress={() => {
                  const myColor = gameState.playerCyanId === user?.uid ? PlayerColor.CYAN : PlayerColor.ORANGE;
                  const rivalUid = myColor === PlayerColor.CYAN ? gameState.playerOrangeId : gameState.playerCyanId;
                  if (rivalUid) navigation.navigate('Profile', { userId: rivalUid });
                }}
              >
                <Ionicons name="person-outline" size={22} color="#fff" />
                <Text style={styles.resultBtnPrimaryText}>{t('game.viewProfile')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.resultBtnSecondary} onPress={handleGoHome}>
              <Text style={styles.resultBtnSecondaryText}>Back to Home</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      )}

      {/* ── Forfeit modal (shown to the opponent) ────────────── */}
      <Modal visible={!!forfeitModal} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmCard}>
            {forfeitModal?.reason === 'fled' ? (
              <>
                <View style={{ transform: [{ scale: 1.8 }], marginBottom: 12 }}><IconFlee /></View>
                <Text style={styles.confirmTitle}>{t('game.forfeit.fled.title')}</Text>
                <Text style={styles.confirmText}>
                  {t('game.forfeit.fled.body').replace('{rival}', forfeitModal.rivalName)}
                </Text>
              </>
            ) : forfeitModal?.isWinner ? (
              <>
                <Ionicons name="time-outline" size={52} color={Colors.warning} />
                <Text style={styles.confirmTitle}>{t('game.forfeit.timeout.title')}</Text>
                <Text style={styles.confirmText}>
                  {t('game.forfeit.timeout.body').replace('{rival}', forfeitModal.rivalName)}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="hourglass-outline" size={52} color={Colors.error} />
                <Text style={styles.confirmTitle}>{t('game.forfeit.timeout.lost.title')}</Text>
                <Text style={styles.confirmText}>{t('game.forfeit.timeout.lost.body')}</Text>
              </>
            )}
            <TouchableOpacity
              style={{ backgroundColor: Colors.success, marginTop: Spacing.md, alignSelf: 'stretch', padding: Spacing.md, borderRadius: Radius.lg, alignItems: 'center' }}
              onPress={() => { setForfeitModal(null); resetGame(); navigation.navigate('Home'); }}
            >
              <Text style={[styles.resignBtnText, { color: '#fff' }]}>{t('game.backHome')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000' },
  loading:  { flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    marginBottom: 2,
  },
  logo: { fontSize: 30, letterSpacing: 2.1 },
  logoPath: { color: '#ffffff', fontFamily: 'SairaStencilOne_400Regular' },
  logoRix:  { color: Colors.orange, fontFamily: 'SairaStencilOne_400Regular' },
  logoSub:  { color: Colors.textMuted, fontSize: Typography.xs, letterSpacing: 1.5, marginTop: 2 },
  moveCounter: { color: Colors.textMuted, fontSize: Typography.sm, marginTop: 4 },

  // ADS
  adBanner: {
    backgroundColor: '#000000',
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  adText: { color: '#444444', fontSize: Typography.xxl, fontWeight: '600', letterSpacing: 10 },

  // Board
  boardWrapper: { flex: 1 },

  // Rack + player rows
  rackArea: {
    paddingHorizontal: RACK_PAD,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    gap: RACK_GAP,
  },
  tileRow: {
    flexDirection: 'row',
    gap: RACK_GAP,
  },
  rackRow: {
    justifyContent: 'center',
    gap: RACK_GAP * 4,
  },
  rackTile: {
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  rackTileDim: {
    opacity: 0.55,
  },
  rackTileSelected: {
    borderWidth: 2,
    borderColor: '#ffffff',
    borderRadius: 10,
  },
  playerBadge: {
    width: TILE_S,
    height: TILE_S,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  youBadge:   { backgroundColor: Colors.cyan },
  rivalBadge: { backgroundColor: Colors.orange },
  badgeDim:   { opacity: 0.3 },
  youText:    { color: Colors.textOnCyan,    fontWeight: '700', fontSize: Typography.md },
  rivalText:  { color: Colors.textOnOrange,  fontWeight: '700', fontSize: Typography.md },

  // Go Back banner
  goBackBanner: {
    position: 'absolute',
    top: SH * 0.45,
    left: Spacing.xl,
    right: Spacing.xl,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(30,30,30,0.92)', borderWidth: 1,
    borderColor: Colors.orange, borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    zIndex: 20,
  },
  goBackBannerText: { color: Colors.textPrimary, fontSize: Typography.sm, fontWeight: '600', flexShrink: 1 },

  // Turn floating box
  rackWrapper: { position: 'relative' },
  turnFloating: {
    position: 'absolute',
    top: 8,
    left: RACK_PAD,
    right: RACK_PAD,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(18,18,22,0.93)',
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 0.8,
    borderColor: 'rgba(255,255,255,0.14)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  abandonWrapper: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 2,
  },
  turnBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  turnBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  turnDot: { width: 8, height: 8, borderRadius: 4 },
  turnName: { color: Colors.textSecondary, fontSize: Typography.sm, fontWeight: '500', flexShrink: 1 },
  turnTimer: { color: Colors.textPrimary, fontSize: Typography.sm, fontWeight: '700', minWidth: 40, textAlign: 'right' },
  abandonBtn: { backgroundColor: 'rgba(220,50,50,0.18)', borderWidth: 1, borderColor: 'rgba(220,50,50,0.5)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: Radius.full },
  abandonBtnText: { color: Colors.error, fontSize: Typography.sm, fontWeight: '700' },

  // Bottom bar
  bottomBarWrapper: { alignItems: 'center', paddingBottom: 20, paddingTop: 8 },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    ...glassStyle,
    backgroundColor: 'rgba(30, 30, 30, 0.75)',
    borderRadius: Radius.full,
    paddingVertical: 10,
    paddingHorizontal: Spacing.xl,
    gap: 40,
  },
  bottomBtn: { alignItems: 'center', gap: 3 },
  bottomBtnLabel: { color: Colors.textSecondary, fontSize: Typography.xs },
  bottomBtnUsed: { opacity: 0.3 },
  bottomBtnLabelUsed: { color: Colors.textMuted },
  timer: { color: Colors.textPrimary, fontSize: Typography.lg, fontWeight: '600', minWidth: 70, textAlign: 'center' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  confirmCard: {
    ...glassStyle,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
    width: '85%',
    maxWidth: 360,
    alignSelf: 'center',
  },
  confirmTitle: { color: Colors.textPrimary, fontSize: Typography.xl, fontWeight: 'bold' },
  confirmText:  { color: Colors.textSecondary, fontSize: Typography.md },
  confirmBtns:  { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  confirmBtn:   { flex: 1, padding: Spacing.md, borderRadius: Radius.lg, alignItems: 'center' },
  cancelBtn:    { ...glassStyle },
  resignBtn:    { backgroundColor: Colors.error },
  cancelBtnText: { color: Colors.textPrimary, fontWeight: '600' },
  resignBtnText: { color: '#fff', fontWeight: '600' },

  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  resultCard: {
    width: '88%',
    maxWidth: 340,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: 'rgba(20,20,20,0.72)',
    borderTopWidth: 0.4,
    borderLeftWidth: 0.4,
    borderBottomWidth: 0.1,
    borderRightWidth: 0.1,
    borderTopColor: 'rgba(255,255,255,0.25)',
    borderLeftColor: 'rgba(255,255,255,0.25)',
    borderBottomColor: 'rgba(255,255,255,0.03)',
    borderRightColor: 'rgba(255,255,255,0.03)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    // @ts-ignore – web only
    backdropFilter: 'blur(20px) saturate(160%)',
    WebkitBackdropFilter: 'blur(20px) saturate(160%)',
  },
  resultEmoji:    { fontSize: 52 },
  resultTitle:    { fontSize: Typography.xxxl, fontWeight: '900' },
  resultSubtitle: { color: Colors.textSecondary, fontSize: Typography.md },
  resultStats:    { flexDirection: 'row', gap: Spacing.xl, marginVertical: Spacing.sm },
  resultStat:     { alignItems: 'center' },
  resultStatValue:{ color: Colors.textPrimary, fontSize: Typography.xxl, fontWeight: 'bold' },
  resultStatLabel:{ color: Colors.textMuted, fontSize: Typography.xs },
  resultBtnPrimary: { backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.md, borderRadius: Radius.full, width: '100%', alignItems: 'center', marginTop: Spacing.sm },
  resultBtnPrimaryText: { color: Colors.textPrimary, fontSize: Typography.lg, fontWeight: '700', letterSpacing: 0.5 },
  resultBtnSecondary: { paddingVertical: Spacing.sm, width: '100%', alignItems: 'center' },
  resultBtnSecondaryText: { color: 'rgba(255,255,255,0.45)', fontSize: Typography.sm, letterSpacing: 0.5 },
});

export default GameScreen;
