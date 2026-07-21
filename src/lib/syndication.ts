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

/**
 * Fetch a paginated timeline from Twitter Syndication with cursor support.
 * Returns tweets and a bottom_cursor token for "Load More" pagination.
 */
export async function fetchSyndicationTimeline(
  username: string,
  cursor?: string
): Promise<{ tweets: any[]; bottom_cursor?: string; error?: string }> {
  const cleanUser = username.trim().replace(/^@/, '');
  if (!cleanUser || !/^[a-zA-Z0-9_]{1,15}$/.test(cleanUser)) {
    return { tweets: [], error: 'Invalid username format' };
  }

  try {
    let url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${cleanUser}`;
    if (cursor) {
      url += `?cursor=${encodeURIComponent(cursor)}`;
    }

    const timelineRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!timelineRes.ok) {
      return { tweets: [], error: `Syndication timeline error (${timelineRes.status})` };
    }

    const html = await timelineRes.text();
    const marker = '<script id="__NEXT_DATA__" type="application/json">';
    const startIndex = html.indexOf(marker);

    if (startIndex === -1) {
      return { tweets: [], error: 'Timeline data not found in response' };
    }

    const jsonStart = startIndex + marker.length;
    const jsonEnd = html.indexOf('</script>', jsonStart);
    if (jsonEnd === -1) {
      return { tweets: [], error: 'Malformed timeline response' };
    }

    const jsonStr = html.substring(jsonStart, jsonEnd);
    const timelineData = JSON.parse(jsonStr);
    const entries = timelineData.props?.pageProps?.timeline?.entries || [];

    const parsedTweets: any[] = [];
    let bottomCursor: string | undefined;

    for (const entry of entries) {
      // Capture cursor entries for pagination
      if (entry.type === 'cursor' && entry.entryId?.startsWith('cursor-bottom')) {
        bottomCursor = entry.content?.value || entry.content?.cursor?.value;
        continue;
      }

      if (entry.type === 'tweet' && entry.content?.tweet) {
        const t = entry.content.tweet;
        const mediaDetails = t.mediaDetails || [];
        const photos = mediaDetails
          .filter((m: any) => m.type === 'photo')
          .map((m: any) => ({ url: m.media_url_https }));

        const videos = mediaDetails
          .filter((m: any) => m.type === 'video' || m.type === 'animated_gif')
          .map((m: any) => {
            const mp4s = m.video_info?.variants?.filter((v: any) => v.content_type === 'video/mp4') || [];
            const bestVideo = mp4s.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
            // Collect all HLS streams
            const hlsVariants = m.video_info?.variants?.filter((v: any) => v.content_type === 'application/x-mpegURL') || [];
            return {
              url: bestVideo?.url || m.media_url_https,
              thumbnail_url: m.media_url_https,
              hls_url: hlsVariants[0]?.url || undefined,
            };
          });

        parsedTweets.push({
          id: t.id_str,
          text: t.full_text || t.text || '',
          created_at: t.created_at,
          author: {
            name: t.user?.name || username,
            screen_name: t.user?.screen_name || username,
            avatar_url: t.user?.profile_image_url_https,
          },
          likes: t.favorite_count || 0,
          retweets: t.retweet_count || 0,
          replies: t.reply_count || t.conversation_count || 0,
          media: {
            photos: photos.length > 0 ? photos : undefined,
            videos: videos.length > 0 ? videos : undefined,
          },
          replying_to: t.in_reply_to_status_id_str ? {
            screen_name: t.in_reply_to_screen_name || '',
            post_id: t.in_reply_to_status_id_str,
          } : null,
        });
      }
    }

    return {
      tweets: parsedTweets,
      bottom_cursor: bottomCursor,
    };
  } catch (e: any) {
    console.error('fetchSyndicationTimeline error:', e);
    return { tweets: [], error: 'Failed to fetch timeline from Syndication' };
  }
}
