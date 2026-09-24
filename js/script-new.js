// =========================
// أنياس - النسخة الجديدة
// مواقيت الصلاة
// =========================

document.addEventListener("DOMContentLoaded", () => {
  loadPrayerTimes();
  startPrayerCountdown();
});


// =========================
// جلب مواقيت الصلاة
// =========================

async function loadPrayerTimes() {

  const locationName =
    document.getElementById("locationName");

  if (!navigator.geolocation) {

    if (locationName) {
      locationName.textContent =
        "تحديد الموقع غير متاح";
    }

    return;
  }

  navigator.geolocation.getCurrentPosition(

    async position => {

      const latitude =
        position.coords.latitude;

      const longitude =
        position.coords.longitude;

      try {

        const response = await fetch(
          `https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=5`
        );

        if (!response.ok) {
          throw new Error("فشل الاتصال بالخدمة");
        }

        const data =
          await response.json();

        if (
          !data ||
          data.code !== 200 ||
          !data.data ||
          !data.data.timings
        ) {
          throw new Error(
            "تعذر الحصول على مواقيت الصلاة"
          );
        }

        const timings =
          data.data.timings;

        window.todayTimings = timings;

        // عرض المواقيت
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

        if (locationName) {
          locationName.textContent =
            "موقعك الحالي";
        }

        updateNextPrayer();

      } catch (error) {

        console.error(
          "خطأ في تحميل مواقيت الصلاة:",
          error
        );

        if (locationName) {
          locationName.textContent =
            "تعذر تحميل المواقيت";
        }
      }
    },

    error => {

      console.error(
        "خطأ في تحديد الموقع:",
        error
      );

      if (locationName) {

        locationName.textContent =
          "اسمح بالوصول إلى الموقع";
      }
    },

    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000
    }
  );
}


// =========================
// عرض وقت الصلاة
// =========================

function setPrayerTime(
  elementId,
  time
) {

  const element =
    document.getElementById(elementId);

  if (!element || !time) {
    return;
  }

  element.textContent =
    convertTo12Hour(time);
}


// =========================
// تحويل الوقت
// =========================

function convertTo12Hour(time) {

  const parts =
    time.split(":");

  let hour =
    Number(parts[0]);

  const minute =
    parts[1];

  const period =
    hour >= 12 ? "م" : "ص";

  hour =
    hour % 12;

  if (hour === 0) {
    hour = 12;
  }

  return `${hour}:${minute} ${period}`;
}


// =========================
// تحديد الصلاة القادمة
// =========================

function updateNextPrayer() {

  if (!window.todayTimings) {
    return;
  }

  const prayers = [

    {
      name: "الفجر",
      key: "Fajr"
    },

    {
      name: "الظهر",
      key: "Dhuhr"
    },

    {
      name: "العصر",
      key: "Asr"
    },

    {
      name: "المغرب",
      key: "Maghrib"
    },

    {
      name: "العشاء",
      key: "Isha"
    }

  ];

  const now =
    new Date();

  let nextPrayer = null;

  for (const prayer of prayers) {

    const time =
      window.todayTimings[prayer.key];

    if (!time) {
      continue;
    }

    const [
      hour,
      minute
    ] =
      time.split(":")
        .map(Number);

    const prayerDate =
      new Date();

    prayerDate.setHours(
      hour,
      minute,
      0,
      0
    );

    if (prayerDate > now) {

      nextPrayer = {
        name: prayer.name,
        time: prayerDate
      };

      break;
    }
  }


  // =========================
  // بعد العشاء → الفجر
  // =========================

  if (!nextPrayer) {

    const fajrTime =
      window.todayTimings.Fajr;

    if (!fajrTime) {
      return;
    }

    const [
      hour,
      minute
    ] =
      fajrTime.split(":")
        .map(Number);

    const tomorrow =
      new Date();

    tomorrow.setDate(
      tomorrow.getDate() + 1
    );

    tomorrow.setHours(
      hour,
      minute,
      0,
      0
    );

    nextPrayer = {
      name: "الفجر",
      time: tomorrow
    };
  }


  window.nextPrayer =
    nextPrayer;


  const nameElement =
    document.getElementById(
      "nextPrayerName"
    );

  if (nameElement) {

    nameElement.textContent =
      nextPrayer.name;
  }

  updateCountdown();
}


// =========================
// العد التنازلي
// =========================

function updateCountdown() {

  const countdown =
    document.getElementById(
      "countdown"
    );

  if (
    !countdown ||
    !window.nextPrayer
  ) {
    return;
  }

  const now =
    new Date();

  let difference =
    window.nextPrayer.time -
    now;


  if (difference <= 0) {

    updateNextPrayer();

    return;
  }


  const hours =
    Math.floor(
      difference /
      (1000 * 60 * 60)
    );

  difference %=
    1000 * 60 * 60;


  const minutes =
    Math.floor(
      difference /
      (1000 * 60)
    );

  difference %=
    1000 * 60;


  const seconds =
    Math.floor(
      difference /
      1000
    );


  countdown.textContent =
    `${String(hours).padStart(2, "0")}:` +
    `${String(minutes).padStart(2, "0")}:` +
    `${String(seconds).padStart(2, "0")}`;
}


// =========================
// تشغيل العد التنازلي
// =========================

function startPrayerCountdown() {

  setInterval(
    updateCountdown,
    1000
  );
}
