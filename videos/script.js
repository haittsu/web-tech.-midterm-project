const videoId = new URLSearchParams(window.location.search).get('id');
const isRemote = videoId !== null;
const remoteId = videoId?.toLowerCase();
const storageKey = isRemote ? 'crysplay:peertube:' + remoteId : 'crysplay:video-1';
let remoteViews = 0;
let initialized = false;
let openingRecorded = false;
const userStorageKey = 'crysplay:user';
let activeUser;
try {
    activeUser = localStorage.getItem(userStorageKey);
} catch {
    // Existing storage error handling below keeps the page usable.
}

function userChanged() {
    try {
        return localStorage.getItem(userStorageKey) !== activeUser;
    } catch {
        return false;
    }
}

window.addEventListener('storage', event => {
    if ((event.key === userStorageKey || event.key === null) && userChanged()) {
        window.location.reload();
    }
});
window.addEventListener('pageshow', () => {
    if (userChanged()) window.location.reload();
});
const likeButton = document.querySelector('.like-button');
const subscribeButton = document.querySelector('.subscribe-button');
const commentForm = document.querySelector('#comment-form');
const commentInput = document.querySelector('#usercomment');
const commentList = document.querySelector('#comment-list');
const interactionStatus = document.querySelector('#interaction-status');
const storageStatus = document.querySelector('#storage-status');
const video = document.querySelector('.video');
const descriptionButton = document.querySelector('#toggle-description');
const description = document.querySelector('#video-description');
const likeAnimation = { scale: 1 };
let viewCounted = false;
let state = { liked: false, subscribed: false, comments: [], draft: '', views: 0, descriptionHidden: false };

try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && typeof saved === 'object') {
        state.liked = saved.liked === true;
        state.descriptionHidden = saved.descriptionHidden === true;
        state.views = Number.isSafeInteger(saved.views) && saved.views >= 0 ? saved.views : 0;
        state.subscribed = saved.subscribed === true;
        state.draft = typeof saved.draft === 'string' ? saved.draft.slice(0, 2000) : '';
        state.comments = Array.isArray(saved.comments) ? saved.comments.filter(comment =>
            comment && typeof comment.text === 'string' && comment.text.trim() &&
            comment.text.length <= 2000 && typeof comment.createdAt === 'string' &&
            Number.isFinite(Date.parse(comment.createdAt))
        ) : [];
    }
} catch {
    storageStatus.textContent = 'Saved activity could not be loaded.';
}

function saveState() {
    // A video tab opened by the previous user must not restore their activity.
    if (userChanged()) {
        window.location.reload();
        return;
    }
    try {
        localStorage.setItem(storageKey, JSON.stringify(state));
        storageStatus.textContent = '';
    } catch {
        storageStatus.textContent = 'Changes are visible here, but could not be saved for your next visit.';
    }
}

function renderDescription(animate = false) {
    descriptionButton.textContent = state.descriptionHidden ? 'Show description' : 'Hide description';
    descriptionButton.setAttribute('aria-expanded', String(!state.descriptionHidden));
    if (typeof window.jQuery === 'function') {
        const duration = animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 200 : 0;
        const panel = window.jQuery(description).stop(true, true);
        if (state.descriptionHidden) panel.slideUp(duration);
        else panel.slideDown(duration);
    } else {
        description.style.display = state.descriptionHidden ? 'none' : '';
    }
}

descriptionButton.addEventListener('click', () => {
    state.descriptionHidden = !state.descriptionHidden;
    renderDescription(true);
    saveState();
});

renderDescription();

function renderActions() {
    const views = isRemote ? remoteViews : state.views;
    document.querySelector('#view-count').textContent = `${views.toLocaleString()} ${views === 1 ? 'view' : 'views'}`;
    likeButton.setAttribute('aria-pressed', String(state.liked));
    document.querySelector('#like-label').textContent = state.liked ? 'Liked' : 'Like';
    document.querySelector('#like-count').textContent = state.liked ? '1 like' : '0 likes';
    subscribeButton.setAttribute('aria-pressed', String(state.subscribed));
    subscribeButton.textContent = state.subscribed ? 'Subscribed' : 'Subscribe';
}

function renderComments() {
    commentList.replaceChildren();
    document.querySelector('#comment-count').textContent = `(${state.comments.length})`;
    if (!state.comments.length) {
        const empty = document.createElement('p');
        empty.className = 'text-muted';
        empty.textContent = 'No comments yet. Be the first to comment!';
        commentList.append(empty);
    }
    state.comments.forEach(comment => {
        const article = document.createElement('article');
        article.className = 'posted-comment';
        const author = document.createElement('strong');
        author.textContent = 'You';
        const time = document.createElement('time');
        time.dateTime = comment.createdAt;
        time.textContent = new Date(comment.createdAt).toLocaleString();
        const text = document.createElement('p');
        text.textContent = comment.text;
        article.append(author, time, text);
        commentList.append(article);
    });
}

function countView() {
    if (viewCounted) return;
    viewCounted = true;
    state.views = Math.min(state.views + 1, Number.MAX_SAFE_INTEGER);
    renderActions();
    saveState();
}

if (!isRemote) video.addEventListener('playing', countView);

