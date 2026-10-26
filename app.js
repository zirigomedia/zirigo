(() => {
  const cfg = window.ZIRIGO_CONFIG || {};
  const grid = document.getElementById("video-grid");
  const status = document.getElementById("video-status");
  document.getElementById("year").textContent = new Date().getFullYear();

  function safeText(value) {
    return String(value || "").replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[c]));
  }
  function renderVideos(items) {
    if (!items.length) return;
    status.hidden = true;
    grid.innerHTML = items.map(item => {
      const id = item.id?.videoId || item.snippet?.resourceId?.videoId;
      const title = item.snippet?.title || "ZIRIGO video";
      const thumb = item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || "";
      const date = item.snippet?.publishedAt ? new Date(item.snippet.publishedAt).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}) : "";
      if (!id) return "";
      return `<article class="video-card">
        <a class="video-thumb" href="https://www.youtube.com/watch?v=${encodeURIComponent(id)}" target="_blank" rel="noopener" aria-label="Watch ${safeText(title)} on YouTube">
          <img loading="lazy" src="${safeText(thumb)}" alt="${safeText(title)}">
          <span class="play" aria-hidden="true">▶</span>
        </a>
        <div class="video-info"><h3>${safeText(title)}</h3><p>${safeText(date)} · Watch on YouTube ↗</p></div>
      </article>`;
    }).join("");
  }
  async function loadUploads() {
    if (!cfg.channelId || !cfg.youtubeApiKey) {
      status.innerHTML = `Your video catalogue is ready to connect. Add the channel ID and YouTube Data API key in <code>config.js</code> to show recent public uploads automatically. Until then, use the YouTube buttons to visit the channel.`;
      return;
    }
    status.textContent = "Loading the latest ZIRIGO releases…";
    try {
      const url = new URL("https://www.googleapis.com/youtube/v3/search");
      url.search = new URLSearchParams({
        part:"snippet", channelId:cfg.channelId, maxResults:"9",
        order:"date", type:"video", key:cfg.youtubeApiKey
      });
      const response = await fetch(url);
      if (!response.ok) throw new Error("YouTube API returned " + response.status);
      const data = await response.json();
      renderVideos(data.items || []);
      if (!(data.items || []).length) status.textContent = "No public uploads were returned. Check the channel ID and API key in config.js.";
    } catch (err) {
      status.textContent = "We couldn't load videos automatically right now. Please use the YouTube channel link above, and check the API configuration when convenient.";
      console.error(err);
    }
  }
  loadUploads();

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(()=>{}));
  }
})();