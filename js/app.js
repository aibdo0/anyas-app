// =====================================================
// أنياس
// التطبيق الرئيسي وربط صفحات التطبيق
// =====================================================

document.addEventListener("DOMContentLoaded", () => {

  updateDate();
  setupNavigation();

  setupAdhan();
  setupAdhanSettings();
  setupThemeAndLanguage();
  setupNotifications();
  setupVibration();
  setupMuezzinSettings();

  setupAzkarTopics();
  setupWorshipSettings();

  setupQuickActions();
  setupDailyTasks();
  setupDailyDua();
  setupUpcomingOccasion();

  setupDailyQuran();
  setupDailyHadith();
  setupDailyDhikr();
  setupPrayerTracking();
  setupPrayerReport();
  setupNearbyMosque();
  setupQibla();
  setupUpdateBanner();
  setupExtraSettings();

  detectLocationAndLoadTimes();

  setInterval(updateDate, 60 * 1000);
  setInterval(updateCountdown, 1000);
  setInterval(checkAutoAdhan, 1000 * 20);

  setInterval(() => {
    updatePrayerTrackingUI();
    applyManualPrayerOffsets();
  }, 60 * 1000);

});


// =====================================================
// التاريخ الميلادي والهجري
// =====================================================

function updateDate() {

  const today = new Date();

  const dateElement =
    document.getElementById("todayDate");

  if (dateElement) {

    dateElement.textContent =
      today.toLocaleDateString(
        "ar-EG",
        {
          weekday: "long",
          day: "numeric",
          month: "long"
        }
      );

  }

  const hijriElement =
    document.getElementById("todayHijri");

  if (
    hijriElement &&
    typeof getHijriParts === "function"
  ) {

    const hijri =
      typeof getDisplayedHijriParts === "function"
        ? getDisplayedHijriParts(today)
        : getHijriParts(today);

    if (hijri) {

      const monthName = hijri.monthName || String(hijri.month);
      hijriElement.textContent =
        hijri.day + " " + monthName + " " + hijri.year + " هـ";

    }

  }

}


// =====================================================
// التنقل بين الصفحات
// =====================================================

function setupNavigation() {

  const navItems =
    document.querySelectorAll(".nav-item");

  navItems.forEach(item => {

    item.addEventListener("click", () => {

      const targetPage =
        item.getAttribute("data-page");

      if (!targetPage) {
        return;
      }

      goToPage(targetPage);

    });

  });

}


// =====================================================
// فتح صفحة
// =====================================================

function goToPage(pageId) {

  document
    .querySelectorAll(".page")
    .forEach(page => {

      page.classList.remove("active");

    });

  const page =
    document.getElementById(`page-${pageId}`);

  if (page) {

    page.classList.add("active");

  }

  const navPage = [
    "settings",
    "qibla",
    "prayer-report",
    "tasbeeh"
  ].includes(pageId) ? "more" : pageId;

  document
    .querySelectorAll(".nav-item")
    .forEach(nav => {

      const target =
        nav.getAttribute("data-page");

      nav.classList.toggle(
        "active",
        target === navPage
      );

    });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


// =====================================================
// الوصول السريع
// =====================================================

function setupQuickActions() {
  document.querySelectorAll("[data-more-go]").forEach(button => {
    button.addEventListener("click", () => {
      const destination = button.dataset.moreGo;

      if (destination === "nearby-mosque") {
        openNearbyMosque();
      } else if (destination === "tasbeeh") {
        const tasbeehPage = document.getElementById("page-tasbeeh");
        if (tasbeehPage) goToPage("tasbeeh");
        else openTasbeehFallback();
      } else if (destination === "prayer-report") {
        goToPage("prayer-report");
        updatePrayerReport("week");
      } else {
        goToPage(destination);
      }
    });
  });
}


// =====================================================
// التسبيح - واجهة احتياطية
// =====================================================

function openTasbeehFallback() {

  let modal =
    document.getElementById("tasbeehFallback");

  if (modal) {

    modal.classList.add("show");
    modal.querySelector(".tasbeeh-button")?.focus();
    return;

  }

  modal =
    document.createElement("div");

  modal.id =
    "tasbeehFallback";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "tasbeehFallbackTitle");

  modal.innerHTML = `
    <div class="tasbeeh-fallback-card">

      <button
        type="button"
        class="tasbeeh-close"
        aria-label="إغلاق"
      >
        ×
      </button>

      <div class="tasbeeh-fallback-title" id="tasbeehFallbackTitle">
        التسبيح
      </div>

      <div
        class="tasbeeh-count"
        id="tasbeehFallbackCount"
      >
        0
      </div>

      <button
        type="button"
        class="tasbeeh-button"
        id="tasbeehFallbackButton"
      >
        سبحان الله
      </button>

      <button
        type="button"
        class="tasbeeh-reset"
        id="tasbeehFallbackReset"
      >
        تصفير
      </button>

    </div>
  `;

  document.body.appendChild(modal);

  let count = 0;
  const storageKey = `anyas_tasbeeh_${new Date().toDateString()}`;
  try {
    count = Math.max(0, Number(localStorage.getItem(storageKey)) || 0);
  } catch (error) {
    // Keep the counter usable when browser storage is unavailable.
  }

  const countElement =
    document.getElementById("tasbeehFallbackCount");

  const button =
    document.getElementById("tasbeehFallbackButton");

  const reset =
    document.getElementById("tasbeehFallbackReset");

  countElement.textContent = String(count);

  const close =
    modal.querySelector(".tasbeeh-close");


  button.addEventListener("click", () => {

    count++;

    countElement.textContent =
      count;
    try { localStorage.setItem(storageKey, String(count)); } catch (error) { /* storage optional */ }

  });


  reset.addEventListener("click", () => {

    count = 0;

    countElement.textContent =
      "0";
    try { localStorage.removeItem(storageKey); } catch (error) { /* storage optional */ }

  });


  close.addEventListener("click", () => {

    modal.classList.remove("show");

  });


  modal.addEventListener("click", event => {

    if (event.target === modal) {

      modal.classList.remove("show");

    }

  });

  modal.classList.add("show");
  button.focus();
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && modal.classList.contains("show")) {
      modal.classList.remove("show");
    }
  });

}


