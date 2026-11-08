const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const source = fs.readFileSync(path.join(__dirname, "../assets/js/app-data.js"), "utf8");
function storage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
}
function load(localStorage = storage()) {
  const context = { window: {}, localStorage, structuredClone };
  vm.runInNewContext(source, context);
  return context.window.CrysPlay;
}
const ids = videos => Array.from(videos, video => video.id);
const plain = value => JSON.parse(JSON.stringify(value));

test("search matches Russian aliases, English titles and channels regardless of case", () => {
  const app = load();
  assert.deepEqual(ids(app.filterVideos({ query: "МЕССИ" })), ["messi-barcelona", "messi-argentina", "ronaldo-messi"]);
  assert.deepEqual(ids(app.filterVideos({ query: "  costa   RICA " })), ["costa-rica"]);
  assert.deepEqual(ids(app.filterVideos({ query: "new rockstars" })), ["batman"]);
  assert.deepEqual(ids(app.filterVideos({ query: "бетмен" })), ["batman"]);
});

test("query, category and saved-only filtering work together", () => {
  const app = load();
  assert.equal(app.filterVideos().length, 5);
  assert.equal(app.filterVideos({ category: "football" }).length, 3);
  assert.deepEqual(ids(app.filterVideos({ category: "4k" })), ["costa-rica"]);
  assert.equal(app.filterVideos({ category: "challenges" }).length, 0);
  assert.equal(app.filterVideos({ query: "месси", category: "nature" }).length, 0);
  assert.deepEqual(ids(app.filterVideos({ query: "месси", category: "football", savedOnly: true, saved: ["messi-argentina", "costa-rica"] })), ["messi-argentina"]);
  assert.equal(app.filterVideos({ query: "<script>nothing</script>" }).length, 0);
});

test("watch later persists, avoids duplicates, and removes selected entries", () => {
  const local = storage();
  const first = load(local);
  first.toggleSaved("messi-barcelona");
  first.toggleSaved("batman");
  const reloaded = load(local);
  assert.deepEqual(plain(reloaded.getSavedIds()), ["messi-barcelona", "batman"]);
  reloaded.toggleSaved("messi-barcelona");
  assert.deepEqual(plain(first.getSavedIds()), ["batman"]);
  assert.equal(reloaded.toggleSaved("unknown"), null);
});

test("malformed storage and unknown or duplicate IDs are handled safely", () => {
  const local = storage();
  const app = load(local);
  local.setItem(app.keys.saved, "not JSON");
  assert.deepEqual(plain(app.getSavedIds()), []);
  local.setItem(app.keys.saved, JSON.stringify(["batman", "batman", "unknown", null, {}]));
  assert.deepEqual(plain(app.getSavedIds()), ["batman"]);
  local.setItem(app.keys.messages, JSON.stringify({ aliya: [{ sender: "me", text: "bad", time: "16:00", videoId: "javascript:alert(1)" }] }));
  assert.equal(app.loadMessages().aliya.length, 3);
});

test("sharing sends the selected video only to the selected contact and survives reload", () => {
  const local = storage();
  const app = load(local);
  const result = app.shareVideo("daniyar", "batman");
  assert.ok(result.persisted);
  const history = load(local).loadMessages();
  assert.equal(history.daniyar.length, 4);
  assert.equal(history.daniyar.at(-1).videoId, "batman");
  assert.equal(history.daniyar.at(-1).sender, "me");
  assert.match(history.daniyar.at(-1).text, /Batman/);
  assert.equal(history.aliya.length, 3);
  assert.equal(history.marat.length, 3);
  assert.equal(app.shareVideo("__proto__", "batman"), null);
  assert.equal(app.shareVideo("aliya", "missing"), null);
});

test("legacy text messages remain when a video is shared", () => {
  const local = storage();
  const app = load(local);
  const old = { sender: "me", text: "Старое сообщение", time: "18:40" };
  local.setItem(app.keys.messages, JSON.stringify({ aliya: [old] }));
  app.shareVideo("aliya", "costa-rica");
  assert.deepEqual(plain(app.loadMessages().aliya[0]), old);
  assert.equal(app.loadMessages().aliya[1].videoId, "costa-rica");
});

test("a message from an already open tab preserves newly shared videos", () => {
  const local = storage();
  const messenger = load(local);
  messenger.loadMessages();
  load(local).shareVideo("aliya", "messi-argentina");
  const result = messenger.appendMessage("aliya", { sender: "me", text: "Спасибо!", time: "20:15" });
  assert.equal(result.messages.aliya.at(-2).videoId, "messi-argentina");
  assert.equal(result.messages.aliya.at(-1).text, "Спасибо!");
});

test("failed storage writes keep saved items usable in memory", () => {
  const local = storage();
  const app = load(local);
  app.toggleSaved("batman");
  local.setItem = () => { throw new Error("Quota exceeded"); };
  assert.equal(app.toggleSaved("costa-rica").persisted, false);
  assert.deepEqual(plain(app.getSavedIds()), ["batman", "costa-rica"]);
  app.toggleSaved("batman");
  assert.deepEqual(plain(app.getSavedIds()), ["costa-rica"]);
});

test("unavailable storage does not report a shared message as persisted or duplicate it on retry", () => {
  let blocked = true;
  const local = storage();
  const write = local.setItem;
  local.setItem = (...args) => {
    if (blocked) throw new Error("Storage blocked");
    write(...args);
  };
  const app = load(local);
  assert.equal(app.shareVideo("marat", "batman").persisted, false);
  assert.equal(app.loadMessages().marat.length, 3);
  blocked = false;
  app.shareVideo("marat", "batman");
  assert.equal(app.loadMessages().marat.length, 4);
});

test("plain text still works locally when storage access is denied", () => {
  const app = load({
    getItem() { throw new Error("Denied"); },
    setItem() { throw new Error("Denied"); }
  });
  const first = app.appendMessage("aliya", { sender: "me", text: "Раз", time: "20:00" });
  assert.equal(first.persisted, false);
  const second = app.appendMessage("aliya", { sender: "me", text: "Два", time: "20:01" });
  assert.equal(second.messages.aliya.length, 5);
  assert.equal(second.messages.aliya.at(-2).text, "Раз");
});
