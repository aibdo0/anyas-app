// =====================================================
// أنياس
// مواقيت الصلاة + الأذان + الإعدادات + الأذكار
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

  detectLocationAndLoadTimes();

  setInterval(updateCountdown, 1000);

  setInterval(checkAutoAdhan, 1000 * 20);

});


// =====================================================
// التاريخ
// =====================================================

function updateDate() {

  const el = document.getElementById("todayDate");

  if (!el) return;

  const today = new Date();

  el.textContent = today.toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });

}


// =====================================================
// تحديد الموقع
// =====================================================

function detectLocationAndLoadTimes() {

  const fallbackLat = 30.0444;
  const fallbackLng = 31.2357;

  if (!navigator.geolocation) {

    const el = document.getElementById("locationName");

    if (el) {
      el.textContent =
        "القاهرة (المتصفح لا يدعم تحديد الموقع)";
    }

    loadPrayerTimes(fallbackLat, fallbackLng);

    return;
  }

  navigator.geolocation.getCurrentPosition(

    position => {

      const latitude =
        position.coords.latitude;

      const longitude =
        position.coords.longitude;

      loadPrayerTimes(latitude, longitude);

      fetchCityName(latitude, longitude);

    },

    () => {

      const el =
        document.getElementById("locationName");

      if (el) {
        el.textContent =
          "القاهرة (تعذر تحديد موقعك)";
      }

      loadPrayerTimes(
        fallbackLat,
        fallbackLng
      );

    },

    {
      timeout: 8000,
      maximumAge: 1000 * 60 * 30
    }

  );

}


// =====================================================
// اسم المدينة
// =====================================================

async function fetchCityName(latitude, longitude) {

  const el =
    document.getElementById("locationName");

  try {

    const url =
      `https://nominatim.openstreetmap.org/reverse` +
      `?format=json&lat=${latitude}&lon=${longitude}` +
      `&accept-language=ar`;

    const response = await fetch(url);

    const data = await response.json();

    const address = data.address || {};

    const city =
      address.city ||
      address.town ||
      address.village ||
      address.county ||
      "موقعك الحالي";

    const country =
      address.country || "";

    if (el) {

      el.textContent =
        `${city}${country ? "، " + country : ""}`;

    }

  } catch (error) {

    console.error(
      "تعذر جلب اسم المدينة:",
      error
    );

    if (el) {
      el.textContent = "موقعك الحالي";
    }

  }

}


// =====================================================
// مواقيت الصلاة
// =====================================================

async function loadPrayerTimes(latitude, longitude) {

  const today = new Date();

  const day =
    String(today.getDate()).padStart(2, "0");

  const month =
    String(today.getMonth() + 1).padStart(2, "0");

  const year =
    today.getFullYear();

  const url =
    `https://api.aladhan.com/v1/timings/` +
    `${day}-${month}-${year}` +
    `?latitude=${latitude}` +
    `&longitude=${longitude}` +
    `&method=5`;

  try {

    const response = await fetch(url);

    const data = await response.json();

    if (
      data.code !== 200 ||
      !data.data ||
      !data.data.timings
    ) {

      throw new Error(
        "فشل الحصول على المواقيت"
      );

    }

    const timings =
      data.data.timings;

    window.todayTimings =
      timings;

    window.lastKnownLocation = {
      latitude,
      longitude
    };

    setPrayerTime("fajrTime", timings.Fajr);
    setPrayerTime("sunriseTime", timings.Sunrise);
    setPrayerTime("dhuhrTime", timings.Dhuhr);
    setPrayerTime("asrTime", timings.Asr);
    setPrayerTime("maghribTime", timings.Maghrib);
    setPrayerTime("ishaTime", timings.Isha);

    updateNextPrayer(timings);

  } catch (error) {

    console.error(
      "حدث خطأ في جلب مواقيت الصلاة:",
      error
    );

  }

}


function setPrayerTime(id, time) {

  const element =
    document.getElementById(id);

  if (!element) return;

  element.textContent =
    convertTo12Hour(time);

}


function convertTo12Hour(time) {

  const [hour, minute] =
    time.split(":").map(Number);

  const period =
    hour >= 12 ? "م" : "ص";

  let h =
    hour % 12;

  if (h === 0) {
    h = 12;
  }

  return (
    `${String(h).padStart(2, "0")}:` +
    `${String(minute).padStart(2, "0")} ` +
    period
  );

}


