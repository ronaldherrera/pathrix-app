// ============================================================
// PATHRIX - Firebase Service
// ============================================================
// Initialize Firebase and export auth/firestore/functions instances.
// Replace the config values with your actual Firebase project config.

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { Platform } from 'react-native';
import {
  initializeAuth,
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  deleteUser,
  Auth,
  User,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
  updatePassword,
} from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, FirebaseStorage } from 'firebase/storage';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
  Firestore,
  Timestamp,
  getDocs,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  increment,
  runTransaction,
} from 'firebase/firestore';
import {
  getFunctions,
  httpsCallable,
  Functions,
} from 'firebase/functions';

// ─────────────────────────────────────────────────────────────
// TODO: Replace with your Firebase project config
// Get this from: Firebase Console → Project Settings → Web App
// While config is placeholder, online features are disabled
// and the app runs in LOCAL-ONLY mode (vs Bot works fine).
// ─────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: 'AIzaSyCqOxJho8j4jGNOfixR4TDCDfOo9jdcnIs',
  authDomain: 'phathrix-9a934.firebaseapp.com',
  projectId: 'phathrix-9a934',
  storageBucket: 'phathrix-9a934.firebasestorage.app',
  messagingSenderId: '224820063552',
  appId: '1:224820063552:web:02e47c19d9f3f9060c1ea5',
  measurementId: 'G-FJ1KTJWXH0',
};

const isFirebaseConfigured = firebaseConfig.apiKey !== 'YOUR_API_KEY';

// Initialize Firebase (singleton) — only if properly configured
let app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _functions: Functions | null = null;
let _storage: FirebaseStorage | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    
    // Initialize Auth — web uses getAuth, native uses AsyncStorage persistence
    if (Platform.OS === 'web') {
      _auth = getAuth(app);
    } else {
      try {
        // getReactNativePersistence is in firebase/auth's react-native conditional export
        // resolved by Metro at runtime — TS types don't expose it in the browser typings
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { getReactNativePersistence } = require('firebase/auth');
        _auth = initializeAuth(app, {
          persistence: getReactNativePersistence(ReactNativeAsyncStorage),
        });
      } catch {
        // Auth already initialized (e.g. hot reload) — reuse existing instance
        _auth = getAuth(app);
      }
    }

    _db = getFirestore(app);
    _functions = getFunctions(app, 'us-central1');
    _storage = getStorage(app);
  } catch (e) {
    console.warn('[Firebase] Initialization failed:', e);
  }
}

export const auth: Auth = _auth as Auth;
export const db: Firestore = _db as Firestore;
export const functions: Functions = _functions as Functions;
export const storage: FirebaseStorage = _storage as FirebaseStorage;
export const isOnlineModeAvailable = isFirebaseConfigured;

const BOT_ID = 'bot';

// ── Auth Operations ───────────────────────────────────────────

function requireFirebase(name: string): never {
  throw new Error(`Online features require Firebase configuration. Set up Firebase to use ${name}.`);
}

export const firebaseSignIn = (email: string, password: string) => {
  if (!isFirebaseConfigured) requireFirebase('Sign In');
  return signInWithEmailAndPassword(auth, email, password);
};

export const firebaseSignUp = async (email: string, password: string, displayName: string) => {
  if (!isFirebaseConfigured) requireFirebase('Sign Up');
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  return cred;
};

export const firebaseSignOut = () => {
  if (!isFirebaseConfigured) return Promise.resolve();
  return fbSignOut(auth);
};

export const onAuthChange = (callback: (user: User | null) => void) =>
  onAuthStateChanged(auth, callback);

/**
 * Re-authenticates the current user using their password.
 * Required for sensitive actions like changing email or password.
 */
export const reauthenticateUser = async (currentPassword: string) => {
  const user = auth.currentUser;
  if (!user || !user.email) return;
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
};

/**
 * Updates the user's email address in both Auth and Firestore.
 */
export const firebaseUpdateEmail = async (newEmail: string) => {
  const user = auth.currentUser;
  if (!user) return;
  
  // 1. Update in Firebase Auth
  await updateEmail(user, newEmail);
  
  // 2. Update in Firestore document
  await updateDoc(doc(db, 'users', user.uid), {
    email: newEmail
  });
};

