// ============================================================
// PATHRIX - Domain Enums
// ============================================================

export enum PlayerColor {
  CYAN = 'cyan',
  ORANGE = 'orange',
}

export enum TileType {
  TYPE_A    = 'A',    // straight: cyan N-S, orange E-W
  TYPE_A_90 = 'A90',  // straight rotated: cyan E-W, orange N-S
  TYPE_B    = 'B',    // curve: cyan N-E, orange S-W
  TYPE_B_90 = 'B90',  // curve rotated 90°: cyan E-S, orange N-W
  TYPE_B_180= 'B180', // curve rotated 180°: cyan S-W, orange N-E
  TYPE_B_270= 'B270', // curve rotated 270°: cyan N-W, orange E-S
}

export enum TileEdge {
  NORTH = 0,
  EAST = 1,
  SOUTH = 2,
  WEST = 3,
}

export enum GamePhase {
  WAITING = 'waiting',
  ACTIVE = 'active',
  FINISHED = 'finished',
}

export enum GameResult {
  LOOP_WIN = 'loopWin',
  EDGE_WIN = 'edgeWin',
  RESIGN = 'resign',
  TIMEOUT = 'timeout',
  DRAW = 'draw',
}

export enum MatchType {
  VS_BOT = 'vsBot',
  VS_RANDOM = 'vsRandom',
  VS_FRIEND = 'vsFriend',
}

export enum BotDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  EXPERT = 'expert',
}

export enum MatchStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  FINISHED = 'finished',
  ABANDONED = 'abandoned',
}

export enum PlayerRank {
  BRONZE = 'Bronze',
  SILVER = 'Silver',
  GOLD = 'Gold',
  PLATINUM = 'Platinum',
  DIAMOND = 'Diamond',
  MASTER = 'Master',
}
