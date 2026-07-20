// Client-Side Search Parser & History Manager
(function () {
  const RECENT_KEY = 'mtv_recent_searches';

  window.MTV_Search = {
    getRecent: function () {
      try {
        return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      } catch (e) {
        return [];
      }
    },
    saveRecent: function (query) {
      if (!query) return;
      const recent = this.getRecent();
      const updated = [query, ...recent.filter(i => i !== query)].slice(0, 10);
      localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('recent-searches-updated'));
    },
    clearRecent: function () {
      localStorage.removeItem(RECENT_KEY);
      window.dispatchEvent(new Event('recent-searches-updated'));
    },
    parseUrlOrHandle: function (input) {
      if (!input) return null;
      const trimmed = input.trim();

      // Tweet URL match
      const statusMatch = trimmed.match(/(?:twitter|x)\.com\/[^\/]+\/status\/(\d+)/i);
      if (statusMatch && statusMatch[1]) {
        return { type: 'status', id: statusMatch[1], raw: trimmed };
      }

      // Profile URL match
      const profileMatch = trimmed.match(/(?:twitter|x)\.com\/([a-zA-Z0-9_]{1,15})/i);
      if (profileMatch && profileMatch[1]) {
        return { type: 'profile', username: profileMatch[1], raw: '@' + profileMatch[1] };
      }

      // Plain handle
      const cleanUser = trimmed.replace(/^@/, '').replace(/[^a-zA-Z0-9_]/g, '');
      if (cleanUser) {
        return { type: 'profile', username: cleanUser, raw: '@' + cleanUser };
      }

      return null;
    },
  };
})();