/**
 * Updates the current user's password.
 */
export const firebaseUpdatePassword = async (newPassword: string) => {
  const user = auth.currentUser;
  if (!user) return;
  await updatePassword(user, newPassword);
};

// ── User Profile ──────────────────────────────────────────────

/** 
 * Checks if a username is available (case-insensitive).
 */
export const isUsernameAvailable = async (displayName: string): Promise<boolean> => {
  const nameLower = displayName.trim().toLowerCase();
  if (!nameLower) return false;
  const snap = await getDoc(doc(db, 'usernames', nameLower));
  return !snap.exists();
};

import { 
  ProceduralAvatar, 
  generateRandomAvatar, 
  AvatarConfig 
} from '../../presentation/components/ProceduralAvatar';

// ... (existing imports skipped for brevity by tool logic)

/** 
 * Create user document in Firestore + reserve username.
 * Throws 'USERNAME_TAKEN' if already reserved.
 */
export const createUserDocument = async (uid: string, displayName: string, email: string) => {
  const nameLower = displayName.trim().toLowerCase();
  
  await runTransaction(db, async (transaction) => {
    const nameRef = doc(db, 'usernames', nameLower);
    const nameSnap = await transaction.get(nameRef);
    
    if (nameSnap.exists()) {
      throw new Error('USERNAME_TAKEN');
    }

    // 1. Reserve name
    transaction.set(nameRef, { uid });

    // 2. Create profile with default random avatar
    const userRef = doc(db, 'users', uid);
    transaction.set(userRef, {
      uid,
      displayName,
      displayNameLower: nameLower,
      email,
      avatarUrl: null,
      avatarConfig: generateRandomAvatar(),
      elo: 1200,
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      currentStreak: 0,
      bestStreak: 0,
      friendIds: [],
      status: 'free',
      createdAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
      lastMatchAt: serverTimestamp(),
      settings: {
        soundEnabled: true,
        musicEnabled: false,
        notificationsEnabled: true,
        languageCode: 'en',
        showForcedMoveHints: true,
      },
    });
  });
};

// ... (other functions)

/** Update the procedural avatar configuration in Firestore. */
export const updateAvatarConfig = async (uid: string, config: AvatarConfig) => {
  await updateDoc(doc(db, 'users', uid), { 
    avatarConfig: config, 
    lastSeenAt: serverTimestamp() 
  });
};

/** Upload a local image URI as avatar to Firebase Storage and return the public URL. */
// [REMOVED as requested due to cost/complexity pivot]
// export const uploadAvatarFromUri = ...

/**
 * Permanently delete the current user's account...
 */

export const getUserDocument = async (uid: string) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
};

export const updateUserDocument = (uid: string, updates: Record<string, any>) =>
  updateDoc(doc(db, 'users', uid), { ...updates, lastSeenAt: serverTimestamp() });

export const watchUserDocument = (uid: string, callback: (data: any) => void) =>
  onSnapshot(doc(db, 'users', uid), (snap) => {
    if (snap.exists()) callback(snap.data());
  });

// ── Matches ───────────────────────────────────────────────────

export const watchMatch = (matchId: string, callback: (data: any) => void) =>
  onSnapshot(doc(db, 'matches', matchId), (snap) => {
    if (snap.exists()) callback(snap.data());
  });

export const validateAndApplyMove = httpsCallable(functions, 'validateAndApplyMove');
export const findOrCreateRandomMatch = httpsCallable(functions, 'findOrCreateRandomMatch');
export const challengeFriend = httpsCallable(functions, 'challengeFriend');
export const acceptChallenge = httpsCallable(functions, 'acceptChallenge');
export const resignMatch = httpsCallable(functions, 'resignMatch');

// ── Chat ──────────────────────────────────────────────────────

export const sendChatMessage = (matchId: string, senderId: string, senderName: string, text: string) =>
  addDoc(collection(db, 'matches', matchId, 'chat'), {
    senderId,
    senderName,
    text: text.slice(0, 200),
    sentAt: serverTimestamp(),
    isSystemMessage: false,
  });

