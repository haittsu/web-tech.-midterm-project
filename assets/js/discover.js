"use strict";

(() => {
  const discover = window.CrysPlayDiscover;

  async function fetchVideos({ signal } = {}) {
    const response = await fetch(discover.listUrl, {
      signal, headers: { Accept: "application/json" }, credentials: "omit"
    });
    if (!response.ok) throw new Error(`PeerTube HTTP ${response.status}`);
    const result = await response.json();
    if (!result || !Array.isArray(result.data)) throw new TypeError("Missing PeerTube data array");
    return result.data.slice(0, 12).map(record => discover.Video.fromPeerTube(record));
  }

  discover.fetchVideos = fetchVideos;
  const section = document.getElementById("discover");
  if (!section) return;
  const grid = document.getElementById("discover-grid");
  const status = document.getElementById("discover-status");
  const retry = document.getElementById("discover-retry");
  const feedback = document.getElementById("discover-feedback");
  let requestNumber = 0;
  let activeRequest;
  const search = document.getElementById("video-search");
  let query = new URL(document.baseURI).searchParams.get("q") || "";
  let loadedCards = [];

  function updateSearchResults() {
    const words = query.toLowerCase().replaceAll("ё", "е").trim().split(/\s+/).filter(Boolean);
    let visible = 0;
    for (const { video, column } of loadedCards) {
      const text = (video.title + " " + video.channel).toLowerCase().replaceAll("ё", "е");
      column.hidden = !words.every(word => text.includes(word));
      if (!column.hidden) visible += 1;
    }
    status.dataset.state = visible ? "ready" : "empty";
    status.textContent = !loadedCards.length
      ? "No videos are available in Discover. Try refreshing the catalog later."
      : !visible ? "No videos match your search. Try another title or channel."
      : words.length ? "Showing " + visible + " of " + loadedCards.length + " videos."
      : "Loaded videos: " + loadedCards.length;
  }

  function showFeedback(message, offerLogin = false) {
    feedback.replaceChildren();
    const text = document.createElement("span");
    text.textContent = message;
    feedback.append(text);
    if (offerLogin) {
      const link = document.createElement("a");
      link.href = new URL("login/index.html", discover.projectRoot).href;
      link.textContent = "Sign in";
      feedback.append(link);
    }
    feedback.hidden = false;
  }

  async function saveVideoToPlaylist(video, button) {
    if (!window.CrysPlayUser?.getUser()) {
      showFeedback("Sign in to save videos to a playlist.", true);
      return;
    }
    // Participant 2 owns the playlist picker and persistence, including its success UI.
    if (typeof window.saveToPlaylist !== "function") {
      showFeedback("Saving to a playlist is unavailable. Please try again later.");
      return;
    }
    button.disabled = true;
    feedback.hidden = true;
    try {
      const result = await window.saveToPlaylist(video);
      if (result === true || result?.saved === true) showFeedback("Video saved to playlist.");
    } catch {
      showFeedback("Could not save the video to a playlist. Please try again.");
    } finally {
      button.disabled = false;
    }
  }

  function createDiscoverCard(video) {
    // Reuse the local feed template, metadata rendering and responsive layout.
    const column = window.CrysPlay.createVideoCardShell(video);
    const card = column.querySelector(".video-card");
    card.classList.add("discover-card");
    const image = column.querySelector("img");
    image.addEventListener("error", () => { image.src = discover.placeholderUrl; }, { once: true });
    const save = column.querySelector(".save-video");
    save.className = "save-playlist";
    save.removeAttribute("aria-pressed");
    save.textContent = "Save to playlist";
    save.setAttribute("aria-label", `Save to playlist: ${video.title}`);
    save.addEventListener("click", () => saveVideoToPlaylist(video, save));
    const open = document.createElement("a");
    open.className = "discover-open";
    open.href = video.watchUrl;
    open.textContent = "Open";
    open.setAttribute("aria-label", `Open: ${video.title}`);
    column.querySelector(".share-video").replaceWith(open);
    return column;
  }

  async function loadVideos() {
    const number = ++requestNumber;
    activeRequest?.abort();
    const controller = new AbortController();
    activeRequest = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    loadedCards = [];
    grid.replaceChildren();
    grid.setAttribute("aria-busy", "true");
    status.dataset.state = "loading";
    status.textContent = "Loading videos from Blender…";
    retry.hidden = true;
    retry.disabled = true;
    feedback.hidden = true;
    try {
      const videos = await fetchVideos({ signal: controller.signal });
      if (number !== requestNumber) return;
      const fragment = document.createDocumentFragment();
      for (const video of videos) {
        const column = createDiscoverCard(video);
        loadedCards.push({ video, column });
        fragment.append(column);
      }
      grid.replaceChildren(fragment);
      updateSearchResults();
      retry.textContent = videos.length ? "Refresh" : "Retry";
    } catch {
      if (number !== requestNumber) return;
      status.dataset.state = "error";
      status.textContent = controller.signal.aborted
        ? "The video service is taking too long to respond. Please try again."
        : "Could not load videos. Check your connection and try again.";
      retry.textContent = "Retry";
    } finally {
      clearTimeout(timeout);
      if (number === requestNumber) {
        grid.setAttribute("aria-busy", "false");
        retry.hidden = false;
        retry.disabled = false;
        activeRequest = null;
      }
    }
  }

  if (search) {
    search.value = query;
    search.addEventListener("input", () => {
      query = search.value;
      if (!activeRequest && status.dataset.state !== "error") updateSearchResults();
    });
    search.form?.addEventListener("submit", event => {
      event.preventDefault();
      query = search.value;
      if (!activeRequest && status.dataset.state !== "error") updateSearchResults();
    });
  }

  retry.addEventListener("click", loadVideos);
  discover.loadVideos = loadVideos;
  loadVideos();
})();
