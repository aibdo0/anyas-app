(() => {
  "use strict";
  const byId = id => document.getElementById(id);
  const section = byId("dailyAdhkarSection");
  const card = section?.querySelector(".daily-adhkar-card");
  const title = byId("dailyAdhkarHeading");
  const text = byId("dailyAdhkarText");
  const badge = byId("dailyAdhkarBadge");
  const hint = byId("dailyAdhkarHint");
  const openButton = byId("openDailyAdhkarButton");
  if (!section || !card || !title || !text || !badge || !hint || !openButton) return;

  // الفترات نصف مفتوحة [من، إلى) حتى لا يحدث تداخل عند الدقائق الفاصلة.
  // الوقت مأخوذ من ساعة الجهاز المحلية، وليس من مواقيت الصلاة أو منطقة زمنية ثابتة.
  const periods = [
    { id: "awakening", title: "أذكار الاستيقاظ", badge: "الاستيقاظ", start: 270, end: 330, hint: "04:30 – 05:30", description: "ابدأ يومك بذكر الله بهدوء، ثم انتقل تلقائيًا إلى أذكار الصباح عند 05:30.", button: "افتح أذكار الاستيقاظ", action: "waking", icon: "☼" },
    { id: "morning", title: "أذكار الصباح", badge: "الصباح", start: 330, end: 720, hint: "05:30 – 12:00", description: "ورد الصباح المناسب لبداية يومك، وسيبقى ظاهرًا حتى دخول وقت أذكار اليوم.", button: "افتح أذكار الصباح", action: "morning", icon: "☀" },
    { id: "day", title: "أذكار اليوم", badge: "ورد مطلق", start: 720, end: 930, hint: "12:00 – 15:30", description: "أكثر من ذكر الله في وقت العمل والدراسة بما تيسّر لك من الأذكار المطلقة.", button: "افتح الأذكار العامة", action: "general", icon: "ذ" },
    { id: "evening", title: "أذكار المساء", badge: "المساء", start: 930, end: 1200, hint: "15:30 – 20:00", description: "حان وقت أذكار المساء؛ اجعلها وقفة هادئة قبل دخول الليل.", button: "افتح أذكار المساء", action: "evening", icon: "◒" },
    { id: "sleep", title: "أذكار النوم", badge: "النوم", start: 1200, end: 1560, hint: "20:00 – 02:00", description: "اختم يومك بأذكار النوم بهدوء.", button: "افتح أذكار النوم", action: "beforeSleep", icon: "☾" },
    { id: "sahar", title: "الاستغفار في السحر", badge: "وقت السحر", start: 120, end: 270, hint: "02:00 – 04:30", description: "هذا وقت ثمين للاستغفار والدعاء؛ نسأل الله أن يرزقك فيه الخشوع والقبول.", button: "افتح عدّاد الاستغفار", action: "sahar", icon: "✦" }
  ];

  function getMinutes(date = new Date()) {
    return date.getHours() * 60 + date.getMinutes();
  }

  function getCurrentPeriod(date = new Date()) {
    const minutes = getMinutes(date);
    const comparableMinutes = minutes < 120 ? minutes + 1440 : minutes;
    return periods.find(period => comparableMinutes >= period.start && comparableMinutes < period.end) || periods[0];
  }

  // ورد الأذكار المرتبط بكل فترة، وتقدّمه الحقيقي من js/wird.js (محفوظ لكل يوم).
  const WIRD_OF_PERIOD = { morning: "morning", evening: "evening" };
  const WIRD_LABEL = { morning: "الصباح", evening: "المساء" };
  const WIRD_HINT = { morning: "05:30 – 12:00", evening: "15:30 – 20:00", beforeSleep: "20:00 – 02:00" };
  let selectedWird = null;
  let lastPeriodId = null;
  const tabs = byId("adhkarTabs");
  const progressBox = byId("adhkarProgress");
  const num = n => Number(n || 0).toLocaleString("ar-EG");

  function showPeriod() {
    const period = getCurrentPeriod();
    if (period.id !== lastPeriodId) { selectedWird = null; lastPeriodId = period.id; }
    section.dataset.adhkarPeriod = period.id;
    card.dataset.adhkarPeriod = period.id;
    card.classList.remove("is-transitioning");
    if (card.dataset.lastPeriod && card.dataset.lastPeriod !== period.id) card.classList.add("is-transitioning");
    card.dataset.lastPeriod = period.id;
    title.textContent = period.title;
    badge.textContent = period.badge;
    text.textContent = period.description;
    hint.textContent = period.hint;
    openButton.textContent = period.button;
    const mark = card.querySelector(".daily-adhkar-mark");
    if (mark) mark.textContent = period.icon;
    openButton.dataset.adhkarAction = period.action;
    updateRemind(period);
    applyWird(period);
  }

  function applyWird(period) {
    const wid = selectedWird || WIRD_OF_PERIOD[period.id] || null;
    tabs?.querySelectorAll("[data-wird-tab]").forEach(tab => {
      const on = tab.dataset.wirdTab === wid;
      tab.setAttribute("aria-selected", String(on));
      tab.classList.toggle("is-active", on);
    });
    card.dataset.wird = wid || "";
    const sec = wid && window.anyasWird?.reader ? window.anyasWird.reader(wid) : null;
    if (!sec || !sec.total) { if (progressBox) progressBox.hidden = true; return; }
    const label = WIRD_LABEL[wid];
    const complete = sec.done >= sec.total;
    const started = sec.done > 0 && !complete;
    title.textContent = "أذكار " + label;
    badge.textContent = label;
    hint.textContent = WIRD_HINT[wid];
    text.textContent = complete ? "أتممت أذكار " + label + " اليوم، تقبّل الله منك." : started ? "أكمل من حيث توقفت." : "ابدأ ورد " + label + " بهدوء.";
    openButton.dataset.adhkarAction = wid;
    openButton.textContent = complete ? "تمّت أذكار " + label + " ✓" : started ? "كمّل أذكار " + label : "ابدأ أذكار " + label;
    card.dataset.wirdState = complete ? "done" : started ? "started" : "new";
    if (progressBox) {
      progressBox.hidden = false;
      byId("adhkarProgressLabel").textContent = (complete ? "تمّت" : "تقدّم اليوم");
      byId("adhkarProgressCount").textContent = num(sec.done) + " من " + num(sec.total) + " ذكرًا";
      byId("adhkarProgressFill").style.width = Math.round(sec.done / sec.total * 100) + "%";
    }
  }
  tabs?.addEventListener("click", event => {
    const tab = event.target.closest("[data-wird-tab]");
    if (!tab) return;
    selectedWird = tab.dataset.wirdTab;
    showPeriod();
  });
  document.addEventListener("anyas:wird-progress", () => showPeriod());
  document.addEventListener("anyas:reader-progress", () => showPeriod());

  const REMIND_IDS = { awakening: "notifyWardAwakening", morning: "notifyWardMorning", evening: "notifyWardEvening", sleep: "notifyWardSleep" };
  const remindButton = document.getElementById("dailyAdhkarRemindButton");
  function updateRemind(period) {
    if (!remindButton) return;
    const id = REMIND_IDS[period.id];
    remindButton.hidden = !id;
    if (!id) return;
    remindButton.dataset.target = id;
    const on = document.getElementById(id)?.checked;
    remindButton.textContent = on ? "ضبط التذكير" : "فعّل التذكير";
  }
  remindButton?.addEventListener("click", () => {
    const id = remindButton.dataset.target;
    if (typeof window.goToPage === "function") window.goToPage("settings");
    window.setTimeout(() => {
      const input = document.getElementById(id);
      if (!input) return;
      const panel = input.closest(".settings-card[id], [id^='settingsSectionPanel']");
      if (panel && panel.hidden) document.querySelector('[aria-controls="' + panel.id + '"]')?.click();
      const group = input.closest("details.notification-settings-group");
      if (group) group.open = true;
      const row = input.closest(".setting-row") || input;
      row.scrollIntoView({ behavior: "smooth", block: "center" });
      row.classList.add("reminder-flash");
      window.setTimeout(() => row.classList.remove("reminder-flash"), 2200);
    }, 200);
  });

  openButton.addEventListener("click", () => {
    const action = openButton.dataset.adhkarAction;
    if (["morning", "evening"].includes(action) && window.anyasWird?.reader && typeof window.openAzkarTopic === "function") {
      // استكمال من أول ذكر لم يكتمل عدّه؛ وإن اكتمل الورد يُفتح من أوله للمراجعة.
      const state = window.anyasWird.reader(action);
      if (state) {
        window.openAzkarTopic(state.topicNumber, state.resumeIndex, { title: state.title, itemIndexes: state.itemIndexes });
        return;
      }
    }
    if (["morning", "evening", "beforeSleep"].includes(action)) {
      window.openWirdCategory?.(action);
      return;
    }
    if (action === "waking") {
      window.openAzkarTopic?.(1, 0);
      return;
    }
    window.goToPage?.("tasks");
    window.setTimeout(() => {
      const target = action === "sahar" ? document.querySelector('[data-goal-id="istighfar"]') : byId("dhikrGoalList");
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  });

  showPeriod();
  window.setInterval(showPeriod, 30 * 1000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) showPeriod(); });
  window.anyasDailyAdhkar = Object.freeze({ periods, getCurrentPeriod });
})();
