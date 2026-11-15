const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const root = path.join(__dirname, "..");
const modelSource = fs.readFileSync(path.join(root, "assets/js/video.js"), "utf8");
const discoverSource = fs.readFileSync(path.join(root, "assets/js/discover.js"), "utf8");
const uuid = "ae644b29-9e31-47f8-af40-f5d52d1f787f";
const otherUuid = "8c02afe6-47c2-4a21-9155-f165f9696f4c";
const record = {
  uuid, name: "Grease Pencil + Performance | Blender Today LIVE #293", duration: 4036,
  channel: { displayName: "Blender" },
  thumbnailPath: "/lazy-static/thumbnails/2434961c-7d2b-4170-977e-160d0d98c57f.jpg"
};
const response = data => ({ ok: true, status: 200, json: async () => ({ data }) });
const settle = () => new Promise(resolve => setImmediate(resolve));

// Small DOM boundary doubles: tests run the real model/request/controller code.
class Element {
  constructor(tag = "div") {
    this.tag = tag;
    this.dataset = {};
    this.children = [];
    this.listeners = new Map();
    this.attributes = new Map();
    this.textContent = "";
    this.hidden = false;
    this.disabled = false;
    this.classes = new Set();
    this.classList = { add: value => this.classes.add(value) };
  }
  setAttribute(key, value) { this.attributes.set(key, value); }
  getAttribute(key) { return this.attributes.get(key); }
  removeAttribute(key) { this.attributes.delete(key); }
  addEventListener(name, handler) { this.listeners.set(name, handler); }
  dispatch(name) { return this.listeners.get(name)?.(); }
  append(...children) {
    for (const child of children) {
      if (child.tag === "fragment") this.children.push(...child.children);
      else this.children.push(child);
    }
  }
  replaceChildren(...children) { this.children = []; this.append(...children); }
  replaceWith(element) { this.replacement = element; }
}

function runtime({ fetch = async () => response([record]), ui = false, base = "https://example.test/project/", user = null } = {}) {
  const ids = ["discover", "discover-grid", "discover-status", "discover-retry", "discover-feedback"];
  const elements = new Map(ids.map(id => [id, new Element()]));
  const rendered = [];
  const timers = new Map();
  let nextTimer = 0;
  const window = {
    CrysPlayUser: { getUser: () => user },
    CrysPlay: {
      createVideoCardShell(video) {
        const column = new Element();
        const parts = new Map([".video-card", "img", ".save-video", ".share-video"].map(selector => [selector, new Element()]));
        column.querySelector = selector => parts.get(selector);
        column.video = video;
        column.duration = video.formatDuration();
        rendered.push(column);
        return column;
      }
    }
  };
  const document = {
    currentScript: { src: new URL("assets/js/video.js", base).href },
    baseURI: new URL("index.html", base).href,
    getElementById: id => ui ? elements.get(id) : null,
    createElement: tag => new Element(tag),
    createDocumentFragment: () => new Element("fragment")
  };
  const context = vm.createContext({
    window, document, URL, AbortController, fetch,
    setTimeout(callback) { const id = ++nextTimer; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); }
  });
  vm.runInContext(modelSource, context);
  vm.runInContext(discoverSource, context);
  return { api: window.CrysPlayDiscover, window, elements, rendered, timers };
}

test("Video uses the shared six-field object and internal UUID URL", () => {
  const { api } = runtime();
  const video = api.Video.fromPeerTube(record);
  assert.ok(video instanceof api.Video);
  assert.equal(video.id, `peertube:${uuid}`);
  assert.equal(video.title, record.name);
  assert.equal(video.channel, "Blender");
  assert.equal(video.thumbnailUrl, "https://video.blender.org" + record.thumbnailPath);
  assert.equal(video.durationSeconds, 4036);
  assert.equal(video.watchUrl, `https://example.test/project/videos/video-1.html?id=${uuid}`);
  assert.deepEqual(Object.keys(JSON.parse(JSON.stringify(video))), ["id", "title", "channel", "thumbnailUrl", "durationSeconds", "watchUrl"]);
});

