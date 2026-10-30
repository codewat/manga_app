'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  Play,
  Heart,
  Share2,
  Check,
  BookOpen,
  Calendar,
  User,
  Sparkles,
} from 'lucide-react';
import { MangaItem, BookmarkCategory } from '@/types/manga';
import {
  getBookmark,
  saveBookmark,
  removeBookmark,
  getHistoryItem,
} from '@/lib/storage';

interface MangaDetailHeaderProps {
  manga: MangaItem;
}

export default function MangaDetailHeader({ manga }: MangaDetailHeaderProps) {
  const [bookmark, setBookmark] = useState<ReturnType<typeof getBookmark>>(null);
  const [lastHistory, setLastHistory] = useState<ReturnType<typeof getHistoryItem>>(null);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setBookmark(getBookmark(manga.id));
    setLastHistory(getHistoryItem(manga.id));

    function sync() {
      setBookmark(getBookmark(manga.id));
      setLastHistory(getHistoryItem(manga.id));
    }
    window.addEventListener('mangaverse_storage_update', sync);
    return () => window.removeEventListener('mangaverse_storage_update', sync);
  }, [manga.id]);

  const handleBookmarkCategory = (category: BookmarkCategory) => {
    saveBookmark({
      mangaId: manga.id,
      title: manga.title,
      coverUrl: manga.coverUrl,
      type: manga.type,
      category,
      addedAt: Date.now(),
    });
    setShowCategoryMenu(false);
  };

  const handleRemoveBookmark = () => {
    removeBookmark(manga.id);
    setShowCategoryMenu(false);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: manga.title,
        text: `Read ${manga.title} on MangaVerse!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const categories: { id: BookmarkCategory; label: string }[] = [
    { id: 'reading', label: '📖 Currently Reading' },
    { id: 'plan_to_read', label: '📌 Plan to Read' },
    { id: 'completed', label: '✅ Completed' },
    { id: 'on_hold', label: '⏸️ On Hold' },
    { id: 'dropped', label: '❌ Dropped' },
  ];

  return (
    <div className="relative rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8 backdrop-blur-md shadow-2xl">
      {/* Blurred cover backdrop */}
      <div
        className="absolute inset-0 bg-cover bg-center blur-3xl opacity-20 scale-110 pointer-events-none"
        style={{ backgroundImage: `url(${manga.coverUrl})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent z-10" />

      <div className="relative z-20 flex flex-col md:flex-row gap-8 items-start">
        {/* Cover Poster */}
        <div className="shrink-0 mx-auto md:mx-0 w-52 sm:w-64 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-zinc-700/60 bg-zinc-950">
          <img
            src={manga.coverUrl}
            alt={manga.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Info & Metadata */}
        <div className="flex-1 flex flex-col">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-purple-600/90 text-white shadow-sm flex items-center gap-1.5 uppercase">
              {manga.type === 'manhwa'
                ? '🇰🇷 Manhwa'
                : manga.type === 'manhua'
                ? '🇨🇳 Manhua'
                : '🇯🇵 Manga'}
            </span>

            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-md border uppercase ${
                manga.status === 'completed'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
              }`}
            >
              {manga.status}
            </span>

            {manga.year && (
              <span className="text-xs font-mono text-zinc-400 bg-zinc-800 px-2.5 py-1 rounded-md flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                {manga.year}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            {manga.title}
          </h1>

          {/* Alt Titles */}
          {manga.altTitles.length > 0 && (
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 line-clamp-1 italic">
              {manga.altTitles.join(' • ')}
            </p>
          )}

          {/* Authors & Artists */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-zinc-300">
            {manga.authors.length > 0 && (
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-purple-400" />
                <span>
                  Author: <strong className="text-white">{manga.authors.join(', ')}</strong>
                </span>
              </div>
            )}
            {manga.artists.length > 0 && manga.artists[0] !== manga.authors[0] && (
              <div className="flex items-center gap-1.5">
                <span>
                  Artist: <strong className="text-white">{manga.artists.join(', ')}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {manga.tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/search?tags=${tag.id}`}
                className="text-xs font-medium text-zinc-300 bg-zinc-800/90 hover:bg-purple-600/30 hover:text-purple-300 hover:border-purple-500/50 border border-zinc-700/60 px-2.5 py-1 rounded-lg transition"
              >
                {tag.name}
              </Link>
            ))}
          </div>

          {/* Multi-Source Notice */}
          <div className="mt-3.5 flex items-center gap-2">
            <a
              href="#chapters-section"
              className="text-[11px] font-semibold text-purple-300 hover:text-purple-200 bg-purple-950/40 hover:bg-purple-900/50 border border-purple-800/50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
            >
              <span>⚡</span>
              <span>Multi-Source available: Switch to <strong>WeebCentral</strong>, <strong>MangaPill</strong>, or <strong>ComicK</strong> for complete chapters!</span>
            </a>
          </div>

          {/* Action Buttons: Read & Bookmark */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {/* Resume or Start Reading */}
            {lastHistory ? (
              <Link
                href={`/read/${lastHistory.chapterId}?mangaId=${manga.id}`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-600/25 transition"
              >
                <Play className="w-4 h-4 fill-current" />
                Resume Ch. {lastHistory.chapterNumber} (p. {lastHistory.page})
              </Link>
            ) : (
              <a
                href="#chapters-section"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-600/25 transition"
              >
                <BookOpen className="w-4 h-4" />
                Start Reading
              </a>
            )}

            {/* Bookmark with Category Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowCategoryMenu(!showCategoryMenu)}
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold border transition ${
                  bookmark
                    ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                    : 'bg-zinc-800/80 border-zinc-700 text-zinc-200 hover:bg-zinc-700 hover:text-white'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${bookmark ? 'fill-current' : ''}`} />
                <span>
                  {bookmark
                    ? categories.find((c) => c.id === bookmark.category)?.label.split(' ')[1] || 'Saved'
                    : 'Add to Library'}
                </span>
              </button>

              {showCategoryMenu && (
                <div className="absolute left-0 top-full mt-2 w-52 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-1.5 z-50 divide-y divide-zinc-800 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Reading Status
                  </div>
                  <div className="py-1">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => handleBookmarkCategory(cat.id)}
                        className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between transition ${
                          bookmark?.category === cat.id
                            ? 'bg-purple-600 text-white font-bold'
                            : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                        }`}
                      >
                        <span>{cat.label}</span>
                        {bookmark?.category === cat.id && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                  {bookmark && (
                    <div className="pt-1">
                      <button
                        onClick={handleRemoveBookmark}
                        className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition"
                      >
                        Remove from Library
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Share button */}
            <button
              onClick={handleShare}
              title="Share Manga"
              className="p-3 rounded-xl bg-zinc-800/80 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-700 transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

