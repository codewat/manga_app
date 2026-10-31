'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  Maximize,
  Minimize,
  BookOpen,
  ScrollText,
  FileText,
  ArrowLeft,
  Loader2,
  Sliders,
  Check,
} from 'lucide-react';
import { ChapterPagesData, ChapterItem, ReaderMode, ReadingDirection, ImageFitMode } from '@/types/manga';
import { saveHistory, getReaderSettings, saveReaderSettings, updateBookmarkProgress } from '@/lib/storage';

interface MangaReaderProps {
  chapterId: string;
  mangaId: string;
  initialPagesData: ChapterPagesData;
  mangaTitle?: string;
  mangaCover?: string;
  mangaType?: string;
  provider?: string;
}

export default function MangaReader({
  chapterId,
  mangaId,
  initialPagesData,
  mangaTitle = 'Manga',
  mangaCover = '',
  mangaType = 'manga',
  provider = 'mangadex',
}: MangaReaderProps) {
  const router = useRouter();

  // Settings state
  const [settings, setSettings] = useState(() => getReaderSettings());
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showChapterMenu, setShowChapterMenu] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  // Reader state
  const [currentPage, setCurrentPage] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [currentChapter, setCurrentChapter] = useState<ChapterItem | null>(null);

  // Loaded images map for error handling / proxy fallback
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

  const pages = settings.dataSaver
    ? initialPagesData.dataSaverPages
    : initialPagesData.pages;

  const totalPages = pages.length;

  // Auto-set reader mode based on manga type on initial load if manhwa/manhua
  useEffect(() => {
    if ((mangaType === 'manhwa' || mangaType === 'manhua') && settings.mode !== 'webtoon') {
      const updated = saveReaderSettings({ mode: 'webtoon' });
      setSettings(updated);
    }
  }, [mangaType]);

  // Load chapters list for chapter dropdown
  useEffect(() => {
    async function loadMangaChapters() {
      try {
        const res = await fetch(`/api/manga/${mangaId}/chapters?order=asc&limit=100`);
        if (res.ok) {
          const data = await res.json();
          const chaps: ChapterItem[] = data.chapters || [];
          setChapters(chaps);
          const found = chaps.find((c) => c.id === chapterId);
          if (found) setCurrentChapter(found);
        }
      } catch (e) {
        console.error('Failed to load sibling chapters:', e);
      }
    }
    if (mangaId) loadMangaChapters();
  }, [mangaId, chapterId]);

  // Save reading progress to History and Bookmarks
  useEffect(() => {
    if (!currentChapter) return;
    saveHistory({
      mangaId,
      title: mangaTitle,
      coverUrl: mangaCover,
      type: mangaType as any,
      chapterId,
      chapterNumber: currentChapter.chapter || '0',
      chapterTitle: currentChapter.title,
      page: currentPage,
      totalPages,
      updatedAt: Date.now(),
    });

    updateBookmarkProgress(mangaId, chapterId, currentChapter.chapter || '0');
  }, [currentPage, chapterId, currentChapter, mangaId, mangaTitle, mangaCover, mangaType, totalPages]);

  // Fullscreen listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.error('Error attempting to exit fullscreen:', err);
      });
    }
  };

  // Auto-hide controls
  const resetControlsTimer = useCallback(() => {
    setControlsVisible(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (!showSettingsMenu && !showChapterMenu) {
        setControlsVisible(false);
      }
    }, 4000);
  }, [showSettingsMenu, showChapterMenu]);

  useEffect(() => {
    resetControlsTimer();
    const handleMouseMove = () => resetControlsTimer();
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, [resetControlsTimer]);

  // Find next and prev chapter IDs
  const currentIndex = chapters.findIndex((c) => c.id === chapterId);
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter = currentIndex >= 0 && currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

  const navigateToChapter = (id: string) => {
    router.push(
      `/read/${encodeURIComponent(id)}?mangaId=${mangaId}&provider=${provider}&title=${encodeURIComponent(mangaTitle)}`
    );
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((p) => p + 1);
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else if (nextChapter) {
      navigateToChapter(nextChapter.id);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((p) => p - 1);
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else if (prevChapter) {
      navigateToChapter(prevChapter.id);
    }
  };

  // Keyboard controls for page-by-page
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        if (settings.direction === 'rtl') {
          handlePrevPage();
        } else {
          handleNextPage();
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        if (settings.direction === 'rtl') {
          handleNextPage();
        } else {
          handlePrevPage();
        }
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.direction, currentPage, totalPages]);

  // Track scroll position in webtoon mode to update current page number
  useEffect(() => {
    if (settings.mode !== 'webtoon') return;

    const handleScroll = () => {
      const images = document.querySelectorAll<HTMLImageElement>('.webtoon-page-img');
      const middleY = window.innerHeight / 2;

      for (let i = 0; i < images.length; i++) {
        const rect = images[i].getBoundingClientRect();
        if (rect.top <= middleY && rect.bottom >= middleY) {
          setCurrentPage(i + 1);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [settings.mode]);

  const updateSetting = <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) => {
    const updated = saveReaderSettings({ [key]: value });
    setSettings(updated);
  };

  const getImageSrc = (pageUrl: string, idx: number) => {
    if (failedImages[idx]) {
      // Use proxy fallback
      return `/api/proxy-image?url=${encodeURIComponent(pageUrl)}`;
    }
    if (
      provider !== 'mangadex' &&
      (pageUrl.includes('mangapill') ||
        pageUrl.includes('readdetectiveconan') ||
        pageUrl.includes('asurascans') ||
        pageUrl.includes('flamecomics') ||
        pageUrl.includes('comick'))
    ) {
      return `/api/proxy-image?url=${encodeURIComponent(pageUrl)}`;
    }
    return pageUrl;
  };

  const handleImageError = (idx: number) => {
    if (!failedImages[idx]) {
      setFailedImages((prev) => ({ ...prev, [idx]: true }));
    }
  };

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col relative select-none"
    >
      {/* Top Floating Navigation Bar */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3 flex items-center justify-between transition-transform duration-300 ${
          controlsVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="flex items-center gap-3">
          <Link
            href={`/manga/${mangaId}`}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 px-2.5 py-1.5 rounded-lg border border-zinc-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Details</span>
          </Link>

          <div>
            <h1 className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-xs">
              {mangaTitle}
            </h1>
            <p className="text-xs text-purple-400 font-medium">
              Chapter {currentChapter?.chapter || '0'} {currentChapter?.title ? `• ${currentChapter.title}` : ''}
            </p>
          </div>
        </div>

        {/* Center: Chapter Quick Selector */}
        <div className="relative">
          <button
            onClick={() => {
              setShowChapterMenu(!showChapterMenu);
              setShowSettingsMenu(false);
            }}
            className="flex items-center gap-1.5 text-xs font-semibold bg-zinc-900 border border-zinc-700/80 hover:border-purple-500 text-zinc-200 px-3 py-1.5 rounded-lg transition"
          >
            <span>Ch. {currentChapter?.chapter || '0'}</span>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showChapterMenu ? 'rotate-90' : ''}`} />
          </button>

          {showChapterMenu && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 max-h-80 overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-2 z-50 divide-y divide-zinc-800">
              <div className="px-2 py-1.5 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Select Chapter
              </div>
              {chapters.map((chap) => (
                <button
                  key={chap.id}
                  onClick={() => {
                    setShowChapterMenu(false);
                    navigateToChapter(chap.id);
                  }}
                  className={`w-full text-left px-2.5 py-2 text-xs rounded-lg flex items-center justify-between transition ${
                    chap.id === chapterId
                      ? 'bg-purple-600 text-white font-bold'
                      : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  <span>Chapter {chap.chapter}</span>
                  {chap.id === chapterId && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Settings & Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Settings Button */}
          <div className="relative">
            <button
              onClick={() => {
                setShowSettingsMenu(!showSettingsMenu);
                setShowChapterMenu(false);
              }}
              aria-label="Reader Settings"
              className={`p-2 rounded-lg border transition ${
                showSettingsMenu
                  ? 'bg-purple-600 text-white border-purple-500'
                  : 'bg-zinc-900 text-zinc-300 hover:text-white border-zinc-800 hover:bg-zinc-800'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Settings Modal Dropdown */}
            {showSettingsMenu && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-4 z-50 space-y-4">
                <div className="text-xs font-bold text-zinc-200 uppercase tracking-wider border-b border-zinc-800 pb-2">
                  Reader Settings
                </div>

                {/* Reader Mode */}
                <div>
                  <label className="text-xs text-zinc-400 block mb-1.5 font-medium">Reading Mode</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => updateSetting('mode', 'webtoon')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition ${
                        settings.mode === 'webtoon'
                          ? 'bg-purple-600 border-purple-500 text-white'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750'
                      }`}
                    >
                      <ScrollText className="w-3.5 h-3.5" />
                      Webtoon
                    </button>
                    <button
                      onClick={() => updateSetting('mode', 'single')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition ${
                        settings.mode === 'single'
                          ? 'bg-purple-600 border-purple-500 text-white'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Single Page
                    </button>
                  </div>
                </div>

                {/* Direction (for Single page mode) */}
                {settings.mode === 'single' && (
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1.5 font-medium">Page Direction</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => updateSetting('direction', 'rtl')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                          settings.direction === 'rtl'
                            ? 'bg-purple-600 border-purple-500 text-white'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750'
                        }`}
                      >
                        Right to Left (Manga)
                      </button>
                      <button
                        onClick={() => updateSetting('direction', 'ltr')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                          settings.direction === 'ltr'
                            ? 'bg-purple-600 border-purple-500 text-white'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750'
                        }`}
                      >
                        Left to Right
                      </button>
                    </div>
                  </div>
                )}

                {/* Image Fit */}
                <div>
                  <label className="text-xs text-zinc-400 block mb-1.5 font-medium">Image Fit</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['width', 'contain', 'original'] as ImageFitMode[]).map((fit) => (
                      <button
                        key={fit}
                        onClick={() => updateSetting('fitMode', fit)}
                        className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold capitalize border transition ${
                          settings.fitMode === fit
                            ? 'bg-purple-600 border-purple-500 text-white'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750'
                        }`}
                      >
                        {fit}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Data Saver Mode */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                  <span className="text-xs text-zinc-300 font-medium">Data Saver Mode</span>
                  <input
                    type="checkbox"
                    checked={settings.dataSaver}
                    onChange={(e) => updateSetting('dataSaver', e.target.checked)}
                    className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            aria-label="Toggle Fullscreen"
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition hidden sm:block"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Reader Body */}
      <main className="flex-1 flex flex-col items-center justify-center pt-14 pb-16">
        {totalPages === 0 ? (
          <div className="text-center py-24 text-zinc-500">
            No image pages available for this chapter.
          </div>
        ) : settings.mode === 'webtoon' ? (
          /* WEBTOON VERTICAL MODE */
          <div
            className={`flex flex-col items-center w-full ${
              settings.fitMode === 'width' ? 'max-w-3xl' : settings.fitMode === 'contain' ? 'max-w-2xl' : 'max-w-4xl'
            } mx-auto`}
          >
            {pages.map((url, idx) => (
              <div key={idx} className="relative w-full flex justify-center bg-zinc-950">
                <img
                  src={getImageSrc(url, idx)}
                  alt={`Page ${idx + 1}`}
                  loading={idx < 4 ? 'eager' : 'lazy'}
                  onError={() => handleImageError(idx)}
                  className="webtoon-page-img w-full h-auto block select-none"
                  style={{ display: 'block', margin: 0, padding: 0 }}
                />
              </div>
            ))}

            {/* Next Chapter Card at the end of vertical strip */}
            <div className="w-full max-w-md my-12 p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-center space-y-4">
              <h3 className="font-bold text-white text-base">You finished Chapter {currentChapter?.chapter || '0'}!</h3>
              <div className="flex items-center justify-center gap-3">
                {prevChapter && (
                  <button
                    onClick={() => navigateToChapter(prevChapter.id)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition"
                  >
                    Previous Chapter
                  </button>
                )}
                {nextChapter ? (
                  <button
                    onClick={() => navigateToChapter(nextChapter.id)}
                    className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition"
                  >
                    Next Chapter ({nextChapter.chapter})
                  </button>
                ) : (
                  <Link
                    href={`/manga/${mangaId}`}
                    className="px-4 py-2 bg-purple-600 text-white text-xs font-semibold rounded-xl"
                  >
                    Back to Manga Details
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* SINGLE PAGE MODE */
          <div className="relative w-full flex-1 flex items-center justify-center">
            {/* Click zones for mobile / desktop click to advance */}
            <div
              onClick={settings.direction === 'rtl' ? handleNextPage : handlePrevPage}
              className="absolute left-0 top-0 bottom-0 w-1/3 z-20 cursor-w-resize"
              title={settings.direction === 'rtl' ? 'Next Page' : 'Previous Page'}
            />
            <div
              onClick={() => setControlsVisible(!controlsVisible)}
              className="absolute left-1/3 top-0 bottom-0 w-1/3 z-20 cursor-pointer"
              title="Toggle Menu"
            />
            <div
              onClick={settings.direction === 'rtl' ? handlePrevPage : handleNextPage}
              className="absolute right-0 top-0 bottom-0 w-1/3 z-20 cursor-e-resize"
              title={settings.direction === 'rtl' ? 'Previous Page' : 'Next Page'}
            />

            <div className="relative max-h-[85vh] flex items-center justify-center">
              <img
                src={getImageSrc(pages[currentPage - 1], currentPage - 1)}
                alt={`Page ${currentPage}`}
                onError={() => handleImageError(currentPage - 1)}
                className={`max-h-[85vh] select-none object-contain shadow-2xl rounded ${
                  settings.fitMode === 'width' ? 'w-full' : 'w-auto'
                }`}
              />
            </div>
          </div>
        )}
      </main>

      {/* Bottom Floating Navigation Bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/90 backdrop-blur-md border-t border-zinc-800/80 px-4 py-2.5 flex items-center justify-between transition-transform duration-300 ${
          controlsVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <button
          onClick={handlePrevPage}
          disabled={!prevChapter && currentPage <= 1}
          className="flex items-center gap-1 text-xs font-semibold text-zinc-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        {/* Page Slider / Indicator */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-semibold text-zinc-300">
            {currentPage} / {totalPages}
          </span>
          <input
            type="range"
            min={1}
            max={totalPages || 1}
            value={currentPage}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setCurrentPage(val);
              if (settings.mode === 'webtoon') {
                const images = document.querySelectorAll('.webtoon-page-img');
                if (images[val - 1]) {
                  images[val - 1].scrollIntoView({ behavior: 'smooth' });
                }
              }
            }}
            className="w-28 sm:w-48 accent-purple-500 cursor-pointer"
          />
        </div>

        <button
          onClick={handleNextPage}
          disabled={!nextChapter && currentPage >= totalPages}
          className="flex items-center gap-1 text-xs font-semibold text-zinc-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

