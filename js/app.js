// =====================================================
// مَآبُ الأوَّاب
// التطبيق الرئيسي وربط صفحات التطبيق
// =====================================================

document.addEventListener("DOMContentLoaded", () => {

  const isFirstRun = setupFirstRunOnboarding();
  updateAppVersionLabels();
  window.addEventListener("anyas:languagechange", updateAppVersionLabels);
  updateDate();
  setupNavigation();

  setupAdhan();
  setupAdhanSettings();
  setupBeforeFajrReminder();
  setupAyatKursiVoices();
  setupAdhkarAudioControls();
  setupAdhkarVoiceChoices();
  setupThemeAndLanguage();
  setupHomeThemeToggle();
  setupNotifications();
  checkDailyAdhkarNotifications();
  checkPrayerReminderNotifications();
  checkLastThirdNotification();
  checkAdditionalReminders();
  setupVibration();
  setupMuezzinSettings();

  setupAzkarTopics();
  moveWorshipSettingsToPage();
  setupSettingsSectionTabs();
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
  setupLocationSettings();

  detectLocationAndLoadTimes({ allowPrompt: shouldPromptLocationOnStartup(isFirstRun) });

  setInterval(updateDate, 60 * 1000);
  setInterval(updateCountdown, 1000);
  setInterval(() => {
    checkAutoAdhan();
    checkBeforeFajrReminder();
    checkDailyAdhkarNotifications();
    checkPrayerReminderNotifications();
    checkLastThirdNotification();
    checkAdditionalReminders();
  }, 1000 * 20);

  setInterval(() => {
    updatePrayerTrackingUI();
    applyManualPrayerOffsets();
  }, 60 * 1000);

});

function updateAppVersionLabels() {
  const version = window.ANIAS_APP_VERSION || "1.1.5";
  const prefix = document.documentElement.lang === "en" ? "Latest official release: " : "آخر إصدار رسمي: ";
  document.querySelectorAll("[data-app-version-label]").forEach(element => {
    element.textContent = `${prefix}${version}`;
  });
}


function hasPriorAniasUse() {
  try {
    return Object.keys(localStorage).some(key => key.startsWith("anyas_") && key !== "anyas_onboarding_completed");
  } catch (error) {
    return false;
  }
}

function setupFirstRunOnboarding() {
  const overlay = document.getElementById("firstRunOverlay");
  if (!overlay) return false;

  try {
    if (localStorage.getItem("anyas_onboarding_completed") === "true") return false;
  } catch (error) { /* storage may be unavailable */ }

  if (hasPriorAniasUse()) {
    try { localStorage.setItem("anyas_onboarding_completed", "true"); } catch (error) { /* optional */ }
    return false;
  }

  const dialog = overlay.querySelector(".first-run-card");
  const pages = [...document.querySelectorAll(".page, .bottom-nav")];
  const focusable = () => [...dialog.querySelectorAll("button:not([disabled]), a[href]")]
    .filter(element => !element.closest("[hidden]"));
  const finish = choice => {
    try {
      localStorage.setItem("anyas_onboarding_completed", "true");
      localStorage.setItem("anyas_location_start_choice", choice);
    } catch (error) { /* onboarding remains usable without storage */ }
    overlay.hidden = true;
    document.body.classList.remove("first-run-open");
    pages.forEach(page => { page.inert = false; });
    document.removeEventListener("keydown", trapKeys, true);
  };
  const showStep = step => {
    dialog.setAttribute("aria-labelledby", step === 1 ? "firstRunTitle" : "firstRunCityTitle");
    overlay.querySelectorAll("[data-onboarding-step]").forEach(section => {
      section.hidden = section.dataset.onboardingStep !== String(step);
    });
    overlay.querySelectorAll(".first-run-progress-dot").forEach((dot, index) => {
      dot.classList.toggle("is-active", index < step);
    });
    requestAnimationFrame(() => focusable()[0]?.focus());
  };
  const trapKeys = event => {
    if (overlay.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      if (!overlay.querySelector('[data-onboarding-step="1"]').hidden) showStep(2);
      else finish("later");
      return;
    }
    if (event.key !== "Tab") return;
    const items = focusable();
    if (!items.length) return;
    if (event.shiftKey && document.activeElement === items[0]) {
      event.preventDefault();
      items[items.length - 1].focus();
    } else if (!event.shiftKey && document.activeElement === items[items.length - 1]) {
      event.preventDefault();
      items[0].focus();
    }
  };

  overlay.hidden = false;
  document.body.classList.add("first-run-open");
  pages.forEach(page => { page.inert = true; });
  showStep(1);
  document.addEventListener("keydown", trapKeys, true);

  overlay.querySelectorAll("[data-onboarding-action]").forEach(button => {
    button.addEventListener("click", () => {
      switch (button.dataset.onboardingAction) {
        case "next": showStep(2); break;
        case "back": showStep(1); break;
        case "skip-intro": showStep(2); break;
        case "choose-city":
          finish("later");
          goToPage("city-picker");
          break;
        case "start":
          finish("later");
          goToPage("home");
          break;
      }
    });
  });
  return true;
}

