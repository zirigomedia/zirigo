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

  // Billboard promotions come only from the admin-managed Supabase table.
  const samplePromotions = [];

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
    title="ZIRIGO film player"
    src=""
    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
    allowfullscreen
    referrerpolicy="strict-origin-when-cross-origin">
  </iframe>

  <video
    id="zirigo-trailer-video"
    controls
    playsinline
    preload="metadata"
    style="display:none;width:100%;height:100%;object-fit:contain;background:#000">
  </video>
</div>
  `;

  document.body.appendChild(player);

  const frame = $("zirigo-player-frame");
  const trailerVideo = $("zirigo-trailer-video");
  const closeButton = $("zirigo-player-close");
  const fullButton = $("zirigo-player-fullscreen");
  const playerTitle = $("zirigo-player-title");

  function openPlayer(input, title) {
  const id = youtubeId(input);

  if (!id) {
    alert("This film does not have a valid YouTube video ID.");
    return;
  }

  trailerVideo.pause();
  trailerVideo.removeAttribute("src");
  trailerVideo.style.display = "none";
  frame.style.display = "block";

  frame.src =
    "https://www.youtube-nocookie.com/embed/" +
    encodeURIComponent(id) +
    "?autoplay=1&rel=0&playsinline=1";

  if (playerTitle) playerTitle.textContent = title || "ZIRIGO";
  player.style.display = "flex";
  document.body.style.overflow = "hidden";
  closeButton.focus();
}

  function openUploadedTrailer(url, title) {
  if (!url) {
    alert("A trailer has not been uploaded for this film yet.");
    return;
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(url);
  } catch (_) {
    alert("This trailer URL is invalid.");
    return;
  }

  if (parsedUrl.protocol !== "https:") {
    alert("The trailer must use a secure HTTPS URL.");
    return;
  }

  frame.src = "";
  frame.style.display = "none";

  trailerVideo.pause();
  trailerVideo.src = parsedUrl.href;
  trailerVideo.style.display = "block";
  trailerVideo.load();

  if (playerTitle) playerTitle.textContent = title ? `${title} — Trailer` : "ZIRIGO Trailer";
  player.style.display = "flex";
  document.body.style.overflow = "hidden";

  closeButton.focus();

  const playback = trailerVideo.play();

  if (playback && typeof playback.catch === "function") {
    playback.catch(() => {
      // The viewer can start playback using the video controls.
    });
  }
  }
  
  async function closePlayer() {
  if (document.fullscreenElement && document.exitFullscreen) {
    try {
      await document.exitFullscreen();
    } catch (_) {}
  }

  trailerVideo.pause();
  trailerVideo.removeAttribute("src");
  trailerVideo.load();
  trailerVideo.style.display = "none";

  frame.src = "";
  frame.style.display = "block";

  player.style.display = "none";
  document.body.style.overflow = "";
} 

  // Fix the player close button
closeButton.addEventListener("click", closePlayer);

// Close when tapping outside the video
player.addEventListener("click", event => {
  if (event.target === player) closePlayer();
});

// Close when pressing Escape
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && player.style.display !== "none") {
    closePlayer();
  }
});  
fullButton.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    if (player.requestFullscreen) {
      await player.requestFullscreen();
    } else if (player.webkitRequestFullscreen) {
      player.webkitRequestFullscreen();
    } else {
      alert("Fullscreen isn't supported here. Please use YouTube's fullscreen button.");
      return;
    }

  } catch (_) {
    alert("Please use YouTube's fullscreen button and enable Auto-rotate on your phone.");
  }
});


// Restore normal orientation when leaving fullscreen
document.addEventListener("fullscreenchange", () => {
  const isFullscreen = !!document.fullscreenElement;

  fullButton.textContent = isFullscreen
    ? "↙ Normal"
    : "⛶ Fullscreen";
});

  // Billboard elements.
  const backdrop = $("featured-backdrop");
  const titleEl = $("featured-title");
  const descriptionEl = $("featured-description");
  const statusEl = $("featured-status");
  const noteEl = $("featured-note");
  const rail = $("poster-rail");
  const trailerButton = $("featured-trailer");
  const detailsButton = $("featured-details");

  let promotions = [];
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
      <img id="featured-detail-poster" alt=""
           style="width:100%;max-height:300px;object-fit:contain;border-radius:8px;margin-bottom:16px;">
      <h2 id="featured-detail-title"></h2>
      <p id="featured-detail-tagline" style="color:#ffd15c;font-weight:600;"></p>
      <h3>About this film</h3>
      <p id="featured-detail-description"></p>
      <p id="featured-detail-meta"></p>
      <button id="featured-detail-trailer" class="button button-gold"
              type="button" style="display:none;">▶ Watch Trailer</button>
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

  function renderRail() {
    if (!rail) return;
    rail.innerHTML = "";

    if (!promotions.length) {
      rail.hidden = true;
      return;
    }

    rail.hidden = false;
    rail.innerHTML = promotions.map((promo, index) => `
      <button class="poster-tile ${index === currentIndex ? "is-active" : ""}"
              type="button" data-promotion-index="${index}"
              aria-label="Feature ${escapeHTML(promo.title || "film")}">
        <img src="${escapeHTML(promo.poster_url || "")}"
             alt="${escapeHTML(promo.title || "Film poster")}" loading="lazy">
        <span>${escapeHTML(promo.title || "Untitled")}</span>
      </button>
    `).join("");

    rail.querySelectorAll("[data-promotion-index]").forEach(button => {
      button.addEventListener("click", () => {
        currentIndex = Number(button.dataset.promotionIndex) || 0;
        renderRail();
        renderFeatured();
        restartRotation();
      });
    });
  }

  function renderFeatured() {
    const previous = $("featured-prev");
    const next = $("featured-next");

    if (!promotions.length) {
      if (backdrop) {
        backdrop.style.backgroundImage = "none";
        backdrop.style.backgroundColor = "#080808";
      }
      if (titleEl) titleEl.textContent = "Discover your next story";
      if (descriptionEl) descriptionEl.textContent =
        "Original stories from ZIRIGO. Our featured films will appear here.";
      if (statusEl) statusEl.textContent = "FEATURED ON ZIRIGO";
      if (noteEl) noteEl.textContent = "New promotions will appear here when you publish them in ZIRIGO Admin.";
      if (trailerButton) trailerButton.hidden = true;
      if (detailsButton) detailsButton.hidden = true;
      if (previous) previous.hidden = true;
      if (next) next.hidden = true;
      if (rail) rail.innerHTML = "";
      return;
    }

    currentIndex = ((currentIndex % promotions.length) + promotions.length) % promotions.length;
    const promo = promotions[currentIndex];
    const poster = promo.poster_url || "";

    if (backdrop) {
      backdrop.style.backgroundColor = "#080808";
      backdrop.style.backgroundImage = poster ? `url("${poster.replace(/["\\\\]/g, "")}")` : "none";
    }
    if (titleEl) titleEl.textContent = promo.title || "Untitled film";
    if (descriptionEl) descriptionEl.textContent = promo.tagline || promo.description || "";
    if (statusEl) statusEl.textContent = String(promo.status || "Coming Soon").toUpperCase();
    if (noteEl) noteEl.textContent = promo.release_date
      ? "Release date: " + promo.release_date
      : (promo.genre || "A featured ZIRIGO story");

    if (trailerButton) {
      trailerButton.hidden = !promo.trailer_url;
      trailerButton.onclick = () => openUploadedTrailer(promo.trailer_url, promo.title);
    }
    if (detailsButton) {
      detailsButton.hidden = false;
      detailsButton.onclick = () => {
        const detailPoster = $("featured-detail-poster");
        const detailTitle = $("featured-detail-title");
        const detailTagline = $("featured-detail-tagline");
        const detailDescription = $("featured-detail-description");
        const detailMeta = $("featured-detail-meta");
        const detailTrailer = $("featured-detail-trailer");

        if (detailPoster) {
          detailPoster.src = poster;
          detailPoster.alt = promo.title || "Film poster";
          detailPoster.hidden = !poster;
        }
        if (detailTitle) detailTitle.textContent = promo.title || "Untitled film";
        if (detailTagline) detailTagline.textContent = promo.tagline || "";
        if (detailDescription) detailDescription.textContent = promo.description || "More details coming soon.";
        if (detailMeta) detailMeta.textContent = [promo.genre, promo.status, promo.release_date].filter(Boolean).join(" · ");
        if (detailTrailer) {
          detailTrailer.style.display = promo.trailer_url ? "" : "none";
          detailTrailer.onclick = () => openUploadedTrailer(promo.trailer_url, promo.title);
        }
        detailsModal.classList.add("is-open");
      };
    }

    if (previous) previous.hidden = promotions.length < 2;
    if (next) next.hidden = promotions.length < 2;
    if (rail) {
      rail.querySelectorAll(".poster-tile").forEach((tile, index) => {
        tile.classList.toggle("is-active", index === currentIndex);
      });
    }
  }

  function restartRotation() {
    if (rotationTimer) {
      clearInterval(rotationTimer);
      rotationTimer = null;
    }
    if (promotions.length < 2) return;
    rotationTimer = setInterval(() => {
      currentIndex = (currentIndex + 1) % promotions.length;
      renderRail();
      renderFeatured();
    }, 7000);
  }

  $("featured-prev")?.addEventListener("click", () => {
    if (promotions.length < 2) return;
    currentIndex = (currentIndex - 1 + promotions.length) % promotions.length;
    renderRail();
    renderFeatured();
    restartRotation();
  });

  $("featured-next")?.addEventListener("click", () => {
    if (promotions.length < 2) return;
    currentIndex = (currentIndex + 1) % promotions.length;
    renderRail();
    renderFeatured();
    restartRotation();
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
        .select("id,title,tagline,genre,description,poster_url,trailer_url,release_date,status,is_active,sort_order,created_at")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;

      promotions = Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn("Could not load Supabase promotions.", error);
      promotions = [];
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

const showLoading = () => {
  grid.innerHTML = Array.from({ length: 6 }, () => `
    <article class="video-card video-skeleton" aria-hidden="true">
      <div class="skeleton-thumbnail"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line skeleton-line-short"></div>
    </article>
  `).join("");
};

const showState = (title, description, retry = false) => {
  grid.innerHTML = `
    <div class="video-state">
      <div class="video-state-icon" aria-hidden="true">
        ${retry ? "!" : "✦"}
      </div>
      <h3>${escapeHTML(title)}</h3>
      <p>${escapeHTML(description)}</p>
      ${retry ? `
        <button class="button button-gold" id="zirigo-videos-retry" type="button">
          Try Again ↻
        </button>
      ` : ""}
    </div>
  `;

  const retryButton = $("zirigo-videos-retry");
  retryButton?.addEventListener("click", loadVideos);
};

showLoading();

if (!cfg.channelId || !cfg.youtubeApiKey) {
  showState(
    "Almost ready",
    "Our film collection is temporarily unavailable. Please try again later."
  );
  console.error("ZIRIGO: YouTube channel ID or API key is missing.");
  return;
}

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15000);

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

  const response = await fetch(url, {
    signal: controller.signal
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    console.error("ZIRIGO YouTube API error:", data.error || response.status);

    showState(
      "We couldn't load the films",
      "Please check your connection and try again.",
      true
    );
    return;
  }

  if (!data.items || !data.items.length) {
    showState(
      "More stories are coming",
      "There are no public videos to display right now. Please check back soon."
    );
    return;
  }

  grid.innerHTML = data.items.map(video => {
    const id = video.id?.videoId;
    const title = escapeHTML(video.snippet?.title || "Untitled film");
    const thumbnails = video.snippet?.thumbnails || {};
    const thumbnail =
      thumbnails.high?.url ||
      thumbnails.medium?.url ||
      thumbnails.default?.url ||
      "";

    if (!id) return "";

    return `
      <article class="video-card">
        <button
          class="video-thumb zirigo-watch-button"
          type="button"
          data-video-id="${escapeHTML(id)}"
          data-video-title="${title}"
          aria-label="Play ${title}">
          ${thumbnail ? `
            <img
              src="${escapeHTML(thumbnail)}"
              alt="${title}"
              loading="lazy">
          ` : ""}
          <span class="play" aria-hidden="true">▶</span>
        </button>
        <div class="video-info">
          <h3>${title}</h3>
          <p>▶ Watch on ZIRIGO</p>
        </div>
      </article>
    `;
  }).join("");

  if (!grid.querySelector(".video-card")) {
    showState(
      "More stories are coming",
      "There are no playable public videos to display right now."
    );
    return;
  }

  grid.querySelectorAll(".zirigo-watch-button").forEach(button => {
    button.addEventListener("click", () => {
      openPlayer(button.dataset.videoId, button.dataset.videoTitle);
    });
  });

} catch (error) {
  console.error("ZIRIGO video loading error:", error);

  if (error.name === "AbortError") {
    showState(
      "Taking longer than expected",
      "The connection is taking too long. Please try again.",
      true
    );
  } else {
    showState(
      "You're not connected",
      "We couldn't reach YouTube. Check your internet connection and try again.",
      true
    );
  }
} finally {
  clearTimeout(timeout);
}

}
  const year = $("year");
  if (year) year.textContent = new Date().getFullYear();

  renderRail();
  renderFeatured();
  restartRotation();
  loadPromotions();
  loadVideos();
  /* =========================================
ZIRIGO — SETTINGS PANEL CONTROLS
========================================= */

