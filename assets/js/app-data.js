"use strict";

// Общие данные и локальное хранилище главной страницы и мессенджера.
window.CrysPlay = (() => {
  const videos = [
    {
      id: "messi-barcelona", title: "Месси в «Барселоне»: голы и незабываемые празднования",
      channel: "Football Stories", avatar: "F", stats: "128 тыс. просмотров · 2 дня назад", duration: "10:24",
      image: "assets/images/messi-barcelona.jpg", alt: "Лионель Месси празднует гол в форме Барселоны",
      previewSrc: "assets/videos/messi-barcelona-preview.mp4", categories: ["football"],
      keywords: "messi barcelona messi футбол барселона"
    },
    {
      id: "costa-rica", title: "COSTA RICA IN 4K 60fps HDR (ULTRA HD)",
      channel: "Jacob + Katie Schwarz", avatar: "8", stats: "31 тыс. просмотров · 1 день назад", duration: "12:08",
      image: "assets/images/vid1.png", alt: "Река и облака в Коста-Рике",
      previewSrc: "videos/vid1.mp4", watchUrl: "videos/video-1.html", categories: ["nature", "4k"],
      keywords: "коста рика природа путешествия costa rica 4k hdr"
    },
    {
      id: "messi-argentina", title: "Лионель Месси: лучшие моменты за сборную Аргентины",
      channel: "Argentina Highlights", avatar: "A", stats: "204 тыс. просмотров · 3 дня назад", duration: "08:35",
      image: "assets/images/messi-argentina.jpg", alt: "Лионель Месси в форме сборной Аргентины",
      previewSrc: "assets/videos/messi-argentina-preview.mp4", categories: ["football"],
      keywords: "lionel messi argentina леонель лионель месси аргентина футбол"
    },
    {
      id: "batman", title: "The Batman: Does Riddler Actually KNOW Batman = Bruce?",
      channel: "New Rockstars", avatar: "N", stats: "94 тыс. просмотров · 1 день назад", duration: "15:37",
      image: "assets/images/vid3.webp", alt: "Загадочник из фильма «Бэтмен»",
      previewSrc: "assets/videos/batman-preview.mp4", categories: ["movies"],
      keywords: "бэтмен бетмен загадочник кино фильмы batman riddler bruce"
    },
    {
      id: "ronaldo-messi", title: "Роналду и Месси: два пути к вершине футбола",
      channel: "Football Debate", avatar: "F", stats: "312 тыс. просмотров · 5 дней назад", duration: "21:16",
      image: "assets/images/ronaldo-messi.jpg", alt: "Портреты Криштиану Роналду и Лионеля Месси",
      previewSrc: "assets/videos/ronaldo-messi-preview.mp4", categories: ["football"],
      keywords: "cristiano ronaldo lionel messi криштиану роналду месси футбол"
    }
  ];
  const shorts = [
    { id: "barcelona-goal", views: 128000, likes: 12400, comments: 248 },
    { id: "argentina-short", views: 94000, likes: 8700, comments: 156 },
    { id: "riddler-short", views: 204000, likes: 21000, comments: 392 }
  ];
  const contacts = [
    { id: "aliya", name: "Алия", initial: "А", status: "В сети", online: true },
    { id: "daniyar", name: "Данияр", initial: "Д", status: "Был недавно", online: false },
    { id: "marat", name: "Марат", initial: "М", status: "Был недавно", online: false }
  ];
  const initialMessages = {
    aliya: [
      { sender: "them", text: "Привет! Видел подборку с Месси?", time: "16:42" },
      { sender: "me", text: "Привет, только что посмотрел. Очень круто!", time: "16:44" },
      { sender: "them", text: "Да! Особенно момент после гола.", time: "16:45" }
    ],
    daniyar: [
      { sender: "them", text: "Что сейчас смотришь?", time: "15:18" },
      { sender: "me", text: "Коста-Рику в 4K. Красиво снято.", time: "15:19" },
      { sender: "them", text: "Кинь название, посмотрю вечером.", time: "15:20" }
    ],
    marat: [
      { sender: "them", text: "Как тебе разбор «Бэтмена»?", time: "12:10" },
      { sender: "me", text: "Ещё не смотрел, добавил на вечер.", time: "12:11" },
      { sender: "them", text: "Окей, потом обсудим!", time: "12:12" }
    ]
  };
  const keys = { saved: "crysplay.watchLater.v1", messages: "crysplay.messenger.messages.v1" };
  let savedIds = [];
  let savedInMemory = false;
  let history = structuredClone(initialMessages);

  function readStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function getVideo(id) { return videos.find(video => video.id === id); }
  function getContact(id) { return contacts.find(contact => contact.id === id); }

  function normalize(text) {
    return String(text).toLocaleLowerCase("ru-RU").replaceAll("ё", "е")
      .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  }

  function filterVideos({ query = "", category = "all", savedOnly = false, saved = [] } = {}) {
    const words = normalize(query).split(" ").filter(Boolean);
    return videos.filter(video => {
      const searchable = normalize(`${video.title} ${video.channel} ${video.keywords}`);
      return (category === "all" || video.categories.includes(category)) &&
        (!savedOnly || saved.includes(video.id)) && words.every(word => searchable.includes(word));
    });
  }

  function getSavedIds() {
    if (savedInMemory) return [...savedIds];
    const stored = readStorage(keys.saved, savedIds);
    savedIds = Array.isArray(stored) ? [...new Set(stored.filter(id => getVideo(id)))] : [];
    return [...savedIds];
  }

  function toggleSaved(id) {
    if (!getVideo(id)) return null;
    const current = getSavedIds();
    savedIds = current.includes(id) ? current.filter(value => value !== id) : [...current, id];
    const persisted = writeStorage(keys.saved, savedIds);
    savedInMemory = !persisted;
    return { ids: [...savedIds], persisted };
  }

  function validMessage(message) {
    return message && ["me", "them"].includes(message.sender) &&
      typeof message.text === "string" && message.text.trim().length > 0 && message.text.length <= 2000 &&
      typeof message.time === "string" && /^\d{2}:\d{2}$/.test(message.time) &&
      (message.videoId === undefined || Boolean(getVideo(message.videoId)));
  }

  function loadMessages() {
    const stored = readStorage(keys.messages, history);
    const result = structuredClone(initialMessages);
    for (const { id } of contacts) {
      if (Array.isArray(stored?.[id]) && stored[id].every(validMessage)) {
        // Ссылки и изображения берём из каталога, а не из содержимого localStorage.
        result[id] = stored[id].map(message => ({
          sender: message.sender, text: message.text, time: message.time,
          ...(message.videoId ? { videoId: message.videoId } : {})
        }));
      }
    }
    history = result;
    return structuredClone(history);
  }

  function currentTime() {
    return new Intl.DateTimeFormat("ru-RU", {
      hour: "2-digit", minute: "2-digit", timeZone: "Asia/Qyzylorda"
    }).format(new Date());
  }

  function appendMessage(chatId, message, { requirePersistence = false } = {}) {
    if (!getContact(chatId) || !validMessage(message)) return null;
    const next = loadMessages();
    next[chatId].push(message);
    const persisted = writeStorage(keys.messages, next);
    if (persisted || !requirePersistence) history = next;
    return { messages: structuredClone(next), persisted };
  }

  function shareVideo(chatId, videoId) {
    const video = getVideo(videoId);
    if (!video || !getContact(chatId)) return null;
    return appendMessage(chatId, {
      sender: "me", text: `Видео: ${video.title}`, time: currentTime(), videoId
    }, { requirePersistence: true });
  }

  return { videos, shorts, contacts, keys, getVideo, getContact, filterVideos,
    getSavedIds, toggleSaved, loadMessages, appendMessage, shareVideo, currentTime };
})();
