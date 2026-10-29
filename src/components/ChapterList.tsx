'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowDownUp,
  Search,
  BookOpen,
  CheckCircle,
  Download,
  Loader2,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { ChapterItem } from '@/types/manga';
import { getHistoryItem } from '@/lib/storage';
import { downloadChapterAsCBZ } from '@/lib/download';

interface ChapterListProps {
  mangaId: string;
  mangaTitle: string;
  mangaCover: string;
  type: string;
}

export default function ChapterList({
  mangaId,
  mangaTitle,
  mangaCover,
  type,
}: ChapterListProps) {
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [language, setLanguage] = useState('en');
  const [lastReadChapterId, setLastReadChapterId] = useState<string | null>(null);

  // Download state: { [chapterId]: { downloading: boolean, progress: number, status: string } }
  const [downloadStates, setDownloadStates] = useState<
    Record<string, { downloading: boolean; progress: number; status: string }>
  >({});

  useEffect(() => {
    const history = getHistoryItem(mangaId);
    if (history) {
      setLastReadChapterId(history.chapterId);
    }
  }, [mangaId]);

  useEffect(() => {
    async function loadChapters() {
      setLoading(true);
      try {
        let chaps: ChapterItem[] = [];
        try {
          const res = await fetch(
            `/api/manga/${mangaId}/chapters?order=${order}&lang=${language}&limit=100`
          );
          if (res.ok) {
            const data = await res.json();
            chaps = data.chapters || [];
          }
        } catch {
          // Fall through
        }

        // Direct fallback to MangaDex API if proxy/serverless fails
        if (chaps.length === 0) {
          const directRes = await fetch(
            `https://api.mangadex.org/manga/${mangaId}/feed?limit=100&order[chapter]=${order}&translatedLanguage[]=en&includes[]=scanlation_group&contentRating[]=safe&contentRating[]=suggestive`
          );
          if (directRes.ok) {
            const json = await directRes.json();
            for (const item of json.data || []) {
              const attrs = item.attributes || {};
              const chapNum = attrs.chapter || '0';
              let scanlationGroup = 'Unknown Group';
              for (const rel of item.relationships || []) {
                if (rel.type === 'scanlation_group' && rel.attributes?.name) {
                  scanlationGroup = rel.attributes.name;
                  break;
                }
              }
              chaps.push({
                id: item.id,
                chapter: chapNum,
                volume: attrs.volume || null,
                title: attrs.title || `Chapter ${chapNum}`,
                translatedLanguage: attrs.translatedLanguage || 'en',
                publishAt: attrs.publishAt || attrs.createdAt,
                pages: attrs.pages || 0,
                scanlationGroup,
              });
            }
          }
        }

        setChapters(chaps);
      } catch (err) {
        console.error('Failed to load chapters:', err);
      } finally {
        setLoading(false);
      }
    }
    loadChapters();
  }, [mangaId, order, language]);

  const handleDownload = async (e: React.MouseEvent, chapter: ChapterItem) => {
    e.preventDefault();
    e.stopPropagation();

    if (downloadStates[chapter.id]?.downloading) return;

    setDownloadStates((prev) => ({
      ...prev,
      [chapter.id]: { downloading: true, progress: 0, status: 'Starting...' },
    }));

    try {
      await downloadChapterAsCBZ(mangaTitle, chapter, (progress, status) => {
        setDownloadStates((prev) => ({
          ...prev,
          [chapter.id]: { downloading: true, progress, status },
        }));
      });

      setTimeout(() => {
        setDownloadStates((prev) => {
          const next = { ...prev };
          delete next[chapter.id];
          return next;
        });
      }, 3000);
    } catch (err: any) {
      alert(`Download failed: ${err.message || 'Network error'}`);
      setDownloadStates((prev) => {
        const next = { ...prev };
        delete next[chapter.id];
        return next;
      });
    }
  };

  const filteredChapters = chapters.filter((chap) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (chap.chapter && chap.chapter.toLowerCase().includes(q)) ||
      (chap.title && chap.title.toLowerCase().includes(q)) ||
      (chap.scanlationGroup && chap.scanlationGroup.toLowerCase().includes(q))
    );
  });

  return (
    <div className="mt-8 bg-zinc-900/40 rounded-2xl border border-zinc-800 p-4 sm:p-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            Chapters ({chapters.length})
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Select a chapter to read or download for offline access
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Chapter Search */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter chapters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-750 text-xs text-zinc-200 pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Sort Order Toggle */}
          <button
            onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg border border-zinc-700 transition"
          >
            <ArrowDownUp className="w-3.5 h-3.5" />
            <span>{order === 'desc' ? 'Newest First' : 'Oldest First'}</span>
          </button>
        </div>
      </div>

      {/* Chapter List */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center text-zinc-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          <span className="text-sm">Loading available chapters...</span>
        </div>
      ) : filteredChapters.length === 0 ? (
        <div className="py-16 text-center text-zinc-500 text-sm">
          No chapters found matching your filter.
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/60 max-h-[600px] overflow-y-auto pr-1 mt-2">
          {filteredChapters.map((chap) => {
            const isRead = chap.id === lastReadChapterId;
            const dlState = downloadStates[chap.id];

            return (
              <div
                key={chap.id}
                className={`group flex items-center justify-between p-3.5 hover:bg-zinc-800/40 rounded-xl transition ${
                  isRead ? 'bg-purple-950/20 border-l-2 border-purple-500 pl-3' : ''
                }`}
              >
                {/* Chapter Info & Read Link */}
                <Link
                  href={`/read/${chap.id}?mangaId=${mangaId}`}
                  className="flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 min-w-0 pr-4"
                >
                  <div className="flex items-center gap-2">
                    {isRead ? (
                      <CheckCircle className="w-4 h-4 text-purple-400 shrink-0" />
                    ) : (
                      <BookOpen className="w-4 h-4 text-zinc-500 group-hover:text-purple-400 shrink-0 transition" />
                    )}
                    <span className="font-semibold text-sm text-zinc-200 group-hover:text-purple-300 transition">
                      Chapter {chap.chapter || '0'}
                    </span>
                  </div>

                  {chap.title && chap.title !== `Chapter ${chap.chapter}` && (
                    <span className="text-xs text-zinc-400 truncate max-w-sm">
                      {chap.title}
                    </span>
                  )}

                  <div className="flex items-center gap-3 text-[11px] text-zinc-500 sm:ml-auto">
                    {chap.scanlationGroup && (
                      <span className="truncate max-w-[150px]">{chap.scanlationGroup}</span>
                    )}
                    {chap.publishAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(chap.publishAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </Link>

                {/* Actions: Download CBZ */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => handleDownload(e, chap)}
                    disabled={dlState?.downloading}
                    title="Download offline (.cbz archive)"
                    className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                      dlState?.downloading
                        ? 'bg-purple-600/20 text-purple-300'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white'
                    }`}
                  >
                    {dlState?.downloading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                        <span className="text-[10px] font-mono">{dlState.progress}%</span>
                      </>
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <Link
                    href={`/read/${chap.id}?mangaId=${mangaId}`}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg shadow transition"
                  >
                    Read
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