export const watchChat = (matchId: string, callback: (messages: any[]) => void) =>
  onSnapshot(
    query(
      collection(db, 'matches', matchId, 'chat'),
      orderBy('sentAt', 'asc'),
      limit(100),
    ),
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
  );

// ── Leaderboard ───────────────────────────────────────────────

/** Reads top players directly from the users collection sorted by ELO. */
export const getLeaderboard = async (_period: 'allTime' | 'monthly' | 'weekly', count = 50) => {
  const snap = await getDocs(
    query(collection(db, 'users'), orderBy('elo', 'desc'), limit(count)),
  );
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
};

// ── Random Matchmaking (Firestore-based, no Cloud Functions) ──

export const joinMatchmakingQueue = (uid: string, displayName: string, elo: number, avatarConfig?: AvatarConfig) =>
  setDoc(doc(db, 'matchmakingQueue', uid), {
    uid, displayName, elo, avatarConfig,
    status: 'searching',
    matchId: null,
    joinedAt: serverTimestamp(),
  });

export const leaveMatchmakingQueue = (uid: string) =>
  deleteDoc(doc(db, 'matchmakingQueue', uid));

export const watchMatchmakingEntry = (uid: string, callback: (data: any) => void) =>
  onSnapshot(doc(db, 'matchmakingQueue', uid), (snap) => {
    if (snap.exists()) callback(snap.data());
  });

/**
 * Tries to find and match with another player in the queue.
 * Returns match info if matched, or null if no one is waiting.
 */
export const findMatchInQueue = async (
  uid: string, displayName: string, elo: number, avatarConfig?: AvatarConfig
): Promise<{ matchId: string; playerCyanId: string; playerOrangeId: string } | null> => {
  const snap = await getDocs(
    query(collection(db, 'matchmakingQueue'), where('status', '==', 'searching'), limit(10)),
  );
  const others = snap.docs.filter(d => d.id !== uid && !d.data().matchId);
  if (others.length === 0) return null;

  // Pick closest ELO
  const opponent = others.sort(
    (a, b) => Math.abs(a.data().elo - elo) - Math.abs(b.data().elo - elo),
  )[0];
  const opData = opponent.data();

  const matchId = `rm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await setDoc(doc(db, 'matches', matchId), {
    playerCyanId: uid,
    playerCyanName: displayName,
    playerCyanAvatarConfig: avatarConfig || null,
    playerOrangeId: opData.uid,
    playerOrangeName: opData.displayName,
    playerOrangeAvatarConfig: opData.avatarConfig || null,
    playerUids: [uid, opData.uid],
    status: 'active',
    type: 'random',
    gameStateJson: null,
    createdAt: serverTimestamp(),
  });

  await Promise.all([
    updateDoc(doc(db, 'matchmakingQueue', uid), { status: 'matched', matchId }),
    updateDoc(doc(db, 'matchmakingQueue', opData.uid), { status: 'matched', matchId, opponentId: uid }),
  ]);

  return { matchId, playerCyanId: uid, playerOrangeId: opData.uid };
};

/**
 * Fetches unique rival IDs from recent matches.
 */
export const getRecentOpponentIds = async (uid: string): Promise<string[]> => {
  const q = query(
    collection(db, 'matches'),
    where('playerUids', 'array-contains', uid),
    limit(50)
  );
  
  const snap = await getDocs(q);
  
  const docs = snap.docs
    .filter(d => d.data().type === 'random')
    .sort((a, b) => {
      const tA = a.data().createdAt?.seconds || 0;
      const tB = b.data().createdAt?.seconds || 0;
      return tB - tA;
    })
    .slice(0, 20);

  const rivalIds = new Set<string>();
  docs.forEach(d => {
    const data = d.data();
    const rival = data.playerUids?.find((id: string) => id !== uid);
    if (rival && rival !== BOT_ID) rivalIds.add(rival);
  });

  return Array.from(rivalIds);
};



// ── Friend Challenges ─────────────────────────────────────────

export const getPendingChallenges = (uid: string, callback: (challenges: any[]) => void) =>
  onSnapshot(
    query(
      collection(db, 'friendChallenges'),
      where('toUid', '==', uid),
      where('status', '==', 'pending'),
    ),
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
  );

/** Create a friend challenge + a waiting match document. Returns matchId & challengeId. */
export const createFriendChallengeWithMatch = async (
  fromUid: string, fromName: string, toUid: string, toName: string, avatarConfig?: AvatarConfig
): Promise<{ matchId: string; challengeId: string }> => {
  const matchId = `fm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await setDoc(doc(db, 'matches', matchId), {
    playerCyanId: fromUid,
    playerCyanName: fromName,
    playerCyanAvatarConfig: avatarConfig || null,
    playerOrangeId: toUid,
    playerOrangeName: toName,
    playerOrangeAvatarConfig: null, // to be populated when accepted
    playerUids: [fromUid, toUid],
    status: 'waiting',
    type: 'friend',
    gameStateJson: null,
    createdAt: serverTimestamp(),
  });
  const ref = await addDoc(collection(db, 'friendChallenges'), {
    fromUid, fromName, toUid, toName, matchId,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  return { matchId, challengeId: ref.id };
};

/** Called by the challenged player: activates the match. */
export const acceptFriendChallengeDirect = async (challengeId: string, matchId: string, avatarConfig?: AvatarConfig) => {
  await Promise.all([
    updateDoc(doc(db, 'matches', matchId), { 
      status: 'active',
      playerOrangeAvatarConfig: avatarConfig || null 
    }),
    updateDoc(doc(db, 'friendChallenges', challengeId), { status: 'accepted' }),
  ]);
};

/** Called by the challenged player: rejects and removes the match. */
export const declineFriendChallengeDirect = async (challengeId: string, matchId: string) => {
  await Promise.all([
    deleteDoc(doc(db, 'matches', matchId)),
    updateDoc(doc(db, 'friendChallenges', challengeId), { status: 'declined' }),
  ]);
};

/** Challenger watches a specific challenge for accepted/declined updates. */
export const watchChallengeStatus = (challengeId: string, callback: (data: any) => void) =>
  onSnapshot(doc(db, 'friendChallenges', challengeId), (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() });
  });

