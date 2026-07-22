export function formatNumber(num?: number): string {
  if (num === undefined || num === null || isNaN(num)) return '0';
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toLocaleString();
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;

    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffSeconds < 60) return `${diffSeconds}s`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h`;
    if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d`;

    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  } catch (e) {
    return dateString;
  }
}

export function formatTweetText(text?: string, hasMedia: boolean = false): string {
  if (!text) return '';

  let cleaned = text;
  if (hasMedia) {
    // Strip trailing t.co media attachment link so raw t.co links don't clutter tweet text
    cleaned = cleaned.replace(/\s*https:\/\/t\.co\/[a-zA-Z0-9]+$/i, '');
  }

  // Sanitize raw text to prevent XSS
  let escaped = cleaned
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // Convert URLs to clickable links
  escaped = escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-link hover:underline">$1</a>'
  );

  // Convert @username to profile link
  escaped = escaped.replace(
    /(^|[^a-zA-Z0-9_])@([a-zA-Z0-9_]{1,15})/g,
    '$1<a href="/$2" class="text-link hover:underline font-medium">@$2</a>'
  );

  // Convert #hashtag to search link
  escaped = escaped.replace(
    /(^|[^a-zA-Z0-9_])#([a-zA-Z0-9_]+)/g,
    '$1<a href="https://x.com/hashtag/$2" target="_blank" rel="noopener noreferrer" class="text-link hover:underline">#$2</a>'
  );

  return escaped.replace(/\n/g, '<br/>');
}
