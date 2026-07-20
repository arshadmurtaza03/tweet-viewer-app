// Client-side Favorites Manager (Zero-Database LocalStorage)
(function () {
  const STORAGE_KEY = 'mtv_favorites';

  window.MTV_Favorites = {
    getAll: function () {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      } catch (e) {
        return [];
      }
    },
    has: function (username) {
      const all = this.getAll();
      return all.some(function (item) {
        return item.username === username;
      });
    },
    add: function (profile) {
      if (!profile || !profile.username) return;
      const all = this.getAll();
      if (!this.has(profile.username)) {
        all.unshift(profile);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
        window.dispatchEvent(new Event('favorites-updated'));
      }
    },
    remove: function (username) {
      const all = this.getAll();
      const filtered = all.filter(function (item) {
        return item.username !== username;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      window.dispatchEvent(new Event('favorites-updated'));
    },
    toggle: function (profile) {
      if (this.has(profile.username)) {
        this.remove(profile.username);
        return false;
      } else {
        this.add(profile);
        return true;
      }
    },
  };
})();