// =====================================================
// الصلاة القادمة
// =====================================================

function updateNextPrayer(timings) {

  const prayers = [

    {
      name: "الفجر",
      key: "Fajr",
      time: timings.Fajr
    },

    {
      name: "الظهر",
      key: "Dhuhr",
      time: timings.Dhuhr
    },

    {
      name: "العصر",
      key: "Asr",
      time: timings.Asr
    },

    {
      name: "المغرب",
      key: "Maghrib",
      time: timings.Maghrib
    },

    {
      name: "العشاء",
      key: "Isha",
      time: timings.Isha
    }

  ];

  const now = new Date();

  let nextPrayer = null;

  for (const prayer of prayers) {

    const [hour, minute] =
      prayer.time.split(":").map(Number);

    const prayerDate = new Date();

    prayerDate.setHours(
      hour,
      minute,
      0,
      0
    );

    if (prayerDate > now) {

      nextPrayer = {
        ...prayer,
        date: prayerDate
      };

      break;
    }

  }

  if (!nextPrayer) {

    const tomorrow = new Date();

    tomorrow.setDate(
      tomorrow.getDate() + 1
    );

    const [hour, minute] =
      prayers[0].time.split(":").map(Number);

    tomorrow.setHours(
      hour,
      minute,
      0,
      0
    );

    nextPrayer = {
      ...prayers[0],
      date: tomorrow
    };

  }

  window.nextPrayerData =
    nextPrayer;

  const nameElement =
    document.getElementById(
      "nextPrayerName"
    );

  const timeElement =
    document.getElementById(
      "nextPrayerTime"
    );

  if (nameElement) {
    nameElement.textContent =
      nextPrayer.name;
  }

  if (timeElement) {
    timeElement.textContent =
      convertTo12Hour(
        nextPrayer.time
      );
  }

  updateCountdown();

}


// =====================================================
// العد التنازلي
// =====================================================

function updateCountdown() {

  const countdownElement =
    document.getElementById(
      "countdown"
    );

  if (!countdownElement) return;

  if (!window.nextPrayerData) return;

  const now = new Date();

  const difference =
    window.nextPrayerData.date - now;

  if (difference <= 0) {

    const location =
      window.lastKnownLocation;

    if (location) {

      loadPrayerTimes(
        location.latitude,
        location.longitude
      );

    } else {

      detectLocationAndLoadTimes();

    }

    return;
  }

  const hours =
    Math.floor(
      difference /
      (1000 * 60 * 60)
    );

  const minutes =
    Math.floor(
      (
        difference %
        (1000 * 60 * 60)
      ) /
      (1000 * 60)
    );

  const seconds =
    Math.floor(
      (
        difference %
        (1000 * 60)
      ) /
      1000
    );

  countdownElement.textContent =
    `متبقي ${formatNumber(hours)}:` +
    `${formatNumber(minutes)}:` +
    `${formatNumber(seconds)}`;

}


// =====================================================
// مشغل الأذان الرئيسي
// =====================================================

