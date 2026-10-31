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
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { ChapterItem } from '@/types/manga';
import { getHistoryItem } from '@/lib/storage';
import { downloadChapterAsCBZ } from '@/lib/download';
import { AVAILABLE_PROVIDERS, MangaProviderId } from '@/types/providers';

interface ChapterListProps {
  mangaId: string;
  mangaTitle: string;
  mangaCover: string;
  type: string;
}

interface SourceMatch {
  id: string;
  title: string;
  image?: string;
  releaseDate?: string;
}

export default function ChapterList({
  mangaId,
  mangaTitle,
}: ChapterListProps) {
  // Active provider: mangadex | weebcentral | mangapill | comick
  const [activeProvider, setActiveProvider] = useState<MangaProviderId>('mangadex');

  // Chapters & loading state
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [lastReadChapterId, setLastReadChapterId] = useState<string | null>(null);

  // External source matched manga list
  const [sourceMatches, setSourceMatches] = useState<SourceMatch[]>([]);
  const [selectedSourceMangaId, setSelectedSourceMangaId] = useState<string | null>(null);
  const [isSearchingSource, setIsSearchingSource] = useState(false);

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

  // Load chapters when provider or selectedSourceMangaId changes
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      setLoading(true);

      if (activeProvider === 'mangadex') {
        try {
          let chaps: ChapterItem[] = [];
          try {
            const res = await fetch(
              `/api/manga/${mangaId}/chapters?order=${order}&lang=en&limit=100`
            );
            if (res.ok) {
              const data = await res.json();
              chaps = data.chapters || [];
            }
          } catch {
            // fallback direct
          }

          if (chaps.length === 0) {
            const directRes = await fetch(
              `https://api.mangadex.org/manga/${mangaId}/feed?limit=100&order[chapter]=${order}&translatedLanguage[]=en&includes[]=scanlation_group&contentRating[]=safe&contentRating[]=suggestive`
            );
            if (directRes.ok) {
              const json = await directRes.json();
              for (const item of json.data || []) {
                const attrs = item.attributes || {};
                const chapNum = attrs.chapter || '0';
                chaps.push({
                  id: item.id,
                  chapter: chapNum,
                  volume: attrs.volume || null,
                  title: attrs.title || `Chapter ${chapNum}`,
                  translatedLanguage: attrs.translatedLanguage || 'en',
                  publishAt: attrs.publishAt || attrs.createdAt,
                  pages: attrs.pages || 0,
                  scanlationGroup: 'MangaDex',
                });
              }
            }
          }

          if (!isCancelled) {
            setChapters(chaps);
            setLoading(false);
          }
        } catch (err) {
          console.error('Failed to load MangaDex chapters:', err);
          if (!isCancelled) setLoading(false);
        }
        return;
      }

      // External Provider: WeebCentral, MangaPill, or ComicK
      try {
        setIsSearchingSource(true);

        // Step 1: Search provider if no specific match selected yet
        let targetId = selectedSourceMangaId;

        if (!targetId) {
          const searchRes = await fetch(
            `/api/source/${activeProvider}?action=search&q=${encodeURIComponent(mangaTitle)}`
          );
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            const results: SourceMatch[] = searchData.results || [];
            if (!isCancelled) setSourceMatches(results);

            if (results.length > 0) {
              targetId = results[0].id;
              if (!isCancelled) setSelectedSourceMangaId(targetId);
            }
          }
        }

        setIsSearchingSource(false);

        if (!targetId) {
          if (!isCancelled) {
            setChapters([]);
            setLoading(false);
          }
          return;
        }

        // Step 2: Fetch chapters for the matched source ID
        const chapRes = await fetch(
          `/api/source/${activeProvider}?action=chapters&id=${encodeURIComponent(targetId)}`
        );
        if (chapRes.ok) {
          const chapData = await chapRes.json();
          let fetched: ChapterItem[] = chapData.chapters || [];

          // Sort according to user preference
          if (order === 'desc') {
            fetched = fetched.sort((a, b) => parseFloat(b.chapter) - parseFloat(a.chapter));
          } else {
            fetched = fetched.sort((a, b) => parseFloat(a.chapter) - parseFloat(b.chapter));
          }

          if (!isCancelled) setChapters(fetched);
        }
      } catch (err) {
        console.error(`Failed to load chapters from ${activeProvider}:`, err);
      } finally {
        if (!isCancelled) {
          setIsSearchingSource(false);
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [activeProvider, mangaId, mangaTitle, order, selectedSourceMangaId]);

  // Handle provider switch
  const handleSelectProvider = (provId: MangaProviderId) => {
    if (provId === activeProvider) return;
    setActiveProvider(provId);
    setSelectedSourceMangaId(null);
    setSourceMatches([]);
  };

  const handleDownload = async (e: React.MouseEvent, chapter: ChapterItem) => {
    e.preventDefault();
    e.stopPropagation();

    if (downloadStates[chapter.id]?.downloading) return;

    setDownloadStates((prev) => ({
      ...prev,
      [chapter.id]: { downloading: true, progress: 0, status: 'Starting...' },
    }));

    try {
      await downloadChapterAsCBZ(
        mangaTitle,
        chapter,
        (progress, status) => {
          setDownloadStates((prev) => ({
            ...prev,
            [chapter.id]: { downloading: true, progress, status },
          }));
        },
        activeProvider
      );

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
    <div className="mt-8 bg-zinc-900/40 rounded-2xl border border-zinc-800 p-4 sm:p-6 shadow-xl">
      {/* Provider / Source Selector Header */}
      <div className="mb-6 p-4 rounded-xl bg-zinc-950/70 border border-zinc-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              Manga Source Provider
            </span>
          </div>
          <span className="text-[11px] text-zinc-400">
            If some chapters are missing or delayed, switch to another source below!
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {AVAILABLE_PROVIDERS.map((prov) => {
            const isSelected = activeProvider === prov.id;
            return (
              <button
                key={prov.id}
                onClick={() => handleSelectProvider(prov.id)}
                className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition ${
                  isSelected
                    ? 'bg-purple-600/20 border-purple-500 text-white shadow-md shadow-purple-600/10 ring-1 ring-purple-500'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs">{prov.name}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                      isSelected
                        ? 'bg-purple-500 text-white'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {prov.badge}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 mt-1 line-clamp-1">
                  {prov.description}
                </span>
              </button>
            );
          })}
        </div>

        {/* Source Match Dropdown (for external providers when multiple titles found) */}
        {activeProvider !== 'mangadex' && sourceMatches.length > 1 && (
          <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-medium shrink-0">Matched Title:</span>
            <select
              value={selectedSourceMangaId || ''}
              onChange={(e) => setSelectedSourceMangaId(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-purple-500 flex-1 truncate"
            >
              {sourceMatches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} {m.releaseDate ? `(${m.releaseDate})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Chapter Controls & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            Chapters ({chapters.length})
            <span className="text-xs font-normal text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/40">
              via {activeProvider.toUpperCase()}
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Select a chapter to read or download offline (.cbz)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Chapter Filter Input */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search chapter..."
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

      {/* Chapter List Area */}
      {loading || isSearchingSource ? (
        <div className="py-16 flex flex-col items-center justify-center text-zinc-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          <span className="text-sm">
            {isSearchingSource
              ? `Connecting to ${activeProvider.toUpperCase()}...`
              : 'Fetching complete chapters...'}
          </span>
        </div>
      ) : filteredChapters.length === 0 ? (
        <div className="py-16 text-center text-zinc-500 space-y-2">
          <p className="text-base font-semibold text-zinc-400">
            No chapters found on {activeProvider.toUpperCase()}
          </p>
          <p className="text-xs">
            Try switching to another source (e.g. <strong>WeebCentral</strong> or <strong>MangaPill</strong>) above.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/60 max-h-[600px] overflow-y-auto pr-1 mt-2">
          {filteredChapters.map((chap) => {
            const isRead = chap.id === lastReadChapterId;
            const dlState = downloadStates[chap.id];

            const readHref =
              activeProvider === 'mangadex'
                ? `/read/${encodeURIComponent(chap.id)}?mangaId=${mangaId}`
                : `/read/${encodeURIComponent(chap.id)}?provider=${activeProvider}&mangaId=${mangaId}&title=${encodeURIComponent(mangaTitle)}`;

            return (
              <div
                key={chap.id}
                className={`group flex items-center justify-between p-3.5 hover:bg-zinc-800/40 rounded-xl transition ${
                  isRead ? 'bg-purple-950/20 border-l-2 border-purple-500 pl-3' : ''
                }`}
              >
                {/* Chapter Info */}
                <Link
                  href={readHref}
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
                        {chap.publishAt}
                      </span>
                    )}
                  </div>
                </Link>

                {/* Actions: Download & Read */}
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
                    href={readHref}
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
