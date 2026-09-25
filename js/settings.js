// =====================================================
// أنياس
// الإعدادات
// الأذان + الوضع الليلي + اللغة
// الإشعارات + الاهتزاز + العبادات والمواسم
// =====================================================


// =====================================================
// مشغل الأذان الرئيسي
// =====================================================

function setupAdhan() {

  const button =
    document.getElementById("adhanButton");

  const audio =
    document.getElementById("adhanAudio");

  if (!button || !audio) return;

  button.addEventListener("click", () => {

    if (audio.paused) {

      audio.currentTime = 0;

      audio.play()
        .then(() => {

          button.textContent =
            "إيقاف الأذان";

        })
        .catch(error => {

          console.error(
            "تعذر تشغيل الأذان:",
            error
          );

        });

    } else {

      audio.pause();

      button.textContent =
        "تشغيل الأذان";

    }

  });

  audio.addEventListener("ended", () => {

    button.textContent =
      "تشغيل الأذان";

  });

}


// =====================================================
// إعدادات الأذان
// =====================================================

function setupAdhanSettings() {

  const auto =
    document.getElementById("autoAdhan");

  const volume =
    document.getElementById("adhanVolume");

  const volumeValue =
    document.getElementById("volumeValue");

  const testButton =
    document.getElementById("testAdhanButton");

  const adhan =
    document.getElementById("adhanAudio");

  const fajr =
    document.getElementById("fajrAudio");

  const savedAuto =
    localStorage.getItem("anyas_autoAdhan");

  const savedVolume =
    localStorage.getItem("anyas_adhanVolume");

  if (savedAuto !== null && auto) {

    auto.checked =
      savedAuto === "true";

  }

  const initialVolume =
    savedVolume !== null
      ? Number(savedVolume)
      : 100;

  if (volume) {

    volume.value =
      initialVolume;

  }

  if (volumeValue) {

    volumeValue.textContent =
      `${initialVolume}%`;

  }

  applyAudioVolume(initialVolume);

  if (auto) {

    auto.addEventListener("change", () => {

      localStorage.setItem(
        "anyas_autoAdhan",
        auto.checked
      );

    });

  }

  if (volume) {

    volume.addEventListener("input", () => {

      const value =
        Number(volume.value);

      if (volumeValue) {

        volumeValue.textContent =
          `${value}%`;

      }

      applyAudioVolume(value);

      localStorage.setItem(
        "anyas_adhanVolume",
        value
      );

    });

  }

  if (testButton && adhan) {

    testButton.addEventListener("click", () => {

      adhan.currentTime = 0;

      adhan.play()
        .catch(error => {

          console.error(
            "تعذر تشغيل الأذان:",
            error
          );

        });

    });

  }

  function applyAudioVolume(value) {

    const normalized =
      value / 100;

    if (adhan) {
      adhan.volume = normalized;
    }

    if (fajr) {
      fajr.volume = normalized;
    }

  }

}


// =====================================================
// اختيار المؤذن
// =====================================================

function setupMuezzinSettings() {

  setupMuezzinPicker(
    "normalMuezzinRow",
    "normalMuezzinOptions",
    "normalMuezzinSelected",
    "normalMuezzin",
    "anyas_normalMuezzin"
  );

  setupMuezzinPicker(
    "fajrMuezzinRow",
    "fajrMuezzinOptions",
    "fajrMuezzinSelected",
    "fajrMuezzin",
    "anyas_fajrMuezzin"
  );

}


