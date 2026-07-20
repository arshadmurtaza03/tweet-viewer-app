// Client-Side Tweet Data Exporter (Markdown & JSON)
(function () {
  window.MTV_Exporter = {
    exportMarkdown: function (tweetData) {
      if (!tweetData) return;
      const text = tweetData.text || '';
      const author = tweetData.author || tweetData.user || {};
      const md = `# Tweet by ${author.name || 'User'} (@${author.screen_name || 'username'})

${text}

---
- **Author:** ${author.name} (@${author.screen_name})
- **Tweet ID:** ${tweetData.id || tweetData.id_str}
- **Date:** ${tweetData.created_at}

*Exported anonymously via My Tweet Viewer (mytweetviewer.com)*
`;
      this.triggerDownload(md, `tweet-${tweetData.id || tweetData.id_str}.md`, 'text/markdown;charset=utf-8');
    },
    exportJSON: function (tweetData) {
      if (!tweetData) return;
      this.triggerDownload(JSON.stringify(tweetData, null, 2), `tweet-${tweetData.id || tweetData.id_str}.json`, 'application/json');
    },
    triggerDownload: function (content, filename, contentType) {
      const blob = new Blob([content], { type: contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  };
})();
