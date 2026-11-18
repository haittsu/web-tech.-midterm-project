"use strict";

(() => {
  const format = new Intl.NumberFormat("en");
  const formatHours = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });
  const formatPercent = new Intl.NumberFormat("en", { maximumFractionDigits: 2 });
  const formatSigned = new Intl.NumberFormat("en", { signDisplay: "exceptZero" });
  const formatDate = new Intl.DateTimeFormat("en", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC"
  });
  const countFields = ["views", "likes", "comments", "subscribers"];

  function setText(element, text) {
    if (typeof window.jQuery === "function") window.jQuery(element).text(text);
    else element.textContent = text;
  }

  function readConfig() {
    const config = JSON.parse(document.getElementById("studio-data").textContent);
    if (!Array.isArray(config?.videos) || !Array.isArray(config.audience)) {
      throw new Error("Studio configuration must contain videos and audience arrays.");
    }

    const textFields = ["id", "title", "thumbnail", "duration"];
    const numberFields = [...countFields, "ctr", "averageSeconds"];
    for (const video of config.videos) {
      if (!video || !textFields.every(field => typeof video[field] === "string") ||
          !numberFields.every(field => Number.isFinite(video[field]))) {
        throw new Error("Check video text and numeric fields in the Studio configuration.");
      }
    }

    for (const column of config.audience) {
      if (!Array.isArray(column)) throw new Error("Each audience column must be an array of groups.");
      for (const group of column) {
        if (typeof group?.title !== "string" || !Array.isArray(group.items)) {
          throw new Error("Each audience group needs a title and an items array.");
        }
        for (const item of group.items) {
          if (typeof item?.label !== "string" || !Number.isFinite(item.percent) || item.percent < 0 || item.percent > 100) {
            throw new Error("Each audience item needs a label and a percentage from 0 to 100.");
          }
        }
      }
    }
    return config;
  }

  function formatCount(field, value) {
    return (field === "subscribers" ? formatSigned : format).format(value);
  }

  function renderPublicationDate(time, value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return;

    time.dateTime = value;
    setText(time, "Published " + formatDate.format(date));
    time.parentElement.classList.remove("d-none");
  }

  function renderVideoTable(videos) {
    const tableBody = document.getElementById("studio-videos");
    const template = document.getElementById("studio-video-template");
    for (const video of videos) {
      const fragment = template.content.cloneNode(true);
      const row = fragment.querySelector("tr");
      row.dataset.videoId = video.id;
      row.querySelector("img").src = video.thumbnail;
      setText(row.querySelector(".table-video strong"), video.title);
      renderPublicationDate(row.querySelector("time"), video.date);
      for (const field of countFields) {
        const cell = row.querySelector(`[data-stat="${field}"]`);
        setText(cell, formatCount(field, video[field]));
      }
      row.querySelector('[data-stat="subscribers"]').classList.toggle("positive-number", video.subscribers > 0);
      setText(row.querySelector('[data-stat="ctr"]'), formatPercent.format(video.ctr) + "%");
      setText(row.querySelector('[data-stat="duration"]'), video.duration);
      tableBody.append(fragment);
    }
  }

  function renderAudience(columns) {
    const container = document.getElementById("audience-columns");
    const groupTemplate = document.getElementById("audience-group-template");
    const itemTemplate = document.getElementById("audience-item-template");
    for (const groups of columns) {
      const column = document.createElement("div");
      column.className = "col d-flex flex-column gap-3";
      for (const { title, items } of groups) {
        const group = groupTemplate.content.cloneNode(true);
        setText(group.querySelector("h3"), title);
        const list = group.querySelector("ul");
        for (const { label, percent } of items) {
          const item = itemTemplate.content.cloneNode(true);
          setText(item.querySelector("span"), label);
          setText(item.querySelector("strong"), formatPercent.format(percent) + "%");
          item.querySelector("progress").value = percent;
          list.append(item);
        }
        column.append(group);
      }
      container.append(column);
    }
  }

  function renderRecentComments(videos, comments) {
    const list = document.getElementById("studio-comments");
    const template = document.getElementById("studio-comment-template");
    const titles = new Map(videos.map(({ id, title }) => [id, title]));
    const entries = Array.isArray(comments) ? comments : [];

    for (const comment of entries) {
      const title = titles.get(comment?.videoId);
      if (title === undefined || typeof comment.author !== "string" || typeof comment.text !== "string") continue;

      const item = template.content.cloneNode(true);
      setText(item.querySelector("[data-comment-author]"), comment.author);
      setText(item.querySelector("[data-comment-video]"), title);
      setText(item.querySelector("[data-comment-text]"), comment.text);
      list.append(item);
    }

    document.getElementById("studio-comments-empty").hidden = list.childElementCount > 0;
  }

  let config;
  try {
    config = readConfig();
  } catch (error) {
    const message = document.getElementById("studio-config-error");
    setText(message, error instanceof SyntaxError ? "Check the JSON syntax in studio-data." : error.message);
    message.hidden = false;
    return;
  }

  const { videos, audience, recentComments } = config;
  const totals = { views: 0, likes: 0, comments: 0, subscribers: 0 };
  let watchSeconds = 0;
  for (const video of videos) {
    for (const field of countFields) totals[field] += video[field];
    watchSeconds += video.views * video.averageSeconds;
  }

  renderVideoTable(videos);
  renderAudience(audience);
  renderRecentComments(videos, recentComments);

  for (const element of document.querySelectorAll("[data-total]")) {
    const metric = element.dataset.total;
    const value = metric === "watch-hours"
      ? formatHours.format(watchSeconds / 3600) + " h"
      : formatCount(metric, totals[metric]);
    setText(element, value);
  }

  const chart = document.getElementById("views-bars");
  const template = document.getElementById("views-bar-template");
  const chartHeading = document.getElementById("views-heading");
  const chartDescription = document.getElementById("chart-description");
  const chartTotal = document.getElementById("chart-total");
  const metricSelect = document.getElementById("chart-metric");
  const sortButton = document.getElementById("sort-views");
  const sortStatus = document.getElementById("views-sort-status");
  const metricNames = { views: "views", likes: "likes", comments: "comments" };
  let sortDirection = 0;

  const chartRows = videos.map(video => {
    const item = template.content.firstElementChild.cloneNode(true);
    const bar = item.querySelector("progress");
    const count = item.querySelector("[data-view-count]");
    setText(item.querySelector("[data-view-title]"), video.title);
    bar.setAttribute("aria-label", video.title);
    return { video, item, bar, count };
  });

  function renderChart() {
    const metric = metricSelect.value;
    const name = metricNames[metric];
    const total = totals[metric];
    const rows = sortDirection === 0 ? chartRows : [...chartRows].sort((first, second) =>
      sortDirection * (first.video[metric] - second.video[metric])
    );

    setText(chartHeading, "Distribution of " + name);
    setText(chartDescription, "Each video's share of sample channel " + name);
    setText(chartTotal, format.format(total));

    for (const { video, item, bar, count } of rows) {
      setText(count, format.format(video[metric]));
      bar.max = Math.max(1, total);
      bar.value = video[metric];
      chart.append(item);
    }

    setText(sortButton, (sortDirection === -1 ? "Lowest first: " : "Highest first: ") + name);
    const order = sortDirection === -1 ? "Descending: " : "Ascending: ";
    setText(sortStatus, sortDirection === 0 ? "" : order + name);
  }

  function sortChart() {
    sortDirection = sortDirection === -1 ? 1 : -1;
    renderChart();
  }

  metricSelect.disabled = false;
  sortButton.disabled = videos.length < 2;
  const $ = window.jQuery;
  if (typeof $ === "function") {
    $("#chart-metric").on("change", renderChart);
    $("#sort-views").on("click", sortChart);
  } else {
    metricSelect.addEventListener("change", renderChart);
    sortButton.addEventListener("click", sortChart);
  }
  renderChart();
})();