/** Write serialized game state to match after a move. */
export const writeOnlineMove = (matchId: string, gameStateJson: string, currentTurn: string, finished = false, goBackBy?: string) =>
  updateDoc(doc(db, 'matches', matchId), {
    gameStateJson,
    currentTurn,
    status: finished ? 'finished' : 'active',
    lastMoveAt: serverTimestamp(),
    ...(goBackBy ? { goBackBy } : { goBackBy: null }),
  });

/**
 * Internal logic to update user stats post-match (ELO, Streaks, etc)
 * via Transaction to ensure atomicity.
 */
const updateUsersStatsTransaction = async (
  winnerId: string, 
  loserId: string, 
  winnerDelta: number, 
  loserDelta: number
) => {
  if (winnerId === BOT_ID || loserId === BOT_ID) return;

  await runTransaction(db, async (transaction) => {
    const winnerRef = doc(db, 'users', winnerId);
    const loserRef = doc(db, 'users', loserId);
    
    const [winnerSnap, loserSnap] = await Promise.all([
      transaction.get(winnerRef),
      transaction.get(loserRef),
    ]);

    const winnerData = winnerSnap.data() || {};
    const loserData = loserSnap.data() || {};

    // Calculate new streaks
    const currentStreak = (winnerData.currentStreak || 0) + 1;
    const bestStreak = Math.max(winnerData.bestStreak || 0, currentStreak);

    // Update winner
    transaction.update(winnerRef, {
      gamesPlayed:   (winnerData.gamesPlayed || 0) + 1,
      gamesWon:      (winnerData.gamesWon || 0) + 1,
      elo:           (winnerData.elo || 1200) + winnerDelta,
      currentStreak: currentStreak,
      bestStreak:    bestStreak,
      lastSeenAt:    serverTimestamp(),
      lastMatchAt:   serverTimestamp(),
    });

    // Update loser
    transaction.update(loserRef, {
      gamesPlayed:   (loserData.gamesPlayed || 0) + 1,
      gamesLost:     (loserData.gamesLost || 0) + 1,
      elo:           Math.max(100, (loserData.elo || 1200) + loserDelta), // Elo floor
      currentStreak: 0,
      lastSeenAt:    serverTimestamp(),
      lastMatchAt:   serverTimestamp(),
    });
  });
};

