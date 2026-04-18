// ============================================================
// PATHRIX - Game Store (Zustand)
// ============================================================

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  GameState,
  BoardPosition,
  PlacementRecord,
  initialGameState,
} from '../../domain/entities';
import {
  TileType,
  PlayerColor,
  BotDifficulty,
  MatchType,
  GamePhase,
} from '../../domain/enums';
import { useAuthStore } from './authStore';
import { GameEngine, MoveResult } from '../../game-engine/GameEngine';
import { AIEngine } from '../../game-engine/ai/AIEngine';
import { HumanLearner } from '../../game-engine/ai/HumanLearner';
import { WinResult } from '../../game-engine/rules/WinDetector';
import { writeOnlineMove, updateUserLastMatch, finalizeOnlineMatch } from '../../data/services/FirebaseService';

interface GameStoreState {
  gameState: GameState | null;
  winResult: WinResult | null;
  lastForcedPlacements: PlacementRecord[];
  isAIThinking: boolean;
  winPath: BoardPosition[];

  // Actions
  startLocalGame: (difficulty: BotDifficulty, playerColor?: PlayerColor) => void;
  startOnlineGame: (matchId: string, playerCyanId: string, playerOrangeId: string, matchType: MatchType) => void;
  placeTile: (pos: BoardPosition, type: TileType) => Promise<void>;
  triggerAIMove: (state: GameState) => Promise<void>;
  goBack: (callerUid?: string) => Promise<void>;
  resign: () => void;
  resetGame: () => void;
  syncOnlineState: (newState: GameState) => void;
}

const BOT_ID = 'bot';