test("duration formatting handles seconds, minutes, hours, fractions and invalid input", () => {
  const { Video } = runtime().api;
  for (const [seconds, label] of [[0, "0:00"], [5, "0:05"], [125, "2:05"], [3599, "59:59"], [4036, "1:07:16"], [125.9, "2:05"], [-5, "0:00"], [NaN, "0:00"], [Infinity, "0:00"]]) {
    assert.equal(new Video({ id: "costa-rica", title: "Costa Rica", durationSeconds: seconds }).formatDuration(), label);
  }
});

test("watch URLs retain a GitHub Pages subdirectory and omit the Costa Rica parameter", () => {
  const { api } = runtime({ base: "https://haittsu.github.io/web-tech.-midterm-project/" });
  assert.equal(api.buildWatchUrl(uuid), `https://haittsu.github.io/web-tech.-midterm-project/videos/video-1.html?id=${uuid}`);
  assert.equal(new api.Video({ id: "costa-rica", title: "Costa Rica" }).watchUrl, "https://haittsu.github.io/web-tech.-midterm-project/videos/video-1.html");
  assert.throws(() => api.buildWatchUrl("peertube:" + uuid));
  assert.throws(() => api.Video.fromPeerTube({ ...record, uuid: "../../other" }));
});

test("missing thumbnails and untrusted thumbnail origins use the local placeholder", () => {
  const { api } = runtime();
  for (const thumbnailPath of [undefined, "", "javascript:alert(1)", "https://other.example/image.jpg", "//other.example/image.jpg"]) {
    assert.equal(api.Video.fromPeerTube({ ...record, thumbnailPath }).thumbnailUrl, api.placeholderUrl);
  }
  assert.equal(api.Video.fromPeerTube({ ...record, channel: null }).channel, "PeerTube");
});

test("fetchVideos requests the public list and returns up to twelve Video instances", async () => {
  const requests = [];
  const records = Array.from({ length: 13 }, () => ({ ...record }));
  const { api } = runtime({ fetch: async (...args) => { requests.push(args); return response(records); } });
  const videos = await api.fetchVideos();
  assert.equal(videos.length, 12);
  assert.ok(videos.every(video => video instanceof api.Video));
  assert.equal(requests[0][0], "https://video.blender.org/api/v1/videos?count=12&sort=-publishedAt");
  assert.equal(requests[0][1].credentials, "omit");
});

test("HTTP failures, invalid JSON, a missing data array and invalid records reject", async () => {
  for (const fetch of [
    async () => ({ ok: false, status: 503, json() { throw new Error("Should not parse a failed response"); } }),
    async () => ({ ok: true, json: async () => { throw new SyntaxError("JSON"); } }),
    async () => ({ ok: true, json: async () => ({ videos: [] }) }),
    async () => response([{ ...record, uuid: null }]),
    async () => { throw new TypeError("Network failure"); }
  ]) {
    await assert.rejects(runtime({ fetch }).api.fetchVideos());
  }
});

test("the controller displays loading, then renders returned video instances", async () => {
  let resolve;
  const app = runtime({ ui: true, fetch: () => new Promise(done => { resolve = done; }) });
  assert.equal(app.elements.get("discover-status").dataset.state, "loading");
  assert.equal(app.elements.get("discover-grid").getAttribute("aria-busy"), "true");
  assert.ok(app.elements.get("discover-retry").disabled);
  resolve(response([record, { ...record, uuid: otherUuid, duration: 125 }]));
  await settle();
  assert.equal(app.elements.get("discover-status").dataset.state, "ready");
  assert.equal(app.elements.get("discover-grid").children.length, 2);
  assert.deepEqual(app.rendered.map(column => column.duration), ["1:07:16", "2:05"]);
  assert.ok(app.rendered.every(column => column.video.previewSrc === undefined));
  assert.equal(app.rendered[1].querySelector(".share-video").replacement.href, `https://example.test/project/videos/video-1.html?id=${otherUuid}`);
  assert.equal(app.timers.size, 0);
});

