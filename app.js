const entries = window.INTERNSHIP_ENTRIES || [];
const milestones = window.INTERNSHIP_MILESTONES || [];

const storageKeys = {
  notes: "internship-blog-notes",
  images: "internship-blog-images",
  timeline: "internship-blog-timeline",
  questions: "internship-blog-interview-questions"
};

const archiveDb = {
  name: "internship-blog-archive",
  store: "handles",
  dirKey: "daily-notes-dir"
};

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

const formatDate = (dateString) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
};

const uniqueTypes = ["全部", ...new Set(entries.map((item) => item.type))];
let activeType = "全部";
let searchKeyword = "";
const searchableEntries = entries.map((item) => ({
  item,
  haystack: [item.title, item.summary, item.type, item.project, item.result, ...item.tags].join(" ").toLowerCase()
}));

function renderStats() {
  const techSet = new Set(entries.flatMap((item) => item.tags));
  const projectSet = new Set(entries.map((item) => item.project).filter(Boolean));
  animateNumber($("#statPosts"), entries.length);
  animateNumber($("#statProjects"), projectSet.size);
  animateNumber($("#statTechs"), techSet.size);
}

function animateNumber(el, target) {
  if (!el) return;
  const duration = 850;
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - progress, 3)));
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function renderFilters() {
  const wrapper = $("#filterChips");
  if (!wrapper) return;
  wrapper.innerHTML = uniqueTypes.map((type) => `<button class="chip ${type === activeType ? "active" : ""}" data-type="${escapeHtml(type)}" type="button">${escapeHtml(type)}</button>`).join("");
}

function setupFilters() {
  const wrapper = $("#filterChips");
  if (!wrapper) return;
  wrapper.addEventListener("click", (event) => {
    const button = event.target.closest(".chip");
    if (!button) return;
    activeType = button.dataset.type;
    renderFilters();
    renderPosts();
  });
}

function renderPosts() {
  const grid = $("#postGrid");
  if (!grid) return;
  const keyword = searchKeyword.trim().toLowerCase();
  const filtered = searchableEntries.filter(({ item, haystack }) => {
    const matchType = activeType === "全部" || item.type === activeType;
    return matchType && haystack.includes(keyword);
  }).map(({ item }) => item);

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state">暂时没找到匹配记录。可以换个关键词，或者把今天的内容先写进“今日速记”。</div>`;
    return;
  }

  grid.innerHTML = filtered.map((item) => `
    <article class="post-card glass">
      <div class="post-meta"><time>${formatDate(item.date)}</time><span class="type-pill">${escapeHtml(item.type)}</span></div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.summary)}</p>
      <div class="tag-row">${item.tags.map((tag) => `<span># ${escapeHtml(tag)}</span>`).join("")}</div>
      ${renderEntryDetails(item)}
      <div class="post-footer"><span>${escapeHtml(item.project)}</span><strong>${escapeHtml(item.result)}</strong></div>
    </article>
  `).join("");
  bindTiltCards();
}

function renderEntryDetails(item) {
  if (!Array.isArray(item.sections) || !item.sections.length) return "";
  const sections = item.sections.map((section) => {
    const items = Array.isArray(section.items) ? section.items : [];
    const list = items.map((text) => `<li>${escapeHtml(text)}</li>`).join("");
    return `<section><h4>${escapeHtml(section.heading || "复盘")}</h4><ul>${list}</ul></section>`;
  }).join("");
  return `<details class="entry-details"><summary>查看详细复盘</summary><div>${sections}</div></details>`;
}

function renderTechCloud() {
  const cloud = $("#techCloud");
  if (!cloud) return;
  const counts = entries.flatMap((item) => item.tags).reduce((acc, tag) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {});
  cloud.innerHTML = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => `<span class="tech-pill magnet" style="--size:${count + 1}"># ${escapeHtml(tag)}</span>`)
    .join("");
}

function getDefaultTimelineItems() {
  return milestones.map((item, index) => ({
    id: item.id || `default-${item.date || index + 1}-${item.title || index + 1}`,
    date: item.date,
    title: item.title,
    detail: item.detail
  }));
}

function getSavedTimelineItems() {
  const saved = loadJson(storageKeys.timeline, []);
  return Array.isArray(saved) ? saved : [];
}

