// ============================================================
// PATHRIX - Win Detector
// ============================================================
// Two win conditions:
// 1. LOOP WIN: A closed loop of your color exists on the board.
// 2. EDGE WIN: Your color connects two opposite edges of the board
//    (north-south OR east-west), when the board is ≥ 8 tiles wide.

import {
  BoardPosition,
  GameState,
  Tile,
  getEdgeColor,
  getExitEdge,
  oppositeEdge,
  posKey,
  adjacentPositions,
  getSharedEdge,
} from '../../domain/entities';
import { TileEdge, PlayerColor, GameResult } from '../../domain/enums';

// A path node is uniquely identified by (position, edge) — meaning
// "the path segment at this tile that exits through this edge"
type PathNodeId = string; // "row_col_edge"

function nodeId(pos: BoardPosition, edge: TileEdge): PathNodeId {
  return `${pos.row}_${pos.col}_${edge}`;
}

interface PathGraph {
  // adjacency: nodeId -> set of neighbor nodeIds
  adj: Map<PathNodeId, Set<PathNodeId>>;
}

export interface WinResult {
  winner: PlayerColor;
  result: GameResult;
  /** Path of positions that form the winning connection (for animation) */
  winPath: BoardPosition[];
}

export class WinDetector {
  /**
   * Checks both players for a win condition after a move.
   * The active player is checked first (wins ties).
   */
  static checkWin(state: GameState, activePlayer: PlayerColor): WinResult | null {
    const opponent =
      activePlayer === PlayerColor.CYAN ? PlayerColor.ORANGE : PlayerColor.CYAN;

    // Check active player first, then opponent
    for (const color of [activePlayer, opponent]) {
      const loopWin = WinDetector.checkLoopWin(state, color);
      if (loopWin) return loopWin;

      const edgeWin = WinDetector.checkEdgeWin(state, color);
      if (edgeWin) return edgeWin;
    }
    return null;
  }

  // ── Loop Win ──────────────────────────────────────────────

  static checkLoopWin(state: GameState, color: PlayerColor): WinResult | null {
    const graph = WinDetector.buildPathGraph(state, color);
    const visited = new Set<PathNodeId>();

    for (const startNode of graph.adj.keys()) {
      if (visited.has(startNode)) continue;

      const cyclePath = WinDetector.dfsCycleDetect(graph, startNode, null, visited, new Map());
      if (cyclePath) {
        return {
          winner: color,
          result: GameResult.LOOP_WIN,
          winPath: WinDetector.extractPositionsFromPath(cyclePath),
        };
      }
    }
    return null;
  }

  private static dfsCycleDetect(
    graph: PathGraph,
    node: PathNodeId,
    parent: PathNodeId | null,
    globalVisited: Set<PathNodeId>,
    localStack: Map<PathNodeId, PathNodeId[]>,
  ): PathNodeId[] | null {
    globalVisited.add(node);
    const path = [...(parent ? localStack.get(parent) ?? [] : []), node];
    localStack.set(node, path);

    const neighbors = graph.adj.get(node) ?? new Set();
    for (const neighbor of neighbors) {
      if (neighbor === parent) continue;
      if (localStack.has(neighbor)) {
        // Found cycle — extract from neighbor through current node back to neighbor
        const fullPath = localStack.get(node)!;
        const cycleStartIdx = fullPath.indexOf(neighbor);
        return [...fullPath.slice(cycleStartIdx), neighbor];
      }
      if (!globalVisited.has(neighbor)) {
        const result = WinDetector.dfsCycleDetect(graph, neighbor, node, globalVisited, localStack);
        if (result) return result;
      }
    }

    localStack.delete(node);
    return null;
  }

  // ── Edge Win ──────────────────────────────────────────────

  static checkEdgeWin(state: GameState, color: PlayerColor): WinResult | null {
    const { minRow, maxRow, minCol, maxCol } = state.bounds;
    const boardHeight = maxRow - minRow + 1;
    const boardWidth = maxCol - minCol + 1;

    // Edge win requires board to be at least 8 tiles in the connecting direction
    const checkNS = boardHeight >= 8;
    const checkEW = boardWidth >= 8;

    if (!checkNS && !checkEW) return null;

    const graph = WinDetector.buildPathGraph(state, color);

    if (checkNS) {
      const result = WinDetector.checkEdgeConnection(
        state, graph, color,
        TileEdge.NORTH, TileEdge.SOUTH,
        minRow, maxRow,
        (tile) => tile.row === minRow,
        (tile) => tile.row === maxRow,
      );
      if (result) return result;
    }

    if (checkEW) {
      const result = WinDetector.checkEdgeConnection(
        state, graph, color,
        TileEdge.WEST, TileEdge.EAST,
        minCol, maxCol,
        (tile) => tile.col === minCol,
        (tile) => tile.col === maxCol,
      );
      if (result) return result;
    }

    return null;
  }

