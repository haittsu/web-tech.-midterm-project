const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "assets/js/video-previews.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const sources = [...html.matchAll(/data-preview-src="([^"]+)"/g)].map(match => match[1]);

// Mock browser boundaries to exercise real event handlers without downloading media.
function setup({ reducedMotion = false, saveData = false } = {}) {
  class Element {
    constructor(tag = "div") {
      this.tag = tag;
      this.children = [];
      this.listeners = new Map();
      this.attributes = new Map();
      this.classes = new Set();
      this.classList = {
        add: name => this.classes.add(name),
        remove: name => this.classes.delete(name),
        contains: name => this.classes.has(name)
      };
      this.textContent = "";
      this.hidden = false;
    }
    append(child) { this.children.push(child); }
    setAttribute(name, value) { this.attributes.set(name, value); }
    hasAttribute(name) { return this.attributes.has(name); }
    getAttribute(name) { return this.attributes.get(name); }
    contains(child) { return child === this || this.children.some(item => item.contains(child)); }
    addEventListener(name, handler) {
      if (!this.listeners.has(name)) this.listeners.set(name, []);
      this.listeners.get(name).push(handler);
    }
    dispatch(name, properties = {}) {
      const event = {
        target: this,
        preventDefault() { this.defaultPrevented = true; },
        stopPropagation() { this.propagationStopped = true; },
        ...properties
      };
      for (const handler of this.listeners.get(name) || []) handler(event);
      return event;
    }
  }
  class Video extends Element {
    constructor() {
      super("video");
      this.readyState = 0;
      this.duration = NaN;
      this.currentTime = 0;
      this.paused = true;
      this.playCalls = 0;
      this.playResults = [];
    }
    set src(value) { this.setAttribute("src", value); }
    get src() { return this.getAttribute("src"); }
    play() {
      this.playCalls += 1;
      this.paused = false;
      return this.playResults.shift() || Promise.resolve();
    }
    pause() { this.paused = true; }
    load() { this.error = null; this.readyState = 0; }
  }
  const cards = sources.map((src, index) => {
    const card = new Element("article");
    card.dataset = { previewSrc: src };
    card.thumbnail = new Element();
    card.title = new Element("h2");
    card.title.textContent = `Video ${index + 1}`;
    card.append(card.thumbnail);
    card.append(card.title);
    card.querySelector = selector => selector === "h2" ? card.title : card.thumbnail;
    return card;
  });
  const document = new Element();
  document.querySelectorAll = () => cards;
  document.createElement = tag => tag === "video" ? new Video() : new Element(tag);
  const window = new Element();
  window.matchMedia = () => ({ matches: reducedMotion });
  let observer;
  window.IntersectionObserver = class {
    constructor(callback) { observer = callback; }
    observe() {}
  };
  const timers = new Map();
  let nextTimer = 0;
  const context = {
    document, window, navigator: { connection: { saveData } },
    IntersectionObserver: window.IntersectionObserver,
    setTimeout(callback, delay) {
      const id = ++nextTimer;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id) { timers.delete(id); }
  };
  vm.runInNewContext(source, context);
  for (const card of cards) {
    card.video = card.thumbnail.children.find(child => child.tag === "video");
    card.status = card.thumbnail.children.find(child => child.tag === "span");
    card.button = card.children.find(child => child.tag === "button");
    card.click = () => card.button.dispatch("click");
    card.ready = (duration = 30) => {
      card.video.duration = duration;
      card.video.readyState = 1;
      card.video.dispatch("loadedmetadata");
      card.video.dispatch("playing");
    };
  }
  return {
    cards, document, window, timers,
    flushHover() {
      const callbacks = [...timers.values()];
      timers.clear();
      for (const { callback } of callbacks) callback();
    },
    leaveScreen(card) { observer([{ target: card, isIntersecting: false }]); }
  };
}

test("all five cards use their matching local media files", () => {
  assert.deepEqual(sources, [
    "assets/videos/messi-barcelona-preview.mp4", "videos/vid1.mp4",
    "assets/videos/messi-argentina-preview.mp4", "assets/videos/batman-preview.mp4",
    "assets/videos/ronaldo-messi-preview.mp4"
  ]);
  for (const src of sources) assert.ok(fs.statSync(path.join(root, src)).size > 0);
});

test("initialization creates accessible controls without loading any video", () => {
  for (const card of setup().cards) {
    assert.equal(card.video.src, undefined);
    assert.equal(card.video.preload, "none");
    assert.equal(card.button.getAttribute("aria-pressed"), "false");
    assert.ok(card.button.getAttribute("aria-label").includes(card.title.textContent));
    assert.ok(card.children.includes(card.button));
    assert.ok(card.status.hidden);
  }
});

test("a quick hover leaves the media unloaded", () => {
  const app = setup();
  const card = app.cards[0];
  card.dispatch("pointerenter", { pointerType: "mouse" });
  assert.equal([...app.timers.values()][0].delay, 350);
  assert.equal(card.video.playCalls, 0);
  card.dispatch("pointerleave");
  app.flushHover();
  assert.equal(card.video.src, undefined);
});