function getTimelineItems() {
  const defaults = getDefaultTimelineItems();
  const saved = getSavedTimelineItems();
  if (!saved.length) return defaults;

  const savedById = new Map(saved.map((item) => [item.id, item]));
  const defaultIds = new Set(defaults.map((item) => item.id));
  const mergedDefaults = defaults
    .map((item) => savedById.get(item.id) || item)
    .filter((item) => !item.deleted);
  const customItems = saved.filter((item) => !defaultIds.has(item.id) && !item.deleted);
  return [...mergedDefaults, ...customItems];
}

function renderTimeline() {
  const timeline = $("#timelineList");
  if (!timeline) return;
  const items = getTimelineItems();
  if (!items.length) {
    timeline.innerHTML = `<div class="empty-state">时间线暂时为空。可以在上方新增一个阶段，比如“第 1 周：熟悉开发环境”。</div>`;
    return;
  }
  timeline.innerHTML = items.map((item) => `
    <article class="timeline-item reveal" data-timeline-id="${escapeHtml(item.id)}">
      <div class="timeline-main">
        <time>${escapeHtml(item.date)}</time>
        <strong>${escapeHtml(item.title)}</strong>
        <span class="review-text">${escapeHtml(item.detail)}</span>
      </div>
      <div class="timeline-actions">
        <button type="button" data-timeline-action="edit" data-timeline-id="${escapeHtml(item.id)}">编辑</button>
        <button type="button" data-timeline-action="delete" data-timeline-id="${escapeHtml(item.id)}">删除</button>
      </div>
    </article>
  `).join("");
}

function setupTimelineEditor() {
  const form = $("#timelineForm");
  const resetButton = $("#resetTimeline");
  const timeline = $("#timelineList");
  if (!form || !timeline) {
    renderTimeline();
    return;
  }

  const idInput = form.elements.namedItem("id");
  const dateInput = form.elements.namedItem("date");
  const titleInput = form.elements.namedItem("title");
  const detailInput = form.elements.namedItem("detail");
  const submitButton = form.querySelector("button[type='submit']");

  const resetForm = () => {
    form.reset();
    if (idInput) idInput.value = "";
    if (submitButton) submitButton.textContent = "保存到时间线";
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const id = idInput?.value || "";
    const nextItem = {
      id: id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
      date: dateInput.value.trim(),
      title: titleInput.value.trim(),
      detail: detailInput.value.trim()
    };
    if (!nextItem.date || !nextItem.title || !nextItem.detail) {
      toast("时间、标题、细节都要填一下");
      return;
    }
    const items = getSavedTimelineItems();
    const existed = items.some((item) => item.id === nextItem.id);
    const nextItems = existed
      ? items.map((item) => item.id === nextItem.id ? nextItem : item)
      : [...items, nextItem];
    if (!saveJson(storageKeys.timeline, nextItems)) {
      toast("浏览器本地空间不足，时间线没有保存");
      return;
    }
    renderTimeline();
    resetForm();
    toast(existed ? "时间线已更新" : "已加入成长时间线");
  });

  timeline.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-timeline-action]");
    if (!button) return;
    const id = button.dataset.timelineId;
    const action = button.dataset.timelineAction;
    const visibleItems = getTimelineItems();
    const item = visibleItems.find((current) => current.id === id);
    if (!item) return;

    if (action === "delete") {
      const savedItems = getSavedTimelineItems();
      const defaultIds = new Set(getDefaultTimelineItems().map((current) => current.id));
      const nextItems = defaultIds.has(id)
        ? [...savedItems.filter((current) => current.id !== id), { ...item, deleted: true }]
        : savedItems.filter((current) => current.id !== id);
      if (!saveJson(storageKeys.timeline, nextItems)) {
        toast("浏览器本地空间不足，删除状态没有保存");
        return;
      }
      renderTimeline();
      toast("已删除这个时间线节点");
      return;
    }

    if (action === "edit") {
      idInput.value = item.id;
      dateInput.value = item.date;
      titleInput.value = item.title;
      detailInput.value = item.detail;
      if (submitButton) submitButton.textContent = "保存修改";
      form.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });

  resetButton?.addEventListener("click", () => {
    localStorage.removeItem(storageKeys.timeline);
    resetForm();
    renderTimeline();
    toast("已恢复默认时间线模板");
  });

  renderTimeline();
}