// =====================================================
// مهام اليوم
// =====================================================

function setupDailyTasks() {

  const morning =
    document.getElementById("morningAzkarTask");

  const evening =
    document.getElementById("eveningAzkarTask");

  const dailyWird =
    document.getElementById("dailyWirdTask");


  if (morning) {

    morning.addEventListener("click", () => {

      openAzkarTopic(27);

    });

  }


  if (evening) {

    evening.addEventListener("click", () => {

      openAzkarTopic(27);

    });

  }


  if (dailyWird) {

    dailyWird.addEventListener("click", () => {

      goToPage("azkar");

    });

  }

}


// =====================================================
// الدعاء اليومي
// =====================================================

const DAILY_DUAS = [

  "اللهم أعني على ذكرك وشكرك وحسن عبادتك.",

  "اللهم اهدني وسددني.",

  "رب اغفر لي وارحمني واهدني وعافني وارزقني.",

  "اللهم إني أسألك الهدى والتقى والعفاف والغنى.",

  "ربنا آتنا في الدنيا حسنة وفي الآخرة حسنة وقنا عذاب النار.",

  "يا مقلب القلوب ثبت قلبي على دينك.",

  "اللهم اغفر لي ولوالدي وارحمهما كما ربياني صغيرًا.",

  "اللهم إني أسألك علمًا نافعًا ورزقًا طيبًا وعملًا متقبلًا."

];


function setupDailyDua() {

  const duaElement =
    document.getElementById("dailyDuaText");

  const moreButton =
    document.getElementById("openWirdButton");


  if (duaElement) {

    const today = new Date();

    const dayNumber =
      Math.floor(
        new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        ).getTime() / 86400000
      );

    const index =
      Math.abs(dayNumber) %
      DAILY_DUAS.length;

    duaElement.textContent =
      DAILY_DUAS[index];

  }


  if (moreButton) {

    moreButton.addEventListener("click", () => {

      goToPage("tasks");

    });

  }

}


// =====================================================
// محتوى اليوم حسب اليوم الهجري الظاهر في التطبيق
// =====================================================

let cachedHijriYearDay = null;

