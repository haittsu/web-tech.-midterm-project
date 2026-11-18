"use strict";

(() => {
    const section = document.getElementById('personal-activity');
    if (!section) return;

    const list = document.getElementById('history-list');
    const empty = document.getElementById('history-empty');
    const emptyMessage = document.getElementById('history-empty-message');
    const emptyLink = document.getElementById('history-empty-link');
    const errorMessage = document.getElementById('history-error');
    const status = document.getElementById('history-status');
    const summary = document.getElementById('history-summary');
    const clearButton = document.getElementById('clear-history');
    const numbers = new Intl.NumberFormat('en');
    const dates = new Intl.DateTimeFormat('en', {
        dateStyle: 'medium', timeStyle: 'short'
    });
    let renderedUser = null;

    function currentUser() {
        return window.CrysPlayUser?.getUser() || null;
    }

    function historyStore() {
        const store = window.CrysPlayHistory;
        if (!store) throw new Error('Video history is unavailable. Please reload the page.');
        return store;
    }

    function renderStats(stats) {
        for (const element of section.querySelectorAll('[data-history-stat]')) {
            const metric = element.dataset.historyStat;
            element.textContent = !stats ? '—' : metric === 'topChannel'
                ? stats.topChannel || '—'
                : numbers.format(stats[metric]);
        }
    }

    function renderHistory(events) {
        const fragment = document.createDocumentFragment();

        for (const event of events) {
            const item = document.createElement('li');
            item.className = 'history-item';

            const details = document.createElement('div');
            details.className = 'history-video';
            const title = document.createElement('a');
            title.className = 'history-title';
            title.href = event.watchUrl;
            title.textContent = event.title;
            const channel = document.createElement('span');
            channel.className = 'history-channel';
            channel.textContent = event.channel;
            details.append(title, channel);

            const time = document.createElement('time');
            time.className = 'history-time';
            time.dateTime = event.openedAt;
            time.textContent = dates.format(new Date(event.openedAt));

            item.append(details, time);
            fragment.append(item);
        }

        list.replaceChildren(fragment);
    }

    function showError(error) {
        errorMessage.textContent = error instanceof Error
            ? error.message : 'Could not update your video history. Please try again.';
        errorMessage.hidden = false;
    }

    function refreshHistory(message = '') {
        status.textContent = message;
        errorMessage.hidden = true;
        errorMessage.textContent = '';
        empty.hidden = true;
        list.replaceChildren();
        clearButton.disabled = true;
        let user = null;

        try {
            user = currentUser();
            renderedUser = user?.name || null;

            if (!user) {
                renderStats({ totalOpens: 0, uniqueVideos: 0, topChannel: null });
                emptyMessage.textContent = 'Sign in to save your video history and see personal statistics.';
                emptyLink.textContent = 'Sign in';
                emptyLink.href = '../login/index.html';
                empty.hidden = false;
                summary.textContent = 'Your personal activity will appear here after you sign in.';
                return;
            }

            const store = historyStore();
            const events = store.readHistory();
            const stats = store.calculateStats(events);
            const recentEvents = store.getRecentEvents(events, 10);

            renderStats(stats);
            renderHistory(recentEvents);
            clearButton.disabled = events.length === 0;

            if (events.length === 0) {
                emptyMessage.textContent = 'No video openings yet.';
                emptyLink.textContent = 'Browse videos';
                emptyLink.href = '../index.html';
                empty.hidden = false;
                summary.textContent = 'Your latest 10 openings will appear here.';
            } else {
                const openings = events.length === 1 ? 'opening' : 'openings';
                summary.textContent = `Showing the latest ${recentEvents.length} of ${numbers.format(events.length)} ${openings}. Statistics include your full history.`;
            }
        } catch (error) {
            renderStats(null);
            summary.textContent = 'Your saved history has not been changed.';
            // Keep clearing available so a signed-in user can remove damaged JSON.
            clearButton.disabled = !user || !window.CrysPlayHistory;
            showError(error);
        }
    }

    clearButton.addEventListener('click', () => {
        try {
            const user = currentUser();
            if (!user || user.name !== renderedUser) {
                refreshHistory('Your account changed. Review the current history before clearing it.');
                return;
            }

            clearButton.disabled = true;
            if (!historyStore().clearHistory()) {
                refreshHistory('Your account changed. Review the current history before clearing it.');
                return;
            }
            refreshHistory('History cleared.');
        } catch (error) {
            clearButton.disabled = false;
            showError(error);
        }
    });

    window.addEventListener('storage', event => {
        try {
            const user = currentUser();
            const key = user ? historyStore().getHistoryKey(user) : null;
            if (event.key === null || event.key === 'crysplay:user' || event.key === key) {
                refreshHistory();
            }
        } catch {
            refreshHistory();
        }
    });
    window.addEventListener('pageshow', () => refreshHistory());
    window.addEventListener('focus', () => refreshHistory());
    refreshHistory();
})();