function setupAdhan() {

  const button =
    document.getElementById(
      "adhanButton"
    );

  const audio =
    document.getElementById(
      "adhanAudio"
    );

  if (!button || !audio) return;

  button.addEventListener(
    "click",
    () => {

      if (audio.paused) {

        audio.currentTime = 0;

        audio.play()
          .then(() => {

            button.textContent =
              "■ إيقاف الأذان";

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
          "▶ تشغيل الأذان";

      }

    }
  );

  audio.addEventListener(
    "ended",
    () => {

      button.textContent =
        "▶ تشغيل الأذان";

    }
  );

}


// =====================================================
// إعدادات الأذان
// =====================================================

function setupAdhanSettings() {

  const auto =
    document.getElementById(
      "autoAdhan"
    );

  const volume =
    document.getElementById(
      "adhanVolume"
    );

  const volumeValue =
    document.getElementById(
      "volumeValue"
    );

  const testButton =
    document.getElementById(
      "testAdhanButton"
    );

  const adhan =
    document.getElementById(
      "adhanAudio"
    );

  const fajr =
    document.getElementById(
      "fajrAudio"
    );

  const savedAuto =
    localStorage.getItem(
      "anyas_autoAdhan"
    );

  const savedVolume =
    localStorage.getItem(
      "anyas_adhanVolume"
    );

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

  applyAudioVolume(
    initialVolume
  );

  if (auto) {

    auto.addEventListener(
      "change",
      () => {

        localStorage.setItem(
          "anyas_autoAdhan",
          auto.checked
        );

      }
    );

  }

  if (volume) {

    volume.addEventListener(
      "input",
      () => {

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

      }
    );

  }

  if (testButton && adhan) {

    testButton.addEventListener(
      "click",
      () => {

        adhan.currentTime = 0;

        adhan.play()
          .catch(error => {

            console.error(
              "تعذر تشغيل الأذان:",
              error
            );

          });

      }
    );

  }

  function applyAudioVolume(value) {

    const normalized =
      value / 100;

    if (adhan) {
      adhan.volume =
        normalized;
    }

    if (fajr) {
      fajr.volume =
        normalized;
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
    localStorage.getItem(
      storageKey
    );

  const radios =
    options.querySelectorAll(
      `input[name="${radioName}"]`
    );

  if (saved) {

    radios.forEach(
      radio => {

        radio.checked =
          radio.value === saved;

      }
    );

  }

  updateSelectedName();

  row.addEventListener(
    "click",
    event => {

      if (
        event.target.closest(
          ".preview-button"
        )
      ) {
        return;
      }

      options.classList.toggle(
        "open"
      );

      row.classList.toggle(
        "open"
      );

    }
  );

  radios.forEach(
    radio => {

      radio.addEventListener(
        "change",
        () => {

          if (!radio.checked) return;

          localStorage.setItem(
            storageKey,
            radio.value
          );

          updateSelectedName();

        }
      );

    }
  );

  const previewButtons =
    options.querySelectorAll(
      ".preview-button"
    );

  previewButtons.forEach(
    button => {

      button.addEventListener(
        "click",
        event => {

          event.stopPropagation();

          const audioId =
            button.dataset.audio;

          const audio =
            document.getElementById(
              audioId
            );

          if (!audio) return;

          stopAllAudioExcept(audio);

          if (audio.paused) {

            audio.currentTime = 0;

            audio.play()
              .then(() => {

                button.textContent =
                  "■";

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
              "▶";

          }

          audio.onended = () => {

            button.textContent =
              "▶";

          };

        }
      );

    }
  );


  function updateSelectedName() {

    const checked =
      options.querySelector(
        `input[name="${radioName}"]:checked`
      );

    if (!checked || !selected) return;

    const label =
      checked.closest(
        ".muezzin-select"
      );

    const name =
      label?.querySelector(
        ".muezzin-name"
      );

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
    .forEach(
      audio => {

        if (audio !== currentAudio) {

          audio.pause();
          audio.currentTime = 0;

        }

      }
    );

}


// =====================================================
// الأذان التلقائي
// =====================================================

function checkAutoAdhan() {

  const auto =
    document.getElementById(
      "autoAdhan"
    );

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

      playAdhanFor(
        prayer.key
      );

      break;

    }

  }

}


function playAdhanFor(prayerKey) {

  const fajr =
    document.getElementById(
      "fajrAudio"
    );

  const adhan =
    document.getElementById(
      "adhanAudio"
    );

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
    document.getElementById(
      "darkModeToggle"
    );

  const language =
    document.getElementById(
      "languageSelect"
    );

  const savedDark =
    localStorage.getItem(
      "anyas_darkMode"
    );

  if (savedDark === "true") {

    document.body.classList.add(
      "dark-mode"
    );

    if (darkToggle) {
      darkToggle.checked = true;
    }

  }

  if (darkToggle) {

    darkToggle.addEventListener(
      "change",
      () => {

        document.body.classList.toggle(
          "dark-mode",
          darkToggle.checked
        );

        localStorage.setItem(
          "anyas_darkMode",
          darkToggle.checked
        );

      }
    );

  }

  const savedLanguage =
    localStorage.getItem(
      "anyas_language"
    );

  if (savedLanguage && language) {
    language.value =
      savedLanguage;
  }

  if (language) {

    language.addEventListener(
      "change",
      () => {

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

      }
    );

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

  ids.forEach(
    id => {

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

    }
  );

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
// التنقل
// =====================================================

function setupNavigation() {

  const navItems =
    document.querySelectorAll(
      ".nav-item"
    );

  navItems.forEach(
    item => {

      item.addEventListener(
        "click",
        () => {

          const targetPage =
            item.getAttribute(
              "data-page"
            );

          if (!targetPage) return;

          navItems.forEach(
            nav =>
              nav.classList.remove(
                "active"
              )
          );

          item.classList.add(
            "active"
          );

          goToPage(
            targetPage
          );

        }
      );

    }
  );

}


function goToPage(pageId) {

  document
    .querySelectorAll(".page")
    .forEach(
      page =>
        page.classList.remove(
          "active"
        )
    );

  const page =
    document.getElementById(
      `page-${pageId}`
    );

  if (page) {

    page.classList.add(
      "active"
    );

  }

}


// =====================================================
// الأذكار
// =====================================================

function setupAzkarTopics() {

  const grid =
    document.getElementById(
      "categoryGrid"
    );

  const backButton =
    document.getElementById(
      "azkarBackButton"
    );

  if (!grid) return;

  grid.innerHTML = "";

  const topics =
    Array.isArray(window.azkarTopics)
      ? window.azkarTopics
      : [];

  const countElement =
    document.getElementById(
      "azkarTopicsCount"
    );

  if (countElement) {

    countElement.textContent =
      `${topics.length} بابًا`;

  }

  if (topics.length === 0) {

    const errorBox =
      document.createElement(
        "div"
      );

    errorBox.className =
      "azkar-item";

    errorBox.innerHTML =
      `<div class="azkar-text">
      لم يتم تحميل أبواب الأذكار.
      تأكد من ملف azkar-topics.js.
      </div>`;

    grid.appendChild(
      errorBox
    );

    return;
  }

  topics.forEach(
    topic => {

      const card =
        document.createElement(
          "button"
        );

      card.type = "button";

      card.className =
        "category-card";

      const itemCount =
        Array.isArray(topic.items)
          ? topic.items.length
          : 0;

      card.innerHTML =

        `<div class="category-icon">
          ${topic.number}
        </div>` +

        `<div class="category-name">
          ${topic.title || "باب الأذكار"}
        </div>` +

        `<div class="category-count">
          ${
            itemCount > 0
              ? itemCount + " أذكار"
              : "باب"
          }
        </div>`;

      card.addEventListener(
        "click",
        () =>
          openAzkarTopic(
            topic.number
          )
      );

      grid.appendChild(
        card
      );

    }
  );

  if (backButton) {

    backButton.onclick = () => {

      goToPage("azkar");

      document
        .querySelectorAll(
          ".nav-item"
        )
        .forEach(
          nav =>
            nav.classList.remove(
              "active"
            )
        );

      const azkarNav =
        document.querySelector(
          '.nav-item[data-page="azkar"]'
        );

      if (azkarNav) {

        azkarNav.classList.add(
          "active"
        );

      }

    };

  }

}


function openAzkarTopic(number) {

  const topics =
    Array.isArray(window.azkarTopics)
      ? window.azkarTopics
      : [];

  const topic =
    topics.find(
      item =>
        item.number === number
    );

  if (!topic) return;

  const title =
    document.getElementById(
      "categoryDetailTitle"
    );

  if (title) {

    title.textContent =
      `${topic.number}. ${topic.title || "باب الأذكار"}`;

  }

  window.currentAzkarTopic =
    number;

  goToPage(
    "azkar-detail"
  );

  renderAzkarTopic(
    number
  );

}


// =====================================================
// حفظ التقدم
// =====================================================

function getTopicStorageKey(number) {

  const todayKey =
    new Date().toDateString();

  return (
    `anyas_topic_${number}_${todayKey}`
  );

}


function loadTopicProgress(number) {

  const raw =
    localStorage.getItem(
      getTopicStorageKey(number)
    );

  if (!raw) return {};

  try {

    return JSON.parse(raw);

  } catch {

    return {};

  }

}


function saveTopicProgress(
  number,
  progress
) {

  localStorage.setItem(
    getTopicStorageKey(number),
    JSON.stringify(progress)
  );

}


// =====================================================
// عرض الأذكار
// =====================================================

function renderAzkarTopic(number) {

  const topics =
    Array.isArray(window.azkarTopics)
      ? window.azkarTopics
      : [];

  const topic =
    topics.find(
      item =>
        item.number === number
    );

  const container =
    document.getElementById(
      "azkarList"
    );

  if (!container || !topic) return;

  container.innerHTML = "";

  const items =
    Array.isArray(topic.items)
      ? topic.items
      : [];

  if (items.length === 0) {

    const empty =
      document.createElement(
        "div"
      );

    empty.className =
      "azkar-item";

    empty.innerHTML =
      `<div class="azkar-text">
      سيتم إضافة أذكار هذا الباب قريبًا بإذن الله.
      </div>`;

    container.appendChild(
      empty
    );

    renderTopicNavigation(
      number
    );

    return;
  }

  const progress =
    loadTopicProgress(number);

  items.forEach(
    (zikr, index) => {

      const item =
        document.createElement(
          "div"
        );

      item.className =
        "azkar-item";

      const text =
        document.createElement(
          "div"
        );

      text.className =
        "azkar-text";

      text.textContent =
        zikr.text || "";

      const count =
        Number(
          zikr.count || 1
        );

      let current =
        progress[index] !== undefined
          ? Number(progress[index])
          : count;

      const row =
        document.createElement(
          "div"
        );

      row.className =
        "azkar-counter-row";

      const remaining =
        document.createElement(
          "span"
        );

      remaining.className =
        "azkar-remaining";

      const button =
        document.createElement(
          "button"
        );

      button.type =
        "button";

      button.className =
        "azkar-count-button";

      function updateCounter() {

        if (current <= 0) {

          remaining.textContent =
            "تم";

          button.textContent =
            "تم";

          item.classList.add(
            "done"
          );

        } else {

          remaining.textContent =
            `متبقي ${current} من ${count}`;

          button.textContent =
            "تسبيح";

          item.classList.remove(
            "done"
          );

        }

      }

      updateCounter();

      button.addEventListener(
        "click",
        () => {

          if (current <= 0) return;

          current =
            Math.max(
              0,
              current - 1
            );

          progress[index] =
            current;

          saveTopicProgress(
            number,
            progress
          );

          updateCounter();

          const vibration =
            localStorage.getItem(
              "anyas_vibration"
            );

          if (
            vibration === "true" &&
            navigator.vibrate
          ) {

            navigator.vibrate(25);

          }

        }
      );

      row.appendChild(
        remaining
      );

      row.appendChild(
        button
      );

      item.appendChild(
        text
      );

      item.appendChild(
        row
      );

      container.appendChild(
        item
      );

    }
  );

  renderTopicNavigation(
    number
  );

}


// =====================================================
// السابق / التالي
// =====================================================

function renderTopicNavigation(
  currentNumber
) {

  const container =
    document.getElementById(
      "azkarTopicNavigation"
    );

  if (!container) return;

  const topics =
    Array.isArray(window.azkarTopics)
      ? window.azkarTopics
      : [];

  const index =
    topics.findIndex(
      topic =>
        topic.number === currentNumber
    );

  if (index === -1) return;

  const previous =
    topics[index - 1];

  const next =
    topics[index + 1];

  container.innerHTML = "";

  const row =
    document.createElement(
      "div"
    );

  row.style.display =
    "flex";

  row.style.gap =
    "10px";

  row.style.marginTop =
    "15px";

  row.style.width =
    "100%";

  if (previous) {

    const button =
      document.createElement(
        "button"
      );

    button.type =
      "button";

    button.textContent =
      "الباب السابق";

    button.className =
      "azkar-count-button";

    button.style.flex =
      "1";

    button.addEventListener(
      "click",
      () =>
        openAzkarTopic(
          previous.number
        )
    );

    row.appendChild(
      button
    );

  }

  if (next) {

    const button =
      document.createElement(
        "button"
      );

    button.type =
      "button";

    button.textContent =
      "الباب التالي";

    button.className =
      "azkar-count-button";

    button.style.flex =
      "1";

    button.addEventListener(
      "click",
      () =>
        openAzkarTopic(
          next.number
        )
    );

    row.appendChild(
      button
    );

  }

  container.appendChild(
    row
  );

}


// =====================================================
// أرقام
// =====================================================

function formatNumber(number) {

  return String(number)
    .padStart(2, "0");

    }
