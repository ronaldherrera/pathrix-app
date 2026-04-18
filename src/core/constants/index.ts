// ============================================================
// PATHRIX - App Constants
// ============================================================

// Board
export const MAX_BOARD_SIZE = 20;
export const INITIAL_BOARD_ROW = 0;
export const INITIAL_BOARD_COL = 0;

// Gameplay
export const ONLINE_TURN_TIMEOUT_SECONDS = 120; // 2 minutes per turn
export const AI_MOVE_DELAY_MS = 300;            // Minimum delay before AI plays
export const FORCED_MOVE_ANIMATION_MS = 200;    // Delay between forced placements

// ELO
export const INITIAL_ELO = 1200;
export const K_FACTOR_NEW = 32;   // < 30 games
export const K_FACTOR_MID = 24;   // 30-100 games
export const K_FACTOR_OLD = 16;   // > 100 games

// Matchmaking ELO ranges (expands over time)
export const MATCHMAKING_ELO_RANGE_10S = 100;
export const MATCHMAKING_ELO_RANGE_30S = 200;
export const MATCHMAKING_ELO_RANGE_60S = 500;

// Ads
export const AD_GAMES_BETWEEN_INTERSTITIALS = 3;

// Challenges
export const CHALLENGE_EXPIRY_HOURS = 24;

// Chat
export const MAX_CHAT_MESSAGE_LENGTH = 200;

// MCTS
export const MCTS_BUDGET = {
  easy: 40,
  medium: 300,
  hard: 1500,
  expert: 5000,
};

// Ranks ELO thresholds
export const RANK_ELO = {
  BRONZE: 0,
  SILVER: 1100,
  GOLD: 1300,
  PLATINUM: 1500,
  DIAMOND: 1700,
  MASTER: 2000,
};
