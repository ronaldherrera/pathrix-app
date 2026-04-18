// ============================================================
// PATHRIX - Human Learner
// Tracks human player tendencies across ALL players via Firestore.
// Each device contributes incremental deltas; the shared document
// grows with every game played by anyone.
// Falls back to AsyncStorage when Firebase is not configured.
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { TileType, PlayerColor } from '../../domain/enums';
import { BoardPosition, GameState } from '../../domain/entities';
import { db, isOnlineModeAvailable } from '../../data/services/FirebaseService';

const LOCAL_KEY = 'pathrix_human_profile_v1';
const FIRESTORE_DOC = 'humanProfile';
const FIRESTORE_COLLECTION = 'ai';

export interface HumanProfile {
  totalMoves: number;
  // How often each tile type is placed
  tileTypeCount: Record<string, number>;
  // How many moves were on the board edges vs center
  edgeMoves: number;
  centerMoves: number;
  // Win/loss breakdown
  loopWins: number;
  edgeWins: number;
  losses: number;
  // Total component size gained across all moves (measures aggression)
  totalComponentGrowth: number;
  // How often a move directly connected two separate components (bridging)
  bridgingMoves: number;
}

const DEFAULT_PROFILE: HumanProfile = {
  totalMoves: 0,
  tileTypeCount: {},
  edgeMoves: 0,
  centerMoves: 0,
  loopWins: 0,
  edgeWins: 0,
  losses: 0,
  totalComponentGrowth: 0,
  bridgingMoves: 0,
};

// ── Derived tendencies ─────────────────────────────────────

export interface HumanTendencies {
  /** Tile type the human places most (or null if not enough data) */
  favoriteTileType: TileType | null;
  /** True if human wins via loops more than edge connections */
  prefersLoops: boolean;
  /** True if human tends to place tiles on board edges */
  prefersEdges: boolean;
  /** 0-1: how aggressively the human expands their component each turn */
  expansionRate: number;
  /** True if human frequently bridges separate components (strategic player) */
  isBridger: boolean;
  /** How many games worth of data we have (confidence) */
  confidence: number;
}

export class HumanLearner {
  private static profile: HumanProfile = { ...DEFAULT_PROFILE };
  private static loaded = false;

