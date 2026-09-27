(() => {
  "use strict";

  const catalog = window.dailyDevotionCatalog || { adhkar: [], sunnah: [], virtues: {} };
  const number = value => Number(value || 0).toLocaleString("ar-EG");

  function currentHijriKey(date = new Date()) {
    try {
      const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", {
        day: "numeric", month: "numeric", year: "numeric"
      }).formatToParts(date);
      const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
      return `${values.year}-${String(values.month).padStart(2, "0")}-${String(values.day).padStart(2, "0")}`;
    } catch (error) {
      const parts = new Intl.DateTimeFormat("en-u-ca-islamic-nu-latn", {
        day: "numeric", month: "numeric", year: "numeric"
      }).formatToParts(date);
      const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
      return `${values.year}-${String(values.month).padStart(2, "0")}-${String(values.day).padStart(2, "0")}`;
    }
  }

  window.getCurrentHijriDateKey = currentHijriKey;

  function hijriLabel() {
    try {
      return new Intl.DateTimeFormat("ar-EG-u-ca-islamic-umalqura", {
        day: "numeric", month: "long"
      }).format(new Date());
    } catch (error) {
      return new Intl.DateTimeFormat("ar-EG-u-ca-islamic", {
        day: "numeric", month: "long"
      }).format(new Date());
    }
  }

  const storageKey = `anyas_devotions_hijri_${currentHijriKey()}`;
  let state = { counts: {}, sunnah: {} };
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (saved && typeof saved === "object") {
      state = { counts: saved.counts || {}, sunnah: saved.sunnah || {} };
    }
  } catch (error) {
    // يظل العداد قابلًا للاستخدام في المتصفح الذي لا يتيح التخزين المحلي.
  }

  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (error) { /* التخزين اختياري */ }
  }

  function renderGoalList() {
    const list = document.getElementById("dhikrGoalList");
    if (!list) return;
    list.innerHTML = catalog.adhkar.map(item => {
      const count = Math.max(0, Number(state.counts[item.id]) || 0);
      const percent = Math.min(100, Math.round(count / item.goal * 100));
      return `<article class="dhikr-goal-card" data-goal-id="${item.id}">
        <div class="dhikr-goal-top"><div><h3>${item.label}</h3><span class="dhikr-goal-count">${number(count)} من ${number(item.goal)}</span></div>
          <button class="dhikr-goal-add" type="button" data-increment-dhikr="${item.id}" aria-label="زيادة عداد ${item.label}">+١</button></div>
        <div class="dhikr-goal-track" aria-hidden="true"><span style="width:${percent}%"></span></div>
      </article>`;
    }).join("");

    list.querySelectorAll("[data-increment-dhikr]").forEach(button => {
      button.addEventListener("click", () => {
        increment(button.dataset.incrementDhikr);
        if (navigator.vibrate && localStorage.getItem("anyas_vibration") === "true") navigator.vibrate(25);
      });
    });
  }

  function renderSunnah() {
    const list = document.getElementById("sunnahChecklist");
    if (!list) return;
    list.innerHTML = catalog.sunnah.map(item => {
      const done = Boolean(state.sunnah[item.id]);
      return `<button class="sunnah-task${done ? " is-done" : ""}" type="button" data-sunnah-id="${item.id}" aria-pressed="${done}">
        <span class="sunnah-task-check" aria-hidden="true">${done ? "✓" : ""}</span>
        <span class="sunnah-task-copy"><strong>${item.label}</strong><small>${item.detail}</small></span>
      </button>`;
    }).join("");
    list.querySelectorAll("[data-sunnah-id]").forEach(button => {
      button.addEventListener("click", () => {
        const id = button.dataset.sunnahId;
        state.sunnah[id] = !state.sunnah[id];
        persist();
        renderSunnah();
        updateDailyOverview();
      });
    });
    const done = catalog.sunnah.filter(item => state.sunnah[item.id]).length;
    const progress = document.getElementById("sunnahProgressText");
    if (progress) progress.textContent = `${number(done)} / ${number(catalog.sunnah.length)}`;
  }

  function increment(id) {
    state.counts[id] = Math.max(0, Number(state.counts[id]) || 0) + 1;
    persist();
    renderGoalList();
    renderTasksTasbeeh();
    updateDailyOverview();
    if (document.getElementById("page-tasbeeh")?.classList.contains("active")) renderTasbeeh();
  }

  let selectedDhikr = "subhanallah";
  function getSelectedDhikr() {
    return catalog.adhkar.find(item => item.id === selectedDhikr) || catalog.adhkar[0];
  }

  function renderTasbeeh() {
    const selected = getSelectedDhikr();
    if (!selected) return;
    const count = Math.max(0, Number(state.counts[selected.id]) || 0);
    const label = document.getElementById("tasbeehSelectedDhikr");
    const counter = document.getElementById("tasbeehCounter");
    const goal = document.getElementById("tasbeehGoalLabel");
    const bar = document.getElementById("tasbeehProgressBar");
    if (label) label.textContent = selected.label;
    if (counter) counter.textContent = number(count);
    if (goal) goal.textContent = `من ${number(selected.goal)}`;
    if (bar) bar.style.width = `${Math.min(100, Math.round(count / selected.goal * 100))}%`;
    document.querySelectorAll(".tasbeeh-preset").forEach(button => {
      const active = button.dataset.dhikr === selected.id;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function renderTasksTasbeeh() {
    const selected = getSelectedDhikr();
    if (!selected) return;
    const count = Math.max(0, Number(state.counts[selected.id]) || 0);
    const countElement = document.getElementById("tasksTasbeehCount");
    const goalElement = document.getElementById("tasksTasbeehGoal");
    const labelElement = document.getElementById("tasksTasbeehDhikr");
    const progressElement = document.getElementById("tasksTasbeehProgress");
    if (labelElement) labelElement.textContent = selected.label;
    if (countElement) countElement.textContent = number(count);
    if (goalElement) goalElement.textContent = `من ${number(selected.goal)}`;
    if (progressElement) progressElement.style.width = `${Math.min(100, Math.round(count / selected.goal * 100))}%`;
  }

  function updateDailyOverview() {
    const prayerCount = document.querySelectorAll(".prayer-track-item.completed").length;
    const prayerTotal = document.querySelectorAll(".prayer-track-item").length || 5;
    const dhikrDone = catalog.adhkar.filter(item => (Number(state.counts[item.id]) || 0) >= item.goal).length;
    const sunnahDone = catalog.sunnah.filter(item => state.sunnah[item.id]).length;
    const total = prayerTotal + catalog.adhkar.length + catalog.sunnah.length;
    const done = prayerCount + dhikrDone + sunnahDone;
    const percent = total ? Math.round(done / total * 100) : 0;
    const score = document.getElementById("dailyOverviewScore");
    const progress = document.getElementById("dailyOverviewProgress");
    const message = document.getElementById("dailyOverviewMessage");
    const focus = document.getElementById("dailyOverviewFocus");
    if (score) score.textContent = `${number(percent)}٪`;
    if (progress) progress.style.width = `${percent}%`;
    if (message) message.textContent = percent === 100 ? "أحسنت، أتممت مهام يومك." : percent >= 60 ? "أحسنت، تبقّى القليل وأنت قريب." : "ابدأ بما تيسّر لك، والقليل الدائم خير.";
    if (focus) {
      const current = window.anyasDailyAdhkar?.getCurrentPeriod?.();
      focus.textContent = current ? `الآن: ${current.title}` : "وردك المناسب لوقتك سيظهر هنا";
    }
    const prayer = document.getElementById("dailyOverviewPrayerCount");
    const dhikr = document.getElementById("dailyOverviewDhikrCount");
    const sunnah = document.getElementById("dailyOverviewSunnahCount");
    if (prayer) prayer.textContent = `${number(prayerCount)}/${number(prayerTotal)}`;
    if (dhikr) dhikr.textContent = `${number(dhikrDone)}/${number(catalog.adhkar.length)}`;
    if (sunnah) sunnah.textContent = `${number(sunnahDone)}/${number(catalog.sunnah.length)}`;
  }

  window.updateDailyOverview = updateDailyOverview;

  function setupFridayTasks() {
    const buttons = [...document.querySelectorAll("[data-friday-task]")];
    if (!buttons.length) return;
    const today = new Date();
    const key = `anyas_friday_tasks_${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    let completed = {};
    try { completed = JSON.parse(localStorage.getItem(key) || "{}") || {}; } catch (error) { completed = {}; }

    const render = () => {
      const done = buttons.filter(button => completed[button.dataset.fridayTask] === true).length;
      buttons.forEach(button => {
        const active = completed[button.dataset.fridayTask] === true;
        button.classList.toggle("is-complete", active);
        button.setAttribute("aria-pressed", String(active));
        const check = button.querySelector(".friday-task-check");
        if (check) check.textContent = active ? "✓" : "○";
      });
      const progress = document.getElementById("fridayTasksProgress");
      const status = document.getElementById("fridayTasksStatus");
      if (progress) progress.textContent = `${number(done)} / ${number(buttons.length)}`;
      if (status) status.textContent = today.getDay() === 5 ? "مهام الجمعة اليوم · تقبل الله" : "جهّزها للجمعة القادمة، وستبقى محفوظة لك";
    };

    buttons.forEach(button => {
      button.addEventListener("click", () => {
        const id = button.dataset.fridayTask;
        completed[id] = completed[id] !== true;
        try { localStorage.setItem(key, JSON.stringify(completed)); } catch (error) { /* التخزين اختياري */ }
        render();
      });
    });
    render();
  }

  document.addEventListener("DOMContentLoaded", () => {
    const date = document.getElementById("devotionHijriDate");
    if (date) date.textContent = hijriLabel();
    renderGoalList();
    renderSunnah();
    renderTasbeeh();
    renderTasksTasbeeh();
    updateDailyOverview();
    setupFridayTasks();

    const incrementButton = document.getElementById("tasbeehIncrement");
    incrementButton?.addEventListener("click", () => {
      const selected = getSelectedDhikr();
      if (selected) increment(selected.id);
    });

    document.querySelectorAll(".tasbeeh-preset").forEach(button => {
      button.addEventListener("click", () => {
        selectedDhikr = button.dataset.dhikr;
        renderTasbeeh();
        renderTasksTasbeeh();
      });
    });

    document.getElementById("tasksTasbeehIncrement")?.addEventListener("click", () => {
      const selected = getSelectedDhikr();
      if (selected) increment(selected.id);
    });

    document.getElementById("tasbeehReset")?.addEventListener("click", () => {
      const selected = getSelectedDhikr();
      if (!selected) return;
      state.counts[selected.id] = 0;
      persist();
      renderGoalList();
      renderTasbeeh();
      renderTasksTasbeeh();
      updateDailyOverview();
    });

    document.querySelectorAll("[data-back-more]").forEach(button => {
      button.addEventListener("click", () => {
        if (typeof window.goToPage === "function") window.goToPage("more");
      });
    });

    document.getElementById("openTasbeehFromTasks")?.addEventListener("click", () => {
      if (typeof window.goToPage === "function") window.goToPage("tasbeeh");
    });

    document.querySelectorAll("[data-back-tasks]").forEach(button => {
      button.addEventListener("click", () => {
        if (typeof window.goToPage === "function") window.goToPage("tasks");
      });
    });
  });
})();
