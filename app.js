(() => {
  const grid = document.getElementById("video-grid");
  const cfg = window.ZIRIGO_CONFIG || {};

  if (!grid) {
    console.error("ZIRIGO: video-grid element not found.");
    return;
  }

  function showMessage(message) {
    grid.innerHTML = `<p style="color:white;padding:20px">
      ${message}
    </p>`;
  }

  async function loadVideos() {
    showMessage("Connecting to YouTube…");

    if (!cfg.channelId || !cfg.youtubeApiKey) {
      showMessage("Configuration error: channel ID or API key is missing.");
      return;
    }

    try {
      const url = new URL(
        "https://www.googleapis.com/youtube/v3/search"
      );

      url.search = new URLSearchParams({
        part: "snippet",
        channelId: cfg.channelId,
        maxResults: "9",
        order: "date",
        type: "video",
        key: cfg.youtubeApiKey
      });

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok || data.error) {
        showMessage(
          "YouTube API error: " +
          (data.error?.message || response.status)
        );
        return;
      }

      if (!data.items || data.items.length === 0) {
        showMessage("No public videos found for this channel.");
        return;
      }

      grid.innerHTML = data.items.map(video => {
        const id = video.id.videoId;
        const title = video.snippet.title.replace(
          /[&<>"']/g,
          char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
          })[char]
        );

        const thumbnail =
          video.snippet.thumbnails.high?.url ||
          video.snippet.thumbnails.medium?.url ||
          video.snippet.thumbnails.default?.url;

        return `
          <article class="video-card">
            <a class="video-thumb"
               href="https://www.youtube.com/watch?v=${id}"
               target="_blank"
               rel="noopener noreferrer">
              <img src="${thumbnail}" alt="${title}" loading="lazy">
              <span class="play">▶</span>
            </a>
            <div class="video-info">
              <h3>${title}</h3>
              <p>Watch on YouTube ↗</p>
            </div>
          </article>
        `;
      }).join("");

    } catch (error) {
      console.error("ZIRIGO video error:", error);
      showMessage(
        "Could not connect to YouTube. Check your internet connection and API settings."
      );
    }
  }

  loadVideos();
})();
