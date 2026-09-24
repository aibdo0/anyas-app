// =====================================================
// أنياس
// مواقيت الصلاة والموقع والعد التنازلي
// =====================================================

const FALLBACK_LATITUDE = 30.0444;
const FALLBACK_LONGITUDE = 31.2357;

const PRAYER_DEFINITIONS = [
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


// =====================================================
// تحديد الموقع وتحميل المواقيت
// =====================================================

function detectLocationAndLoadTimes() {

  if (!navigator.geolocation) {

    loadPrayerTimes(
      FALLBACK_LATITUDE,
      FALLBACK_LONGITUDE
    );

    fetchCityName(
      FALLBACK_LATITUDE,
      FALLBACK_LONGITUDE
    );

    return;
  }

  navigator.geolocation.getCurrentPosition(

    position => {

      const latitude =
        position.coords.latitude;

      const longitude =
        position.coords.longitude;

      window.lastKnownLocation = {
        latitude,
        longitude
      };

      loadPrayerTimes(
        latitude,
        longitude
      );

      fetchCityName(
        latitude,
        longitude
      );

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
      throw new Error(
        "فشل في جلب اسم المدينة"
      );
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

    locationElement.textContent =
      city;

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

    const now =
      new Date();

    const day =
      String(
        now.getDate()
      ).padStart(2, "0");

    const month =
      String(
        now.getMonth() + 1
      ).padStart(2, "0");

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
      throw new Error(
        "فشل تحميل مواقيت الصلاة"
      );
    }

    const data =
      await response.json();

    if (
      !data ||
      !data.data ||
      !data.data.timings
    ) {
      throw new Error(
        "بيانات المواقيت غير متاحة"
      );
    }

    const timings =
      data.data.timings;

    window.todayTimings =
      timings;

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

    updatePrayerStates(timings);

    updatePrayerProgress(timings);

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

  if (!time) {
    return "--:--";
  }

  const parts =
    time.split(":");

  let hour =
    parseInt(
      parts[0],
      10
    );

  const minute =
    parts[1] || "00";

  if (Number.isNaN(hour)) {
    return time;
  }

  const period =
    hour >= 12 ? "م" : "ص";

  hour =
    hour % 12 || 12;

  return (
    `${formatNumber(hour)}:` +
    `${minute} ${period}`
  );

}


// =====================================================
// تحويل وقت المواقيت إلى Date
// =====================================================

function createPrayerDate(
  time,
  dayOffset = 0
) {

  if (!time) {
    return null;
  }

  const parts =
    time.split(":");

  const hour =
    Number(parts[0]);

  const minute =
    Number(parts[1]);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    return null;
  }

  const date =
    new Date();

  date.setDate(
    date.getDate() + dayOffset
  );

  date.setHours(
    hour,
    minute,
    0,
    0
  );

  return date;

}


// =====================================================
// تحديد الصلاة القادمة
// =====================================================

function updateNextPrayer(timings) {

  if (!timings) return;

  const now =
    new Date();

  let nextPrayer =
    null;

  for (
    const prayer of PRAYER_DEFINITIONS
  ) {

    if (!timings[prayer.key]) {
      continue;
    }

    const prayerTime =
      createPrayerDate(
        timings[prayer.key]
      );

    if (
      prayerTime &&
      prayerTime > now
    ) {

      nextPrayer = {
        ...prayer,
        time: prayerTime
      };

      break;

    }

  }

  // إذا انتهت جميع صلوات اليوم
  // تكون الصلاة القادمة فجر الغد

  if (
    !nextPrayer &&
    timings.Fajr
  ) {

    const tomorrowFajr =
      createPrayerDate(
        timings.Fajr,
        1
      );

    if (tomorrowFajr) {

      nextPrayer = {
        key: "Fajr",
        name: "الفجر",
        time: tomorrowFajr
      };

    }

  }

  if (!nextPrayer) {
    return;
  }

  window.nextPrayer =
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
        `${String(
          nextPrayer.time.getHours()
        ).padStart(2, "0")}:` +
        `${String(
          nextPrayer.time.getMinutes()
        ).padStart(2, "0")}`
      );

  }

}


// =====================================================
// تحديد حالة الصلوات
// الحالية / القادمة / السابقة
// =====================================================

