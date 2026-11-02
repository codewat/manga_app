import { NextRequest, NextResponse } from 'next/server';
import { findUserById, verifyAuthToken } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('mangaverse_auth_token')?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  const user = findUserById(payload.id);
  if (!user) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      username: user.username,
      syncCode: user.syncCode,
      updatedAt: user.updatedAt,
      bookmarksCount: user.bookmarks.length,
      historyCount: user.history.length,
    },
  });
}