function setupSearch() {
  const input = $("#searchInput");
  if (!input) return;
  let renderFrame = 0;
  input.addEventListener("input", (event) => {
    searchKeyword = event.target.value;
    cancelAnimationFrame(renderFrame);
    renderFrame = requestAnimationFrame(renderPosts);
  });
}

function loadJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    if (value === null) return fallback;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function openArchiveDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("当前浏览器不支持 IndexedDB"));
      return;
    }
    const request = indexedDB.open(archiveDb.name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(archiveDb.store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB 打开失败"));
  });
}

async function getArchiveDirHandle() {
  const db = await openArchiveDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(archiveDb.store, "readonly").objectStore(archiveDb.store).get(archiveDb.dirKey);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error("读取归档目录失败"));
  });
}

async function saveArchiveDirHandle(handle) {
  const db = await openArchiveDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(archiveDb.store, "readwrite").objectStore(archiveDb.store).put(handle, archiveDb.dirKey);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("保存归档目录失败"));
  });
}

async function ensureArchivePermission(handle) {
  if (!handle) return false;
  const options = { mode: "readwrite" };
  if ((await handle.queryPermission(options)) === "granted") return true;
  return (await handle.requestPermission(options)) === "granted";
}

async function chooseArchiveDir() {
  if (!window.showDirectoryPicker) {
    throw new Error("当前浏览器不支持直接写入本地文件");
  }
  const handle = await window.showDirectoryPicker({ mode: "readwrite" });
  if (!(await ensureArchivePermission(handle))) {
    throw new Error("没有获得归档目录写入权限");
  }
  await saveArchiveDirHandle(handle);
  return handle;
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLocalTimeText(date = new Date()) {
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function getNoteDate(note) {
  const date = note.createdAt ? new Date(note.createdAt) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function getArchiveSummary(note) {
  const body = String(note.body || "").replace(/\s+/g, " ").trim();
  return body ? body.slice(0, 90) : `记录 ${note.title || "今日速记"} 的学习和实习过程。`;
}

function getArchiveResult(note) {
  const title = String(note.title || "").trim();
  const type = String(note.type || "速记").trim();
  return title ? `已整理为${type}：${title}` : `已整理为${type}归档`;
}

function getMarkdownLinesForNote(note) {
  const date = getNoteDate(note);
  const time = getLocalTimeText(date);
  const title = String(note.title || "未命名速记").trim();
  const type = String(note.type || "速记").trim();
  const bodyLines = String(note.body || "")
    .replace(/\r\n/g, "\n")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const lines = [`- ${time}｜${title}（${type}）`];
  bodyLines.forEach((line) => lines.push(`- ${line}`));
  return lines;
}

function getMarkdownBlockForNote(note) {
  const noteId = String(note.id || "");
  const lines = getMarkdownLinesForNote(note).join("\n");
  if (!noteId) return lines;
  return `<!-- QUICK-NOTE:${noteId} START -->\n${lines}\n<!-- QUICK-NOTE:${noteId} END -->`;
}

function buildDailyNoteMarkdown(note) {
  const date = getNoteDate(note);
  const dateKey = getLocalDateKey(date);
  const title = String(note.title || `${dateKey} 今日速记`).trim();
  const type = String(note.type || "实习日报").trim();
  const summary = getArchiveSummary(note);
  const noteBlock = getMarkdownBlockForNote(note);
  return `# ${title}

- 类型：${type}
- 项目：实习记录
- 标签：${type}，浏览器速记，实习记录
- 结果：${getArchiveResult(note)}
- 摘要：${summary}

## 今天做了什么

${noteBlock}

## 遇到的问题


## 解决过程


## 结果证据

- 今日速记已写入 data/daily-notes/${dateKey}.md

## 面试可讲


## 下一步

`;
}

function appendLinesToMarkdownSection(text, heading, lines) {
  const normalized = String(text || "").replace(/\r\n/g, "\n").trimEnd();
  if (!normalized) return `${lines.join("\n")}\n`;

  const rows = normalized.split("\n");
  const headingIndex = rows.findIndex((line) => line.trim() === `## ${heading}`);
  if (headingIndex === -1) {
    return `${normalized}\n\n## ${heading}\n\n${lines.join("\n")}\n`;
  }

  let insertIndex = rows.length;
  for (let index = headingIndex + 1; index < rows.length; index += 1) {
    if (/^##\s+/.test(rows[index].trim())) {
      insertIndex = index;
      break;
    }
  }

  const before = rows.slice(0, insertIndex);
  const after = rows.slice(insertIndex);
  while (before.length && before[before.length - 1].trim() === "") before.pop();
  const nextRows = [...before, "", ...lines, ""];
  if (after.length) nextRows.push(...after);
  return `${nextRows.join("\n").trimEnd()}\n`;
}

function mergeNoteIntoDailyMarkdown(oldText, note) {
  if (!String(oldText || "").trim()) return buildDailyNoteMarkdown(note);
  const noteId = String(note.id || "");
  if (noteId && String(oldText).includes(`<!-- QUICK-NOTE:${noteId} START -->`)) return oldText;

  const plainLines = getMarkdownLinesForNote(note).join("\n");
  if (String(oldText).includes(plainLines)) return oldText;

  return appendLinesToMarkdownSection(oldText, "今天做了什么", [getMarkdownBlockForNote(note)]);
}

function removeNoteFromDailyMarkdown(oldText, note) {
  const text = String(oldText || "").replace(/\r\n/g, "\n");
  const noteId = String(note.id || "");
  if (noteId) {
    const markerPattern = new RegExp(`\\n?<!-- QUICK-NOTE:${noteId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} START -->[\\s\\S]*?<!-- QUICK-NOTE:${noteId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} END -->\\n?`, "g");
    const withoutMarkedBlock = text.replace(markerPattern, "\n");
    if (withoutMarkedBlock !== text) {
      return withoutMarkedBlock.replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
    }
  }

  const lines = getMarkdownLinesForNote(note).join("\n");
  const index = text.indexOf(lines);
  if (index === -1) return text;
  const nextText = `${text.slice(0, index)}${text.slice(index + lines.length)}`;
  return nextText.replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

function downloadMarkdownFallback(fileName, content) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatInlineText(text = "") {
  const keywordTokens = [
    "DevSpace",
    "Cloudflare Tunnel",
    "trycloudflare\\.com",
    "ChatGPT",
    "OAuth",
    "MCP",
    "JSON",
    "BOM",
    "allowedRoots",
    "cloudflared",
    "config\\.json",
    "Owner password",
    "token",
    "SolidWorks",
    "solidworks-pro",
    "bcr_arm",
    "STM32",
    "STC32G",
    "PID",
    "PWM",
    "DMA",
    "UART",
    "Keil",
    "C251",
    "GitHub",
    "File System Access API"
  ];
  const tokenPattern = new RegExp(`(https?:\\/\\/[^\\s，。；、)）]+|[A-Za-z]:\\\\[^，。；\\n]+|\`[^\`]+\`|\\b(?:${keywordTokens.join("|")})\\b)`, "gi");
  return String(text).split(tokenPattern).map((part) => {
    if (!part) return "";
    if (/^https?:\/\//i.test(part)) {
      return `<a class="note-link" href="${escapeHtml(part)}" target="_blank" rel="noreferrer">${escapeHtml(part)}</a>`;
    }
    if (/^[A-Za-z]:\\/.test(part) || /^`[^`]+`$/.test(part)) {
      return `<code class="note-code">${escapeHtml(part.replace(/^`|`$/g, ""))}</code>`;
    }
    if (new RegExp(`^(?:${keywordTokens.join("|")})$`, "i").test(part)) {
      return `<span class="note-keyword">${escapeHtml(part)}</span>`;
    }
    return escapeHtml(part);
  }).join("");
}

function splitReadableChunks(text = "") {
  const raw = String(text).trim();
  if (!raw) return [];
  if (raw.length <= 150) return [raw];
  const pieces = raw.split(/([。；])/);
  const chunks = [];
  let current = "";
  for (let index = 0; index < pieces.length; index += 2) {
    const sentence = `${pieces[index] || ""}${pieces[index + 1] || ""}`.trim();
    if (!sentence) continue;
    if ((current + sentence).length > 150 && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [raw];
}

function normalizeNoteText(body) {
  const headingWords = "今天做了什么|具体做了这些事|遇到的问题|解决过程|结果证据|结果|下一步|面试可讲|技术笔记|学习心得|复盘|判断标准";
  return String(body)
    .replace(/\r\n/g, "\n")
    .replace(new RegExp(`\\s*(${headingWords})([：:]|\\s+)`, "g"), "\n$1：")
    .replace(/(^|[\n。；])\s*(\d{1,2})([、，,]|[.．](?!\d)|[)）])\s*/g, (match, prefix, number, delimiter) => `${prefix}\n${number}${delimiter} `)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatNoteBody(rawBody = "") {
  const body = String(rawBody).trim();
  if (!body) return `<p class="note-paragraph muted">没有填写详细内容。</p>`;

  const normalized = normalizeNoteText(body);
  const headingPattern = /^(今天做了什么|具体做了这些事|遇到的问题|解决过程|结果证据|结果|下一步|面试可讲|技术笔记|学习心得|复盘|判断标准)[：:]\s*(.*)$/;
  const headingClassMap = {
    "今天做了什么": "done",
    "具体做了这些事": "done",
    "遇到的问题": "problem",
    "解决过程": "review",
    "结果证据": "proof",
    "结果": "proof",
    "下一步": "next",
    "面试可讲": "interview",
    "技术笔记": "tech",
    "学习心得": "tech",
    "复盘": "review",
    "判断标准": "proof"
  };

  return normalized.split(/\n+/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const headingMatch = line.match(headingPattern);
    if (headingMatch) {
      const [, heading, rest] = headingMatch;
      const paragraphs = splitReadableChunks(rest).map((chunk) => `<p>${formatInlineText(chunk)}</p>`).join("");
      return `<section class="note-block ${headingClassMap[heading] || "review"}"><h4>${escapeHtml(heading)}</h4>${paragraphs}</section>`;
    }

    const pointMatch = line.match(/^(\d{1,2})([、，,]|[.．](?!\d)|[)）])\s*(.+)$/);
    if (pointMatch) {
      return `<div class="note-point"><span class="note-point-number">${escapeHtml(pointMatch[1])}</span><p>${formatInlineText(pointMatch[3])}</p></div>`;
    }

    return splitReadableChunks(line).map((chunk) => `<p class="note-paragraph">${formatInlineText(chunk)}</p>`).join("");
  }).join("");
}

function setupQuickNotes() {
  const form = $("#quickNoteForm");
  const list = $("#localNotes");
  const archiveButton = $("#archiveDirButton");
  const archiveStatus = $("#archiveStatus");
  if (!form || !list) return;

  const setArchiveStatus = (message) => {
    if (archiveStatus) archiveStatus.textContent = message;
  };

  const refreshArchiveStatus = async () => {
    if (!window.showDirectoryPicker) {
      setArchiveStatus("当前浏览器不支持直接写入归档文件，保存时会下载 Markdown。");
      return;
    }
    try {
      const handle = await getArchiveDirHandle();
      if (handle && await ensureArchivePermission(handle)) {
        setArchiveStatus("已连接 data/daily-notes，保存速记会同步写入 Markdown。");
      } else {
        setArchiveStatus("首次使用请先选择 data/daily-notes 归档目录。");
      }
    } catch {
      setArchiveStatus("首次使用请先选择 data/daily-notes 归档目录。");
    }
  };

  const saveNoteToArchive = async (note) => {
    const date = getNoteDate(note);
    const dateKey = getLocalDateKey(date);
    const fileName = `${dateKey}.md`;

    if (!window.showDirectoryPicker) {
      downloadMarkdownFallback(fileName, buildDailyNoteMarkdown(note));
      return "downloaded";
    }

    let handle = await getArchiveDirHandle();
    if (!handle || !(await ensureArchivePermission(handle))) {
      handle = await chooseArchiveDir();
    }

    const fileHandle = await handle.getFileHandle(fileName, { create: true });
    let oldText = "";
    try {
      oldText = await (await fileHandle.getFile()).text();
    } catch {
      oldText = "";
    }

    const writable = await fileHandle.createWritable();
    await writable.write(mergeNoteIntoDailyMarkdown(oldText, note));
    await writable.close();
    return { status: "written", fileName, dateKey };
  };

  const removeNoteFromArchive = async (note) => {
    if (!window.showDirectoryPicker) return "unsupported";
    const handle = await getArchiveDirHandle();
    if (!handle || !(await ensureArchivePermission(handle))) return "no-permission";

    const date = getNoteDate(note);
    const fileName = note.archiveFileName || `${getLocalDateKey(date)}.md`;
    const fileHandle = await handle.getFileHandle(fileName, { create: false });
    const oldText = await (await fileHandle.getFile()).text();
    const nextText = removeNoteFromDailyMarkdown(oldText, note);
    if (nextText === oldText) return "not-found";

    const writable = await fileHandle.createWritable();
    await writable.write(nextText);
    await writable.close();
    return "removed";
  };

  const todayPrefix = () => new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" }).format(new Date());
  const isTodayNote = (note) => {
    if (note.createdAt) {
      const createdAt = new Date(note.createdAt);
      return !Number.isNaN(createdAt.getTime()) && createdAt.toDateString() === new Date().toDateString();
    }
    return String(note.date || "").startsWith(todayPrefix());
  };

  const render = () => {
    const allNotes = loadJson(storageKeys.notes, []);
    const notes = allNotes.filter(isTodayNote);
    if (!notes.length) {
      const hiddenCount = allNotes.length;
      list.innerHTML = `<div class="empty-state">${hiddenCount ? `今天还没有本地速记，已自动隐藏 ${hiddenCount} 条过往记录。` : "还没有本地速记。先写一条“今天做了什么 + 遇到什么问题 + 结果证据”。"}</div>`;
      return;
    }
    list.innerHTML = notes.map((note) => `
      <article class="local-note polished-note">
        <header class="note-header">
          <div>
            <span class="note-type-badge">${escapeHtml(note.type || "速记")}</span>
            <strong>${escapeHtml(note.title || "未命名速记")}</strong>
          </div>
          <time>${escapeHtml(note.date || "")}</time>
        </header>
        <div class="note-body-rich is-collapsed" id="note-body-${escapeHtml(note.id)}">${formatNoteBody(note.body)}</div>
        <div class="note-actions">
          <button type="button" data-note-toggle="${escapeHtml(note.id)}" aria-expanded="false" aria-controls="note-body-${escapeHtml(note.id)}">展开</button>
          <button type="button" data-note-id="${escapeHtml(note.id)}">删除</button>
        </div>
      </article>
    `).join("");
  };

  archiveButton?.addEventListener("click", async () => {
    try {
      await chooseArchiveDir();
      setArchiveStatus("已连接 data/daily-notes，保存速记会同步写入 Markdown。");
      toast("归档目录已连接");
    } catch (error) {
      setArchiveStatus(error.message || "归档目录连接失败");
      toast("归档目录连接失败");
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const notes = loadJson(storageKeys.notes, []);
    const now = new Date();
    const note = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      title: formData.get("title"),
      type: formData.get("type"),
      body: formData.get("body"),
      date: new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(now),
      createdAt: now.toISOString()
    };
    notes.unshift(note);
    const draftSaved = saveJson(storageKeys.notes, notes);
    form.reset();
    if (draftSaved) render();

    try {
      const result = await saveNoteToArchive(note);
      if (result.status === "written") {
        if (draftSaved) {
          const savedNotes = loadJson(storageKeys.notes, []);
          const nextNotes = savedNotes.map((item) => item.id === note.id
            ? { ...item, archiveFileName: result.fileName, archivedAt: new Date().toISOString() }
            : item);
          saveJson(storageKeys.notes, nextNotes);
          render();
        }
        setArchiveStatus(`已写入 data/daily-notes/${getLocalDateKey(now)}.md`);
        toast(draftSaved ? "已保存草稿，并写入今日归档文件" : "草稿空间不足，但已写入归档文件");
      } else {
        setArchiveStatus("已下载 Markdown，请放入 data/daily-notes 后等待自动归档。");
        toast(draftSaved ? "已保存草稿，并下载归档 Markdown" : "草稿空间不足，已下载归档 Markdown");
      }
    } catch (error) {
      setArchiveStatus(error.message || "未写入归档文件，只保存了浏览器草稿。");
      toast(draftSaved ? "已保存草稿，但未写入归档文件" : "保存失败：草稿和归档都未写入");
    }
  });

  list.addEventListener("click", async (event) => {
    const toggle = event.target.closest("button[data-note-toggle]");
    if (toggle) {
      const body = $(`#note-body-${CSS.escape(toggle.dataset.noteToggle)}`);
      if (!body) return;
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      body.classList.toggle("is-collapsed", expanded);
      toggle.setAttribute("aria-expanded", String(!expanded));
      toggle.textContent = expanded ? "展开" : "收起";
      return;
    }

    const button = event.target.closest("button[data-note-id]");
    if (!button) return;
    const notes = loadJson(storageKeys.notes, []);
    const note = notes.find((item) => item.id === button.dataset.noteId);
    if (!note) return;

    try {
      const result = await removeNoteFromArchive(note);
      if (!saveJson(storageKeys.notes, notes.filter((item) => item.id !== button.dataset.noteId))) {
        setArchiveStatus("浏览器本地空间不足，删除状态没有保存。");
        toast("删除状态没有保存");
        return;
      }
      render();
      if (result === "removed") {
        setArchiveStatus(`已从 ${note.archiveFileName || `${getLocalDateKey(getNoteDate(note))}.md`} 移除这条速记。`);
        toast("已删除速记和归档内容");
      } else if (result === "not-found") {
        setArchiveStatus("已删除浏览器草稿，但归档文件里没有找到对应内容。");
        toast("已删除草稿，归档内容未找到");
      } else {
        setArchiveStatus("已删除浏览器草稿；未连接归档目录，Markdown 未同步删除。");
        toast("已删除草稿，未同步归档文件");
      }
    } catch (error) {
      setArchiveStatus(error.message || "删除归档内容失败，浏览器草稿未删除。");
      toast("删除失败，未改动这条速记");
    }
  });

  render();
  refreshArchiveStatus();
}

function setupGallery() {
  const form = $("#imageForm");
  const input = $("#imageInput");
  const caption = $("#imageCaption");
  const grid = $("#galleryGrid");
  const dropZone = $("#dropZone");
  if (!form || !input || !grid || !dropZone) return;

  let selectedFile = null;

  const render = () => {
    const images = loadJson(storageKeys.images, []);
    if (!images.length) {
      grid.innerHTML = `<div class="empty-state">还没有图片。建议上传：架构图、波形图、日志截图、调试现场、最终 Demo 截图。</div>`;
      return;
    }
    grid.innerHTML = images.map((image) => `
      <article class="image-card">
        <img src="${image.src}" alt="${escapeHtml(image.caption || "实习图片")}" />
        <div>
          <strong>${escapeHtml(image.caption || "未命名图片")}</strong>
          <small>${escapeHtml(image.date)}</small>
          <button type="button" data-image-id="${escapeHtml(image.id)}">删除图片</button>
        </div>
      </article>
    `).join("");
  };

  const readFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(reader.result);
      img.onload = () => {
        const maxSide = 1280;
        const ratio = Math.min(maxSide / img.width, maxSide / img.height, 1);
        const width = Math.round(img.width * ratio);
        const height = Math.round(img.height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.84));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  input.addEventListener("change", () => {
    selectedFile = input.files?.[0] || null;
    if (selectedFile) toast(`已选择：${selectedFile.name}`);
  });

  ["dragenter", "dragover"].forEach((name) => {
    dropZone.addEventListener(name, (event) => {
      event.preventDefault();
      dropZone.classList.add("dragging");
    });
  });
  ["dragleave", "drop"].forEach((name) => {
    dropZone.addEventListener(name, (event) => {
      event.preventDefault();
      dropZone.classList.remove("dragging");
    });
  });
  dropZone.addEventListener("drop", (event) => {
    selectedFile = event.dataTransfer.files?.[0] || null;
    if (selectedFile) toast(`已选择：${selectedFile.name}`);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      toast("先选择一张图片");
      return;
    }
    if (!selectedFile.type.startsWith("image/")) {
      toast("只能上传图片文件");
      return;
    }
    const src = await readFile(selectedFile);
    const images = loadJson(storageKeys.images, []);
    images.unshift({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      src,
      caption: caption.value.trim(),
      date: new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date())
    });
    if (!saveJson(storageKeys.images, images.slice(0, 18))) {
      toast("浏览器本地空间不足，图片没有保存");
      return;
    }
    form.reset();
    selectedFile = null;
    render();
    toast("图片已加入证据墙");
  });

  grid.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-image-id]");
    if (!button) return;
    const images = loadJson(storageKeys.images, []).filter((image) => image.id !== button.dataset.imageId);
    if (!saveJson(storageKeys.images, images)) {
      toast("浏览器本地空间不足，删除状态没有保存");
      return;
    }
    render();
    toast("已删除图片");
  });

  render();
}

