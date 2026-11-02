import React from 'react';
import Navbar from '@/components/Navbar';
import HomeContent from '@/components/HomeContent';
import { fetchMangaList } from '@/lib/mangadex';

export default async function HomePage() {
  // Fetch initial featured & popular data server-side
  const [featuredData, popularManhwaData, popularMangaData, popularManhuaData] = await Promise.all([
    fetchMangaList({ limit: 10, order: { followedCount: 'desc' } }).catch(() => ({ items: [] })),
    fetchMangaList({ limit: 20, type: 'manhwa', order: { followedCount: 'desc' } }).catch(() => ({ items: [] })),
    fetchMangaList({ limit: 20, type: 'manga', order: { followedCount: 'desc' } }).catch(() => ({ items: [] })),
    fetchMangaList({ limit: 20, type: 'manhua', order: { followedCount: 'desc' } }).catch(() => ({ items: [] })),
  ]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pb-20 md:pb-12">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 w-full">
        <HomeContent
          initialFeatured={featuredData.items}
          initialPopularManhwa={popularManhwaData.items}
          initialPopularManga={popularMangaData.items}
          initialPopularManhua={popularManhuaData.items}
        />
      </main>
    </div>
  );
}
