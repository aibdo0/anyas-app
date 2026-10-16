(() => {
  "use strict";

  const STORAGE_KEY = "anyas_wird_playlists_v1";
  const MAX_PLAYLISTS = 20;
  const MAX_ITEMS = 100;
  const MAX_REPEAT = 999;
  const t = (ar, en) => document.documentElement.lang === "en" ? en : ar;
  const allTopics = () => Array.isArray(window.azkarTopics) ? window.azkarTopics : [];

  function normalizePlaylist(value) {
    if (!value || typeof value !== "object") return null;
    const id = String(value.id || "").trim();
    const name = String(value.name || "").trim().slice(0, 48);
    if (!/^[\w-]{1,80}$/.test(id) || !name || !Array.isArray(value.items)) return null;
    const items = value.items.slice(0, MAX_ITEMS).map(entry => {
      const topicNumber = Number(entry?.topicNumber);
      const sourceIndex = Number(entry?.sourceIndex);
      const count = Number(entry?.count);
      if (!Number.isInteger(topicNumber) || topicNumber < 0 || !Number.isInteger(sourceIndex) || sourceIndex < 0 || !Number.isInteger(count) || count < 1 || count > MAX_REPEAT) return null;
      return { topicNumber, sourceIndex, count };
    }).filter(Boolean);
    if (!items.length) return null;
    return {
      id,
      name,
      items,
      revision: Math.max(1, Math.floor(Number(value.revision) || 1)),
      updatedAt: Number(value.updatedAt) || 0
    };
  }

  function loadPlaylists() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(saved)) return [];
      return saved.map(normalizePlaylist).filter(Boolean).slice(0, MAX_PLAYLISTS);
    } catch (_) {
      return [];
    }
  }

  function savePlaylists(playlists) {
    const clean = (Array.isArray(playlists) ? playlists : [])
      .map(normalizePlaylist).filter(Boolean).slice(0, MAX_PLAYLISTS);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
      return true;
    } catch (_) {
      return false;
    }
  }

  function resolveEntries(entries) {
    if (!Array.isArray(entries)) return [];
    return entries.slice(0, MAX_ITEMS).map((entry, index) => {
      const topic = allTopics().find(item => Number(item.number) === Number(entry.topicNumber));
      const item = Array.isArray(topic?.items) ? topic.items[Number(entry.sourceIndex)] : null;
      const count = Number(entry.count);
      if (!topic || !item || !item.text || !Number.isInteger(count) || count < 1 || count > MAX_REPEAT) return null;
      return {
        item,
        sourceIndex: Number(entry.sourceIndex),
        topicNumber: Number(topic.number),
        topicTitle: String(topic.title || "حصن المسلم"),
        count,
        sourceCount: Math.max(1, Number(item.count) || 1),
        progressKey: String(index)
      };
    }).filter(Boolean);
  }

  window.AnyasWirdPlaylists = { load: loadPlaylists, save: savePlaylists, normalize: normalizePlaylist, resolve: resolveEntries };

  function init() {
    const manager = document.getElementById("wirdPlaylistManager");
    const form = document.getElementById("wirdPlaylistForm");
    const nameInput = document.getElementById("wirdPlaylistName");
    const topicSelect = document.getElementById("wirdPlaylistTopic");
    const picker = document.getElementById("wirdPlaylistPicker");
    const draftList = document.getElementById("wirdPlaylistDraft");
    const savedList = document.getElementById("wirdPlaylistSaved");
    const status = document.getElementById("wirdPlaylistStatus");
    if (!manager || !form || !topicSelect || !picker || !draftList || !savedList) return;

    let draft = [];
    let editingId = null;
    const announce = message => { if (status) status.textContent = message; };
    const topicFor = number => allTopics().find(topic => Number(topic.number) === Number(number));
    const setButton = (label, action, className = "wird-playlist-action") => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = className;
      button.textContent = label;
      button.addEventListener("click", action);
      return button;
    };

    function renderTopics() {
      const previous = topicSelect.value;
      topicSelect.replaceChildren();
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = t("اختر بابًا من حصن المسلم", "Choose a chapter from Hisn al-Muslim");
      topicSelect.appendChild(placeholder);
      allTopics().forEach(topic => {
        const option = document.createElement("option");
        option.value = String(topic.number);
        option.textContent = `${topic.number}. ${topic.title || t("باب الأذكار", "Adhkar chapter")}`;
        topicSelect.appendChild(option);
      });
      if (previous) topicSelect.value = previous;
      renderPicker();
    }

    function renderPicker() {
      picker.replaceChildren();
      const topic = topicFor(topicSelect.value);
      if (!topic || !Array.isArray(topic.items)) {
        const hint = document.createElement("p");
        hint.className = "wird-playlist-hint";
        hint.textContent = t("اختر بابًا لعرض الأذكار المتاحة. النصوص والأعداد الافتراضية من بيانات حصن المسلم المحلية.", "Choose a chapter to see its adhkar. Text and default counts come from the local Hisn al-Muslim data.");
        picker.appendChild(hint);
        return;
      }
      topic.items.forEach((item, sourceIndex) => {
        if (!item?.text) return;
        const row = document.createElement("label");
        row.className = "wird-playlist-pick-row";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.dataset.sourceIndex = String(sourceIndex);
        const copy = document.createElement("span");
        copy.className = "wird-playlist-pick-copy";
        const text = document.createElement("span");
        text.textContent = String(item.text).replace(/\s+/g, " ").trim();
        const sourceCount = Math.max(1, Number(item.count) || 1);
        const countWrap = document.createElement("span");
        countWrap.className = "wird-playlist-count-wrap";
        const source = document.createElement("small");
        source.textContent = `${t("عدد المصدر", "Source count")}: ${sourceCount}`;
        const count = document.createElement("input");
        count.type = "number";
        count.min = "1";
        count.max = String(MAX_REPEAT);
        count.step = "1";
        count.value = String(sourceCount);
        count.dataset.repeatIndex = String(sourceIndex);
        count.setAttribute("aria-label", t(`عدد التكرار للذكر ${sourceIndex + 1}`, `Repeat count for dhikr ${sourceIndex + 1}`));
        countWrap.append(source, count);
        copy.append(text, countWrap);
        row.append(checkbox, copy);
        picker.appendChild(row);
      });
    }

    function renderDraft() {
      draftList.replaceChildren();
      draft.forEach((entry, index) => {
        const topic = topicFor(entry.topicNumber);
        const item = topic?.items?.[entry.sourceIndex];
        if (!item) return;
        const row = document.createElement("li");
        row.className = "wird-playlist-draft-row";
        const copy = document.createElement("span");
        copy.textContent = `${index + 1}. ${topic.title || "حصن المسلم"} — ${String(item.text).replace(/\s+/g, " ").trim().slice(0, 90)}${String(item.text).length > 90 ? "…" : ""} · ${t("التكرار", "Repeats")}: ${entry.count}`;
        const actions = document.createElement("span");
        actions.className = "wird-playlist-row-actions";
        actions.append(
          setButton(t("لأعلى", "Up"), () => { if (index > 0) [draft[index - 1], draft[index]] = [draft[index], draft[index - 1]]; renderDraft(); }, "wird-playlist-mini"),
          setButton(t("لأسفل", "Down"), () => { if (index < draft.length - 1) [draft[index + 1], draft[index]] = [draft[index], draft[index + 1]]; renderDraft(); }, "wird-playlist-mini"),
          setButton(t("إزالة", "Remove"), () => { draft.splice(index, 1); renderDraft(); }, "wird-playlist-mini danger")
        );
        row.append(copy, actions);
        draftList.appendChild(row);
      });
      const count = document.getElementById("wirdPlaylistDraftCount");
      if (count) count.textContent = t(`${draft.length} ذكر`, `${draft.length} adhkar`);
    }

    function openPlaylist(playlist) {
      const resolved = resolveEntries(playlist.items);
      if (!resolved.length) {
        announce(t("تعذر فتح القائمة؛ قد تكون بعض الأذكار لم تعد موجودة في المصدر المحلي.", "Could not open this playlist; some items may no longer exist in the local source."));
        return;
      }
      if (typeof window.openWirdCustomSession !== "function") {
        announce(t("مشغل الجلسات غير جاهز. أعد تحميل التطبيق وحاول مرة أخرى.", "The session player is not ready. Reload the app and try again."));
        return;
      }
      window.openWirdCustomSession(playlist.id, playlist.name, resolved, playlist.revision);
    }

    function renderSaved() {
      savedList.replaceChildren();
      const playlists = loadPlaylists();
      if (!playlists.length) {
        const empty = document.createElement("p");
        empty.className = "wird-playlist-hint";
        empty.textContent = t("لا توجد قوائم محفوظة بعد.", "No saved playlists yet.");
        savedList.appendChild(empty);
        return;
      }
      playlists.forEach(playlist => {
        const card = document.createElement("article");
        card.className = "wird-playlist-saved-card";
        const title = document.createElement("strong");
        title.textContent = playlist.name;
        const meta = document.createElement("small");
        meta.textContent = t(`${playlist.items.length} ذكرًا · محفوظة على هذا الجهاز`, `${playlist.items.length} adhkar · saved on this device`);
        const actions = document.createElement("div");
        actions.className = "wird-playlist-row-actions";
        actions.append(
          setButton(t("ابدأ الجلسة", "Start session"), () => openPlaylist(playlist), "wird-playlist-action primary"),
          setButton(t("تعديل", "Edit"), () => {
            editingId = playlist.id;
            draft = playlist.items.map(item => ({ ...item }));
            nameInput.value = playlist.name;
            const firstTopic = playlist.items[0]?.topicNumber;
            topicSelect.value = firstTopic == null ? "" : String(firstTopic);
            renderPicker();
            renderDraft();
            manager.open = true;
            nameInput.focus();
            announce(t("تم تحميل القائمة للتعديل. احفظ التغييرات عند الانتهاء.", "Playlist loaded for editing. Save your changes when finished."));
          }),
          setButton(t("حذف", "Delete"), () => {
            if (!window.confirm(t(`حذف قائمة «${playlist.name}» من هذا الجهاز؟`, `Delete “${playlist.name}” from this device?`))) return;
            savePlaylists(loadPlaylists().filter(item => item.id !== playlist.id));
            renderSaved();
            announce(t("تم حذف القائمة.", "Playlist deleted."));
          }, "wird-playlist-action danger")
        );
        card.append(title, meta, actions);
        savedList.appendChild(card);
      });
    }

    topicSelect.addEventListener("change", renderPicker);
    document.getElementById("addSelectedWirdItems")?.addEventListener("click", () => {
      const topic = topicFor(topicSelect.value);
      if (!topic) { announce(t("اختر بابًا أولًا.", "Choose a chapter first.")); return; }
      const selected = [...picker.querySelectorAll('input[type="checkbox"]:checked')];
      if (!selected.length) { announce(t("اختر ذكرًا واحدًا على الأقل.", "Select at least one dhikr.")); return; }
      const additions = selected.map(checkbox => {
        const sourceIndex = Number(checkbox.dataset.sourceIndex);
        const sourceCount = Math.max(1, Number(topic.items[sourceIndex]?.count) || 1);
        const input = picker.querySelector(`[data-repeat-index="${sourceIndex}"]`);
        const count = Number(input?.value);
        return Number.isInteger(count) && count >= 1 && count <= MAX_REPEAT
          ? { topicNumber: Number(topic.number), sourceIndex, count }
          : null;
      });
      if (additions.some(item => !item)) { announce(t(`اختر عدد تكرار صحيحًا بين ١ و${MAX_REPEAT}.`, `Choose a repeat count between 1 and ${MAX_REPEAT}.`)); return; }
      if (draft.length + additions.length > MAX_ITEMS) { announce(t(`الحد الأقصى ${MAX_ITEMS} ذكرًا في القائمة.`, `A playlist can contain up to ${MAX_ITEMS} adhkar.`)); return; }
      draft.push(...additions);
      selected.forEach(checkbox => { checkbox.checked = false; });
      renderDraft();
      announce(t(`أُضيف ${additions.length} ذكر إلى المسودة. العدد الافتراضي من المصدر؛ وأي تعديل تختاره شخصي وليس عددًا شرعيًا موثقًا.`, `${additions.length} adhkar added. The default count comes from the source; any change is your personal choice, not a verified religious prescription.`));
    });

    document.getElementById("wirdPlaylistClearDraft")?.addEventListener("click", () => {
      draft = [];
      editingId = null;
      form.reset();
      renderPicker();
      renderDraft();
      announce(t("بدأت قائمة جديدة.", "Started a new playlist."));
    });

    form.addEventListener("submit", event => {
      event.preventDefault();
      const name = String(nameInput.value || "").trim().slice(0, 48);
      if (!name) { announce(t("اكتب اسمًا للقائمة.", "Enter a playlist name.")); nameInput.focus(); return; }
      if (!draft.length) { announce(t("أضف ذكرًا واحدًا على الأقل قبل الحفظ.", "Add at least one dhikr before saving.")); return; }
      const playlists = loadPlaylists();
      const old = editingId ? playlists.find(item => item.id === editingId) : null;
      if (!old && playlists.length >= MAX_PLAYLISTS) { announce(t(`يمكن حفظ ${MAX_PLAYLISTS} قوائم كحد أقصى.`, `You can save up to ${MAX_PLAYLISTS} playlists.`)); return; }
      const id = old?.id || (globalThis.crypto?.randomUUID?.() || `wird-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
      const next = { id, name, items: draft.map(item => ({ ...item })), revision: old ? old.revision + 1 : 1, updatedAt: Date.now() };
      const nextPlaylists = old ? playlists.map(item => item.id === id ? next : item) : [...playlists, next];
      if (!savePlaylists(nextPlaylists)) { announce(t("تعذر الحفظ؛ مساحة التخزين على الجهاز قد تكون ممتلئة.", "Could not save; device storage may be full.")); return; }
      draft = [];
      editingId = null;
      form.reset();
      renderPicker();
      renderDraft();
      renderSaved();
      announce(t("حُفظت القائمة على هذا الجهاز.", "Playlist saved on this device."));
    });

    renderTopics();
    renderDraft();
    renderSaved();
    window.addEventListener("anyas:languagechange", () => { renderTopics(); renderDraft(); renderSaved(); });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
