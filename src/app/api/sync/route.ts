import { NextRequest, NextResponse } from 'next/server';
import { findUserById, updateUserLibrary, verifyAuthToken } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('mangaverse_auth_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = findUserById(payload.id);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    bookmarks: user.bookmarks || [],
    history: user.history || [],
    settings: user.settings || null,
    updatedAt: user.updatedAt,
  });
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('mangaverse_auth_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const updated = updateUserLibrary(payload.id, {
      bookmarks: body.bookmarks,
      history: body.history,
      settings: body.settings,
    });

    return NextResponse.json({
      success: true,
      updatedAt: updated.updatedAt,
      bookmarksCount: updated.bookmarks.length,
      historyCount: updated.history.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Sync failed' }, { status: 500 });
  }
}
