import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

// ── ELO Calculator ────────────────────────────────────────────

function calculateElo(
  winnerElo: number,
  loserElo: number,
  winnerGames: number,
  loserGames: number,
): { winnerChange: number; loserChange: number } {
  // K factor decreases as player matures
  const kWinner = winnerGames < 30 ? 32 : winnerGames < 100 ? 24 : 16;
  const kLoser = loserGames < 30 ? 32 : loserGames < 100 ? 24 : 16;

  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const expectedLoser = 1 - expectedWinner;

  return {
    winnerChange: Math.round(kWinner * (1 - expectedWinner)),
    loserChange: Math.round(kLoser * (0 - expectedLoser)),
  };
}

// ── Validate and Apply Move ───────────────────────────────────

export const validateAndApplyMove = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');

  const { matchId, position, tileType } = data;
  const uid = context.auth.uid;

  const matchRef = db.collection('matches').doc(matchId);
  const matchSnap = await matchRef.get();

  if (!matchSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Match not found');
  }

  const match = matchSnap.data()!;

  // Verify it's this player's turn
  const currentTurn = match.gameState.currentTurn;
  const isPlayerCyan = match.playerCyanId === uid;
  const isPlayerOrange = match.playerOrangeId === uid;

  if (!isPlayerCyan && !isPlayerOrange) {
    throw new functions.https.HttpsError('permission-denied', 'Not a player in this match');
  }

  if ((currentTurn === 'cyan' && !isPlayerCyan) || (currentTurn === 'orange' && !isPlayerOrange)) {
    throw new functions.https.HttpsError('failed-precondition', 'Not your turn');
  }

  if (match.status !== 'active') {
    throw new functions.https.HttpsError('failed-precondition', 'Match is not active');
  }

  // Apply move server-side (simplified — in production, run full game engine here)
  const { row, col } = position;
  const boardKey = `${row}_${col}`;

  const board = { ...match.gameState.board };
  if (board[boardKey]) {
    throw new functions.https.HttpsError('failed-precondition', 'Cell already occupied');
  }

  const moveCount = (match.gameState.moveCount ?? 0) + 1;
  board[boardKey] = {
    type: tileType,
    placedBy: currentTurn,
    wasForced: false,
    moveIndex: moveCount,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  const nextTurn = currentTurn === 'cyan' ? 'orange' : 'cyan';

  // Store move in history subcollection
  await db.collection('matches').doc(matchId).collection('moves').add({
    position,
    type: tileType,
    placedBy: uid,
    wasForced: false,
    moveIndex: moveCount,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Update match state
  await matchRef.update({
    'gameState.board': board,
    'gameState.currentTurn': nextTurn,
    'gameState.moveCount': moveCount,
    'gameState.lastMoveAt': admin.firestore.FieldValue.serverTimestamp(),
    'gameState.lastMovedBy': uid,
  });

  return { success: true, moveCount, nextTurn };
});

// ── Matchmaking ───────────────────────────────────────────────

export const findOrCreateRandomMatch = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');

  const { uid, displayName, elo } = data;
  const userElo = elo ?? 1200;

  // Check if already in a match
  const existingQueue = await db.collection('matchmaking_queue')
    .where('uid', '==', uid)
    .where('status', '==', 'searching')
    .limit(1)
    .get();

  if (!existingQueue.empty) {
    const entry = existingQueue.docs[0];
    const matchId = entry.data().matchId;
    if (matchId) {
      const match = await db.collection('matches').doc(matchId).get();
      return { matchId, ...match.data(), status: match.data()?.status };
    }
  }

  // Look for compatible opponent
  const waitSec = 30; // simplified — in production, check queue entry age
  const eloRange = 200;

  const opponentQuery = await db.collection('matchmaking_queue')
    .where('status', '==', 'searching')
    .where('uid', '!=', uid)
    .where('elo', '>=', userElo - eloRange)
    .where('elo', '<=', userElo + eloRange)
    .orderBy('uid')
    .orderBy('joinedAt', 'asc')
    .limit(5)
    .get();

  if (!opponentQuery.empty) {
    const opponent = opponentQuery.docs[0];
    const opponentData = opponent.data();

    // Create match
    const matchRef = db.collection('matches').doc();
    const cyanId = Math.random() < 0.5 ? uid : opponentData.uid;
    const orangeId = cyanId === uid ? opponentData.uid : uid;

    await matchRef.set({
      playerCyanId: cyanId,
      playerOrangeId: orangeId,
      type: 'vsRandom',
      status: 'active',
      botDifficulty: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
      finishedAt: null,
      winnerId: null,
      result: null,
      eloChangeCyan: null,
      eloChangeOrange: null,
      gameState: {
        currentTurn: 'cyan',
        phase: 'active',
        moveCount: 0,
        board: {},
        bounds: { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 },
        lastMoveAt: admin.firestore.FieldValue.serverTimestamp(),
        lastMovedBy: null,
      },
    });

    // Update both queue entries
    await opponent.ref.update({ status: 'matched', matchId: matchRef.id });
    await db.collection('matchmaking_queue').add({
      uid,
      elo: userElo,
      status: 'matched',
      matchId: matchRef.id,
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      matchId: matchRef.id,
      playerCyanId: cyanId,
      playerOrangeId: orangeId,
      status: 'matched',
    };
  }

  // No opponent found — add to queue
  const queueRef = await db.collection('matchmaking_queue').add({
    uid,
    displayName,
    elo: userElo,
    status: 'searching',
    matchId: null,
    joinedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { queueId: queueRef.id, status: 'searching' };
});

// ── Handle Game Over ──────────────────────────────────────────

export const handleGameOver = functions.firestore
  .document('matches/{matchId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const { matchId } = context.params;

    // Only handle transition to finished
    if (before.status === 'finished' || after.status !== 'finished') return;
    // 1. Prepare updates for both players (always update activity for online games)
    const playerIds = [after.playerCyanId, after.playerOrangeId].filter(id => id && id !== 'bot');
    const userUpdates: Promise<any>[] = playerIds.map(uid => 
      db.collection('users').doc(uid).update({
        lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
        lastMatchAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    );

    // 2. Handle ELO and stats if there is a clear winner
    if (after.winnerId) {
      const winnerId = after.winnerId;
      const loserId = after.playerCyanId === winnerId ? after.playerOrangeId : after.playerCyanId;

      const [winnerSnap, loserSnap] = await Promise.all([
        db.collection('users').doc(winnerId).get(),
        db.collection('users').doc(loserId).get(),
      ]);

      if (winnerSnap.exists && loserSnap.exists) {
        const winner = winnerSnap.data()!;
        const loser = loserSnap.data()!;

        const { winnerChange, loserChange } = calculateElo(
          winner.elo ?? 1200,
          loser.elo ?? 1200,
          winner.gamesPlayed ?? 0,
          loser.gamesPlayed ?? 0,
        );

        userUpdates.push(
          winnerSnap.ref.update({
            elo: admin.firestore.FieldValue.increment(winnerChange),
            gamesPlayed: admin.firestore.FieldValue.increment(1),
            gamesWon: admin.firestore.FieldValue.increment(1),
            currentStreak: admin.firestore.FieldValue.increment(1),
            bestStreak: Math.max((winner.bestStreak ?? 0), (winner.currentStreak ?? 0) + 1),
          }),
          loserSnap.ref.update({
            elo: admin.firestore.FieldValue.increment(loserChange),
            gamesPlayed: admin.firestore.FieldValue.increment(1),
            gamesLost: admin.firestore.FieldValue.increment(1),
            currentStreak: 0,
          }),
          change.after.ref.update({
            eloChangeCyan: after.playerCyanId === winnerId ? winnerChange : loserChange,
            eloChangeOrange: after.playerOrangeId === winnerId ? winnerChange : loserChange,
          })
        );
      }
    }

    await Promise.all(userUpdates);
  });

// ── Challenge Friend ──────────────────────────────────────────

export const challengeFriend = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');

  const { toUid } = data;
  const fromUid = context.auth.uid;

  const fromSnap = await db.collection('users').doc(fromUid).get();
  const toSnap = await db.collection('users').doc(toUid).get();

  if (!fromSnap.exists || !toSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'User not found');
  }

  const challengeRef = await db.collection('friendChallenges').add({
    fromUid,
    fromName: fromSnap.data()!.displayName,
    toUid,
    toName: toSnap.data()!.displayName,
    matchId: null,
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 24 * 60 * 60 * 1000)
    ),
  });

  // TODO: Send push notification to toUid
  return { challengeId: challengeRef.id };
});

