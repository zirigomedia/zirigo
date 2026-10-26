(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const grid = $("video-grid");
  const cfg = window.ZIRIGO_CONFIG || {};
  const supaCfg = window.ZIRIGO_SUPABASE || {};

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function youtubeId(input) {
    if (!input) return "";

    const value = String(input).trim();

    if (/^[\w-]{11}$/.test(value)) return value;

    try {
      const url = new URL(value);

      if (url.hostname.includes("youtu.be")) {
        return url.pathname.split("/").filter(Boolean)[0] || "";
      }

      if (url.searchParams.get("v")) {
        return url.searchParams.get("v");
      }

      const parts = url.pathname.split("/").filter(Boolean);
      const index = parts.findIndex(part =>
        ["embed", "shorts", "live"].includes(part)
      );

      if (index >= 0) return parts[index + 1] || "";
    } catch (_) {}

    return "";
  }

  /*
   * SAMPLE PROMOTIONS
   * These are fictional examples, not actual ZIRIGO releases.
   * They appear only when no active Supabase promotions are available.
   */
  const samplePromotions = [
    {
      id: "sample-1",
      title: "The Last Village",
      description: "When a peaceful village is threatened, one young person must choose between personal dreams and the people they love.",
      poster_url: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1400&q=85",
      trailer_url: "",
      status: "Coming Soon",
      sample: true
    },
    {
      id: "sample-2",
      title: "Silent Scars",
      description: "A family tries to rebuild trust after a secret from the past changes everything.",
      poster_url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=85",
      trailer_url: "",
      status: "Coming Soon",
      sample: true
    },
    {
      id: "sample-3",
      title: "The Return",
      description: "A homecoming forces a young man to face the truth he left behind.",
      poster_url: "https://images.unsplash.com/photo-1500534623283-312aadecee9b?auto=format&fit=crop&w=1400&q=85",
      trailer_url: "",
      status: "Coming Soon",
      sample: true
    },
    {
      id: "sample-4",
      title: "Beyond the River",
      description: "On the other side of the river lies a choice that could change an entire community.",
      poster_url: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1400&q=85",
      trailer_url: "",
      status: "Coming Soon",
      sample: true
    },
    {
      id: "sample-5",
      title: "Broken Dreams",
      description: "Two people discover that hope can survive even the hardest seasons.",
      poster_url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1400&q=85",
      trailer_url: "",
      status: "Coming Soon",
      sample: true
    },
    {
      id: "sample-6",
      title: "The Journey",
      description: "A journey away from home becomes a journey toward understanding.",
      poster_url: "https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=1400&q=85",
      trailer_url: "",
      status: "Coming Soon",
      sample: true
    },
    {
      id: "sample-7",
      title: "Family Bonds",
      description: "A family learns what it means to stand together when everything is at stake.",
      poster_url: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1400&q=85",
      trailer_url: "",
      status: "Coming Soon",
      sample: true
    }
  ];

  // Shared YouTube player used by the catalogue and billboard.
  const player = document.createElement("div");
  player.id = "zirigo-player";
  player.style.cssText = `
    display:none;
    position:fixed;
    inset:0;
    z-index:99999;
    background:rgba(0,0,0,.97);
    padding:12px;
    align-items:center;
    justify-content:center;
    box-sizing:border-box;
  `;

  player.innerHTML = `
    <div class="zirigo-player-shell">
      <div class="zirigo-player-toolbar">
        <button id="zirigo-player-fullscreen" type="button">⛶ Fullscreen</button>
        <button id="zirigo-player-close" type="button" aria-label="Close video player">✕ Close</button>
      </div>

      <div class="zirigo-player-screen">
        <iframe
          id="zirigo-player-frame"
          title="ZIRIGO video player"
          src=""
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowfullscreen
          referrerpolicy="strict-origin-when-cross-origin">
        </iframe>
      </div>

      <p class="zirigo-player-title" id="zirigo-player-title"></p>
    </div>
  `;

  document.body.appendChild(player);

  const frame = $("zirigo-player-frame");
  const closeButton = $("zirigo-player-close");
  const fullButton = $("zirigo-player-fullscreen");
  const playerTitle = $("zirigo-player-title");

  function openPlayer(input, title) {
    const id = youtubeId(input);

    if (!id) {
      alert("A valid YouTube video link has not been added to this promotion yet.");
      return;
    }

    frame.src =
      "https://www.youtube-nocookie.com/embed/" +
      encodeURIComponent(id) +
      "?autoplay=1&rel=0&playsinline=1";

    playerTitle.textContent = title || "ZIRIGO";
    player.style.display = "flex";
    document.body.style.overflow = "hidden";
    closeButton.focus();
  }

  async function closePlayer() {
    if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch (_) {}
    }

    frame.src = "";
    player.style.display = "none";
    document.body.style.overflow = "";
  }

  closeButton.addEventListener("click", closePlayer);

  player.addEventListener("click", event => {
    if (event.target === player) closePlayer();
  });

  document.addEventListener("keydown", event => {
    if (
      event.key === "Escape" &&
      player.style.display !== "none" &&
      !document.fullscreenElement
    ) {
      closePlayer();
    }
  });

  fullButton.addEventListener("click", async () => {
try {
// Enter fullscreen mode
if (!document.fullscreenElement) {
if (player.requestFullscreen) {
await player.requestFullscreen();
} else if (player.webkitRequestFullscreen) {
player.webkitRequestFullscreen();
} else {
alert("Fullscreen isn't supported here. Please use YouTube's fullscreen button.");
return;
}
}

// Request landscape orientation where supported
if (screen.orientation && screen.orientation.lock) {
  try {
    await screen.orientation.lock("landscape");
  } catch (_) {
    // Some mobile browsers don't allow websites to lock orientation.
    // Users can enable Auto-rotate on their phones.
  }
}

} catch (_) {
alert("Please use YouTube's fullscreen button and enable Auto-rotate on your phone.");
}
});

