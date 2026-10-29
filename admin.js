(() => {
  "use strict";

  const statusEl = document.getElementById("admin-status");
  const loginPanel = document.getElementById("login-panel");
  const dashboard = document.getElementById("dashboard");
  const loginForm = document.getElementById("login-form");
  const promotionForm = document.getElementById("promotion-form");
  const promotionList = document.getElementById("promotion-list");

  const $ = id => document.getElementById(id);

  const config = window.ZIRIGO_SUPABASE;

  let supabase;
  let currentUser = null;
  let editingId = null;
  let editingPosterUrl = null;
  let editingTrailerUrl = null;
  let posterToDelete = null;
  let busy = false;

  function setStatus(message) {
    statusEl.textContent = message;
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function setSignedInView(signedIn) {
    loginPanel.hidden = signedIn;
    dashboard.hidden = !signedIn;
  }

  function getErrorMessage(error) {
    return error?.message || "Something went wrong. Please try again.";
  }

  function extractYouTubeId(value) {
    if (!value) return "";

    try {
      const url = new URL(value);
      let id = "";

      if (
        url.hostname === "youtu.be" ||
        url.hostname === "www.youtu.be"
      ) {
        id = url.pathname.split("/").filter(Boolean)[0] || "";
      } else if (
        url.hostname === "youtube.com" ||
        url.hostname === "www.youtube.com" ||
        url.hostname === "m.youtube.com"
      ) {
        if (url.pathname === "/watch") {
          id = url.searchParams.get("v") || "";
        } else {
          const parts = url.pathname.split("/").filter(Boolean);

          if (["embed", "shorts", "live"].includes(parts[0])) {
            id = parts[1] || "";
          }
        }
      }

      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : "";
    } catch {
      return "";
    }
  }

  function clearForm() {
    promotionForm.reset();
    editingId = null;
    editingPosterUrl = null;
    editingTrailerUrl = null;
    posterToDelete = null;

    $("promo-order").value = "0";
    $("promo-status").value = "Coming Soon";
    $("promo-active").value = "false";

    $("form-heading").textContent = "Add a promotion";
    $("save-button").textContent = "Save promotion";
    $("cancel-edit-button").hidden = true;
    $("promo-poster").required = true;
  }

  async function loadPromotions() {
    promotionList.textContent = "Loading promotions…";

    const { data, error } = await supabase
      .from("promotions")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      promotionList.textContent =
        "Could not load promotions: " + getErrorMessage(error);
      return;
    }

    if (!data || data.length === 0) {
      promotionList.textContent =
        "No promotions yet. Use the form above to add your first one.";
      return;
    }

    promotionList.innerHTML = data.map(promo => `
      <article class="admin-promo">
        <img
          src="${escapeHTML(promo.poster_url || "")}"
          alt=""
          loading="lazy"
        >

        <div>
          <span class="admin-badge">
            ${promo.is_active ? "Published" : "Hidden"}
          </span>

          <h3>${escapeHTML(promo.title)}</h3>

          <p>${escapeHTML(promo.description || "No description provided.")}</p>

          <p>
            ${escapeHTML(promo.status)}
            ${promo.release_date
              ? " · " + escapeHTML(promo.release_date)
              : ""}
          </p>

          <div class="admin-actions">
            <button
              class="admin-button secondary"
              type="button"
              data-action="edit"
              data-id="${escapeHTML(promo.id)}"
            >Edit</button>

            <button
              class="admin-button secondary"
              type="button"
              data-action="toggle"
              data-id="${escapeHTML(promo.id)}"
            >${promo.is_active ? "Hide" : "Publish"}</button>

            <button
              class="admin-button danger"
              type="button"
              data-action="delete"
              data-id="${escapeHTML(promo.id)}"
            >Delete</button>
          </div>
        </div>
      </article>
    `).join("");

    promotionList.querySelectorAll("button[data-action]").forEach(button => {
      button.addEventListener("click", () => {
        handlePromotionAction(
          button.dataset.action,
          button.dataset.id
        );
      });
    });
  }

  async function uploadPoster(file) {
    if (!file) return editingPosterUrl;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error("Please choose a JPG, PNG or WebP image.");
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("The poster must be 5 MB or smaller.");
    }

    const extension = ({
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp"
    })[file.type];

    const path =
      currentUser.id + "/" +
      crypto.randomUUID() + "." + extension;

    const { error: uploadError } = await supabase
      .storage
      .from("promotion-posters")
      .upload(path, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase
      .storage
      .from("promotion-posters")
      .getPublicUrl(path);

    return data.publicUrl;
  }
  
  async function uploadTrailer(file) {
    if (!file) return null;

    const allowedTypes = [
      "video/mp4",
      "video/webm",
      "video/quicktime"
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error(
        "Please choose an MP4, WebM or MOV video."
      );
    }

    if (file.size > 50 * 1024 * 1024) {
      throw new Error(
        "The trailer must be 50 MB or smaller. Please compress it and try again."
      );
    }

    const extension = ({
      "video/mp4": "mp4",
      "video/webm": "webm",
      "video/quicktime": "mov"
    })[file.type];

    const path =
      currentUser.id + "/" +
      crypto.randomUUID() + "." + extension;

    const { error: uploadError } = await supabase
      .storage
      .from("promotion-trailers")
      .upload(path, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data } = supabase
      .storage
      .from("promotion-trailers")
      .getPublicUrl(path);

    return data.publicUrl;
  }

  async function savePromotion(event) {
    event.preventDefault();

    if (busy) return;
    busy = true;

    const saveButton = $("save-button");
    saveButton.disabled = true;

    let uploadedPosterUrl = null;
    let uploadedTrailerUrl = null;

    try {
      setStatus("Saving promotion…");

      const title = $("promo-title").value.trim();
      const tagline = $("promo-tagline").value.trim();
      const genre = $("promo-genre").value.trim();
      const description = $("promo-description").value.trim();
      const releaseDate = $("promo-date").value || null;
      const status = $("promo-status").value;
      const sortOrder = Number($("promo-order").value) || 0;
      const isActive = $("promo-active").value === "true";

      const posterFile = $("promo-poster").files[0];
      const trailerFile = $("promo-trailer").files[0];

      if (!title) {
        throw new Error("Please enter a promotion title.");
      }

      if (!editingId && !posterFile) {
        throw new Error("Please select a poster image.");
      }

      if (posterFile) {
        uploadedPosterUrl = await uploadPoster(posterFile);
      }

      if (trailerFile) {
        setStatus("Uploading trailer…");
        uploadedTrailerUrl = await uploadTrailer(trailerFile);
      }

      const record = {
        title,
        tagline,
        genre,
        description,
        trailer_url: trailerFile
          ? uploadedTrailerUrl
          : (editingId ? editingTrailerUrl : null),
        release_date: releaseDate,
        status,
        sort_order: sortOrder,
        is_active: isActive,
        updated_at: new Date().toISOString()
      };

      if (uploadedPosterUrl) {
        record.poster_url = uploadedPosterUrl;
      }

      setStatus("Saving promotion details…");

      let result;

      if (editingId) {
        result = await supabase
          .from("promotions")
          .update(record)
          .eq("id", editingId)
          .select("id")
          .single();
      } else {
        result = await supabase
          .from("promotions")
          .insert(record)
          .select("id")
          .single();
      }

      if (result.error) throw result.error;

      setStatus("Promotion saved successfully!");
      clearForm();
      await loadPromotions();

    } catch (error) {
      console.error("ZIRIGO admin save error:", error);

      setStatus(
        "Could not save promotion: " + getErrorMessage(error)
      );

      if (uploadedPosterUrl) {
        console.warn(
          "Poster uploaded but may not be attached:",
          uploadedPosterUrl
        );
      }

      if (uploadedTrailerUrl) {
        console.warn(
          "Trailer uploaded but may not be attached:",
          uploadedTrailerUrl
        );
      }

    } finally {
      busy = false;
      saveButton.disabled = false;
    }
  }

  async function handlePromotionAction(action, id) {
    try {
      const { data: promo, error: fetchError } = await supabase
        .from("promotions")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;
      if (!promo) throw new Error("Promotion not found.");

      if (action === "edit") {
        editingId = promo.id;
        editingPosterUrl = promo.poster_url;
        editingTrailerUrl = promo.trailer_url || null;
        posterToDelete = null;

        $("promo-title").value = promo.title || "";
        $("promo-tagline").value = promo.tagline || "";
        $("promo-genre").value = promo.genre || "";
        $("promo-description").value = promo.description || "";
        $("promo-trailer").value = "";
        $("promo-date").value = promo.release_date || "";
        $("promo-status").value = promo.status || "Coming Soon";
        $("promo-order").value = promo.sort_order ?? 0;
        $("promo-active").value = String(Boolean(promo.is_active));
        $("promo-poster").value = "";
        $("promo-poster").required = false;

        $("form-heading").textContent = "Edit promotion";
        $("save-button").textContent = "Save changes";
        $("cancel-edit-button").hidden = false;

        window.scrollTo({ top: 0, behavior: "smooth" });
        setStatus("Editing: " + promo.title);
        return;
      }

      if (action === "toggle") {
        const { error } = await supabase
          .from("promotions")
          .update({
            is_active: !promo.is_active,
            updated_at: new Date().toISOString()
          })
          .eq("id", id);

        if (error) throw error;

        setStatus(
          promo.is_active
            ? "Promotion hidden."
            : "Promotion published."
        );

        await loadPromotions();
        return;
      }

      if (action === "delete") {
        const confirmed = window.confirm(
          'Delete "' + promo.title + '" from ZIRIGO promotions?'
        );

        if (!confirmed) return;

        const { error } = await supabase
          .from("promotions")
          .delete()
          .eq("id", id);

        if (error) throw error;

        setStatus("Promotion deleted from the database.");
        await loadPromotions();
      }

    } catch (error) {
      console.error("ZIRIGO promotion action error:", error);
      setStatus(getErrorMessage(error));
    }
  }

  async function signIn(event) {
    event.preventDefault();

    const button = loginForm.querySelector('button[type="submit"]');
    button.disabled = true;
    setStatus("Signing in…");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: $("login-email").value.trim(),
        password: $("login-password").value
      });

      if (error) throw error;

      // Auth state listener will update the dashboard.
      $("login-password").value = "";

    } catch (error) {
      setStatus("Sign-in failed: " + getErrorMessage(error));
    } finally {
      button.disabled = false;
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setStatus("Could not sign out: " + getErrorMessage(error));
    }
  }

  async function checkAdmin(user) {
    if (!user) {
      currentUser = null;
      setSignedInView(false);
      setStatus("Sign in with your ZIRIGO administrator account.");
      return;
    }

    const { data, error } = await supabase
      .from("zirigo_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !data) {
      await supabase.auth.signOut();
      currentUser = null;
      setSignedInView(false);

      setStatus(
        "This account is not authorized to manage ZIRIGO promotions."
      );
      return;
    }

    currentUser = user;
    setSignedInView(true);
    setStatus("Signed in as " + user.email);

    await loadPromotions();
  }

  async function init() {
    if (!window.supabase || !config?.url || !config?.publishableKey) {
      setStatus(
        "Supabase configuration is missing. Check supabase-config.js."
      );
      return;
    }

    supabase = window.supabase.createClient(
      config.url,
      config.publishableKey
    );

    loginForm.addEventListener("submit", signIn);
    promotionForm.addEventListener("submit", savePromotion);
    $("logout-button").addEventListener("click", signOut);
    $("cancel-edit-button").addEventListener("click", clearForm);

    const { data, error } = await supabase.auth.getSession();

    if (error) {
      setStatus("Could not check your session: " + getErrorMessage(error));
      return;
    }

    await checkAdmin(data.session?.user || null);

    supabase.auth.onAuthStateChange((_event, session) => {
      // Defer database work until after the auth callback completes.
      setTimeout(() => {
        checkAdmin(session?.user || null);
      }, 0);
    });
  }

  init();
})();
