"use strict";

// Главная страница и чат используют одинаковые данные и формат истории.
const app = window.CrysPlay;
let messages = app.loadMessages();
const requestedChat = new URLSearchParams(location.search).get("chat");
let activeChat = app.getContact(requestedChat) ? requestedChat : "aliya";
const drafts = { aliya: "", daniyar: "", marat: "" };
const chatButtons = document.querySelectorAll(".chat-contact");
const messageList = document.getElementById("message-list");
const messageTemplate = document.getElementById("message-template");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const messageForm = document.getElementById("message-form");

function createVideoAttachment(video) {
  const link = document.createElement("a");
  link.className = "shared-video-card";
  link.href = "../" + (video.watchUrl || video.previewSrc);
  const image = document.createElement("img");
  image.src = "../" + video.image;
  image.alt = video.alt;
  image.width = 320;
  image.height = 180;
  image.loading = "lazy";
  const title = document.createElement("strong");
  title.textContent = video.title;
  const channel = document.createElement("span");
  channel.textContent = video.channel;
  const action = document.createElement("span");
  action.className = "shared-video-action";
  action.textContent = video.watchUrl ? "Смотреть видео ↗" : "Открыть фрагмент ↗";
  link.append(image, title, channel, action);
  return link;
}

function renderMessages() {
  const fragment = document.createDocumentFragment();
  const dateLabel = document.createElement("span");
  dateLabel.className = "conversation-date";
  dateLabel.textContent = "Переписка";
  fragment.append(dateLabel);

  for (const message of messages[activeChat]) {
    const bubble = messageTemplate.content.firstElementChild.cloneNode(true);
    bubble.classList.toggle("message-own", message.sender === "me");
    // textContent выводит введённый текст, не исполняя HTML и скрипты.
    bubble.querySelector("p").textContent = message.videoId ? "Делюсь видео" : message.text;
    bubble.querySelector("time").textContent = message.time;
    const video = app.getVideo(message.videoId);
    if (video) {
      bubble.classList.add("message-video");
      bubble.insertBefore(createVideoAttachment(video), bubble.querySelector("time"));
    }
    fragment.append(bubble);
  }
  messageList.replaceChildren(fragment);
  messageList.scrollTop = messageList.scrollHeight;
}

function updateChatPreviews() {
  for (const button of chatButtons) {
    const lastMessage = messages[button.dataset.chat].at(-1);
    const preview = lastMessage ? (lastMessage.sender === "me" ? "Вы: " : "") + lastMessage.text : "Пока нет сообщений";
    button.querySelector(".contact-preview").textContent = preview;
    button.querySelector(".contact-time").textContent = lastMessage?.time || "";
    button.setAttribute("aria-label", app.getContact(button.dataset.chat).name + ": " + preview);
  }
}

function updateComposer() {
  sendButton.disabled = messageInput.value.trim().length === 0;
  messageInput.style.height = "auto";
  messageInput.style.height = Math.min(messageInput.scrollHeight + 2, 115) + "px";
}

function selectChat(chatId) {
  const contact = app.getContact(chatId);
  if (!contact) return;
  drafts[activeChat] = messageInput.value;
  activeChat = chatId;
  document.getElementById("conversation-title").textContent = contact.name;
  document.getElementById("conversation-status").textContent = contact.status;
  const avatar = document.getElementById("conversation-avatar");
  avatar.className = "contact-avatar avatar-" + chatId;
  avatar.textContent = contact.initial;
  if (contact.online) {
    const onlineDot = document.createElement("span");
    onlineDot.className = "online-dot";
    avatar.append(onlineDot);
  }
  for (const button of chatButtons) {
    const selected = button.dataset.chat === chatId;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  }
  messageInput.value = drafts[chatId];
  renderMessages();
  updateComposer();
}

messageForm.addEventListener("submit", event => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text || text.length > 2000) return;

  // Свежая история содержит в том числе видео, отправленные из другой вкладки.
  const result = app.appendMessage(activeChat, { sender: "me", text, time: app.currentTime() });
  if (!result) return;
  messages = result.messages;
  document.getElementById("composer-hint").textContent = result.persisted
    ? "Enter — отправить · Shift + Enter — новая строка"
    : "Сообщение добавлено. История сохранится только до закрытия страницы.";
  drafts[activeChat] = "";
  messageInput.value = "";
  renderMessages();
  updateChatPreviews();
  updateComposer();
  messageInput.focus();
});

messageInput.addEventListener("input", updateComposer);
messageInput.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    if (messageInput.value.trim()) messageForm.requestSubmit();
  }
});
for (const button of chatButtons) {
  button.addEventListener("click", () => selectChat(button.dataset.chat));
}

const search = document.getElementById("video-search");
search.form.addEventListener("submit", event => {
  event.preventDefault();
  location.href = "../index.html?q=" + encodeURIComponent(search.value.trim());
});
window.addEventListener("storage", event => {
  if (event.key === app.keys.messages || event.key === null) {
    messages = app.loadMessages();
    renderMessages();
    updateChatPreviews();
  }
});

selectChat(activeChat);
updateChatPreviews();
