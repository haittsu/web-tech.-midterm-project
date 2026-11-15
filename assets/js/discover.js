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

  function showFeedback(message, offerLogin = false) {
    feedback.replaceChildren();
    const text = document.createElement("span");
    text.textContent = message;
    feedback.append(text);
    if (offerLogin) {
      const link = document.createElement("a");
      link.href = new URL("login/index.html", discover.projectRoot).href;
      link.textContent = "Войти";
      feedback.append(link);
    }
    feedback.hidden = false;
  }

  async function saveVideoToPlaylist(video, button) {
    if (!window.CrysPlayUser?.getUser()) {
      showFeedback("Войди в аккаунт, чтобы сохранить видео в плейлист.", true);
      return;
    }
    // Participant 2 owns the playlist picker and persistence, including its success UI.
    if (typeof window.saveToPlaylist !== "function") {
      showFeedback("Сохранение в плейлист пока недоступно. Попробуй позже.");
      return;
    }
    button.disabled = true;
    feedback.hidden = true;
    try {
      const result = await window.saveToPlaylist(video);
      if (result === true || result?.saved === true) showFeedback("Видео сохранено в плейлист.");
    } catch {
      showFeedback("Не удалось сохранить видео в плейлист. Попробуй ещё раз.");
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
    save.textContent = "Сохранить в плейлист";
    save.setAttribute("aria-label", `Сохранить в плейлист: ${video.title}`);
    save.addEventListener("click", () => saveVideoToPlaylist(video, save));
    const open = document.createElement("a");
    open.className = "discover-open";
    open.href = video.watchUrl;
    open.textContent = "Открыть";
    open.setAttribute("aria-label", `Открыть: ${video.title}`);
    column.querySelector(".share-video").replaceWith(open);
    return column;
  }

  async function loadVideos() {
    const number = ++requestNumber;
    activeRequest?.abort();
    const controller = new AbortController();
    activeRequest = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    grid.replaceChildren();
    grid.setAttribute("aria-busy", "true");
    status.dataset.state = "loading";
    status.textContent = "Загружаем видео из Blender…";
    retry.hidden = true;
    retry.disabled = true;
    feedback.hidden = true;
    try {
      const videos = await fetchVideos({ signal: controller.signal });
      if (number !== requestNumber) return;
      const fragment = document.createDocumentFragment();
      for (const video of videos) fragment.append(createDiscoverCard(video));
      grid.replaceChildren(fragment);
      status.dataset.state = videos.length ? "ready" : "empty";
      status.textContent = videos.length ? `Загружено видео: ${videos.length}` : "В Discover пока нет видео. Попробуй обновить каталог позже.";
      retry.textContent = videos.length ? "Обновить" : "Повторить";
    } catch {
      if (number !== requestNumber) return;
      status.dataset.state = "error";
      status.textContent = controller.signal.aborted
        ? "Сервис видео отвечает слишком долго. Попробуй ещё раз."
        : "Не удалось загрузить видео. Проверь подключение и попробуй ещё раз.";
      retry.textContent = "Повторить";
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

  retry.addEventListener("click", loadVideos);
  discover.loadVideos = loadVideos;
  loadVideos();
})();