// Restore normal orientation when leaving fullscreen
document.addEventListener("fullscreenchange", async () => {
if (!document.fullscreenElement && screen.orientation && screen.orientation.unlock) {
try {
screen.orientation.unlock();
} catch (_) {
// Orientation unlocking isn't supported in every browser.
}
}
});

  // Billboard elements.
  const backdrop = $("featured-backdrop");
  const titleEl = $("featured-title");
  const descriptionEl = $("featured-description");
  const statusEl = $("featured-status");
  const noteEl = $("featured-note");
  const rail = $("poster-rail");
  const watchButton = $("featured-watch");
  const trailerButton = $("featured-trailer");
  const detailsButton = $("featured-details");

  let promotions = samplePromotions;
  let currentIndex = 0;
  let rotationTimer = null;

  // Film details dialog.
  const detailsModal = document.createElement("div");
  detailsModal.className = "featured-details";
  detailsModal.innerHTML = `
    <div class="featured-details-card" role="dialog" aria-modal="true"
         aria-labelledby="featured-detail-title">
      <button class="featured-details-close" type="button"
              aria-label="Close details">×</button>
      <h2 id="featured-detail-title"></h2>
      <p id="featured-detail-description"></p>
      <p id="featured-detail-meta"></p>
    </div>
  `;
  document.body.appendChild(detailsModal);

  detailsModal.querySelector(".featured-details-close")
    .addEventListener("click", () => detailsModal.classList.remove("is-open"));

  detailsModal.addEventListener("click", event => {
    if (event.target === detailsModal) {
      detailsModal.classList.remove("is-open");
    }
  });

  function posterFor(promo) {
    return promo.poster_url || samplePromotions[0].poster_url;
  }

  function currentPromo() {
    return promotions[currentIndex];
  }

  function renderFeatured() {
    if (!promotions.length) return;

    const promo = currentPromo();
    const poster = posterFor(promo);

    backdrop.style.backgroundImage =
      `url("${poster.replace(/["\\]/g, "")}")`;

    titleEl.textContent = promo.title || "Featured film";
    descriptionEl.textContent =
      promo.description || "Discover this story from ZIRIGO.";

    statusEl.textContent =
      promo.status === "Now Available" ? "NOW AVAILABLE" : "COMING SOON";

    noteEl.textContent = promo.sample
      ? "Sample promotion preview. Add your own films through the ZIRIGO admin dashboard."
      : promo.status === "Now Available"
        ? "Available to watch through ZIRIGO's embedded player."
        : "This title has not been marked as available yet.";

    watchButton.textContent =
      promo.status === "Now Available" ? "▶ WATCH FILM" : "COMING SOON";

    watchButton.disabled = promo.status !== "Now Available";

    trailerButton.disabled = !youtubeId(promo.trailer_url);

    rail.querySelectorAll(".poster-tile").forEach((tile, index) => {
      tile.classList.toggle("is-active", index === currentIndex);
      tile.setAttribute(
        "aria-pressed",
        index === currentIndex ? "true" : "false"
      );
    });
  }

  function renderRail() {
    rail.innerHTML = promotions.map((promo, index) => `
      <button
        type="button"
        class="poster-tile ${index === currentIndex ? "is-active" : ""}"
        data-promo-index="${index}"
        aria-pressed="${index === currentIndex}"
        aria-label="Feature ${escapeHTML(promo.title)}">
        <img src="${escapeHTML(posterFor(promo))}" alt="" loading="lazy">
        <span>${escapeHTML(promo.title || "Featured film")}</span>
      </button>
    `).join("");

    rail.querySelectorAll(".poster-tile").forEach(tile => {
      tile.addEventListener("click", () => {
        currentIndex = Number(tile.dataset.promoIndex);
        renderFeatured();
        restartRotation();
      });
    });
  }

  function selectPromo(index) {
    if (!promotions.length) return;

    currentIndex = (index + promotions.length) % promotions.length;
    renderFeatured();
  }

  function restartRotation() {
    if (rotationTimer) clearInterval(rotationTimer);

    if (promotions.length > 1) {
      rotationTimer = setInterval(() => {
        selectPromo(currentIndex + 1);
      }, 7000);
    }
  }

  $("featured-prev").addEventListener("click", () => {
    selectPromo(currentIndex - 1);
    restartRotation();
  });

  $("featured-next").addEventListener("click", () => {
    selectPromo(currentIndex + 1);
    restartRotation();
  });

  watchButton.addEventListener("click", () => {
    const promo = currentPromo();

    if (promo.status !== "Now Available") return;

    // The current database schema uses trailer_url as the available video URL.
    openPlayer(promo.trailer_url, promo.title);
  });

  trailerButton.addEventListener("click", () => {
    const promo = currentPromo();

    if (youtubeId(promo.trailer_url)) {
      openPlayer(promo.trailer_url, `${promo.title} — Trailer`);
    }
  });

  detailsButton.addEventListener("click", () => {
    const promo = currentPromo();

    $("featured-detail-title").textContent = promo.title || "Film details";
    $("featured-detail-description").textContent =
      promo.description || "More details will be announced soon.";

    $("featured-detail-meta").textContent =
      `${promo.status || "Coming Soon"}` +
      (promo.release_date ? ` • Release date: ${promo.release_date}` : "");

    detailsModal.classList.add("is-open");
  });

  async function loadPromotions() {
    if (
      !supaCfg.url ||
      !supaCfg.publishableKey ||
      !window.supabase?.createClient
    ) {
      renderRail();
      renderFeatured();
      restartRotation();
      return;
    }

    try {
      const client = window.supabase.createClient(
        supaCfg.url,
        supaCfg.publishableKey
      );

      const { data, error } = await client
        .from("promotions")
        .select("id,title,description,poster_url,trailer_url,release_date,status,is_active,sort_order,created_at")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;

      promotions = data && data.length ? data : samplePromotions;
    } catch (error) {
      console.warn("Could not load Supabase promotions; showing samples.", error);
      promotions = samplePromotions;
    }

    currentIndex = 0;
    renderRail();
    renderFeatured();
    restartRotation();
  }

  // Latest releases from the YouTube Data API.
  function showMessage(message) {
    if (grid) {
      grid.innerHTML = `<p style="color:white;padding:20px">${escapeHTML(message)}</p>`;
    }
  }

  async function loadVideos() {
    if (!grid) return;

    showMessage("Loading ZIRIGO films…");

    if (!cfg.channelId || !cfg.youtubeApiKey) {
      showMessage("Configuration error: channel ID or API key is missing.");
      return;
    }

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
        showMessage(
          "YouTube API error: " + (data.error?.message || response.status)
        );
        return;
      }

      if (!data.items || !data.items.length) {
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
              aria-label="Play ${title}">
              <img src="${escapeHTML(thumbnail)}" alt="${title}" loading="lazy">
              <span class="play" aria-hidden="true">▶</span>
            </button>
            <div class="video-info">
              <h3>${title}</h3>
              <p>▶ Watch on ZIRIGO</p>
            </div>
          </article>
        `;
      }).join("");

      grid.querySelectorAll(".zirigo-watch-button").forEach(button => {
        button.addEventListener("click", () => {
          openPlayer(button.dataset.videoId, button.dataset.videoTitle);
        });
      });
    } catch (error) {
      console.error("ZIRIGO video error:", error);
      showMessage("Could not connect to YouTube. Check your connection and API settings.");
    }
  }

  const year = $("year");
  if (year) year.textContent = new Date().getFullYear();

  renderRail();
  renderFeatured();
  restartRotation();
  loadPromotions();
  loadVideos();
})();
