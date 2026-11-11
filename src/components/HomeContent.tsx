'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import MangaCard from '@/components/MangaCard';
import { MangaItem, BookmarkItem, ChapterItem } from '@/types/manga';
import { AVAILABLE_PROVIDERS, MangaProviderId, ProviderSource } from '@/types/providers';
import { getBookmarks, detectProvider } from '@/lib/storage';
import {
  Sparkles,
  Flame,
  Layers,
  Loader2,
  Bookmark,
  Play,
  CheckCircle2,
  FolderHeart,
} from 'lucide-react';

interface LatestMangaItem {
  id: string;
  title: string;
  image?: string;
}

interface BookmarkUpdateInfo {
  latestChapter: string;
  latestChapterId: string;
  nextChapterNumber: string;
  nextChapterId: string;
  hasUnread: boolean;
  unreadCount: number;
}

export default function HomeContent() {
  // Primary Tabs: 'my-updates' (Default) | 'updated' | 'trending'
  const [activeTab, setActiveTab] = useState<'my-updates' | 'updated' | 'trending'>('my-updates');

  // Bookmarks & Update Tracking
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [updatesFilter, setUpdatesFilter] = useState<'unread' | 'all'>('unread');
  const [bookmarkUpdates, setBookmarkUpdates] = useState<Record<string, BookmarkUpdateInfo>>({});
  const [checkingUpdates, setCheckingUpdates] = useState(false);

  // Source Provider state
  const [providers, setProviders] = useState<ProviderSource[]>(AVAILABLE_PROVIDERS);

  // Updated Tab Source Provider state
  const [selectedSource, setSelectedSource] = useState<MangaProviderId>('asura');
  const [latestItems, setLatestItems] = useState<LatestMangaItem[]>([]);
  const [loadingLatest, setLoadingLatest] = useState(false);
  const [latestCache, setLatestCache] = useState<Record<string, LatestMangaItem[]>>({});

  // Trending Tab Source Provider state
  const [selectedTrendingSource, setSelectedTrendingSource] = useState<MangaProviderId>('asura');
  const [trendingItems, setTrendingItems] = useState<LatestMangaItem[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [trendingCache, setTrendingCache] = useState<Record<string, LatestMangaItem[]>>({});

  // Load custom source preferences
  useEffect(() => {
    try {
      const savedOrder = localStorage.getItem('mangaverse_source_order');
      const savedDefault = localStorage.getItem('mangaverse_default_source') as MangaProviderId | null;

      let ordered = [...AVAILABLE_PROVIDERS];
      if (savedOrder) {
        const ids: MangaProviderId[] = JSON.parse(savedOrder);
        ordered = [...AVAILABLE_PROVIDERS].sort((a, b) => {
          const idxA = ids.indexOf(a.id);
          const idxB = ids.indexOf(b.id);
          return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
        });
        setProviders(ordered);
      }

      if (savedDefault && AVAILABLE_PROVIDERS.some((p) => p.id === savedDefault)) {
        setSelectedSource(savedDefault);
        setSelectedTrendingSource(savedDefault);
      } else if (ordered.length > 0) {
        setSelectedSource(ordered[0].id);
        setSelectedTrendingSource(ordered[0].id);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Load bookmarks & keep updated
  useEffect(() => {
    function loadLocalBookmarks() {
      const b = getBookmarks();
      setBookmarks(b);
    }
    loadLocalBookmarks();
    window.addEventListener('mangaverse_storage_update', loadLocalBookmarks);
    return () => window.removeEventListener('mangaverse_storage_update', loadLocalBookmarks);
  }, []);

  // Check latest chapters for bookmarked manga
  useEffect(() => {
    if (bookmarks.length === 0) return;

    let isCancelled = false;

    // 1. Read cached updates from localStorage instantly
    const initialMap: Record<string, BookmarkUpdateInfo> = {};
    bookmarks.forEach((b) => {
      try {
        const cached = localStorage.getItem(`mangaverse_cache_update_${b.mangaId}`);
        if (cached) {
          initialMap[b.mangaId] = JSON.parse(cached);
        }
      } catch {}
    });
    if (Object.keys(initialMap).length > 0) {
      setBookmarkUpdates((prev) => ({ ...initialMap, ...prev }));
    }

    // 2. Fetch fresh chapters for each bookmark in background
    async function checkBookmarkChapters() {
      setCheckingUpdates(true);
      for (const b of bookmarks) {
        if (isCancelled) break;
        const p = b.provider || detectProvider(b.mangaId, b.lastReadChapterId);
        let endpoint = `/api/source/${p}?action=chapters&id=${encodeURIComponent(b.mangaId)}`;
        if (p === 'mangadex') {
          endpoint = `/api/manga/${encodeURIComponent(b.mangaId)}/chapters?order=asc&limit=100`;
        }

        try {
          const res = await fetch(endpoint);
          if (res.ok) {
            const data = await res.json();
            const chaps: ChapterItem[] = data.chapters || [];
            if (chaps.length > 0) {
              const sorted = [...chaps].sort(
                (x, y) => (parseFloat(x.chapter) || 0) - (parseFloat(y.chapter) || 0)
              );
              const latest = sorted[sorted.length - 1];

              const lastReadNum = parseFloat(b.lastReadChapterNumber || '0');
              const latestNum = parseFloat(latest.chapter || '0');

              let nextChap = latest;
              if (!b.lastReadChapterNumber) {
                nextChap = sorted[0];
              } else {
                const unreadFirst = sorted.find((c) => (parseFloat(c.chapter) || 0) > lastReadNum);
                if (unreadFirst) nextChap = unreadFirst;
              }

              const unreadCount = !b.lastReadChapterNumber
                ? sorted.length
                : Math.max(0, sorted.filter((c) => (parseFloat(c.chapter) || 0) > lastReadNum).length);

              const hasUnread = !b.lastReadChapterNumber || latestNum > lastReadNum;

              const updateInfo: BookmarkUpdateInfo = {
                latestChapter: latest.chapter || '0',
                latestChapterId: latest.id,
                nextChapterNumber: nextChap.chapter || '1',
                nextChapterId: nextChap.id,
                hasUnread,
                unreadCount,
              };

              if (!isCancelled) {
                setBookmarkUpdates((prev) => ({ ...prev, [b.mangaId]: updateInfo }));
                try {
                  localStorage.setItem(
                    `mangaverse_cache_update_${b.mangaId}`,
                    JSON.stringify(updateInfo)
                  );
                } catch {}
              }
            }
          }
        } catch {
          // Non-blocking
        }
      }
      if (!isCancelled) setCheckingUpdates(false);
    }

    checkBookmarkChapters();
    return () => {
      isCancelled = true;
    };
  }, [bookmarks]);

  // Fetch latest updates whenever 'updated' tab is active or selectedSource changes
  useEffect(() => {
    if (activeTab !== 'updated') return;

    if (latestCache[selectedSource]) {
      setLatestItems(latestCache[selectedSource]);
      return;
    }

    let isCancelled = false;
    async function loadLatest() {
      setLoadingLatest(true);
      setLatestItems([]);
      try {
        const res = await fetch(`/api/source/${selectedSource}?action=latest`);
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled) {
            const list = data.results || [];
            setLatestItems(list);
            if (list.length > 0) {
              setLatestCache((prev) => ({ ...prev, [selectedSource]: list }));
            }
          }
        } else if (!isCancelled) {
          setLatestItems([]);
        }
      } catch (err) {
        console.error('Failed to load latest updates:', err);
        if (!isCancelled) setLatestItems([]);
      } finally {
        if (!isCancelled) setLoadingLatest(false);
      }
    }

    loadLatest();
    return () => {
      isCancelled = true;
    };
  }, [activeTab, selectedSource, latestCache]);

  // Fetch trending updates whenever 'trending' tab is active or selectedTrendingSource changes
  useEffect(() => {
    if (activeTab !== 'trending') return;

    if (trendingCache[selectedTrendingSource]) {
      setTrendingItems(trendingCache[selectedTrendingSource]);
      return;
    }

    let isCancelled = false;
    async function loadTrending() {
      setLoadingTrending(true);
      setTrendingItems([]);
      try {
        const res = await fetch(`/api/source/${selectedTrendingSource}?action=trending`);
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled) {
            const list = data.results || [];
            setTrendingItems(list);
            if (list.length > 0) {
              setTrendingCache((prev) => ({ ...prev, [selectedTrendingSource]: list }));
            }
          }
        } else if (!isCancelled) {
          setTrendingItems([]);
        }
      } catch (err) {
        console.error('Failed to load trending items:', err);
        if (!isCancelled) setTrendingItems([]);
      } finally {
        if (!isCancelled) setLoadingTrending(false);
      }
    }

    loadTrending();
    return () => {
      isCancelled = true;
    };
  }, [activeTab, selectedTrendingSource, trendingCache]);

  const activeSourceObj = providers.find((p) => p.id === selectedSource) || providers[0];
  const activeTrendingSourceObj =
    providers.find((p) => p.id === selectedTrendingSource) || providers[0];

  // Calculate unread count total
  const unreadCountTotal = bookmarks.filter((b) => {
    const info = bookmarkUpdates[b.mangaId];
    return info ? info.hasUnread : true;
  }).length;

  // Filter & sort bookmarks for 'my-updates' tab
  const getSortedBookmarkUpdates = () => {
    const list = bookmarks.filter((b) => {
      if (updatesFilter === 'unread') {
        const info = bookmarkUpdates[b.mangaId];
        return info ? info.hasUnread : true;
      }
      return true;
    });

    // Sort: unread first, then latest
    return list.sort((a, b) => {
      const infoA = bookmarkUpdates[a.mangaId];
      const infoB = bookmarkUpdates[b.mangaId];
      const unreadA = infoA ? (infoA.hasUnread ? 1 : 0) : 1;
      const unreadB = infoB ? (infoB.hasUnread ? 1 : 0) : 1;
      if (unreadA !== unreadB) return unreadB - unreadA;
      return (b.addedAt || 0) - (a.addedAt || 0);
    });
  };

  return (
    <div className="w-full">
      {/* ======================================================== */}
      {/* 3 PRIMARY BUTTONS: 1. My Updates | 2. Source Updates | 3. Trending */}
      {/* ======================================================== */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-800 w-fit mb-8 shadow-xl">
        {/* 1st Button: My Updates (Default) */}
        <button
          onClick={() => setActiveTab('my-updates')}
          className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'my-updates'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/80'
          }`}
        >
          <Bookmark
            className={`w-4 h-4 ${
              activeTab === 'my-updates' ? 'text-amber-300 fill-amber-300' : 'text-zinc-400'
            }`}
          />
          <span>My Updates</span>
          {unreadCountTotal > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-extrabold shadow-sm">
              {unreadCountTotal}
            </span>
          )}
        </button>

        {/* 2nd Button: Updated (Source Releases) */}
        <button
          onClick={() => setActiveTab('updated')}
          className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'updated'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/80'
          }`}
        >
          <Sparkles
            className={`w-4 h-4 ${activeTab === 'updated' ? 'text-sky-300' : 'text-zinc-400'}`}
          />
          <span>Source Updates</span>
        </button>

        {/* 3rd Button: Trending */}
        <button
          onClick={() => setActiveTab('trending')}
          className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'trending'
              ? 'bg-gradient-to-r from-orange-600 to-pink-600 text-white shadow-lg shadow-orange-600/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/80'
          }`}
        >
          <Flame
            className={`w-4 h-4 ${activeTab === 'trending' ? 'text-amber-300 fill-amber-300' : 'text-zinc-400'}`}
          />
          <span>Trending</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: MY UPDATES (BOOKMARKS WITH UNREAD CHAPTERS)   */}
      {/* ======================================================== */}
      {activeTab === 'my-updates' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header & Sub-filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-800/80">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-purple-400 fill-current" />
                <span>Bookmark Updates</span>
                {checkingUpdates && (
                  <Loader2 className="w-3.5 h-3.5 text-zinc-500 animate-spin" />
                )}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                New chapters for titles saved in your library
              </p>
            </div>

            {bookmarks.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setUpdatesFilter('unread')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    updatesFilter === 'unread'
                      ? 'bg-purple-600 text-white shadow'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Unread Only ({unreadCountTotal})</span>
                </button>
                <button
                  onClick={() => setUpdatesFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    updatesFilter === 'all'
                      ? 'bg-purple-600 text-white shadow'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>All ({bookmarks.length})</span>
                </button>
              </div>
            )}
          </div>

          {/* Bookmarks List */}
          {bookmarks.length === 0 ? (
            <div className="py-16 px-6 text-center rounded-3xl bg-zinc-900/40 border border-zinc-800/80 space-y-4 max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-purple-950/60 border border-purple-800/50 flex items-center justify-center mx-auto text-purple-400">
                <FolderHeart className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">No Bookmarks Saved Yet</h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                  Bookmark your favorite manga to automatically track new chapter updates here!
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setActiveTab('updated')}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition"
                >
                  Browse Source Updates
                </button>
                <button
                  onClick={() => setActiveTab('trending')}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition"
                >
                  View Trending Manga
                </button>
              </div>
            </div>
          ) : getSortedBookmarkUpdates().length === 0 ? (
            <div className="py-14 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800/60 space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="text-sm font-bold text-white">You are all caught up!</h3>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                No unread chapters for your bookmarks right now.
              </p>
              <button
                onClick={() => setUpdatesFilter('all')}
                className="mt-2 text-xs text-purple-400 hover:text-purple-300 font-semibold"
              >
                View all bookmarks ({bookmarks.length})
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getSortedBookmarkUpdates().map((b) => {
                const bProvider = detectProvider(b.mangaId, b.lastReadChapterId, b.provider);
                const update = bookmarkUpdates[b.mangaId];
                const mangaHref = `/manga/${encodeURIComponent(b.mangaId)}?provider=${bProvider}&title=${encodeURIComponent(
                  b.title
                )}&cover=${encodeURIComponent(b.coverUrl)}&type=${b.type}`;

                const readTargetChapterId = update?.nextChapterId || b.lastReadChapterId;
                const readHref = readTargetChapterId
                  ? `/read/${encodeURIComponent(readTargetChapterId)}?mangaId=${encodeURIComponent(
                      b.mangaId
                    )}&provider=${bProvider}&title=${encodeURIComponent(b.title)}&cover=${encodeURIComponent(
                      b.coverUrl
                    )}`
                  : mangaHref;

                return (
                  <div
                    key={b.mangaId}
                    className="group relative flex rounded-2xl overflow-hidden bg-zinc-900/70 border border-zinc-800 hover:border-purple-500/50 hover:bg-zinc-900/90 transition-all p-3 sm:p-3.5 gap-3.5 shadow-lg"
                  >
                    {/* Cover Thumbnail */}
                    <Link
                      href={mangaHref}
                      className="relative w-20 sm:w-24 aspect-[2/3] rounded-xl overflow-hidden shrink-0 bg-zinc-950 border border-zinc-800"
                    >
                      <img
                        src={b.coverUrl}
                        alt={b.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-1.5 left-1.5 z-10">
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-zinc-950/90 text-purple-300 uppercase tracking-wider">
                          {bProvider}
                        </span>
                      </div>
                    </Link>

                    {/* Info & Action */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        {/* Status Badge */}
                        <div className="mb-1.5 flex items-center gap-1.5 flex-wrap">
                          {update?.hasUnread ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-950/90 border border-purple-700/80 text-purple-300 text-[10px] font-bold">
                              <Sparkles className="w-3 h-3 text-purple-400" />
                              <span>
                                {update.unreadCount > 1
                                  ? `${update.unreadCount} New Chapters`
                                  : 'New Chapter Available'}
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-[10px] font-semibold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Caught Up</span>
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <Link
                          href={mangaHref}
                          className="font-bold text-xs sm:text-sm text-zinc-100 group-hover:text-purple-300 line-clamp-1 transition"
                          title={b.title}
                        >
                          {b.title}
                        </Link>

                        {/* Chapter Stats */}
                        <div className="mt-1.5 space-y-0.5 text-[11px] text-zinc-400">
                          <p>
                            Last read:{' '}
                            <strong className="text-zinc-200">
                              {b.lastReadChapterNumber ? `Ch. ${b.lastReadChapterNumber}` : 'Not started'}
                            </strong>
                          </p>
                          <p>
                            Latest chapter:{' '}
                            <strong className="text-purple-400">
                              Ch. {update?.latestChapter || b.lastReadChapterNumber || '...'}
                            </strong>
                          </p>
                        </div>
                      </div>

                      {/* Read Button */}
                      <div className="pt-2.5 mt-2 border-t border-zinc-800/60 flex items-center gap-2">
                        <Link
                          href={readHref}
                          className="flex-1 py-1.5 px-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/20 transition"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>
                            {update?.hasUnread
                              ? b.lastReadChapterNumber
                                ? `Read Ch. ${update.nextChapterNumber}`
                                : `Start Ch. ${update.nextChapterNumber}`
                              : `Re-read Ch. ${b.lastReadChapterNumber || '1'}`}
                          </span>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 2: UPDATED (SOURCE RELEASES WITH SOURCE SELECTOR)*/}
      {/* ======================================================== */}
      {activeTab === 'updated' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Source Selector Bar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-xl backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" />
                <h3 className="text-xs sm:text-sm font-extrabold text-white tracking-wide uppercase">
                  Select Update Source
                </h3>
              </div>
              <span className="text-xs text-zinc-400">
                Viewing latest releases from:{' '}
                <strong className="text-purple-300 font-bold underline decoration-purple-500 underline-offset-4">
                  {activeSourceObj?.name}
                </strong>
              </span>
            </div>

            {/* Source Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {providers.map((prov) => {
                const isSelected = selectedSource === prov.id;
                return (
                  <button
                    key={prov.id}
                    onClick={() => setSelectedSource(prov.id)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition text-left ${
                      isSelected
                        ? 'bg-purple-600/20 border-purple-500 text-white shadow-lg shadow-purple-600/20'
                        : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isSelected
                          ? 'bg-purple-600 text-white'
                          : 'bg-zinc-900 text-zinc-300'
                      }`}
                    >
                      {prov.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate leading-tight">
                        {prov.name}
                      </div>
                      <div className="text-[10px] text-zinc-500 truncate leading-tight">
                        {prov.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Latest Releases Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                Latest Updates on {activeSourceObj?.name}
              </h2>
              {loadingLatest && (
                <div className="flex items-center gap-2 text-xs text-purple-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading releases...</span>
                </div>
              )}
            </div>

            {loadingLatest && latestItems.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin mb-3" />
                <p className="text-xs text-zinc-400">
                  Connecting to {activeSourceObj?.name} servers...
                </p>
              </div>
            ) : latestItems.length === 0 ? (
              <div className="py-16 text-center text-zinc-500">
                <p className="text-sm">No recent updates found for {activeSourceObj?.name}.</p>
                <p className="text-xs mt-1">Try selecting another source above.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
                {latestItems.map((item) => {
                  const proxyCover = item.image
                    ? `/api/proxy-image?url=${encodeURIComponent(item.image)}`
                    : '/placeholder.png';

                  const customManga: MangaItem = {
                    id: item.id,
                    title: item.title,
                    altTitles: [],
                    description: `Latest update from ${activeSourceObj?.name}`,
                    coverUrl: item.image || proxyCover,
                    status: 'ongoing',
                    type:
                      selectedSource === 'asura' || selectedSource === 'flame'
                        ? 'manhwa'
                        : 'manga',
                    year: null,
                    contentRating: 'safe',
                    tags: [
                      {
                        id: selectedSource,
                        name: activeSourceObj?.name || 'Source',
                        group: 'source',
                      },
                    ],
                    authors: [activeSourceObj?.name || 'Source'],
                    artists: [activeSourceObj?.name || 'Source'],
                    originalLanguage: 'en',
                    updatedAt: new Date().toISOString(),
                  };

                  const targetHref = `/manga/${encodeURIComponent(item.id)}?provider=${selectedSource}&title=${encodeURIComponent(
                    item.title
                  )}&cover=${encodeURIComponent(item.image || proxyCover)}`;

                  return (
                    <MangaCard
                      key={`${selectedSource}-${item.id}`}
                      manga={customManga}
                      customHref={targetHref}
                      provider={selectedSource}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 3: TRENDING (WITH SOURCE SELECTOR)               */}
      {/* ======================================================== */}
      {activeTab === 'trending' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Trending Source Selector Bar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-xl backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-400" />
                <h3 className="text-xs sm:text-sm font-extrabold text-white tracking-wide uppercase">
                  Select Trending Source
                </h3>
              </div>
              <span className="text-xs text-zinc-400">
                Viewing trending from:{' '}
                <strong className="text-orange-400 font-bold underline decoration-orange-500 underline-offset-4">
                  {activeTrendingSourceObj?.name}
                </strong>
              </span>
            </div>

            {/* Source Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {providers.map((prov) => {
                const isSelected = selectedTrendingSource === prov.id;
                return (
                  <button
                    key={prov.id}
                    onClick={() => setSelectedTrendingSource(prov.id)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition text-left ${
                      isSelected
                        ? 'bg-orange-600/20 border-orange-500 text-white shadow-lg shadow-orange-600/20'
                        : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isSelected
                          ? 'bg-orange-600 text-white'
                          : 'bg-zinc-900 text-zinc-300'
                      }`}
                    >
                      {prov.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate leading-tight">
                        {prov.name}
                      </div>
                      <div className="text-[10px] text-zinc-500 truncate leading-tight">
                        {prov.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trending Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-400" />
                Trending on {activeTrendingSourceObj?.name}
              </h2>
              {loadingTrending && (
                <div className="flex items-center gap-2 text-xs text-orange-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading trending...</span>
                </div>
              )}
            </div>

            {loadingTrending && trendingItems.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-3" />
                <p className="text-xs text-zinc-400">
                  Connecting to {activeTrendingSourceObj?.name} servers...
                </p>
              </div>
            ) : trendingItems.length === 0 ? (
              <div className="py-16 text-center text-zinc-500">
                <p className="text-sm">No trending titles found for {activeTrendingSourceObj?.name}.</p>
                <p className="text-xs mt-1">Try selecting another source above.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
                {trendingItems.map((item) => {
                  const proxyCover = item.image
                    ? `/api/proxy-image?url=${encodeURIComponent(item.image)}`
                    : '/placeholder.png';

                  const customManga: MangaItem = {
                    id: item.id,
                    title: item.title,
                    altTitles: [],
                    description: `Trending title on ${activeTrendingSourceObj?.name}`,
                    coverUrl: item.image || proxyCover,
                    status: 'ongoing',
                    type:
                      selectedTrendingSource === 'asura' || selectedTrendingSource === 'flame'
                        ? 'manhwa'
                        : 'manga',
                    year: null,
                    contentRating: 'safe',
                    tags: [
                      {
                        id: selectedTrendingSource,
                        name: activeTrendingSourceObj?.name || 'Source',
                        group: 'source',
                      },
                    ],
                    authors: [activeTrendingSourceObj?.name || 'Source'],
                    artists: [activeTrendingSourceObj?.name || 'Source'],
                    originalLanguage: 'en',
                    updatedAt: new Date().toISOString(),
                  };

                  const targetHref = `/manga/${encodeURIComponent(item.id)}?provider=${selectedTrendingSource}&title=${encodeURIComponent(
                    item.title
                  )}&cover=${encodeURIComponent(item.image || proxyCover)}`;

                  return (
                    <MangaCard
                      key={`${selectedTrendingSource}-${item.id}`}
                      manga={customManga}
                      customHref={targetHref}
                      provider={selectedTrendingSource}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