function shouldPromptLocationOnStartup(isFirstRun) {
  if (isFirstRun) return false;
  try {
    const choice = localStorage.getItem("anyas_location_start_choice");
    return choice !== "later" && choice !== "manual";
  } catch (error) {
    return true;
  }
}


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
  document.addEventListener("click", event => {
    const backButton = event.target.closest("[data-back-about]");
    if (!backButton) return;
    event.preventDefault();
    goToPage("about");
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
    "about",
    "privacy",
    "prayer-report",
    "worship",
    "city-picker",
    "prayer-schedule",
    "mosques"
  ].includes(pageId) ? "more" : pageId === "tasbeeh" ? "tasks" : pageId === "qibla" ? (document.getElementById("qiblaBackButton")?.dataset.returnTo === "more" ? "more" : "home") : pageId;

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
      } else if (destination === "qibla") {
        const backButton = document.getElementById("qiblaBackButton");
        if (backButton) backButton.dataset.returnTo = "more";
        goToPage("qibla");
      } else if (destination === "prayer-report") {
        goToPage("prayer-report");
        updatePrayerReport("week");
      } else {
        goToPage(destination);
      }
    });
  });
  const syncPrivacyLanguage = () => {
    const isEnglish = document.documentElement.lang === "en";
    document.querySelector(".privacy-ar")?.toggleAttribute("hidden", isEnglish);
    document.querySelector(".privacy-en")?.toggleAttribute("hidden", !isEnglish);
  };
  syncPrivacyLanguage();
  window.addEventListener("anyas:languagechange", syncPrivacyLanguage);
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

    const dayNumber = typeof getHijriDayOfYear === "function"
      ? getHijriDayOfYear()
      : new Date().getDate();

    const index =
      Math.abs(dayNumber - 1) %
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
  const cacheKey = `anyas_hadith_${id}`;
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
    if (cached?.hadeeth) {
      textElement.textContent = cached.hadeeth;
      if (referenceElement) referenceElement.textContent = cached.grade || `اليوم ${day} هجريًا`;
    } else {
      textElement.textContent = "سيُحمّل حديث اليوم عند توفر الاتصال، ثم يبقى محفوظًا على جهازك.";
    }
  } catch (_) {
    textElement.textContent = "سيُحمّل حديث اليوم عند توفر الاتصال، ثم يبقى محفوظًا على جهازك.";
  }

  try {
    const url = new URL("https://hadeethenc.com/api/v1/hadeeths/one/");
    url.searchParams.set("id", id);
    url.searchParams.set("language", "ar");
    const response = await window.anyasFetch(url.toString(), { headers: { Accept: "application/json" } }, { timeoutMs: 9000, retries: 1 });
    if (!response.ok) throw new Error(`HadeethEnc HTTP ${response.status}`);
    const hadith = await response.json();
    if (!hadith || !hadith.hadeeth) throw new Error("HadeethEnc returned no Arabic text");
    try { localStorage.setItem(cacheKey, JSON.stringify({ hadeeth: hadith.hadeeth, grade: hadith.grade || "" })); } catch (_) { }
    textElement.textContent = hadith.hadeeth;
    if (referenceElement) {
      referenceElement.textContent = hadith.grade || "";
    }
  } catch (error) {
    console.info("الحديث يعرض من ذاكرة الجهاز عند الانقطاع:", error.message);
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

  if (typeof window.getCurrentHijriDateKey === "function") {
    return window.getCurrentHijriDateKey();
  }

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

    const records = data || {};
    const migratedKey = "anyas_prayer_tracking_hijri_migrated";
    if (typeof window.getCurrentHijriDateKey === "function" && localStorage.getItem(migratedKey) !== "true") {
      Object.entries(records).forEach(([key, value]) => {
        const match = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return;
        const oldDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        const hijriKey = window.getCurrentHijriDateKey(oldDate);
        if (hijriKey !== key) {
          records[hijriKey] = { ...(records[hijriKey] || {}), ...value };
          delete records[key];
        }
      });
      localStorage.setItem(PRAYER_TRACKING_KEY, JSON.stringify(records));
      localStorage.setItem(migratedKey, "true");
    }
    return records;

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

  if (typeof window.updateDailyOverview === "function") {
    window.updateDailyOverview();
  }

}


