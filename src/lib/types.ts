export interface FixTweetUser {
  id?: string;
  name: string;
  screen_name: string;
  description?: string;
  location?: string;
  url?: string;
  protected?: boolean;
  // Normalized & raw metric fields
  followers?: number;
  following?: number;
  tweets?: number;
  likes?: number;
  followers_count?: number;
  following_count?: number;
  friends_count?: number;
  statuses_count?: number;
  likes_count?: number;
  media_count?: number;
  avatar_url?: string;
  banner_url?: string;
  profile_image_url?: string;
  profile_banner_url?: string;
  joined?: string;
  created_at?: string;
  website?: {
    url?: string;
    display_url?: string;
  };
  verification?: {
    verified?: boolean;
    type?: string;
  };
}

export interface FixTweetMedia {
  type: 'photo' | 'video' | 'gif';
  url: string;
  thumbnail_url?: string;
  hls_url?: string;
  width?: number;
  height?: number;
  duration?: number;
  format?: string;
}

export interface FixTweetObject {
  id: string;
  text: string;
  created_at: string;
  created_timestamp?: number;
  author: FixTweetUser;
  reposted_by?: {
    name: string;
    screen_name: string;
    avatar_url?: string;
  } | null;
  replies?: number;
  retweets?: number;
  likes?: number;
  views?: number;
  media?: {
    photos?: FixTweetMedia[];
    videos?: FixTweetMedia[];
    all?: FixTweetMedia[];
  };
  quote?: FixTweetObject;
  replying_to?: {
    screen_name?: string;
    post_id?: string;
  } | null;
}

export interface FixTweetResponse {
  code: number;
  message: string;
  user?: FixTweetUser;
  tweet?: FixTweetObject;
  tweets?: FixTweetObject[];
}

export interface SyndicationPhoto {
  media_url_https: string;
  sizes?: {
    large?: { w: number; h: number };
    medium?: { w: number; h: number };
    small?: { w: number; h: number };
  };
}

export interface SyndicationVideoVariant {
  content_type: string;
  url: string;
  bitrate?: number;
}

export interface SyndicationVideo {
  aspectRatio?: [number, number];
  contentType?: string;
  variants: SyndicationVideoVariant[];
}

export interface SyndicationMedia {
  id_str: string;
  media_url_https: string;
  type: 'photo' | 'video' | 'animated_gif';
  display_url?: string;
  expanded_url?: string;
  video_info?: {
    variants: SyndicationVideoVariant[];
  };
}

export interface SyndicationTweet {
  __typename?: string;
  id_str: string;
  text: string;
  created_at: string;
  favorite_count?: number;
  conversation_count?: number;
  reply_count?: number;
  retweet_count?: number;
  lang?: string;
  user: {
    id_str?: string;
    name: string;
    screen_name: string;
    profile_image_url_https: string;
    is_blue_verified?: boolean;
    verified?: boolean;
  };
  photos?: SyndicationPhoto[];
  video?: SyndicationVideo;
  mediaDetails?: SyndicationMedia[];
  parent?: SyndicationTweet;
  quoted_tweet?: SyndicationTweet;
  in_reply_to_screen_name?: string;
  in_reply_to_status_id_str?: string;
  tombstone?: boolean;
  notFound?: boolean;
}