function getHijriDayOfYear(date = new Date()) {
  if (typeof getDisplayedHijriParts !== "function") return 1;
  const adjustment = localStorage.getItem("anyas_hijri_adjustment") || "0";
  const cacheKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${adjustment}`;
  if (cachedHijriYearDay?.key === cacheKey) return cachedHijriYearDay.day;

  const current = getDisplayedHijriParts(date);
  if (!current) return 1;

  const cursor = new Date(date);
  cursor.setHours(12, 0, 0, 0);
  for (let offset = 0; offset < 360; offset += 1) {
    const candidate = new Date(cursor);
    candidate.setDate(candidate.getDate() - offset);
    const parts = getDisplayedHijriParts(candidate);
    if (!parts || parts.year !== current.year) break;
    if (parts.month === 1 && parts.day === 1) {
      cachedHijriYearDay = { key: cacheKey, day: offset + 1 };
      return offset + 1;
    }
  }
  const fallback = Math.max(1, Math.min(355, (current.month - 1) * 30 + current.day));
  cachedHijriYearDay = { key: cacheKey, day: fallback };
  return fallback;
}


function setupDailyQuran() {
  const textElement = document.getElementById("dailyAyahText");
  const referenceElement = document.getElementById("dailyAyahReference");
  const verses = window.dailyQuranSelection || [];
  if (!textElement || verses.length < 354) return;

  const day = getHijriDayOfYear();
  const verse = verses[day - 1];
  if (!verse) return;
  textElement.textContent = verse.text;
  if (referenceElement) {
    referenceElement.textContent = `سورة ${verse.surahName} — آية ${verse.ayah} · اليوم ${day} هجريًا`;
  }
}


async function setupDailyHadith() {
  const textElement = document.getElementById("dailyHadithText");
  const referenceElement = document.getElementById("dailyHadithReference");
  const ids = window.dailyHadithSelection || [];
  if (!textElement || ids.length < 354) return;

  const day = getHijriDayOfYear();
  const id = ids[day - 1];
  if (!id) return;
  textElement.textContent = "جارٍ تحميل حديث اليوم...";
    if (referenceElement) referenceElement.textContent = `اليوم ${day} هجريًا`;

  try {
    const url = new URL("https://hadeethenc.com/api/v1/hadeeths/one/");
    url.searchParams.set("id", id);
    url.searchParams.set("language", "ar");
    const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`HadeethEnc HTTP ${response.status}`);
    const hadith = await response.json();
    if (!hadith || !hadith.hadeeth) throw new Error("HadeethEnc returned no Arabic text");
    textElement.textContent = hadith.hadeeth;
    if (referenceElement) {
      referenceElement.textContent = hadith.grade || "";
    }
  } catch (error) {
    console.error("تعذر تحميل حديث اليوم من HadeethEnc:", error);
    textElement.textContent = "تعذر تحميل الحديث الآن. تحقق من اتصال الإنترنت وأعد المحاولة.";
    if (referenceElement) referenceElement.textContent = `اليوم ${day} هجريًا`;
  }
}


function setupDailyDhikr() {
  const textElement = document.getElementById("dailyDhikrText");
  const referenceElement = document.getElementById("dailyDhikrReference");
  if (!textElement) return;

  const entries = (window.azkarTopics || []).flatMap(topic =>
    (topic.items || []).map((item, itemIndex) => ({ topic, item, itemIndex }))
  ).filter(entry => entry.item && entry.item.text);
  if (!entries.length) return;

  const day = getHijriDayOfYear();
  const entry = entries[(day - 1) % entries.length];
  textElement.textContent = entry.item.text;
  if (referenceElement) {
    referenceElement.textContent = `${entry.topic.title} · ذكر ${((day - 1) % entries.length) + 1} من ${entries.length}`;
  }
}


// =====================================================
// المناسبة القادمة
// =====================================================

function setupUpcomingOccasion() {

  updateUpcomingOccasion();

  setInterval(
    updateUpcomingOccasion,
    60 * 60 * 1000
  );

}


function updateUpcomingOccasion() {

  const element =
    document.getElementById("upcomingOccasion");

  if (!element) {
    return;
  }

  if (
    typeof daysUntilHijri !== "function"
  ) {

    element.textContent =
      "تابع مواسم الطاعة من الإعدادات";

    return;

  }


  const occasions = [

    {
      month: 9,
      day: 1,
      text: "رمضان"
    },

    {
      month: 10,
      day: 1,
      text: "عيد الفطر"
    },

    {
      month: 12,
      day: 8,
      text: "الحج"
    },

    {
      month: 12,
      day: 9,
      text: "يوم عرفة"
    },

    {
      month: 12,
      day: 10,
      text: "عيد الأضحى"
    }

  ];


  let nearest = null;


  occasions.forEach(occasion => {

    const days =
      daysUntilHijri(
        occasion.month,
        occasion.day
      );

    if (
      days === null ||
      days === undefined
    ) {
      return;
    }

    if (
      !nearest ||
      days < nearest.days
    ) {

      nearest = {
        ...occasion,
        days
      };

    }

  });


  if (!nearest) {

    element.textContent =
      "تابع مواسم الطاعة من الإعدادات";

    return;

  }


  if (nearest.days === 0) {

    element.textContent =
      `اليوم: ${nearest.text}`;

    return;

  }


  if (nearest.days === 1) {

    element.textContent =
      `غدًا: ${nearest.text}`;

    return;

  }


  element.textContent =
    `باقي ${nearest.days} يوم على ${nearest.text}`;

}


// =====================================================
// تتبع الصلوات
// =====================================================

const PRAYER_TRACKING_KEY =
  "anyas_prayer_tracking";

const TRACKED_PRAYER_KEYS =
  ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];


function getTodayKey() {

  const today =
    new Date();

  return [
    today.getFullYear(),
    formatNumber(today.getMonth() + 1),
    formatNumber(today.getDate())
  ].join("-");

}


function getPrayerTrackingData() {

  try {

    const data =
      JSON.parse(
        localStorage.getItem(
          PRAYER_TRACKING_KEY
        ) || "{}"
      );

    return data || {};

  } catch (error) {

    return {};

  }

}


function savePrayerTrackingData(data) {

  localStorage.setItem(
    PRAYER_TRACKING_KEY,
    JSON.stringify(data)
  );

}


function setupPrayerTracking() {

  const buttons =
    document.querySelectorAll(
      "[data-track-prayer]"
    );

  buttons.forEach(button => {

    button.addEventListener("click", () => {

      const prayer =
        button.getAttribute(
          "data-track-prayer"
        );

      if (!prayer) {
        return;
      }

      togglePrayerTracking(prayer);

    });

  });


  const reportButton =
    document.getElementById(
      "openPrayerReportButton"
    );

  if (reportButton) {

    reportButton.addEventListener(
      "click",
      () => {

        goToPage("prayer-report");

        updatePrayerReport("week");

      }
    );

  }


  updatePrayerTrackingUI();

}


function togglePrayerTracking(prayer) {

  const data =
    getPrayerTrackingData();

  const today =
    getTodayKey();

  if (!data[today]) {

    data[today] = {};

  }

  data[today][prayer] =
    !Boolean(
      data[today][prayer]
    );

  savePrayerTrackingData(data);

  updatePrayerTrackingUI();
  updatePrayerReport(window.currentPrayerReportRange);

}


function updatePrayerTrackingUI() {

  const data =
    getPrayerTrackingData();

  const today =
    getTodayKey();

  const todayData =
    data[today] || {};

  document
    .querySelectorAll("[data-track-prayer]")
    .forEach(button => {

      const prayer =
        button.getAttribute(
          "data-track-prayer"
        );

      const completed =
        Boolean(
          todayData[prayer]
        );

      const status = button.querySelector(".track-status");
      if (status) {
        status.textContent = completed ? "تمّت ✓" : "لم تُسجّل";
      }

      button.classList.toggle(
        "completed",
        completed
      );

      button.setAttribute(
        "aria-pressed",
        completed ? "true" : "false"
      );

    });

  const completedCount = TRACKED_PRAYER_KEYS
    .filter(prayer => Boolean(todayData[prayer])).length;
  const progressText = document.getElementById("todayPrayerProgressText");
  const progressBar = document.getElementById("todayPrayerProgressBar");
  if (progressText) {
    progressText.textContent = `${completedCount} من ${TRACKED_PRAYER_KEYS.length} صلوات مسجّلة اليوم`;
  }
  if (progressBar) {
    const percent = Math.round(completedCount / TRACKED_PRAYER_KEYS.length * 100);
    progressBar.style.width = `${percent}%`;
    progressBar.setAttribute("aria-valuenow", String(completedCount));
  }

  const streakBadge =
    document.getElementById(
      "homeStreakBadge"
    );

  if (streakBadge) {

    const streaks =
      computePrayerStreaks();

    streakBadge.textContent =
      streaks.current > 0
        ? `(${streaks.current} يوم متتالي)`
        : "";

  }

}


function getPrayerTrackingForDate(date) {

  const data =
    getPrayerTrackingData();

  const key =
    [
      date.getFullYear(),
      formatNumber(date.getMonth() + 1),
      formatNumber(date.getDate())
    ].join("-");

  return data[key] || {};

}


// =====================================================
// التقرير الأسبوعي
// =====================================================

function setupPrayerReport() {

  const openButton =
    document.getElementById(
      "openPrayerReportFromSettings"
    );

  if (openButton) {

    openButton.addEventListener(
      "click",
      () => {

        goToPage("prayer-report");

        updatePrayerReport("week");

      }
    );

  }


  document
    .querySelectorAll(
      ".report-range-tab"
    )
    .forEach(tab => {

      tab.addEventListener(
        "click",
        () => {

          updatePrayerReport(
            tab.dataset.range
          );

        }
      );

    });


  const reportPage =
    document.getElementById(
      "page-prayer-report"
    );

  if (reportPage) {

    updatePrayerReport("week");

  }

}


function computePrayerRangeStats(
  days
) {

  const today =
    new Date();

  let completed = 0;

  let total = 0;

  const dayRows = [];


  for (let i = 0; i < days; i++) {

    const date =
      new Date(today);

    date.setDate(
      today.getDate() - i
    );

    const tracking =
      getPrayerTrackingForDate(date);

    const dayCompleted =
      TRACKED_PRAYER_KEYS.filter(
        prayer => tracking[prayer]
      ).length;

    completed +=
      dayCompleted;

    total +=
      TRACKED_PRAYER_KEYS.length;

    dayRows.push({
      date,
      completed: dayCompleted,
      total: TRACKED_PRAYER_KEYS.length
    });

  }


  const missed =
    total - completed;

  const percentage =
    total > 0
      ? Math.round(
          (completed / total) * 100
        )
      : 0;


  return {
    completed,
    missed,
    total,
    percentage,
    dayRows
  };

}


function computePrayerStreaks() {

  const data =
    getPrayerTrackingData();

  function isDayComplete(key) {

    const day =
      data[key] || {};

    return TRACKED_PRAYER_KEYS.every(
      prayer => Boolean(day[prayer])
    );

  }


  /*
   * الأيام المتتالية الحالية:
   * نعد للخلف من اليوم، ولا نكسر
   * التتابع إذا كان يوم النهاردة
   * لسه ما خلصش (الصلوات الباقية
   * لسه ماجاش وقتها).
   */

  let current = 0;

  const cursor =
    new Date();

  let isFirstDay = true;


  while (true) {

    const key =
      [
        cursor.getFullYear(),
        formatNumber(cursor.getMonth() + 1),
        formatNumber(cursor.getDate())
      ].join("-");

    const complete =
      isDayComplete(key);


    if (isFirstDay) {

      isFirstDay = false;


      if (!complete) {

        cursor.setDate(
          cursor.getDate() - 1
        );

        continue;

      }

    }


    if (complete) {

      current++;

      cursor.setDate(
        cursor.getDate() - 1
      );

    } else {

      break;

    }

  }


  /*
   * أطول تتابع مسجل على الإطلاق
   */

  const dateKeys =
    Object.keys(data).sort();

  let longest = 0;

  let run = 0;

  let previousDate = null;


  dateKeys.forEach(key => {

    const complete =
      isDayComplete(key);

    const parts =
      key.split("-").map(Number);

    const dateObj =
      new Date(
        parts[0],
        parts[1] - 1,
        parts[2]
      );


    if (complete) {

      if (previousDate) {

        const dayDiff =
          Math.round(
            (dateObj - previousDate) /
            86400000
          );

        run =
          dayDiff === 1
            ? run + 1
            : 1;

      } else {

        run = 1;

      }

      longest =
        Math.max(
          longest,
          run
        );

      previousDate =
        dateObj;

    } else {

      run = 0;

      previousDate = null;

    }

  });


  longest =
    Math.max(
      longest,
      current
    );


  return {
    current,
    longest
  };

}


function formatReportDayLabel(
  date,
  index
) {

  if (index === 0) {
    return "اليوم";
  }

  if (index === 1) {
    return "أمس";
  }


  try {

    return new Intl.DateTimeFormat(
      "ar-EG",
      {
        weekday: "long",
        day: "numeric",
        month: "numeric"
      }
    ).format(date);

  } catch (error) {

    return `${date.getDate()}/${date.getMonth() + 1}`;

  }

}


function renderPrayerReportList(
  dayRows
) {

  const list =
    document.getElementById(
      "weeklyPrayerList"
    );

  if (!list) {
    return;
  }


  list.innerHTML = "";


  dayRows.forEach((row, index) => {

    const item =
      document.createElement("div");

    item.className =
      "weekly-prayer-row";


    if (row.completed === 0) {

      item.classList.add("empty");

    }


    const label =
      document.createElement("span");

    label.className =
      "weekly-prayer-name";

    label.textContent =
      formatReportDayLabel(
        row.date,
        index
      );


    const value =
      document.createElement("span");

    value.className =
      "weekly-prayer-value";

    value.textContent =
      `${row.completed}/${row.total}`;


    item.appendChild(label);

    item.appendChild(value);

    list.appendChild(item);

  });

}


function setReportStatValue(
  id,
  value
) {

  const element =
    document.getElementById(id);

  if (element) {

    element.textContent =
      value;

  }

}


function updatePrayerReport(
  range
) {

  const reportPage =
    document.getElementById(
      "page-prayer-report"
    );

  if (!reportPage) {
    return;
  }


  const activeRange =
    range ||
    window.currentPrayerReportRange ||
    "week";

  window.currentPrayerReportRange =
    activeRange;

  const days =
    activeRange === "month"
      ? 30
      : 7;


  document
    .querySelectorAll(
      ".report-range-tab"
    )
    .forEach(tab => {

      const isActive =
        tab.dataset.range === activeRange;

      tab.classList.toggle(
        "active",
        isActive
      );

      tab.setAttribute(
        "aria-selected",
        isActive ? "true" : "false"
      );

    });


  const periodElement =
    document.getElementById(
      "weeklyReportPeriod"
    );

  if (periodElement) {

    periodElement.textContent =
      activeRange === "month"
        ? "آخر ٣٠ يومًا"
        : "آخر ٧ أيام";

  }


  const stats =
    computePrayerRangeStats(days);

  const streaks =
    computePrayerStreaks();


  setReportStatValue(
    "prayerReportPercentage",
    `${stats.percentage}%`
  );

  setReportStatValue(
    "prayerReportCompleted",
    stats.completed
  );

  setReportStatValue(
    "prayerReportMissed",
    stats.missed
  );

  setReportStatValue(
    "prayerReportTotal",
    stats.total
  );

  setReportStatValue(
    "prayerReportStreak",
    streaks.current
  );

  setReportStatValue(
    "prayerReportBestStreak",
    streaks.longest
  );


  renderPrayerReportList(
    stats.dayRows
  );

}


// =====================================================
// أقرب مسجد
// =====================================================

function setupNearbyMosque() {

  const button =
    document.getElementById(
      "nearbyMosqueButton"
    );

  if (!button) {
    return;
  }

  button.addEventListener(
    "click",
    openNearbyMosque
  );

}


function openNearbyMosque() {

  let latitude =
    window.currentLatitude ||
    window.userLatitude;

  let longitude =
    window.currentLongitude ||
    window.userLongitude;


  if (
    latitude &&
    longitude
  ) {

    const url =
      `https://www.google.com/maps/search/?api=1&query=mosque+near+${latitude},${longitude}`;

    window.open(
      url,
      "_blank"
    );

    return;

  }


  if (
    navigator.geolocation
  ) {

    navigator.geolocation.getCurrentPosition(
      position => {

        const lat =
          position.coords.latitude;

        const lon =
          position.coords.longitude;

        const url =
          `https://www.google.com/maps/search/?api=1&query=mosque+near+${lat},${lon}`;

        window.open(
          url,
          "_blank"
        );

      },
      () => {

        const url =
          "https://www.google.com/maps/search/?api=1&query=mosque+near+me";

        window.open(
          url,
          "_blank"
        );

      }
    );

    return;

  }


  window.open(
    "https://www.google.com/maps/search/?api=1&query=mosque+near+me",
    "_blank"
  );

}


