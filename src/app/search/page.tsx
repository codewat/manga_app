'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import MangaCard from '@/components/MangaCard';
import { MangaItem } from '@/types/manga';
import { AVAILABLE_PROVIDERS, MangaProviderId, ProviderSource } from '@/types/providers';
import tagsData from '@/lib/mangadex-tags.json';
import {
  Search,
  SlidersHorizontal,
  X,
  Loader2,
  Layers,
  Star,
} from 'lucide-react';

interface ExternalSearchResult {
  id: string;
  title: string;
  image?: string;
  releaseDate?: string;
}

function SearchPageContent() {
  const searchParams = useSearchParams();

  const initialQuery = searchParams.get('q') || '';
  const initialType = searchParams.get('type') || 'all';
  const initialProviderParam = searchParams.get('source') as MangaProviderId | null;

  // 1. Source Providers State
  const [providers, setProviders] = useState<ProviderSource[]>(AVAILABLE_PROVIDERS);
  const [activeSource, setActiveSource] = useState<MangaProviderId>('asura');

  // Search input & filters
  const [query, setQuery] = useState(initialQuery);
  const [type, setType] = useState<string>(initialType);
  const [status, setStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('followedCount');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Results & status
  const [mangadexResults, setMangadexResults] = useState<MangaItem[]>([]);
  const [externalResults, setExternalResults] = useState<ExternalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  // Load custom source order and preferred default source
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

      if (initialProviderParam && AVAILABLE_PROVIDERS.some((p) => p.id === initialProviderParam)) {
        setActiveSource(initialProviderParam);
      } else if (savedDefault && AVAILABLE_PROVIDERS.some((p) => p.id === savedDefault)) {
        setActiveSource(savedDefault);
      } else if (ordered.length > 0) {
        setActiveSource(ordered[0].id);
      }
    } catch {
      // Storage read fallback
    }
  }, [initialProviderParam]);

  // Execute Search whenever activeSource, query, or filters change
  useEffect(() => {
    let isCancelled = false;

    async function doSearch() {
      setLoading(true);

      // --- MANGADEX SOURCE SEARCH ---
      if (activeSource === 'mangadex') {
        try {
          const params = new URLSearchParams();
          if (query.trim()) params.set('title', query.trim());
          if (type !== 'all') params.set('type', type);
          if (status !== 'all') params.set('status', status);
          params.set('sort', sortBy);
          params.set('order', sortBy === 'title' ? 'asc' : 'desc');
          params.set('limit', '20');
          params.set('offset', ((page - 1) * 20).toString());
          if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));

          let data: any = null;
          try {
            const res = await fetch(`/api/manga?${params.toString()}`);
            if (res.ok) data = await res.json();
          } catch {
            // direct fetch fallback
          }

          if (!data || !data.items) {
            const directParams = new URLSearchParams();
            directParams.set('limit', '20');
            directParams.set('offset', ((page - 1) * 20).toString());
            directParams.append('includes[]', 'cover_art');
            directParams.append('includes[]', 'author');
            directParams.append('includes[]', 'artist');
            directParams.append('contentRating[]', 'safe');
            directParams.append('contentRating[]', 'suggestive');
            if (query.trim()) directParams.set('title', query.trim());
            if (type === 'manga') directParams.append('originalLanguage[]', 'ja');
            if (type === 'manhwa') directParams.append('originalLanguage[]', 'ko');
            if (type === 'manhua') {
              directParams.append('originalLanguage[]', 'zh');
              directParams.append('originalLanguage[]', 'zh-hk');
            }
            if (status !== 'all') directParams.append('status[]', status);
            for (const t of selectedTags) directParams.append('includedTags[]', t);
            directParams.append(`order[${sortBy}]`, sortBy === 'title' ? 'asc' : 'desc');

            const directRes = await fetch(`https://api.mangadex.org/manga?${directParams.toString()}`);
            if (directRes.ok) {
              const json = await directRes.json();
              const { parseMangaItem } = await import('@/lib/mangadex');
              data = {
                items: (json.data || []).map(parseMangaItem),
                total: json.total || 0,
              };
            }
          }

          if (data && !isCancelled) {
            setMangadexResults(data.items || []);
            setTotal(data.total || 0);
            setHasMore(page * 20 < (data.total || 0));
          }
        } catch (err) {
          console.error('MangaDex search error:', err);
        } finally {
          if (!isCancelled) setLoading(false);
        }
        return;
      }

      // --- EXTERNAL PROVIDER SEARCH (Asura, WeebCentral, Flame, MangaPill) ---
      try {
        const q = query.trim() || 'solo'; // default prompt term if empty
        const res = await fetch(
          `/api/source/${activeSource}?action=search&q=${encodeURIComponent(q)}`
        );
        if (res.ok) {
          const resData = await res.json();
          const items: ExternalSearchResult[] = resData.results || [];
          if (!isCancelled) {
            setExternalResults(items);
            setTotal(items.length);
          }
        } else {
          if (!isCancelled) setExternalResults([]);
        }
      } catch (err) {
        console.error(`Error searching ${activeSource}:`, err);
        if (!isCancelled) setExternalResults([]);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    const timer = setTimeout(() => {
      doSearch();
    }, 300);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [activeSource, query, type, status, sortBy, selectedTags, page]);

  const activeSourceObj = providers.find((p) => p.id === activeSource) || providers[0];

  const popularGenreNames = [
    'Action',
    'Romance',
    'Fantasy',
    'Comedy',
    'Isekai',
    'Martial Arts',
    'Sci-Fi',
    'Slice of Life',
    'Mystery',
    'Drama',
    'Supernatural',
    'Adventure',
  ];
  const popularTags = tagsData.filter((t) => popularGenreNames.includes(t.name));

  const toggleTag = (tagId: string) => {
    setPage(1);
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const clearAllFilters = () => {
    setQuery('');
    setType('all');
    setStatus('all');
    setSortBy('followedCount');
    setSelectedTags([]);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pb-20 md:pb-12">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 w-full">
        {/* ======================================================== */}
        {/* STEP 1: PROMINENT SOURCE SELECTOR AT THE VERY TOP       */}
        {/* ======================================================== */}
        <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-xl backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" />
              <h2 className="text-sm sm:text-base font-extrabold text-white tracking-wide uppercase">
                1. Select Manga Source
              </h2>
            </div>
            <span className="text-xs text-zinc-400">
              Active Source:{' '}
              <strong className="text-purple-300 font-bold underline decoration-purple-500 underline-offset-4">
                {activeSourceObj?.name}
              </strong>{' '}
              ({activeSourceObj?.badge})
            </span>
          </div>

          {/* Source Tabs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {providers.map((prov, idx) => {
              const isSelected = activeSource === prov.id;
              const isFirst = idx === 0;

              return (
                <button
                  key={prov.id}
                  onClick={() => {
                    if (activeSource !== prov.id) {
                      setActiveSource(prov.id);
                      setPage(1);
                    }
                  }}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-gradient-to-br from-purple-600/30 to-indigo-600/20 border-purple-500 text-white shadow-lg shadow-purple-600/15 ring-2 ring-purple-500/80'
                      : 'bg-zinc-950/60 border-zinc-800/90 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-bold text-xs sm:text-sm flex items-center gap-1 truncate">
                      {prov.name}
                    </span>
                    {isFirst && (
                      <span className="text-[9px] px-1 py-0.2 rounded font-semibold text-amber-400 bg-amber-400/10 flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        1st
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-semibold mb-1 ${
                      isSelected
                        ? 'bg-purple-600 text-white'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {prov.badge}
                  </span>
                  <p className="text-[10px] text-zinc-500 line-clamp-1 leading-tight">
                    {prov.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* ======================================================== */}
        {/* STEP 2: SEARCH INPUT FOR THE SELECTED SOURCE             */}
        {/* ======================================================== */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Search className="w-4 h-4 text-purple-400" />
              2. Search Title on {activeSourceObj?.name}
            </label>
            {activeSource === 'mangadex' && (
              <button
                onClick={() => setShowFilterDrawer(!showFilterDrawer)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-purple-500 text-zinc-300 text-xs font-medium transition"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
                <span>Filters {selectedTags.length > 0 && `(${selectedTags.length})`}</span>
              </button>
            )}
          </div>

          <div className="relative">
            <Search className="w-5 h-5 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder={`Type title to search on ${activeSourceObj?.name} (e.g. Solo Leveling, Magic, Return)...`}
              className="w-full bg-zinc-900/90 text-sm sm:text-base text-zinc-100 placeholder-zinc-500 pl-12 pr-10 py-3.5 rounded-2xl border border-zinc-800 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition shadow-inner"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Optional Filter Drawer for MangaDex */}
        {activeSource === 'mangadex' && showFilterDrawer && (
          <div className="mb-6 p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4 animate-in fade-in duration-150">
            {/* Quick Type Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'all', label: 'All Types' },
                { id: 'manhwa', label: '🇰🇷 Manhwa' },
                { id: 'manga', label: '🇯🇵 Manga' },
                { id: 'manhua', label: '🇨🇳 Manhua' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setType(tab.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                    type === tab.id
                      ? 'bg-purple-600 border-purple-500 text-white'
                      : 'bg-zinc-850 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Popular Genres Tags */}
            <div>
              <span className="text-[11px] font-bold text-zinc-400 block mb-2 uppercase">Genres</span>
              <div className="flex flex-wrap gap-1.5">
                {popularTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                        isSelected
                          ? 'bg-purple-600 border-purple-500 text-white font-bold'
                          : 'bg-zinc-850 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={clearAllFilters}
                className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-800"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* RESULTS HEADER & COUNTER                                 */}
        {/* ======================================================== */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-300">
              Results from <strong className="text-purple-400">{activeSourceObj?.name}</strong>:
            </span>
            <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full font-mono">
              {total} titles
            </span>
          </div>

          {activeSource === 'mangadex' && (
            <span className="text-xs text-zinc-500 font-mono">
              Page {page} of {Math.max(1, Math.ceil(total / 20))}
            </span>
          )}
        </div>

        {/* ======================================================== */}
        {/* RESULTS GRID                                             */}
        {/* ======================================================== */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-zinc-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            <span className="text-sm">Searching on {activeSourceObj?.name}...</span>
          </div>
        ) : activeSource === 'mangadex' ? (
          /* MANGADEX RESULTS */
          mangadexResults.length === 0 ? (
            <div className="py-24 text-center text-zinc-500 space-y-2">
              <p className="text-base font-semibold text-zinc-400">No titles found on MangaDex</p>
              <p className="text-xs">Try selecting <strong>Asura Scans</strong> or <strong>WeebCentral</strong> at the top!</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
                {mangadexResults.map((manga) => (
                  <MangaCard key={manga.id} manga={manga} />
                ))}
              </div>

              {/* MangaDex Pagination */}
              <div className="flex items-center justify-center gap-3 mt-12">
                <button
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={page <= 1}
                  className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold transition"
                >
                  Previous
                </button>
                <span className="text-xs font-mono text-zinc-400 px-2">
                  {page} / {Math.max(1, Math.ceil(total / 20))}
                </span>
                <button
                  onClick={() => {
                    setPage((p) => p + 1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={!hasMore}
                  className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold transition"
                >
                  Next
                </button>
              </div>
            </>
          )
        ) : (
          /* EXTERNAL PROVIDER RESULTS (Asura, WeebCentral, Flame, MangaPill) */
          externalResults.length === 0 ? (
            <div className="py-24 text-center text-zinc-500 space-y-2">
              <p className="text-base font-semibold text-zinc-400">No titles found on {activeSourceObj?.name}</p>
              <p className="text-xs">Try checking your spelling or switch to another source at the top.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
              {externalResults.map((item) => {
                const proxyCover = item.image
                  ? `/api/proxy-image?url=${encodeURIComponent(item.image)}`
                  : '/placeholder.png';

                const customManga: MangaItem = {
                  id: item.id,
                  title: item.title,
                  altTitles: [],
                  description: `Read ${item.title} on ${activeSourceObj?.name}.`,
                  coverUrl: proxyCover,
                  status: 'ongoing',
                  type: 'manhwa',
                  year: null,
                  contentRating: 'safe',
                  tags: [{ id: activeSource, name: activeSourceObj?.name || 'Manga', group: 'source' }],
                  authors: [activeSourceObj?.name || 'Source'],
                  artists: [activeSourceObj?.name || 'Source'],
                  originalLanguage: 'en',
                  updatedAt: new Date().toISOString(),
                };

                const targetHref = `/manga/${encodeURIComponent(item.id)}?provider=${activeSource}&title=${encodeURIComponent(
                  item.title
                )}&cover=${encodeURIComponent(item.image || proxyCover)}`;

                return (
                  <MangaCard
                    key={`${activeSource}-${item.id}`}
                    manga={customManga}
                    customHref={targetHref}
                  />
                );
              })}
            </div>
          )
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
