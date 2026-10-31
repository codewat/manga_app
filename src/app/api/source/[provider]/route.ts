import { NextRequest, NextResponse } from 'next/server';
import {
  MangaProviderId,
  searchProviderManga,
  fetchProviderChapters,
  fetchProviderPages,
} from '@/lib/providers';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'search';

    const validProviders: MangaProviderId[] = [
      'weebcentral',
      'asura',
      'flame',
      'mangapill',
    ];
    if (!validProviders.includes(provider as MangaProviderId)) {
      return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
    }

    const providerId = provider as MangaProviderId;

    if (action === 'search') {
      const q = searchParams.get('q');
      if (!q) {
        return NextResponse.json({ results: [] });
      }
      const results = await searchProviderManga(providerId, q);
      return NextResponse.json({ results });
    }

    if (action === 'chapters') {
      const id = searchParams.get('id');
      if (!id) {
        return NextResponse.json({ error: 'Missing manga id' }, { status: 400 });
      }
      const chapters = await fetchProviderChapters(providerId, id);
      return NextResponse.json({ chapters });
    }

    if (action === 'pages') {
      const chapterId = searchParams.get('chapterId');
      if (!chapterId) {
        return NextResponse.json({ error: 'Missing chapterId' }, { status: 400 });
      }
      const pages = await fetchProviderPages(providerId, chapterId);
      return NextResponse.json({ pages });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('Source API error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