  private static checkEdgeConnection(
    state: GameState,
    graph: PathGraph,
    color: PlayerColor,
    startEdge: TileEdge,
    endEdge: TileEdge,
    _min: number,
    _max: number,
    isStartTile: (tile: Tile) => boolean,
    isEndTile: (tile: Tile) => boolean,
  ): WinResult | null {
    // Find all path nodes that touch the start board edge
    const startNodes: PathNodeId[] = [];
    for (const [key, tile] of Object.entries(state.board)) {
      if (!isStartTile(tile)) continue;
      const pos = { row: tile.row, col: tile.col };
      // Check if color's path touches this tile's start-facing edge
      const [e1, e2] = WinDetector.getColorEdges(tile.type, color);
      if (e1 === startEdge || e2 === startEdge) {
        startNodes.push(nodeId(pos, startEdge));
      }
    }

    // BFS from start nodes, check if we reach any end node
    const endNodeIds = new Set<PathNodeId>();
    for (const [key, tile] of Object.entries(state.board)) {
      if (!isEndTile(tile)) continue;
      const pos = { row: tile.row, col: tile.col };
      const [e1, e2] = WinDetector.getColorEdges(tile.type, color);
      if (e1 === endEdge || e2 === endEdge) {
        endNodeIds.add(nodeId(pos, endEdge));
      }
    }

    const visited = new Set<PathNodeId>();
    const prevMap = new Map<PathNodeId, PathNodeId>();
    const queue = [...startNodes];
    for (const n of startNodes) {
      visited.add(n);
      prevMap.set(n, n);
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (endNodeIds.has(current)) {
        // Reconstruct path
        const path = WinDetector.reconstructPath(prevMap, current);
        return {
          winner: color,
          result: GameResult.EDGE_WIN,
          winPath: WinDetector.extractPositionsFromPath(path),
        };
      }
      for (const neighbor of graph.adj.get(current) ?? new Set()) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          prevMap.set(neighbor, current);
          queue.push(neighbor);
        }
      }
    }
    return null;
  }

  // ── Graph Builder ─────────────────────────────────────────

  /**
   * Builds a path-connectivity graph for a given color.
   * Nodes: (position, edge) pairs where that edge carries the color.
   * Edges in graph:
   *   a) Within a tile: two edges of the same path (e.g., N and W for cyan on Type A)
   *   b) Between tiles: shared edges between adjacent tiles of the same color
   */
  static buildPathGraph(state: GameState, color: PlayerColor): PathGraph {
    const adj: Map<PathNodeId, Set<PathNodeId>> = new Map();

    function addEdge(a: PathNodeId, b: PathNodeId) {
      if (!adj.has(a)) adj.set(a, new Set());
      if (!adj.has(b)) adj.set(b, new Set());
      adj.get(a)!.add(b);
      adj.get(b)!.add(a);
    }

    // Intra-tile connections (the two path edges of the color on this tile)
    for (const [key, tile] of Object.entries(state.board)) {
      const pos = { row: tile.row, col: tile.col };
      const [e1, e2] = WinDetector.getColorEdges(tile.type, color);
      addEdge(nodeId(pos, e1), nodeId(pos, e2));
    }

    // Inter-tile connections (matching colors at shared boundaries)
    for (const [key, tile] of Object.entries(state.board)) {
      const pos = { row: tile.row, col: tile.col };
      for (const adj2Pos of adjacentPositions(pos)) {
        const neighbor = state.board[posKey(adj2Pos)];
        if (!neighbor) continue;

        const sharedEdge = getSharedEdge(pos, adj2Pos)!;
        const neighborEdge = oppositeEdge(sharedEdge);

        const thisTileColor = getEdgeColor(tile.type, sharedEdge);
        const neighborColor = getEdgeColor(neighbor.type, neighborEdge);

        if (thisTileColor === color && neighborColor === color) {
          addEdge(
            nodeId(pos, sharedEdge),
            nodeId(adj2Pos, neighborEdge),
          );
        }
      }
    }

    return { adj };
  }

  // ── Helpers ───────────────────────────────────────────────

  private static getColorEdges(type: import('../../domain/enums').TileType, color: PlayerColor): [TileEdge, TileEdge] {
    const { getTileConnections } = require('../../domain/entities');
    return getTileConnections(type, color);
  }

  private static extractPositionsFromPath(path: PathNodeId[]): BoardPosition[] {
    const seen = new Set<string>();
    const positions: BoardPosition[] = [];
    for (const node of path) {
      const parts = node.split('_');
      const posK = `${parts[0]}_${parts[1]}`;
      if (!seen.has(posK)) {
        seen.add(posK);
        positions.push({ row: parseInt(parts[0]), col: parseInt(parts[1]) });
      }
    }
    return positions;
  }

  private static reconstructPath(
    prevMap: Map<PathNodeId, PathNodeId>,
    end: PathNodeId,
  ): PathNodeId[] {
    const path: PathNodeId[] = [];
    let current = end;
    while (prevMap.get(current) !== current) {
      path.unshift(current);
      current = prevMap.get(current)!;
    }
    path.unshift(current);
    return path;
  }
}
