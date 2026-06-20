const entries = window.INTERNSHIP_ENTRIES || [];
const milestones = window.INTERNSHIP_MILESTONES || [];

const storageKeys = {
  notes: "internship-blog-notes",
  images: "internship-blog-images",
  timeline: "internship-blog-timeline",
  questions: "internship-blog-interview-questions"
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
  wrapper.addEventListener("click", (event) => {
    const button = event.target.closest(".chip");
    if (!button) return;
    activeType = button.dataset.type;
    renderFilters();
    renderPosts();
  }, { once: true });
}

function renderPosts() {
  const grid = $("#postGrid");
  if (!grid) return;
  const keyword = searchKeyword.trim().toLowerCase();
  const filtered = entries.filter((item) => {
    const matchType = activeType === "全部" || item.type === activeType;
    const haystack = [item.title, item.summary, item.type, item.project, item.result, ...item.tags].join(" ").toLowerCase();
    return matchType && haystack.includes(keyword);
  });

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state">暂时没找到匹配记录。可以换个关键词，或者把今天的内容先写进“今日速记”。</div>`;
    return;
  }

  grid.innerHTML = filtered.map((item) => `
    <article class="post-card glass tilt-card">
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
    id: `default-${index + 1}`,
    date: item.date,
    title: item.title,
    detail: item.detail
  }));
}

function getTimelineItems() {
  const saved = loadJson(storageKeys.timeline, null);
  return Array.isArray(saved) && saved.length ? saved : getDefaultTimelineItems();
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
    const items = getTimelineItems();
    const existed = items.some((item) => item.id === id);
    const nextItems = existed
      ? items.map((item) => item.id === id ? nextItem : item)
      : [...items, nextItem];
    saveJson(storageKeys.timeline, nextItems);
    renderTimeline();
    resetForm();
    toast(existed ? "时间线已更新" : "已加入成长时间线");
  });

  timeline.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-timeline-action]");
    if (!button) return;
    const id = button.dataset.timelineId;
    const action = button.dataset.timelineAction;
    const items = getTimelineItems();
    const item = items.find((current) => current.id === id);
    if (!item) return;

    if (action === "delete") {
      saveJson(storageKeys.timeline, items.filter((current) => current.id !== id));
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
  input.addEventListener("input", (event) => {
    searchKeyword = event.target.value;
    renderPosts();
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
  localStorage.setItem(key, JSON.stringify(value));
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
  const tokenPattern = /(https?:\/\/[^\s，。；、)）]+|[A-Za-z]:\\[^，。；\n]+|`[^`]+`|\b(?:DevSpace|Cloudflare Tunnel|trycloudflare\.com|ChatGPT|OAuth|MCP|JSON|BOM|allowedRoots|cloudflared|config\.json|Owner password|token)\b)/gi;
  return String(text).split(tokenPattern).map((part) => {
    if (!part) return "";
    if (/^https?:\/\//i.test(part)) {
      return `<a class="note-link" href="${escapeHtml(part)}" target="_blank" rel="noreferrer">${escapeHtml(part)}</a>`;
    }
    if (/^[A-Za-z]:\\/.test(part) || /^`[^`]+`$/.test(part)) {
      return `<code class="note-code">${escapeHtml(part.replace(/^`|`$/g, ""))}</code>`;
    }
    if (/^(DevSpace|Cloudflare Tunnel|trycloudflare\.com|ChatGPT|OAuth|MCP|JSON|BOM|allowedRoots|cloudflared|config\.json|Owner password|token)$/i.test(part)) {
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
  const headingWords = "今天做了什么|具体做了这些事|遇到的问题|结果证据|结果|下一步|面试可讲|技术笔记|学习心得|复盘|判断标准";
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
  const headingPattern = /^(今天做了什么|具体做了这些事|遇到的问题|结果证据|结果|下一步|面试可讲|技术笔记|学习心得|复盘|判断标准)[：:]\s*(.*)$/;
  const headingClassMap = {
    "今天做了什么": "done",
    "具体做了这些事": "done",
    "遇到的问题": "problem",
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
  if (!form || !list) return;

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

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const notes = loadJson(storageKeys.notes, []);
    const now = new Date();
    notes.unshift({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      title: formData.get("title"),
      type: formData.get("type"),
      body: formData.get("body"),
      date: new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(now),
      createdAt: now.toISOString()
    });
    saveJson(storageKeys.notes, notes);
    form.reset();
    render();
    toast("已保存到本地速记");
  });

  list.addEventListener("click", (event) => {
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
    const notes = loadJson(storageKeys.notes, []).filter((note) => note.id !== button.dataset.noteId);
    saveJson(storageKeys.notes, notes);
    render();
    toast("已删除这条速记");
  });

  render();
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
    saveJson(storageKeys.images, images.slice(0, 18));
    form.reset();
    selectedFile = null;
    render();
    toast("图片已加入证据墙");
  });

  grid.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-image-id]");
    if (!button) return;
    const images = loadJson(storageKeys.images, []).filter((image) => image.id !== button.dataset.imageId);
    saveJson(storageKeys.images, images);
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
    saveJson(storageKeys.questions, questions);
    form.reset();
    render();
    toast("面试问题已记录");
  });

  list.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-question-id]");
    if (!button) return;
    const questions = loadJson(storageKeys.questions, []).filter((item) => item.id !== button.dataset.questionId);
    saveJson(storageKeys.questions, questions);
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
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${y * -5}deg) rotateY(${x * 7}deg) translateY(-4px)`;
    });
    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });
}

function setupAnimations() {
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(window.ScrollTrigger);
    gsap.to(".reveal", {
      opacity: 1,
      y: 0,
      duration: 0.85,
      ease: "power3.out",
      stagger: 0.08,
      scrollTrigger: {
        trigger: "body",
        start: "top 80%"
      }
    });
    $$(".reveal").forEach((item) => {
      gsap.to(item, {
        opacity: 1,
        y: 0,
        duration: 0.85,
        ease: "power3.out",
        scrollTrigger: { trigger: item, start: "top 86%" }
      });
    });
    gsap.from(".bar i", {
      scaleX: 0,
      duration: 1.2,
      ease: "power3.out",
      transformOrigin: "left",
      scrollTrigger: { trigger: ".skill-board", start: "top 80%" }
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
