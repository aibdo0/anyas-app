/* =========================================================
   ANYAS - NEW APP SCRIPT
   النسخة الجديدة - بدون تعديل على النسخة القديمة
   ========================================================= */

"use strict";

/* =========================================================
   أسماء الصلوات
   ========================================================= */

const prayerNames = {
  Fajr: "الفجر",
  Sunrise: "الشروق",
  Dhuhr: "الظهر",
  Asr: "العصر",
  Maghrib: "المغرب",
  Isha: "العشاء"
};

let prayerTimes = {};
let nextPrayerKey = null;
let countdownTimer = null;


/* =========================================================
   تشغيل التطبيق
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  setupNavigation();
  setupTheme();
  setupWorshipSettings();
  setupDailyDhikr();

  updateHijriDate();

  requestLocation();

  setInterval(updateHijriDate, 60 * 60 * 1000);

});


/* =========================================================
   التنقل بين الصفحات
   ========================================================= */

function setupNavigation() {

  const buttons = document.querySelectorAll("[data-page]");

  buttons.forEach(button => {

    button.addEventListener("click", () => {

      const pageName = button.dataset.page;

      showPage(pageName);

    });

  });

}


function showPage(pageName) {

  const pages = document.querySelectorAll(".page");

  pages.forEach(page => {

    page.classList.remove("active");

  });


  const targetPage = document.getElementById(
    `${pageName}Page`
  );

  if (targetPage) {

    targetPage.classList.add("active");

  }


  const navItems = document.querySelectorAll(
    ".nav-item"
  );

  navItems.forEach(item => {

    item.classList.toggle(
      "active",
      item.dataset.page === pageName
    );

  });


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


/* =========================================================
   الوضع الليلي
   ========================================================= */

function setupTheme() {

  const themeButton =
    document.getElementById("themeButton");

  const darkToggle =
    document.getElementById("darkToggle");


  const savedTheme =
    localStorage.getItem("anyas_new_theme");


  if (savedTheme === "dark") {

    document.body.classList.add("dark");

    if (darkToggle) {
      darkToggle.checked = true;
    }

  }


  function toggleTheme() {

    document.body.classList.toggle("dark");

    const isDark =
      document.body.classList.contains("dark");

    localStorage.setItem(
      "anyas_new_theme",
      isDark ? "dark" : "light"
    );

    if (darkToggle) {
      darkToggle.checked = isDark;
    }

  }


  if (themeButton) {

    themeButton.addEventListener(
      "click",
      toggleTheme
    );

  }


  if (darkToggle) {

    darkToggle.addEventListener(
      "change",
      toggleTheme
    );

  }

}


/* =========================================================
   تحديد الموقع
   ========================================================= */

function requestLocation() {

  const locationElement =
    document.getElementById("locationText");


  if (!navigator.geolocation) {

    if (locationElement) {
      locationElement.textContent =
        "الموقع غير مدعوم في هذا المتصفح";
    }

    loadPrayerTimes(30.0444, 31.2357);

    return;
  }


  if (locationElement) {

    locationElement.textContent =
      "جارٍ تحديد موقعك...";

  }


  navigator.geolocation.getCurrentPosition(

    position => {

      const latitude =
        position.coords.latitude;

      const longitude =
        position.coords.longitude;


      loadPrayerTimes(
        latitude,
        longitude
      );


      reverseGeocode(
        latitude,
        longitude
      );

    },

    error => {

      console.warn(
        "تعذر الحصول على الموقع:",
        error
      );


      if (locationElement) {

        locationElement.textContent =
          "القاهرة";

      }


      loadPrayerTimes(
        30.0444,
        31.2357
      );

    },

    {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 600000
    }

  );

}


/* =========================================================
   اسم المكان
   ========================================================= */

async function reverseGeocode(
  latitude,
  longitude
) {

  const locationElement =
    document.getElementById("locationText");


  try {

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&accept-language=ar`,
      {
        headers: {
          "Accept": "application/json"
        }
      }
    );


    if (!response.ok) {
      throw new Error("Reverse geocoding failed");
    }


    const data =
      await response.json();


    const address =
      data.address || {};


    const city =
      address.city ||
      address.town ||
      address.village ||
      address.state ||
      "موقعك الحالي";


    if (locationElement) {

      locationElement.textContent =
        city;

    }

  } catch (error) {

    console.warn(
      "تعذر تحديد اسم المكان:",
      error
    );


    if (locationElement) {

      locationElement.textContent =
        "موقعك الحالي";

    }

  }

}


/* =========================================================
   مواقيت الصلاة
   ========================================================= */

async function loadPrayerTimes(
  latitude,
  longitude
) {

  try {

    const today =
      new Date();


    const day =
      String(today.getDate())
        .padStart(2, "0");

    const month =
      String(today.getMonth() + 1)
        .padStart(2, "0");

    const year =
      today.getFullYear();


    const url =
      `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${latitude}&longitude=${longitude}&method=5`;


    const response =
      await fetch(url);


    if (!response.ok) {

      throw new Error(
        "Prayer API request failed"
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
        "Invalid prayer data"
      );

    }


    prayerTimes =
      data.data.timings;


    updatePrayerTimesUI();

    calculateNextPrayer();


  } catch (error) {

    console.error(
      "خطأ في مواقيت الصلاة:",
      error
    );


    showPrayerError();

  }

}


/* =========================================================
   عرض مواقيت الصلاة
   ========================================================= */

function updatePrayerTimesUI() {

  setText(
    "fajrTime",
    formatTime(prayerTimes.Fajr)
  );

  setText(
    "dhuhrTime",
    formatTime(prayerTimes.Dhuhr)
  );

  setText(
    "asrTime",
    formatTime(prayerTimes.Asr)
  );

  setText(
    "maghribTime",
    formatTime(prayerTimes.Maghrib)
  );

  setText(
    "ishaTime",
    formatTime(prayerTimes.Isha)
  );


  setText(
    "fullFajr",
    formatTime(prayerTimes.Fajr)
  );

  setText(
    "sunriseTime",
    formatTime(prayerTimes.Sunrise)
  );

  setText(
    "fullDhuhr",
    formatTime(prayerTimes.Dhuhr)
  );

  setText(
    "fullAsr",
    formatTime(prayerTimes.Asr)
  );

  setText(
    "fullMaghrib",
    formatTime(prayerTimes.Maghrib)
  );

  setText(
    "fullIsha",
    formatTime(prayerTimes.Isha)
  );

}


/* =========================================================
   تنسيق الوقت
   ========================================================= */

function formatTime(time) {

  if (!time) {
    return "--:--";
  }


  const clean =
    String(time).split(" ")[0];


  const parts =
    clean.split(":");


  if (parts.length < 2) {
    return clean;
  }


  let hour =
    Number(parts[0]);

  const minute =
    parts[1];


  if (
    Number.isNaN(hour)
  ) {

    return clean;

  }


  const suffix =
    hour >= 12 ? "م" : "ص";


  hour =
    hour % 12 || 12;


  return `${hour}:${minute} ${suffix}`;

}


/* =========================================================
   الصلاة القادمة
   ========================================================= */

function calculateNextPrayer() {

  const prayerOrder = [
    "Fajr",
    "Dhuhr",
    "Asr",
    "Maghrib",
    "Isha"
  ];


  const now =
    new Date();


  let found = null;


  for (
    const prayer of prayerOrder
  ) {

    const time =
      parsePrayerTime(
        prayerTimes[prayer],
        now
      );


    if (
      time &&
      time > now
    ) {

      found = {
        key: prayer,
        time: time
      };

      break;

    }

  }


  if (!found) {

    const tomorrow =
      new Date(now);

    tomorrow.setDate(
      tomorrow.getDate() + 1
    );


    const fajrTime =
      parsePrayerTime(
        prayerTimes.Fajr,
        tomorrow
      );


    if (fajrTime) {

      found = {
        key: "Fajr",
        time: fajrTime
      };

    }

  }


  if (!found) {

    setText(
      "nextPrayerName",
      "غير متاح"
    );

    setText(
      "nextPrayerTime",
      "--:--"
    );

    return;

  }


  nextPrayerKey =
    found.key;


  setText(
    "nextPrayerName",
    prayerNames[found.key]
  );


  setText(
    "nextPrayerTime",
    formatTime(
      prayerTimes[found.key]
    )
  );


  startCountdown(
    found.time
  );


  highlightPrayer(
    found.key
  );

}


/* =========================================================
   تحويل وقت الصلاة إلى Date
   ========================================================= */

function parsePrayerTime(
  timeString,
  date
) {

  if (!timeString) {
    return null;
  }


  const clean =
    String(timeString)
      .split(" ")[0];


  const parts =
    clean.split(":");


  if (parts.length < 2) {
    return null;
  }


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


  const result =
    new Date(date);


  result.setHours(
    hour,
    minute,
    0,
    0
  );


  return result;

}


/* =========================================================
   العد التنازلي
   ========================================================= */

function startCountdown(
  targetDate
) {

  if (countdownTimer) {

    clearInterval(
      countdownTimer
    );

  }


  function update() {

    const now =
      new Date();


    let difference =
      targetDate.getTime() -
      now.getTime();


    if (difference <= 0) {

      clearInterval(
        countdownTimer
      );


      calculateNextPrayer();

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


    const text =
      `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;


    setText(
      "countdown",
      text
    );

  }


  update();


  countdownTimer =
    setInterval(
      update,
      1000
    );

}


/* =========================================================
   تمييز الصلاة القادمة
   ========================================================= */

function highlightPrayer(
  prayerKey
) {

  const cards =
    document.querySelectorAll(
      ".prayer-card"
    );


  cards.forEach(card => {

    card.classList.toggle(
      "active",
      card.dataset.prayer === prayerKey
    );

  });

}


/* =========================================================
   حالة خطأ المواقيت
   ========================================================= */

function showPrayerError() {

  const ids = [
    "fajrTime",
    "dhuhrTime",
    "asrTime",
    "maghribTime",
    "ishaTime",
    "fullFajr",
    "sunriseTime",
    "fullDhuhr",
    "fullAsr",
    "fullMaghrib",
    "fullIsha"
  ];


  ids.forEach(id => {

    setText(
      id,
      "--:--"
    );

  });


  setText(
    "nextPrayerName",
    "تعذر تحميل المواقيت"
  );


  setText(
    "nextPrayerTime",
    "--:--"
  );


  setText(
    "countdown",
    "--:--:--"
  );

}


/* =========================================================
   التاريخ الهجري
   ========================================================= */

function getHijriParts(
  date = new Date()
) {

  try {

    const formatter =
      new Intl.DateTimeFormat(
        "ar-SA-u-ca-islamic-umalqura",
        {
          day: "numeric",
          month: "numeric",
          year: "numeric"
        }
      );


    const parts =
      formatter.formatToParts(date);


    const result = {};


    parts.forEach(part => {

      if (
        part.type === "day"
      ) {

        result.day =
          Number(part.value);

      }


      if (
        part.type === "month"
      ) {

        result.month =
          Number(part.value);

      }


      if (
        part.type === "year"
      ) {

        result.year =
          Number(part.value);

      }

    });


    return result;

  } catch (error) {

    console.error(
      "Hijri date error:",
      error
    );

    return null;

  }

}


function updateHijriDate() {

  const element =
    document.getElementById(
      "hijriDate"
    );


  if (!element) {
    return;
  }


  const hijri =
    getHijriParts();


  if (!hijri) {

    element.textContent =
      "تعذر حساب التاريخ";

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
    `${hijri.day} ${months[hijri.month] || ""} ${hijri.year} هـ`;

}


/* =========================================================
   ذكر اليوم
   ========================================================= */

const dailyAdhkar = [

  "سُبْحَانَ اللهِ وَبِحَمْدِهِ، سُبْحَانَ اللهِ الْعَظِيمِ",

  "لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ",

  "سُبْحَانَ اللهِ، وَالْحَمْدُ لِلَّهِ، وَاللهُ أَكْبَرُ",

  "أَسْتَغْفِرُ اللهَ وَأَتُوبُ إِلَيْهِ",

  "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ",

  "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ",

  "رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ"

];


function setupDailyDhikr() {

  const button =
    document.getElementById(
      "newDhikrButton"
    );


  const element =
    document.getElementById(
      "dailyDhikr"
    );


  if (!button || !element) {
    return;
  }


  button.addEventListener(
    "click",
    () => {

      const current =
        element.textContent.trim();


      let next;


      do {

        next =
          dailyAdhkar[
            Math.floor(
              Math.random() *
              dailyAdhkar.length
            )
          ];

      } while (
        next === current &&
        dailyAdhkar.length > 1
      );


      element.textContent =
        next;

    }
  );

}


/* =========================================================
   إعدادات العبادات
   ========================================================= */

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


    if (!element) {
      return;
    }


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


        /*
          ملاحظة:
          هذا يحفظ اختيار المستخدم فقط.
          لا يتم هنا إنشاء إشعارات
          تعمل في الخلفية أثناء إغلاق الصفحة.
        */

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

            console.warn(
              "تعذر طلب إذن الإشعارات:",
              error
            );

          }

        }

      }
    );

  });

}


/* =========================================================
   أدوات مساعدة
   ========================================================= */

function setText(
  id,
  value
) {

  const element =
    document.getElementById(id);


  if (element) {

    element.textContent =
      value;

  }

}


function pad(number) {

  return String(number)
    .padStart(2, "0");

      }
