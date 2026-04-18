// ============================================================
// PATHRIX - Placement Rules Engine
// ============================================================

import {
  BoardPosition,
  GameState,
  Tile,
  adjacentPositions,
  getEdgeColor,
  getSharedEdge,
  oppositeEdge,
  posKey,
} from '../../domain/entities';
import { TileType, PlayerColor } from '../../domain/enums';

const ALL_TYPES = [TileType.TYPE_A, TileType.TYPE_A_90, TileType.TYPE_B, TileType.TYPE_B_90, TileType.TYPE_B_180, TileType.TYPE_B_270];

export class PlacementRules {
  /**
   * Returns all valid tile types that can be placed at the given position.
   * Returns [] if the position is not a legal placement location.
   */
  static getValidTypesAt(state: GameState, pos: BoardPosition): TileType[] {
    const key = posKey(pos);

    // Must be empty
    if (state.board[key]) return [];

    // First move: all 6 tile types are valid at any of the 4 center cells
    if (Object.keys(state.board).length === 0) {
      return [TileType.TYPE_A, TileType.TYPE_A_90, TileType.TYPE_B, TileType.TYPE_B_90, TileType.TYPE_B_180, TileType.TYPE_B_270];
    }

    // Must be adjacent to at least one existing tile
    const neighbors = adjacentPositions(pos);
    const hasNeighbor = neighbors.some(n => state.board[posKey(n)]);
    if (!hasNeighbor) return [];

    const valid: TileType[] = [];
    for (const type of ALL_TYPES) {
      if (PlacementRules.isValidPlacement(state, pos, type)) {
        valid.push(type);
      }
    }
    return valid;
  }

  /** Checks only edge color compatibility with existing neighbors. No recursion. */
  static edgesMatch(state: GameState, pos: BoardPosition, type: TileType): boolean {
    for (const neighbor of adjacentPositions(pos)) {
      const neighborTile = state.board[posKey(neighbor)];
      if (!neighborTile) continue;
      const sharedEdge = getSharedEdge(pos, neighbor)!;
      const neighborEdge = oppositeEdge(sharedEdge);
      if (getEdgeColor(type, sharedEdge) !== getEdgeColor(neighborTile.type, neighborEdge)) return false;
    }
    return true;
  }

  /** Returns true if at least one tile type fits at `pos` given the board (edge-only check, no recursion). */
  private static hasAnyFit(board: Record<string, Tile>, pos: BoardPosition): boolean {
    const tempState = { board } as GameState;
    return ALL_TYPES.some(t => PlacementRules.edgesMatch(tempState, pos, t));
  }

  /**
   * Returns true if placing a tile of the given type at pos is valid:
   * 1. All shared edges with existing neighbors match colors.
   * 2. No adjacent empty cell is left with zero valid types (depth-1).
   * 3. For each valid type at each depth-1 neighbor, its own empty neighbors
   *    also keep at least one valid type (depth-2).
   */
  static isValidPlacement(state: GameState, pos: BoardPosition, type: TileType): boolean {
    if (!PlacementRules.edgesMatch(state, pos, type)) return false;

    const inBounds = (p: BoardPosition) =>
      p.row >= PlacementRules.GRID_ROW_MIN && p.row <= PlacementRules.GRID_ROW_MAX &&
      p.col >= PlacementRules.GRID_COL_MIN && p.col <= PlacementRules.GRID_COL_MAX;

    // Board after placing `type` at `pos`
    const board1 = { ...state.board, [posKey(pos)]: { row: pos.row, col: pos.col, type, placedBy: state.currentTurn, wasForced: false, moveIndex: 0 } as Tile };

    for (const n1 of adjacentPositions(pos)) {
      if (board1[posKey(n1)]) continue; // already occupied
      if (!inBounds(n1)) continue;

      // Depth-1: n1 must have at least one fitting type
      const validForN1 = ALL_TYPES.filter(t => PlacementRules.edgesMatch({ board: board1 } as GameState, n1, t));
      if (validForN1.length === 0) return false;

      // Depth-2: for EVERY valid type at n1, check its empty neighbors still have a fit.
      // If ALL choices for n1 leave some neighbor dead → n1 is a trap → disallow.
      const allChoicesLeadToTrap = validForN1.every(t1 => {
        const board2 = { ...board1, [posKey(n1)]: { row: n1.row, col: n1.col, type: t1, placedBy: state.currentTurn, wasForced: false, moveIndex: 0 } as Tile };
        for (const n2 of adjacentPositions(n1)) {
          if (board2[posKey(n2)]) continue;
          if (!inBounds(n2)) continue;
          if (!PlacementRules.hasAnyFit(board2, n2)) return true; // this choice creates a dead end
        }
        return false;
      });
      if (allChoicesLeadToTrap) return false;
    }

    return true;
  }