test("hover plays muted inline video and reveals it only when playing", () => {
  const app = setup();
  const card = app.cards[0];
  card.dispatch("pointerenter", { pointerType: "mouse" });
  app.flushHover();
  assert.equal(card.video.src, sources[0]);
  assert.ok(card.video.muted && card.video.defaultMuted && card.video.playsInline);
  assert.equal(card.classList.contains("is-previewing"), false);
  card.ready();
  assert.ok(card.classList.contains("is-previewing"));
  assert.equal(card.status.textContent, "Без звука");
  card.dispatch("pointerleave");
  assert.ok(card.video.paused);
  assert.equal(card.classList.contains("is-previewing"), false);
  assert.ok(card.status.hidden);
});

test("starting a second card stops the first", () => {
  const { cards: [first, second] } = setup();
  first.click(); first.ready();
  second.click(); second.ready();
  assert.ok(first.video.paused);
  assert.equal(first.button.getAttribute("aria-pressed"), "false");
  assert.equal(second.video.paused, false);
});

test("the explicit button toggles playback and prevents link activation", () => {
  const card = setup().cards[1];
  const event = card.click();
  assert.ok(event.defaultPrevented && event.propagationStopped);
  assert.equal(card.button.getAttribute("aria-pressed"), "true");
  card.click();
  assert.ok(card.video.paused);
  assert.equal(card.button.getAttribute("aria-pressed"), "false");
});

for (const options of [{ reducedMotion: true }, { saveData: true }, { touch: true }]) {
  test(`automatic playback respects ${JSON.stringify(options)} but permits a button click`, () => {
    const app = setup(options);
    const card = app.cards[0];
    card.dispatch("pointerenter", { pointerType: options.touch ? "touch" : "mouse" });
    app.flushHover();
    assert.equal(card.video.playCalls, 0);
    card.click();
    assert.equal(card.video.playCalls, 1);
  });
}

test("long previews cycle through three excerpts and restart from the first", () => {
  const card = setup().cards[0];
  card.click(); card.ready(30);
  assert.equal(card.video.currentTime, 3);
  for (const [end, next] of [[6, 12], [15, 21], [24, 3]]) {
    card.video.currentTime = end;
    card.video.dispatch("timeupdate");
    assert.equal(card.video.currentTime, next);
  }
});

test("short clips loop in full and ended playback restarts", () => {
  const card = setup().cards[2];
  card.click(); card.ready(6.486);
  assert.equal(card.video.currentTime, 0);
  card.video.currentTime = 6.486;
  card.video.dispatch("timeupdate");
  assert.equal(card.video.currentTime, 0);
  card.video.dispatch("ended");
  assert.equal(card.video.playCalls, 2);
});

test("fragmented MP4s recover from an initially unknown duration", () => {
  const card = setup().cards[1];
  card.click(); card.ready(0);
  card.video.currentTime = 9;
  card.video.dispatch("timeupdate");
  assert.equal(card.video.currentTime, 0);
  card.video.duration = 100;
  card.video.dispatch("durationchange");
  assert.equal(card.video.currentTime, 10);
});

test("hidden tabs stop playback and cancel pending hovers", () => {
  const app = setup();
  app.cards[0].click(); app.cards[0].ready();
  app.cards[1].dispatch("pointerenter", { pointerType: "mouse" });
  app.document.hidden = true;
  app.document.dispatch("visibilitychange");
  app.flushHover();
  assert.ok(app.cards[0].video.paused);
  assert.equal(app.cards[1].video.playCalls, 0);
  app.cards[2].click();
  assert.equal(app.cards[2].video.playCalls, 0);
});

test("Escape, pagehide and scrolling out of view stop the preview", () => {
  for (const action of [
    app => app.document.dispatch("keydown", { key: "Escape" }),
    app => app.window.dispatch("pagehide"),
    app => app.document.dispatch("crysplay:feedchange"),
    app => app.leaveScreen(app.cards[0])
  ]) {
    const app = setup();
    app.cards[0].click(); app.cards[0].ready();
    action(app);
    assert.ok(app.cards[0].video.paused);
    assert.equal(app.cards[0].classList.contains("is-previewing"), false);
  }
});

test("focus moving inside a card preserves playback; leaving stops it", () => {
  const card = setup().cards[0];
  card.click(); card.ready();
  card.dispatch("focusout", { relatedTarget: card.button });
  assert.equal(card.video.paused, false);
  card.dispatch("focusout", { relatedTarget: null });
  assert.ok(card.video.paused);
});

test("media errors preserve the poster and allow retrying", async () => {
  const card = setup().cards[0];
  card.video.playResults.push(Promise.reject(new Error("Playback unavailable")));
  card.click();
  await Promise.resolve();
  assert.equal(card.button.getAttribute("aria-pressed"), "false");
  assert.equal(card.classList.contains("is-previewing"), false);
  assert.equal(card.status.hidden, false);
  card.video.error = { code: 2 };
  card.click();
  assert.equal(card.video.error, null);
  card.ready();
  assert.ok(card.classList.contains("is-previewing"));
  card.video.dispatch("error");
  assert.ok(card.video.paused);
});

test("an old rejected play request cannot cancel a later request", async () => {
  const card = setup().cards[0];
  let rejectOld;
  card.video.playResults.push(new Promise((resolve, reject) => { rejectOld = reject; }));
  card.click(); card.click(); card.click(); card.ready();
  rejectOld(new Error("Old play request was interrupted"));
  await Promise.resolve();
  assert.equal(card.button.getAttribute("aria-pressed"), "true");
  assert.ok(card.classList.contains("is-previewing"));
  assert.equal(card.video.paused, false);
});