function getPrayerTrackingForDate(date) {

  const data =
    getPrayerTrackingData();

  const key = typeof window.getCurrentHijriDateKey === "function"
    ? window.getCurrentHijriDateKey(date)
    : [date.getFullYear(), formatNumber(date.getMonth() + 1), formatNumber(date.getDate())].join("-");

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

    const key = typeof window.getCurrentHijriDateKey === "function"
      ? window.getCurrentHijriDateKey(cursor)
      : [cursor.getFullYear(), formatNumber(cursor.getMonth() + 1), formatNumber(cursor.getDate())].join("-");

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


function getWorshipStats(days = 7) {
  let dhikr = 0;
  let tasbeeh = 0;
  let sunnah = 0;
  let activeDays = 0;
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - i);
    const gregorianKey = date.toLocaleDateString("en-CA");
    let dayActive = false;
    try {
      const wird = JSON.parse(localStorage.getItem(`anyas_wird_progress_${gregorianKey}`) || "{}");
      const completedWird = Object.values(wird).filter(value => value === true).length;
      dhikr += completedWird;
      dayActive ||= completedWird > 0;
      const hijriKey = typeof window.getCurrentHijriDateKey === "function" ? window.getCurrentHijriDateKey(date) : "";
      const devotion = JSON.parse(localStorage.getItem(`anyas_devotions_hijri_${hijriKey}`) || "{}");
      const counts = devotion?.counts && typeof devotion.counts === "object" ? devotion.counts : {};
      const dayTasbeeh = Object.values(counts).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
      tasbeeh += dayTasbeeh;
      dayActive ||= dayTasbeeh > 0;
      const daySunnah = devotion?.sunnah && typeof devotion.sunnah === "object" ? Object.values(devotion.sunnah).filter(Boolean).length : 0;
      sunnah += daySunnah;
      dayActive ||= daySunnah > 0;
    } catch (error) { /* بيانات محلية تالفة لا تمنع عرض باقي الإحصائيات */ }
    if (dayActive) activeDays++;
  }
  return { dhikr, tasbeeh, sunnah, activeDays };
}

function updateWorshipStats(days = 7) {
  const stats = getWorshipStats(days);
  const format = value => Number(value).toLocaleString("ar-EG");
  Object.entries(stats).forEach(([key, value]) => {
    const element = document.getElementById(`worshipStats${key[0].toUpperCase()}${key.slice(1)}`);
    if (element) element.textContent = format(value);
  });
  const period = document.getElementById("worshipStatsPeriod");
  if (period) period.textContent = `آخر ${days === 30 ? "٣٠" : "٧"} يومًا — محفوظة على هذا الجهاز`;
  const highlight = document.getElementById("worshipStatsHighlight");
  if (highlight) highlight.textContent = stats.activeDays ? `أحسنت، حافظت على تسجيل عبادتك في ${format(stats.activeDays)} أيام.` : "ابدأ بتسجيل عبادتك اليوم، وستظهر إحصائياتك هنا.";
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
  updateWorshipStats(days);

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

  if (typeof window.openMosqueDirectory === "function") {
    window.openMosqueDirectory();
    return;
  }

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

        const backButton = document.getElementById("qiblaBackButton");
        if (backButton) backButton.dataset.returnTo = "home";
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

        const returnTo = backButton.dataset.returnTo || "home";
        backButton.dataset.returnTo = "home";
        goToPage(returnTo);

      }
    );

  }

}


