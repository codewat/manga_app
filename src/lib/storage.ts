'use client';

import { BookmarkItem, HistoryItem, ReaderSettings, BookmarkCategory } from '@/types/manga';

const STORAGE_KEYS = {
  BOOKMARKS: 'mangaverse_bookmarks_v1',
  HISTORY: 'mangaverse_history_v1',
  SETTINGS: 'mangaverse_settings_v1',
};

const DEFAULT_SETTINGS: ReaderSettings = {
  mode: 'webtoon',
  direction: 'ltr',
  dataSaver: false,
  fitMode: 'width',
  preloadPages: 3,
};

function safeGetItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return defaultValue;
  }
}

function safeSetItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event('mangaverse_storage_update'));
  } catch (e) {
    console.error(`Error writing ${key} to localStorage:`, e);
  }
}

// Bookmarks
export function getBookmarks(): BookmarkItem[] {
  return safeGetItem<BookmarkItem[]>(STORAGE_KEYS.BOOKMARKS, []);
}

export function getBookmark(mangaId: string): BookmarkItem | null {
  const all = getBookmarks();
  return all.find((b) => b.mangaId === mangaId) || null;
}

export function saveBookmark(bookmark: BookmarkItem): void {
  const all = getBookmarks();
  const existingIdx = all.findIndex((b) => b.mangaId === bookmark.mangaId);
  if (existingIdx >= 0) {
    all[existingIdx] = { ...all[existingIdx], ...bookmark };
  } else {
    all.unshift(bookmark);
  }
  safeSetItem(STORAGE_KEYS.BOOKMARKS, all);
}

export function removeBookmark(mangaId: string): void {
  const all = getBookmarks();
  const filtered = all.filter((b) => b.mangaId !== mangaId);
  safeSetItem(STORAGE_KEYS.BOOKMARKS, filtered);
}

export function updateBookmarkProgress(mangaId: string, chapterId: string, chapterNumber: string): void {
  const all = getBookmarks();
  const idx = all.findIndex((b) => b.mangaId === mangaId);
  if (idx >= 0) {
    all[idx].lastReadChapterId = chapterId;
    all[idx].lastReadChapterNumber = chapterNumber;
    safeSetItem(STORAGE_KEYS.BOOKMARKS, all);
  }
}

// History
export function getHistory(): HistoryItem[] {
  const history = safeGetItem<HistoryItem[]>(STORAGE_KEYS.HISTORY, []);
  return history.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getHistoryItem(mangaId: string): HistoryItem | null {
  const all = getHistory();
  return all.find((h) => h.mangaId === mangaId) || null;
}

export function saveHistory(item: HistoryItem): void {
  const all = getHistory();
  const filtered = all.filter((h) => h.mangaId !== item.mangaId);
  filtered.unshift(item);
  // Keep last 100 history items
  safeSetItem(STORAGE_KEYS.HISTORY, filtered.slice(0, 100));
}

export function removeHistoryItem(mangaId: string): void {
  const all = getHistory();
  const filtered = all.filter((h) => h.mangaId !== mangaId);
  safeSetItem(STORAGE_KEYS.HISTORY, filtered);
}

export function clearHistory(): void {
  safeSetItem(STORAGE_KEYS.HISTORY, []);
}

// Reader Settings
export function getReaderSettings(): ReaderSettings {
  return safeGetItem<ReaderSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
}

export function saveReaderSettings(settings: Partial<ReaderSettings>): ReaderSettings {
  const current = getReaderSettings();
  const updated = { ...current, ...settings };
  safeSetItem(STORAGE_KEYS.SETTINGS, updated);
  return updated;
}

