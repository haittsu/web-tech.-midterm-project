"use strict";

(() => {
  const apiOrigin = "https://video.blender.org";
  // The script URL retains the repository subdirectory on GitHub Pages.
  const scriptUrl = document.currentScript?.src || new URL("assets/js/video.js", document.baseURI).href;
  const projectRoot = new URL("../../", scriptUrl);
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const placeholderUrl = new URL("assets/images/video-placeholder.svg", projectRoot).href;

  function buildWatchUrl(uuid) {
    const url = new URL("videos/video-1.html", projectRoot);
    if (uuid !== undefined) {
      if (!uuidPattern.test(uuid)) throw new TypeError("Invalid PeerTube UUID");
      url.searchParams.set("id", uuid);
    }
    return url.href;
  }

  function thumbnailUrl(path) {
    if (typeof path !== "string" || !path.trim()) return placeholderUrl;
    try {
      const url = new URL(path, apiOrigin);
      return url.origin === apiOrigin && !url.username && !url.password ? url.href : placeholderUrl;
    } catch {
      return placeholderUrl;
    }
  }

  class Video {
    constructor({ id, title, channel, thumbnailUrl: image, durationSeconds }) {
      const uuid = typeof id === "string" && id.startsWith("peertube:") ? id.slice(9) : undefined;
      if (id !== "costa-rica" && (!uuid || !uuidPattern.test(uuid))) {
        throw new TypeError("Invalid video ID");
      }
      if (typeof title !== "string" || !title.trim()) throw new TypeError("Missing video title");
      this.id = id;
      this.title = title.trim();
      this.channel = typeof channel === "string" && channel.trim() ? channel.trim() : "PeerTube";
      this.thumbnailUrl = image || placeholderUrl;
      this.durationSeconds = Number.isFinite(durationSeconds) && durationSeconds > 0 ? Math.floor(durationSeconds) : 0;
      this.watchUrl = buildWatchUrl(uuid);
    }

    formatDuration() {
      const hours = Math.floor(this.durationSeconds / 3600);
      const minutes = Math.floor(this.durationSeconds / 60) % 60;
      const seconds = String(this.durationSeconds % 60).padStart(2, "0");
      return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
    }

    static fromPeerTube(record) {
      if (!record || !uuidPattern.test(record.uuid)) throw new TypeError("Invalid PeerTube video");
      return new Video({
        id: `peertube:${record.uuid}`,
        title: record.name,
        channel: record.channel?.displayName || record.channel?.name,
        thumbnailUrl: thumbnailUrl(record.thumbnailPath),
        durationSeconds: record.duration
      });
    }

    toJSON() {
      return {
        id: this.id, title: this.title, channel: this.channel,
        thumbnailUrl: this.thumbnailUrl, durationSeconds: this.durationSeconds, watchUrl: this.watchUrl
      };
    }
  }

  window.CrysPlayDiscover = {
    Video, buildWatchUrl, apiOrigin, projectRoot: projectRoot.href, placeholderUrl,
    listUrl: `${apiOrigin}/api/v1/videos?count=12&sort=-publishedAt`
  };
  if (window.CrysPlay) window.CrysPlay.Video = Video;
})();
