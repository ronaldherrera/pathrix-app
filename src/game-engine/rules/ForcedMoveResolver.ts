// ============================================================
// PATHRIX - Forced Move Resolver
// ============================================================
// After any tile is placed, all empty adjacent cells are checked.
// If only ONE tile type is valid at a position, it's placed automatically
// (cascading until no more forced moves remain).

import {
  BoardPosition,
  BoardBounds,
  GameState,
  PlacementRecord,
  Tile,
  adjacentPositions,
  expandBounds,
  posKey,
} from '../../domain/entities';
import { TileType, PlayerColor, GamePhase } from '../../domain/enums';
import { PlacementRules } from './PlacementRules';

export interface ForcedMoveResult {
  updatedBoard: Record<string, Tile>;
  updatedBounds: BoardBounds;
  forcedPlacements: PlacementRecord[];
  updatedMoveCount: number;
}

export class ForcedMoveResolver {
  /**
   * After placing a tile at `lastPlaced`, checks all adjacent empty cells
   * for forced placements. Cascades recursively until stable.
   *
   * Returns updated board, bounds, and list of forced placements made.
   */
  // Visible grid bounds — must match GameBoard constants
  private static readonly GRID_ROW_MIN = -3;
  private static readonly GRID_ROW_MAX =  4;
  private static readonly GRID_COL_MIN = -3;
  private static readonly GRID_COL_MAX =  4;

  static resolve(
    state: GameState,
    lastPlacedPos: BoardPosition,
    currentPlayer: PlayerColor,
    currentMoveCount: number,
  ): ForcedMoveResult {
    const board = { ...state.board };
    let bounds = { ...state.bounds };
    const forcedPlacements: PlacementRecord[] = [];
    let moveCount = currentMoveCount;

    const queue: BoardPosition[] = [...adjacentPositions(lastPlacedPos)];
    const visited = new Set<string>();
    let safetyLimit = 64; // máximo 64 celdas en un tablero 8×8

    while (queue.length > 0 && safetyLimit-- > 0) {
      const pos = queue.shift()!;
      const key = posKey(pos);

      if (visited.has(key)) continue;
      visited.add(key);

      // Ignorar posiciones fuera del grid visible 8×8
      if (
        pos.row < ForcedMoveResolver.GRID_ROW_MIN || pos.row > ForcedMoveResolver.GRID_ROW_MAX ||
        pos.col < ForcedMoveResolver.GRID_COL_MIN || pos.col > ForcedMoveResolver.GRID_COL_MAX
      ) continue;

      // Ignorar si ya está ocupada
      if (board[key]) continue;

      // Construir estado temporal con el board acumulado
      const tempState: GameState = { ...state, board: { ...board } };
      const validTypes = PlacementRules.getValidTypesAt(tempState, pos);

      if (validTypes.length === 1) {
        const forcedType = validTypes[0];
        moveCount++;

        const newTile: Tile = {
          row: pos.row,
          col: pos.col,
          type: forcedType,
          placedBy: currentPlayer,
          wasForced: true,
          moveIndex: moveCount,
        };

        board[key] = newTile;
        bounds = expandBounds(bounds, pos);

        forcedPlacements.push({
          position: pos,
          type: forcedType,
          placedBy: currentPlayer,
          wasForced: true,
          moveIndex: moveCount,
          timestamp: Date.now(),
        });

        for (const adj of adjacentPositions(pos)) {
          if (
            adj.row >= ForcedMoveResolver.GRID_ROW_MIN && adj.row <= ForcedMoveResolver.GRID_ROW_MAX &&
            adj.col >= ForcedMoveResolver.GRID_COL_MIN && adj.col <= ForcedMoveResolver.GRID_COL_MAX
          ) {
            const adjKey = posKey(adj);
            if (!board[adjKey] && !visited.has(adjKey)) {
              queue.push(adj);
            }
          }
        }
      }
    }

    return {
      updatedBoard: board,
      updatedBounds: bounds,
      forcedPlacements,
      updatedMoveCount: moveCount,
    };
  }
}
