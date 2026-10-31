'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bookmark, Heart, BookOpen, Check } from 'lucide-react';
import { MangaItem } from '@/types/manga';
import { getBookmark, saveBookmark, removeBookmark } from '@/lib/storage';

interface MangaCardProps {
  manga: MangaItem;
  customHref?: string;
}

export default function MangaCard({ manga, customHref }: MangaCardProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [imgSrc, setImgSrc] = useState(manga.coverUrl);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const existing = getBookmark(manga.id);
    setIsBookmarked(!!existing);

    function syncBookmark() {
      const b = getBookmark(manga.id);
      setIsBookmarked(!!b);
    }

    window.addEventListener('mangaverse_storage_update', syncBookmark);
    return () => window.removeEventListener('mangaverse_storage_update', syncBookmark);
  }, [manga.id]);

  const toggleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isBookmarked) {
      removeBookmark(manga.id);
      setIsBookmarked(false);
    } else {
      saveBookmark({
        mangaId: manga.id,
        title: manga.title,
        coverUrl: manga.coverUrl,
        type: manga.type,
        category: 'reading',
        addedAt: Date.now(),
      });
      setIsBookmarked(true);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'manhwa':
        return (
          <span className="bg-sky-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow backdrop-blur-sm flex items-center gap-1">
            <span>🇰🇷</span> Manhwa
          </span>
        );
      case 'manhua':
        return (
          <span className="bg-emerald-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow backdrop-blur-sm flex items-center gap-1">
            <span>🇨🇳</span> Manhua
          </span>
        );
      case 'manga':
      default:
        return (
          <span className="bg-purple-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow backdrop-blur-sm flex items-center gap-1">
            <span>🇯🇵</span> Manga
          </span>
        );
    }
  };

  return (
    <div className="group relative flex flex-col rounded-xl overflow-hidden bg-zinc-900/60 border border-zinc-800/80 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300">
      <Link href={customHref || `/manga/${manga.id}`} className="block relative aspect-[2/3] w-full overflow-hidden bg-zinc-950">
        {/* Cover Image */}
        {!imgError ? (
          <img
            src={imgSrc}
            alt={manga.title}
            loading="lazy"
            onError={() => {
              // Try proxy fallback if direct Mangadex CDN is blocked
              if (!imgSrc.includes('/api/proxy-image')) {
                setImgSrc(`/api/proxy-image?url=${encodeURIComponent(manga.coverUrl)}`);
              } else {
                setImgError(true);
              }
            }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-zinc-900 text-zinc-500">
            <BookOpen className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-xs font-medium line-clamp-2">{manga.title}</span>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

        {/* Badges Top Left & Top Right */}
        <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 items-start">
          {getTypeBadge(manga.type)}
        </div>

        {/* Bookmark Quick Action Button */}
        <button
          onClick={toggleBookmark}
          aria-label={isBookmarked ? 'Remove from library' : 'Save to library'}
          className={`absolute top-2.5 right-2.5 z-10 p-2 rounded-full backdrop-blur-md transition shadow-md ${
            isBookmarked
              ? 'bg-purple-600 text-white'
              : 'bg-zinc-900/70 text-zinc-300 hover:bg-zinc-800 hover:text-white'
          }`}
        >
          <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
        </button>

        {/* Status / Chapter bottom badge */}
        <div className="absolute bottom-2 left-2.5 right-2.5 z-10 flex items-center justify-between text-[11px] text-zinc-300">
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
            manga.status === 'completed' ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/30' : 'bg-purple-500/30 text-purple-300 border border-purple-500/30'
          }`}>
            {manga.status}
          </span>
          {manga.latestChapter && (
            <span className="font-medium text-zinc-400 bg-zinc-900/80 px-1.5 py-0.5 rounded backdrop-blur-sm">
              Ch. {manga.latestChapter}
            </span>
          )}
        </div>
      </Link>

      {/* Info Section */}
      <div className="p-3 flex flex-col flex-1 justify-between gap-1.5">
        <Link href={customHref || `/manga/${manga.id}`}>
          <h3
            className="font-semibold text-sm text-zinc-100 group-hover:text-purple-300 transition-colors line-clamp-2 leading-snug"
            title={manga.title}
          >
            {manga.title}
          </h3>
        </Link>

        {/* Tags / Author */}
        <div className="flex flex-wrap items-center gap-1 mt-auto">
          {manga.tags.slice(0, 2).map((tag) => (
            <span
              key={tag.id}
              className="text-[10px] text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded"
            >
              {tag.name}
            </span>
          ))}
          {manga.year && (
            <span className="text-[10px] text-zinc-500 ml-auto font-mono">
              {manga.year}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

