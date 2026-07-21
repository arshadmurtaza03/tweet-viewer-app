import type { FixTweetResponse, FixTweetUser, FixTweetObject } from './types';
import { fetchSyndicationTimeline } from './syndication';

export async function fetchFixTweetProfile(username: string, cursor?: string): Promise<{ user?: FixTweetUser; tweets?: FixTweetObject[]; bottom_cursor?: string; error?: string }> {
  const cleanUser = username.trim().replace(/^@/, '');
  if (!cleanUser || !/^[a-zA-Z0-9_]{1,15}$/.test(cleanUser)) {
    return { error: 'Invalid username format' };
  }

  try {
    // 1. Fetch User Metadata from FixTweet endpoint
    const profileRes = await fetch(`https://api.fxtwitter.com/${cleanUser}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'application/json',
      },
    });

    if (!profileRes.ok) {
      if (profileRes.status === 404) return { error: `User @${cleanUser} not found or account is private` };
      return { error: `FixTweet API error (${profileRes.status})` };
    }

    const data: FixTweetResponse = await profileRes.json();

    if (data.code && data.code !== 200) {
      return { error: data.message || 'Unable to load profile' };
    }

    const user = data.user;
    if (user) {
      user.followers = user.followers ?? user.followers_count ?? 0;
      user.following = user.following ?? user.following_count ?? user.friends_count ?? 0;
      user.tweets = user.tweets ?? user.statuses_count ?? 0;
      user.likes = user.likes ?? user.likes_count ?? 0;
      user.avatar_url = user.avatar_url || user.profile_image_url;
      user.banner_url = user.banner_url || user.profile_banner_url;
    }

    // 2. Fetch Timeline Tweets from Twitter Syndication Profile API (with cursor support)
    const { tweets: parsedTweets, bottom_cursor } = await fetchSyndicationTimeline(cleanUser, cursor);

    const finalTweets = parsedTweets.length > 0 ? parsedTweets : (data.tweets || (data.tweet ? [data.tweet] : []));

    return { user, tweets: finalTweets, bottom_cursor };
  } catch (e: any) {
    console.error('fetchFixTweetProfile error:', e);
    return { error: 'Failed to connect to Twitter network' };
  }
}

/**
 * Fetch only timeline tweets with cursor pagination (no user metadata).
 * Used by the "Load More" API endpoint.
 */
export async function fetchTimelinePage(username: string, cursor: string): Promise<{ tweets: FixTweetObject[]; bottom_cursor?: string; error?: string }> {
  const cleanUser = username.trim().replace(/^@/, '');
  if (!cleanUser || !/^[a-zA-Z0-9_]{1,15}$/.test(cleanUser)) {
    return { tweets: [], error: 'Invalid username format' };
  }

  const { tweets, bottom_cursor, error } = await fetchSyndicationTimeline(cleanUser, cursor);
  return { tweets, bottom_cursor, error };
}

export async function fetchFixTweetStatus(tweetId: string): Promise<{ tweet?: FixTweetObject; error?: string }> {
  if (!tweetId || !/^\d+$/.test(tweetId)) {
    return { error: 'Invalid tweet ID' };
  }

  try {
    const res = await fetch(`https://api.fxtwitter.com/i/status/${tweetId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      return { error: 'Tweet not found or restricted' };
    }

    const data: FixTweetResponse = await res.json();
    if (data.tweet) {
      if (data.tweet.author) {
        data.tweet.author.avatar_url = data.tweet.author.avatar_url || data.tweet.author.profile_image_url;
      }
      return { tweet: data.tweet };
    }

    return { error: 'Tweet unavailable' };
  } catch (e) {
    return { error: 'Failed to fetch tweet details' };
  }
}
