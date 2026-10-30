'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronRight, Loader2 } from 'lucide-react';
import MangaCard from '@/components/MangaCard';
import { MangaItem } from '@/types/manga';

interface MangaSectionProps {
  title: string;
  type?: 'all' | 'manga' | 'manhwa' | 'manhua';
  icon: React.ReactNode;
  initialItems: MangaItem[];
  viewAllHref: string;
}

export default function MangaSection({
  title,
  type = 'all',
  icon,
  initialItems = [],
  viewAllHref,
}: MangaSectionProps) {
  const [items, setItems] = useState<MangaItem[]>(initialItems);
  const [loading, setLoading] = useState(initialItems.length === 0);

  useEffect(() => {
    // If initial items are empty (e.g. Vercel build server was blocked by Cloudflare),
    // fetch client-side from the browser!
    if (items.length === 0) {
      async function fetchClientSide() {
        setLoading(true);
        try {
          const res = await fetch(`/api/manga?type=${type}&limit=10&sort=followedCount`);
          if (res.ok) {
            const data = await res.json();
            if (data.items && data.items.length > 0) {
              setItems(data.items);
              return;
            }
          }
          // Fallback direct to MangaDex API if Vercel serverless function is blocked
          const directParams = new URLSearchParams();
          directParams.set('limit', '10');
          directParams.append('includes[]', 'cover_art');
          directParams.append('includes[]', 'author');
          directParams.append('includes[]', 'artist');
          directParams.append('contentRating[]', 'safe');
          directParams.append('contentRating[]', 'suggestive');
          directParams.append('order[followedCount]', 'desc');
          if (type === 'manga') directParams.append('originalLanguage[]', 'ja');
          if (type === 'manhwa') directParams.append('originalLanguage[]', 'ko');
          if (type === 'manhua') {
            directParams.append('originalLanguage[]', 'zh');
            directParams.append('originalLanguage[]', 'zh-hk');
          }

          const directRes = await fetch(`https://api.mangadex.org/manga?${directParams.toString()}`);
          if (directRes.ok) {
            const directJson = await directRes.json();
            const { parseMangaItem } = await import('@/lib/mangadex');
            const parsed = (directJson.data || []).map(parseMangaItem);
            setItems(parsed);
          }
        } catch (e) {
          console.error('Client fallback fetch error:', e);
        } finally {
          setLoading(false);
        }
      }
      fetchClientSide();
    }
  }, [items.length, type]);

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {title}
          </h2>
        </div>
        <Link
          href={viewAllHref}
          className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition"
        >
          See all <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="py-12 flex items-center justify-center text-zinc-500 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
          <span className="text-xs">Loading {title}...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-zinc-500 text-xs">
          No titles found.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
          {items.map((manga) => (
            <MangaCard key={manga.id} manga={manga} />
          ))}
        </div>
      )}
    </section>
  );
}

