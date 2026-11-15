# CrysPlay

CrysPlay is a responsive front-end video platform built with HTML, CSS, Bootstrap
and browser JavaScript. It includes a local recommendation feed, PeerTube Discover,
video previews, messaging, a sign-in prototype and Creator Studio.

Repository: [haittsu/web-tech.-midterm-project](https://github.com/haittsu/web-tech.-midterm-project).
The published site URL should be added here after the team's deployment.

## Team responsibilities

Original team credits: `mx tole abil`.

| Member | Responsibility |
| --- | --- |
| 1 | Homepage, Discover, PeerTube integration, the Video class and shared video contract |
| 2 (Maksat) | Dynamic watch page, user-specific playlists, playlist CRUD and localStorage |
| 3 | Video-open history and Studio statistics based on that history |

This update implements Member 1's scope. The dynamic PeerTube watch page, playlist
CRUD and history-based statistics remain integration tasks for the other members.
Existing Studio changes are preserved.

## Run locally

No build or dependency installation is required. Open `index.html` with VS Code
Live Server, or serve this folder with a local static HTTP server, for example:

```sh
python -m http.server 8000
```

Visit `http://localhost:8000`. Use HTTP rather than `file://` so the homepage and
Messenger share the same origin and browser storage. The homepage allows guest
browsing; saving a Discover video to a playlist asks guests to sign in.

## Implemented features

### PeerTube Discover and the Video class

Discover appears below the existing recommendations. `fetchVideos()` uses
`fetch`, `async/await`, `response.ok`, JSON parsing and the response's `data` array
to load up to 12 public videos from:

`https://video.blender.org/api/v1/videos?count=12&sort=-publishedAt`

Each API record becomes a `Video` instance. Its `formatDuration()` method formats
125 seconds as `2:05`, including an hours component for longer videos. Cards show
the thumbnail, title, channel, duration, Open and Save to Playlist actions.
The local feed and Discover reuse the same card template and metadata renderer.
Remote cards do not receive local MP4 preview controls.

The UI handles loading, success, empty results, network/HTTP/JSON errors and a
15-second timeout. Retry requests the API again. Missing or failed thumbnails
use a neutral local placeholder. API titles are inserted with `textContent`.
No API key or backend is needed.

Open links point inside CrysPlay: `videos/video-1.html?id=<uuid>`. Costa Rica
keeps `videos/video-1.html` without a parameter. URLs preserve the project
subdirectory on GitHub Pages.

Save to Playlist passes the selected object to `window.saveToPlaylist(video)`
when Member 2's hook is available. Until then, an unavailable message is shown;
Discover does not claim that the video was saved. It does not record history.

See [Discover integration handoff](docs/discover-integration.md) for the shared
six-field object, two verified UUIDs, example objects and integration instructions.
The dynamic watch page and playlist picker must be connected by Member 2 before
the remote Open/Save workflow is complete.

API reference: [PeerTube Video API](https://docs.joinpeertube.org/api-rest-reference/api/video.html).

### Local video previews

The five existing local recommendation cards keep their previews. Hover for
350 ms to play muted excerpts; leaving the card restores the thumbnail.
The Preview button works with touch and keyboard. Escape, hidden tabs, filtering
and scrolling a card out of view stop playback. Only one preview plays at a time.
Reduced-motion and data-saving preferences disable automatic hover playback.
Clips up to 10 seconds loop in full; longer clips show three 3-second excerpts.

Media loads only after preview activation. Four supplied clips are in
`assets/videos/`; Costa Rica uses `videos/vid1.mp4`.

### Search, categories and Watch Later

The existing search and category filters operate on the five local recommendations,
independently of Discover. Search matches titles, channels and keywords in Russian
and English. Categories combine with search and the Watch Later filter. There are
currently no local Challenge videos, so that category has an empty state.

Watch Later supports adding/removing videos, a counter and persistence across
reloads. It is the existing local saved list, separate from Member 2's playlists.

### Messenger and existing pages

Send to Chat selects Aliya, Daniyar or Marat and adds a video card to the local
conversation. Existing text messages remain. The notification opens the selected
chat, and storage events update an already open Messenger tab. Conversation data
is local to this browser; no message is sent to another real user.

Costa Rica opens the existing watch page. Other local recommendation links open
the supplied MP4 excerpts. The existing sign-in validation, video-page interactions
and Studio remain part of the team project.

## Test the interface

1. Open the homepage. Check the original five cards, a Costa Rica preview, search,
   categories and Watch Later.
2. Scroll to Discover. Observe loading, then up to 12 live cards. Check duration
   labels, thumbnails and internal Open links. Refresh the catalog.
3. In browser developer tools, block the PeerTube request or go offline and click
   Refresh. The error and Retry button should appear; local recommendations must
   still work. Restore the network and click Retry.
4. To test an empty response, override the list endpoint with `{ "data": [] }`.
   Discover should show its empty state, with no fabricated replacement videos.
5. As a guest, click Save to Playlist and check the sign-in prompt. With a signed-in
   user, connect Member 2's `saveToPlaylist(video)` and check the selected object.
6. Once Member 2 finishes the watch page, open both UUIDs from the handoff, verify
   their different metadata and playback, then repeat on the published site.
7. Save local videos, refresh, reopen Watch Later and remove them. Share different
   videos to two chats, refresh Messenger and send a normal text message.

## Automated checks

Node.js is needed only to run the tests:

```sh
node --test tests/*.test.cjs
```

Tests cover API parsing, model normalization, durations, URL generation under a
project subdirectory, Discover states/retries, playlist-hook behavior, local
filtering/storage, chat history and preview lifecycle. Mocked DOM/media tests
supplement browser checks; they do not verify actual media decoding or remote
iframe playback.

## Project structure

```text
index.html                       Homepage, local feed and Discover
assets/js/app-data.js            Existing local catalog, contacts and storage
assets/js/video.js               Shared Video model and internal URL generation
assets/js/feed.js                Local feed and shared card renderer
assets/js/discover.js            PeerTube requests, states and playlist hook
assets/js/video-previews.js      Existing local preview lifecycle
assets/js/user-state.js          Existing user/profile prototype
assets/css/style.css             Shared responsive styles
assets/videos/                   Supplied local preview clips
messenger/                       Local Messenger
login/                           Existing sign-in prototype
studio/                          Existing Creator Studio
videos/                          Existing watch page and Costa Rica MP4
docs/discover-integration.md      Member 1 handoff for the team
tests/                           Node.js checks
```

## Notes

This is a front-end educational project. Account state, messages and saved lists
use browser storage, not a production authentication or messaging service. PeerTube
availability depends on the external Blender instance. Some existing pages load
Bootstrap, Bootstrap Icons or jQuery from CDNs and need an internet connection.
