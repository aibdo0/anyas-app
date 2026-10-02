// =====================================================
// مَآبُ الأوَّاب
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

  const muezzinVolumeControls = [
    { inputId: "normalMuezzinVolume", valueId: "normalMuezzinVolumeValue", key: "anyas_normalMuezzinVolume" },
    { inputId: "fajrMuezzinVolume", valueId: "fajrMuezzinVolumeValue", key: "anyas_fajrMuezzinVolume" }
  ];

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

  muezzinVolumeControls.forEach(control => {
    const input = document.getElementById(control.inputId);
    const value = document.getElementById(control.valueId);
    const savedValue = localStorage.getItem(control.key);
    const saved = Math.max(0, Math.min(100, savedValue === null ? 100 : Number(savedValue) || 0));
    if (input) input.value = String(saved);
    if (value) value.textContent = `${saved}%`;
    input?.addEventListener("input", () => {
      const next = Math.max(0, Math.min(100, Number(input.value) || 0));
      if (value) value.textContent = `${next}%`;
      localStorage.setItem(control.key, String(next));
      applyAudioVolume(Number(volume?.value) || 100);
    });
  });

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

  setupAudioLibrary();

  function applyAudioVolume(value) {

    const normalized =
      value / 100;

    document.querySelectorAll("audio").forEach(audioElement => {
      audioElement.volume = normalized;
    });
    const normalVolume = Number(localStorage.getItem("anyas_normalMuezzinVolume"));
    const fajrVolume = Number(localStorage.getItem("anyas_fajrMuezzinVolume"));
    if (adhan) adhan.volume = normalized * (Number.isFinite(normalVolume) ? normalVolume / 100 : 1);
    if (fajr) fajr.volume = normalized * (Number.isFinite(fajrVolume) ? fajrVolume / 100 : 1);

  }

}


// =====================================================
// رفع الأصوات المخصصة — حفظ ومعاينة محلية
// =====================================================

const DEFAULT_MUEZZIN_SOURCES = {
  adhanAudio: "audio/adhan.mp3?v=20261002-1",
  fajrAudio: "audio/fajr.mp3"
};

const MAX_MUEZZIN_FILE_SIZE = 15 * 1024 * 1024;

function restoreDefaultMuezzinAudio(audioId) {
  const audio = document.getElementById(audioId);
  const source = DEFAULT_MUEZZIN_SOURCES[audioId];
  if (!audio || !source) return;
  audio.src = source;
  audio.load();
}

