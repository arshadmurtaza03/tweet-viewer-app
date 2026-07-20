import type { SyndicationTweet } from './types';

export async function fetchSyndicationTweet(tweetId: string): Promise<{ tweet?: SyndicationTweet; error?: string }> {
  if (!tweetId || !/^\d+$/.test(tweetId)) {
    return { error: 'Invalid tweet ID format' };
  }

  // Calculate token parameter if needed
  const token = (BigInt(tweetId) / 1000000000000000n).toString(36);
  const url = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&token=${token}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      if (res.status === 404) return { error: 'Tweet not found or account is private' };
      return { error: `Syndication service error (${res.status})` };
    }

    const tweet: SyndicationTweet = await res.json();

    if (tweet.notFound || tweet.tombstone) {
      return { error: 'This tweet is unavailable or has been deleted' };
    }

    return { tweet };
  } catch (e: any) {
    console.error('fetchSyndicationTweet error:', e);
    return { error: 'Failed to retrieve tweet' };
  }
}
