// ============================================================
// PATHRIX - Game Engine (Central Coordinator)
// ============================================================

import {
  GameState,
  BoardPosition,
  PlacementRecord,
  Tile,
  expandBounds,
  recalculateBounds,
  posKey,
  adjacentPositions,
} from '../domain/entities';
import { TileType, PlayerColor, GamePhase, GameResult } from '../domain/enums';
import { PlacementRules } from './rules/PlacementRules';
import { WinDetector, WinResult } from './rules/WinDetector';

const ALL_TILE_TYPES: TileType[] = [
  TileType.TYPE_A, TileType.TYPE_A_90,
  TileType.TYPE_B, TileType.TYPE_B_90, TileType.TYPE_B_180, TileType.TYPE_B_270,
];

export interface MoveResult {
  newState: GameState;
  forcedPlacements: PlacementRecord[];
  winResult: WinResult | null;
  isValid: boolean;
  error?: string;
}

export class GameEngine {
  /**
   * BFS cascade: after placing a tile, find every empty adjacent cell that
   * has exactly one valid edge-matching type and place it automatically.
   * Repeats until no more forced placements can be made.
   */
  private static applyForcedCascade(
    board: Record<string, Tile>,
    bounds: GameState['bounds'],
    startPos: BoardPosition,
    placedBy: PlayerColor,
    moveCount: number,
  ): {
    board: Record<string, Tile>;
    bounds: GameState['bounds'];
    forced: PlacementRecord[];
    moveCount: number;
  } {
    const forced: PlacementRecord[] = [];
    const queued = new Set<string>([posKey(startPos)]);
    const queue: BoardPosition[] = [...adjacentPositions(startPos)];

    for (const n of adjacentPositions(startPos)) queued.add(posKey(n));

    while (queue.length > 0) {
      const pos = queue.shift()!;
      const key = posKey(pos);

      if (board[key]) continue; // already occupied

      // Count edge-matching types at this empty cell
      const fitting = ALL_TILE_TYPES.filter(t =>
        PlacementRules.edgesMatch({ board } as GameState, pos, t),
      );

      if (fitting.length === 1) {
        // Forced placement
        moveCount++;
        const forcedTile: Tile = {
          row: pos.row,
          col: pos.col,
          type: fitting[0],
          placedBy,
          wasForced: true,
          moveIndex: moveCount,
        };
        board = { ...board, [key]: forcedTile };
        bounds = expandBounds(bounds, pos);

        forced.push({
          position: pos,
          type: fitting[0],
          placedBy,
          wasForced: true,
          moveIndex: moveCount,
          timestamp: Date.now(),
        });

        // Queue unvisited neighbors of the newly placed forced tile
        for (const n of adjacentPositions(pos)) {
          const nKey = posKey(n);
          if (!board[nKey] && !queued.has(nKey)) {
            queued.add(nKey);
            queue.push(n);
          }
        }
      }
    }

    return { board, bounds, forced, moveCount };
  }