export const useGameStore = create<GameStoreState>()(
  immer((set, get) => ({
    gameState: null,
    winResult: null,
    lastForcedPlacements: [],
    isAIThinking: false,
    winPath: [],

    startLocalGame: (difficulty: BotDifficulty, playerColor = PlayerColor.CYAN) => {
      // Load human profile in background (non-blocking)
      HumanLearner.load();
      const playerOrangeId = playerColor === PlayerColor.CYAN ? BOT_ID : 'human';
      const playerCyanId = playerColor === PlayerColor.CYAN ? 'human' : BOT_ID;
      const matchId = `local_${Date.now()}`;

      const state = initialGameState(
        matchId,
        MatchType.VS_BOT,
        playerCyanId,
        playerOrangeId,
        difficulty,
      );

      set(draft => {
        draft.gameState = state;
        draft.winResult = null;
        draft.lastForcedPlacements = [];
        draft.isAIThinking = false;
        draft.winPath = [];
      });

      // If bot plays first (bot is cyan and it's cyan's turn)
      if (playerCyanId === BOT_ID) {
        setTimeout(() => get().triggerAIMove(state), 500);
      }
    },

    startOnlineGame: (matchId, playerCyanId, playerOrangeId, matchType) => {
      const state = initialGameState(matchId, matchType, playerCyanId, playerOrangeId);
      set(draft => {
        draft.gameState = state;
        draft.winResult = null;
        draft.lastForcedPlacements = [];
        draft.isAIThinking = false;
        draft.winPath = [];
      });
    },

    placeTile: async (pos: BoardPosition, type: TileType) => {
      const { gameState } = get();
      if (!gameState || gameState.phase !== GamePhase.ACTIVE) return;

      const result: MoveResult = GameEngine.placeTile(gameState, pos, type);
      if (!result.isValid) return;

      // Record human move for learning (only VS_BOT, only human's turn)
      if (gameState.matchType === MatchType.VS_BOT) {
        const humanColor =
          gameState.playerCyanId !== BOT_ID ? PlayerColor.CYAN : PlayerColor.ORANGE;
        if (gameState.currentTurn === humanColor) {
          HumanLearner.recordMove(gameState, result.newState, pos, type, humanColor);
        }
      }

      set(draft => {
        draft.gameState = result.newState;
        draft.lastForcedPlacements = result.forcedPlacements;
        if (result.winResult) {
          draft.winResult = result.winResult;
          draft.winPath = result.winResult.winPath;

          // Update last match timestamp for ELO decay tracking (Online matches only)
          const isOnline = gameState.matchType === MatchType.VS_RANDOM || gameState.matchType === MatchType.VS_FRIEND;
          const { user } = useAuthStore.getState();
          if (user?.uid && isOnline) {
            updateUserLastMatch(user.uid);
          }

          // Record game result for learning
          if (gameState.matchType === MatchType.VS_BOT) {
            const humanColor =
              gameState.playerCyanId !== BOT_ID ? PlayerColor.CYAN : PlayerColor.ORANGE;
            const humanWon = result.winResult.winner === humanColor;
            const resultKey = humanWon
              ? (result.winResult.result === 'loopWin' ? 'loopWin' : 'edgeWin')
              : 'loss';
            HumanLearner.recordGameResult(resultKey as any);
          }
        }
      });

      // Sync move to Firestore for online games
      const isOnline =
        result.newState.matchType === MatchType.VS_FRIEND ||
        result.newState.matchType === MatchType.VS_RANDOM;
        
      if (isOnline && result.newState.matchId) {
        try {
          await writeOnlineMove(
            result.newState.matchId,
            JSON.stringify(result.newState),
            result.newState.currentTurn,
            !!result.winResult,
          );

          // If someone won naturally, update global stats (ELO, streaks, etc)
          if (result.winResult) {
            const winnerId = result.winResult.winner === PlayerColor.CYAN 
              ? gameState.playerCyanId 
              : gameState.playerOrangeId;
            const loserId = result.winResult.winner === PlayerColor.CYAN 
              ? gameState.playerOrangeId 
              : gameState.playerCyanId;
              
            await finalizeOnlineMatch(result.newState.matchId, winnerId, loserId);
          }
        } catch (err) {
          console.error('[GameStore] Error syncing online move:', err);
        }
      }

      // Trigger AI move if it's a local game and now it's the bot's turn
      const newState = result.newState;
      if (
        newState.phase === GamePhase.ACTIVE &&
        newState.matchType === MatchType.VS_BOT
      ) {
        const isBotTurn =
          (newState.currentTurn === PlayerColor.CYAN   && newState.playerCyanId   === BOT_ID) ||
          (newState.currentTurn === PlayerColor.ORANGE && newState.playerOrangeId === BOT_ID);
        if (isBotTurn) {
          setTimeout(() => get().triggerAIMove(newState), 300);
        }
      }
    },

    triggerAIMove: async (state: GameState) => {
      set(draft => { draft.isAIThinking = true; });

      // Yield 2 frames so React flushes the isAIThinking=true render before blocking
      await new Promise<void>(resolve => setTimeout(resolve, 32));

      // Compute move synchronously
      const move = AIEngine.getBestMove(state, state.botDifficulty ?? BotDifficulty.MEDIUM);

      // Wait a fixed "thinking" delay — animation runs freely during this time
      const THINK_DELAY: Record<BotDifficulty, number> = {
        [BotDifficulty.EASY]:   400,
        [BotDifficulty.MEDIUM]: 400,
        [BotDifficulty.HARD]:   400,
        [BotDifficulty.EXPERT]: 400,
      };
      const delay = THINK_DELAY[state.botDifficulty ?? BotDifficulty.MEDIUM];
      await new Promise<void>(resolve => setTimeout(resolve, delay));

      set(draft => { draft.isAIThinking = false; });

      if (move && get().gameState?.phase === GamePhase.ACTIVE) {
        await get().placeTile(move.pos, move.type);
      }
    },

    goBack: async (callerUid?: string) => {
      const { gameState } = get();
      if (!gameState || gameState.phase !== GamePhase.ACTIVE) return;

      // Determine caller's color
      let callerColor: PlayerColor;
      if (gameState.matchType === MatchType.VS_BOT) {
        callerColor = gameState.playerCyanId !== BOT_ID ? PlayerColor.CYAN : PlayerColor.ORANGE;
      } else {
        // Online: derive from uid
        callerColor = callerUid && gameState.playerOrangeId === callerUid
          ? PlayerColor.ORANGE
          : PlayerColor.CYAN;
      }

      const newState = GameEngine.goBack(gameState, callerColor);
      if (!newState) return;

      set(draft => {
        draft.gameState = newState;
        draft.winResult = null;
        draft.winPath = [];
        draft.lastForcedPlacements = [];
      });

      // Sync to Firestore for online games
      const isOnline =
        newState.matchType === MatchType.VS_FRIEND ||
        newState.matchType === MatchType.VS_RANDOM;
      if (isOnline && newState.matchId) {
        try {
          await writeOnlineMove(
            newState.matchId,
            JSON.stringify(newState),
            newState.currentTurn,
            false,
            callerUid,
          );
        } catch { /* non-blocking */ }
      }
    },

    resign: () => {
      const { gameState } = get();
      if (!gameState) return;

      const humanPlayer =
        gameState.playerCyanId !== BOT_ID ? PlayerColor.CYAN : PlayerColor.ORANGE;

      const newState = GameEngine.resign(gameState, humanPlayer);
      if (gameState.matchType === MatchType.VS_BOT) {
        HumanLearner.recordGameResult('resign');
      }
      set(draft => {
        draft.gameState = newState;
      });
    },

    resetGame: () => {
      set(draft => {
        draft.gameState = null;
        draft.winResult = null;
        draft.lastForcedPlacements = [];
        draft.isAIThinking = false;
        draft.winPath = [];
      });
    },

    syncOnlineState: (newState: GameState) => {
      set(draft => {
        draft.gameState = newState;
      });
    },
  })),
);