function setupAudioLibrary() {
  document.querySelectorAll("[data-audio-upload]").forEach(input => {
    const audioId = input.dataset.audioUpload;
    const nameId = input.dataset.audioName;
    const customRadioId = input.dataset.muezzinRadio || "";
    const selectedId = audioId === "adhanAudio"
      ? "normalMuezzinSelected"
      : audioId === "fajrAudio"
        ? "fajrMuezzinSelected"
        : "";
    const audio = document.getElementById(audioId);
    const name = document.getElementById(nameId);
    const selected = selectedId ? document.getElementById(selectedId) : null;
    const status = document.getElementById(`${audioId}Status`);
    const deleteButton = document.querySelector(`[data-audio-delete="${audioId}"]`);
    const applyButton = document.querySelector(`[data-audio-apply="${audioId}"]`);
    const customRadio = customRadioId ? document.getElementById(customRadioId) : null;
    if (!audio) return;

    const savedSource = localStorage.getItem(`anyas_audio_${audioId}`);
    const savedName = localStorage.getItem(`anyas_audio_name_${audioId}`);
    if (savedSource) {
      audio.src = savedSource;
      audio.load();
    }
    if (savedName && name) name.textContent = savedName;
    if (savedName && selected) selected.textContent = savedName;
    if (savedName && customRadio) {
      customRadio.checked = true;
      if (input.dataset.muezzinName) localStorage.setItem(`anyas_${input.dataset.muezzinName}`, "custom");
    }
    if (savedName && deleteButton) deleteButton.hidden = false;
    if (savedName && applyButton) applyButton.hidden = true;

    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("audio/")) {
        if (status) status.textContent = "الملف غير صالح — اختر ملفًا صوتيًا فقط";
        input.value = "";
        return;
      }
      if (file.size > MAX_MUEZZIN_FILE_SIZE) {
        if (status) status.textContent = "الملف كبير جدًا — الحد الأقصى 15 ميجابايت";
        input.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const source = String(reader.result || "");
        try {
          localStorage.setItem(`anyas_audio_${audioId}`, source);
          localStorage.setItem(`anyas_audio_name_${audioId}`, file.name);
        } catch (error) {
          console.warn("تعذر حفظ الملف الصوتي محليًا:", error);
        }
        audio.src = source;
        audio.load();
        if (name) name.textContent = file.name;
        if (selected) selected.textContent = file.name;
        if (status) status.textContent = "تم حفظ الصوت — يمكنك تغييره أو حذفه";
        if (deleteButton) deleteButton.hidden = false;
        if (applyButton) applyButton.hidden = false;
      };
      reader.readAsDataURL(file);
    });

    deleteButton?.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      localStorage.removeItem(`anyas_audio_${audioId}`);
      localStorage.removeItem(`anyas_audio_name_${audioId}`);
      restoreDefaultMuezzinAudio(audioId);
      if (name) name.textContent = "لم يتم اختيار ملف";
      if (selected) selected.textContent = audioId === "fajrAudio" ? "مشاري العفاسي" : "مشاري العفاسي";
      if (status) status.textContent = "تم حذف الصوت والعودة إلى مشاري العفاسي";
      if (deleteButton) deleteButton.hidden = true;
      if (applyButton) applyButton.hidden = true;
      if (customRadio) customRadio.checked = false;
      const defaultRadio = document.querySelector(`input[name="${input.dataset.muezzinName}"][value="default"]`);
      if (defaultRadio) {
        defaultRadio.checked = true;
        defaultRadio.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    applyButton?.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      if (!customRadio) return;
      customRadio.checked = true;
      customRadio.dispatchEvent(new Event("change", { bubbles: true }));
      if (applyButton) applyButton.hidden = true;
      if (status) status.textContent = "تم اعتماد الصوت المخصص";
    });
  });

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

  const hasSavedChoice = Array.from(radios).some(radio => radio.value === saved);
  if (saved && hasSavedChoice) {
    radios.forEach(radio => {
      radio.checked = radio.value === saved;
    });
  } else {
    const defaultRadio = options.querySelector(`input[name="${radioName}"][value="default"]`);
    if (defaultRadio) defaultRadio.checked = true;
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

      const audioId = radio.dataset.audioId;
      if (audioId && radio.dataset.audioSource) {
        const audio = document.getElementById(audioId);
        if (audio) {
          audio.src = radio.dataset.audioSource;
          audio.load();
        }
      } else if (audioId && radio.value === "default") {
        restoreDefaultMuezzinAudio(audioId);
      } else if (audioId && radio.value === "custom") {
        const savedSource = localStorage.getItem(`anyas_audio_${audioId}`);
        const audio = document.getElementById(audioId);
        if (savedSource && audio) {
          audio.src = savedSource;
          audio.load();
          document.querySelector(`[data-audio-apply="${audioId}"]`)?.setAttribute("hidden", "hidden");
        } else {
          const status = document.getElementById(`${audioId}Status`);
          const defaultRadio = options.querySelector(`input[name="${radioName}"][value="default"]`);
          if (status) status.textContent = "ارفع صوتًا مخصصًا أولًا لاستخدام هذا الخيار";
          if (defaultRadio) {
            defaultRadio.checked = true;
            localStorage.setItem(storageKey, "default");
            restoreDefaultMuezzinAudio(audioId);
          }
        }
      }

      updateSelectedName();

    });

  });

  const initialChecked = options.querySelector(`input[name="${radioName}"]:checked`);
  initialChecked?.dispatchEvent(new Event("change", { bubbles: true }));

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

    const name = label?.querySelector(".muezzin-name");
    const customAudioId = checked.dataset.audioId;
    const savedCustomName = customAudioId
      ? localStorage.getItem(`anyas_audio_name_${customAudioId}`)
      : "";

    if (savedCustomName && checked.value === "custom") {
      selected.textContent = savedCustomName;
    } else if (name) {
      selected.textContent = name.textContent;
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

  const root = document.documentElement;
  const themeChoices = document.querySelectorAll('input[name="themeMode"]');
  const themeDescription = document.getElementById("themeModeDescription");
  const themeColorMeta = document.getElementById("themeColorMeta");
  const timeBackgroundToggle = document.getElementById("timeBackgroundToggle");
  const timeBackgroundDescription = document.getElementById("timeBackgroundDescription");

  const languageControls =
    document.querySelectorAll("#languageSelect");

  let initialMode = "light";
  try {
    const savedMode = localStorage.getItem("anyas_themeMode");
    const legacyMode = localStorage.getItem("anyas_darkMode");
    initialMode = ["system", "light", "dark"].includes(savedMode)
      ? savedMode
      : legacyMode === "false"
        ? "light"
        : legacyMode === "true"
          ? "dark"
          : "light";
  } catch (error) {
    initialMode = "light";
  }

  function applyTheme(mode, persist = true) {
    const safeMode = ["system", "light", "dark"].includes(mode) ? mode : "dark";
    const systemDark = Boolean(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const isDark = safeMode === "dark" || (safeMode === "system" && systemDark);

    root.dataset.themeMode = safeMode;
    root.dataset.theme = isDark ? "dark" : "light";
    root.style.colorScheme = isDark ? "dark" : "light";
    document.body.classList.toggle("dark-mode", isDark);

    const themeToggleIcon = document.getElementById("themeToggleIcon");
    if (themeToggleIcon) themeToggleIcon.textContent = isDark ? "☀" : "☾";

    if (themeColorMeta) {
      themeColorMeta.setAttribute("content", isDark ? "#111216" : "#fbfaf7");
    }

    themeChoices.forEach(choice => {
      choice.checked = choice.value === safeMode;
    });

    if (themeDescription) {
      themeDescription.textContent = safeMode === "system"
        ? "يتبع إعداد المظهر في جهازك"
        : safeMode === "light"
          ? "المظهر الفاتح مفعّل"
          : "المظهر الداكن مفعّل";
    }

    if (persist) {
      try {
        localStorage.setItem("anyas_themeMode", safeMode);
        localStorage.removeItem("anyas_darkMode");
      } catch (error) {
        console.warn("تعذر حفظ اختيار المظهر:", error);
      }
    }
  }

  applyTheme(initialMode, false);

  themeChoices.forEach(choice => {
    choice.addEventListener("change", () => {
      if (choice.checked) applyTheme(choice.value);
    });
  });

  if (window.matchMedia) {
    const systemPreference = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = () => {
      if (root.dataset.themeMode === "system") applyTheme("system", false);
    };
    if (systemPreference.addEventListener) {
      systemPreference.addEventListener("change", updateSystemTheme);
    } else if (systemPreference.addListener) {
      systemPreference.addListener(updateSystemTheme);
    }
  }

  let timeBackgroundEnabled = true;
  try {
    const savedTimeBackground = localStorage.getItem("anyas_autoBackground");
    if (savedTimeBackground === "false") timeBackgroundEnabled = false;
  } catch (error) { /* time-based backgrounds default to on */ }

  const updateTimeBackground = () => {
    const hour = new Date().getHours();
    const scene = hour >= 6 && hour < 18 ? "morning" : "night";
    root.dataset.timeScene = scene;
    root.dataset.autoBackground = timeBackgroundEnabled ? "true" : "false";
    const sceneNames = { morning: "الصباح", night: "الليل" };
    if (timeBackgroundDescription) {
      timeBackgroundDescription.textContent = timeBackgroundEnabled
        ? `الخلفية ${sceneNames[scene]} مفعّلة — تتبدّل تلقائيًا حسب ساعة جهازك`
        : "خلفيات العدادات متوقفة";
    }
    if (timeBackgroundToggle) timeBackgroundToggle.checked = timeBackgroundEnabled;
  };

  timeBackgroundToggle?.addEventListener("change", () => {
    timeBackgroundEnabled = timeBackgroundToggle.checked;
    try { localStorage.setItem("anyas_autoBackground", String(timeBackgroundEnabled)); } catch (error) { /* preference is optional */ }
    updateTimeBackground();
  });
  updateTimeBackground();
  window.setInterval(updateTimeBackground, 60 * 1000);

  let savedLanguage = "ar";
  try {
    savedLanguage = localStorage.getItem("anyas_language") === "en" ? "en" : "ar";
  } catch (error) { /* use Arabic if storage is unavailable */ }
  languageControls.forEach(control => {
    control.value = savedLanguage;
    control.addEventListener("change", () => {
      const nextLanguage = control.value === "en" ? "en" : "ar";
      if (typeof window.setAppLanguage === "function") {
        window.setAppLanguage(nextLanguage);
      }
      languageControls.forEach(peer => { peer.value = nextLanguage; });
    });
  });

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
    "notificationSound",
    "notifyWardAwakening",
    "notifyWardMorning",
    "notifyWardGeneral",
    "notifyWardEvening",
    "notifyWardSleep",
    "notifyWardSahar",
    "notifyFridayKahf",
    "notifyFridayPrayer",
    "notifyFridayHour",
    "notifyFridaySalawat"

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
        syncAndroidNotificationSettings();

        if (
          element.checked &&
          !window.AnyasAndroid &&
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
  syncAndroidNotificationSettings();
}

function syncAndroidNotificationSettings() {
  if (!window.AnyasAndroid || !window.AnyasAndroid.syncSettings) return;
  const ids = ["notifyPrayerSoon", "notifyWardAwakening", "notifyWardMorning", "notifyWardGeneral", "notifyWardEvening", "notifyWardSleep", "notifyWardSahar"];
  const enabled = {};
  ids.forEach(id => {
    const element = document.getElementById(id);
    enabled[id] = element ? element.checked : localStorage.getItem(`anyas_${id}`) === "true";
  });
  const prayers = {};
  ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"].forEach(key => {
    const raw = window.todayTimings && window.todayTimings[key];
    const match = raw && String(raw).match(/(\d{1,2}:\d{2})/);
    if (match) prayers[key] = match[1].padStart(5, "0");
  });
  window.AnyasAndroid.syncSettings(JSON.stringify({ enabled, prayers, sound: localStorage.getItem("anyas_notificationSound") === "true" }));
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

const hijriFormatterCache = new Map();

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
      let formatter = hijriFormatterCache.get(locale);
      if (!formatter) {
        formatter = new Intl.DateTimeFormat(locale, {
          day: "numeric",
          month: "numeric",
          year: "numeric",
          numberingSystem: "latn"
        });
        hijriFormatterCache.set(locale, formatter);
      }

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


function getDisplayedHijriParts(date = new Date()) {
  const adjustment = Number.parseInt(
    localStorage.getItem("anyas_hijri_adjustment") || "0",
    10
  );
  const adjustedDate = new Date(date);
  if (Number.isInteger(adjustment)) adjustedDate.setDate(adjustedDate.getDate() + adjustment);
  return getHijriParts(adjustedDate);
}


function updateHijriDate() {

  const element =
    document.getElementById(
      "hijriDate"
    );

  if (!element) return;

  const hijri =
    getDisplayedHijriParts();

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
