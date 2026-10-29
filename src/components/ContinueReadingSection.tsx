'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Clock, X, ChevronRight } from 'lucide-react';
import { HistoryItem } from '@/types/manga';
import { getHistory, removeHistoryItem } from '@/lib/storage';

export default function ContinueReadingSection() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    function loadHistory() {
      setHistory(getHistory().slice(0, 8));
    }
    loadHistory();
    window.addEventListener('mangaverse_storage_update', loadHistory);
    return () => window.removeEventListener('mangaverse_storage_update', loadHistory);
  }, []);

  if (!mounted || history.length === 0) return null;

  const handleRemove = (e: React.MouseEvent, mangaId: string) => {
    e.preventDefault();
    e.stopPropagation();
    removeHistoryItem(mangaId);
    setHistory((prev) => prev.filter((item) => item.mangaId !== mangaId));
  };

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-purple-400" />
          <h2 className="text-xl font-bold text-white tracking-tight">Continue Reading</h2>
        </div>
        <Link
          href="/library?tab=history"
          className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition"
        >
          View All History <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {history.map((item) => (
          <div
            key={item.mangaId}
            className="group relative flex items-center gap-3.5 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-purple-500/50 hover:bg-zinc-800/60 transition shadow-lg"
          >
            {/* Thumbnail */}
            <Link
              href={`/read/${item.chapterId}?mangaId=${item.mangaId}`}
              className="relative w-16 h-22 rounded-lg overflow-hidden shrink-0 bg-zinc-950"
            >
              <img
                src={item.coverUrl}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="w-6 h-6 text-purple-400 fill-current" />
              </div>
            </Link>

            {/* Details */}
            <div className="flex-1 min-w-0 pr-6">
              <Link
                href={`/manga/${item.mangaId}`}
                className="text-xs font-semibold text-zinc-100 hover:text-purple-300 line-clamp-1 block"
                title={item.title}
              >
                {item.title}
              </Link>

              <p className="text-xs text-purple-400 font-medium mt-1">
                Chapter {item.chapterNumber}
              </p>

              {item.totalPages > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-500 h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.round(((item.page || 1) / item.totalPages) * 100))}%`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {item.page || 1}/{item.totalPages}
                  </span>
                </div>
              )}

              <Link
                href={`/read/${item.chapterId}?mangaId=${item.mangaId}`}
                className="inline-flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-zinc-200 bg-purple-600/30 hover:bg-purple-600 hover:text-white px-2.5 py-1 rounded transition"
              >
                <Play className="w-3 h-3 fill-current" />
                Resume
              </Link>
            </div>

            {/* Remove button */}
            <button
              onClick={(e) => handleRemove(e, item.mangaId)}
              title="Remove from history"
              className="absolute top-2.5 right-2.5 p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