function updatePrayerStates(timings) {

  if (!timings) return;

  const now =
    new Date();

  const rows =
    document.querySelectorAll(
      ".prayer-row[data-prayer]"
    );

  rows.forEach(row => {

    row.classList.remove(
      "current",
      "next",
      "past",
      "active"
    );

    const prayerKey =
      row.dataset.prayer;

    if (!prayerKey) {
      return;
    }

    const prayerTime =
      createPrayerDate(
        timings[prayerKey]
      );

    if (!prayerTime) {
      return;
    }

    const nextPrayer =
      window.nextPrayer;

    if (
      nextPrayer &&
      nextPrayer.key === prayerKey
    ) {

      row.classList.add("next");

      return;
    }

    if (
      prayerTime.getTime() <=
      now.getTime()
    ) {

      row.classList.add("past");

    }

  });

  /*
   * الصلاة الحالية:
   * آخر صلاة دخل وقتها
   */

  let currentPrayer =
    null;

  for (
    const prayer of PRAYER_DEFINITIONS
  ) {

    const prayerTime =
      createPrayerDate(
        timings[prayer.key]
      );

    if (
      prayerTime &&
      prayerTime <= now
    ) {

      currentPrayer =
        prayer;

    }

  }

  if (currentPrayer) {

    const currentRow =
      document.querySelector(
        `.prayer-row[data-prayer="${currentPrayer.key}"]`
      );

    if (currentRow) {

      currentRow.classList.remove(
        "past"
      );

      currentRow.classList.add(
        "current",
        "active"
      );

    }

  }

}


// =====================================================
// شريط التقدم للصلاة القادمة
// =====================================================

function updatePrayerProgress(timings) {

  const progressBar =
    document.getElementById(
      "prayerProgressBar"
    );

  if (!progressBar) {
    return;
  }

  const nextPrayer =
    window.nextPrayer;

  if (!nextPrayer) {
    progressBar.style.width = "0%";
    return;
  }

  const now =
    new Date();

  const nextTime =
    nextPrayer.time;

  let previousTime =
    null;

  /*
   * ابحث عن الصلاة السابقة
   */

  for (
    let i = PRAYER_DEFINITIONS.length - 1;
    i >= 0;
    i--
  ) {

    const prayer =
      PRAYER_DEFINITIONS[i];

    const prayerTime =
      createPrayerDate(
        timings[prayer.key]
      );

    if (
      prayerTime &&
      prayerTime <= now
    ) {

      previousTime =
        prayerTime;

      break;

    }

  }

  /*
   * إذا كان الوقت قبل الفجر
   * نستخدم عشاء الأمس
   */

  if (!previousTime) {

    if (timings.Isha) {

      previousTime =
        createPrayerDate(
          timings.Isha,
          -1
        );

    }

  }

  /*
   * حماية من القيم غير الصحيحة
   */

  if (
    !previousTime ||
    !nextTime ||
    nextTime <= previousTime
  ) {

    progressBar.style.width =
      "0%";

    return;
  }

  const total =
    nextTime.getTime() -
    previousTime.getTime();

  const remaining =
    nextTime.getTime() -
    now.getTime();

  let percentage =
    (remaining / total) * 100;

  percentage =
    Math.max(
      0,
      Math.min(
        100,
        percentage
      )
    );

  progressBar.style.width =
    `${percentage}%`;

}


// =====================================================
// الضغط على مواقيت الصلاة
// يفتح إعدادات الأذان
// =====================================================

function setupPrayerRowActions() {

  const rows =
    document.querySelectorAll(
      ".prayer-row[data-prayer]"
    );

  rows.forEach(row => {

    if (
      row.dataset.adhanReady === "true"
    ) {
      return;
    }

    row.dataset.adhanReady =
      "true";

    row.addEventListener(
      "click",
      () => {

        const prayerKey =
          row.dataset.prayer;

        if (
          typeof goToPage ===
          "function"
        ) {

          goToPage("settings");

        }

        setTimeout(() => {

          let targetId =
            "normalMuezzinRow";

          if (
            prayerKey === "Fajr"
          ) {

            targetId =
              "fajrMuezzinRow";

          }

          const target =
            document.getElementById(
              targetId
            );

          if (target) {

            target.scrollIntoView({
              behavior: "smooth",
              block: "center"
            });

          }

        }, 150);

      }
    );

  });

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

  updatePrayerStates(
    window.todayTimings
  );

  updatePrayerProgress(
    window.todayTimings
  );

  const nextPrayer =
    window.nextPrayer;

  if (!nextPrayer) {
    return;
  }

  const now =
    new Date();

  const difference =
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
    Math.floor(
      difference / 1000
    );

  const hours =
    Math.floor(
      totalSeconds / 3600
    );

  const minutes =
    Math.floor(
      (totalSeconds % 3600) / 60
    );

  const seconds =
    totalSeconds % 60;

  const countdownElement =
    document.getElementById(
      "countdown"
    );

  if (!countdownElement) {
    return;
  }

  countdownElement.textContent =
    `${formatNumber(hours)}:` +
    `${formatNumber(minutes)}:` +
    `${formatNumber(seconds)}`;

}


// =====================================================
// تشغيل إعدادات الضغط بعد تحميل الصفحة
// =====================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupPrayerRowActions();

  }
);