function setupMuezzinPicker(
  rowId,
  optionsId,
  selectedId,
  radioName,
  storageKey
) {

  const row =
    document.getElementById(rowId);

  const options =
    document.getElementById(optionsId);

  const selected =
    document.getElementById(selectedId);

  if (!row || !options) return;

  const saved =
    localStorage.getItem(storageKey);

  const radios =
    options.querySelectorAll(
      `input[name="${radioName}"]`
    );

  if (saved) {

    radios.forEach(radio => {

      radio.checked =
        radio.value === saved;

    });

  }

  updateSelectedName();

  row.addEventListener("click", event => {

    if (
      event.target.closest(".preview-button")
    ) {
      return;
    }

    options.classList.toggle("open");

    row.classList.toggle("open");

  });

  radios.forEach(radio => {

    radio.addEventListener("change", () => {

      if (!radio.checked) return;

      localStorage.setItem(
        storageKey,
        radio.value
      );

      updateSelectedName();

    });

  });

  const previewButtons =
    options.querySelectorAll(
      ".preview-button"
    );

  previewButtons.forEach(button => {

    button.addEventListener("click", event => {

      event.stopPropagation();

      const audioId =
        button.dataset.audio;

      const audio =
        document.getElementById(audioId);

      if (!audio) return;

      stopAllAudioExcept(audio);

      if (audio.paused) {

        audio.currentTime = 0;

        audio.play()
          .then(() => {

            button.textContent =
              "إيقاف";

          })
          .catch(error => {

            console.error(
              "تعذر تشغيل المعاينة:",
              error
            );

          });

      } else {

        audio.pause();

        button.textContent =
          "تشغيل";

      }

      audio.onended = () => {

        button.textContent =
          "تشغيل";

      };

    });

  });


  function updateSelectedName() {

    const checked =
      options.querySelector(
        `input[name="${radioName}"]:checked`
      );

    if (!checked || !selected) return;

    const label =
      checked.closest(".muezzin-select");

    const name =
      label?.querySelector(".muezzin-name");

    if (name) {

      selected.textContent =
        name.textContent;

    }

  }

}


// =====================================================
// إيقاف الأصوات الأخرى
// =====================================================

function stopAllAudioExcept(currentAudio) {

  document
    .querySelectorAll("audio")
    .forEach(audio => {

      if (audio !== currentAudio) {

        audio.pause();
        audio.currentTime = 0;

      }

    });

}


// =====================================================
// الأذان التلقائي
// =====================================================

function checkAutoAdhan() {

  const auto =
    document.getElementById("autoAdhan");

  if (!auto || !auto.checked) return;

  if (!window.todayTimings) return;

  const prayers = [

    {
      key: "Fajr",
      time: window.todayTimings.Fajr
    },

    {
      key: "Dhuhr",
      time: window.todayTimings.Dhuhr
    },

    {
      key: "Asr",
      time: window.todayTimings.Asr
    },

    {
      key: "Maghrib",
      time: window.todayTimings.Maghrib
    },

    {
      key: "Isha",
      time: window.todayTimings.Isha
    }

  ];

  const now =
    new Date();

  const currentHM =
    `${String(now.getHours()).padStart(2, "0")}:` +
    `${String(now.getMinutes()).padStart(2, "0")}`;

  const todayKey =
    now.toDateString();

  for (const prayer of prayers) {

    if (
      prayer.time === currentHM &&
      window.lastAdhanFired !==
      `${todayKey}-${prayer.key}`
    ) {

      window.lastAdhanFired =
        `${todayKey}-${prayer.key}`;

      playAdhanFor(prayer.key);

      break;

    }

  }

}


function playAdhanFor(prayerKey) {

  const fajr =
    document.getElementById("fajrAudio");

  const adhan =
    document.getElementById("adhanAudio");

  const audio =
    prayerKey === "Fajr" && fajr
      ? fajr
      : adhan;

  if (!audio) return;

  stopAllAudioExcept(audio);

  audio.currentTime = 0;

  audio.play()
    .catch(error => {

      console.error(
        "تعذر تشغيل الأذان التلقائي:",
        error
      );

    });

}


// =====================================================
// الوضع الليلي واللغة
// =====================================================