/**
 * Finalize a match that ended normally (one player connected sides or formed a loop).
 */
export const finalizeOnlineMatch = async (matchId: string, winnerId: string, loserId: string) => {
  // 1. Mark match as finished
  await updateDoc(doc(db, 'matches', matchId), {
    status: 'finished',
    winnerId,
    loserId,
    finishedAt: serverTimestamp(),
  });

  // 2. Fetch stats and compute ELO
  const [winnerSnap, loserSnap] = await Promise.all([
    getDoc(doc(db, 'users', winnerId)),
    getDoc(doc(db, 'users', loserId)),
  ]);
  
  const winnerData = winnerSnap.data() ?? {};
  const loserData  = loserSnap.data() ?? {};

  const kFactor = (g: number) => g < 30 ? 32 : g < 100 ? 24 : 16;
  const expected = (ra: number, rb: number) => 1 / (1 + 10 ** ((rb - ra) / 400));
  
  const wElo = winnerData.elo ?? 1200;
  const lElo = loserData.elo  ?? 1200;
  const wGames = winnerData.gamesPlayed ?? 0;
  const lGames = loserData.gamesPlayed  ?? 0;

  const winnerDelta = Math.round(kFactor(wGames) * (1 - expected(wElo, lElo)));
  const loserDelta  = Math.round(kFactor(lGames) * (0 - expected(lElo, wElo)));

  // 3. Update stats via transaction
  await updateUsersStatsTransaction(winnerId, loserId, winnerDelta, loserDelta);
};

/**
 * Forfeit an online match.
 */
export const forfeitMatch = async (
  matchId: string,
  forfeitingUid: string,
  opponentUid: string,
  endReason: 'fled' | 'timeout_abandon',
) => {
  const winnerId = endReason === 'fled' ? opponentUid : forfeitingUid;
  const loserId  = endReason === 'fled' ? forfeitingUid : opponentUid;

  // 1. Mark match as forfeited
  await updateDoc(doc(db, 'matches', matchId), {
    status: 'forfeited',
    endReason,
    winnerId,
    loserId,
    forfeitedAt: serverTimestamp(),
  });

  // 2. Fetch stats and compute ELO
  const [winnerSnap, loserSnap] = await Promise.all([
    getDoc(doc(db, 'users', winnerId)),
    getDoc(doc(db, 'users', loserId)),
  ]);
  const winnerData = winnerSnap.data() ?? {};
  const loserData  = loserSnap.data() ?? {};

  const kFactor = (g: number) => g < 30 ? 32 : g < 100 ? 24 : 16;
  const expected = (ra: number, rb: number) => 1 / (1 + 10 ** ((rb - ra) / 400));

  const wElo = winnerData.elo ?? 1200;
  const lElo = loserData.elo  ?? 1200;
  const wGames = winnerData.gamesPlayed ?? 0;
  const lGames = loserData.gamesPlayed  ?? 0;

  const winnerDelta = Math.round(kFactor(wGames) * (1 - expected(wElo, lElo)));
  const loserDelta  = Math.round(kFactor(lGames) * (0 - expected(lElo, wElo)));

  // 3. Update stats via transaction
  await updateUsersStatsTransaction(winnerId, loserId, winnerDelta, loserDelta);
};

export const getFriendsList = async (friendIds: string[]) => {
  if (friendIds.length === 0) return [];
  const results = await Promise.all(
    friendIds.map(id => getDoc(doc(db, 'users', id)))
  );
  return results.filter(s => s.exists()).map(s => ({ id: s.id, ...s.data() }));
};