function setupHomeThemeToggle() {
  const button = document.getElementById("themeToggle");
  if (!button) return;

  button.addEventListener("click", () => {
    const nextMode = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    const choice = Array.from(document.querySelectorAll('input[name="themeMode"]'))
      .find(input => input.value === nextMode);
    if (choice) {
      choice.checked = true;
      choice.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    try { localStorage.setItem("anyas_themeMode", nextMode); } catch (error) { /* preference is optional */ }
    document.documentElement.dataset.themeMode = nextMode;
    document.documentElement.dataset.theme = nextMode;
    document.documentElement.style.colorScheme = nextMode;
    document.body.classList.toggle("dark-mode", nextMode === "dark");
    const icon = button.querySelector("span");
    if (icon) icon.textContent = nextMode === "dark" ? "☀" : "☾";
  });
}


function moveWorshipSettingsToPage() {
  const title = Array.from(document.querySelectorAll(".settings-section-title"))
    .find(element => element.textContent.trim() === "العبادات والمواسم");
  const card = title?.nextElementSibling;
  const mount = document.getElementById("worshipContent");
  if (title && card && mount) mount.append(title, card);
}

function setupSettingsSectionTabs() {
  const headings = document.querySelectorAll("#page-settings .settings-section-title");
  headings.forEach((heading, index) => {
    const panel = heading.nextElementSibling;
    if (!panel || !panel.matches(".settings-card, .worship-card")) return;

    const label = heading.textContent.trim();
    const panelId = panel.id || `settingsSectionPanel${index + 1}`;
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = `${heading.className} settings-section-toggle`;
    toggle.textContent = label;
    toggle.setAttribute("aria-controls", panelId);
    toggle.setAttribute("aria-expanded", "false");
    panel.id = panelId;
    panel.hidden = true;

    toggle.addEventListener("click", () => {
      const isExpanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!isExpanded));
      panel.hidden = isExpanded;
    });

    heading.replaceWith(toggle);
  });
}


// =====================================================
// إشعار تحديث التطبيق
// =====================================================