  /**
   * Attempts to place a tile at the given position with the given type.
   * Applies forced moves, checks win conditions, advances turn.
   * Returns the result — does NOT mutate the input state.
   */
  static placeTile(
    state: GameState,
    pos: BoardPosition,
    type: TileType,
  ): MoveResult {
    if (state.phase !== GamePhase.ACTIVE) {
      return { newState: state, forcedPlacements: [], winResult: null, isValid: false, error: 'Game is not active' };
    }

    const validTypes = PlacementRules.getValidTypesAt(state, pos);
    if (!validTypes.includes(type)) {
      return { newState: state, forcedPlacements: [], winResult: null, isValid: false, error: 'Invalid placement' };
    }

    const currentPlayer = state.currentTurn;
    let moveCount = state.moveCount + 1;

    const newTile: Tile = {
      row: pos.row,
      col: pos.col,
      type,
      placedBy: currentPlayer,
      wasForced: false,
      moveIndex: moveCount,
    };

    let board = { ...state.board, [posKey(pos)]: newTile };
    let bounds = expandBounds(state.bounds, pos);

    const mainPlacement: PlacementRecord = {
      position: pos,
      type,
      placedBy: currentPlayer,
      wasForced: false,
      moveIndex: moveCount,
      timestamp: Date.now(),
    };

    // ── Forced move cascade ────────────────────────────────────
    const cascadeResult = GameEngine.applyForcedCascade(
      board, bounds, pos, currentPlayer, moveCount,
    );
    board      = cascadeResult.board;
    bounds     = cascadeResult.bounds;
    moveCount  = cascadeResult.moveCount;
    const forcedPlacements = cascadeResult.forced;
    // ──────────────────────────────────────────────────────────

    const stateAfterForced: GameState = { ...state, board, bounds, moveCount };

    // Check win after all tiles (including forced) are placed
    const winResult = WinDetector.checkWin(stateAfterForced, currentPlayer);

    const newHistory = [...state.moveHistory, mainPlacement, ...forcedPlacements];

    const nextTurn =
      currentPlayer === PlayerColor.CYAN ? PlayerColor.ORANGE : PlayerColor.CYAN;

    // Draw: next player has no legal moves and no win occurred
    const stateForNextTurn: GameState = { ...stateAfterForced, currentTurn: nextTurn };
    const isDraw = !winResult && PlacementRules.getAllLegalMoves(stateForNextTurn).length === 0;

    const newState: GameState = {
      ...state,
      board,
      bounds,
      moveCount,
      moveHistory: newHistory,
      currentTurn: (winResult || isDraw) ? currentPlayer : nextTurn,
      phase: (winResult || isDraw) ? GamePhase.FINISHED : GamePhase.ACTIVE,
      result: winResult?.result ?? (isDraw ? GameResult.DRAW : null),
      winner: winResult?.winner ?? null,
      lastMoveAt: Date.now(),
    };

    return {
      newState,
      forcedPlacements,
      winResult: winResult ?? null,
      isValid: true,
    };
  }

  /**
   * Removes the opponent's last full turn (main move + any forced tiles).
   * Sets currentTurn back to the caller so they can play again.
   * Each player has one use per game; only callable on their own turn.
   * Returns null if already used or opponent has no moves to undo.
   */
  static goBack(state: GameState, callerColor: PlayerColor): GameState | null {
    const callerUsed = callerColor === PlayerColor.CYAN ? state.cyanGoBackUsed : state.orangeGoBackUsed;
    if (callerUsed) return null;

    const opponentColor = callerColor === PlayerColor.CYAN ? PlayerColor.ORANGE : PlayerColor.CYAN;

    // Find the last non-forced move by the opponent
    let turnStartIdx = -1;
    for (let i = state.moveHistory.length - 1; i >= 0; i--) {
      if (state.moveHistory[i].placedBy === opponentColor && !state.moveHistory[i].wasForced) {
        turnStartIdx = i;
        break;
      }
    }
    if (turnStartIdx === -1) return null; // opponent hasn't moved yet

    // Records from turnStartIdx onward = opponent's last turn (main + forced)
    const toRemove = state.moveHistory.slice(turnStartIdx);
    const newHistory = state.moveHistory.slice(0, turnStartIdx);

    const newBoard = { ...state.board };
    for (const rec of toRemove) {
      delete newBoard[posKey(rec.position)];
    }

    return {
      ...state,
      board: newBoard,
      bounds: recalculateBounds(newBoard),
      moveHistory: newHistory,
      moveCount: state.moveCount - toRemove.length,
      currentTurn: callerColor,
      phase: GamePhase.ACTIVE,
      result: null,
      winner: null,
      cyanGoBackUsed:   callerColor === PlayerColor.CYAN   ? true : state.cyanGoBackUsed,
      orangeGoBackUsed: callerColor === PlayerColor.ORANGE ? true : state.orangeGoBackUsed,
      lastMoveAt: Date.now(),
    };
  }

  static resign(state: GameState, resigningPlayer: PlayerColor): GameState {
    const winner =
      resigningPlayer === PlayerColor.CYAN ? PlayerColor.ORANGE : PlayerColor.CYAN;
    return {
      ...state,
      phase: GamePhase.FINISHED,
      result: GameResult.RESIGN,
      winner,
      lastMoveAt: Date.now(),
    };
  }

  static getLegalMoves(state: GameState): Array<{ pos: BoardPosition; type: TileType }> {
    if (state.phase !== GamePhase.ACTIVE) return [];
    return PlacementRules.getAllLegalMoves(state);
  }
}