/** Watch all friends in real-time (one onSnapshot per friend). Returns unsub fn. */
export const watchFriendsList = (
  friendIds: string[],
  callback: (friends: any[]) => void,
): (() => void) => {
  if (friendIds.length === 0) { callback([]); return () => {}; }
  const cache: Record<string, any> = {};
  const unsubs = friendIds.map(id =>
    onSnapshot(doc(db, 'users', id), (snap) => {
      if (snap.exists()) cache[id] = { id: snap.id, ...snap.data() };
      else delete cache[id];
      // Return in original order
      callback(friendIds.map(fid => cache[fid]).filter(Boolean));
    }),
  );
  return () => unsubs.forEach(u => u());
};

/** Set the user's online status: 'free' | 'playing' | 'offline'. */
export const setUserStatus = (uid: string, status: 'free' | 'playing' | 'offline') =>
  updateDoc(doc(db, 'users', uid), { status, lastSeenAt: serverTimestamp() }).catch(() => {});

/** Explicitly update the last match timestamp for a user. */
export const updateUserLastMatch = (uid: string) =>
  updateDoc(doc(db, 'users', uid), { lastMatchAt: serverTimestamp() }).catch(() => {});

// ── Friends ───────────────────────────────────────────────────

/**
 * Search users by displayName prefix (case-insensitive via stored lowercase field).
 * Firestore workaround: we query `displayNameLower` field >= term and <= term + '\uf8ff'.
 */
export const searchUsers = async (term: string, excludeUid: string): Promise<Array<{ id: string } & Record<string, any>>> => {
  const lower = term.trim().toLowerCase();
  if (lower.length < 2) return [];
  const snap = await getDocs(
    query(
      collection(db, 'users'),
      where('displayNameLower', '>=', lower),
      where('displayNameLower', '<=', lower + '\uf8ff'),
      limit(20),
    ),
  );
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }) as { id: string } & Record<string, any>)
    .filter(u => u.id !== excludeUid);
};

/** Send a friend request. Silently skips if one already exists. */
export const sendFriendRequest = async (fromUid: string, fromName: string, toUid: string, toName: string) => {
  // Check no duplicate
  const existing = await getDocs(
    query(
      collection(db, 'friendRequests'),
      where('fromUid', '==', fromUid),
      where('toUid', '==', toUid),
      where('status', '==', 'pending'),
    ),
  );
  if (!existing.empty) return;
  await addDoc(collection(db, 'friendRequests'), {
    fromUid, fromName, toUid, toName,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
};

/** Watch incoming pending friend requests for a user. */
export const watchFriendRequests = (uid: string, callback: (requests: any[]) => void) =>
  onSnapshot(
    query(
      collection(db, 'friendRequests'),
      where('toUid', '==', uid),
      where('status', '==', 'pending'),
    ),
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
  );

/** Watch outgoing pending friend requests for a user. */
export const watchSentFriendRequests = (uid: string, callback: (requests: any[]) => void) =>
  onSnapshot(
    query(
      collection(db, 'friendRequests'),
      where('fromUid', '==', uid),
      where('status', '==', 'pending'),
    ),
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
  );

/** Accept a friend request: adds each user to the other's friendIds and deletes the request. */
export const acceptFriendRequest = async (requestId: string, fromUid: string, toUid: string) => {
  await Promise.all([
    updateDoc(doc(db, 'users', fromUid), { friendIds: arrayUnion(toUid) }),
    updateDoc(doc(db, 'users', toUid),   { friendIds: arrayUnion(fromUid) }),
    deleteDoc(doc(db, 'friendRequests', requestId)),
  ]);
};

/** Decline a friend request: just deletes the document. */
export const declineFriendRequest = (requestId: string) =>
  deleteDoc(doc(db, 'friendRequests', requestId));

/** Remove a friend from both users' friendIds. */
export const removeFriend = async (uid: string, friendUid: string) => {
  await Promise.all([
    updateDoc(doc(db, 'users', uid),       { friendIds: arrayRemove(friendUid) }),
    updateDoc(doc(db, 'users', friendUid), { friendIds: arrayRemove(uid) }),
  ]);
};

// ── Social Sign-In ────────────────────────────────────────────

/**
 * Sign in with Google using expo-auth-session.
 * Returns the Firebase User on success.
 */
export const signInWithGoogle = async (idToken: string): Promise<User> => {
  if (!isFirebaseConfigured) requireFirebase('Google Sign-In');
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  return result.user;
};

/**
 * Sign in with Apple using expo-apple-authentication.
 * Returns the Firebase User on success.
 */
export const signInWithApple = async (idToken: string, nonce: string): Promise<User> => {
  if (!isFirebaseConfigured) requireFirebase('Apple Sign-In');
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({ idToken, rawNonce: nonce });
  const result = await signInWithCredential(auth, credential);
  return result.user;
};

// ── Profile management ────────────────────────────────────────

/** Update display name in both Firebase Auth and Firestore. */
/** Update display name in both Firebase Auth and Firestore with uniqueness check. */
export const updateDisplayName = async (uid: string, newName: string) => {
  const trimmed = newName.trim();
  const nameLower = trimmed.toLowerCase();
  if (!nameLower) throw new Error('Name cannot be empty');

  await runTransaction(db, async (transaction) => {
    const userRef = doc(db, 'users', uid);
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) throw new Error('User not found');
    
    const oldNameLower = userSnap.data()?.displayNameLower;
    
    // If name is the same (ignoring case), do nothing or just update display casing
    if (oldNameLower === nameLower) {
      transaction.update(userRef, { displayName: trimmed, lastSeenAt: serverTimestamp() });
      return;
    }

    // Check if new name is taken
    const newNameRef = doc(db, 'usernames', nameLower);
    const newNameSnap = await transaction.get(newNameRef);
    if (newNameSnap.exists()) {
      throw new Error('USERNAME_TAKEN');
    }

    // 1. Release old name
    if (oldNameLower) {
      transaction.delete(doc(db, 'usernames', oldNameLower));
    }

    // 2. Reserve new name
    transaction.set(newNameRef, { uid });

    // 3. Update profile doc
    transaction.update(userRef, {
      displayName: trimmed,
      displayNameLower: nameLower,
      lastSeenAt: serverTimestamp(),
    });
  });

  // 4. Sync to Auth profile (Best effort)
  if (auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName: trimmed });
  }
};