const settingsOpenButton = $("zirigo-settings-open");
const settingsOverlay = $("zirigo-settings-overlay");
const settingsCloseButton = $("zirigo-settings-close");

const privacyOverlay = $("zirigo-privacy-overlay");
const privacyOpenButton = $("zirigo-privacy-open");
const privacyCloseButton = $("zirigo-privacy-close");

function applyZirigoTheme(theme) {
  const selected = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = selected;
  try { localStorage.setItem("zirigo-theme", selected); } catch (_) {}
  document.querySelectorAll("[data-theme-choice]").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.themeChoice === selected));
  });
}

applyZirigoTheme(document.documentElement.dataset.theme || "dark");
document.querySelectorAll("[data-theme-choice]").forEach(button => {
  button.addEventListener("click", () => applyZirigoTheme(button.dataset.themeChoice));
});

let settingsPreviousFocus = null;

function openSettingsPanel() {
if (!settingsOverlay) return;

settingsPreviousFocus = document.activeElement;

settingsOverlay.classList.add("is-open");
settingsOverlay.setAttribute("aria-hidden", "false");
document.body.style.overflow = "hidden";

if (settingsCloseButton) settingsCloseButton.focus();

}

function closeSettingsPanel() {
if (!settingsOverlay) return;

settingsOverlay.classList.remove("is-open");
settingsOverlay.setAttribute("aria-hidden", "true");

document.body.style.overflow = privacyOverlay?.classList.contains("is-open")
  ? "hidden"
  : "";

if (settingsPreviousFocus && typeof settingsPreviousFocus.focus === "function") {
  settingsPreviousFocus.focus();
}

}

