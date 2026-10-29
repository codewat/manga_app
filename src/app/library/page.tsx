'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  Bookmark,
  Clock,
  Trash2,
  Play,
  Download,
  Upload,
  BookOpen,
  CheckCircle,
  FolderHeart,
  Search,
} from 'lucide-react';
import { BookmarkItem, HistoryItem, BookmarkCategory } from '@/types/manga';
import {
  getBookmarks,
  removeBookmark,
  getHistory,
  removeHistoryItem,
  clearHistory,
} from '@/lib/storage';

function LibraryContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'history' ? 'history' : 'bookmarks';

  const [activeTab, setActiveTab] = useState<'bookmarks' | 'history'>(initialTab);
  const [selectedCategory, setSelectedCategory] = useState<BookmarkCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    function loadData() {
      setBookmarks(getBookmarks());
      setHistory(getHistory());
    }
    loadData();

    window.addEventListener('mangaverse_storage_update', loadData);
    return () => window.removeEventListener('mangaverse_storage_update', loadData);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <Navbar />
      </div>
    );
  }

  const handleExportBackup = () => {
    const data = {
      bookmarks: getBookmarks(),
      history: getHistory(),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mangaverse_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.bookmarks && Array.isArray(json.bookmarks)) {
          localStorage.setItem('mangaverse_bookmarks_v1', JSON.stringify(json.bookmarks));
        }
        if (json.history && Array.isArray(json.history)) {
          localStorage.setItem('mangaverse_history_v1', JSON.stringify(json.history));
        }
        window.dispatchEvent(new Event('mangaverse_storage_update'));
        alert('Library backup successfully restored!');
      } catch (err) {
        alert('Invalid backup file format');
      }
    };
    reader.readAsText(file);
  };

  // Filter Bookmarks
  const filteredBookmarks = bookmarks.filter((b) => {
    const matchesCategory =
      selectedCategory === 'all' || b.category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      b.title.toLowerCase().includes(searchQuery.toLowerCase().trim());
    return matchesCategory && matchesSearch;
  });

  // Filter History
  const filteredHistory = history.filter((h) => {
    return (
      !searchQuery.trim() ||
      h.title.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
  });

  const categories: { id: BookmarkCategory | 'all'; label: string }[] = [
    { id: 'all', label: 'All Saved' },
    { id: 'reading', label: 'Reading' },
    { id: 'plan_to_read', label: 'Plan to Read' },
    { id: 'completed', label: 'Completed' },
    { id: 'on_hold', label: 'On Hold' },
    { id: 'dropped', label: 'Dropped' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pb-20 md:pb-12">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <FolderHeart className="w-6 h-6 text-purple-400" />
              My Library
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Your saved manga, manhwa bookmarks, and reading history
            </p>
          </div>

          {/* Backup / Export Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportBackup}
              title="Backup your library to a JSON file"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition"
            >
              <Download className="w-3.5 h-3.5" />
              Backup
            </button>

            <label
              title="Restore library from a JSON backup file"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs font-medium text-zinc-300 hover:text-white cursor-pointer transition"
            >
              <Upload className="w-3.5 h-3.5" />
              Restore
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Tab Switcher: Bookmarks vs History */}
        <div className="flex items-center gap-3 border-b border-zinc-800 pb-4 mb-6">
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
              activeTab === 'bookmarks'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>Bookmarks ({bookmarks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
              activeTab === 'history'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Reading History ({history.length})</span>
          </button>
        </div>

        {/* Search within library */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
          <div className="relative max-w-sm flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search in your library..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:border-purple-500"
            />
          </div>

          {activeTab === 'bookmarks' && (
            <div className="flex flex-wrap items-center gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                    selectedCategory === cat.id
                      ? 'bg-purple-600 border-purple-500 text-white'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'history' && history.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to clear your reading history?')) {
                  clearHistory();
                  setHistory([]);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/30 border border-red-900/50 hover:bg-red-900/40 text-red-300 text-xs font-semibold transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All History
            </button>
          )}
        </div>

        {/* TAB 1: BOOKMARKS CONTENT */}
        {activeTab === 'bookmarks' && (
          <div>
            {filteredBookmarks.length === 0 ? (
              <div className="py-24 text-center text-zinc-500 space-y-3">
                <Bookmark className="w-10 h-10 mx-auto text-zinc-600" />
                <p className="text-base font-semibold text-zinc-400">
                  {bookmarks.length === 0
                    ? 'Your library is empty'
                    : 'No bookmarks in this category'}
                </p>
                <p className="text-xs max-w-sm mx-auto">
                  Browse manga, manhwa, or manhua and click the Bookmark button to save titles here.
                </p>
                <Link
                  href="/search"
                  className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/20"
                >
                  Explore Manga
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredBookmarks.map((b) => (
                  <div
                    key={b.mangaId}
                    className="group relative flex flex-col rounded-xl overflow-hidden bg-zinc-900/80 border border-zinc-800 hover:border-purple-500/50 transition"
                  >
                    <Link
                      href={`/manga/${b.mangaId}`}
                      className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-950"
                    >
                      <img
                        src={b.coverUrl}
                        alt={b.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute top-2 left-2 z-10">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-900/90 text-purple-300 uppercase">
                          {b.category.replace('_', ' ')}
                        </span>
                      </div>
                    </Link>

                    <div className="p-3 flex flex-col flex-1 justify-between gap-2">
                      <Link
                        href={`/manga/${b.mangaId}`}
                        className="font-semibold text-xs text-zinc-100 hover:text-purple-300 line-clamp-2"
                        title={b.title}
                      >
                        {b.title}
                      </Link>

                      <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80">
                        {b.lastReadChapterId ? (
                          <Link
                            href={`/read/${b.lastReadChapterId}?mangaId=${b.mangaId}`}
                            className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            Resume Ch. {b.lastReadChapterNumber}
                          </Link>
                        ) : (
                          <Link
                            href={`/manga/${b.mangaId}`}
                            className="text-[11px] font-semibold text-zinc-400 hover:text-white"
                          >
                            Details
                          </Link>
                        )}

                        <button
                          onClick={() => removeBookmark(b.mangaId)}
                          title="Remove bookmark"
                          className="p-1 text-zinc-500 hover:text-red-400 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: READING HISTORY CONTENT */}
        {activeTab === 'history' && (
          <div>
            {filteredHistory.length === 0 ? (
              <div className="py-24 text-center text-zinc-500 space-y-3">
                <Clock className="w-10 h-10 mx-auto text-zinc-600" />
                <p className="text-base font-semibold text-zinc-400">No reading history yet</p>
                <p className="text-xs max-w-sm mx-auto">
                  When you read chapters, your progress and page positions will be recorded here automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredHistory.map((item) => (
                  <div
                    key={item.mangaId}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-purple-500/40 hover:bg-zinc-900 transition"
                  >
                    <div className="flex items-center gap-4 min-w-0 pr-4">
                      {/* Thumbnail */}
                      <Link
                        href={`/read/${item.chapterId}?mangaId=${item.mangaId}`}
                        className="w-12 h-16 rounded-lg overflow-hidden shrink-0 bg-zinc-950"
                      >
                        <img
                          src={item.coverUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </Link>

                      {/* Info */}
                      <div className="min-w-0">
                        <Link
                          href={`/manga/${item.mangaId}`}
                          className="font-bold text-sm text-zinc-100 hover:text-purple-300 line-clamp-1"
                        >
                          {item.title}
                        </Link>
                        <p className="text-xs text-purple-400 font-semibold mt-0.5">
                          Chapter {item.chapterNumber}{' '}
                          {item.chapterTitle ? `• ${item.chapterTitle}` : ''}
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Page {item.page || 1} of {item.totalPages} • Last read{' '}
                          {new Date(item.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/read/${item.chapterId}?mangaId=${item.mangaId}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow transition"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Resume</span>
                      </Link>

                      <button
                        onClick={() => removeHistoryItem(item.mangaId)}
                        title="Delete from history"
                        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <Bookmark className="w-8 h-8 animate-pulse text-purple-500" />
        </div>
      }
    >
      <LibraryContent />
    </Suspense>
  );
}

