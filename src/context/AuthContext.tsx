'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  getBookmarks,
  getHistory,
  getReaderSettings,
  clearHistory,
  removeHistoryItem,
  removeBookmark,
} from '@/lib/storage';
import { BookmarkItem, HistoryItem } from '@/types/manga';
import { auth, db, isFirebaseConfigured } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from 'firebase/firestore';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  syncCode: string;
  isFirebase: boolean;
  bookmarksCount?: number;
  historyCount?: number;
  updatedAt?: number;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  syncing: boolean;
  lastSynced: number | null;
  isFirebaseActive: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (usernameOrEmail: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  loginWithSyncCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  syncNow: () => Promise<void>;
  clearHistoryAndSync: () => Promise<void>;
  removeHistoryItemAndSync: (mangaId: string) => Promise<void>;
  removeBookmarkAndSync: (mangaId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to convert plain username to email format for Firebase Auth if user didn't enter '@'
function normalizeEmail(input: string): string {
  const trimmed = input.trim();
  if (trimmed.includes('@')) return trimmed.toLowerCase();
  // Sanitize username
  const clean = trimmed.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return `${clean || 'user'}@mangaverse.app`;
}

function extractUsername(emailOrUser: string): string {
  if (emailOrUser.includes('@mangaverse.app')) {
    return emailOrUser.split('@')[0];
  }
  if (emailOrUser.includes('@')) {
    return emailOrUser.split('@')[0];
  }
  return emailOrUser;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<number | null>(null);

  const unsubscribeSnapshotRef = useRef<(() => void) | null>(null);
  const isSyncingFromCloudRef = useRef(false);

  // Sync server/cloud data into local storage safely without re-adding deleted items
  const mergeCloudToLocal = useCallback((serverBookmarks?: BookmarkItem[], serverHistory?: HistoryItem[]) => {
    isSyncingFromCloudRef.current = true;
    try {
      if (Array.isArray(serverBookmarks)) {
        localStorage.setItem('mangaverse_bookmarks_v1', JSON.stringify(serverBookmarks));
      }
      if (Array.isArray(serverHistory)) {
        localStorage.setItem('mangaverse_history_v1', JSON.stringify(serverHistory));
      }
      window.dispatchEvent(new Event('mangaverse_storage_update'));
    } catch (e) {
      console.error('Error applying cloud sync to local storage:', e);
    } finally {
      setTimeout(() => {
        isSyncingFromCloudRef.current = false;
      }, 500);
    }
  }, []);

  // Push local data to Firestore if Firebase is active
  const pushLocalToFirestore = useCallback(async (uid: string) => {
    if (!db) return;
    try {
      const bookmarks = getBookmarks();
      const history = getHistory();
      const settings = getReaderSettings();

      const userDocRef = doc(db, 'users', uid);
      await setDoc(
        userDocRef,
        {
          bookmarks,
          history,
          settings,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
      setLastSynced(Date.now());
    } catch (err) {
      console.error('Failed to sync to Firestore:', err);
    }
  }, []);

  // Listen for Firebase Auth state changes
  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
        if (fbUser) {
          const email = fbUser.email || '';
          const uname = fbUser.displayName || extractUsername(email);
          const syncCode = fbUser.uid.slice(0, 6).toUpperCase();

          setUser({
            id: fbUser.uid,
            email,
            username: uname,
            syncCode,
            isFirebase: true,
          });

          // Setup real-time listener to Firestore document
          if (db) {
            const userDocRef = doc(db, 'users', fbUser.uid);

            // First fetch initial
            try {
              const snap = await getDoc(userDocRef);
              if (snap.exists()) {
                const data = snap.data();
                mergeCloudToLocal(data.bookmarks || [], data.history || []);
                setLastSynced(data.updatedAt || Date.now());
              } else {
                // First time user: push local data to Firestore
                await pushLocalToFirestore(fbUser.uid);
              }
            } catch (err) {
              console.error('Error fetching initial Firestore data:', err);
            }

            // Real-time updates from other devices!
            if (unsubscribeSnapshotRef.current) unsubscribeSnapshotRef.current();
            unsubscribeSnapshotRef.current = onSnapshot(userDocRef, (docSnap) => {
              if (docSnap.exists()) {
                const data = docSnap.data();
                mergeCloudToLocal(data.bookmarks || [], data.history || []);
                setLastSynced(data.updatedAt || Date.now());
              }
            });
          }
        } else {
          setUser(null);
          if (unsubscribeSnapshotRef.current) {
            unsubscribeSnapshotRef.current();
            unsubscribeSnapshotRef.current = null;
          }
        }
        setLoading(false);
      });

      return () => {
        unsubscribe();
        if (unsubscribeSnapshotRef.current) unsubscribeSnapshotRef.current();
      };
    } else {
      // Fallback mode: Check local session from Next.js API
      async function checkLocalSession() {
        try {
          const res = await fetch('/api/auth/me');
          if (res.ok) {
            const data = await res.json();
            if (data.authenticated && data.user) {
              setUser({
                ...data.user,
                email: `${data.user.username}@local.app`,
                isFirebase: false,
              });
              // Pull local sync
              const syncRes = await fetch('/api/sync');
              if (syncRes.ok) {
                const syncData = await syncRes.json();
                mergeCloudToLocal(syncData.bookmarks || [], syncData.history || []);
                setLastSynced(syncData.updatedAt || Date.now());
              }
            } else {
              setUser(null);
            }
          }
        } catch {
          setUser(null);
        } finally {
          setLoading(false);
        }
      }
      checkLocalSession();
    }
  }, [mergeCloudToLocal, pushLocalToFirestore]);

  // Sync automatically on local storage changes if user is logged in
  useEffect(() => {
    if (!user) return;

    let debounceTimer: NodeJS.Timeout;
    const handleStorageChange = () => {
      if (isSyncingFromCloudRef.current) return;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (user.isFirebase && user.id) {
          pushLocalToFirestore(user.id);
        } else {
          // Fallback API push
          const bookmarks = getBookmarks();
          const history = getHistory();
          const settings = getReaderSettings();
          fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookmarks, history, settings }),
          })
            .then(() => setLastSynced(Date.now()))
            .catch(() => {});
        }
      }, 1500);
    };

    window.addEventListener('mangaverse_storage_update', handleStorageChange);
    return () => {
      clearTimeout(debounceTimer);
      window.removeEventListener('mangaverse_storage_update', handleStorageChange);
    };
  }, [user, pushLocalToFirestore]);

  const login = async (usernameOrEmail: string, password: string) => {
    // 1. Firebase Auth Mode
    if (isFirebaseConfigured && auth) {
      try {
        const email = normalizeEmail(usernameOrEmail);
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const uname = extractUsername(usernameOrEmail);
        setUser({
          id: cred.user.uid,
          email: cred.user.email || email,
          username: uname,
          syncCode: cred.user.uid.slice(0, 6).toUpperCase(),
          isFirebase: true,
        });

        // Pull user's bookmarks from Firestore
        if (db) {
          const userDocRef = doc(db, 'users', cred.user.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data();
            mergeCloudToLocal(data.bookmarks || [], data.history || []);
            setLastSynced(data.updatedAt || Date.now());
          }
          // Then push any local bookmarks
          await pushLocalToFirestore(cred.user.uid);
        }

        return { success: true };
      } catch (err: any) {
        let msg = 'Failed to sign in';
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          msg = 'Account not found or invalid password';
        } else if (err.code === 'auth/wrong-password') {
          msg = 'Incorrect password';
        } else if (err.message) {
          msg = err.message;
        }
        return { success: false, error: msg };
      }
    }

    // 2. Fallback Mode
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameOrEmail, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }
      setUser({ ...data.user, email: `${data.user.username}@local.app`, isFirebase: false });
      mergeCloudToLocal(data.user.bookmarks || [], data.user.history || []);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const register = async (usernameOrEmail: string, password: string) => {
    // 1. Firebase Auth Mode
    if (isFirebaseConfigured && auth) {
      try {
        const email = normalizeEmail(usernameOrEmail);
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const uname = extractUsername(usernameOrEmail);

        const newUser: AuthUser = {
          id: cred.user.uid,
          email: cred.user.email || email,
          username: uname,
          syncCode: cred.user.uid.slice(0, 6).toUpperCase(),
          isFirebase: true,
        };
        setUser(newUser);

        // Save initial user doc in Firestore
        if (db) {
          const userDocRef = doc(db, 'users', cred.user.uid);
          await setDoc(userDocRef, {
            username: uname,
            email,
            bookmarks: getBookmarks(),
            history: getHistory(),
            settings: getReaderSettings(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }

        return { success: true };
      } catch (err: any) {
        let msg = 'Registration failed';
        if (err.code === 'auth/email-already-in-use') {
          msg = 'Username / Email already registered! Please log in instead.';
        } else if (err.code === 'auth/weak-password') {
          msg = 'Password should be at least 6 characters.';
        } else if (err.message) {
          msg = err.message;
        }
        return { success: false, error: msg };
      }
    }

    // 2. Fallback Mode
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameOrEmail, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }
      setUser({ ...data.user, email: `${data.user.username}@local.app`, isFirebase: false });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured || !auth) {
      return {
        success: false,
        error: 'Firebase is not yet configured. Please add Firebase keys in Vercel Environment Variables first.',
      };
    }

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);
      const email = cred.user.email || '';
      const uname = cred.user.displayName || extractUsername(email);
      const syncCode = cred.user.uid.slice(0, 6).toUpperCase();

      setUser({
        id: cred.user.uid,
        email,
        username: uname,
        syncCode,
        isFirebase: true,
      });

      if (db) {
        const userDocRef = doc(db, 'users', cred.user.uid);
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const data = snap.data();
          mergeCloudToLocal(data.bookmarks || [], data.history || []);
          setLastSynced(data.updatedAt || Date.now());
        } else {
          await setDoc(userDocRef, {
            username: uname,
            email,
            bookmarks: getBookmarks(),
            history: getHistory(),
            settings: getReaderSettings(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
        await pushLocalToFirestore(cred.user.uid);
      }

      return { success: true };
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        return { success: false, error: 'Sign in cancelled' };
      }
      if (err.code === 'auth/unauthorized-domain') {
        return {
          success: false,
          error: 'Vercel domain is not authorized in Firebase! In Firebase Console -> Authentication -> Settings -> Authorized domains, add your Vercel domain.',
        };
      }
      if (err.code === 'auth/operation-not-allowed') {
        return {
          success: false,
          error: 'Google sign-in is not enabled in Firebase! In Firebase Console -> Authentication -> Sign-in method, click Google and turn on Enable.',
        };
      }
      return { success: false, error: err.message || 'Google sign-in failed' };
    }
  };

  const loginWithSyncCode = async (syncCode: string) => {
    try {
      const res = await fetch('/api/sync/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Invalid sync code' };
      }

      setUser({ ...data.user, email: `${data.user.username}@local.app`, isFirebase: false });
      mergeCloudToLocal(data.user.bookmarks || [], data.user.history || []);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const logout = async () => {
    if (unsubscribeSnapshotRef.current) {
      unsubscribeSnapshotRef.current();
      unsubscribeSnapshotRef.current = null;
    }
    if (isFirebaseConfigured && auth) {
      try {
        await fbSignOut(auth);
      } catch {
        // Ignore
      }
    } else {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch {
        // Ignore
      }
    }
    setUser(null);
  };

  const syncNow = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      if (user.isFirebase && db && user.id) {
        const userDocRef = doc(db, 'users', user.id);
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const data = snap.data();
          mergeCloudToLocal(data.bookmarks || [], data.history || []);
        }
        await pushLocalToFirestore(user.id);
      } else {
        const res = await fetch('/api/sync');
        if (res.ok) {
          const data = await res.json();
          mergeCloudToLocal(data.bookmarks, data.history);
        }
        const bookmarks = getBookmarks();
        const history = getHistory();
        const settings = getReaderSettings();
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookmarks, history, settings }),
        });
      }
      setLastSynced(Date.now());
    } finally {
      setSyncing(false);
    }
  };

  const clearHistoryAndSync = async () => {
    clearHistory();
    if (user?.isFirebase && user.id && db) {
      try {
        const userDocRef = doc(db, 'users', user.id);
        await setDoc(userDocRef, { history: [], updatedAt: Date.now() }, { merge: true });
        setLastSynced(Date.now());
      } catch (err) {
        console.error('Failed to clear history in Firestore:', err);
      }
    } else {
      await syncNow();
    }
  };

  const removeHistoryItemAndSync = async (mangaId: string) => {
    removeHistoryItem(mangaId);
    if (user?.isFirebase && user.id && db) {
      try {
        const updated = getHistory();
        const userDocRef = doc(db, 'users', user.id);
        await setDoc(userDocRef, { history: updated, updatedAt: Date.now() }, { merge: true });
        setLastSynced(Date.now());
      } catch (err) {
        console.error('Failed to remove history item in Firestore:', err);
      }
    } else {
      await syncNow();
    }
  };

  const removeBookmarkAndSync = async (mangaId: string) => {
    removeBookmark(mangaId);
    if (user?.isFirebase && user.id && db) {
      try {
        const updated = getBookmarks();
        const userDocRef = doc(db, 'users', user.id);
        await setDoc(userDocRef, { bookmarks: updated, updatedAt: Date.now() }, { merge: true });
        setLastSynced(Date.now());
      } catch (err) {
        console.error('Failed to remove bookmark in Firestore:', err);
      }
    } else {
      await syncNow();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        syncing,
        lastSynced,
        isFirebaseActive: isFirebaseConfigured,
        login,
        register,
        signInWithGoogle,
        loginWithSyncCode,
        logout,
        syncNow,
        clearHistoryAndSync,
        removeHistoryItemAndSync,
        removeBookmarkAndSync,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
