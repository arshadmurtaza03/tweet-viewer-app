import type { APIRoute } from 'astro';
import { fetchSyndicationTweet } from '../../../lib/syndication';

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  const { id } = params;

  if (!id || !/^\d+$/.test(id)) {
    return new Response(
      JSON.stringify({ error: 'Invalid tweet ID format' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Cloudflare Edge Cache check
  const cacheKey = new Request(request.url, request);
  let cache;
  try {
    // @ts-ignore
    cache = caches.default;
  } catch (e) {
    // Local dev fallback
  }

  if (cache) {
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }
  }

  const result = await fetchSyndicationTweet(id);

  if (result.error) {
    return new Response(
      JSON.stringify({ error: result.error }),
      {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60',
        },
      }
    );
  }

  const response = new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=600',
      'Access-Control-Allow-Origin': '*',
    },
  });

  if (cache) {
    await cache.put(cacheKey, response.clone());
  }

  return response;
};
