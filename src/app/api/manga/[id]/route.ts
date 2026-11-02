import { NextRequest, NextResponse } from 'next/server';
import { fetchMangaById } from '@/lib/mangadex';
import { MangaItem } from '@/types/manga';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing manga ID' }, { status: 400 });
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isUuid) {
      const manga = await fetchMangaById(id);
      if (manga) {
        return NextResponse.json(manga);
      }
    }

    // Graceful fallback for non-UUID or external source manga IDs
    const rawName = id.replace(/^(asura|weebcentral|flame|mangapill):/, '');
    const formattedTitle =
      rawName
        .split('/')
        .pop()
        ?.replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()) || rawName;

    const fallbackManga: MangaItem = {
      id,
      title: formattedTitle,
      altTitles: [],
      description: `Read ${formattedTitle} chapters and scans.`,
      coverUrl: '/placeholder.png',
      status: 'ongoing',
      type: 'manhwa',
      year: null,
      contentRating: 'safe',
      tags: [],
      authors: [],
      artists: [],
      originalLanguage: 'en',
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(fallbackManga);
  } catch (error: any) {
    console.error('API /api/manga/[id] error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch manga' }, { status: 500 });
  }
}

