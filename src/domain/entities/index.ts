// ============================================================
// PATHRIX - Domain Entities
// ============================================================

import { TileType, TileEdge, PlayerColor, GamePhase, GameResult, MatchType, BotDifficulty } from '../enums';

// ── Board ──────────────────────────────────────────────────

export interface BoardPosition {
  row: number;
  col: number;
}

export function posKey(pos: BoardPosition): string {
  return `${pos.row}_${pos.col}`;
}

export function keyToPos(key: string): BoardPosition {
  const [row, col] = key.split('_').map(Number);
  return { row, col };
}

export function posEquals(a: BoardPosition, b: BoardPosition): boolean {
  return a.row === b.row && a.col === b.col;
}

export function adjacentPositions(pos: BoardPosition): BoardPosition[] {
  return [
    { row: pos.row - 1, col: pos.col }, // North
    { row: pos.row, col: pos.col + 1 }, // East
    { row: pos.row + 1, col: pos.col }, // South
    { row: pos.row, col: pos.col - 1 }, // West
  ];
}

/** Returns the edge of pos that faces neighbor, or null if not adjacent */
export function getSharedEdge(pos: BoardPosition, neighbor: BoardPosition): TileEdge | null {
  if (neighbor.row === pos.row - 1 && neighbor.col === pos.col) return TileEdge.NORTH;
  if (neighbor.row === pos.row && neighbor.col === pos.col + 1) return TileEdge.EAST;
  if (neighbor.row === pos.row + 1 && neighbor.col === pos.col) return TileEdge.SOUTH;
  if (neighbor.row === pos.row && neighbor.col === pos.col - 1) return TileEdge.WEST;
  return null;
}

/** Returns the opposite edge */
export function oppositeEdge(edge: TileEdge): TileEdge {
  return (edge + 2) % 4 as TileEdge;
}

// ── Tile ──────────────────────────────────────────────────

export interface Tile {
  row: number;
  col: number;
  type: TileType;
  placedBy: PlayerColor;
  wasForced: boolean;
  moveIndex: number;
}

/**
 * Returns which edges a given color connects on a tile of given type.
 *
 * Type A (Cross/Straight): Cyan → [N, S], Orange → [E, W]
 *   Cyan goes straight top-to-bottom, Orange goes straight left-to-right.
 *
 * Type B (Curved): Cyan → [N, E], Orange → [S, W]
 *   Cyan curves top-to-right (NE quarter arc), Orange curves bottom-to-left (SW quarter arc).
 */
export function getTileConnections(type: TileType, color: PlayerColor): [TileEdge, TileEdge] {
  switch (type) {
    case TileType.TYPE_A:
      return color === PlayerColor.CYAN ? [TileEdge.NORTH, TileEdge.SOUTH] : [TileEdge.EAST, TileEdge.WEST];
    case TileType.TYPE_A_90:
      return color === PlayerColor.CYAN ? [TileEdge.EAST, TileEdge.WEST] : [TileEdge.NORTH, TileEdge.SOUTH];
    case TileType.TYPE_B:
      return color === PlayerColor.CYAN ? [TileEdge.NORTH, TileEdge.EAST] : [TileEdge.SOUTH, TileEdge.WEST];
    case TileType.TYPE_B_90:
      return color === PlayerColor.CYAN ? [TileEdge.EAST, TileEdge.SOUTH] : [TileEdge.NORTH, TileEdge.WEST];
    case TileType.TYPE_B_180:
      return color === PlayerColor.CYAN ? [TileEdge.SOUTH, TileEdge.WEST] : [TileEdge.NORTH, TileEdge.EAST];
    case TileType.TYPE_B_270:
      return color === PlayerColor.CYAN ? [TileEdge.NORTH, TileEdge.WEST] : [TileEdge.EAST, TileEdge.SOUTH];
  }
}

export function getEdgeColor(type: TileType, edge: TileEdge): PlayerColor {
  const [e1, e2] = getTileConnections(type, PlayerColor.CYAN);
  return (edge === e1 || edge === e2) ? PlayerColor.CYAN : PlayerColor.ORANGE;
}

export function getExitEdge(type: TileType, entryEdge: TileEdge): TileEdge {
  const cyanEdges = getTileConnections(type, PlayerColor.CYAN);
  if (entryEdge === cyanEdges[0]) return cyanEdges[1];
  if (entryEdge === cyanEdges[1]) return cyanEdges[0];
  const orangeEdges = getTileConnections(type, PlayerColor.ORANGE);
  if (entryEdge === orangeEdges[0]) return orangeEdges[1];
  return orangeEdges[0];
}

// ── Board Bounds ─────────────────────────────────────────

export interface BoardBounds {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
}

export function initialBounds(): BoardBounds {
  return { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 };
}

export function expandBounds(bounds: BoardBounds, pos: BoardPosition): BoardBounds {
  return {
    minRow: Math.min(bounds.minRow, pos.row),
    maxRow: Math.max(bounds.maxRow, pos.row),
    minCol: Math.min(bounds.minCol, pos.col),
    maxCol: Math.max(bounds.maxCol, pos.col),
  };
}

export function recalculateBounds(board: Record<string, Tile>): BoardBounds {
  const tiles = Object.values(board);
  if (tiles.length === 0) return initialBounds();
  return tiles.reduce<BoardBounds>(
    (acc, tile) => expandBounds(acc, tile),
    { minRow: Infinity, maxRow: -Infinity, minCol: Infinity, maxCol: -Infinity },
  );
}

// ── Placement Record ─────────────────────────────────────

export interface PlacementRecord {
  position: BoardPosition;
  type: TileType;
  placedBy: PlayerColor;
  wasForced: boolean;
  moveIndex: number;
  timestamp: number;
}

// ── Game State ───────────────────────────────────────────

export interface GameState {
  matchId: string;
  board: Record<string, Tile>;          // key = posKey(pos)
  currentTurn: PlayerColor;
  phase: GamePhase;
  result: GameResult | null;
  winner: PlayerColor | null;
  moveHistory: PlacementRecord[];
  moveCount: number;
  bounds: BoardBounds;
  matchType: MatchType;
  botDifficulty: BotDifficulty | null;
  playerCyanId: string;
  playerOrangeId: string;
  lastMoveAt: number;
  cyanGoBackUsed: boolean;
  orangeGoBackUsed: boolean;
}

export function initialGameState(
  matchId: string,
  matchType: MatchType,
  playerCyanId: string,
  playerOrangeId: string,
  botDifficulty: BotDifficulty | null = null,
): GameState {
  return {
    matchId,
    board: {},
    currentTurn: PlayerColor.CYAN,
    phase: GamePhase.ACTIVE,
    result: null,
    winner: null,
    moveHistory: [],
    moveCount: 0,
    bounds: initialBounds(),
    matchType,
    botDifficulty,
    playerCyanId,
    playerOrangeId,
    lastMoveAt: Date.now(),
    cyanGoBackUsed: false,
    orangeGoBackUsed: false,
  };
}
