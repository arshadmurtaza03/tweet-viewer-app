export function buildProfileSeo(username: string, name?: string, bio?: string, avatar?: string) {
  const title = name ? `${name} (@${username}) — Tweets & Profile` : `@${username} — Twitter/X Profile`;
  const description = bio
    ? bio.slice(0, 155)
    : `Read tweets, view profile, and download media from @${username} anonymously without an account.`;
  const canonicalUrl = `https://mytweetviewer.com/${username}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    'name': name || username,
    'alternateName': `@${username}`,
    'description': description,
    'image': avatar,
    'mainEntity': {
      '@type': 'Person',
      'name': name || username,
      'alternateName': `@${username}`,
      'image': avatar,
      'description': bio,
    },
  };

  return { title, description, canonicalUrl, ogImage: avatar, jsonLd };
}

export function buildTweetSeo(tweetId: string, authorName: string, username: string, tweetText: string, mediaUrl?: string) {
  const snippet = tweetText ? tweetText.slice(0, 140).replace(/\n/g, ' ') : '';
  const title = `Tweet by ${authorName} (@${username}) | My Tweet Viewer`;
  const description = `"${snippet}…" — View tweet and download media anonymously on My Tweet Viewer.`;
  const canonicalUrl = `https://mytweetviewer.com/status/${tweetId}`;

  return { title, description, canonicalUrl, ogImage: mediaUrl };
}
