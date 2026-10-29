import { NextRequest, NextResponse } from 'next/server';
import { fetchMangaById } from '@/lib/mangadex';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing manga ID' }, { status: 400 });
    }

    const manga = await fetchMangaById(id);
    if (!manga) {
      return NextResponse.json({ error: 'Manga not found' }, { status: 404 });
    }

    return NextResponse.json(manga);
  } catch (error: any) {
    console.error('API /api/manga/[id] error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch manga' }, { status: 500 });
  }
}

