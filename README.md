# CrysPlay

CrysPlay is a responsive front-end prototype of a video-sharing platform. It includes a recommendation feed, short-video cards, video playback, messaging, sign-in, and a creator analytics dashboard.

## Features

- Responsive video feed with categories and recommendations
- Shorts section with engagement statistics
- Video player page with channel details, likes, comments, and related videos
- Messenger interface with interactive chat behavior
- Sign-in page with email and social login options
- Creator Studio dashboard with channel metrics and content analytics

## Technologies

- HTML5
- CSS3
- JavaScript
- Bootstrap 5
- Bootstrap Icons

## Project Structure

```text
.
|-- index.html              # Main video feed
|-- assets/                 # Images, icons, shared styles, and Bootstrap files
|-- login/                  # Sign-in page
|-- messenger/              # Messaging interface and JavaScript
|-- studio/                 # Creator analytics dashboard
`-- videos/                 # Video player page and media files
```

## Getting Started

No build step or package installation is required.

1. Clone or download the repository.
2. Open `index.html` in a modern web browser.

For the most reliable experience, serve the project with a local development server. For example, if Python is installed:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000` in your browser.

## Notes

- This project is a front-end demonstration; authentication, search, notifications, and most content actions are not connected to a backend.
- Some pages load Bootstrap and Bootstrap Icons from a CDN, so an internet connection may be required for all styles and icons to appear correctly.