function animateLike() {
    // Keep the controls working even if the jQuery CDN is unavailable.
    if (typeof window.jQuery !== 'function') return;
    const animation = window.jQuery(likeAnimation);
    animation.stop(true, true);
    likeAnimation.scale = 1;
    likeButton.style.transform = '';
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const step = scale => { likeButton.style.transform = `scale(${scale})`; };
    animation.animate({ scale: 1.15 }, { duration: 130, step })
        .animate({ scale: 1 }, {
            duration: 180,
            step,
            complete: () => { likeButton.style.transform = ''; }
        });
}

likeButton.addEventListener('click', () => {
    state.liked = !state.liked;
    renderActions();
    saveState();
    animateLike();
});

subscribeButton.addEventListener('click', () => {
    state.subscribed = !state.subscribed;
    renderActions();
    saveState();
});

commentInput.addEventListener('input', () => {
    commentInput.setCustomValidity('');
    interactionStatus.textContent = '';
    state.draft = commentInput.value;
    saveState();
});

commentForm.addEventListener('submit', event => {
    event.preventDefault();
    const text = commentInput.value.trim();
    if (!text) {
        commentInput.setCustomValidity('Please write a comment before posting.');
        commentInput.reportValidity();
        return;
    }
    state.comments.unshift({ text, createdAt: new Date().toISOString() });
    state.draft = '';
    commentInput.value = '';
    saveState();
    renderComments();
    interactionStatus.textContent = 'Comment posted.';
    commentInput.focus();
});

commentInput.value = state.draft;
renderActions();
renderComments();

function recordOpening(model) {
    if (openingRecorded) return;
    openingRecorded = true;
    try {
        if (typeof window.recordVideoOpen === 'function') {
            Promise.resolve(window.recordVideoOpen(model)).catch(() => {
                storageStatus.textContent = 'This opening could not be saved.';
            });
        } else {
            const key = 'crysplay:history';
            const saved = JSON.parse(localStorage.getItem(key) || '[]');
            const history = Array.isArray(saved) ? saved : [];
            history.push({ video: model.toJSON(), openedAt: new Date().toISOString() });
            localStorage.setItem(key, JSON.stringify(history));
        }
    } catch {
        storageStatus.textContent = 'This opening could not be saved.';
    }
}

const { Video, projectRoot } = window.CrysPlayDiscover;
if (!isRemote) {
    initialized = true;
    recordOpening(new Video({
        id: 'costa-rica',
        title: document.querySelector('#video-title').textContent,
        channel: document.querySelector('.channel-name').textContent,
        thumbnailUrl: new URL('assets/images/vid1.png', projectRoot).href,
        durationSeconds: 728
    }));
    if (!video.paused && !video.ended && video.readyState >= 3) countView();
} else {
    video.pause();
    video.removeAttribute('autoplay');
    video.removeAttribute('src');
    video.load();
    const player = document.createElement('div');
    video.replaceWith(player);
    const info = document.querySelector('.video-info');
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'btn btn-outline-secondary';
    retry.textContent = 'Retry';
    retry.addEventListener('click', loadRemoteVideo);

    async function loadRemoteVideo() {
        if (initialized) return;
        info.hidden = true;
        document.title = 'Loading video - CrysPlay';
        status.textContent = 'Loading video...';
        retry.disabled = true;
        player.replaceChildren(status);
        player.setAttribute('aria-busy', 'true');
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
            if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(remoteId)) {
                throw new Error('Invalid UUID');
            }
            const response = await fetch(
                'https://video.blender.org/api/v1/videos/' + encodeURIComponent(remoteId),
                { signal: controller.signal }
            );
            if (!response.ok) throw new Error('Video unavailable');
            const video = await response.json();
            const model = Video.fromPeerTube(video);
            if (video.uuid.toLowerCase() !== remoteId ||
                typeof video.embedPath !== 'string' || !video.embedPath.trim() ||
                !Number.isSafeInteger(video.views) || video.views < 0) {
                throw new Error('Invalid video details');
            }
            const source = new URL(video.embedPath, 'https://video.blender.org');
            if (source.origin !== 'https://video.blender.org' || source.username || source.password) {
                throw new Error('Invalid player URL');
            }
            const iframe = document.createElement('iframe');
            iframe.className = 'video';
            iframe.style.border = '0';
            iframe.src = source.href;
            iframe.title = 'Video player: ' + video.name;
            iframe.allow = 'fullscreen; autoplay; picture-in-picture';
            iframe.allowFullscreen = true;
            document.querySelector('#video-title').textContent = video.name;
            document.title = video.name;
            description.textContent = typeof video.description === 'string' && video.description.trim()
                ? video.description : 'No description available';
            document.querySelector('.channel-name').textContent = video.channel?.displayName || 'PeerTube';
            document.querySelector('.channel-avatar').textContent = model.channel.charAt(0);
            remoteViews = video.views;
            renderActions();
            player.replaceChildren(iframe);
            info.hidden = false;
            initialized = true;
            recordOpening(model);
        } catch {
            document.title = 'Video unavailable - CrysPlay';
            status.textContent = 'This video could not be loaded. Please try again.';
            retry.disabled = false;
            player.replaceChildren(status, retry);
        } finally {
            clearTimeout(timeout);
            player.setAttribute('aria-busy', 'false');
        }
    }

    loadRemoteVideo();
}
