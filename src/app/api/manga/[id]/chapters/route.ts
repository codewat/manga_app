import { NextRequest, NextResponse } from 'next/server';
import { fetchMangaChapters } from '@/lib/mangadex';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing manga ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const order = (searchParams.get('order') || 'asc') as 'asc' | 'desc';
    const lang = searchParams.get('lang') || 'en';
    const translatedLanguage = lang === 'all' ? [] : [lang];

    const data = await fetchMangaChapters(id, {
      limit,
      offset,
      order,
      translatedLanguage,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API /api/manga/[id]/chapters error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch chapters' }, { status: 500 });
  }
}

