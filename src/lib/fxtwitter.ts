import type { FixTweetResponse, FixTweetUser, FixTweetObject } from './types';
import { fetchSyndicationTimeline } from './syndication';

export async function fetchFixTweetProfile(
  username: string,
  cursor?: string
): Promise<{ user?: FixTweetUser; tweets?: FixTweetObject[]; bottom_cursor?: string; error?: string }> {
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

    // 2. Fetch Timeline Tweets from Twitter Syndication Profile API
    let { tweets: parsedTweets, bottom_cursor } = await fetchSyndicationTimeline(cleanUser, cursor);

    let finalTweets: any[] = parsedTweets.length > 0 ? parsedTweets : (data.tweets || (data.tweet ? [data.tweet] : []));

    // Sort finalTweets by Snowflake Tweet ID descending (newest first)
    finalTweets.sort((a, b) => {
      try {
        const bId = BigInt(b.id);
        const aId = BigInt(a.id);
        return bId > aId ? 1 : bId < aId ? -1 : 0;
      } catch {
        return 0;
      }
    });

    // 3. Media Hydration Pass: If any tweets lack media photos/videos, hydrate via status API in parallel
    if (finalTweets.length > 0) {
      const needsHydration = finalTweets.filter(t => !t.media?.photos?.length && !t.media?.videos?.length);
      if (needsHydration.length > 0) {
        await Promise.all(needsHydration.slice(0, 10).map(async (t) => {
          try {
            const statusRes = await fetch(`https://api.fxtwitter.com/${cleanUser}/status/${t.id}`, {
              headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }
            });
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              if (statusData.tweet?.media) {
                t.media = statusData.tweet.media;
              }
            }
          } catch {
            // Ignore failure
          }
        }));
      }
    }

    return { user, tweets: finalTweets, bottom_cursor };
  } catch (e: any) {
    console.error('fetchFixTweetProfile error:', e);
    return { error: 'Failed to connect to Twitter network' };
  }
}

export async function fetchTimelinePage(
  username: string,
  cursor: string
): Promise<{ tweets: FixTweetObject[]; bottom_cursor?: string; error?: string }> {
  const cleanUser = username.trim().replace(/^@/, '');
  if (!cleanUser || !/^[a-zA-Z0-9_]{1,15}$/.test(cleanUser)) {
    return { tweets: [], error: 'Invalid username format' };
  }

  let { tweets, bottom_cursor, error } = await fetchSyndicationTimeline(cleanUser, cursor);

  if (tweets && tweets.length > 0) {
    tweets.sort((a: any, b: any) => {
      try {
        const bId = BigInt(b.id);
        const aId = BigInt(a.id);
        return bId > aId ? 1 : bId < aId ? -1 : 0;
      } catch {
        return 0;
      }
    });

    const needsHydration = tweets.filter(t => !t.media?.photos?.length && !t.media?.videos?.length);
    if (needsHydration.length > 0) {
      await Promise.all(needsHydration.slice(0, 10).map(async (t) => {
        try {
          const statusRes = await fetch(`https://api.fxtwitter.com/${cleanUser}/status/${t.id}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }
          });
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.tweet?.media) {
              t.media = statusData.tweet.media;
            }
          }
        } catch {
          // Ignore failure
        }
      }));
    }
  }

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

    if (res.ok) {
      const data: FixTweetResponse = await res.json();
      if (data.tweet) {
        if (data.tweet.author) {
          data.tweet.author.avatar_url = data.tweet.author.avatar_url || data.tweet.author.profile_image_url;
        }
        return { tweet: data.tweet };
      }
    }

    const reactRes = await fetch(`https://react-tweet.vercel.app/api/tweet/${tweetId}`);
    if (reactRes.ok) {
      const reactData = await reactRes.json();
      if (reactData.data) {
        const raw = reactData.data;
        const photos = (raw.photos || []).map((p: any) => ({ url: p.url }));
        const videos = raw.video ? [{
          url: raw.video.variants?.find((v: any) => v.content_type === 'video/mp4')?.url || raw.video.poster,
          thumbnail_url: raw.video.poster
        }] : undefined;

        return {
          tweet: {
            id: raw.id_str,
            text: raw.text,
            created_at: raw.created_at,
            author: {
              name: raw.user?.name || '',
              screen_name: raw.user?.screen_name || '',
              avatar_url: raw.user?.profile_image_url_https,
            },
            likes: raw.favorite_count,
            retweets: raw.retweet_count,
            media: {
              photos: photos.length > 0 ? photos : undefined,
              videos: videos && videos.length > 0 ? videos : undefined,
            }
          }
        };
      }
    }

    return { error: 'Tweet unavailable' };
  } catch (e) {
    return { error: 'Failed to fetch tweet details' };
  }
}