function setupThemeAndLanguage() {

  const darkToggle =
    document.getElementById("darkModeToggle");

  const language =
    document.getElementById("languageSelect");

  const savedDark =
    localStorage.getItem("anyas_darkMode");

  if (savedDark === "true") {

    document.body.classList.add(
      "dark-mode"
    );

    if (darkToggle) {
      darkToggle.checked = true;
    }

  }

  if (darkToggle) {

    darkToggle.addEventListener("change", () => {

      document.body.classList.toggle(
        "dark-mode",
        darkToggle.checked
      );

      localStorage.setItem(
        "anyas_darkMode",
        darkToggle.checked
      );

    });

  }

  const savedLanguage =
    localStorage.getItem("anyas_language");

  if (savedLanguage && language) {

    language.value =
      savedLanguage;

  }

  if (language) {

    language.addEventListener("change", () => {

      localStorage.setItem(
        "anyas_language",
        language.value
      );

      if (language.value === "en") {

        alert(
          "النسخة الإنجليزية سيتم تفعيلها بالكامل في تحديث لاحق."
        );

        language.value =
          "ar";

        localStorage.setItem(
          "anyas_language",
          "ar"
        );

      }

    });

  }

}


// =====================================================
// الإشعارات
// =====================================================

function setupNotifications() {

  const ids = [

    "notifyPrayerSoon",
    "notifySunrise",
    "notifyFirstThird",
    "notifySecondThird",
    "notifyLastThird",
    "notifyAyatKursi",
    "notificationSound"

  ];

  ids.forEach(id => {

    const element =
      document.getElementById(id);

    if (!element) return;

    const key =
      `anyas_${id}`;

    const saved =
      localStorage.getItem(key);

    if (saved !== null) {

      element.checked =
        saved === "true";

    }

    element.addEventListener(
      "change",
      async () => {

        localStorage.setItem(
          key,
          element.checked
        );

        if (
          element.checked &&
          "Notification" in window
        ) {

          try {

            await Notification.requestPermission();

          } catch (error) {

            console.error(
              "تعذر طلب إذن الإشعارات:",
              error
            );

          }

        }

      }
    );

  });

}


// =====================================================
// الاهتزاز
// =====================================================

function setupVibration() {

  const toggle =
    document.getElementById(
      "vibrationToggle"
    );

  if (!toggle) return;

  const saved =
    localStorage.getItem(
      "anyas_vibration"
    );

  if (saved !== null) {

    toggle.checked =
      saved === "true";

  }

  toggle.addEventListener(
    "change",
    () => {

      localStorage.setItem(
        "anyas_vibration",
        toggle.checked
      );

      if (
        toggle.checked &&
        navigator.vibrate
      ) {

        navigator.vibrate(40);

      }

    }
  );

}


// =====================================================
// العبادات والمواسم
// =====================================================

function setupWorshipSettings() {

  const ids = [

    "reminderMondayThursday",
    "reminderWhiteDays",
    "reminderAshura",
    "reminderArafah",
    "reminderDhulHijjah",
    "reminderEidTakbeer"

  ];

  ids.forEach(id => {

    const element =
      document.getElementById(id);

    if (!element) return;

    const key =
      `anyas_${id}`;

    const saved =
      localStorage.getItem(key);

    if (saved !== null) {

      element.checked =
        saved === "true";

    }

    element.addEventListener(
      "change",
      async () => {

        localStorage.setItem(
          key,
          element.checked
        );

        if (
          element.checked &&
          "Notification" in window
        ) {

          try {

            if (
              Notification.permission ===
              "default"
            ) {

              await Notification.requestPermission();

            }

          } catch (error) {

            console.error(
              "تعذر طلب إذن الإشعارات:",
              error
            );

          }

        }

      }
    );

  });

  updateHijriDate();

  updateWorshipCountdowns();

}


// =====================================================
// التاريخ الهجري
// =====================================================

