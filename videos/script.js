const storageKey = 'crysplay:video-1';
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
    document.querySelector('#view-count').textContent = `${state.views.toLocaleString()} ${state.views === 1 ? 'view' : 'views'}`;
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

video.addEventListener('playing', countView);

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

if (!video.paused && !video.ended && video.readyState >= 3) countView();