// =====================================================
// القبلة
// =====================================================

function setupQibla() {

  const button =
    document.getElementById(
      "openQiblaButton"
    );

  if (button) {

    button.addEventListener(
      "click",
      () => {

        goToPage("qibla");

      }
    );

  }


  const backButton =
    document.getElementById(
      "qiblaBackButton"
    );

  if (backButton) {

    backButton.addEventListener(
      "click",
      () => {

        goToPage("settings");

      }
    );

  }

}


// =====================================================
// إشعار تحديث التطبيق
// =====================================================

function setupUpdateBanner() {

  const banner =
    document.getElementById(
      "updateBanner"
    );

  const updateButton =
    document.getElementById(
      "updateButton"
    );

  const dismissButton =
    document.getElementById(
      "dismissUpdateButton"
    );


  if (!banner) {
    return;
  }


  const dismissedVersion =
    localStorage.getItem(
      "anyas_update_banner_dismissed"
    );


  const currentVersion =
    "2.0";


  if (
    dismissedVersion !==
    currentVersion
  ) {

    banner.hidden = false;

  } else {

    banner.hidden = true;

  }


  if (updateButton) {

    updateButton.addEventListener(
      "click",
      () => {

        localStorage.removeItem(
          "anyas_update_banner_dismissed"
        );

        window.location.reload();

      }
    );

  }


  if (dismissButton) {

    dismissButton.addEventListener(
      "click",
      () => {

        localStorage.setItem(
          "anyas_update_banner_dismissed",
          currentVersion
        );

        banner.hidden = true;

      }
    );

  }

}


