import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const mediaUrl = url.searchParams.get('url');

  if (!mediaUrl || (!mediaUrl.includes('twimg.com') && !mediaUrl.includes('twitter.com'))) {
    return new Response('Invalid media URL', { status: 400 });
  }

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': '*/*',
    };

    // Forward Range header if present (for HTML5 video seeking)
    const range = request.headers.get('range');
    if (range) {
      headers['Range'] = range;
    }

    const videoRes = await fetch(mediaUrl, { headers });

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', videoRes.headers.get('content-type') || 'video/mp4');
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Cache-Control', 'public, max-age=86400, immutable');
    
    if (videoRes.headers.get('content-length')) {
      responseHeaders.set('Content-Length', videoRes.headers.get('content-length')!);
    }
    if (videoRes.headers.get('content-range')) {
      responseHeaders.set('Content-Range', videoRes.headers.get('content-range')!);
    }
    if (videoRes.headers.get('accept-ranges')) {
      responseHeaders.set('Accept-Ranges', videoRes.headers.get('accept-ranges')!);
    }

    return new Response(videoRes.body, {
      status: videoRes.status,
      headers: responseHeaders,
    });
  } catch (e: any) {
    return new Response(`Video proxy error: ${e.message}`, { status: 500 });
  }
};
