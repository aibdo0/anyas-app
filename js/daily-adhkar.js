(() => {
  const byId = (id) => document.getElementById(id);
  const section = byId("dailyAdhkarSection");
  const card = section?.querySelector(".daily-adhkar-card");
  const title = byId("dailyAdhkarHeading");
  const text = byId("dailyAdhkarText");
  const badge = byId("dailyAdhkarBadge");
  const hint = byId("dailyAdhkarHint");
  const openButton = byId("openDailyAdhkarButton");
  if (!section || !card || !title || !text || !badge || !hint || !openButton) return;

  // الفترات نصف مفتوحة [من، إلى) حتى لا يحدث تداخل عند الدقائق الفاصلة.
  // الوقت مأخوذ من ساعة الجهاز المحلية، وليس من مواقيت الصلاة أو المنطقة الزمنية الثابتة.
  const periods = [
    {
      id: "awakening",
      title: "أذكار الاستيقاظ",
      badge: "الاستيقاظ",
      start: 4 * 60 + 30,
      end: 5 * 60 + 30,
      hint: "04:30 – 05:30",
      description: "ابدأ يومك بذكر الله بهدوء، ثم انتقل تلقائيًا إلى أذكار الصباح عند 05:30.",
      button: "افتح أذكار الصباح",
      action: "morning",
      icon: "☼"
    },
    {
      id: "morning",
      title: "أذكار الصباح",
      badge: "الصباح",
      start: 5 * 60 + 30,
      end: 12 * 60,
      hint: "05:30 – 12:00",
      description: "ورد الصباح المناسب لبداية يومك، وسيبقى ظاهرًا حتى دخول وقت أذكار اليوم.",
      button: "افتح أذكار الصباح",
      action: "morning",
      icon: "☀"
    },
    {
      id: "day",
      title: "أذكار اليوم",
      badge: "ورد مطلق",
      start: 12 * 60,
      end: 15 * 60 + 30,
      hint: "12:00 – 15:30",
      description: "أكثر من ذكر الله في وقت العمل والدراسة بما تيسّر لك من الأذكار المطلقة.",
      button: "افتح الأذكار",
      action: "general",
      icon: "ذ"
    },
    {
      id: "evening",
      title: "أذكار المساء",
      badge: "المساء",
      start: 15 * 60 + 30,
      end: 20 * 60,
      hint: "15:30 – 20:00",
      description: "حان وقت أذكار المساء؛ اجعلها وقفة هادئة قبل دخول الليل.",
      button: "افتح أذكار المساء",
      action: "evening",
      icon: "◒"
    },
    {
      id: "sleep",
      title: "أذكار النوم",
      badge: "النوم",
      start: 20 * 60,
      end: 26 * 60,
      hint: "20:00 – 02:00",
      description: "اختم يومك بأذكار النوم بهدوء.",
      button: "افتح أذكار النوم",
      action: "beforeSleep",
      icon: "☾"
    },
    {
      id: "sahar",
      title: "الاستغفار في السحر",
      badge: "وقت السحر",
      start: 2 * 60,
      end: 4 * 60 + 30,
      hint: "02:00 – 04:30",
      description: "هذا وقت ثمين للاستغفار والدعاء؛ نسأل الله أن يرزقك فيه الخشوع والقبول.",
      button: "افتح الأذكار",
      action: "general",
      icon: "✦"
    }
  ];

  function getMinutes(date = new Date()) {
    return date.getHours() * 60 + date.getMinutes();
  }

  function getCurrentPeriod(date = new Date()) {
    const minutes = getMinutes(date);
    const comparableMinutes = minutes < 2 * 60 ? minutes + 24 * 60 : minutes;
    return periods.find((period) => comparableMinutes >= period.start && comparableMinutes < period.end)
      || periods[0];
  }

  function showPeriod() {
    const period = getCurrentPeriod();
    section.dataset.adhkarPeriod = period.id;
    card.dataset.adhkarPeriod = period.id;
    card.classList.remove("is-transitioning");
    // إعادة تشغيل انتقال خفيف فقط عند تغيير الحالة، وليس عند كل دورة تحديث.
    if (card.dataset.lastPeriod && card.dataset.lastPeriod !== period.id) {
      card.classList.add("is-transitioning");
    }
    card.dataset.lastPeriod = period.id;

    title.textContent = period.title;
    badge.textContent = period.badge;
    text.textContent = period.description;
    hint.textContent = period.hint;
    openButton.textContent = period.button;
    const mark = card.querySelector(".daily-adhkar-mark");
    if (mark) mark.textContent = period.icon;
    openButton.dataset.adhkarAction = period.action;
  }

  openButton.addEventListener("click", () => {
    const action = openButton.dataset.adhkarAction;
    if (action === "morning" || action === "evening" || action === "beforeSleep") {
      window.openWirdCategory?.(action);
      return;
    }
    const azkarTab = document.querySelector('.nav-item[data-page="azkar"]');
    if (azkarTab) azkarTab.click();
  });

  showPeriod();
  window.setInterval(showPeriod, 30 * 1000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) showPeriod();
  });

  // تصدير المنطق للاختبار أو للاستخدام من واجهة أخرى دون تكرار قواعد الوقت.
  window.anyasDailyAdhkar = Object.freeze({ periods, getCurrentPeriod });
})();
