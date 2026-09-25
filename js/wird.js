// ورد يومي مبني على أبواب حصن المسلم الموجودة في البيانات.
(() => {
  const sections = {
    morning: {
      title: "أذكار الصباح",
      topicNumber: 27,
      itemIndexes: [...Array(22).keys(), 23]
    },
    evening: {
      title: "أذكار المساء",
      topicNumber: 27,
      itemIndexes: [0, 1, 3, 4, 7, 8, 9, 10, 11, 12, 13, 16, 17, 21, 22, 23]
    },
    afterPrayer: {
      title: "أذكار بعد الصلاة",
      topicNumber: 25,
      itemIndexes: [...Array(8).keys()]
    },
    beforeSleep: {
      title: "أذكار النوم",
      topicNumber: 28,
      itemIndexes: [...Array(13).keys()]
    }
  };

  const topics = window.azkarTopics || [];
  const todayKey = new Date().toLocaleDateString("en-CA");
  const storageKey = `anyas_wird_progress_${todayKey}`;

  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "{}") || {};
    } catch (error) {
      console.warn("تعذر تحميل تقدم الورد اليومي:", error);
      return {};
    }
  }

  let progress = loadProgress();

  function saveProgress() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(progress));
    } catch (error) {
      console.warn("تعذر حفظ تقدم الورد اليومي:", error);
    }
  }

  function getItems(section) {
    const topic = topics.find(item => Number(item.number) === section.topicNumber);
    if (!topic || !Array.isArray(topic.items)) return [];
    return section.itemIndexes
      .map(index => ({ item: topic.items[index], index }))
      .filter(entry => entry.item && entry.item.text);
  }

  function sectionProgress(id) {
    const section = sections[id];
    const items = getItems(section);
    const done = items.filter(({ index }) => progress[`${id}:${index}`] === true).length;
    return { done, total: items.length };
  }

  function updateProgress() {
    let done = 0;
    let total = 0;

    Object.keys(sections).forEach(id => {
      const state = sectionProgress(id);
      done += state.done;
      total += state.total;

      const count = document.querySelector(`[data-wird-count="${id}"]`);
      if (count) count.textContent = `${state.done} / ${state.total}`;

      const homeTask = id === "morning"
        ? document.getElementById("morningAzkarTask")
        : id === "evening"
          ? document.getElementById("eveningAzkarTask")
          : null;
      if (homeTask) homeTask.dataset.complete = String(state.total > 0 && state.done === state.total);
    });

    const summary = document.getElementById("wirdProgressText");
    const bar = document.getElementById("wirdProgressBar");
    if (summary) summary.textContent = `${done} من ${total} ذكرًا مكتملًا اليوم`;
    if (bar) {
      const percent = total ? Math.round(done / total * 100) : 0;
      bar.style.width = `${percent}%`;
      bar.setAttribute("aria-valuenow", String(percent));
    }

    const dailyTask = document.getElementById("dailyWirdTask");
    if (dailyTask) dailyTask.dataset.complete = String(total > 0 && done === total);
  }

  function renderSection(id) {
    const section = sections[id];
    const container = document.getElementById(`wird-items-${id}`);
    if (!section || !container) return;

    container.replaceChildren();
    getItems(section).forEach(({ item, index }) => {
      const key = `${id}:${index}`;
      const completed = progress[key] === true;
      const card = document.createElement("article");
      card.className = `wird-item${completed ? " is-complete" : ""}`;

      const text = document.createElement("div");
      text.className = "wird-item-text";
      text.textContent = item.text;

      const footer = document.createElement("div");
      footer.className = "wird-item-footer";
      const status = document.createElement("span");
      status.className = "wird-item-status";
      status.textContent = completed ? "أُنجز اليوم" : "اضغط بعد قراءة الذكر";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "wird-complete-button";
      button.setAttribute("aria-pressed", String(completed));
      button.textContent = completed ? "تم ✓" : "تمّ الذكر";
      button.addEventListener("click", () => {
        progress[key] = !completed;
        saveProgress();
        renderSection(id);
        updateProgress();
      });

      footer.append(status, button);
      card.append(text, footer);
      container.appendChild(card);
    });

    updateProgress();
  }

  function setSectionOpen(id, open = true) {
    const container = document.getElementById(`wird-items-${id}`);
    const button = document.querySelector(`[data-wird-toggle="${id}"]`);
    if (!container || !button) return;
    container.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
  }

  function openWirdCategory(id) {
    if (!sections[id]) return;
    goToPage("tasks");
    setSectionOpen(id, true);
    window.setTimeout(() => {
      document.getElementById(`wird-section-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 30);
  }

  window.openWirdCategory = openWirdCategory;

  document.addEventListener("DOMContentLoaded", () => {
    Object.keys(sections).forEach(id => {
      renderSection(id);
      const toggle = document.querySelector(`[data-wird-toggle="${id}"]`);
      if (toggle) {
        toggle.addEventListener("click", () => {
          const container = document.getElementById(`wird-items-${id}`);
          setSectionOpen(id, Boolean(container?.hidden));
        });
      }
    });

    document.querySelectorAll("[data-open-wird], [data-wird-open]").forEach(button => {
      button.addEventListener("click", () => openWirdCategory(button.dataset.openWird || button.dataset.wirdOpen));
    });

    updateProgress();
  });
})();
