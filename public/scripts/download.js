// Client-Side Direct Media Downloader
(function () {
  window.MTV_Downloader = {
    downloadMedia: async function (url, filename, extension) {
      if (!url) return;
      const ext = extension || 'jpg';
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Fetch failed');
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = (filename || 'x-media') + '.' + ext;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      } catch (e) {
        // Fallback for CORS: open asset in new window
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.download = (filename || 'x-media') + '.' + ext;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    },
  };
})();
