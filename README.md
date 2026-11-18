# CrysPlay

CrysPlay is a responsive video platform built with HTML, CSS, Bootstrap, JavaScript, and jQuery. It continues the midterm and endterm project with a live video catalog, personal playlists, persistent browser storage, and activity statistics.

Users can discover videos from Blender’s PeerTube instance, open them inside CrysPlay, organize playlists, and review their activity in Studio.


## Team

| Member | Main contribution |
|---|---|
| Abilmansur | Homepage, Discover catalog, PeerTube API integration, and the shared `Video` class |
| Maksat | Dynamic video page, personal playlists, playlist CRUD, and persistent storage |
| Tole | Video-opening history, history storage, and personal statistics in Studio |

## Technologies

- HTML5 and CSS3
- Bootstrap 5
- JavaScript
- jQuery
- Fetch API and `async/await`
- PeerTube REST API
- `localStorage` and JSON

The application runs entirely in the browser. No backend, database, or build step is required.

## Main Features

### Discover

Discover is the main video catalog. It loads up to 12 videos from Blender’s public PeerTube API.

Each card displays a thumbnail, title, channel, duration, and buttons for opening the video or saving it to a playlist.

The catalog includes:

- Loading, success, empty, and error states
- Request timeout handling
- Refresh and Retry controls
- A fallback image for unavailable thumbnails
- Search by video title and channel

Search filters the currently loaded videos without sending a new API request for each query. It ignores letter case and supports queries passed through the homepage URL.

The old local recommendations grid has been removed. The Shorts sidebar remains a static demonstration section.

### Dynamic Video Page

A single page supports both the local Costa Rica video and remote PeerTube videos.

- `videos/video-1.html` opens Costa Rica.
- `videos/video-1.html?id=<uuid>` opens the selected PeerTube video.

For remote videos, the application retrieves metadata and displays the title, description, channel, view count, and embedded player. Failed requests show an error message and a Retry button.

The page also supports likes, subscription state, comments, comment drafts, description visibility, and saving the current video to a playlist.

Video interactions are stored separately for each video. These interaction records are shared within the browser rather than separated by user profile.

### Personal Playlists

Signed-in users can manage their own playlists through the interface.

The playlist feature supports complete CRUD operations:

- **Create:** create a named playlist.
- **Read:** expand a playlist and view its videos.
- **Update:** rename a playlist and add or remove videos.
- **Delete:** delete a playlist.

Users can create a playlist directly from the Save to playlist dialog. Playlist names are trimmed, must contain at least one character, and cannot exceed 100 characters.

The same video cannot be added twice to one playlist. Saved metadata allows playlist contents to remain visible when the external API is unavailable.

### Video History and Studio Statistics

Studio displays the current user’s latest 10 video openings, starting with the most recent event.

Each entry contains the video title, channel, opening time, and an internal link to the video page.

Statistics use the entire saved history:

| Metric | Calculation |
|---|---|
| Video openings | Total number of opening events |
| Unique videos | Number of different video IDs |
| Most opened channel | Channel name with the highest number of opening events |

If channels have equal counts, the channel opened most recently takes priority.

An event is recorded once after the selected video page initializes successfully. Opening the same video again creates another event. Saving a video to a playlist or starting playback does not create additional history events.

For remote videos, initialization means successful metadata validation and creation of the embedded player. History measures page openings rather than confirmed playback or watch duration.

The Clear history button removes only the current user’s history and immediately updates the interface. Empty histories, damaged JSON, and storage failures have dedicated interface states.

Studio also contains sample channel analytics, audience information, content statistics, and comments. These sections are marked as demonstration data and are separate from personal activity.

### Messenger

Messenger provides a local chat interface with three demonstration contacts: Aliya, Daniyar, and Marat.

It supports:

- Text messages up to 2,000 characters
- Enter to send and Shift + Enter for a new line
- Separate temporary drafts for each conversation
- Persistent message history
- Updates between open browser tabs
- Display of previously saved video attachments

Messenger is a browser-based demonstration. Messages are not transmitted to other people or a server.

### Sign-In Prototype

The sign-in page demonstrates email validation, required password input, password visibility controls, and jQuery feedback animations.

The application stores a profile name derived from the email address before `@`. Playlists and history are separated by that name. Addresses with the same email prefix therefore use the same local profile.