  static async load(): Promise<void> {
    if (HumanLearner.loaded) return;
    try {
      if (isOnlineModeAvailable && db) {
        // Load shared profile from Firestore
        const { getDoc, doc } = await import('firebase/firestore');
        const snap = await getDoc(doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC));
        if (snap.exists()) {
          HumanLearner.profile = { ...DEFAULT_PROFILE, ...snap.data() as HumanProfile };
        }
      } else {
        // Fallback: local only
        const raw = await AsyncStorage.getItem(LOCAL_KEY);
        if (raw) HumanLearner.profile = { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.warn('[HumanLearner] load failed:', e);
    } finally {
      HumanLearner.loaded = true;
    }
  }

  /**
   * Push incremental delta to Firestore using atomic increments so
   * multiple devices can write simultaneously without conflicts.
   */
  private static async pushDelta(delta: Partial<Record<string, number>>): Promise<void> {
    try {
      if (isOnlineModeAvailable && db) {
        const { doc, setDoc, updateDoc, increment: inc } = await import('firebase/firestore');
        const ref = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC);
        const updates: Record<string, any> = {};
        
        for (const [key, val] of Object.entries(delta)) {
          if (typeof val === 'number' && val !== 0) {
            updates[key] = inc(val);
          }
        }
        
        if (Object.keys(updates).length > 0) {
          try {
            await updateDoc(ref, updates);
          } catch {
            // Doc doesn't exist yet — create it
            const initData: Record<string, any> = {};
            for (const [k, v] of Object.entries(delta)) {
              if (typeof v === 'number') initData[k] = v;
            }
            await setDoc(ref, initData, { merge: true });
          }
        }
        // Update local cache too
        for (const [key, val] of Object.entries(delta)) {
          if (typeof val === 'number') {
            (HumanLearner.profile as any)[key] = ((HumanLearner.profile as any)[key] ?? 0) + val;
          }
        }
      } else {
        // Local fallback
        for (const [key, val] of Object.entries(delta)) {
          if (typeof val === 'number') {
            (HumanLearner.profile as any)[key] = ((HumanLearner.profile as any)[key] ?? 0) + val;
          }
        }
        await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(HumanLearner.profile));
      }
    } catch (e) {
      console.warn('[HumanLearner] pushDelta failed:', e);
    }
  }

  // ── Called after each human move ──────────────────────────

  static recordMove(
    stateBefore: GameState,
    stateAfter: GameState,
    pos: BoardPosition,
    type: TileType,
    humanColor: PlayerColor,
  ): void {
    const delta: Record<string, number> = { totalMoves: 1 };

    // Tile type frequency — stored as tileTypeCount_A, tileTypeCount_B90, etc.
    delta[`tileTypeCount_${type}`] = 1;

    // Edge vs center
    const { minRow, maxRow, minCol, maxCol } = stateBefore.bounds;
    const onEdge = pos.row <= minRow || pos.row >= maxRow ||
                   pos.col <= minCol || pos.col >= maxCol;
    if (onEdge) delta.edgeMoves = 1; else delta.centerMoves = 1;

    // Component growth
    const compBefore = HumanLearner.largestComponent(stateBefore, humanColor);
    const compAfter  = HumanLearner.largestComponent(stateAfter,  humanColor);
    const growth = compAfter - compBefore;
    if (growth > 0) delta.totalComponentGrowth = growth;

    // Bridging
    const countBefore = HumanLearner.componentCount(stateBefore, humanColor);
    const countAfter  = HumanLearner.componentCount(stateAfter,  humanColor);
    if (countAfter < countBefore) delta.bridgingMoves = 1;

    // Fire-and-forget push to Firestore (shared) or AsyncStorage (fallback)
    HumanLearner.pushDelta(delta);

    // Also update in-memory profile immediately for same-session use
    HumanLearner.profile.totalMoves++;
    HumanLearner.profile.tileTypeCount[type] = (HumanLearner.profile.tileTypeCount[type] ?? 0) + 1;
    if (onEdge) HumanLearner.profile.edgeMoves++; else HumanLearner.profile.centerMoves++;
    if (growth > 0) HumanLearner.profile.totalComponentGrowth += growth;
    if (countAfter < countBefore) HumanLearner.profile.bridgingMoves++;
  }

  static recordGameResult(result: 'loopWin' | 'edgeWin' | 'loss' | 'resign' | 'draw'): void {
    const delta: Record<string, number> = {};
    if (result === 'loopWin')                     { delta.loopWins = 1; HumanLearner.profile.loopWins++; }
    else if (result === 'edgeWin')                { delta.edgeWins = 1; HumanLearner.profile.edgeWins++; }
    else if (result === 'loss' || result === 'resign') { delta.losses = 1;  HumanLearner.profile.losses++; }
    if (Object.keys(delta).length > 0) HumanLearner.pushDelta(delta);
  }

  // ── Derived tendencies (used by AIEngine) ─────────────────

  static getTendencies(): HumanTendencies {
    const p = HumanLearner.profile;
    const totalGames = p.loopWins + p.edgeWins + p.losses;

    // Favorite tile type — read from both nested object (local) and flat keys (Firestore)
    let favoriteTileType: TileType | null = null;
    let maxCount = 0;
    // Nested (local cache)
    for (const [t, count] of Object.entries(p.tileTypeCount)) {
      if (count > maxCount) { maxCount = count; favoriteTileType = t as TileType; }
    }
    // Flat keys from Firestore (tileTypeCount_A, tileTypeCount_B90, etc.)
    for (const [key, val] of Object.entries(p as any)) {
      if (key.startsWith('tileTypeCount_')) {
        const t = key.replace('tileTypeCount_', '') as TileType;
        const count = val as number;
        if (count > maxCount) { maxCount = count; favoriteTileType = t; }
      }
    }
    if (maxCount < 5) favoriteTileType = null;

    const prefersLoops = p.loopWins >= p.edgeWins;
    const prefersEdges = p.totalMoves > 0 && (p.edgeMoves / p.totalMoves) > 0.45;
    const expansionRate = p.totalMoves > 0
      ? Math.min(1, p.totalComponentGrowth / p.totalMoves / 3)
      : 0.5;
    const isBridger = p.totalMoves > 0 && (p.bridgingMoves / p.totalMoves) > 0.2;

    return {
      favoriteTileType,
      prefersLoops,
      prefersEdges,
      expansionRate,
      isBridger,
      confidence: Math.min(1, totalGames / 10), // full confidence after 10 games
    };
  }

  static getProfile(): HumanProfile {
    return HumanLearner.profile;
  }

  // ── Graph helpers (duplicated here to avoid circular deps) ─

  private static largestComponent(state: GameState, color: PlayerColor): number {
    const adj = HumanLearner.buildAdj(state, color);
    const visited = new Set<string>();
    let largest = 0;
    for (const node of adj.keys()) {
      if (visited.has(node)) continue;
      let size = 0;
      const queue = [node];
      while (queue.length) {
        const n = queue.shift()!;
        if (visited.has(n)) continue;
        visited.add(n); size++;
        for (const nb of adj.get(n) ?? new Set()) {
          if (!visited.has(nb)) queue.push(nb);
        }
      }
      if (size > largest) largest = size;
    }
    return largest;
  }

  private static componentCount(state: GameState, color: PlayerColor): number {
    const adj = HumanLearner.buildAdj(state, color);
    const visited = new Set<string>();
    let count = 0;
    for (const node of adj.keys()) {
      if (visited.has(node)) continue;
      count++;
      const queue = [node];
      while (queue.length) {
        const n = queue.shift()!;
        if (visited.has(n)) continue;
        visited.add(n);
        for (const nb of adj.get(n) ?? new Set()) {
          if (!visited.has(nb)) queue.push(nb);
        }
      }
    }
    return count;
  }

  private static buildAdj(state: GameState, color: PlayerColor): Map<string, Set<string>> {
    const { WinDetector } = require('../rules/WinDetector');
    return WinDetector.buildPathGraph(state, color).adj;
  }
}