function openPrivacyPanel() {
if (!privacyOverlay) return;

privacyOverlay.classList.add("is-open");
privacyOverlay.setAttribute("aria-hidden", "false");

}

function closePrivacyPanel() {
if (!privacyOverlay) return;

privacyOverlay.classList.remove("is-open");
privacyOverlay.setAttribute("aria-hidden", "true");

document.body.style.overflow = settingsOverlay?.classList.contains("is-open")
  ? "hidden"
  : "";

}

settingsOpenButton?.addEventListener("click", openSettingsPanel);
settingsCloseButton?.addEventListener("click", closeSettingsPanel);

privacyOpenButton?.addEventListener("click", openPrivacyPanel);
privacyCloseButton?.addEventListener("click", closePrivacyPanel);

settingsOverlay?.addEventListener("click", (event) => {
if (event.target === settingsOverlay) {
closeSettingsPanel();
}
});

privacyOverlay?.addEventListener("click", (event) => {
if (event.target === privacyOverlay) {
closePrivacyPanel();
}
});

document.addEventListener("keydown", (event) => {
if (event.key !== "Escape") return;

if (privacyOverlay?.classList.contains("is-open")) {
  closePrivacyPanel();
} else if (settingsOverlay?.classList.contains("is-open")) {
  closeSettingsPanel();
}

});
})();
