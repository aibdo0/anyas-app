(() => {
  "use strict";

  const byId = id => document.getElementById(id);
  const section = byId("dailyAdhkarSection");
  const card = byId("dailyAdhkarCard");
  const title = byId("dailyAdhkarHeading");
  const text = byId("dailyAdhkarText");
  const badge = byId("dailyAdhkarBadge");
  const hint = byId("dailyAdhkarHint");
  const openButton = byId("openDailyAdhkarButton");
  if (!section || !card || !title || !text || !badge || !hint || !openButton) return;

  const periods = [
    { id: "awakening", title: "أذكار الاستيقاظ", badge: "متاح يدويًا", description: "ورد ثابت لمن استيقظ؛ ظهور البطاقة لا يعني أنك استيقظت أو أتممت الذكر.", button: "افتح أذكار الاستيقاظ", action: "awakening", icon: "☼" },
    { id: "morning", title: "أذكار الصباح", badge: "الآن · اقتراح زمني", description: "ورد الصباح متاح الآن بحسب مواقيتك المحلية؛ اختر فتحه وتسجيل ما أنجزته فعلًا.", button: "افتح أذكار الصباح", action: "morning", icon: "☀" },
    { id: "afterPrayer", title: "أذكار بعد الصلاة", badge: "بعد الفريضة", description: "ورد متاح بعد كل فريضة؛ لا يفترض التطبيق أنك صليت، ويمكن فتحه يدويًا في أي وقت.", button: "افتح أذكار بعد الصلاة", action: "afterPrayer", icon: "۞" },
    { id: "evening", title: "أذكار المساء", badge: "الآن · اقتراح زمني", description: "ورد المساء متاح في وقته المناسب بحسب مواقيتك؛ لا يعني ظهوره أنك أتممت العبادة.", button: "افتح أذكار المساء", action: "evening", icon: "◒" },
    { id: "beforeSleep", title: "أذكار النوم", badge: "متاح يدويًا", description: "ورد النوم متاح متى أردت؛ لا يفترض التطبيق أنك ذاهب إلى النوم لمجرد حلول الليل.", button: "افتح أذكار النوم", action: "beforeSleep", icon: "☾" }
  ];

  const getMinutes = (date = new Date()) => date.getHours() * 60 + date.getMinutes();
  const timeToMinutes = value => {
    const match = String(value || "").match(/(\d{1,2})\s*:\s*(\d{2})/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  };
  const prayerMinutes = key => timeToMinutes(window.todayTimings?.[key]);

  function isAfterPrayerWindow(minutes) {
    return ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"].some(key => {
      const start = prayerMinutes(key);
      return start !== null && minutes >= start && minutes < start + 90;
    });
  }

  function getCurrentPeriod(date = new Date()) {
    const minutes = getMinutes(date);
    if (isAfterPrayerWindow(minutes)) return periods[2];
    const fajr = prayerMinutes("Fajr");
    const asr = prayerMinutes("Asr");
    const isha = prayerMinutes("Isha");
    if (fajr !== null && asr !== null && minutes >= fajr && minutes < asr) return periods[1];
    if (asr !== null && isha !== null && minutes >= asr && minutes < isha) return periods[3];
    if (isha !== null && (minutes >= isha || (fajr !== null && minutes < fajr))) return periods[4];
    return periods[1];
  }

  function renderOverview() {
    const overview = byId("dailyWirdOverview");
    const total = byId("dailyWirdOverviewTotal");
    const items = window.getWirdOverview?.() || [];
    if (!overview || !items.length) return;
    overview.replaceChildren();
    let done = 0;
    let count = 0;
    items.forEach(item => {
      done += item.done;
      count += item.total;
      const entry = document.createElement("button");
      entry.type = "button";
      entry.className = "daily-wird-item";
      entry.setAttribute("aria-label", `فتح ${item.title}`);
      const percent = item.total ? Math.round(item.done / item.total * 100) : 0;
      const icon = item.id === "beforeSleep" ? "☾" : item.id === "evening" ? "◒" : item.id === "afterPrayer" ? "۞" : item.id === "awakening" ? "☼" : "☀";
      entry.innerHTML = `<span class="daily-wird-item-icon" aria-hidden="true">${icon}</span><span class="daily-wird-item-copy"><strong>${item.title}</strong><small>${item.done} / ${item.total} أذكار</small><span class="daily-wird-item-track" aria-hidden="true"><i style="width:${percent}%"></i></span></span>`;
      entry.addEventListener("click", () => window.openWirdCategory?.(item.id));
      overview.appendChild(entry);
    });
    if (total) total.textContent = `${done} / ${count}`;
  }

  function showPeriod() {
    const period = getCurrentPeriod();
    section.dataset.adhkarPeriod = period.id;
    card.dataset.adhkarPeriod = period.id;
    card.classList.remove("is-transitioning");
    if (card.dataset.lastPeriod && card.dataset.lastPeriod !== period.id) card.classList.add("is-transitioning");
    card.dataset.lastPeriod = period.id;
    title.textContent = period.title;
    badge.textContent = period.badge;
    text.textContent = period.description;
    hint.textContent = period.id === "afterPrayer" ? "متاح بعد كل فريضة" : "متاح يدويًا دائمًا";
    openButton.textContent = period.button;
    const mark = card.querySelector(".daily-adhkar-mark");
    if (mark) mark.textContent = period.icon;
    openButton.dataset.adhkarAction = period.action;
    renderOverview();
  }

  openButton.addEventListener("click", () => window.openWirdCategory?.(openButton.dataset.adhkarAction));
  window.addEventListener("anyas:wird-progress", renderOverview);
  window.addEventListener("anyas:azkar-progress", renderOverview);
  document.addEventListener("DOMContentLoaded", () => { showPeriod(); window.setTimeout(renderOverview, 0); });
  window.setInterval(showPeriod, 30 * 1000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) showPeriod(); });
  window.anyasDailyAdhkar = Object.freeze({ periods, getCurrentPeriod });
})();