function setupUpdateBanner() {

  const banner =
    document.getElementById(
      "updateBanner"
    );

  // نسخة Android تحمل ملفاتها محليًا؛ لا تعرض تنبيه تحديث الويب داخلها.
  if (window.AnyasAndroid && banner) {
    banner.hidden = true;
    return;
  }

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
// إعداد موقع الصلاة من صفحة الإعدادات
// =====================================================

function setupLocationSettings() {
  const button = document.getElementById("refreshLocationButton");
  const cityButton = document.getElementById("openCityPickerFromSettings");
  const status = document.getElementById("locationSettingsDescription");
  const heroCity = document.getElementById("prayerHeroCity");
  if (!button) return;

  cityButton?.addEventListener("click", () => goToPage("city-picker"));

  const renderStatus = (detail = {}) => {
    const city = heroCity?.textContent?.trim() || "موقعك الحالي";
    if (status) {
      status.textContent = detail.fallback ? city + " — الموقع الافتراضي مستخدم" : city + " — تم تحديث الموقع والمواقيت";
    }
    button.disabled = false;
    button.textContent = "استخدام موقعي الحالي";
  };

  window.addEventListener("anyas:location-updated", event => {
    renderStatus(event.detail || {});
  });

  button.addEventListener("click", () => {
    button.disabled = true;
    button.textContent = "جارٍ...";
    if (status) status.textContent = "جارٍ تحديد موقعك وإعادة حساب المواقيت...";
    if (typeof detectLocationAndLoadTimes === "function") detectLocationAndLoadTimes();
    else renderStatus({ fallback: true });
  });
}


// =====================================================
// إعدادات إضافية
// =====================================================

function setupExtraSettings() {

  setupCalculationMethod();
  setupAsrMadhab();
  setupTimeFormat();
  setupPrayerTrackingToggle();
  setupHijriAdjustment();
  setupManualPrayerSettings();
  setupDataManagement();

}

function setupTimeFormat() {
  const select = document.getElementById("timeFormatSelect");
  if (!select) return;
  const saved = localStorage.getItem("anyas_time_format");
  if (saved === "12" || saved === "24") select.value = saved;
  select.addEventListener("change", () => {
    localStorage.setItem("anyas_time_format", select.value);
    window.location.reload();
  });
}

function setupAsrMadhab() {
  const select = document.getElementById("asrMadhabSelect");
  if (!select) return;
  const saved = localStorage.getItem("anyas_asr_madhab");
  if (saved === "hanafi" || saved === "shafi") select.value = saved;
  select.addEventListener("change", () => {
    localStorage.setItem("anyas_asr_madhab", select.value);
    window.location.reload();
  });
}

function setupDataManagement() {
  const exportButton = document.getElementById("exportDataButton");
  const importButton = document.getElementById("importDataButton");
  const importInput = document.getElementById("importDataInput");
  const deleteButton = document.getElementById("deleteDataButton");
  const status = document.getElementById("dataManagementStatus");
  if (!exportButton || !importButton || !importInput || !deleteButton) return;

  const setStatus = message => {
    if (status) status.textContent = window.anyasTranslate ? window.anyasTranslate(message) : message;
  };
  const collectData = () => {
    const data = {};
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith("anyas_")) data[key] = localStorage.getItem(key);
    }
    return data;
  };
  const makeFileName = () => {
    const date = new Date().toISOString().slice(0, 10);
    return `anyas-backup-${date}.json`;
  };

  exportButton.addEventListener("click", () => {
    try {
      const payload = {
        schema: 1,
        app: "anyas",
        appVersion: window.ANIAS_APP_VERSION || "1.1.5",
        exportedAt: new Date().toISOString(),
        data: collectData()
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = makeFileName();
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("تم تصدير نسخة بياناتك.");
    } catch (error) {
      console.error("تعذر تصدير بيانات أنياس:", error);
      setStatus("تعذر تصدير البيانات على هذا الجهاز.");
    }
  });

  importButton.addEventListener("click", () => importInput.click());
  importInput.addEventListener("change", async () => {
    const file = importInput.files?.[0];
    importInput.value = "";
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const importedData = payload?.data;
      if (payload?.schema !== 1 || payload?.app !== "anyas" || !importedData || typeof importedData !== "object" || Array.isArray(importedData)) {
        throw new Error("invalid backup");
      }
      const entries = Object.entries(importedData).filter(([key, value]) => key.startsWith("anyas_") && typeof value === "string");
      if (!entries.length) throw new Error("empty backup");
      const importConfirmation = "سيستبدل الاستيراد بيانات أنياس الحالية على هذا الجهاز. هل تريد المتابعة؟";
      if (!window.confirm(window.anyasTranslate ? window.anyasTranslate(importConfirmation) : importConfirmation)) return;
      Object.keys(localStorage).filter(key => key.startsWith("anyas_")).forEach(key => localStorage.removeItem(key));
      entries.forEach(([key, value]) => localStorage.setItem(key, value));
      setStatus("تم استيراد بياناتك. سيُعاد تشغيل أنياس الآن.");
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      console.error("تعذر استيراد نسخة أنياس:", error);
      setStatus("الملف غير صالح أو لا يحتوي على نسخة أنياس.");
    }
  });

  deleteButton.addEventListener("click", () => {
    const deleteConfirmation = "سيحذف هذا جميع إعدادات أنياس ومفضلاتك وتقدمك من هذا الجهاز. لا يمكن التراجع عن ذلك. هل أنت متأكد؟";
    if (!window.confirm(window.anyasTranslate ? window.anyasTranslate(deleteConfirmation) : deleteConfirmation)) return;
    Object.keys(localStorage).filter(key => key.startsWith("anyas_")).forEach(key => localStorage.removeItem(key));
    setStatus("تم حذف بيانات أنياس من هذا الجهاز. سيُعاد تشغيل التطبيق.");
    window.setTimeout(() => window.location.reload(), 700);
  });
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