  /**
   * Returns all positions where at least one tile type can be legally placed.
   */
  private static readonly GRID_ROW_MIN = -3;
  private static readonly GRID_ROW_MAX =  4;
  private static readonly GRID_COL_MIN = -3;
  private static readonly GRID_COL_MAX =  4;

  static getLegalPositions(state: GameState): BoardPosition[] {
    const placedKeys = Object.keys(state.board);

    // First move: allow any of the 4 center cells
    if (placedKeys.length === 0) {
      return [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 1, col: 0 },
        { row: 1, col: 1 },
      ];
    }

    const candidateSet = new Set<string>();
    for (const key of placedKeys) {
      const tile = state.board[key];
      for (const adj of adjacentPositions({ row: tile.row, col: tile.col })) {
        if (
          adj.row < PlacementRules.GRID_ROW_MIN || adj.row > PlacementRules.GRID_ROW_MAX ||
          adj.col < PlacementRules.GRID_COL_MIN || adj.col > PlacementRules.GRID_COL_MAX
        ) continue;
        const adjKey = posKey(adj);
        if (!state.board[adjKey]) candidateSet.add(adjKey);
      }
    }

    const legal: BoardPosition[] = [];
    for (const key of candidateSet) {
      const [rowStr, colStr] = key.split('_');
      const pos = { row: parseInt(rowStr), col: parseInt(colStr) };
      if (PlacementRules.getValidTypesAt(state, pos).length > 0) {
        legal.push(pos);
      }
    }
    return legal;
  }

  /**
   * Returns all legal moves as (position, type) pairs.
   */
  static getAllLegalMoves(state: GameState): Array<{ pos: BoardPosition; type: TileType }> {
    const positions = PlacementRules.getLegalPositions(state);
    const moves: Array<{ pos: BoardPosition; type: TileType }> = [];
    for (const pos of positions) {
      const types = PlacementRules.getValidTypesAt(state, pos);
      for (const type of types) {
        moves.push({ pos, type });
      }
    }
    return moves;
  }

  /**
   * Fast version for AI rollouts: only checks edge compatibility, no dead-end detection.
   */
  static getAllLegalMovesFast(state: GameState): Array<{ pos: BoardPosition; type: TileType }> {
    const placedKeys = Object.keys(state.board);
    if (placedKeys.length === 0) {
      const moves: Array<{ pos: BoardPosition; type: TileType }> = [];
      for (const pos of [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }]) {
        for (const type of ALL_TYPES) moves.push({ pos, type });
      }
      return moves;
    }

    const candidateSet = new Set<string>();
    for (const key of placedKeys) {
      const tile = state.board[key];
      for (const adj of adjacentPositions({ row: tile.row, col: tile.col })) {
        if (
          adj.row < PlacementRules.GRID_ROW_MIN || adj.row > PlacementRules.GRID_ROW_MAX ||
          adj.col < PlacementRules.GRID_COL_MIN || adj.col > PlacementRules.GRID_COL_MAX
        ) continue;
        const adjKey = posKey(adj);
        if (!state.board[adjKey]) candidateSet.add(adjKey);
      }
    }

    const moves: Array<{ pos: BoardPosition; type: TileType }> = [];
    for (const key of candidateSet) {
      const [rowStr, colStr] = key.split('_');
      const pos = { row: parseInt(rowStr), col: parseInt(colStr) };
      for (const type of ALL_TYPES) {
        if (PlacementRules.edgesMatch(state, pos, type)) {
          moves.push({ pos, type });
        }
      }
    }
    return moves;
  }
}
