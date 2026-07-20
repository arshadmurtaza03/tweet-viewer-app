import type { APIRoute } from 'astro';
import { fetchFixTweetProfile } from '../../../lib/fxtwitter';

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  const { username } = params;

  if (!username || !/^[a-zA-Z0-9_]{1,15}$/.test(username)) {
    return new Response(
      JSON.stringify({ error: 'Invalid username format' }),
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
    // Local dev mode without Cloudflare Cache API
  }

  if (cache) {
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }
  }

  const result = await fetchFixTweetProfile(username);

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
      'Cache-Control': 'public, max-age=1800, stale-while-revalidate=300',
      'Access-Control-Allow-Origin': '*',
    },
  });

  if (cache) {
    await cache.put(cacheKey, response.clone());
  }

  return response;
};
