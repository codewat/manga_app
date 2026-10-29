import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import HeroBanner from '@/components/HeroBanner';
import MangaSection from '@/components/MangaSection';
import ContinueReadingSection from '@/components/ContinueReadingSection';
import { fetchMangaList } from '@/lib/mangadex';
import { Flame, Sparkles, Compass } from 'lucide-react';

export default async function HomePage() {
  // Fetch trending/featured titles (Server Side with empty fallback if blocked)
  const [featuredData, popularManhwaData, popularManhuaData, popularMangaData] = await Promise.all([
    fetchMangaList({ limit: 5, order: { followedCount: 'desc' } }).catch(() => ({ items: [] })),
    fetchMangaList({ limit: 10, type: 'manhwa', order: { followedCount: 'desc' } }).catch(() => ({ items: [] })),
    fetchMangaList({ limit: 10, type: 'manhua', order: { followedCount: 'desc' } }).catch(() => ({ items: [] })),
    fetchMangaList({ limit: 10, type: 'manga', order: { followedCount: 'desc' } }).catch(() => ({ items: [] })),
  ]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pb-20 md:pb-12">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 w-full">
        {/* Continue Reading Shelf (from localStorage) */}
        <ContinueReadingSection />

        {/* Hero Banner with top featured items */}
        {featuredData.items.length > 0 && (
          <HeroBanner featured={featuredData.items} />
        )}

        {/* Quick Filter Navigation Buttons */}
        <div className="flex flex-wrap items-center gap-2 mb-8 p-1.5 bg-zinc-900/60 rounded-2xl border border-zinc-800/80 w-fit">
          <Link
            href="/search"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 text-white shadow-md shadow-purple-600/20 hover:bg-purple-500 transition"
          >
            <Compass className="w-3.5 h-3.5" />
            Explore All
          </Link>
          <Link
            href="/search?type=manhwa"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-200 hover:text-white hover:bg-zinc-700 transition"
          >
            <span>🇰🇷</span> Top Manhwa
          </Link>
          <Link
            href="/search?type=manhua"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-200 hover:text-white hover:bg-zinc-700 transition"
          >
            <span>🇨🇳</span> Top Manhua
          </Link>
          <Link
            href="/search?type=manga"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-200 hover:text-white hover:bg-zinc-700 transition"
          >
            <span>🇯🇵</span> Japanese Manga
          </Link>
        </div>

        {/* SECTION 1: Trending Manhwa (Korean) */}
        <MangaSection
          title="Trending Manhwa (Webtoons)"
          type="manhwa"
          icon={<Flame className="w-5 h-5 text-sky-400" />}
          initialItems={popularManhwaData.items}
          viewAllHref="/search?type=manhwa"
        />

        {/* SECTION 2: Popular Japanese Manga */}
        <MangaSection
          title="Popular Manga"
          type="manga"
          icon={<Sparkles className="w-5 h-5 text-purple-400" />}
          initialItems={popularMangaData.items}
          viewAllHref="/search?type=manga"
        />

        {/* SECTION 3: Top Manhua (Chinese) */}
        <MangaSection
          title="Popular Manhua"
          type="manhua"
          icon={<Flame className="w-5 h-5 text-emerald-400" />}
          initialItems={popularManhuaData.items}
          viewAllHref="/search?type=manhua"
        />
      </main>
    </div>
  );
}
