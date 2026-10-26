(() => {
  const grid = document.getElementById("video-grid");
  const cfg = window.ZIRIGO_CONFIG || {};

  if (!grid) {
    console.error("ZIRIGO: video-grid element not found.");
    return;
  }

  // Safely display text in HTML.
  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function showMessage(message) {
    grid.innerHTML = `
      <p style="color:white;padding:20px">
        ${escapeHTML(message)}
      </p>
    `;
  }

  // Create the streaming player.
  const player = document.createElement("div");

  player.id = "zirigo-player";
  player.style.cssText = `
    display:none;
    position:fixed;
    inset:0;
    z-index:99999;
    background:rgba(0,0,0,0.94);
    padding:20px;
    align-items:center;
    justify-content:center;
    box-sizing:border-box;
  `;

  player.innerHTML = `
    <div style="
      position:relative;
      width:100%;
      max-width:1000px;
      margin:auto;
    ">
      <button
        id="zirigo-player-close"
        type="button"
        aria-label="Close video player"
        style="
          display:block;
          margin:0 0 12px auto;
          border:1px solid #d4af37;
          background:#111;
          color:#d4af37;
          font-size:24px;
          width:44px;
          height:44px;
          border-radius:50%;
          cursor:pointer;
        "
      >×</button>

      <div style="
        position:relative;
        width:100%;
        aspect-ratio:16 / 9;
        background:#000;
        box-shadow:0 0 30px rgba(212,175,55,0.18);
      ">
        <iframe
          id="zirigo-player-frame"
          title="ZIRIGO video player"
          src=""
          style="
            position:absolute;
            inset:0;
            width:100%;
            height:100%;
            border:0;
          "
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowfullscreen
          referrerpolicy="strict-origin-when-cross-origin"
        ></iframe>
      </div>

      <p
        id="zirigo-player-title"
        style="
          color:#d4af37;
          font-size:18px;
          margin:14px 0;
          text-align:center;
        "
      ></p>
    </div>
  `;

  document.body.appendChild(player);

  const frame = document.getElementById("zirigo-player-frame");
  const closeButton = document.getElementById("zirigo-player-close");
  const playerTitle = document.getElementById("zirigo-player-title");

  function openPlayer(videoId, title) {
    // Use YouTube's privacy-enhanced embedded player.
    frame.src =
      "https://www.youtube-nocookie.com/embed/" +
      encodeURIComponent(videoId) +
      "?autoplay=1&rel=0";

    playerTitle.textContent = title;

    player.style.display = "flex";
    document.body.style.overflow = "hidden";

    closeButton.focus();
  }

  function closePlayer() {
    // Clearing the iframe stops the video.
    frame.src = "";
    player.style.display = "none";
    document.body.style.overflow = "";
  }

  closeButton.addEventListener("click", closePlayer);

  // Close when the visitor taps outside the player.
  player.addEventListener("click", event => {
    if (event.target === player) {
      closePlayer();
    }
  });

  // Close with the Escape key.
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && player.style.display !== "none") {
      closePlayer();
    }
  });

  async function loadVideos() {
    showMessage("Loading ZIRIGO films…");

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
        const title = escapeHTML(video.snippet.title);

        const thumbnail =
          video.snippet.thumbnails.high?.url ||
          video.snippet.thumbnails.medium?.url ||
          video.snippet.thumbnails.default?.url;

        return `
          <article class="video-card">
            <button
              class="video-thumb zirigo-watch-button"
              type="button"
              data-video-id="${escapeHTML(id)}"
              data-video-title="${title}"
              aria-label="Play ${title}"
              style="
                display:block;
                width:100%;
                position:relative;
                padding:0;
                border:0;
                background:#000;
                cursor:pointer;
                text-align:left;
              "
            >
              <img
                src="${escapeHTML(thumbnail)}"
                alt="${title}"
                loading="lazy"
                style="display:block;width:100%;height:auto;"
              >
              <span
                class="play"
                aria-hidden="true"
              >▶</span>
            </button>

            <div class="video-info">
              <h3>${title}</h3>
              <p>▶ Watch on ZIRIGO</p>
            </div>
          </article>
        `;
      }).join("");

      // Clicking a film opens the player on this website.
      grid.querySelectorAll(".zirigo-watch-button").forEach(button => {
        button.addEventListener("click", () => {
          openPlayer(
            button.dataset.videoId,
            button.dataset.videoTitle
          );
        });
      });

    } catch (error) {
      console.error("ZIRIGO video error:", error);

      showMessage(
        "Could not connect to YouTube. Check your internet connection and API settings."
      );
    }
  }

  loadVideos();
})();
