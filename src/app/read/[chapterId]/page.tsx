import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import MangaReader from '@/components/MangaReader';
import { fetchChapterPages, fetchMangaById } from '@/lib/mangadex';
import { AlertCircle, ArrowLeft } from 'lucide-react';

interface ReadPageProps {
  params: Promise<{ chapterId: string }>;
  searchParams: Promise<{ mangaId?: string }>;
}

export default async function ReadPage({ params, searchParams }: ReadPageProps) {
  const { chapterId } = await params;
  const { mangaId = '' } = await searchParams;

  if (!chapterId) {
    notFound();
  }

  let pagesData;
  try {
    pagesData = await fetchChapterPages(chapterId);
  } catch (err: any) {
    console.error('Error fetching chapter pages:', err);
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
        <h2 className="text-xl font-bold text-white">Failed to Load Chapter</h2>
        <p className="text-sm text-zinc-400 mt-1 max-w-sm">
          This chapter might not be available on MangaDex servers or is hosted externally.
        </p>
        <div className="flex gap-3 mt-6">
          {mangaId && (
            <Link
              href={`/manga/${mangaId}`}
              className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-semibold"
            >
              Back to Chapter List
            </Link>
          )}
          <Link
            href="/"
            className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold"
          >
            Home
          </Link>
        </div>
      </div>
    );
  }

  let mangaTitle = 'Manga Reader';
  let mangaCover = '';
  let mangaType = 'manga';

  if (mangaId) {
    try {
      const manga = await fetchMangaById(mangaId);
      if (manga) {
        mangaTitle = manga.title;
        mangaCover = manga.coverUrl;
        mangaType = manga.type;
      }
    } catch (e) {
      // Non-blocking
    }
  }

  return (
    <MangaReader
      chapterId={chapterId}
      mangaId={mangaId}
      initialPagesData={pagesData}
      mangaTitle={mangaTitle}
      mangaCover={mangaCover}
      mangaType={mangaType}
    />
  );
}

