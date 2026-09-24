// =========================
// أنياس - النسخة الجديدة
// =========================


// =========================
// تشغيل التطبيق
// =========================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    loadPrayerTimes();

    startPrayerCountdown();

    setupNavigation();

    updateHomeDate();

    updateDailyDhikr();

  }
);


// =========================
// التنقل بين الصفحات
// =========================

function setupNavigation() {

  const buttons =
    document.querySelectorAll(
      "#bottomNavigation button, [data-page]"
    );


  buttons.forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const pageId =
          button.dataset.page;

        if (!pageId) {
          return;
        }


        // إخفاء كل الصفحات

        document
          .querySelectorAll(".page")
          .forEach(page => {

            page.classList.remove(
              "active"
            );

          });


        // إظهار الصفحة المطلوبة

        const page =
          document.getElementById(
            pageId
          );

        if (page) {

          page.classList.add(
            "active"
          );

        }


        // تحديث الزر النشط

        document
          .querySelectorAll(
            "#bottomNavigation button"
          )
          .forEach(navButton => {

            navButton.classList.toggle(
              "active",
              navButton.dataset.page ===
              pageId
            );

          });


        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });

      }
    );

  });

}


// =========================
// مواقيت الصلاة
// =========================

async function loadPrayerTimes() {

  const locationName =
    document.getElementById(
      "locationName"
    );


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

        const response =
          await fetch(
            `https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=5`
          );


        if (!response.ok) {

          throw new Error(
            "فشل الاتصال بالخدمة"
          );

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


        if (locationName) {

          locationName.textContent =
            "موقعك الحالي";

        }


        updateNextPrayer();

      }


      catch (error) {

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
    document.getElementById(
      elementId
    );


  if (!element || !time) {

    return;

  }


  element.textContent =
    convertTo12Hour(time);

}


// =========================
// تحويل الوقت
// =========================

function convertTo12Hour(
  time
) {

  const parts =
    time.split(":");


  let hour =
    Number(parts[0]);


  const minute =
    parts[1];


  const period =
    hour >= 12
      ? "م"
      : "ص";


  hour =
    hour % 12;


  if (hour === 0) {

    hour = 12;

  }


  return `${hour}:${minute} ${period}`;

}


// =========================
// الصلاة القادمة
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


  let nextPrayer =
    null;


  for (
    const prayer of prayers
  ) {

    const time =
      window.todayTimings[
        prayer.key
      ];


    if (!time) {

      continue;

    }


    const [
      hour,
      minute
    ] =
      time
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

        name:
          prayer.name,

        time:
          prayerDate

      };


      break;

    }

  }


  // بعد العشاء → فجر الغد

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
      fajrTime
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


  updateHomePrayer();

  updateCountdown();

}


// =========================
// عداد الصلاة
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


  if (
    difference <= 0
  ) {

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


  updateHomePrayer();

}


// =========================
// تشغيل العداد
// =========================

function startPrayerCountdown() {

  setInterval(
    updateCountdown,
    1000
  );

}


// =========================
// التاريخ الهجري
// =========================

function getHijriDateParts(
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
      formatter.formatToParts(
        date
      );


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

  }


  catch (error) {

    console.error(
      "خطأ في التاريخ الهجري:",
      error
    );

    return null;

  }

}


// =========================
// عرض التاريخ الهجري
// =========================

function updateHomeDate() {

  const element =
    document.getElementById(
      "homeHijriDate"
    );


  if (!element) {

    return;

  }


  const hijri =
    getHijriDateParts();


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
    `${hijri.day} ` +
    `${months[hijri.month] || ""} ` +
    `${hijri.year} هـ`;

}


// =========================
// ذكر اليوم
// =========================

function updateDailyDhikr() {

  const element =
    document.getElementById(
      "dailyDhikr"
    );


  if (!element) {

    return;

  }


  const adhkar = [

    "سُبْحَانَ اللهِ وَبِحَمْدِهِ، سُبْحَانَ اللهِ العَظِيمِ.",

    "لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ.",

    "أَسْتَغْفِرُ اللهَ وَأَتُوبُ إِلَيْهِ.",

    "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ."

  ];


  const day =
    new Date().getDate();


  element.textContent =
    adhkar[
      day % adhkar.length
    ];

}


// =========================
// تحديث الرئيسية
// =========================

function updateHomePrayer() {

  const name =
    document.getElementById(
      "homeNextPrayerName"
    );


  const time =
    document.getElementById(
      "homeNextPrayerTime"
    );


  const countdown =
    document.getElementById(
      "homeCountdown"
    );


  if (
    !window.nextPrayer
  ) {

    return;

  }


  if (name) {

    name.textContent =
      window.nextPrayer.name;

  }


  if (time) {

    time.textContent =
      convertTo12Hour(

        `${String(
          window.nextPrayer.time.getHours()
        ).padStart(2, "0")}:` +

        `${String(
          window.nextPrayer.time.getMinutes()
        ).padStart(2, "0")}`

      );

  }


  if (countdown) {

    const difference =
      window.nextPrayer.time -
      new Date();


    if (
      difference > 0
    ) {

      const hours =
        Math.floor(
          difference / 3600000
        );


      const minutes =
        Math.floor(
          (difference % 3600000) /
          60000
        );


      const seconds =
        Math.floor(
          (difference % 60000) /
          1000
        );


      countdown.textContent =

        `${String(hours).padStart(2, "0")}:` +

        `${String(minutes).padStart(2, "0")}:` +

        `${String(seconds).padStart(2, "0")}`;

    }

  }

}
