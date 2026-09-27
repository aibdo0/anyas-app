(() => {
  "use strict";

  const byId = id => document.getElementById(id);
  const card = byId("dailyAdhkarCard");
  const title = byId("dailyAdhkarHeading");
  const text = byId("dailyAdhkarText");
  const badge = byId("dailyAdhkarBadge");
  const hint = byId("dailyAdhkarHint");
  const openButton = byId("openDailyAdhkarButton");
  const mark = byId("dailyAdhkarMark");
  if (!card || !title || !text || !badge || !hint || !openButton) return;

  // Every interval is start-inclusive and end-exclusive, so transitions never overlap.
  const periods = {
    waking: {
      title: "أذكار الاستيقاظ", badge: "الاستيقاظ", mark: "☼",
      range: "٤:٣٠ ص — ٥:٣٠ ص", theme: "waking",
      text: "الحمد لله الذي أحيانا بعد ما أماتنا وإليه النشور.",
      button: "ذكر الاستيقاظ", target: "waking"
    },
    morning: {
      title: "أذكار الصباح", badge: "الصباح", mark: "☀",
      range: "٥:٣٠ ص — ١٢:٠٠ ظ", theme: "morning",
      text: "ابدأ يومك بأذكار الصباح، وتابع ما أتممته من وردك.",
      button: "افتح أذكار الصباح", target: "morning"
    },
    general: {
      title: "أذكار اليوم", badge: "ورد اليوم", mark: "ذ",
      range: "١٢:٠٠ ظ — ٣:٣٠ م", theme: "general",
      text: "سُبْحَانَ اللهِ وَبِحَمْدِهِ، سُبْحَانَ اللهِ الْعَظِيمِ",
      button: "افتح الأذكار العامة", target: "general"
    },
    evening: {
      title: "أذكار المساء", badge: "المساء", mark: "◒",
      range: "٣:٣٠ م — ٨:٠٠ م", theme: "evening",
      text: "حان وقت أذكار المساء؛ اقرأها بهدوء وتابع إنجاز وردك.",
      button: "افتح أذكار المساء", target: "evening"
    },
    sleep: {
      title: "أذكار النوم", badge: "قبل النوم", mark: "☾",
      range: "٨:٠٠ م — ٢:٠٠ ص", theme: "sleep",
      text: "باسمك اللهم أموت وأحيا.",
      button: "افتح أذكار النوم", target: "sleep"
    },
    sahar: {
      title: "الاستغفار في السحر", badge: "وقت السحر", mark: "✦",
      range: "٢:٠٠ ص — ٤:٣٠ ص", theme: "sahar",
      text: "أستغفر الله وأتوب إليه. كرّر الاستغفار بما تيسّر لك.",
      button: "افتح عدّاد الاستغفار", target: "sahar"
    }
  };

  function periodAtMinute(value) {
    const minute = ((Math.floor(Number(value) || 0) % 1440) + 1440) % 1440;
    if (minute >= 270 && minute < 330) return "waking";
    if (minute >= 330 && minute < 720) return "morning";
    if (minute >= 720 && minute < 930) return "general";
    if (minute >= 930 && minute < 1200) return "evening";
    if (minute >= 1200 || minute < 120) return "sleep";
    return "sahar";
  }

  window.getDailyAdhkarPeriod = periodAtMinute;

  let activePeriod = "";
  function renderPeriod(id) {
    const period = periods[id] || periods.morning;
    if (activePeriod === id) return;
    activePeriod = id;
    card.dataset.adhkarPeriod = period.theme;
    title.textContent = period.title;
    text.textContent = period.text;
    badge.textContent = period.badge;
    hint.textContent = period.range;
    openButton.textContent = period.button;
    if (mark) mark.textContent = period.mark;
    openButton.setAttribute("data-period-target", period.target);
  }

  function currentPeriod() {
    const now = new Date();
    return periodAtMinute(now.getHours() * 60 + now.getMinutes());
  }

  function openPeriodTarget(target) {
    if (target === "waking") {
      if (typeof window.openAzkarTopic === "function") window.openAzkarTopic(1, 0);
      else if (typeof window.goToPage === "function") window.goToPage("azkar");
      return;
    }

    if (target === "morning" && typeof window.openWirdCategory === "function") {
      window.openWirdCategory("morning");
      return;
    }
    if (target === "evening" && typeof window.openWirdCategory === "function") {
      window.openWirdCategory("evening");
      return;
    }
    if (target === "sleep" && typeof window.openWirdCategory === "function") {
      window.openWirdCategory("beforeSleep");
      return;
    }

    if (typeof window.goToPage === "function") window.goToPage("tasks");
    window.setTimeout(() => {
      const destination = target === "sahar"
        ? document.querySelector('[data-goal-id="istighfar"]')
        : byId("dhikrGoalList");
      destination?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  }

  openButton.addEventListener("click", () => {
    const id = currentPeriod();
    renderPeriod(id);
    openPeriodTarget(periods[id].target);
  });

  renderPeriod(currentPeriod());
  window.setInterval(() => renderPeriod(currentPeriod()), 30000);
})();
