"use strict";

(() => {
  const app = window.CrysPlay;
  const grid = document.querySelector(".video-grid");
  const template = document.getElementById("video-card-template");
  const search = document.getElementById("video-search");
  const categoryButtons = document.querySelectorAll("[data-category]");
  const savedToggle = document.getElementById("watch-later-toggle");
  const emptyState = document.getElementById("feed-empty");
  const resultCount = document.getElementById("result-count");
  const dialog = document.getElementById("share-dialog");
  const recipient = document.getElementById("share-recipient");
  const shareError = document.getElementById("share-error");
  const shareSubmit = document.getElementById("share-submit");
  const notice = document.getElementById("feed-notice");
  const state = { query: new URLSearchParams(location.search).get("q") || "", category: "all", savedOnly: false };
  const cards = new Map();
  let selectedVideoId = null;

  function showNotice(message, chatId) {
    document.getElementById("notice-text").textContent = message;
    const link = document.getElementById("notice-link");
    link.hidden = !chatId;
    if (chatId) link.href = `messenger/index.html?chat=${encodeURIComponent(chatId)}`;
    notice.hidden = false;
  }

  function createVideoCard(video) {
    const column = template.content.firstElementChild.cloneNode(true);
    const card = column.querySelector(".video-card");
    card.id = `video-${video.id}`;
    card.dataset.videoId = video.id;
    card.dataset.previewSrc = video.previewSrc;
    const link = column.querySelector(".video-link");
    link.href = video.watchUrl || video.previewSrc;
    link.setAttribute("aria-label", `${video.watchUrl ? "Смотреть видео" : "Открыть фрагмент"}: ${video.title}`);
    const image = column.querySelector("img");
    image.src = video.image;
    image.alt = video.alt;
    column.querySelector("h2").textContent = video.title;
    column.querySelector(".channel-name").textContent = video.channel;
    column.querySelector(".channel-avatar").textContent = video.avatar;
    column.querySelector(".video-stats").textContent = video.stats;
    column.querySelector(".duration").textContent = video.duration;
    const saveButton = column.querySelector(".save-video");
    saveButton.addEventListener("click", () => {
      const result = app.toggleSaved(video.id);
      updateResults();
      const saved = result.ids.includes(video.id);
      showNotice((saved ? "Добавлено в «Смотреть позже»." : "Удалено из «Смотреть позже».") +
        (result.persisted ? "" : " Не удалось сохранить список после закрытия страницы."));
      // При удалении из сохранённого списка кнопка исчезает вместе с карточкой.
      if (column.hidden) savedToggle.focus();
    });
    column.querySelector(".share-video").addEventListener("click", () => openShare(video));
    cards.set(video.id, { column, saveButton });
    return column;
  }

  function updateResults() {
    const saved = app.getSavedIds();
    const visible = new Set(app.filterVideos({ ...state, saved }).map(video => video.id));
    // Остановить и отложенные запуски, и видео карточек, скрытых фильтром.
    document.dispatchEvent(new Event("crysplay:feedchange"));
    for (const [id, { column, saveButton }] of cards) {
      column.hidden = !visible.has(id);
      const selected = saved.includes(id);
      saveButton.textContent = selected ? "✓ Сохранено" : "+ Смотреть позже";
      saveButton.setAttribute("aria-pressed", String(selected));
      saveButton.setAttribute("aria-label", `${selected ? "Удалить из" : "Добавить в"} «Смотреть позже»: ${app.getVideo(id).title}`);
    }
    for (const button of categoryButtons) {
      const selected = button.dataset.category === state.category;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    }
    document.getElementById("watch-later-count").textContent = String(saved.length);
    savedToggle.setAttribute("aria-pressed", String(state.savedOnly));
    document.getElementById("recommendations-heading").textContent = state.savedOnly ? "Смотреть позже" : "Рекомендации";
    resultCount.textContent = `Показано видео: ${visible.size} из ${app.videos.length}`;
    emptyState.hidden = visible.size > 0;
    document.getElementById("empty-title").textContent = state.savedOnly && saved.length === 0
      ? "В списке пока нет видео" : "Ничего не найдено";
    document.getElementById("empty-description").textContent = state.savedOnly && saved.length === 0
      ? "Добавь видео кнопкой «Смотреть позже» под карточкой."
      : "Попробуй другое название, канал или категорию.";
  }

  function openShare(video) {
    document.dispatchEvent(new Event("crysplay:feedchange"));
    selectedVideoId = video.id;
    document.getElementById("share-video-title").textContent = video.title;
    const image = document.getElementById("share-video-image");
    image.src = video.image;
    image.alt = video.alt;
    recipient.value = "";
    recipient.removeAttribute("aria-invalid");
    shareError.textContent = "";
    shareSubmit.disabled = false;
    dialog.showModal();
  }

  const shortCount = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });
  for (const short of app.shorts) {
    const card = document.querySelector(`[data-short-id="${short.id}"]`);
    if (!card) continue;
    for (const metric of card.querySelectorAll("[data-short-stat]")) {
      const value = short[metric.dataset.shortStat];
      metric.textContent = value >= 1000 ? shortCount.format(value / 1000) + " тыс." : shortCount.format(value);
    }
  }

  const fragment = document.createDocumentFragment();
  for (const video of app.videos) fragment.append(createVideoCard(video));
  grid.replaceChildren(fragment);
  for (const contact of app.contacts) {
    const option = document.createElement("option");
    option.value = contact.id;
    option.textContent = contact.name;
    recipient.append(option);
  }

  search.value = state.query;
  search.addEventListener("input", () => {
    state.query = search.value;
    updateResults();
  });
  search.form.addEventListener("submit", event => {
    event.preventDefault();
    state.query = search.value;
    updateResults();
  });
  for (const button of categoryButtons) {
    button.addEventListener("click", () => {
      state.category = button.dataset.category;
      updateResults();
    });
  }
  savedToggle.addEventListener("click", () => {
    state.savedOnly = !state.savedOnly;
    updateResults();
  });
  document.getElementById("reset-filters").addEventListener("click", () => {
    state.query = "";
    state.category = "all";
    state.savedOnly = false;
    search.value = "";
    updateResults();
    search.focus();
  });
  document.getElementById("share-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => { selectedVideoId = null; });
  recipient.addEventListener("change", () => {
    recipient.removeAttribute("aria-invalid");
    shareError.textContent = "";
  });
  document.getElementById("share-form").addEventListener("submit", event => {
    event.preventDefault();
    const contact = app.getContact(recipient.value);
    if (!contact) {
      shareError.textContent = "Выбери, кому отправить видео.";
      recipient.setAttribute("aria-invalid", "true");
      recipient.focus();
      return;
    }
    shareSubmit.disabled = true;
    const result = app.shareVideo(contact.id, selectedVideoId);
    if (!result?.persisted) {
      shareError.textContent = "Не удалось сохранить сообщение. Разреши сохранение данных сайта и попробуй ещё раз.";
      shareSubmit.disabled = false;
      return;
    }
    dialog.close();
    showNotice(`Видео отправлено в чат «${contact.name}».`, contact.id);
  });
  document.getElementById("notice-close").addEventListener("click", () => { notice.hidden = true; });
  window.addEventListener("storage", event => {
    if (event.key === app.keys.saved || event.key === null) updateResults();
  });
  updateResults();
})();
