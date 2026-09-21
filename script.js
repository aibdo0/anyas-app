// ===============================
// أنياس - مواقيت الصلاة الحقيقية
// ===============================

document.addEventListener("DOMContentLoaded", () => {

  updateDate();

  setupNavigation();

  loadPrayerTimes();

  setInterval(updateCountdown, 1000);

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
// مواقيت الصلاة
// ===============================

async function loadPrayerTimes() {

  // القاهرة مؤقتًا
  // بعد ذلك سنجعل التطبيق يحدد الموقع تلقائيًا

  const latitude = 30.0444;
  const longitude = 31.2357;

  const today = new Date();

  const day =
    String(today.getDate()).padStart(2, "0");

  const month =
    String(today.getMonth() + 1).padStart(2, "0");

  const year =
    today.getFullYear();

  const url =
    `https://api.aladhan.com/v1/timings/${day}-${month}-${year}` +
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
      throw new Error("فشل الحصول على المواقيت");
    }

    const timings = data.data.timings;

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


// ===============================
// وضع وقت الصلاة في الصفحة
// ===============================

function setPrayerTime(id, time) {

  const element =
    document.getElementById(id);

  if (!element) return;

  element.textContent =
    convertTo12Hour(time);

}


// ===============================
// تحويل الوقت
// ===============================

function convertTo12Hour(time) {

  const [hour, minute] =
    time.split(":").map(Number);

  const period =
    hour >= 12 ? "م" : "ص";

  let h = hour % 12;

  if (h === 0) {
    h = 12;
  }

  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;

}


// ===============================
// الصلاة القادمة
// ===============================

function updateNextPrayer(timings) {

  const prayers = [
    {
      name: "الفجر",
      time: timings.Fajr
    },
    {
      name: "الظهر",
      time: timings.Dhuhr
    },
    {
      name: "العصر",
      time: timings.Asr
    },
    {
      name: "المغرب",
      time: timings.Maghrib
    },
    {
      name: "العشاء",
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


  // لو خلصت كل الصلوات
  // الصلاة القادمة هي فجر الغد

  if (!nextPrayer) {

    const tomorrow =
      new Date();

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
    document.getElementById("nextPrayerName");

  const timeElement =
    document.getElementById("nextPrayerTime");

  if (nameElement) {
    nameElement.textContent =
      nextPrayer.name;
  }

  if (timeElement) {
    timeElement.textContent =
      convertTo12Hour(nextPrayer.time);
  }

  updateCountdown();

}


// ===============================
// العد التنازلي
// ===============================

function updateCountdown() {

  const countdownElement =
    document.getElementById("countdown");

  if (!countdownElement) return;

  if (!window.nextPrayerData) {
    return;
  }

  const now =
    new Date();

  const difference =
    window.nextPrayerData.date - now;

  if (difference <= 0) {

    loadPrayerTimes();

    return;
  }

  const hours =
    Math.floor(
      difference /
      (1000 * 60 * 60)
    );

  const minutes =
    Math.floor(
      (difference %
        (1000 * 60 * 60)) /
      (1000 * 60)
    );

  const seconds =
    Math.floor(
      (difference %
        (1000 * 60)) /
      1000
    );

  countdownElement.textContent =
    `متبقي ${formatNumber(hours)}:${formatNumber(minutes)}:${formatNumber(seconds)}`;

}


// ===============================
// التنقل
// ===============================

function setupNavigation() {

  const navItems =
    document.querySelectorAll(".nav-item");

  navItems.forEach((item) => {

    item.addEventListener("click", () => {

      navItems.forEach((nav) => {
        nav.classList.remove("active");
      });

      item.classList.add("active");

    });

  });

}


// ===============================
// الأرقام
// ===============================

function formatNumber(number) {

  return String(number)
    .padStart(2, "0");

}
