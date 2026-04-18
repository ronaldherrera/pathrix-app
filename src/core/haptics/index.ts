// ============================================================
// PATHRIX - Haptics Service
// ============================================================

import * as Haptics from 'expo-haptics';

// Wrapped helpers — silent if haptics not supported (web, simulator)

const safe = (fn: () => Promise<void>) => fn().catch(() => {});

/** Light tap: cell selection */
export const hapticSelect = () =>
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));

/** Medium impact: tile placed on board */
export const hapticTilePlaced = () =>
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));

/** Heavy thud: invalid move / can't place */
export const hapticInvalidMove = () =>
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));

/** Victory pattern: success notification + delayed medium burst */
export const hapticWin = async () => {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)), 200);
    setTimeout(() => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)), 450);
  } catch { /* ignore */ }
};

/** Defeat pattern: error notification */
export const hapticLose = () =>
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));

/** Opponent's turn — soft nudge */
export const hapticTurnChange = () =>
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft));

/** Incoming challenge notification */
export const hapticChallengeReceived = async () => {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)), 150);
    setTimeout(() => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)), 300);
  } catch { /* ignore */ }
};

/** Button / UI tap */
export const hapticButtonPress = () =>
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