function getHijriParts(date = new Date()) {

  const months = [
    "",
    "المحرّم",
    "صفر",
    "ربيع الأول",
    "ربيع الآخر",
    "جمادى الأولى",
    "جمادى الآخرة",
    "رجب",
    "شعبان",
    "رمضان",
    "شوّال",
    "ذو القعدة",
    "ذو الحجة"
  ];

  const locales = [
    "ar-SA-u-ca-islamic-umalqura-nu-latn",
    "en-u-ca-islamic-umalqura-nu-latn",
    "en-u-ca-islamic-civil-nu-latn",
    "en-u-ca-islamic-nu-latn"
  ];

  const parseLocalizedNumber = value => {
    const normalized = String(value)
      .replace(/[٠-٩]/g, digit => String.fromCharCode(digit.charCodeAt(0) - 0x0660 + 48))
      .replace(/[۰-۹]/g, digit => String.fromCharCode(digit.charCodeAt(0) - 0x06f0 + 48));
    const number = Number(normalized);
    return Number.isFinite(number) ? number : null;
  };

  for (const locale of locales) {
    try {
      const formatter = new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "numeric",
        year: "numeric",
        numberingSystem: "latn"
      });

      // Some browsers silently fall back to Gregorian when a calendar is unsupported.
      if (!formatter.resolvedOptions().calendar.startsWith("islamic")) {
        continue;
      }

      const result = {};

      formatter.formatToParts(date).forEach(part => {
        if (["day", "month", "year"].includes(part.type)) {
          result[part.type] = parseLocalizedNumber(part.value);
        }
      });

      if (
        Number.isInteger(result.day) && result.day >= 1 && result.day <= 30 &&
        Number.isInteger(result.month) && result.month >= 1 && result.month <= 12 &&
        Number.isInteger(result.year) && result.year > 1000
      ) {
        return {
          day: result.day,
          month: result.month,
          monthName: months[result.month],
          year: result.year
        };
      }
    } catch (error) {
      // Try the next supported Islamic calendar/locale.
    }
  }

  console.error("تعذر حساب التاريخ الهجري: لا يتوفر تقويم إسلامي مدعوم في هذا المتصفح.");
  return null;
}


function updateHijriDate() {

  const element =
    document.getElementById(
      "hijriDate"
    );

  if (!element) return;

  const hijri =
    getHijriParts();

  if (!hijri) {

    element.textContent =
      "تعذر حساب التاريخ الهجري";

    return;

  }

  const months = [

    "",
    "المحرّم",
    "صفر",
    "ربيع الأول",
    "ربيع الآخر",
    "جمادى الأولى",
    "جمادى الآخرة",
    "رجب",
    "شعبان",
    "رمضان",
    "شوّال",
    "ذو القعدة",
    "ذو الحجة"

  ];

  element.textContent =
    `${hijri.day} ` +
    `${months[hijri.month] || ""} ` +
    `${hijri.year} هـ`;

}


// =====================================================
// حساب الأيام حتى تاريخ هجري
// =====================================================

function daysUntilHijri(
  targetMonth,
  targetDay
) {

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  for (
    let i = 0;
    i <= 400;
    i++
  ) {

    const date =
      new Date(today);

    date.setDate(
      today.getDate() + i
    );

    const hijri =
      getHijriParts(date);

    if (!hijri) continue;

    if (
      hijri.month === targetMonth &&
      hijri.day === targetDay
    ) {

      return i;

    }

  }

  return null;

}


// =====================================================
// عرض العد التنازلي
// =====================================================

function setWorshipCountdown(
  elementId,
  days
) {

  const element =
    document.getElementById(
      elementId
    );

  if (!element) return;

  if (days === null) {

    element.textContent =
      "غير متاح";

    return;

  }

  if (days === 0) {

    element.textContent =
      "اليوم";

    return;

  }

  element.textContent =
    `باقي ${days} يوم`;

}


// =====================================================
// تحديث عدادات المواسم
// =====================================================

function updateWorshipCountdowns() {

  // رمضان
  setWorshipCountdown(
    "ramadanCountdown",
    daysUntilHijri(9, 1)
  );

  // عيد الفطر
  setWorshipCountdown(
    "fitrCountdown",
    daysUntilHijri(10, 1)
  );

  // بداية الحج
  setWorshipCountdown(
    "hajjCountdown",
    daysUntilHijri(12, 8)
  );

  // عيد الأضحى
  setWorshipCountdown(
    "adhaCountdown",
    daysUntilHijri(12, 10)
  );

        }
