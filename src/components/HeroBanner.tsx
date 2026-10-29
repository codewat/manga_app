'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Info, Bookmark, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { MangaItem } from '@/types/manga';
import { getBookmark, saveBookmark, removeBookmark } from '@/lib/storage';

interface HeroBannerProps {
  featured: MangaItem[];
}

export default function HeroBanner({ featured }: HeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const current = featured[currentIndex];

  useEffect(() => {
    if (!current) return;
    const existing = getBookmark(current.id);
    setIsBookmarked(!!existing);
  }, [current]);

  useEffect(() => {
    if (featured.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featured.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [featured.length]);

  if (!current) return null;

  const toggleBookmark = () => {
    if (isBookmarked) {
      removeBookmark(current.id);
      setIsBookmarked(false);
    } else {
      saveBookmark({
        mangaId: current.id,
        title: current.title,
        coverUrl: current.coverUrl,
        type: current.type,
        category: 'reading',
        addedAt: Date.now(),
      });
      setIsBookmarked(true);
    }
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + featured.length) % featured.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % featured.length);
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-zinc-800/80 bg-zinc-950 mb-10 shadow-2xl">
      {/* Blurred Backdrop */}
      <div
        className="absolute inset-0 bg-cover bg-center blur-2xl opacity-25 scale-110 pointer-events-none"
        style={{ backgroundImage: `url(${current.coverUrl})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/90 to-transparent z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent z-10" />

      {/* Content Container */}
      <div className="relative z-20 flex flex-col md:flex-row items-center gap-6 p-6 sm:p-10 min-h-[360px] md:min-h-[420px]">
        {/* Cover Art */}
        <div className="relative shrink-0 w-44 sm:w-56 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border border-zinc-700/50 group">
          <img
            src={current.coverUrl}
            alt={current.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute top-2 left-2">
            <span className="bg-purple-600/90 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded-md shadow uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Featured
            </span>
          </div>
        </div>

        {/* Text Info */}
        <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left max-w-2xl">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2.5">
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/50 uppercase">
              {current.type === 'manhwa' ? '🇰🇷 Manhwa' : current.type === 'manhua' ? '🇨🇳 Manhua' : '🇯🇵 Manga'}
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
              {current.status}
            </span>
            {current.tags.slice(0, 3).map((tag) => (
              <span key={tag.id} className="text-xs font-medium px-2 py-0.5 rounded bg-zinc-900/90 text-zinc-400">
                {tag.name}
              </span>
            ))}
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight line-clamp-2 leading-tight">
            {current.title}
          </h1>

          <p className="mt-3 text-sm text-zinc-300/90 line-clamp-3 leading-relaxed max-w-xl">
            {current.description}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center md:justify-start gap-3">
            <Link
              href={`/manga/${current.id}`}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-purple-600/25 transition duration-200"
            >
              <Info className="w-4 h-4" />
              View Details & Read
            </Link>

            <button
              onClick={toggleBookmark}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium border transition backdrop-blur-md ${
                isBookmarked
                  ? 'bg-purple-600/30 border-purple-500 text-purple-300'
                  : 'bg-zinc-900/80 border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
              {isBookmarked ? 'Bookmarked' : 'Add to Library'}
            </button>
          </div>
        </div>
      </div>

      {/* Prev / Next controls */}
      {featured.length > 1 && (
        <div className="absolute bottom-4 right-6 z-30 flex items-center gap-2">
          <button
            onClick={handlePrev}
            aria-label="Previous slide"
            className="p-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 backdrop-blur-sm transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-zinc-400 px-1">
            {currentIndex + 1} / {featured.length}
          </span>
          <button
            onClick={handleNext}
            aria-label="Next slide"
            className="p-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 backdrop-blur-sm transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

