import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    const parsed = new URL(imageUrl);
    const allowedHosts = [
      'uploads.mangadex.org',
      'api.mangadex.org',
    ];

    const isAllowed =
      allowedHosts.includes(parsed.hostname) ||
      parsed.hostname.endsWith('.mangadex.network') ||
      parsed.hostname.endsWith('.mangadex.org');

    if (!isAllowed) {
      return new NextResponse('Forbidden domain', { status: 403 });
    }

    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'MangaVerse-App/1.0',
        'Referer': 'https://mangadex.org',
      },
    });

    if (!response.ok) {
      return new NextResponse(`Upstream error: ${response.status}`, {
        status: response.status,
      });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    return new NextResponse(err.message || 'Error fetching image', { status: 500 });
  }
}

