// Client-Side Direct Media Downloader
(function () {
  window.MTV_Downloader = {
    downloadMedia: async function (url, filename, extension) {
      if (!url) return;
      ext = extension || 'jpg';
      try {
        const response = await fetch(url);
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
        // Fallback for CORS
        window.open(url, '_blank');
      }
    },
  };
})();