export const acceptChallenge = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');

  const { challengeId } = data;
  const uid = context.auth.uid;

  const challengeSnap = await db.collection('friendChallenges').doc(challengeId).get();
  if (!challengeSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Challenge not found');
  }

  const challenge = challengeSnap.data()!;
  if (challenge.toUid !== uid) {
    throw new functions.https.HttpsError('permission-denied', 'Not the challenge recipient');
  }

  // Create match
  const cyanId = challenge.fromUid;
  const orangeId = uid;

  const matchRef = db.collection('matches').doc();
  await matchRef.set({
    playerCyanId: cyanId,
    playerOrangeId: orangeId,
    type: 'vsFriend',
    status: 'active',
    botDifficulty: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    startedAt: admin.firestore.FieldValue.serverTimestamp(),
    finishedAt: null,
    winnerId: null,
    result: null,
    eloChangeCyan: null,
    eloChangeOrange: null,
    gameState: {
      currentTurn: 'cyan',
      phase: 'active',
      moveCount: 0,
      board: {},
      bounds: { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 },
      lastMoveAt: admin.firestore.FieldValue.serverTimestamp(),
      lastMovedBy: null,
    },
  });

  await challengeSnap.ref.update({ status: 'accepted', matchId: matchRef.id });

  return {
    matchId: matchRef.id,
    playerCyanId: cyanId,
    playerOrangeId: orangeId,
  };
});

