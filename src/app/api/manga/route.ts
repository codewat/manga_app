import { NextRequest, NextResponse } from 'next/server';
import { fetchMangaList } from '@/lib/mangadex';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') || undefined;
    const type = (searchParams.get('type') || 'all') as any;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const tagsParam = searchParams.get('tags');
    const includedTags = tagsParam ? tagsParam.split(',').filter(Boolean) : [];
    const statusParam = searchParams.get('status');
    const status = statusParam ? statusParam.split(',').filter(Boolean) : [];
    const sort = searchParams.get('sort') || 'followedCount';
    const orderDir = (searchParams.get('order') || 'desc') as 'asc' | 'desc';

    const order: Record<string, 'asc' | 'desc'> = { [sort]: orderDir };

    const data = await fetchMangaList({
      limit: Math.min(limit, 100),
      offset,
      title,
      type,
      includedTags,
      status,
      order,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API /api/manga error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch manga' }, { status: 500 });
  }
}

