import type { APIRoute } from 'astro';
import { fetchSyndicationTimeline } from '../../lib/syndication';
import { fetchFixTweetProfile } from '../../lib/fxtwitter';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const username = url.searchParams.get('username');
  const cursor = url.searchParams.get('cursor') || undefined;

  if (!username || !/^[a-zA-Z0-9_]{1,15}$/.test(username)) {
    return new Response(
      JSON.stringify({ error: 'Invalid or missing username' }),
      { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }

  try {
    // 1. Primary: Syndication timeline fetch
    let { tweets, bottom_cursor } = await fetchSyndicationTimeline(username, cursor);

    // 2. Fallback: If syndication returned 0 tweets, try FixTweet profile
    if (!tweets || tweets.length === 0) {
      const fxResult = await fetchFixTweetProfile(username, cursor);
      tweets = fxResult.tweets || [];
      bottom_cursor = fxResult.bottom_cursor;
    }

    // 3. Hydrate missing media for tweets via FixTweet status API in parallel
    if (tweets && tweets.length > 0) {
      const unhydrated = tweets.filter(t => !t.media?.photos?.length && !t.media?.videos?.length && (t.text?.includes('t.co') || t.text?.includes('http')));
      
      if (unhydrated.length > 0) {
        // Hydrate up to 10 tweets in parallel
        await Promise.all(unhydrated.slice(0, 10).map(async (t) => {
          try {
            const statusRes = await fetch(`https://api.fxtwitter.com/${username}/status/${t.id}`, {
              headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }
            });
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              if (statusData.tweet?.media) {
                t.media = statusData.tweet.media;
              }
            }
          } catch {
            // Silently retain text
          }
        }));
      }
    }

    return new Response(
      JSON.stringify({ tweets, bottom_cursor }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
        },
      }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch timeline', message: e.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
};
