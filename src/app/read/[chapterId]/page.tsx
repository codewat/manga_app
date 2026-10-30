import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import MangaReader from '@/components/MangaReader';
import { fetchChapterPages, fetchMangaById } from '@/lib/mangadex';
import { fetchProviderPages, MangaProviderId } from '@/lib/providers';
import { ChapterPagesData } from '@/types/manga';
import { AlertCircle } from 'lucide-react';

interface ReadPageProps {
  params: Promise<{ chapterId: string }>;
  searchParams: Promise<{
    mangaId?: string;
    provider?: string;
    title?: string;
  }>;
}

export default async function ReadPage({ params, searchParams }: ReadPageProps) {
  const { chapterId } = await params;
  const { mangaId = '', provider = 'mangadex', title = '' } = await searchParams;

  if (!chapterId) {
    notFound();
  }

  const decodedChapterId = decodeURIComponent(chapterId);
  let pagesData: ChapterPagesData;

  try {
    if (provider === 'mangadex') {
      pagesData = await fetchChapterPages(decodedChapterId);
    } else {
      const pageUrls = await fetchProviderPages(
        provider as MangaProviderId,
        decodedChapterId
      );
      if (!pageUrls || pageUrls.length === 0) {
        throw new Error(`No pages found on provider ${provider}`);
      }
      pagesData = {
        chapterId: decodedChapterId,
        baseUrl: '',
        hash: '',
        pages: pageUrls,
        dataSaverPages: pageUrls,
      };
    }
  } catch (err: any) {
    console.error(`Error fetching chapter pages from ${provider}:`, err);
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
        <h2 className="text-xl font-bold text-white">Failed to Load Chapter</h2>
        <p className="text-sm text-zinc-400 mt-1 max-w-sm">
          Could not load chapter pages from <strong>{provider.toUpperCase()}</strong>.
        </p>
        <div className="flex gap-3 mt-6">
          {mangaId && (
            <Link
              href={`/manga/${mangaId}`}
              className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-semibold"
            >
              Back to Chapter List & Choose Other Source
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

  let mangaTitle = title || 'Manga Reader';
  let mangaCover = '';
  let mangaType = 'manga';

  if (mangaId) {
    try {
      const manga = await fetchMangaById(mangaId);
      if (manga) {
        if (!title) mangaTitle = manga.title;
        mangaCover = manga.coverUrl;
        mangaType = manga.type;
      }
    } catch {
      // Non-blocking
    }
  }

  return (
    <MangaReader
      chapterId={decodedChapterId}
      mangaId={mangaId}
      initialPagesData={pagesData}
      mangaTitle={mangaTitle}
      mangaCover={mangaCover}
      mangaType={mangaType}
      provider={provider}
    />
  );
}