function setupInterviewQuestions() {
  const form = $("#questionForm");
  const list = $("#questionList");
  if (!form || !list) return;

  const render = () => {
    const questions = loadJson(storageKeys.questions, []);
    if (!questions.length) {
      list.innerHTML = `<div class="empty-state">还没有记录面试问题。建议先补：项目难点、排错方法、方案取舍、量化结果、团队协作。</div>`;
      return;
    }
    list.innerHTML = questions.map((item) => `
      <article class="question-card">
        <div class="question-meta">
          <span>${escapeHtml(item.category || "面试问题")}</span>
          <time>${escapeHtml(item.date || "")}</time>
        </div>
        <h4>${escapeHtml(item.question || "未命名问题")}</h4>
        <p><strong>回答思路：</strong>${escapeHtml(item.answer || "还没整理回答。")}</p>
        <p><strong>关联证据：</strong>${escapeHtml(item.evidence || "待补充截图、数据或项目记录。")}</p>
        <div class="tag-row">${(item.tags || []).map((tag) => `<span># ${escapeHtml(tag)}</span>`).join("")}</div>
        <button type="button" data-question-id="${escapeHtml(item.id)}">删除问题</button>
      </article>
    `).join("");
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const rawTags = String(formData.get("tags") || "");
    const questions = loadJson(storageKeys.questions, []);
    questions.unshift({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      category: formData.get("category"),
      question: formData.get("question"),
      answer: formData.get("answer"),
      evidence: formData.get("evidence"),
      tags: rawTags.split(/[，,\s]+/).map((tag) => tag.trim()).filter(Boolean),
      date: new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date())
    });
    if (!saveJson(storageKeys.questions, questions)) {
      toast("浏览器本地空间不足，面试问题没有保存");
      return;
    }
    form.reset();
    render();
    toast("面试问题已记录");
  });

  list.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-question-id]");
    if (!button) return;
    const questions = loadJson(storageKeys.questions, []).filter((item) => item.id !== button.dataset.questionId);
    if (!saveJson(storageKeys.questions, questions)) {
      toast("浏览器本地空间不足，删除状态没有保存");
      return;
    }
    render();
    toast("已删除这个面试问题");
  });

  render();
}

function setupCopyButtons() {
  document.addEventListener("click", async (event) => {
    const button = event.target.closest(".copy-btn");
    if (!button) return;
    const targetId = button.dataset.copyTarget;
    const text = targetId ? $(`#${targetId}`)?.value : button.dataset.copy;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast("已复制到剪贴板");
    } catch {
      toast("复制失败，可以手动选中文本复制");
    }
  });
}

