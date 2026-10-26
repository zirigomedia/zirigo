(() => {
const cfg = window.ZIRIGO_CONFIG || {};
const grid = document.getElementById("video-grid");
const status = document.getElementById("video-status");
const year = document.getElementById("year");

if (year) year.textContent = new Date().getFullYear();

function safeText(value) {
return String(value || "").replace(/[&<>"']/g, c => ({
"&": "&",
"<": "<",
">": ">",
'"': """,
"'": "'"
}[c]));
}

function showStatus(message) {
if (status) {
status.hidden = false;
status.textContent = message;
}
}

function renderVideos(items) {
if (!grid || !items.length) return false;

grid.innerHTML = items.map(item => {
  const id = item.id?.videoId || item.snippet?.resourceId?.videoId;
  if (!id) return "";

  const title = item.snippet?.title || "ZIRIGO video";
  const thumbnails = item.snippet?.thumbnails || {};
  const thumb =
    thumbnails.high?.url ||
    thumbnails.medium?.url ||
    thumbnails.default?.url ||
    "";

  const date = item.snippet?.publishedAt
    ? new Date(item.snippet.publishedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
      })
    : "";

  return `<article class="video-card">
    <a class="video-thumb"
       href="https://www.youtube.com/watch?v=${encodeURIComponent(id)}"
       target="_blank" rel="noopener">
      <img loading="lazy" src="${safeText(thumb)}" alt="${safeText(title)}">
      <span class="play" aria-hidden="true">▶</span>
    </a>
    <div class="video-info">
      <h3>${safeText(title)}</h3>
      <p>${safeText(date)} · Watch on YouTube ↗</p>
    </div>
  </article>`;
}).join("");

return true;

}

async function loadUploads() {
if (!grid || !status) return;

if (!cfg.channelId || !cfg.youtubeApiKey) {
  showStatus("Configuration missing: check the channel ID and API key in config.js.");
  return;
}

showStatus("Loading the latest ZIRIGO releases…");

try {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
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
    const apiMessage = data.error?.message || `HTTP ${response.status}`;
    console.error("YouTube API error:", data.error || apiMessage);
    showStatus(`YouTube connection failed: ${apiMessage}`);
    return;
  }

  if (!Array.isArray(data.items) || data.items.length === 0) {
    showStatus("YouTube responded, but no public videos were found. Check the channel ID and channel uploads.");
    return;
  }

  if (renderVideos(data.items)) {
    status.hidden = true;
  } else {
    showStatus("YouTube returned videos, but they could not be displayed.");
  }
} catch (error) {
  console.error("ZIRIGO video loading error:", error);
  showStatus("The website couldn't contact YouTube. Please check your internet connection and try again.");
}

}

loadUploads();

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
window.addEventListener("load", () => {
navigator.serviceWorker.register("./service-worker.js").catch(error => {
console.warn("Service worker registration failed:", error);
});
});
}
})();
