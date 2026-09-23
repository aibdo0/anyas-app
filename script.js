// ===============================
// أنياس
// مواقيت الصلاة + العد التنازلي
// + مشغل الأذان + أبواب الأذكار
// ===============================


document.addEventListener("DOMContentLoaded", () => {

  updateDate();

  setupNavigation();

  setupAdhan();

  setupAdhanSettings();

  setupAzkarTopics();

  detectLocationAndLoadTimes();

  setInterval(updateCountdown, 1000);

  setInterval(checkAutoAdhan, 1000 * 20);

});


// ===============================
// التاريخ
// ===============================

function updateDate() {

  const dateElement =
    document.getElementById("todayDate");

  if (!dateElement) return;

  const today = new Date();

  dateElement.textContent =
    today.toLocaleDateString("ar-EG", {
      weekday: "long",
      day: "numeric",
      month: "long"
    });

}


// ===============================
// تحديد الموقع
// ===============================

function detectLocationAndLoadTimes() {

  const fallbackLat = 30.0444;
  const fallbackLng = 31.2357;

  if (!navigator.geolocation) {

    const nameEl =
      document.getElementById("locationName");

    if (nameEl) {
      nameEl.textContent =
        "📍 القاهرة (المتصفح لا يدعم تحديد الموقع)";
    }

    loadPrayerTimes(
      fallbackLat,
      fallbackLng
    );

    return;
  }


  navigator.geolocation.getCurrentPosition(

    (position) => {

      const {
        latitude,
        longitude
      } = position.coords;

      loadPrayerTimes(
        latitude,
        longitude
      );

      fetchCityName(
        latitude,
        longitude
      );

    },

    () => {

      const nameEl =
        document.getElementById("locationName");

      if (nameEl) {
        nameEl.textContent =
          "📍 القاهرة (تعذر تحديد موقعك)";
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


// ===============================
// اسم المدينة
// ===============================

async function fetchCityName(
  latitude,
  longitude
) {

  const nameEl =
    document.getElementById("locationName");

  try {

    const url =
      `https://nominatim.openstreetmap.org/reverse` +
      `?format=json&lat=${latitude}&lon=${longitude}` +
      `&accept-language=ar`;

    const response =
      await fetch(url);

    const data =
      await response.json();

    const address =
      data.address || {};

    const city =
      address.city ||
      address.town ||
      address.village ||
      address.county ||
      "موقعك الحالي";

    const country =
      address.country || "";

    if (nameEl) {

      nameEl.textContent =
        `📍 ${city}` +
        `${country ? "، " + country : ""}`;

    }

  } catch (error) {

    console.error(
      "تعذر جلب اسم المدينة:",
      error
    );

    if (nameEl) {
      nameEl.textContent =
        "📍 موقعك الحالي";
    }

  }

}


// ===============================
// مواقيت الصلاة
// ===============================

async function loadPrayerTimes(
  latitude,
  longitude
) {

  const today = new Date();

  const day =
    String(today.getDate())
      .padStart(2, "0");

  const month =
    String(today.getMonth() + 1)
      .padStart(2, "0");

  const year =
    today.getFullYear();


  const url =
    `https://api.aladhan.com/v1/timings/` +
    `${day}-${month}-${year}` +
    `?latitude=${latitude}` +
    `&longitude=${longitude}` +
    `&method=5`;


  try {

    const response =
      await fetch(url);

    const data =
      await response.json();


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


    setPrayerTime(
      "fajrTime",
      timings.Fajr
    );

    setPrayerTime(
      "sunriseTime",
      timings.Sunrise
    );

    setPrayerTime(
      "dhuhrTime",
      timings.Dhuhr
    );

    setPrayerTime(
      "asrTime",
      timings.Asr
    );

    setPrayerTime(
      "maghribTime",
      timings.Maghrib
    );

    setPrayerTime(
      "ishaTime",
      timings.Isha
    );


    updateNextPrayer(
      timings
    );


  } catch (error) {

    console.error(
      "حدث خطأ في جلب مواقيت الصلاة:",
      error
    );

  }

}


function setPrayerTime(
  id,
  time
) {

  const element =
    document.getElementById(id);

  if (!element) return;

  element.textContent =
    convertTo12Hour(time);

}


function convertTo12Hour(time) {

  const [
    hour,
    minute
  ] =
    time
      .split(":")
      .map(Number);

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


// ===============================
// الصلاة القادمة
// ===============================

function updateNextPrayer(
  timings
) {

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


  const now =
    new Date();

  let nextPrayer =
    null;


  for (
    const prayer of prayers
  ) {

    const [
      hour,
      minute
    ] =
      prayer.time
        .split(":")
        .map(Number);


    const prayerDate =
      new Date();

    prayerDate.setHours(
      hour,
      minute,
      0,
      0
    );


    if (
      prayerDate > now
    ) {

      nextPrayer = {
        ...prayer,
        date: prayerDate
      };

      break;

    }

  }


  if (!nextPrayer) {

    const tomorrow =
      new Date();

    tomorrow.setDate(
      tomorrow.getDate() + 1
    );


    const [
      hour,
      minute
    ] =
      prayers[0].time
        .split(":")
        .map(Number);


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


// ===============================
// العد التنازلي
// ===============================

function updateCountdown() {

  const countdownElement =
    document.getElementById(
      "countdown"
    );


  if (!countdownElement) return;

  if (!window.nextPrayerData) {
    return;
  }


  const now =
    new Date();

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


// ===============================
// مشغل الأذان
// ===============================

function setupAdhan() {

  const adhanButton =
    document.getElementById(
      "adhanButton"
    );

  const adhanAudio =
    document.getElementById(
      "adhanAudio"
    );


  if (
    !adhanButton ||
    !adhanAudio
  ) {
    return;
  }


  adhanButton.addEventListener(
    "click",
    () => {

      if (adhanAudio.paused) {

        adhanAudio
          .play()
          .then(() => {

            adhanButton.textContent =
              "⏸ إيقاف الأذان";

          })
          .catch((error) => {

            console.error(
              "تعذر تشغيل الأذان:",
              error
            );

            adhanButton.textContent =
              "▶ تشغيل الأذان";

          });

      } else {

        adhanAudio.pause();

        adhanButton.textContent =
          "▶ تشغيل الأذان";

      }

    }
  );


  adhanAudio.addEventListener(
    "ended",
    () => {

      adhanButton.textContent =
        "▶ تشغيل الأذان";

    }
  );

}


// ===============================
// إعدادات الصوت
// ===============================

function setupAdhanSettings() {

  const autoAdhanToggle =
    document.getElementById(
      "autoAdhan"
    );

  const volumeSlider =
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

  const adhanAudio =
    document.getElementById(
      "adhanAudio"
    );

  const fajrAudio =
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


  if (
    autoAdhanToggle &&
    savedAuto !== null
  ) {

    autoAdhanToggle.checked =
      savedAuto === "true";

  }


  const initialVolume =
    savedVolume !== null
      ? Number(savedVolume)
      : 100;


  if (volumeSlider) {
    volumeSlider.value =
      initialVolume;
  }


  if (volumeValue) {
    volumeValue.textContent =
      `${initialVolume}%`;
  }


  applyVolume(
    initialVolume
  );


  if (autoAdhanToggle) {

    autoAdhanToggle.addEventListener(
      "change",
      () => {

        localStorage.setItem(
          "anyas_autoAdhan",
          autoAdhanToggle.checked
        );

      }
    );

  }


  if (volumeSlider) {

    volumeSlider.addEventListener(
      "input",
      () => {

        const value =
          Number(
            volumeSlider.value
          );


        if (volumeValue) {

          volumeValue.textContent =
            `${value}%`;

        }


        applyVolume(
          value
        );


        localStorage.setItem(
          "anyas_adhanVolume",
          value
        );

      }
    );

  }


  if (
    testButton &&
    adhanAudio
  ) {

    testButton.addEventListener(
      "click",
      () => {

        adhanAudio.currentTime =
          0;

        adhanAudio
          .play()
          .catch((error) => {

            console.error(
              "تعذر تشغيل تجربة الأذان:",
              error
            );

          });

      }
    );

  }


  function applyVolume(
    value
  ) {

    const normalized =
      value / 100;


    if (adhanAudio) {
      adhanAudio.volume =
        normalized;
    }


    if (fajrAudio) {
      fajrAudio.volume =
        normalized;
    }

  }

}


// ===============================
// الأذان التلقائي
// ===============================

function checkAutoAdhan() {

  const autoAdhanToggle =
    document.getElementById(
      "autoAdhan"
    );


  if (
    !autoAdhanToggle ||
    !autoAdhanToggle.checked
  ) {
    return;
  }


  if (!window.todayTimings) {
    return;
  }


  const prayers = [

    {
      key: "Fajr",
      time:
        window.todayTimings.Fajr
    },

    {
      key: "Dhuhr",
      time:
        window.todayTimings.Dhuhr
    },

    {
      key: "Asr",
      time:
        window.todayTimings.Asr
    },

    {
      key: "Maghrib",
      time:
        window.todayTimings.Maghrib
    },

    {
      key: "Isha",
      time:
        window.todayTimings.Isha
    }

  ];


  const now =
    new Date();


  const currentHM =
    `${String(now.getHours()).padStart(2, "0")}:` +
    `${String(now.getMinutes()).padStart(2, "0")}`;


  const todayKey =
    now.toDateString();


  for (
    const prayer of prayers
  ) {

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


function playAdhanFor(
  prayerKey
) {

  const fajrAudio =
    document.getElementById(
      "fajrAudio"
    );

  const adhanAudio =
    document.getElementById(
      "adhanAudio"
    );


  const audioToPlay =
    prayerKey === "Fajr" &&
    fajrAudio
      ? fajrAudio
      : adhanAudio;


  if (!audioToPlay) return;


  audioToPlay.currentTime =
    0;


  audioToPlay
    .play()
    .catch((error) => {

      console.error(
        "تعذر تشغيل الأذان التلقائي:",
        error
      );

    });

}


// ===============================
// التنقل
// ===============================

function setupNavigation() {

  const navItems =
    document.querySelectorAll(
      ".nav-item"
    );


  navItems.forEach(
    (item) => {

      item.addEventListener(
        "click",
        () => {

          const targetPage =
            item.getAttribute(
              "data-page"
            );


          if (!targetPage) {
            return;
          }


          navItems.forEach(
            (nav) =>
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


function goToPage(
  pageId
) {

  document
    .querySelectorAll(".page")
    .forEach(
      (page) =>
        page.classList.remove(
          "active"
        )
    );


  const pageElement =
    document.getElementById(
      `page-${pageId}`
    );


  if (pageElement) {

    pageElement.classList.add(
      "active"
    );

  }

}


// ======================================================
// الأذكار - نظام 132 بابًا
// ======================================================

function setupAzkarTopics() {

  const grid =
    document.getElementById(
      "categoryGrid"
    );

  const backButton =
    document.getElementById(
      "azkarBackButton"
    );


  if (!grid) {
    return;
  }


  grid.innerHTML = "";


  const topics =
    window.azkarTopics || [];


  // عنوان عدد الأبواب إن وجد
  const countElement =
    document.getElementById(
      "azkarTopicsCount"
    );


  if (countElement) {

    countElement.textContent =
      `${topics.length} بابًا`;

  }


  topics.forEach(
    (topic) => {

      const card =
        document.createElement(
          "button"
        );


      card.type =
        "button";


      card.className =
        "category-card";


      const itemCount =
        Array.isArray(topic.items)
          ? topic.items.length
          : 0;


      card.innerHTML =

        `<div class="category-icon">` +
        `${topic.number}` +
        `</div>` +

        `<div class="category-name">` +
        `${topic.title}` +
        `</div>` +

        `<div class="category-count">` +
        `${itemCount > 0 ? itemCount + " أذكار" : "باب"}` +
        `</div>`;


      card.addEventListener(
        "click",
        () => {

          openAzkarTopic(
            topic.number
          );

        }
      );


      grid.appendChild(
        card
      );

    }
  );


  if (backButton) {

    backButton.onclick = () => {

      goToPage(
        "azkar"
      );


      document
        .querySelectorAll(
          ".nav-item"
        )
        .forEach(
          (nav) =>
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


// ======================================================
// فتح باب
// ======================================================

function openAzkarTopic(
  number
) {

  const topics =
    window.azkarTopics || [];


  const topic =
    topics.find(
      (item) =>
        item.number === number
    );


  if (!topic) {
    return;
  }


  const titleEl =
    document.getElementById(
      "categoryDetailTitle"
    );


  if (titleEl) {

    titleEl.textContent =
      `${topic.number}. ${topic.title}`;

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


// ======================================================
// تخزين التقدم
// ======================================================

function getTopicStorageKey(
  number
) {

  const todayKey =
    new Date().toDateString();


  return (
    `anyas_topic_${number}_${todayKey}`
  );

}


function loadTopicProgress(
  number
) {

  const raw =
    localStorage.getItem(
      getTopicStorageKey(number)
    );


  if (!raw) {
    return {};
  }


  try {

    return JSON.parse(
      raw
    );

  } catch (error) {

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


// ======================================================
// عرض باب الأذكار
// ======================================================

function renderAzkarTopic(
  number
) {

  const topics =
    window.azkarTopics || [];


  const topic =
    topics.find(
      (item) =>
        item.number === number
    );


  const container =
    document.getElementById(
      "azkarList"
    );


  if (!container) {
    return;
  }


  container.innerHTML = "";


  if (!topic) {
    return;
  }


  const items =
    Array.isArray(topic.items)
      ? topic.items
      : [];


  // لو الباب لسه بدون محتوى
  if (items.length === 0) {

    const empty =
      document.createElement(
        "div"
      );


    empty.className =
      "azkar-item";


    empty.innerHTML =

      `<div class="azkar-text">` +
      `سيتم إضافة أذكار هذا الباب قريبًا بإذن الله.` +
      `</div>`;


    container.appendChild(
      empty
    );


    renderTopicNavigation(
      number
    );


    return;
  }


  const progress =
    loadTopicProgress(
      number
    );


  items.forEach(
    (zikr, index) => {

      const item =
        document.createElement(
          "div"
        );


      item.className =
        "azkar-item";


      const textDiv =
        document.createElement(
          "div"
        );


      textDiv.className =
        "azkar-text";


      textDiv.textContent =
        zikr.text || "";


      item.appendChild(
        textDiv
      );


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
            "✓ تم";

          button.textContent =
            "✓";

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

          if (current <= 0) {
            return;
          }


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

        }
      );


      row.appendChild(
        remaining
      );


      row.appendChild(
        button
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


// ======================================================
// السابق / التالي
// ======================================================

function renderTopicNavigation(
  currentNumber
) {

  const container =
    document.getElementById(
      "azkarTopicNavigation"
    );


  if (!container) {
    return;
  }


  const topics =
    window.azkarTopics || [];


  const index =
    topics.findIndex(
      (topic) =>
        topic.number === currentNumber
    );


  if (index === -1) {
    return;
  }


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
      "← الباب السابق";


    button.className =
      "azkar-count-button";


    button.style.flex =
      "1";


    button.addEventListener(
      "click",
      () => {

        openAzkarTopic(
          previous.number
        );

      }
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
      "الباب التالي →";


    button.className =
      "azkar-count-button";


    button.style.flex =
      "1";


    button.addEventListener(
      "click",
      () => {

        openAzkarTopic(
          next.number
        );

      }
    );


    row.appendChild(
      button
    );

  }


  container.appendChild(
    row
  );

}


// ======================================================
// أرقام
// ======================================================

function formatNumber(
  number
) {

  return String(
    number
  ).padStart(
    2,
    "0"
  );

        }
