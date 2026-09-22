// ===============================
// أنياس
// مواقيت الصلاة + العد التنازلي
// + مشغل الأذان
// ===============================


document.addEventListener(
  "DOMContentLoaded",
  () => {

    updateDate();

    setupNavigation();

    setupAdhan();

    setupAdhanSettings();

    detectLocationAndLoadTimes();

    setInterval(
      updateCountdown,
      1000
    );

    setInterval(
      checkAutoAdhan,
      1000 * 20
    );

  }
);


// ===============================
// التاريخ
// ===============================

function updateDate() {

  const dateElement =
    document.getElementById(
      "todayDate"
    );

  if (!dateElement) return;


  const today =
    new Date();


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


// ===============================
// تحديد الموقع الجغرافي
// ===============================

function detectLocationAndLoadTimes() {


  // إحداثيات القاهرة كاحتياطي
  // في حالة رفض الإذن أو عدم الدعم

  const fallbackLat = 30.0444;
  const fallbackLng = 31.2357;


  if (!navigator.geolocation) {

    console.warn(
      "المتصفح لا يدعم تحديد الموقع، سيتم استخدام القاهرة"
    );

    loadPrayerTimes(
      fallbackLat,
      fallbackLng
    );

    return;

  }


  navigator.geolocation.getCurrentPosition(

    (position) => {

      const { latitude, longitude } =
        position.coords;

      loadPrayerTimes(
        latitude,
        longitude
      );

    },

    (error) => {

      console.warn(
        "تعذر الحصول على الموقع، سيتم استخدام القاهرة:",
        error.message
      );

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
// مواقيت الصلاة
// ===============================

async function loadPrayerTimes(
  latitude,
  longitude
) {


  const today =
    new Date();


  const day =
    String(
      today.getDate()
    ).padStart(2, "0");


  const month =
    String(
      today.getMonth() + 1
    ).padStart(2, "0");


  const year =
    today.getFullYear();


  const url =
    `https://api.aladhan.com/v1/timings/${day}-${month}-${year}` +
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


// ===============================
// عرض وقت الصلاة
// ===============================

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


// ===============================
// تحويل الوقت
// ===============================

function convertTo12Hour(
  time
) {


  const [
    hour,
    minute
  ] =
    time
      .split(":")
      .map(Number);


  const period =
    hour >= 12
      ? "م"
      : "ص";


  let h =
    hour % 12;


  if (h === 0) {
    h = 12;
  }


  return (
    `${String(h).padStart(2, "0")}:` +
    `${String(minute).padStart(2, "0")} ${period}`
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

        date:
          prayerDate

      };


      break;

    }

  }


  // إذا انتهت صلوات اليوم
  // ننتقل لفجر الغد

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
      prayers[0]
        .time
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

      date:
        tomorrow

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


  if (!countdownElement) {
    return;
  }


  if (!window.nextPrayerData) {
    return;
  }


  const now =
    new Date();


  const difference =
    window.nextPrayerData.date -
    now;


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
// مشغل الأذان (الزرار الأساسي)
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


      if (
        adhanAudio.paused
      ) {


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
// (السويتش + الفوليوم + زر التجربة)
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


        applyVolume(value);


        localStorage.setItem(
          "anyas_adhanVolume",
          value
        );

      }
    );

  }


  if (testButton && adhanAudio) {

    testButton.addEventListener(
      "click",
      () => {

        adhanAudio.currentTime = 0;

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
// التحقق من دخول وقت صلاة
// وتشغيل الأذان تلقائيًا
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

    { key: "Fajr", time: window.todayTimings.Fajr },
    { key: "Dhuhr", time: window.todayTimings.Dhuhr },
    { key: "Asr", time: window.todayTimings.Asr },
    { key: "Maghrib", time: window.todayTimings.Maghrib },
    { key: "Isha", time: window.todayTimings.Isha }

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


  if (!audioToPlay) {

    return;

  }


  audioToPlay.currentTime = 0;


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
// القائمة السفلية
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


          navItems.forEach(
            (nav) => {

              nav.classList.remove(
                "active"
              );

            }
          );


          item.classList.add(
            "active"
          );


        }
      );

    }
  );

}


// ===============================
// تنسيق الأرقام
// ===============================

function formatNumber(
  number
) {


  return String(number)
    .padStart(2, "0");

}
