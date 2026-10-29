import { NextRequest, NextResponse } from 'next/server';
import { fetchChapterPages } from '@/lib/mangadex';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing chapter ID' }, { status: 400 });
    }

    const pagesData = await fetchChapterPages(id);
    return NextResponse.json(pagesData);
  } catch (error: any) {
    console.error('API /api/chapter/[id] error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch chapter pages' }, { status: 500 });
  }
}

