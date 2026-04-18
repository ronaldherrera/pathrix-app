// ============================================================
// PATHRIX - AI Engine (MCTS with Heuristic Rollouts)
// ============================================================

import {
  GameState,
  BoardPosition,
  Tile,
  posKey,
  expandBounds,
} from '../../domain/entities';
import { TileType, PlayerColor, GamePhase, BotDifficulty } from '../../domain/enums';
import { PlacementRules } from '../rules/PlacementRules';
import { WinDetector } from '../rules/WinDetector';
import { HumanLearner, HumanTendencies } from './HumanLearner';

interface MCTSNode {
  state: GameState;
  pos: BoardPosition | null;
  type: TileType | null;
  parent: MCTSNode | null;
  children: MCTSNode[];
  visits: number;
  wins: number;
  untriedMoves: Array<{ pos: BoardPosition; type: TileType }>;
}

const EXPLORATION_CONSTANT = Math.SQRT2;

// Simulation budgets
const DIFFICULTY_SIMULATIONS: Record<BotDifficulty, number> = {
  [BotDifficulty.EASY]:   80,
  [BotDifficulty.MEDIUM]: 300,
  [BotDifficulty.HARD]:   700,
  [BotDifficulty.EXPERT]: 700,
};

// Max wall-clock ms the MCTS loop is allowed to run
const DIFFICULTY_TIME_LIMIT_MS: Record<BotDifficulty, number> = {
  [BotDifficulty.EASY]:    2_000,
  [BotDifficulty.MEDIUM]:  5_000,
  [BotDifficulty.HARD]:    8_000,
  [BotDifficulty.EXPERT]: 10_000,
};

// How deep rollouts go per difficulty (deeper = stronger)
const ROLLOUT_DEPTH: Record<BotDifficulty, number> = {
  [BotDifficulty.EASY]:   15,
  [BotDifficulty.MEDIUM]: 30,
  [BotDifficulty.HARD]:   50,
  [BotDifficulty.EXPERT]: 50,
};

export class AIEngine {
  static getBestMove(
    state: GameState,
    difficulty: BotDifficulty,
  ): { pos: BoardPosition; type: TileType } | null {
    const moves = PlacementRules.getAllLegalMovesFast(state);
    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0];

    const currentPlayer = state.currentTurn;
    const opponent = currentPlayer === PlayerColor.CYAN ? PlayerColor.ORANGE : PlayerColor.CYAN;

    // ── Priority 1: take immediate win ──────────────────────
    for (const move of moves) {
      const { winner } = AIEngine.placeTileFast(state, move.pos, move.type);
      if (winner === currentPlayer) return move;
    }

    // ── Priority 2: filter moves that directly hand opponent the win ─────
    // (the bot's own tile placement can complete the opponent's loop)
    const nonSuicidalMoves = moves.filter(move => {
      const { winner } = AIEngine.placeTileFast(state, move.pos, move.type);
      return winner !== opponent;
    });
    const candidateMoves = nonSuicidalMoves.length > 0 ? nonSuicidalMoves : moves;

    // ── Priority 3: block opponent's win in their next move ──────────────
    const blockingMoves: Array<{ pos: BoardPosition; type: TileType }> = [];
    for (const move of candidateMoves) {
      const { newState } = AIEngine.placeTileFast(state, move.pos, move.type);
      const opponentMoves = PlacementRules.getAllLegalMovesFast(newState);
      let opponentCanWin = false;
      for (const oppMove of opponentMoves) {
        const { winner } = AIEngine.placeTileFast(newState, oppMove.pos, oppMove.type);
        if (winner === opponent) { opponentCanWin = true; break; }
      }
      if (!opponentCanWin) blockingMoves.push(move);
    }
    // If some moves prevent an opponent win next turn, restrict to those
    const safeMoves = blockingMoves.length > 0 ? blockingMoves : candidateMoves;