// ── Resign Match ──────────────────────────────────────────────

export const resignMatch = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');

  const { matchId } = data;
  const uid = context.auth.uid;

  const matchRef = db.collection('matches').doc(matchId);
  const matchSnap = await matchRef.get();

  if (!matchSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Match not found');
  }

  const match = matchSnap.data()!;
  const isPlayerCyan = match.playerCyanId === uid;
  const isPlayerOrange = match.playerOrangeId === uid;

  if (!isPlayerCyan && !isPlayerOrange) {
    throw new functions.https.HttpsError('permission-denied', 'Not a player in this match');
  }

  const winnerId = isPlayerCyan ? match.playerOrangeId : match.playerCyanId;

  await matchRef.update({
    status: 'finished',
    winnerId,
    result: 'resign',
    finishedAt: admin.firestore.FieldValue.serverTimestamp(),
    'gameState.phase': 'finished',
    'gameState.winner': isPlayerCyan ? 'orange' : 'cyan',
    'gameState.result': 'resign',
  });

  return { success: true, winnerId };
});

// ── Scheduled: Update Leaderboard ────────────────────────────

export const updateLeaderboard = functions.pubsub.schedule('every 60 minutes').onRun(async () => {
  const periods = ['allTime', 'monthly', 'weekly'] as const;

  for (const period of periods) {
    let query = db.collection('users').orderBy('elo', 'desc').limit(100);

    if (period !== 'allTime') {
      const now = new Date();
      const cutoff = new Date(now);
      if (period === 'monthly') cutoff.setMonth(cutoff.getMonth() - 1);
      else if (period === 'weekly') cutoff.setDate(cutoff.getDate() - 7);
      query = db.collection('users')
        .where('lastSeenAt', '>=', admin.firestore.Timestamp.fromDate(cutoff))
        .orderBy('lastSeenAt', 'desc')
        .orderBy('elo', 'desc')
        .limit(100) as any;
    }

    const snap = await query.get();
    const entries = snap.docs.map((doc, index) => {
      const d = doc.data();
      return {
        uid: doc.id,
        displayName: d.displayName,
        avatarUrl: d.avatarUrl,
        elo: d.elo,
        gamesPlayed: d.gamesPlayed,
        winRate: d.gamesPlayed > 0 ? d.gamesWon / d.gamesPlayed : 0,
        rank: index + 1,
      };
    });

    await db.collection('leaderboard').doc(period).set({
      entries,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
});

// ── Expire Challenges ─────────────────────────────────────────

export const expireChallenges = functions.pubsub.schedule('every 6 hours').onRun(async () => {
  const now = admin.firestore.Timestamp.now();
  const expired = await db.collection('friendChallenges')
    .where('status', '==', 'pending')
    .where('expiresAt', '<', now)
    .get();

  const batch = db.batch();
  expired.docs.forEach(doc => batch.update(doc.ref, { status: 'expired' }));
  await batch.commit();
});

// ── ELO Decay ─────────────────────────────────────────────────

/**
 * Periodically penalize inactive players by decreasing their ELO.
 * Runs every 24 hours. Users who haven't played in the last 24h lose 10 points.
 * ELO won't go below 800.
 */
export const applyEloDecay = functions.pubsub.schedule('every 24 hours').onRun(async () => {
  const now = Date.now();
  const decayThreshold = admin.firestore.Timestamp.fromDate(new Date(now - 24 * 60 * 60 * 1000));

  const inactiveUsers = await db.collection('users')
    .where('lastMatchAt', '<', decayThreshold)
    .where('elo', '>', 800)
    .limit(500) // Batch limit for safety
    .get();

  if (inactiveUsers.empty) return;

  const batch = db.batch();
  inactiveUsers.docs.forEach(doc => {
    batch.update(doc.ref, {
      elo: admin.firestore.FieldValue.increment(-10),
      // We intentionally don't update lastMatchAt here, so they keep decaying 
      // until they play a match.
    });
  });

  await batch.commit();
  console.log(`[ELO Decay] Penalized ${inactiveUsers.size} users.`);
});
