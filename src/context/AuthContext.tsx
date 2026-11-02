'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getBookmarks, getHistory, getReaderSettings, saveBookmark, saveHistory } from '@/lib/storage';
import { BookmarkItem, HistoryItem } from '@/types/manga';

export interface AuthUser {
  id: string;
  username: string;
  syncCode: string;
  bookmarksCount?: number;
  historyCount?: number;
  updatedAt?: number;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  syncing: boolean;
  lastSynced: number | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithSyncCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<number | null>(null);

  // Sync local data to server
  const pushLocalToServer = useCallback(async () => {
    try {
      const bookmarks = getBookmarks();
      const history = getHistory();
      const settings = getReaderSettings();

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookmarks, history, settings }),
      });

      if (res.ok) {
        setLastSynced(Date.now());
      }
    } catch (err) {
      console.error('Failed to push data to server:', err);
    }
  }, []);

  // Merge server data into local storage
  const mergeServerToLocal = useCallback((serverBookmarks: BookmarkItem[], serverHistory: HistoryItem[]) => {
    if (serverBookmarks && serverBookmarks.length > 0) {
      serverBookmarks.forEach((b) => saveBookmark(b));
    }
    if (serverHistory && serverHistory.length > 0) {
      serverHistory.forEach((h) => saveHistory(h));
    }
    window.dispatchEvent(new Event('mangaverse_storage_update'));
  }, []);

  // Check current session
  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          // Pull latest library data from cloud
          const syncRes = await fetch('/api/sync');
          if (syncRes.ok) {
            const syncData = await syncRes.json();
            mergeServerToLocal(syncData.bookmarks, syncData.history);
            setLastSynced(syncData.updatedAt || Date.now());
          }
        } else {
          setUser(null);
        }
      }
    } catch (err) {
      console.error('Session check failed:', err);
    } finally {
      setLoading(false);
    }
  }, [mergeServerToLocal]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Sync automatically on local storage changes if user is logged in
  useEffect(() => {
    if (!user) return;

    let debounceTimer: NodeJS.Timeout;
    const handleStorageChange = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        pushLocalToServer();
      }, 1500);
    };

    window.addEventListener('mangaverse_storage_update', handleStorageChange);
    return () => {
      clearTimeout(debounceTimer);
      window.removeEventListener('mangaverse_storage_update', handleStorageChange);
    };
  }, [user, pushLocalToServer]);

  const login = async (username: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      setUser(data.user);
      // Merge user's server bookmarks and history with local
      mergeServerToLocal(data.user.bookmarks || [], data.user.history || []);
      // Then sync back any local items
      await pushLocalToServer();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const register = async (username: string, password: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      setUser(data.user);
      // Push existing local bookmarks to the newly created account immediately
      await pushLocalToServer();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
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

      setUser(data.user);
      mergeServerToLocal(data.user.bookmarks || [], data.user.history || []);
      await pushLocalToServer();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    }
    setUser(null);
  };

  const syncNow = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      // 1. Pull server
      const res = await fetch('/api/sync');
      if (res.ok) {
        const data = await res.json();
        mergeServerToLocal(data.bookmarks, data.history);
      }
      // 2. Push local
      await pushLocalToServer();
      setLastSynced(Date.now());
    } finally {
      setSyncing(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        syncing,
        lastSynced,
        login,
        register,
        loginWithSyncCode,
        logout,
        syncNow,
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
