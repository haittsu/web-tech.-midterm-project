"use strict";

(() => {
  const cards = document.querySelectorAll(".video-card[data-preview-src]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let activePreview = null;

  // Long videos show three short excerpts; very short clips loop in full.
  function getSegments(duration) {
    if (!Number.isFinite(duration) || duration <= 0) {
      return [{ start: 0, end: 9 }];
    }
    if (duration <= 10) return [{ start: 0, end: duration }];
    return [0.1, 0.4, 0.7].map(fraction => ({
      start: duration * fraction,
      end: Math.min(duration * fraction + 3, duration)
    }));
  }

  const controllers = new Map();
  for (const card of cards) {
    const thumbnail = card.querySelector(".video-thumbnail");
    const title = card.querySelector("h2").textContent;
    const video = document.createElement("video");
    video.className = "video-preview";
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.preload = "none";
    video.setAttribute("aria-hidden", "true");
    video.setAttribute("disablepictureinpicture", "");
    thumbnail.append(video);

    const status = document.createElement("span");
    status.className = "preview-status";
    status.hidden = true;
    thumbnail.append(status);

    // Keep the button outside the Costa Rica link: no nested interactive controls.
    const button = document.createElement("button");
    button.type = "button";
    button.className = "preview-toggle";
    card.append(button);

    let requested = false;
    let hoverTimer;
    let version = 0;
    let segments = [];
    let segmentIndex = 0;
    let previewDuration = NaN;

    function updateButton() {
      button.textContent = requested ? "■ Стоп" : "▶ Предпросмотр";
      button.setAttribute("aria-pressed", String(requested));
      button.setAttribute("aria-label", (requested ? "Остановить предпросмотр: " : "Предпросмотр: ") + title);
    }

    function stop() {
      clearTimeout(hoverTimer);
      requested = false;
      version += 1;
      video.pause();
      card.classList.remove("is-previewing");
      status.hidden = true;
      if (activePreview === controller) activePreview = null;
      updateButton();
    }

    function showFailure() {
      if (!requested) return;
      stop();
      status.textContent = "Предпросмотр недоступен. Попробуй ещё раз.";
      status.hidden = false;
    }

    function prepareSegments() {
      previewDuration = video.duration;
      segments = getSegments(video.duration);
      segmentIndex = 0;
      video.currentTime = segments[0].start;
    }

    function play() {
      const playbackVersion = version;
      video.play().catch(() => {
        // An old, cancelled request must not stop a newly started preview.
        if (playbackVersion === version) showFailure();
      });
    }

    function start() {
      clearTimeout(hoverTimer);
      if (requested || document.hidden) return;
      if (activePreview) activePreview.stop();
      activePreview = controller;
      requested = true;
      version += 1;
      status.textContent = "Загрузка…";
      status.hidden = false;
      updateButton();

      // No media requests are made until this card is actually used.
      if (!video.hasAttribute("src")) video.src = card.dataset.previewSrc;
      if (video.error) video.load();
      if (video.readyState >= 1) prepareSegments();
      play();
    }

    const controller = { start, stop };
    controllers.set(card, controller);
    updateButton();

    card.addEventListener("pointerenter", event => {
      if (event.pointerType !== "mouse" || reducedMotion.matches || navigator.connection?.saveData) return;
      hoverTimer = setTimeout(start, 350);
    });
    card.addEventListener("pointerleave", stop);
    card.addEventListener("focusout", event => {
      if (!card.contains(event.relatedTarget)) stop();
    });
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      if (requested) stop();
      else start();
    });
    video.addEventListener("loadedmetadata", () => {
      if (requested) prepareSegments();
    });
    video.addEventListener("durationchange", () => {
      // Fragmented MP4s can report their actual duration after loadedmetadata.
      if (requested && video.duration > 0 && (!Number.isFinite(previewDuration) || previewDuration <= 0)) {
        prepareSegments();
      }
    });
    video.addEventListener("playing", () => {
      if (!requested) {
        video.pause();
        return;
      }
      card.classList.add("is-previewing");
      status.textContent = "Без звука";
      status.hidden = false;
    });
    video.addEventListener("timeupdate", () => {
      if (!requested || !segments.length || video.seeking) return;
      if (video.currentTime >= segments[segmentIndex].end) {
        segmentIndex = (segmentIndex + 1) % segments.length;
        video.currentTime = segments[segmentIndex].start;
      }
    });
    video.addEventListener("ended", () => {
      if (!requested) return;
      prepareSegments();
      play();
    });
    video.addEventListener("error", showFailure);
  }

  function stopAll() {
    for (const controller of controllers.values()) controller.stop();
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAll();
  });
  document.addEventListener("crysplay:feedchange", stopAll);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") stopAll();
  });
  window.addEventListener("pagehide", stopAll);

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) controllers.get(entry.target).stop();
      }
    });
    for (const card of cards) observer.observe(card);
  }
})();
