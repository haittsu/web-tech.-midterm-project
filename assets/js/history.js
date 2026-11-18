"use strict";

(() => {
    function getHistoryKey(user) {
        if (!user || typeof user.name !== 'string' || !user.name.trim()) {
            throw new Error('Sign in to use video history.');
        }
        return `crysplay:history:v1:${encodeURIComponent(user.name)}`;
    }

    function normalizeVideo(video) {
        const Video = window.CrysPlayDiscover?.Video;
        if (typeof Video !== 'function') {
            throw new Error('Load video.js before using video history.');
        }

        const model = new Video({
            ...video,
            id: typeof video?.id === 'string' ? video.id.toLowerCase() : video?.id
        });

        return {
            id: model.id,
            title: model.title,
            channel: model.channel,
            watchUrl: model.watchUrl
        };
    }

    function normalizeEvent(event) {
        const fields = ['id', 'title', 'channel', 'watchUrl', 'openedAt'];
        if (!event || !fields.every(field =>
            typeof event[field] === 'string' && event[field].trim()
        ) || !Number.isFinite(Date.parse(event.openedAt))) {
            throw new Error('Saved history contains an invalid event.');
        }

        return { ...normalizeVideo(event), openedAt: event.openedAt };
    }

    function readHistory() {
        const user = window.CrysPlayUser?.getUser();
        if (!user) return [];

        const key = getHistoryKey(user);
        try {
            const saved = localStorage.getItem(key);
            if (saved === null) return [];

            const events = JSON.parse(saved);
            if (!Array.isArray(events)) {
                throw new Error('History must be an array.');
            }

            return events.map(normalizeEvent);
        } catch {
            throw new Error('Could not read saved history. Stored data has not been changed.');
        }
    }

    function requireCurrentUser(user) {
        if (window.CrysPlayUser?.getUser()?.name !== user.name) {
            throw new Error('Your account changed. Please try again.');
        }
    }

    function recordVideoOpen(video) {
        const user = window.CrysPlayUser?.getUser();
        if (!user) return null;

        const event = {
            ...normalizeVideo(video),
            openedAt: new Date().toISOString()
        };
        const events = readHistory();

        events.push(event);
        requireCurrentUser(user);

        try {
            localStorage.setItem(getHistoryKey(user), JSON.stringify(events));
        } catch {
            throw new Error('Could not save video history. Browser storage may be full or unavailable.');
        }

        return event;
    }

    function clearHistory() {
        const user = window.CrysPlayUser?.getUser();
        if (!user) return false;

        requireCurrentUser(user);
        try {
            localStorage.removeItem(getHistoryKey(user));
        } catch {
            throw new Error('Could not clear video history. Browser storage may be unavailable.');
        }

        return true;
    }

    function calculateStats(events) {
        if (!Array.isArray(events)) throw new TypeError('History must be an array.');

        const videoIds = new Set();
        const channels = new Map();

        for (const event of events) {
            videoIds.add(event.id);
            const channel = channels.get(event.channel) || { count: 0, latest: -Infinity };
            channel.count += 1;
            channel.latest = Math.max(channel.latest, Date.parse(event.openedAt));
            channels.set(event.channel, channel);
        }

        let topChannel = null;
        let mostOpens = 0;
        let latestOpening = -Infinity;

        for (const [name, channel] of channels) {
            if (channel.count > mostOpens ||
                (channel.count === mostOpens && channel.latest > latestOpening)) {
                topChannel = name;
                mostOpens = channel.count;
                latestOpening = channel.latest;
            }
        }

        return { totalOpens: events.length, uniqueVideos: videoIds.size, topChannel };
    }

    function getRecentEvents(events, limit = 10) {
        if (!Array.isArray(events)) throw new TypeError('History must be an array.');
        if (!Number.isSafeInteger(limit) || limit < 0) {
            throw new RangeError('The history limit must be a non-negative integer.');
        }

        return [...events].reverse()
            .sort((first, second) => Date.parse(second.openedAt) - Date.parse(first.openedAt))
            .slice(0, limit);
    }

    window.CrysPlayHistory = {
        getHistoryKey, readHistory, recordVideoOpen, clearHistory,
        calculateStats, getRecentEvents
    };
    window.recordVideoOpen = recordVideoOpen;
})();