test("an empty result has no fabricated cards and offers retry", async () => {
  const app = runtime({ ui: true, fetch: async () => response([]) });
  await settle();
  assert.equal(app.elements.get("discover-status").dataset.state, "empty");
  assert.equal(app.elements.get("discover-grid").children.length, 0);
  assert.equal(app.elements.get("discover-retry").hidden, false);
});

test("retry recovers from a failed request and clears the old error state", async () => {
  let calls = 0;
  const app = runtime({ ui: true, fetch: async () => {
    if (++calls === 1) throw new Error("Offline");
    return response([record]);
  } });
  await settle();
  assert.equal(app.elements.get("discover-status").dataset.state, "error");
  assert.equal(app.elements.get("discover-grid").getAttribute("aria-busy"), "false");
  await app.elements.get("discover-retry").dispatch("click");
  assert.equal(calls, 2);
  assert.equal(app.elements.get("discover-status").dataset.state, "ready");
  assert.equal(app.elements.get("discover-grid").children.length, 1);
});

test("a timed-out request is aborted and unlocks retry", async () => {
  const app = runtime({ ui: true, fetch: (url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener("abort", () => reject(new Error("Aborted")));
  }) });
  for (const timer of [...app.timers.values()]) timer();
  await settle();
  assert.equal(app.elements.get("discover-status").dataset.state, "error");
  assert.equal(app.elements.get("discover-retry").disabled, false);
  assert.equal(app.timers.size, 0);
});

test("a stale response cannot overwrite a newer successful request", async () => {
  const pending = [];
  const app = runtime({ ui: true, fetch: () => new Promise(resolve => pending.push(resolve)) });
  const second = app.api.loadVideos();
  pending[1](response([record]));
  await second;
  pending[0](response([]));
  await settle();
  assert.equal(app.elements.get("discover-status").dataset.state, "ready");
  assert.equal(app.elements.get("discover-grid").children.length, 1);
});

test("guests receive a project-relative sign-in link without calling the playlist hook", async () => {
  const app = runtime({ ui: true });
  let called = false;
  app.window.saveToPlaylist = () => { called = true; };
  await settle();
  await app.rendered[0].querySelector(".save-video").dispatch("click");
  assert.equal(called, false);
  const feedback = app.elements.get("discover-feedback");
  assert.equal(feedback.hidden, false);
  assert.equal(feedback.children[1].href, "https://example.test/project/login/index.html");
});

test("a signed-in user passes the exact selected Video to Member 2's hook", async () => {
  const app = runtime({ ui: true, user: { name: "Student" } });
  let received;
  app.window.saveToPlaylist = async video => { received = video; return { saved: true }; };
  await settle();
  const button = app.rendered[0].querySelector(".save-video");
  await button.dispatch("click");
  assert.equal(received, app.rendered[0].video);
  assert.ok(received instanceof app.api.Video);
  assert.equal(button.disabled, false);
  assert.equal(app.elements.get("discover-feedback").hidden, false);
});

test("a missing or rejecting playlist hook does not crash or leave the button disabled", async () => {
  const app = runtime({ ui: true, user: { name: "Student" } });
  await settle();
  const button = app.rendered[0].querySelector(".save-video");
  await button.dispatch("click");
  assert.equal(app.elements.get("discover-feedback").hidden, false);
  app.window.saveToPlaylist = async () => { throw new Error("Storage blocked"); };
  await button.dispatch("click");
  assert.equal(button.disabled, false);
  assert.equal(app.elements.get("discover-feedback").hidden, false);
});

test("cancelling the playlist picker does not claim the video was saved", async () => {
  const app = runtime({ ui: true, user: { name: "Student" } });
  app.window.saveToPlaylist = async () => false;
  await settle();
  await app.rendered[0].querySelector(".save-video").dispatch("click");
  assert.equal(app.elements.get("discover-feedback").hidden, true);
});

test("a thumbnail load failure uses the shared local placeholder", async () => {
  const app = runtime({ ui: true });
  await settle();
  const image = app.rendered[0].querySelector("img");
  image.dispatch("error");
  assert.equal(image.src, app.api.placeholderUrl);
});