Passwords are not stored or verified against a server. Social sign-in and account recovery elements are interface placeholders.

## Final Project Requirements

The project implements the five main final-stage features:

| Requirement | Implementation |
|---|---|
| External API integration | PeerTube catalog and video metadata |
| Object-oriented JavaScript | Shared `Video` class |
| Persistent storage | JSON data stored in `localStorage` |
| Complete CRUD | Personal playlist management |
| Statistics dashboard | Studio activity calculated from video-opening history |

## API Integration

The application uses Blender’s public PeerTube instance:

```text
https://video.blender.org
```

Video catalog:

```http
GET /api/v1/videos?count=12&sort=-publishedAt
```

Video details:

```http
GET /api/v1/videos/{uuid}
```

Requests use `fetch` and `async/await`. The application checks HTTP responses, parses JSON, validates required fields, and handles failures.

Remote players use the video’s `embedPath`, resolved against the Blender instance. No secret API key is required.

### Shared Video Model

The `Video` class provides a consistent representation across Discover, the watch page, playlists, and history.

Its main properties are:

```text
id
title
channel
thumbnailUrl
durationSeconds
watchUrl
```

Its methods include:

- `formatDuration()` — formats duration for display.
- `Video.fromPeerTube()` — converts an API record into a video object.
- `toJSON()` — returns a serializable representation.

Costa Rica uses the ID `costa-rica`. Remote videos use `peertube:<uuid>` internally, while watch-page URLs contain the UUID without the prefix.

Internal URLs preserve the project subdirectory when hosted on GitHub Pages.

## Browser Storage

Structured data is serialized as JSON.

| Storage key | Purpose |
|---|---|
| `crysplay:user` | Current local profile |
| `crysplay:playlists:v1:<encoded-name>` | Playlists belonging to a profile |
| `crysplay:history:v1:<encoded-name>` | Opening history belonging to a profile |
| `crysplay:video-1` | Local Costa Rica interactions |
| `crysplay:peertube:<uuid>` | Interactions for a remote video |
| `crysplay.messenger.messages.v1` | Demonstration conversations |
| `crysplay.watchLater.v1` | Retained data from the earlier Watch Later feature |

Playlists and history are profile-specific. Video interactions and Messenger conversations are browser-wide.

Data remains in the current browser and origin. It is not synchronized between devices, and clearing browser storage removes it.

## Running Locally

Clone the repository:

```bash
git clone https://github.com/haittsu/web-tech.-midterm-project.git
cd web-tech.-midterm-project
```

Serve the project directory with an HTTP server, for example:

```bash
python -m http.server 8000
```

Open:

```text
http://localhost:8000
```

Alternatively, open the project with VS Code Live Server.

Use an HTTP server rather than opening files directly through `file://`. Keep the same hostname and port while working so all pages share the same browser storage.

An internet connection is required for PeerTube content and externally hosted libraries used by some pages.

## Project Structure

```text
index.html                     Homepage and Discover catalog

assets/
  css/
    style.css                  Shared responsive styles
    playlists.css              Shared playlist dialog styles
  js/
    app-data.js                Local catalog and Messenger data
    video.js                   Shared Video class and URL generation
    feed.js                    Shared card renderer and retained feed logic
    discover.js                API loading, search, and Discover cards
    playlists.js               Playlist storage and shared dialogs
    history.js                 History storage and statistics
    user-state.js              Local profile management
    video-previews.js          Retained local preview module
  images/                      Thumbnails and image assets
  videos/                      Retained local preview clips
  vendor/                      Bundled Bootstrap assets

login/                         Sign-in prototype
playlists/                     Personal playlist interface
messenger/                     Local chat interface

studio/
  index.html                   Personal activity and sample analytics
  history.js                   Personal history interface
  history.css                  History interface styles
  scirpt.js                    Sample analytics rendering

videos/
  video-1.html                 Shared watch page
  script.js                    Player, interactions, and history integration
  styles.css                   Watch-page styles
  vid1.mp4                     Local Costa Rica video

tests/                         Automated checks
README.md                      Project documentation
```

The earlier local catalog and preview assets remain available for compatibility with saved data and existing modules. Their recommendation grid, category controls, Watch Later controls, and preview buttons are no longer displayed on the homepage.