function setupNavigation() {
  const nav = $(".nav-shell");
  const toggle = $(".nav-toggle");
  if (!nav || !toggle) return;
  toggle.addEventListener("click", () => {
    const opened = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(opened));
  });
  $$(".nav-links a").forEach((link) => link.addEventListener("click", () => {
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  }));
}

function bindTiltCards() {
  $$(".tilt-card").forEach((card) => {
    if (card.dataset.tiltBound) return;
    card.dataset.tiltBound = "true";
    let rect = null;
    let nextTransform = "";
    let frame = 0;

    card.addEventListener("pointerenter", () => {
      rect = card.getBoundingClientRect();
    });
    card.addEventListener("pointermove", (event) => {
      rect = rect || card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      nextTransform = `perspective(900px) rotateX(${y * -5}deg) rotateY(${x * 7}deg) translateY(-4px)`;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        card.style.transform = nextTransform;
        frame = 0;
      });
    });
    card.addEventListener("pointerleave", () => {
      rect = null;
      cancelAnimationFrame(frame);
      frame = 0;
      card.style.transform = "";
    });
  });
}

function setupAnimations() {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    $$(".reveal").forEach((item) => {
      item.style.opacity = 1;
      item.style.transform = "none";
    });
    return;
  }

  const observer = new IntersectionObserver((items) => {
    items.forEach((item) => {
      if (item.isIntersecting) {
        item.target.style.opacity = 1;
        item.target.style.transform = "translateY(0)";
        observer.unobserve(item.target);
      }
    });
  }, { threshold: 0.12 });
  $$(".reveal").forEach((item) => observer.observe(item));
}

function toast(message) {
  let el = $(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 1800);
}

renderStats();
renderFilters();
setupFilters();
renderPosts();
renderTechCloud();
setupTimelineEditor();
setupSearch();
setupQuickNotes();
setupGallery();
setupInterviewQuestions();
setupCopyButtons();
setupNavigation();
bindTiltCards();
setupAnimations();
