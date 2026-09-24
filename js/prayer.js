// =====================================================
// أنياس
// مواقيت الصلاة والموقع والعد التنازلي
// =====================================================

const FALLBACK_LATITUDE = 30.0444;
const FALLBACK_LONGITUDE = 31.2357;


// =====================================================
// تحديد الموقع وتحميل المواقيت
// =====================================================

function detectLocationAndLoadTimes() {

  if (!navigator.geolocation) {
    loadPrayerTimes(
      FALLBACK_LATITUDE,
      FALLBACK_LONGITUDE
    );
    return;
  }

  navigator.geolocation.getCurrentPosition(

    position => {

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      window.lastKnownLocation = {
        latitude,
        longitude
      };

      loadPrayerTimes(latitude, longitude);
      fetchCityName(latitude, longitude);

    },

    error => {

      console.warn(
        "تعذر تحديد الموقع:",
        error
      );

      loadPrayerTimes(
        FALLBACK_LATITUDE,
        FALLBACK_LONGITUDE
      );

      fetchCityName(
        FALLBACK_LATITUDE,
        FALLBACK_LONGITUDE
      );

    },

    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000
    }

  );

}


// =====================================================
// اسم المدينة
// =====================================================

async function fetchCityName(latitude, longitude) {

  const locationElement =
    document.getElementById("locationName");

  if (!locationElement) return;

  try {

    const url =
      `https://nominatim.openstreetmap.org/reverse` +
      `?format=json` +
      `&lat=${latitude}` +
      `&lon=${longitude}` +
      `&accept-language=ar`;

    const response =
      await fetch(url);

    if (!response.ok) {
      throw new Error("فشل في جلب اسم المدينة");
    }

    const data =
      await response.json();

    const address =
      data.address || {};

    const city =
      address.city ||
      address.town ||
      address.village ||
      address.county ||
      address.state ||
      "موقعك الحالي";

    locationElement.textContent = city;

  } catch (error) {

    console.error(
      "خطأ في تحديد اسم المدينة:",
      error
    );

    locationElement.textContent =
      "موقعك الحالي";

  }

}


// =====================================================
// تحميل مواقيت الصلاة
// =====================================================

async function loadPrayerTimes(latitude, longitude) {

  try {

    const now = new Date();

    const day =
      String(now.getDate()).padStart(2, "0");

    const month =
      String(now.getMonth() + 1).padStart(2, "0");

    const year =
      now.getFullYear();

    const date =
      `${day}-${month}-${year}`;

    const url =
      `https://api.aladhan.com/v1/timings/${date}` +
      `?latitude=${latitude}` +
      `&longitude=${longitude}` +
      `&method=5`;

    const response =
      await fetch(url);

    if (!response.ok) {
      throw new Error("فشل تحميل مواقيت الصلاة");
    }

    const data =
      await response.json();

    if (
      !data ||
      !data.data ||
      !data.data.timings
    ) {
      throw new Error("بيانات المواقيت غير متاحة");
    }

    const timings =
      data.data.timings;

    window.todayTimings = timings;

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

    updateNextPrayer(timings);

  } catch (error) {

    console.error(
      "خطأ في تحميل مواقيت الصلاة:",
      error
    );

    const locationElement =
      document.getElementById("locationName");

    if (locationElement) {
      locationElement.textContent =
        "تعذر تحميل المواقيت";
    }

  }

}


// =====================================================
// عرض وقت الصلاة
// =====================================================

function setPrayerTime(id, time) {

  const element =
    document.getElementById(id);

  if (!element || !time) return;

  element.textContent =
    convertTo12Hour(time);

}


// =====================================================
// تحويل الوقت إلى 12 ساعة
// =====================================================

function convertTo12Hour(time) {

  if (!time) return "--:--";

  const parts =
    time.split(":");

  let hour =
    parseInt(parts[0], 10);

  const minute =
    parts[1];

  if (Number.isNaN(hour)) {
    return time;
  }

  const period =
    hour >= 12 ? "م" : "ص";

  hour =
    hour % 12 || 12;

  return `${formatNumber(hour)}:${minute} ${period}`;

}


// =====================================================
// تحديد الصلاة القادمة
// =====================================================

function updateNextPrayer(timings) {

  if (!timings) return;

  const prayers = [
    {
      key: "Fajr",
      name: "الفجر"
    },
    {
      key: "Dhuhr",
      name: "الظهر"
    },
    {
      key: "Asr",
      name: "العصر"
    },
    {
      key: "Maghrib",
      name: "المغرب"
    },
    {
      key: "Isha",
      name: "العشاء"
    }
  ];

  const now =
    new Date();

  let nextPrayer = null;

  for (const prayer of prayers) {

    if (!timings[prayer.key]) {
      continue;
    }

    const [hour, minute] =
      timings[prayer.key]
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

  // إذا انتهت جميع الصلوات، فالصلاة القادمة هي فجر الغد
  if (!nextPrayer && timings.Fajr) {

    const [hour, minute] =
      timings.Fajr
        .split(":")
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
      key: "Fajr",
      name: "الفجر",
      time: tomorrow
    };

  }

  if (!nextPrayer) return;

  window.nextPrayer = nextPrayer;

  const nameElement =
    document.getElementById("nextPrayerName");

  const timeElement =
    document.getElementById("nextPrayerTime");

  if (nameElement) {
    nameElement.textContent =
      nextPrayer.name;
  }

  if (timeElement) {
    timeElement.textContent =
      convertTo12Hour(
        `${String(nextPrayer.time.getHours()).padStart(2, "0")}:` +
        `${String(nextPrayer.time.getMinutes()).padStart(2, "0")}`
      );
  }

}


// =====================================================
// العد التنازلي للصلاة القادمة
// =====================================================

function updateCountdown() {

  if (!window.todayTimings) {
    return;
  }

  updateNextPrayer(
    window.todayTimings
  );

  const nextPrayer =
    window.nextPrayer;

  if (!nextPrayer) {
    return;
  }

  const now =
    new Date();

  let difference =
    nextPrayer.time.getTime() -
    now.getTime();

  // عند حلول وقت الصلاة
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

  const totalSeconds =
    Math.floor(difference / 1000);

  const hours =
    Math.floor(totalSeconds / 3600);

  const minutes =
    Math.floor(
      (totalSeconds % 3600) / 60
    );

  const seconds =
    totalSeconds % 60;

  const countdownElement =
    document.getElementById("countdown");

  if (!countdownElement) return;

  countdownElement.textContent =
    `${formatNumber(hours)}:` +
    `${formatNumber(minutes)}:` +
    `${formatNumber(seconds)}`;

    }
