'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import MangaCard from '@/components/MangaCard';
import { MangaItem } from '@/types/manga';
import tagsData from '@/lib/mangadex-tags.json';
import {
  Search,
  Filter,
  SlidersHorizontal,
  X,
  Loader2,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialQuery = searchParams.get('q') || '';
  const initialType = searchParams.get('type') || 'all';

  const [query, setQuery] = useState(initialQuery);
  const [type, setType] = useState<string>(initialType);
  const [status, setStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('followedCount');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  const [results, setResults] = useState<MangaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  // Common popular tags to display first
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
    'Horror',
    'Supernatural',
    'Adventure',
    'Psychological',
  ];

  const popularTags = tagsData.filter((t) => popularGenreNames.includes(t.name));

  // Perform search
  useEffect(() => {
    let isCancelled = false;

    async function doSearch() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set('title', query.trim());
        if (type !== 'all') params.set('type', type);
        if (status !== 'all') params.set('status', status);
        params.set('sort', sortBy);
        params.set('order', sortBy === 'title' ? 'asc' : 'desc');
        params.set('limit', '20');
        params.set('offset', ((page - 1) * 20).toString());

        if (selectedTags.length > 0) {
          params.set('tags', selectedTags.join(','));
        }

        const res = await fetch(`/api/manga?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled) {
            setResults(data.items || []);
            setTotal(data.total || 0);
            setHasMore((page * 20) < (data.total || 0));
          }
        }
      } catch (err) {
        console.error('Search error:', err);
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
  }, [query, type, status, sortBy, selectedTags, page]);

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

  const hasActiveFilters =
    query.trim() !== '' ||
    type !== 'all' ||
    status !== 'all' ||
    selectedTags.length > 0 ||
    sortBy !== 'followedCount';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pb-20 md:pb-12">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 w-full">
        {/* Title & Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <Search className="w-6 h-6 text-purple-400" />
              Browse & Search
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Find thousands of Manga, Manhwa, and Manhua from MangaDex
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilterDrawer(!showFilterDrawer)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-purple-500 text-zinc-200 text-xs font-semibold transition"
            >
              <SlidersHorizontal className="w-4 h-4 text-purple-400" />
              <span>Filters {selectedTags.length > 0 && `(${selectedTags.length})`}</span>
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-medium border border-zinc-800 transition"
              >
                <X className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="w-5 h-5 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Type a title or author (e.g. Solo Leveling, One Piece, Tower of God)..."
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

        {/* Quick Type Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {[
            { id: 'all', label: 'All Content' },
            { id: 'manhwa', label: '🇰🇷 Manhwa (Korean)' },
            { id: 'manga', label: '🇯🇵 Manga (Japanese)' },
            { id: 'manhua', label: '🇨🇳 Manhua (Chinese)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setType(tab.id);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${
                type === tab.id
                  ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/20'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Expandable Filter Box */}
        {showFilterDrawer && (
          <div className="mb-8 p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-5 animate-in fade-in duration-200">
            {/* Row 1: Status & Sort */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-2">
                  Publication Status
                </label>
                <div className="flex gap-2">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'ongoing', label: 'Ongoing' },
                    { id: 'completed', label: 'Completed' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => {
                        setStatus(st.id);
                        setPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        status === st.id
                          ? 'bg-purple-600 border-purple-500 text-white'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-2">
                  Sort Order
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-zinc-800 border border-zinc-700 text-xs text-zinc-200 px-3 py-2 rounded-lg focus:outline-none focus:border-purple-500"
                >
                  <option value="followedCount">Most Popular (Follows)</option>
                  <option value="latestUploadedChapter">Latest Updated</option>
                  <option value="rating">Highest Rated</option>
                  <option value="title">Alphabetical (A - Z)</option>
                  <option value="year">Release Year</option>
                </select>
              </div>
            </div>

            {/* Row 2: Popular Genres / Tags */}
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-2.5">
                Popular Genres & Themes
              </label>
              <div className="flex flex-wrap gap-1.5">
                {popularTags.map((tag) => {
                  const selected = selectedTags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                        selected
                          ? 'bg-purple-600 border-purple-500 text-white shadow-sm'
                          : 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                      }`}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Results Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-zinc-400 font-medium">
            Found <strong className="text-zinc-200">{total}</strong> titles
          </span>
          <span className="text-xs text-zinc-500 font-mono">
            Page {page} of {Math.max(1, Math.ceil(total / 20))}
          </span>
        </div>

        {/* Results Grid */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-zinc-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            <span className="text-sm">Fetching titles...</span>
          </div>
        ) : results.length === 0 ? (
          <div className="py-24 text-center text-zinc-500 space-y-2">
            <p className="text-base font-semibold text-zinc-400">No manga or manhwa found</p>
            <p className="text-xs">Try adjusting your search terms or clearing some filters.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
              {results.map((manga) => (
                <MangaCard key={manga.id} manga={manga} />
              ))}
            </div>

            {/* Pagination Controls */}
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
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}

