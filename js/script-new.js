// =========================
// أنياس - مواقيت الصلاة
// =========================

document.addEventListener("DOMContentLoaded", () => {
  loadPrayerTimes();
  startPrayerCountdown();
});


// =========================
// جلب مواقيت الصلاة
// =========================

async function loadPrayerTimes() {

  const locationName = document.getElementById("locationName");

  if (!navigator.geolocation) {
    if (locationName) {
      locationName.textContent = "تحديد الموقع غير متاح";
    }

    return;
  }

  navigator.geolocation.getCurrentPosition(
    async position => {

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      try {

        const response = await fetch(
          `https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=5`
        );

        const data = await response.json();

        if (
          !data ||
          data.code !== 200 ||
          !data.data ||
          !data.data.timings
        ) {
          throw new Error("تعذر الحصول على مواقيت الصلاة");
        }

        const timings = data.data.timings;

        window.todayTimings = timings;

        setPrayerTime("fajrTime", timings.Fajr);
        setPrayerTime("sunriseTime", timings.Sunrise);
        setPrayerTime("dhuhrTime", timings.Dhuhr);
        setPrayerTime("asrTime", timings.Asr);
        setPrayerTime("maghribTime", timings.Maghrib);
        setPrayerTime("ishaTime", timings.Isha);

        if (locationName) {
          locationName.textContent =
            `موقعك الحالي`;
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

function setPrayerTime(elementId, time) {

  const element =
    document.getElementById(elementId);

  if (!element || !time) return;

  element.textContent =
    convertTo12Hour(time);
}


// =========================
// تحويل الوقت إلى 12 ساعة
// =========================

function convertTo12Hour(time) {

  const parts = time.split(":");

  let hour = Number(parts[0]);
  const minute = parts[1];

  const period =
    hour >= 12 ? "م" : "ص";

  hour = hour % 12;

  if (hour === 0) {
    hour = 12;
  }

  return `${hour}:${minute} ${period}`;
}


// =========================
// الصلاة القادمة
// =========================

function updateNextPrayer() {

  if (!window.todayTimings) return;

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

  const now = new Date();

  let nextPrayer = null;

  for (const prayer of prayers) {

    const [hour, minute] =
      window.todayTimings[prayer.key]
        .split(":")
        .map(Number);

    const prayerTime =
      new Date();

    prayerTime.setHours(
      hour,
      minute,
      0,
      0
    );

    if (prayerTime > now) {

      nextPrayer = {
        ...prayer,
        time: prayerTime
      };

      break;
    }
  }

  // إذا انتهت صلوات اليوم
  if (!nextPrayer) {

    nextPrayer = {
      name: "الفجر",
      key: "Fajr",
      time: new Date()
    };

    const [hour, minute] =
      window.todayTimings.Fajr
        .split(":")
        .map(Number);

    nextPrayer.time.setDate(
      nextPrayer.time.getDate() + 1
    );

    nextPrayer.time.setHours(
      hour,
      minute,
      0,
      0
    );
  }

  window.nextPrayer = nextPrayer;

  const nameElement =
    document.getElementById("nextPrayerName");

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
    document.getElementById("countdown");

  if (
    !
