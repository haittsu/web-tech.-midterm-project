# Discover integration handoff

This file covers Member 1's contract. The video page, playlist CRUD and history
belong to Members 2 and 3 and are not implemented by Discover.

## Shared video object

Load `assets/js/video.js` after `app-data.js` on the homepage. Other pages can
load `../assets/js/video.js` independently. The public class is
`window.CrysPlayDiscover.Video` (also exposed as `window.CrysPlay.Video` when the
shared app is loaded).

Every `Video` has these six serializable fields:

```js
const uuid = "ae644b29-9e31-47f8-af40-f5d52d1f787f";
const video = {
  id: `peertube:${uuid}`,
  title: "Grease Pencil + Performance | Blender Today LIVE #293",
  channel: "Blender",
  thumbnailUrl: "https://video.blender.org/lazy-static/thumbnails/2434961c-7d2b-4170-977e-160d0d98c57f.jpg",
  durationSeconds: 4036,
  watchUrl: window.CrysPlayDiscover.buildWatchUrl(uuid)
};
```

`watchUrl` is an absolute, same-origin URL under the actual project directory.
For example, a page served under `/web-tech.-midterm-project/` links to
`/web-tech.-midterm-project/videos/video-1.html?id=<uuid>`, not `/videos/...`.
The base comes from the loaded `video.js` URL, not a hard-coded deployment host.

`JSON.stringify(videoInstance)` uses `toJSON()` and produces only those six fields.
The `formatDuration()` instance method returns `2:05` for 125 seconds and
`1:07:16` for 4036 seconds. Missing or invalid durations display `0:00`.

## Two verified PeerTube videos

The public list and both detail requests returned HTTP 200 on November 15, 2026.

| UUID | Title | Duration |
| --- | --- | --- |
| `ae644b29-9e31-47f8-af40-f5d52d1f787f` | Grease Pencil + Performance &#124; Blender Today LIVE #293 | 4036 seconds |
| `8c02afe6-47c2-4a21-9155-f165f9696f4c` | Bobbypills: An Adult Animation studios journey to CG | 2305 seconds |

Detail endpoints:

- `https://video.blender.org/api/v1/videos/ae644b29-9e31-47f8-af40-f5d52d1f787f`
- `https://video.blender.org/api/v1/videos/8c02afe6-47c2-4a21-9155-f165f9696f4c`

The returned embed paths are `/videos/embed/nx1wznhoLPVqdYobHJCdkz` and
`/videos/embed/ihLvvRhaSLhtvVZtRBVvFb`. Member 2 should read `embedPath` from the
current detail response instead of hard-coding these examples.

The newest list can change; these examples do not replace live API loading.

## Member 2: watch page

- Read the raw UUID from `new URLSearchParams(location.search).get("id")`.
- No `id` means Costa Rica; keep its `costa-rica` ID and existing storage key.
- API video IDs in saved objects include `peertube:`; the query parameter does not.
- Request details from Blender and initialize the player on `videos/video-1.html`.
- Use `video.watchUrl` directly for links from playlists and history.

A local Costa Rica object can be created with:

```js
const { Video, projectRoot } = window.CrysPlayDiscover;
const costaRica = new Video({
  id: "costa-rica",
  title: "COSTA RICA IN 4K 60fps HDR (ULTRA HD)",
  channel: "Jacob + Katie Schwarz",
  thumbnailUrl: new URL("assets/images/vid1.png", projectRoot).href,
  durationSeconds: 728
});
```

Its `watchUrl` points to `videos/video-1.html` without an `id` parameter.

## Member 2: playlist hook

Provide `window.saveToPlaylist(video)` in a shared script loaded on the homepage
and watch page. Discover checks for this function when the user clicks Save, so
the script can be loaded after Discover as well.

- The argument is the selected `Video` instance with the six fields above.
- The hook owns the playlist picker, user-specific persistence and duplicate checks.
- It may return a promise. Resolve to `true` or `{ saved: true }` to request a
  Discover success message. Return `false`, `{ cancelled: true }` or `undefined`
  for cancellation or when the picker owns its own UI.
- Reject on failure; Discover displays an error and re-enables the button.
- Discover checks `CrysPlayUser.getUser()` first. Guests receive a sign-in link.

Until this hook exists, Discover displays an unavailable message and makes no
playlist changes. It does not substitute the old Watch Later list for playlists.

## Member 3: opening history

Discover only navigates to `watchUrl`. It never calls `recordVideoOpen(video)`.
Only Member 2's watch page should call that function after successful video
initialization, once per page visit.

## Verification still required for the integrated team project

- Member 2 must connect the dynamic watch page and real playlist picker.
- Member 3 must connect history and Studio statistics.
- After deployment, repeat the two-video playback check on the actual published
  site and verify the complete Discover-to-playlist-to-Studio workflow.
