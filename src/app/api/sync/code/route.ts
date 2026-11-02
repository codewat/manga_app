import { NextRequest, NextResponse } from 'next/server';
import { findUserBySyncCode, signAuthToken } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { syncCode } = await request.json();

    if (!syncCode) {
      return NextResponse.json({ error: 'Sync code is required' }, { status: 400 });
    }

    const cleanCode = syncCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const user = findUserBySyncCode(cleanCode);

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired sync code' }, { status: 404 });
    }

    const token = signAuthToken({ id: user.id, username: user.username });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        syncCode: user.syncCode,
        bookmarks: user.bookmarks,
        history: user.history,
        settings: user.settings,
      },
    });

    response.cookies.set('mangaverse_auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Sync failed' }, { status: 500 });
  }
}
