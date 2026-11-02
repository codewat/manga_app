import { NextRequest, NextResponse } from 'next/server';
import { fetchMangaChapters } from '@/lib/mangadex';
import { fetchProviderChapters, MangaProviderId } from '@/lib/providers';

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
    const providerParam = searchParams.get('provider') || '';
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    // If provider is specified as non-mangadex OR id is not a MangaDex UUID
    if ((providerParam && providerParam !== 'mangadex') || !isUuid) {
      let p = (providerParam as MangaProviderId) || 'asura';
      if (id.startsWith('weebcentral:')) p = 'weebcentral';
      else if (id.startsWith('flame:')) p = 'flame';
      else if (id.startsWith('mangapill:')) p = 'mangapill';
      else if (id.startsWith('asura:')) p = 'asura';

      const cleanId = id.replace(/^(asura|weebcentral|flame|mangapill):/, '');
      const chapters = await fetchProviderChapters(p, cleanId);
      return NextResponse.json({ chapters, total: chapters.length, limit: chapters.length, offset: 0 });
    }

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

