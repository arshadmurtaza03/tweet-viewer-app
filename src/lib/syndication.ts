import type { SyndicationTweet } from './types';

export async function fetchSyndicationTweet(tweetId: string): Promise<{ tweet?: SyndicationTweet; error?: string }> {
  if (!tweetId || !/^\d+$/.test(tweetId)) {
    return { error: 'Invalid tweet ID format' };
  }

  // Calculate token parameter required by Twitter Syndication CDN
  let token = '0';
  try {
    token = (BigInt(tweetId) / 1000000000000000n).toString(36);
  } catch (e) {
    // fallback token
  }

  const url = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en&token=${token}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Origin': 'https://platform.twitter.com',
        'Referer': 'https://platform.twitter.com/',
      },
    });

    if (!res.ok) {
      if (res.status === 404) return { error: 'Tweet not found or account is private' };
      return { error: `Syndication service error (${res.status})` };
    }

    const text = await res.text();
    if (!text || text.trim() === '{}') {
      return { error: 'Syndication returned empty payload' };
    }

    const tweet: SyndicationTweet = JSON.parse(text);

    if (tweet.notFound || tweet.tombstone || !tweet.id_str) {
      return { error: 'This tweet is unavailable or has been deleted' };
    }

    return { tweet };
  } catch (e: any) {
    console.error('fetchSyndicationTweet error:', e);
    return { error: 'Failed to retrieve tweet from Syndication' };
  }
}
