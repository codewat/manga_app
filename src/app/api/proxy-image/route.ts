import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    const parsed = new URL(imageUrl);
    const host = parsed.hostname.toLowerCase();

    // Determine appropriate referer
    let referer = 'https://mangadex.org/';
    if (host.includes('readdetectiveconan') || host.includes('mangapill')) {
      referer = 'https://mangapill.com/';
    } else if (host.includes('planeptune') || host.includes('weebcentral') || host.includes('compsci88')) {
      referer = 'https://weebcentral.com/';
    } else if (host.includes('comick')) {
      referer = 'https://comick.io/';
    }

    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: referer,
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