/** Upload a local image URI as avatar to Firebase Storage and return the public URL. */
export const uploadAvatarFromUri = async (uid: string, localUri: string): Promise<string> => {
  try {
    console.log('[Firebase] Starting upload for:', uid, 'URI:', localUri);
    
    // 1. Fetch the file data
    const response = await fetch(localUri);
    const blob = await response.blob();
    
    // 2. Validate size (Max 2MB per storage rules)
    if (blob.size > 2 * 1024 * 1024) {
      throw new Error('PHOTO_TOO_LARGE');
    }

    // 3. Prepare reference
    const ref = storageRef(storage, `avatars/${uid}`);
    
    // 4. Perform upload
    console.log('[Firebase] Uploading blob of size:', blob.size);
    await uploadBytes(ref, blob, { 
      contentType: 'image/jpeg',
      customMetadata: { uploadedBy: uid }
    });
    
    // 5. Get public URL
    const url = await getDownloadURL(ref);
    console.log('[Firebase] Upload successful, URL:', url);
    
    // 6. Sync to Auth and Firestore
    if (auth.currentUser) await updateProfile(auth.currentUser, { photoURL: url });
    await updateDoc(doc(db, 'users', uid), { 
      avatarUrl: url, 
      lastSeenAt: serverTimestamp() 
    });
    
    return url;
  } catch (err: any) {
    console.error('[Firebase] Upload error details:', err);
    // Re-throw more descriptive errors
    if (err.message === 'PHOTO_TOO_LARGE') throw new Error('profile.error.photoTooLarge');
    throw err;
  }
};

/**
 * Permanently delete the current user's account:
 * removes Firestore document then deletes the Firebase Auth user.
 * Throws 'auth/requires-recent-login' if session is stale.
 */
export const deleteUserAccount = async (uid: string) => {
  if (!auth.currentUser) throw new Error('Not authenticated');
  await deleteDoc(doc(db, 'users', uid));
  await deleteUser(auth.currentUser);
};
