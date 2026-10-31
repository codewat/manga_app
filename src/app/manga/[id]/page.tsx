import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import MangaDetailHeader from '@/components/MangaDetailHeader';
import ChapterList from '@/components/ChapterList';
import { fetchMangaById } from '@/lib/mangadex';
import { MangaProviderId } from '@/types/providers';
import { MangaItem } from '@/types/manga';
import { ArrowLeft, BookOpen, AlertCircle } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    provider?: string;
    title?: string;
    cover?: string;
    type?: string;
  }>;
}

export default async function MangaDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sParams = (await searchParams) || {};
  const provider = (sParams.provider as MangaProviderId) || 'mangadex';
  const customTitle = sParams.title || '';
  const customCover = sParams.cover || '';

  if (!id) {
    notFound();
  }

  const decodedId = decodeURIComponent(id);
  let manga: MangaItem | null = null;

  try {
    manga = await fetchMangaById(decodedId);
  } catch {
    // Non-blocking fallback
  }

  // If not found in MangaDex or if opened directly from external provider
  if (!manga && (customTitle || provider !== 'mangadex')) {
    const formattedTitle =
      customTitle ||
      decodedId
        .split('/')
        .pop()
        ?.replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()) ||
      decodedId;

    manga = {
      id: decodedId,
      title: formattedTitle,
      altTitles: [],
      description: `Read ${formattedTitle} directly from ${provider.toUpperCase()}.\nAll complete chapters and high quality scans available below.`,
      coverUrl: customCover || '/placeholder.png',
      status: 'ongoing',
      type: (sParams.type as any) || 'manhwa',
      year: null,
      contentRating: 'safe',
      tags: [{ id: provider, name: provider.toUpperCase(), group: 'source' }],
      authors: [provider.toUpperCase()],
      artists: [provider.toUpperCase()],
      originalLanguage: 'en',
      updatedAt: new Date().toISOString(),
    };
  }

  if (!manga) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="w-12 h-12 text-purple-400 mb-3" />
          <h2 className="text-xl font-bold text-white">Manga Not Found</h2>
          <p className="text-sm text-zinc-400 mt-1 max-w-sm">
            The requested title may have been removed or the ID is invalid.
          </p>
          <Link
            href="/search"
            className="mt-6 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-semibold"
          >
            Search on Other Sources
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pb-20 md:pb-12">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 w-full">
        {/* Back navigation */}
        <Link
          href="/search"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white mb-6 group transition"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Search
        </Link>

        {/* Header Hero */}
        <MangaDetailHeader manga={manga} />

        {/* Synopsis & Summary Section */}
        <div className="mt-8 bg-zinc-900/40 rounded-2xl border border-zinc-800 p-6">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-400" />
            Synopsis
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
            {manga.description}
          </p>
        </div>

        {/* Chapter List Section */}
        <div id="chapters-section">
          <ChapterList
            mangaId={manga.id}
            mangaTitle={manga.title}
            mangaCover={manga.coverUrl}
            type={manga.type}
            initialProvider={provider !== 'mangadex' ? provider : undefined}
            initialSourceMangaId={provider !== 'mangadex' ? decodedId : undefined}
          />
        </div>
      </main>
    </div>
  );
}