// =====================================================
// إعدادات إضافية
// =====================================================

function setupExtraSettings() {

  setupCalculationMethod();
  setupPrayerTrackingToggle();
  setupHijriAdjustment();
  setupManualPrayerSettings();

}


// =====================================================
// طريقة حساب مواقيت الصلاة
// =====================================================

function setupCalculationMethod() {

  const select =
    document.getElementById(
      "calculationMethodSelect"
    );

  if (!select) {
    return;
  }


  const saved =
    localStorage.getItem(
      "anyas_calculation_method"
    );


  if (saved) {

    select.value =
      saved;

  }


  select.addEventListener(
    "change",
    () => {

      localStorage.setItem(
        "anyas_calculation_method",
        select.value
      );

      /*
       * إعادة تحميل التطبيق حتى تستخدم
       * إعدادات المواقيت الجديدة عند
       * إعادة تحميل بيانات الصلاة.
       */

      window.location.reload();

    }
  );

}


// =====================================================
// تشغيل / إيقاف تتبع الصلاة
// =====================================================

function setupPrayerTrackingToggle() {

  const toggle =
    document.getElementById(
      "prayerTrackingToggle"
    );

  if (!toggle) {
    return;
  }


  const saved =
    localStorage.getItem(
      "anyas_prayer_tracking_enabled"
    );


  toggle.checked =
    saved !== "false";


  toggle.addEventListener(
    "change",
    () => {

      localStorage.setItem(
        "anyas_prayer_tracking_enabled",
        toggle.checked
          ? "true"
          : "false"
      );

      const tracker =
        document.getElementById(
          "todayPrayerTracker"
        );

      if (tracker) {

        tracker.hidden =
          !toggle.checked;

      }

    }
  );


  const tracker =
    document.getElementById(
      "todayPrayerTracker"
    );

  if (tracker) {

    tracker.hidden =
      saved === "false";

  }

}


