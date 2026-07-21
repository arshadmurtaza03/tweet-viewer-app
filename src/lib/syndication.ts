import type { SyndicationTweet } from './types';

export interface ParsedTimelineResult {
  tweets: any[];
  bottom_cursor?: string;
  error?: string;
}

/**
 * Parses Twitter Syndication HTML payload (__NEXT_DATA__) into structured tweet objects with full media support.
 */
export function parseSyndicationHtml(html: string, fallbackUsername: string): ParsedTimelineResult {
  const marker = '<script id="__NEXT_DATA__" type="application/json">';
  const startIndex = html.indexOf(marker);

  if (startIndex === -1) {
    return { tweets: [], error: 'Timeline script not found' };
  }

  const jsonStart = startIndex + marker.length;
  const jsonEnd = html.indexOf('</' + 'script>', jsonStart);
  if (jsonEnd === -1) {
    return { tweets: [], error: 'Malformed timeline script' };
  }

  try {
    const jsonStr = html.substring(jsonStart, jsonEnd);
    const timelineData = JSON.parse(jsonStr);
    const entries = timelineData.props?.pageProps?.timeline?.entries || [];

    const parsedTweets: any[] = [];
    let bottomCursor: string | undefined;

    for (const entry of entries) {
      if (entry.type === 'cursor') {
        const cursorVal = entry.content?.value || entry.content?.cursor?.value;
        if (entry.entryId?.includes('bottom') || entry.content?.cursorType === 'Bottom') {
          bottomCursor = cursorVal;
        }
      }

      if (entry.type === 'tweet' && entry.content?.tweet) {
        const t = entry.content.tweet;
        const mediaDetails = t.mediaDetails || [];
        
        const photos = mediaDetails
          .filter((m: any) => m.type === 'photo')
          .map((m: any) => ({
            url: m.media_url_https || m.url,
            width: m.sizes?.large?.w || m.sizes?.medium?.w,
            height: m.sizes?.large?.h || m.sizes?.medium?.h,
          }));

        const videos = mediaDetails
          .filter((m: any) => m.type === 'video' || m.type === 'animated_gif')
          .map((m: any) => {
            const variants = m.video_info?.variants || [];
            const mp4s = variants.filter((v: any) => v.content_type === 'video/mp4');
            // Sort by bitrate descending to get highest quality MP4
            const bestMp4 = mp4s.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
            const hlsVariants = variants.filter((v: any) => v.content_type === 'application/x-mpegURL');
            
            return {
              url: bestMp4?.url || m.media_url_https,
              thumbnail_url: m.media_url_https,
              hls_url: hlsVariants[0]?.url || undefined,
              aspect_ratio: m.video_info?.aspect_ratio,
            };
          });

        parsedTweets.push({
          id: t.id_str,
          text: t.full_text || t.text || '',
          created_at: t.created_at,
          author: {
            name: t.user?.name || fallbackUsername,
            screen_name: t.user?.screen_name || fallbackUsername,
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

    // Fallback: If no explicit cursor entry was found, calculate max_id cursor from last tweet ID
    if (!bottomCursor && parsedTweets.length > 0) {
      const lastId = parsedTweets[parsedTweets.length - 1].id;
      try {
        bottomCursor = (BigInt(lastId) - 1n).toString();
      } catch {
        bottomCursor = lastId;
      }
    }

    return {
      tweets: parsedTweets,
      bottom_cursor: bottomCursor,
    };
  } catch (e: any) {
    return { tweets: [], error: 'Failed to parse JSON timeline data' };
  }
}

export async function fetchSyndicationTweet(tweetId: string): Promise<{ tweet?: SyndicationTweet; error?: string }> {
  if (!tweetId || !/^\d+$/.test(tweetId)) {
    return { error: 'Invalid tweet ID format' };
  }

  let token = '0';
  try {
    token = (BigInt(tweetId) / 1000000000000000n).toString(36);
  } catch (e) {}

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
 * Fetch a paginated timeline from Twitter Syndication.
 */
export async function fetchSyndicationTimeline(
  username: string,
  cursor?: string
): Promise<ParsedTimelineResult> {
  const cleanUser = username.trim().replace(/^@/, '');
  if (!cleanUser || !/^[a-zA-Z0-9_]{1,15}$/.test(cleanUser)) {
    return { tweets: [], error: 'Invalid username format' };
  }

  try {
    let url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${cleanUser}`;
    if (cursor) {
      url += `?cursor=${encodeURIComponent(cursor)}`;
    }

    const guestId = `v1%3A${Date.now()}${Math.floor(Math.random() * 1000000000)}`;

    const timelineRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': `guest_id=${guestId}; guest_id_marketing=${guestId}; guest_id_ads=${guestId}`,
        'Referer': 'https://platform.twitter.com/',
      },
    });

    if (!timelineRes.ok) {
      return { tweets: [], error: `Syndication timeline error (${timelineRes.status})` };
    }

    const html = await timelineRes.text();
    return parseSyndicationHtml(html, cleanUser);
  } catch (e: any) {
    console.error('fetchSyndicationTimeline error:', e);
    return { tweets: [], error: 'Failed to fetch timeline from Syndication' };
  }
}
