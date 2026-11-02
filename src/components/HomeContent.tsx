'use client';

import React, { useState, useEffect } from 'react';
import HeroBanner from '@/components/HeroBanner';
import MangaCard from '@/components/MangaCard';
import { MangaItem } from '@/types/manga';
import { AVAILABLE_PROVIDERS, MangaProviderId, ProviderSource } from '@/types/providers';
import {
  Star,
  Sparkles,
  Flame,
  Layers,
  Loader2,
} from 'lucide-react';

interface HomeContentProps {
  initialFeatured: MangaItem[];
  initialPopularManhwa: MangaItem[];
  initialPopularManga: MangaItem[];
  initialPopularManhua: MangaItem[];
}

interface LatestMangaItem {
  id: string;
  title: string;
  image?: string;
}

export default function HomeContent({
  initialFeatured,
  initialPopularManhwa,
  initialPopularManga,
  initialPopularManhua,
}: HomeContentProps) {
  // Tab state: 'featured' | 'updated' | 'trending'
  const [activeTab, setActiveTab] = useState<'featured' | 'updated' | 'trending'>('featured');

  // Updated Tab Source Provider state
  const [providers, setProviders] = useState<ProviderSource[]>(AVAILABLE_PROVIDERS);
  const [selectedSource, setSelectedSource] = useState<MangaProviderId>('asura');
  const [latestItems, setLatestItems] = useState<LatestMangaItem[]>([]);
  const [loadingLatest, setLoadingLatest] = useState(false);

  // Trending Tab Sub-filter state
  const [trendingType, setTrendingType] = useState<'all' | 'manhwa' | 'manga' | 'manhua'>('all');

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
      } else if (ordered.length > 0) {
        setSelectedSource(ordered[0].id);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Fetch latest updates whenever 'updated' tab is active or selectedSource changes
  useEffect(() => {
    if (activeTab !== 'updated') return;

    let isCancelled = false;
    async function loadLatest() {
      setLoadingLatest(true);
      try {
        const res = await fetch(`/api/source/${selectedSource}?action=latest`);
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled) {
            setLatestItems(data.results || []);
          }
        }
      } catch (err) {
        console.error('Failed to load latest updates:', err);
      } finally {
        if (!isCancelled) setLoadingLatest(false);
      }
    }

    loadLatest();
    return () => {
      isCancelled = true;
    };
  }, [activeTab, selectedSource]);

  const activeSourceObj = providers.find((p) => p.id === selectedSource) || providers[0];

  // Filter trending items based on sub-filter
  const getTrendingList = () => {
    if (trendingType === 'manhwa') return initialPopularManhwa;
    if (trendingType === 'manga') return initialPopularManga;
    if (trendingType === 'manhua') return initialPopularManhua;
    return [...initialPopularManhwa, ...initialPopularManga, ...initialPopularManhua].slice(0, 20);
  };

  return (
    <div className="w-full">
      {/* ======================================================== */}
      {/* 3 PRIMARY BUTTONS: 1. Featured | 2. Updated | 3. Trending */}
      {/* ======================================================== */}
      <div className="flex flex-wrap items-center gap-2.5 p-1.5 bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-800 w-fit mb-8 shadow-xl">
        {/* 1st Button: Featured */}
        <button
          onClick={() => setActiveTab('featured')}
          className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'featured'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/80'
          }`}
        >
          <Star className={`w-4 h-4 ${activeTab === 'featured' ? 'text-amber-300 fill-amber-300' : 'text-zinc-400'}`} />
          <span>Featured</span>
        </button>

        {/* 2nd Button: Updated */}
        <button
          onClick={() => setActiveTab('updated')}
          className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'updated'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/80'
          }`}
        >
          <Sparkles className={`w-4 h-4 ${activeTab === 'updated' ? 'text-sky-300' : 'text-zinc-400'}`} />
          <span>Updated</span>
        </button>

        {/* 3rd Button: Trending */}
        <button
          onClick={() => setActiveTab('trending')}
          className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'trending'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/80'
          }`}
        >
          <Flame className={`w-4 h-4 ${activeTab === 'trending' ? 'text-orange-400' : 'text-zinc-400'}`} />
          <span>Trending</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: FEATURED MANGA                                */}
      {/* ======================================================== */}
      {activeTab === 'featured' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Top Hero Banner */}
          {initialFeatured.length > 0 && <HeroBanner featured={initialFeatured} />}

          {/* Featured Titles Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                Featured Picks
              </h2>
              <span className="text-xs text-zinc-400">Handpicked top rated stories</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
              {initialFeatured.map((manga) => (
                <MangaCard key={manga.id} manga={manga} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 2: UPDATED (LATEST UPDATE WITH SOURCE SELECTOR)  */}
      {/* ======================================================== */}
      {activeTab === 'updated' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Source Selector Bar for Updated */}
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
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-gradient-to-br from-purple-600/30 to-indigo-600/20 border-purple-500 text-white shadow-lg shadow-purple-600/15 ring-2 ring-purple-500/80'
                        : 'bg-zinc-950/60 border-zinc-800/90 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-bold text-xs sm:text-sm truncate">{prov.name}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                          isSelected ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {prov.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 line-clamp-1 leading-tight">
                      {prov.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Latest Updates Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sky-400" />
                Latest Updates on {activeSourceObj?.name}
              </h2>
              <span className="text-xs bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-full font-mono">
                {latestItems.length} chapters
              </span>
            </div>

            {loadingLatest ? (
              <div className="py-24 flex flex-col items-center justify-center text-zinc-400 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                <span className="text-sm">Fetching latest updates from {activeSourceObj?.name}...</span>
              </div>
            ) : latestItems.length === 0 ? (
              <div className="py-24 text-center text-zinc-500 space-y-2">
                <p className="text-base font-semibold text-zinc-400">No recent updates found</p>
                <p className="text-xs">Try selecting another source above.</p>
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
                    description: `Read latest updates of ${item.title} on ${activeSourceObj?.name}.`,
                    coverUrl: proxyCover,
                    status: 'ongoing',
                    type: 'manhwa',
                    year: null,
                    contentRating: 'safe',
                    tags: [{ id: selectedSource, name: activeSourceObj?.name || 'Manga', group: 'source' }],
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
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 3: TRENDING MANGA                                */}
      {/* ======================================================== */}
      {activeTab === 'trending' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Quick Sub-Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: '🔥 All Trending' },
              { id: 'manhwa', label: '🇰🇷 Manhwa (Korean)' },
              { id: 'manga', label: '🇯🇵 Manga (Japanese)' },
              { id: 'manhua', label: '🇨🇳 Manhua (Chinese)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTrendingType(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${
                  trendingType === tab.id
                    ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/20'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
            {getTrendingList().map((manga) => (
              <MangaCard key={manga.id} manga={manga} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