// =====================================================
// تعديل التاريخ الهجري
// =====================================================

function setupHijriAdjustment() {

  const input =
    document.getElementById(
      "hijriDateAdjustment"
    );

  if (!input) {
    return;
  }


  const saved =
    localStorage.getItem(
      "anyas_hijri_adjustment"
    ) || "0";


  input.value =
    saved;


  input.addEventListener(
    "change",
    () => {

      let value =
        parseInt(
          input.value,
          10
        );

      if (isNaN(value)) {
        value = 0;
      }

      if (value > 3) {
        value = 3;
      }

      if (value < -3) {
        value = -3;
      }

      input.value =
        value;

      localStorage.setItem(
        "anyas_hijri_adjustment",
        String(value)
      );

      updateDate();

    }
  );

}


// =====================================================
// إعدادات المواقيت اليدوية
// =====================================================

function setupManualPrayerSettings() {

  const button =
    document.getElementById(
      "openManualPrayerSettings"
    );

  if (!button) {
    return;
  }


  button.addEventListener(
    "click",
    () => {

      openManualPrayerModal();

    }
  );

}


function openManualPrayerModal() {

  let modal =
    document.getElementById(
      "manualPrayerModal"
    );


  if (!modal) {

    modal =
      document.createElement("div");

    modal.id =
      "manualPrayerModal";

    modal.innerHTML = `
      <div class="manual-prayer-card">

        <button
          type="button"
          id="manualPrayerClose"
        >
          إغلاق
        </button>

        <h3>
          تعديل مواقيت الصلاة
        </h3>

        <p>
          يمكنك إضافة أو خصم دقائق من مواقيت الصلاة.
        </p>

        <label>
          الفجر
          <input
            type="number"
            id="offsetFajr"
            value="0"
          >
        </label>

        <label>
          الظهر
          <input
            type="number"
            id="offsetDhuhr"
            value="0"
          >
        </label>

        <label>
          العصر
          <input
            type="number"
            id="offsetAsr"
            value="0"
          >
        </label>

        <label>
          المغرب
          <input
            type="number"
            id="offsetMaghrib"
            value="0"
          >
        </label>

        <label>
          العشاء
          <input
            type="number"
            id="offsetIsha"
            value="0"
          >
        </label>

        <button
          type="button"
          id="saveManualPrayerSettings"
        >
          حفظ
        </button>

      </div>
    `;

    document.body.appendChild(modal);


    const close =
      document.getElementById(
        "manualPrayerClose"
      );

    if (close) {

      close.addEventListener(
        "click",
        () => {

          modal.remove();

        }
      );

    }


    const save =
      document.getElementById(
        "saveManualPrayerSettings"
      );

    if (save) {

      save.addEventListener(
        "click",
        () => {

          const offsets = {

            Fajr:
              getInputNumber(
                "offsetFajr"
              ),

            Dhuhr:
              getInputNumber(
                "offsetDhuhr"
              ),

            Asr:
              getInputNumber(
                "offsetAsr"
              ),

            Maghrib:
              getInputNumber(
                "offsetMaghrib"
              ),

            Isha:
              getInputNumber(
                "offsetIsha"
              )

          };


          localStorage.setItem(
            "anyas_prayer_offsets",
            JSON.stringify(offsets)
          );


          applyManualPrayerOffsets();

          modal.remove();

        }
      );

    }

  }


  const offsets =
    getPrayerOffsets();


  setInputValue(
    "offsetFajr",
    offsets.Fajr
  );

  setInputValue(
    "offsetDhuhr",
    offsets.Dhuhr
  );

  setInputValue(
    "offsetAsr",
    offsets.Asr
  );

  setInputValue(
    "offsetMaghrib",
    offsets.Maghrib
  );

  setInputValue(
    "offsetIsha",
    offsets.Isha
  );


  modal.style.display =
    "flex";

}


