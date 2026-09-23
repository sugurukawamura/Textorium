// popup.js - Textorium 2.0 Controller
/**
 * Textorium 2.0: The Intelligent Local Palette
 * High performance, zero-friction snippet and dynamic template manager.
 */

(() => {
  // Safe domain & i18n access
  const domain = (typeof window !== "undefined" && window.SnippetDomain) ||
    (typeof require !== "undefined" ? require("./snippet-domain.js") : {});
  const i18nSource = (typeof window !== "undefined" && window.I18N) ||
    (typeof require !== "undefined" ? require("./i18n.js") : {});

  // DOM Elements - Top Bar
  const openSidePanelBtn = document.getElementById("openSidePanelBtn");
  const quickAddBtn = document.getElementById("quickAddBtn");
  const settingsToggleBtn = document.getElementById("settingsToggleBtn");
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const languageSelect = document.getElementById("languageSelect");

  // DOM Elements - Editor Drawer
  const editorDrawer = document.getElementById("editorDrawer");
  const drawerTitle = document.getElementById("drawerTitle");
  const closeDrawerBtn = document.getElementById("closeDrawerBtn");
  const cancelDrawerBtn = document.getElementById("cancelDrawerBtn");
  const saveSnippetBtn = document.getElementById("saveSnippetBtn");
  const editSnippetId = document.getElementById("editSnippetId");
  const titleInput = document.getElementById("title");
  const contentInput = document.getElementById("content");
  const tagsInput = document.getElementById("tagsInput");
  const tagNameInput = document.getElementById("tagName");
  const tagCategoryInput = document.getElementById("tagCategory");

  // DOM Elements - Controls & Tabs
  const searchInput = document.getElementById("searchInput");
  const clearSearchBtn = document.getElementById("clearSearchBtn");
  const quickTabBtns = document.querySelectorAll(".tab-chip");
  const allCountBadge = document.getElementById("allCountBadge");
  const favCountBadge = document.getElementById("favCountBadge");
  const templateCountBadge = document.getElementById("templateCountBadge");
  const dynamicTagsList = document.getElementById("dynamicTagsList");
  const sortBySelect = document.getElementById("sortBy");
  const sortDirectionBtn = document.getElementById("sortDirection");

  // DOM Elements - Feed
  const snippetList = document.getElementById("snippetList");

  // DOM Elements - Template Runner Modal
  const templateModal = document.getElementById("templateModal");
  const templateModalTitle = document.getElementById("templateModalTitle");
  const closeTemplateModalBtn = document.getElementById("closeTemplateModalBtn");
  const cancelTemplateBtn = document.getElementById("cancelTemplateBtn");
  const templateFieldsContainer = document.getElementById("templateFieldsContainer");
  const templateLivePreview = document.getElementById("templateLivePreview");
  const copyRenderedBtn = document.getElementById("copyRenderedBtn");

  // DOM Elements - Settings Modal
  const settingsModal = document.getElementById("settingsModal");
  const closeSettingsModalBtn = document.getElementById("closeSettingsModalBtn");
  const exportBtn = document.getElementById("exportBtn");
  const importInput = document.getElementById("importInput");
  const addSamplesBtn = document.getElementById("addSamplesBtn");

  // DOM Elements - Feedback
  const toastMessage = document.getElementById("toastMessage");
  const statusMessage = document.getElementById("statusMessage");

  // Compatibility elements
  const filterTagsSelect = document.getElementById("filterTags");
  const filterFavoritesBtn = document.getElementById("filterFavoritesBtn");
  const searchBtn = document.getElementById("searchBtn");
  const applySortBtn = document.getElementById("applySortBtn");
  const clearFilterBtn = document.getElementById("clearFilterBtn");

  // Application State
  const state = {
    snippets: [],
    activeTab: "all", // "all" | "favorites" | "templates"
    activeTag: null,  // selected tag name or null
    searchQuery: "",
    sortBy: "updatedAt",
    sortDir: "desc",
    language: "ja",
    darkMode: false,
    activeTemplateSnippet: null,
    templateValues: {}
  };

  const SETTINGS_KEY = "settings";

  // Sample templates for quick start
  const SAMPLE_SNIPPETS = [
    {
      id: "sample-summary",
      title: "AI要約プロンプト",
      content: "以下の文章を要約してください。\n対象読者: {{ターゲット読者:初心者}}\n文字数: {{文字数:300文字以内}}\n出力形式: {{出力形式:箇条書き}}\n\n文章:\n{{文章}}",
      tags: [{ name: "prompt", category: "general" }, { name: "ai", category: "general" }],
      favorite: true,
      createdAt: Date.now() - 3000,
      updatedAt: Date.now() - 3000
    },
    {
      id: "sample-translate",
      title: "翻訳プロンプト",
      content: "以下のテキストを自然な{{言語:英語}}に翻訳してください。\nトーン: {{トーン:ビジネス・丁寧}}\n\n原文:\n{{原文}}",
      tags: [{ name: "prompt", category: "general" }, { name: "translate", category: "general" }],
      favorite: false,
      createdAt: Date.now() - 2000,
      updatedAt: Date.now() - 2000
    },
    {
      id: "sample-email-reply",
      title: "お礼メール定型文",
      content: "{{会社名・お名前}}様\n\nお世話になっております。{{自分の名前}}です。\n\n本日は{{件名:お打ち合わせ}}のお時間をいただき、誠にありがとうございました。\n引き続きよろしくお願い申し上げます。",
      tags: [{ name: "email", category: "general" }, { name: "business", category: "general" }],
      favorite: true,
      createdAt: Date.now() - 1000,
      updatedAt: Date.now() - 1000
    }
  ];

  // ==========================================
  // i18n & Localization
  // ==========================================

  function t(path, vars = {}) {
    const lang = state.language === "en" ? "en" : "ja";
    const dict = i18nSource[lang] || i18nSource.ja || {};
    const parts = path.split(".");
    let current = dict;

    for (const part of parts) {
      if (!current || typeof current !== "object") {
        return path;
      }
      current = current[part];
    }

    if (typeof current !== "string") {
      return path;
    }

    return current.replace(/\{(\w+)\}/g, (match, key) => {
      return vars[key] !== undefined ? vars[key] : match;
    });
  }

  function applyLocalization() {
    document.querySelectorAll("[data-i18n-text]").forEach((el) => {
      const key = el.getAttribute("data-i18n-text");
      el.textContent = t(key);
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      el.placeholder = t(key);
    });

    document.querySelectorAll("[data-aria-key]").forEach((el) => {
      const key = el.getAttribute("data-aria-key");
      el.setAttribute("aria-label", t(key));
    });

    if (sortDirectionBtn) {
      sortDirectionBtn.textContent = state.sortDir === "desc" ? "↓" : "↑";
    }
    if (languageSelect) {
      languageSelect.value = state.language;
    }
  }

  // ==========================================
  // Toast & Status Messages
  // ==========================================

  let toastTimer = null;
  function showToast(message) {
    if (!toastMessage) return;
    toastMessage.textContent = message;
    toastMessage.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastMessage.classList.add("hidden");
    }, 2200);
  }

  function showStatus(msg, type = "info") {
    showToast(msg);
    if (statusMessage) {
      statusMessage.textContent = msg;
      statusMessage.className = `status-message ${type}`;
      setTimeout(() => {
        statusMessage.classList.add("hidden");
      }, 2500);
    }
  }

  // ==========================================
  // Storage Integration
  // ==========================================

  async function getStoredSnippets() {
    return new Promise((resolve) => {
      if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) {
        resolve([]);
        return;
      }
      chrome.storage.local.get(["snippets"], (res) => {
        resolve(Array.isArray(res.snippets) ? res.snippets : []);
      });
    });
  }

  async function setStoredSnippets(snippets) {
    return new Promise((resolve) => {
      if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) {
        resolve();
        return;
      }
      chrome.storage.local.set({ snippets }, () => resolve());
    });
  }

  async function loadSettings() {
    return new Promise((resolve) => {
      if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) {
        resolve({});
        return;
      }
      chrome.storage.local.get([SETTINGS_KEY], (res) => {
        resolve(res[SETTINGS_KEY] || {});
      });
    });
  }

  async function saveSettings(settings) {
    return new Promise((resolve) => {
      if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) {
        resolve();
        return;
      }
      chrome.storage.local.set({ [SETTINGS_KEY]: settings }, () => resolve());
    });
  }

  // ==========================================
  // Filtering & Rendering
  // ==========================================

  function getFilteredSnippets() {
    let list = [...state.snippets];

    // Tab filter
    if (state.activeTab === "favorites") {
      list = list.filter((s) => !!s.favorite);
    } else if (state.activeTab === "templates") {
      list = list.filter((s) => {
        const vars = domain.extractTemplateVariables ? domain.extractTemplateVariables(s.content) : [];
        return vars.length > 0;
      });
    }

    // Tag filter
    if (state.activeTag) {
      list = list.filter((s) => {
        const tags = Array.isArray(s.tags) ? s.tags : [];
        return tags.some((t) => (t.name || "").toLowerCase() === state.activeTag.toLowerCase());
      });
    }

    // Search query filter
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.trim().toLowerCase();
      list = list.filter((s) => {
        const titleMatch = (s.title || "").toLowerCase().includes(q);
        const contentMatch = (s.content || "").toLowerCase().includes(q);
        const tagMatch = Array.isArray(s.tags) && s.tags.some((t) => (t.name || "").toLowerCase().includes(q));
        return titleMatch || contentMatch || tagMatch;
      });
    }

    // Sorting
    if (domain.sortSnippets) {
      list = domain.sortSnippets(list, state.sortBy, state.sortDir);
    }

    return list;
  }

  function updateCounts() {
    const total = state.snippets.length;
    const favCount = state.snippets.filter((s) => !!s.favorite).length;
    const templateCount = state.snippets.filter((s) => {
      const vars = domain.extractTemplateVariables ? domain.extractTemplateVariables(s.content) : [];
      return vars.length > 0;
    }).length;

    if (allCountBadge) allCountBadge.textContent = total;
    if (favCountBadge) favCountBadge.textContent = favCount;
    if (templateCountBadge) templateCountBadge.textContent = templateCount;
  }

  function renderDynamicTags() {
    if (!dynamicTagsList) return;
    dynamicTagsList.innerHTML = "";

    const tagCounts = new Map();
    state.snippets.forEach((s) => {
      if (Array.isArray(s.tags)) {
        s.tags.forEach((t) => {
          if (t && t.name) {
            const name = t.name.trim();
            const lower = name.toLowerCase();
            tagCounts.set(lower, { name, count: (tagCounts.get(lower)?.count || 0) + 1 });
          }
        });
      }
    });

    if (tagCounts.size === 0) {
      dynamicTagsList.style.display = "none";
      return;
    }
    dynamicTagsList.style.display = "flex";

    tagCounts.forEach((val, lower) => {
      const bubble = document.createElement("button");
      bubble.className = `tag-bubble ${state.activeTag === lower ? "active" : ""}`;
      bubble.textContent = `#${val.name} (${val.count})`;
      bubble.addEventListener("click", () => {
        if (state.activeTag === lower) {
          state.activeTag = null;
        } else {
          state.activeTag = lower;
        }
        renderDynamicTags();
        renderSnippetList();
      });
      dynamicTagsList.appendChild(bubble);
    });
  }

  function renderSnippetList() {
    if (!snippetList) return;
    snippetList.innerHTML = "";

    const filtered = getFilteredSnippets();

    if (filtered.length === 0) {
      const emptyWrap = document.createElement("div");
      emptyWrap.className = "empty-state";

      const icon = document.createElement("div");
      icon.className = "empty-icon";
      icon.textContent = state.snippets.length === 0 ? "✨" : "🔍";

      const title = document.createElement("div");
      title.className = "empty-title";
      title.textContent = state.snippets.length === 0 ? t("empty.welcome") : t("empty.noSnippets");

      const desc = document.createElement("div");
      desc.className = "empty-desc";
      desc.textContent = state.snippets.length === 0 ? t("empty.welcomeDesc") : "";

      emptyWrap.appendChild(icon);
      emptyWrap.appendChild(title);
      emptyWrap.appendChild(desc);

      if (state.snippets.length === 0) {
        const addBtn = document.createElement("button");
        addBtn.className = "btn-primary";
        addBtn.textContent = t("action.addSample");
        addBtn.addEventListener("click", addSamplePrompts);
        emptyWrap.appendChild(addBtn);
      }

      snippetList.appendChild(emptyWrap);
      return;
    }

    filtered.forEach((snippet) => {
      const card = renderSnippetCard(snippet);
      snippetList.appendChild(card);
    });
  }

  function renderSnippetCard(snippet) {
    const card = document.createElement("div");
    card.className = "snippet-card snippet-item";
    card.dataset.id = snippet.id;

    const vars = domain.extractTemplateVariables ? domain.extractTemplateVariables(snippet.content) : [];
    const isTemplate = vars.length > 0;

    // Card Header Row (.snippet-head)
    const headEl = document.createElement("div");
    headEl.className = "snippet-head snippet-card-top";

    const titleGroup = document.createElement("div");
    titleGroup.className = "title-group";

    // Favorite button (first button in .snippet-head)
    const favBtn = document.createElement("button");
    favBtn.className = `fav-btn ${snippet.favorite ? "is-fav" : ""}`;
    favBtn.textContent = snippet.favorite ? "★" : "☆";
    favBtn.title = t("aria.toggleFavorite");
    favBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      snippet.favorite = !snippet.favorite;
      snippet.updatedAt = Date.now();
      await setStoredSnippets(state.snippets);
      updateCounts();
      renderSnippetList();
      showToast(snippet.favorite ? t("status.favoriteAdded") : t("status.favoriteRemoved"));
    });

    const titleEl = document.createElement("h3");
    titleEl.className = "snippet-title";
    titleEl.textContent = snippet.title || (domain.inferTitleFromContent ? domain.inferTitleFromContent(snippet.content) : "Untitled");

    titleGroup.appendChild(favBtn);
    titleGroup.appendChild(titleEl);

    // Badges
    const badgesGroup = document.createElement("div");
    badgesGroup.className = "snippet-badges";

    if (isTemplate) {
      const templateBadge = document.createElement("span");
      templateBadge.className = "badge-template";
      templateBadge.textContent = "⚡ TEMPLATE";
      badgesGroup.appendChild(templateBadge);
    }

    headEl.appendChild(titleGroup);
    headEl.appendChild(badgesGroup);
    card.appendChild(headEl);

    // Tags Row
    if (Array.isArray(snippet.tags) && snippet.tags.length > 0) {
      const tagsRow = document.createElement("div");
      tagsRow.className = "snippet-tags-row";
      snippet.tags.forEach((tItem) => {
        if (tItem && tItem.name) {
          const tagSpan = document.createElement("span");
          tagSpan.className = "card-tag";
          tagSpan.textContent = `#${tItem.name}`;
          tagSpan.style.cursor = "pointer";
          tagSpan.addEventListener("click", (e) => {
            e.stopPropagation();
            state.activeTag = tItem.name.toLowerCase();
            renderDynamicTags();
            renderSnippetList();
          });
          tagsRow.appendChild(tagSpan);
        }
      });
      card.appendChild(tagsRow);
    }

    // Content Body with variable highlighting
    const bodyEl = document.createElement("div");
    bodyEl.className = "snippet-body";
    highlightTemplateBody(bodyEl, snippet.content);
    card.appendChild(bodyEl);

    // Expand toggle if content is long
    if (snippet.content && (snippet.content.length > 140 || snippet.content.split("\n").length > 3)) {
      const toggleBtn = document.createElement("button");
      toggleBtn.className = "btn-toggle-expand";
      toggleBtn.textContent = t("action.readMore");
      toggleBtn.addEventListener("click", () => {
        const isExp = bodyEl.classList.toggle("expanded");
        toggleBtn.textContent = isExp ? t("action.showLess") : t("action.readMore");
      });
      card.appendChild(toggleBtn);
    }

    // Actions Row (.snippet-actions)
    const actionsRow = document.createElement("div");
    actionsRow.className = "snippet-actions snippet-card-bottom";

    // 1st button: Copy Action
    const copyBtn = document.createElement("button");
    copyBtn.className = `btn-copy-action ${isTemplate ? "is-template" : ""}`;
    copyBtn.innerHTML = isTemplate ? `<span>⚡ ${t("action.fillAndCopy")}</span>` : `<span>📋 ${t("action.copy")}</span>`;
    copyBtn.addEventListener("click", async () => {
      if (isTemplate) {
        openTemplateRunner(snippet);
      } else {
        await executeDirectCopy(snippet.content, copyBtn);
      }
    });

    // 2nd button: Edit Action
    const editBtn = document.createElement("button");
    editBtn.className = "btn-card-action";
    editBtn.textContent = "✏️";
    editBtn.title = t("action.edit");

    // 3rd button: Delete Action
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-card-action danger";
    deleteBtn.textContent = "🗑️";
    deleteBtn.title = t("action.delete");
    deleteBtn.addEventListener("click", async () => {
      if (confirm(t("confirm.delete"))) {
        state.snippets = state.snippets.filter((s) => s.id !== snippet.id);
        await setStoredSnippets(state.snippets);
        updateCounts();
        renderDynamicTags();
        renderSnippetList();
        showToast(t("status.deleted"));
      }
    });

    actionsRow.appendChild(copyBtn);
    actionsRow.appendChild(editBtn);
    actionsRow.appendChild(deleteBtn);
    card.appendChild(actionsRow);

    // Inline Edit Form Container (.edit-container, must be last child of .snippet-item)
    const editContainer = document.createElement("div");
    editContainer.className = "edit-container hidden";

    const editTitleInput = document.createElement("input");
    editTitleInput.type = "text";
    editTitleInput.value = snippet.title || "";
    editTitleInput.placeholder = t("placeholder.title");

    const editTagInput = document.createElement("input");
    editTagInput.type = "text";
    editTagInput.value = (snippet.tags || []).map((t) => t.name).join(", ");
    editTagInput.placeholder = "タグ (カンマ区切り)";

    const editContentInput = document.createElement("textarea");
    editContentInput.value = snippet.content || "";
    editContentInput.placeholder = t("placeholder.content");

    const editActions = document.createElement("div");
    editActions.className = "edit-actions";

    const saveChangesBtn = document.createElement("button");
    saveChangesBtn.className = "btn-primary";
    saveChangesBtn.textContent = t("action.saveChanges");
    saveChangesBtn.addEventListener("click", async () => {
      snippet.title = editTitleInput.value.trim() || (domain.inferTitleFromContent ? domain.inferTitleFromContent(editContentInput.value) : "Untitled");
      snippet.content = editContentInput.value.trim();
      const tagNames = editTagInput.value.split(/[,、]/).map((s) => s.trim().replace(/^#/, "")).filter(Boolean);
      snippet.tags = tagNames.map((name) => ({ name, category: "general" }));
      snippet.updatedAt = Date.now();

      await setStoredSnippets(state.snippets);
      updateCounts();
      renderDynamicTags();
      renderSnippetList();
      showToast(t("status.updated"));
    });

    const cancelEditBtn = document.createElement("button");
    cancelEditBtn.className = "btn-ghost";
    cancelEditBtn.textContent = t("action.cancel");
    cancelEditBtn.addEventListener("click", () => {
      editContainer.classList.add("hidden");
    });

    editActions.appendChild(saveChangesBtn);
    editActions.appendChild(cancelEditBtn);

    editContainer.appendChild(editTitleInput);
    editContainer.appendChild(editTagInput);
    editContainer.appendChild(editContentInput);
    editContainer.appendChild(editActions);

    editBtn.addEventListener("click", () => {
      editContainer.classList.toggle("hidden");
    });

    card.appendChild(editContainer);

    return card;
  }

  function highlightTemplateBody(container, content) {
    if (!content) return;
    const parts = content.split(/(\{\{[^}]+\}\})/g);
    parts.forEach((part) => {
      if (part.startsWith("{{") && part.endsWith("}}")) {
        const mark = document.createElement("mark");
        mark.className = "var-highlight";
        mark.textContent = part;
        container.appendChild(mark);
      } else {
        container.appendChild(document.createTextNode(part));
      }
    });
  }

  async function executeDirectCopy(text, btnElement = null) {
    try {
      await navigator.clipboard.writeText(text);
      if (btnElement) {
        const originalText = btnElement.innerHTML;
        btnElement.classList.add("copied");
        btnElement.innerHTML = `<span>${t("action.copied")}</span>`;
        setTimeout(() => {
          btnElement.classList.remove("copied");
          btnElement.innerHTML = originalText;
        }, 1500);
      }
      showToast(t("status.copied"));
    } catch (err) {
      console.error("Copy failed:", err);
      showToast(t("error.copyFailed"));
    }
  }

  // ==========================================
  // Dynamic Template Modal
  // ==========================================

  function openTemplateRunner(snippet) {
    state.activeTemplateSnippet = snippet;
    state.templateValues = {};

    if (templateModalTitle) {
      templateModalTitle.textContent = snippet.title || "Template";
    }

    if (templateFieldsContainer) {
      templateFieldsContainer.innerHTML = "";
    }

    const vars = domain.extractTemplateVariables ? domain.extractTemplateVariables(snippet.content) : [];
    vars.forEach((v) => {
      state.templateValues[v.name] = v.defaultValue || "";

      const fieldWrap = document.createElement("div");
      fieldWrap.className = "template-var-field";

      const lbl = document.createElement("label");
      lbl.textContent = v.name;

      const inp = document.createElement("input");
      inp.type = "text";
      inp.value = v.defaultValue || "";
      inp.placeholder = v.defaultValue ? `デフォルト: ${v.defaultValue}` : `${v.name} を入力`;

      inp.addEventListener("input", (e) => {
        state.templateValues[v.name] = e.target.value;
        updateTemplateLivePreview();
      });

      inp.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          executeTemplateCopy();
        }
      });

      fieldWrap.appendChild(lbl);
      fieldWrap.appendChild(inp);
      templateFieldsContainer.appendChild(fieldWrap);
    });

    updateTemplateLivePreview();

    if (templateModal) {
      templateModal.classList.remove("hidden");
      // Focus first input
      setTimeout(() => {
        const firstInput = templateFieldsContainer.querySelector("input");
        if (firstInput) firstInput.focus();
      }, 50);
    }
  }

  function updateTemplateLivePreview() {
    if (!templateLivePreview || !state.activeTemplateSnippet) return;
    const rendered = domain.renderTemplate
      ? domain.renderTemplate(state.activeTemplateSnippet.content, state.templateValues)
      : state.activeTemplateSnippet.content;
    templateLivePreview.textContent = rendered;
  }

  async function executeTemplateCopy() {
    if (!state.activeTemplateSnippet) return;
    const rendered = domain.renderTemplate
      ? domain.renderTemplate(state.activeTemplateSnippet.content, state.templateValues)
      : state.activeTemplateSnippet.content;

    await executeDirectCopy(rendered);
    closeTemplateModal();
  }

  function closeTemplateModal() {
    if (templateModal) {
      templateModal.classList.add("hidden");
    }
    state.activeTemplateSnippet = null;
    state.templateValues = {};
  }

  // ==========================================
  // Editor Drawer (Quick Add / Edit)
  // ==========================================

  function openEditor(snippet = null) {
    if (!editorDrawer) return;

    if (snippet) {
      // Edit mode
      if (drawerTitle) drawerTitle.textContent = t("action.edit");
      if (editSnippetId) editSnippetId.value = snippet.id;
      if (titleInput) titleInput.value = snippet.title || "";
      if (contentInput) contentInput.value = snippet.content || "";
      const tagNames = Array.isArray(snippet.tags) ? snippet.tags.map((t) => t.name).join(", ") : "";
      if (tagsInput) tagsInput.value = tagNames;
      if (tagNameInput) tagNameInput.value = snippet.tags?.[0]?.name || "";
      if (tagCategoryInput) tagCategoryInput.value = snippet.tags?.[0]?.category || "general";
    } else {
      // Create mode
      if (drawerTitle) drawerTitle.textContent = t("section.add");
      if (editSnippetId) editSnippetId.value = "";
      if (titleInput) titleInput.value = "";
      if (contentInput) contentInput.value = "";
      if (tagsInput) tagsInput.value = "";
      if (tagNameInput) tagNameInput.value = "";
      if (tagCategoryInput) tagCategoryInput.value = "";
    }

    if (editorDrawer) {
      editorDrawer.open = true;
      editorDrawer.classList.remove("hidden");
    }
    setTimeout(() => {
      if (contentInput) contentInput.focus();
    }, 50);
  }

  function closeEditor() {
    if (editorDrawer && editorDrawer.tagName.toLowerCase() === "details") {
      // Keep open if details in standard view or toggle
    } else if (editorDrawer) {
      editorDrawer.classList.add("hidden");
    }
    if (editSnippetId) editSnippetId.value = "";
    if (titleInput) titleInput.value = "";
    if (contentInput) contentInput.value = "";
    if (tagsInput) tagsInput.value = "";
    if (tagNameInput) tagNameInput.value = "";
    if (tagCategoryInput) tagCategoryInput.value = "";
  }

  async function handleSaveSnippet() {
    const rawContent = (contentInput.value || "").trim();
    if (!rawContent) {
      showToast(t("error.requiredTitleContent"));
      contentInput.focus();
      return;
    }

    let rawTitle = (titleInput.value || "").trim();
    if (!rawTitle && domain.inferTitleFromContent) {
      rawTitle = domain.inferTitleFromContent(rawContent);
    }
    if (!rawTitle) {
      rawTitle = "Untitled";
    }

    // Extract tags from tagsInput + tagNameInput + inline hashtags from content
    const inputTagStr = [tagsInput?.value, tagNameInput?.value].filter(Boolean).join(", ");
    const manualTags = inputTagStr
      .split(/[,、]/)
      .map((s) => s.trim().replace(/^#/, ""))
      .filter(Boolean);

    const inlineHashtags = domain.extractHashtags ? domain.extractHashtags(rawContent).map((t) => t.name) : [];
    const allTagNames = Array.from(new Set([...manualTags, ...inlineHashtags]));
    const tagObjects = allTagNames.map((name) => ({ name, category: "general" }));

    const id = editSnippetId.value;
    const now = Date.now();

    if (id) {
      // Update existing
      const existing = state.snippets.find((s) => s.id === id);
      if (existing) {
        existing.title = rawTitle;
        existing.content = rawContent;
        existing.tags = tagObjects;
        existing.updatedAt = now;
        showToast(t("status.updated"));
      }
    } else {
      // Create new
      const newSnippet = {
        id: (typeof utils !== "undefined" && utils.generateId) ? utils.generateId() : `id-${Math.random().toString(36).substr(2, 9)}`,
        title: rawTitle,
        content: rawContent,
        tags: tagObjects,
        favorite: false,
        createdAt: now,
        updatedAt: now
      };
      state.snippets.unshift(newSnippet);
      showToast(t("status.saved"));
    }

    await setStoredSnippets(state.snippets);
    closeEditor();
    updateCounts();
    renderDynamicTags();
    renderSnippetList();
  }

  // ==========================================
  // Sample Prompts
  // ==========================================

  async function addSamplePrompts() {
    const existingIds = new Set(state.snippets.map((s) => s.id));
    const toAdd = SAMPLE_SNIPPETS.filter((s) => !existingIds.has(s.id));

    if (toAdd.length === 0) {
      SAMPLE_SNIPPETS.forEach((s) => {
        const copy = { ...s, id: `sample-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` };
        state.snippets.push(copy);
      });
    } else {
      state.snippets.push(...toAdd);
    }

    await setStoredSnippets(state.snippets);
    updateCounts();
    renderDynamicTags();
    renderSnippetList();
    showToast(t("status.samplesAdded"));
    closeSettingsModal();
  }

  // ==========================================
  // Settings & Backup Modal
  // ==========================================

  function openSettingsModal() {
    if (settingsModal) {
      settingsModal.classList.remove("hidden");
    }
  }

  function closeSettingsModal() {
    if (settingsModal) {
      settingsModal.classList.add("hidden");
    }
  }

  function handleExport() {
    const dataStr = JSON.stringify(state.snippets, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `textorium_export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t("status.exported"));
  }

  function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const raw = JSON.parse(event.target.result);
        if (!Array.isArray(raw)) {
          showToast(t("error.importInvalid"));
          return;
        }

        const mergeFn = (typeof utils !== "undefined" && utils.mergeSnippets) ? utils.mergeSnippets : (a, b) => ({ ...a, ...b });
        const result = domain.mergeImportedSnippets
          ? domain.mergeImportedSnippets(state.snippets, raw, Date.now(), mergeFn)
          : { snippets: raw, added: raw.length, updated: 0, invalid: 0 };

        state.snippets = result.snippets;
        await setStoredSnippets(state.snippets);

        updateCounts();
        renderDynamicTags();
        renderSnippetList();
        showToast(t("status.importFinished", result));
        closeSettingsModal();
      } catch (err) {
        console.error("Import error:", err);
        showToast(t("error.importInvalid"));
      } finally {
        importInput.value = "";
      }
    };
    reader.readAsText(file);
  }

  // ==========================================
  // Event Listeners Setup
  // ==========================================

  function setupEventListeners() {
    // Open Side Panel button
    if (openSidePanelBtn) {
      openSidePanelBtn.addEventListener("click", () => {
        if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ action: "openSidePanel" }, (response) => {
            if (response && response.success) {
              window.close();
            }
          });
        }
      });
    }

    // Quick Add
    if (quickAddBtn) {
      quickAddBtn.addEventListener("click", () => {
        if (editorDrawer && !editorDrawer.classList.contains("hidden")) {
          closeEditor();
        } else {
          openEditor();
        }
      });
    }

    if (closeDrawerBtn) closeDrawerBtn.addEventListener("click", closeEditor);
    if (cancelDrawerBtn) cancelDrawerBtn.addEventListener("click", closeEditor);
    if (saveSnippetBtn) saveSnippetBtn.addEventListener("click", handleSaveSnippet);

    // Keyboard shortcut in editor: Ctrl/Cmd + Enter to save
    if (contentInput) {
      contentInput.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          handleSaveSnippet();
        }
      });
    }

    // Search Box
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        state.searchQuery = searchInput.value;
        if (clearSearchBtn) {
          clearSearchBtn.classList.toggle("hidden", !state.searchQuery);
        }
        renderSnippetList();
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener("click", () => {
        state.searchQuery = "";
        searchInput.value = "";
        clearSearchBtn.classList.add("hidden");
        renderSnippetList();
        searchInput.focus();
      });
    }

    // Quick Tabs
    quickTabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        quickTabBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.activeTab = btn.dataset.tab;
        renderSnippetList();
      });
    });

    // Sort Selector & Direction
    if (sortBySelect) {
      sortBySelect.addEventListener("change", () => {
        state.sortBy = sortBySelect.value;
        renderSnippetList();
      });
    }

    if (sortDirectionBtn) {
      sortDirectionBtn.addEventListener("click", () => {
        state.sortDir = state.sortDir === "desc" ? "asc" : "desc";
        sortDirectionBtn.textContent = state.sortDir === "desc" ? "↓" : "↑";
        renderSnippetList();
      });
    }

    // Template Modal Buttons
    if (closeTemplateModalBtn) closeTemplateModalBtn.addEventListener("click", closeTemplateModal);
    if (cancelTemplateBtn) cancelTemplateBtn.addEventListener("click", closeTemplateModal);
    if (copyRenderedBtn) copyRenderedBtn.addEventListener("click", executeTemplateCopy);

    // Settings Modal Buttons
    if (settingsToggleBtn) settingsToggleBtn.addEventListener("click", openSettingsModal);
    if (closeSettingsModalBtn) closeSettingsModalBtn.addEventListener("click", closeSettingsModal);
    if (exportBtn) exportBtn.addEventListener("click", handleExport);
    if (importInput) importInput.addEventListener("change", handleImport);
    if (addSamplesBtn) addSamplesBtn.addEventListener("click", addSamplePrompts);

    // Theme Toggle
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener("click", async () => {
        state.darkMode = !state.darkMode;
        document.body.classList.toggle("dark-mode", state.darkMode);
        themeToggleBtn.textContent = state.darkMode ? "☀️" : "🌙";
        const theme = state.darkMode ? "dark" : "light";
        await saveSettings({
          ...state.settings,
          theme,
          darkMode: state.darkMode,
          language: state.language
        });
      });
    }

    // Language Select
    if (languageSelect) {
      languageSelect.addEventListener("change", async () => {
        state.language = languageSelect.value;
        applyLocalization();
        renderSnippetList();
        const theme = state.darkMode ? "dark" : "light";
        await saveSettings({
          ...state.settings,
          theme,
          darkMode: state.darkMode,
          language: state.language
        });
      });
    }

    // Compatibility & search button event listeners
    if (searchBtn) {
      searchBtn.addEventListener("click", () => {
        if (searchInput) {
          state.searchQuery = searchInput.value;
          if (clearSearchBtn) {
            clearSearchBtn.classList.toggle("hidden", !state.searchQuery);
          }
        }
        renderSnippetList();
      });
    }
    if (applySortBtn) applySortBtn.addEventListener("click", () => renderSnippetList());
    if (clearFilterBtn) {
      clearFilterBtn.addEventListener("click", () => {
        state.activeTab = "all";
        state.activeTag = null;
        state.searchQuery = "";
        if (searchInput) searchInput.value = "";
        quickTabBtns.forEach((b) => b.classList.toggle("active", b.dataset.tab === "all"));
        renderDynamicTags();
        renderSnippetList();
      });
    }
  }

  // ==========================================
  // Initialization
  // ==========================================

  async function init() {
    // 1. Load Settings
    const settings = await loadSettings();
    state.settings = settings;
    state.language = settings.language || (navigator.language.startsWith("ja") ? "ja" : "en");
    state.darkMode = settings.theme === "dark" || !!settings.darkMode;

    document.body.classList.toggle("dark-mode", state.darkMode);
    if (themeToggleBtn) {
      themeToggleBtn.textContent = state.darkMode ? "☀️" : "🌙";
    }

    applyLocalization();
    setupEventListeners();

    // 2. Load Snippets
    const stored = await getStoredSnippets();
    state.snippets = stored;

    updateCounts();
    renderDynamicTags();
    renderSnippetList();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
