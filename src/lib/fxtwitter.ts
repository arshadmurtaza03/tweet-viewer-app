import type { FixTweetResponse, FixTweetUser, FixTweetObject } from './types';

export async function fetchFixTweetProfile(username: string): Promise<{ user?: FixTweetUser; tweets?: FixTweetObject[]; error?: string }> {
  const cleanUser = username.trim().replace(/^@/, '');
  if (!cleanUser || !/^[a-zA-Z0-9_]{1,15}$/.test(cleanUser)) {
    return { error: 'Invalid username format' };
  }

  try {
    const res = await fetch(`https://api.fxtwitter.com/${cleanUser}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MyTweetViewer/1.0',
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      if (res.status === 404) return { error: `User @${cleanUser} not found or account is private` };
      return { error: `FixTweet API error (${res.status})` };
    }

    const data: FixTweetResponse = await res.json();

    if (data.code && data.code !== 200) {
      return { error: data.message || 'Unable to load profile' };
    }

    const user = data.user;
    if (user) {
      // Normalize avatar & banner URLs
      user.avatar_url = user.avatar_url || user.profile_image_url;
      user.banner_url = user.banner_url || user.profile_banner_url;
    }

    // FixTweet single user endpoint might return a recent tweet array if available
    const tweets = data.tweets || (data.tweet ? [data.tweet] : []);

    return { user, tweets };
  } catch (e: any) {
    console.error('fetchFixTweetProfile error:', e);
    return { error: 'Failed to connect to Twitter network' };
  }
}

export async function fetchFixTweetStatus(tweetId: string): Promise<{ tweet?: FixTweetObject; error?: string }> {
  if (!tweetId || !/^\d+$/.test(tweetId)) {
    return { error: 'Invalid tweet ID' };
  }

  try {
    const res = await fetch(`https://api.fxtwitter.com/status/${tweetId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MyTweetViewer/1.0',
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      return { error: 'Tweet not found or restricted' };
    }

    const data: FixTweetResponse = await res.json();
    return { tweet: data.tweet };
  } catch (e) {
    return { error: 'Failed to fetch tweet details' };
  }
}