function getInputNumber(id) {

  const element =
    document.getElementById(id);

  if (!element) {
    return 0;
  }

  const value =
    parseInt(
      element.value,
      10
    );

  return isNaN(value)
    ? 0
    : value;

}


function setInputValue(id, value) {

  const element =
    document.getElementById(id);

  if (element) {

    element.value =
      value || 0;

  }

}


// =====================================================
// تطبيق تعديل المواقيت
// =====================================================

function applyManualPrayerOffsets() {

  const offsets =
    getPrayerOffsets();


  const mapping = {

    Fajr: "fajrTime",

    Dhuhr: "dhuhrTime",

    Asr: "asrTime",

    Maghrib: "maghribTime",

    Isha: "ishaTime"

  };


  Object.keys(mapping).forEach(
    prayer => {

      const element =
        document.getElementById(
          mapping[prayer]
        );

      if (!element) {
        return;
      }

      const original =
        element.getAttribute(
          "data-original-time"
        );


      if (!original) {

        const current =
          element.textContent.trim();

        if (
          current &&
          current !== "--:--" &&
          current !== "--"
        ) {

          element.setAttribute(
            "data-original-time",
            current
          );

        }

      }


      const base =
        element.getAttribute(
          "data-original-time"
        );


      if (!base) {
        return;
      }


      const minutes =
        parseInt(
          offsets[prayer] || 0,
          10
        );


      if (!minutes) {

        element.textContent =
          base;

        return;

      }


      const adjusted =
        addMinutesToTime(
          base,
          minutes
        );


      if (adjusted) {

        element.textContent =
          adjusted;

      }

    }
  );

}


function addMinutesToTime(
  timeString,
  minutes
) {

  const match =
    timeString.match(
      /(\d{1,2}):(\d{2})/
    );

  if (!match) {
    return timeString;
  }


  let hours =
    parseInt(
      match[1],
      10
    );

  let mins =
    parseInt(
      match[2],
      10
    );


  mins += minutes;


  while (mins >= 60) {

    mins -= 60;
    hours++;

  }


  while (mins < 0) {

    mins += 60;
    hours--;

  }


  hours =
    (hours + 24) % 24;


  return (
    formatNumber(hours) +
    ":" +
    formatNumber(mins)
  );

}
