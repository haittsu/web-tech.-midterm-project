"use strict";

// Только демонстрационная переписка в этом браузере. Запросов на сервер нет.
const storageKey = "crysplay.messenger.messages.v1";
const contacts = {
  aliya: { name: "Алия", initial: "А", status: "В сети", online: true },
  daniyar: { name: "Данияр", initial: "Д", status: "Был недавно", online: false },
  marat: { name: "Марат", initial: "М", status: "Был недавно", online: false }
};
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

const messages = loadMessages();
let activeChat = "aliya";
const drafts = { aliya: "", daniyar: "", marat: "" };
const chatButtons = document.querySelectorAll(".chat-contact");
const messageList = document.getElementById("message-list");
const messageTemplate = document.getElementById("message-template");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const messageForm = document.getElementById("message-form");

function loadMessages() {
  const result = structuredClone(initialMessages);
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    for (const chatId of Object.keys(contacts)) {
      const history = saved?.[chatId];
      if (Array.isArray(history) && history.length > 0 && history.every(message =>
        message && ["me", "them"].includes(message.sender) &&
        typeof message.text === "string" && message.text.length <= 2000 &&
        typeof message.time === "string"
      )) {
        result[chatId] = history;
      }
    }
  } catch {
    // Если хранилище недоступно, чат продолжает работать до закрытия страницы.
  }
  return result;
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
    bubble.querySelector("p").textContent = message.text;
    bubble.querySelector("time").textContent = message.time;
    fragment.append(bubble);
  }
  messageList.replaceChildren(fragment);
  messageList.scrollTop = messageList.scrollHeight;
}

function updateChatPreviews() {
  for (const button of chatButtons) {
    const lastMessage = messages[button.dataset.chat].at(-1);
    button.querySelector(".contact-preview").textContent =
      (lastMessage.sender === "me" ? "Вы: " : "") + lastMessage.text;
    button.querySelector(".contact-time").textContent = lastMessage.time;
    button.setAttribute("aria-label", contacts[button.dataset.chat].name + ": " + lastMessage.text);
  }
}

function updateComposer() {
  sendButton.disabled = messageInput.value.trim().length === 0;
  messageInput.style.height = "auto";
  messageInput.style.height = Math.min(messageInput.scrollHeight + 2, 115) + "px";
}

function selectChat(chatId) {
  drafts[activeChat] = messageInput.value;
  activeChat = chatId;
  const contact = contacts[chatId];
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

  const time = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Qyzylorda"
  }).format(new Date());
  messages[activeChat].push({ sender: "me", text, time });
  try {
    localStorage.setItem(storageKey, JSON.stringify(messages));
  } catch {
    // Отправка работает и без доступа к localStorage.
  }
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

renderMessages();
updateChatPreviews();
updateComposer();