    const budget  = DIFFICULTY_SIMULATIONS[difficulty];
    const timeLimit = DIFFICULTY_TIME_LIMIT_MS[difficulty];
    return AIEngine.mcts(state, safeMoves, budget, difficulty, timeLimit);
  }

  // ── Fast state advancement (no draw detection, no dead-end check) ──

  private static placeTileFast(
    state: GameState,
    pos: BoardPosition,
    type: TileType,
  ): { newState: GameState; winner: PlayerColor | null } {
    const currentPlayer = state.currentTurn;
    const newTile: Tile = {
      row: pos.row, col: pos.col, type,
      placedBy: currentPlayer, wasForced: false, moveIndex: state.moveCount + 1,
    };
    const newBoard = { ...state.board, [posKey(pos)]: newTile };
    const newBounds = expandBounds(state.bounds, pos);
    const tempState: GameState = {
      ...state,
      board: newBoard,
      bounds: newBounds,
      moveCount: state.moveCount + 1,
    };

    const winResult = WinDetector.checkWin(tempState, currentPlayer);
    if (winResult) {
      return {
        newState: { ...tempState, phase: GamePhase.FINISHED, winner: winResult.winner },
        winner: winResult.winner,
      };
    }

    const nextTurn = currentPlayer === PlayerColor.CYAN ? PlayerColor.ORANGE : PlayerColor.CYAN;
    return { newState: { ...tempState, currentTurn: nextTurn }, winner: null };
  }

  // ── MCTS ───────────────────────────────────────────────────

  private static mcts(
    rootState: GameState,
    rootMoves: Array<{ pos: BoardPosition; type: TileType }>,
    budget: number,
    difficulty: BotDifficulty,
    timeLimitMs: number,
  ): { pos: BoardPosition; type: TileType } {
    const root: MCTSNode = {
      state: rootState,
      pos: null,
      type: null,
      parent: null,
      children: [],
      visits: 0,
      wins: 0,
      untriedMoves: [...rootMoves],
    };

    const deadline = Date.now() + timeLimitMs;
    for (let i = 0; i < budget; i++) {
      if (Date.now() >= deadline) break;
      let node = AIEngine.select(root);
      node = AIEngine.expand(node, difficulty);
      const result = AIEngine.simulate(node.state, difficulty);
      AIEngine.backpropagate(node, result, rootState.currentTurn);
    }

    if (root.children.length === 0) return rootMoves[0];

    // Pick child with most visits (robust best — standard MCTS)
    let bestChild = root.children[0];
    for (const child of root.children) {
      if (child.visits > bestChild.visits) bestChild = child;
    }
    return { pos: bestChild.pos!, type: bestChild.type! };
  }

  private static select(node: MCTSNode): MCTSNode {
    while (node.untriedMoves.length === 0 && node.children.length > 0) {
      node = AIEngine.bestUCB1Child(node);
    }
    return node;
  }

  private static bestUCB1Child(node: MCTSNode): MCTSNode {
    let best = node.children[0];
    let bestScore = -Infinity;
    for (const child of node.children) {
      const score =
        (child.wins / child.visits) +
        EXPLORATION_CONSTANT * Math.sqrt(Math.log(node.visits) / child.visits);
      if (score > bestScore) {
        bestScore = score;
        best = child;
      }
    }
    return best;
  }

  private static expand(node: MCTSNode, difficulty: BotDifficulty): MCTSNode {
    if (node.untriedMoves.length === 0) return node;
    if (node.state.phase !== GamePhase.ACTIVE) return node;

    // Medium+: prefer moves with higher strategic weight during expansion
    let move: { pos: BoardPosition; type: TileType };
    if (difficulty === BotDifficulty.MEDIUM || difficulty === BotDifficulty.HARD || difficulty === BotDifficulty.EXPERT) {
      move = AIEngine.selectExpandMove(node.state, node.untriedMoves, difficulty);
      const idx = node.untriedMoves.indexOf(move);
      node.untriedMoves.splice(idx, 1);
    } else {
      const idx = Math.floor(Math.random() * node.untriedMoves.length);
      move = node.untriedMoves.splice(idx, 1)[0];
    }

    const { newState } = AIEngine.placeTileFast(node.state, move.pos, move.type);
    const childMoves = PlacementRules.getAllLegalMovesFast(newState);

    const child: MCTSNode = {
      state: newState,
      pos: move.pos,
      type: move.type,
      parent: node,
      children: [],
      visits: 0,
      wins: 0,
      untriedMoves: childMoves,
    };
    node.children.push(child);
    return child;
  }

  /** During expansion, bias toward strategically interesting moves */
  private static selectExpandMove(
    state: GameState,
    moves: Array<{ pos: BoardPosition; type: TileType }>,
    difficulty: BotDifficulty,
  ): { pos: BoardPosition; type: TileType } {
    // Hard/Expert: weighted random by heuristic score
    if (difficulty === BotDifficulty.HARD || difficulty === BotDifficulty.EXPERT) {
      return AIEngine.weightedRandomMove(state, moves);
    }
    // Medium: just pick random (but win/block already handled in getBestMove)
    return moves[Math.floor(Math.random() * moves.length)];
  }

  private static simulate(state: GameState, difficulty: BotDifficulty): PlayerColor | null {
    let current = state;
    let depth = 0;
    const maxDepth = ROLLOUT_DEPTH[difficulty];

    while (current.phase === GamePhase.ACTIVE && depth < maxDepth) {
      const moves = PlacementRules.getAllLegalMovesFast(current);
      if (moves.length === 0) break;

      let move: { pos: BoardPosition; type: TileType };

      if (difficulty === BotDifficulty.HARD || difficulty === BotDifficulty.EXPERT) {
        // Smart rollout: take wins, block losses, otherwise heuristic-weighted
        move = AIEngine.smartRolloutMove(current, moves);
      } else {
        // Easy + Medium: semi-smart rollout (take wins, block losses, then random)
        move = AIEngine.semiSmartRolloutMove(current, moves);
      }

      const { newState } = AIEngine.placeTileFast(current, move.pos, move.type);
      current = newState;
      depth++;
    }

    return current.winner;
  }

  /** Rollout: take win → block → weighted random */
  private static smartRolloutMove(
    state: GameState,
    moves: Array<{ pos: BoardPosition; type: TileType }>,
  ): { pos: BoardPosition; type: TileType } {
    const currentPlayer = state.currentTurn;
    const opponent = currentPlayer === PlayerColor.CYAN ? PlayerColor.ORANGE : PlayerColor.CYAN;

    // 1. Take immediate win
    for (const move of moves) {
      const { winner } = AIEngine.placeTileFast(state, move.pos, move.type);
      if (winner === currentPlayer) return move;
    }

    // 2. Block opponent immediate win (sample up to 12 moves to keep rollouts fast)
    const sampleSize = Math.min(moves.length, 12);
    for (let i = 0; i < sampleSize; i++) {
      const move = moves[i];
      const { newState } = AIEngine.placeTileFast(state, move.pos, move.type);
      const oppMoves = PlacementRules.getAllLegalMovesFast(newState);
      for (const oppMove of oppMoves) {
        const { winner } = AIEngine.placeTileFast(newState, oppMove.pos, oppMove.type);
        if (winner === opponent) return move;
      }
    }

    // 3. Weighted random
    return AIEngine.weightedRandomMove(state, moves);
  }

  /** Rollout: take win → block → pure random */
  private static semiSmartRolloutMove(
    state: GameState,
    moves: Array<{ pos: BoardPosition; type: TileType }>,
  ): { pos: BoardPosition; type: TileType } {
    const currentPlayer = state.currentTurn;
    const opponent = currentPlayer === PlayerColor.CYAN ? PlayerColor.ORANGE : PlayerColor.CYAN;

    for (const move of moves) {
      const { winner } = AIEngine.placeTileFast(state, move.pos, move.type);
      if (winner === currentPlayer) return move;
    }

    // Quick block check (first 8 moves)
    const sampleSize = Math.min(moves.length, 8);
    for (let i = 0; i < sampleSize; i++) {
      const move = moves[i];
      const { newState } = AIEngine.placeTileFast(state, move.pos, move.type);
      const oppMoves = PlacementRules.getAllLegalMovesFast(newState);
      for (const oppMove of oppMoves) {
        const { winner } = AIEngine.placeTileFast(newState, oppMove.pos, oppMove.type);
        if (winner === opponent) return move;
      }
    }

    return moves[Math.floor(Math.random() * moves.length)];
  }

  private static backpropagate(
    node: MCTSNode,
    winner: PlayerColor | null,
    rootPlayer: PlayerColor,
  ): void {
    let current: MCTSNode | null = node;
    while (current) {
      current.visits++;
      if (winner === rootPlayer) current.wins++;
      current = current.parent;
    }
  }

  // ── Heuristic Move Selection ───────────────────────────────

  private static heuristicMove(
    state: GameState,
    moves: Array<{ pos: BoardPosition; type: TileType }>,
    difficulty: BotDifficulty,
  ): { pos: BoardPosition; type: TileType } {
    let bestMove = moves[0];
    let bestWeight = -Infinity;
    for (const move of moves) {
      const w = AIEngine.moveWeight(state, move, difficulty);
      if (w > bestWeight) {
        bestWeight = w;
        bestMove = move;
      }
    }
    return bestMove;
  }

  private static weightedRandomMove(
    state: GameState,
    moves: Array<{ pos: BoardPosition; type: TileType }>,
  ): { pos: BoardPosition; type: TileType } {
    const weights = moves.map(move => AIEngine.moveWeight(state, move, BotDifficulty.HARD));
    const total = weights.reduce((a, b) => a + b, 0);
    let rand = Math.random() * total;
    for (let i = 0; i < moves.length; i++) {
      rand -= weights[i];
      if (rand <= 0) return moves[i];
    }
    return moves[moves.length - 1];
  }

  private static moveWeight(
    state: GameState,
    move: { pos: BoardPosition; type: TileType },
    difficulty: BotDifficulty,
  ): number {
    const currentPlayer = state.currentTurn;
    const opponent = currentPlayer === PlayerColor.CYAN ? PlayerColor.ORANGE : PlayerColor.CYAN;
    let weight = 1.0;

    const { newState, winner } = AIEngine.placeTileFast(state, move.pos, move.type);

    if (winner === currentPlayer) return 1000;
    if (winner === opponent) return 0.01;

    // Block opponent's immediate win
    if (difficulty !== BotDifficulty.EASY) {
      const opponentMoves = PlacementRules.getAllLegalMovesFast(newState);
      for (const oppMove of opponentMoves) {
        const { winner: oppWinner } = AIEngine.placeTileFast(newState, oppMove.pos, oppMove.type);
        if (oppWinner === opponent) {
          weight += 50;
          break;
        }
      }
    }

    // Connectivity: prefer moves that grow our component
    const myAfter  = AIEngine.largestComponentSize(newState, currentPlayer);
    const myBefore = AIEngine.largestComponentSize(state,    currentPlayer);
    weight += (myAfter - myBefore) * 4;

    // Penalize moves that grow opponent connectivity
    const oppAfter  = AIEngine.largestComponentSize(newState, opponent);
    const oppBefore = AIEngine.largestComponentSize(state,    opponent);
    weight -= (oppAfter - oppBefore) * 2;

    // Prefer touching board edges
    const { minRow, maxRow, minCol, maxCol } = state.bounds;
    const { row, col } = move.pos;
    if (row <= minRow || row >= maxRow || col <= minCol || col >= maxCol) weight += 2;

    // Bridging bonus
    const componentsBefore = AIEngine.countComponents(state, currentPlayer);
    const componentsAfter  = AIEngine.countComponents(newState, currentPlayer);
    if (componentsAfter < componentsBefore) weight += 8;

    // ── Human-profile counter-play ─────────────────────────
    const tendencies = HumanLearner.getTendencies();
    if (tendencies.confidence > 0.2) {
      weight += AIEngine.counterPlayBonus(state, newState, move, opponent, tendencies);
    }

    return Math.max(0.01, weight);
  }

  /**
   * Bonus for moves that specifically counter the human's learned tendencies.
   * opponent = the human player's color.
   */
  private static counterPlayBonus(
    stateBefore: GameState,
    stateAfter: GameState,
    move: { pos: BoardPosition; type: TileType },
    humanColor: PlayerColor,
    t: HumanTendencies,
  ): number {
    let bonus = 0;
    const conf = t.confidence;

    // If human prefers loops: aggressively fragment their component
    if (t.prefersLoops) {
      const oppComponentsBefore = AIEngine.countComponents(stateBefore, humanColor);
      const oppComponentsAfter  = AIEngine.countComponents(stateAfter,  humanColor);
      // Bonus if we increased human's fragmentation (more components = harder to loop)
      bonus += (oppComponentsAfter - oppComponentsBefore) * 6 * conf;
    }

    // If human prefers edges: block edge positions strongly
    if (t.prefersEdges) {
      const { minRow, maxRow, minCol, maxCol } = stateBefore.bounds;
      const { row, col } = move.pos;
      const onEdge = row <= minRow || row >= maxRow || col <= minCol || col >= maxCol;
      if (onEdge) bonus += 4 * conf;
    }

    // If human is a bridger: extra weight on moves that block their bridging potential
    // (i.e., our move reduces the open adjacencies to their components)
    if (t.isBridger) {
      const oppGrowthAfter  = AIEngine.largestComponentSize(stateAfter,  humanColor);
      const oppGrowthBefore = AIEngine.largestComponentSize(stateBefore, humanColor);
      if (oppGrowthAfter <= oppGrowthBefore) bonus += 5 * conf;
    }

    // If human is an aggressive expander: prioritize containment over our own growth
    if (t.expansionRate > 0.6) {
      const oppAfter  = AIEngine.largestComponentSize(stateAfter,  humanColor);
      const oppBefore = AIEngine.largestComponentSize(stateBefore, humanColor);
      bonus -= (oppAfter - oppBefore) * 3 * conf; // extra penalty for letting human grow
    }

    return bonus;
  }

  // ── Graph helpers ──────────────────────────────────────────

  private static largestComponentSize(state: GameState, color: PlayerColor): number {
    const graph = WinDetector.buildPathGraph(state, color);
    const visited = new Set<string>();
    let largest = 0;

    for (const node of graph.adj.keys()) {
      if (visited.has(node)) continue;
      let size = 0;
      const queue = [node];
      while (queue.length > 0) {
        const n = queue.shift()!;
        if (visited.has(n)) continue;
        visited.add(n);
        size++;
        for (const neighbor of graph.adj.get(n) ?? new Set()) {
          if (!visited.has(neighbor)) queue.push(neighbor);
        }
      }
      if (size > largest) largest = size;
    }
    return largest;
  }

  private static countComponents(state: GameState, color: PlayerColor): number {
    const graph = WinDetector.buildPathGraph(state, color);
    const visited = new Set<string>();
    let count = 0;

    for (const node of graph.adj.keys()) {
      if (visited.has(node)) continue;
      count++;
      const queue = [node];
      while (queue.length > 0) {
        const n = queue.shift()!;
        if (visited.has(n)) continue;
        visited.add(n);
        for (const neighbor of graph.adj.get(n) ?? new Set()) {
          if (!visited.has(neighbor)) queue.push(neighbor);
        }
      }
    }
    return count;
  }
}
