// ===============================
// أنياس
// مواقيت الصلاة
// العد التنازلي
// نظام الأذان
// أذان الفجر منفصل
// إعدادات الصوت
// ===============================


document.addEventListener(
  "DOMContentLoaded",
  () => {

    updateDate();

    setupNavigation();

    setupAdhan();

    setupAudioSettings();

    loadPrayerTimes();

    setInterval(
      updateCountdown,
      1000
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
// مواقيت الصلاة
// ===============================

async function loadPrayerTimes() {

  // القاهرة مؤقتًا
  // لاحقًا سنستخدم موقع الهاتف

  const latitude =
    30.0444;

  const longitude =
    31.2357;


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
      "خطأ في جلب مواقيت الصلاة:",
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
    document.getElementById(
      id
    );


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


  if (!countdownElement) return;


  if (!window.nextPrayerData) return;


  const now =
    new Date();


  const difference =
    window.nextPrayerData.date -
    now;


  if (difference <= 0) {

    playAutomaticAdhan();

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
// اختيار ملف الأذان
// ===============================

function getAdhanAudio() {

  const prayer =
    window.nextPrayerData;


  if (!prayer) {

    return document.getElementById(
      "adhanAudio"
    );

  }


  if (
    prayer.key === "Fajr"
  ) {

    return document.getElementById(
      "fajrAudio"
    );

  }


  return document.getElementById(
    "adhanAudio"
  );

}


// ===============================
// زر تشغيل الأذان
// ===============================

function setupAdhan() {

  const adhanButton =
    document.getElementById(
      "adhanButton"
    );


  if (!adhanButton) return;


  adhanButton.addEventListener(
    "click",
    () => {

      const audio =
        getAdhanAudio();


      if (!audio) return;


      audio.volume =
        getSavedVolume();


      if (audio.paused) {

        audio.currentTime = 0;


        audio
          .play()
          .then(() => {

            adhanButton.textContent =
              "⏸ إيقاف الأذان";

          })
          .catch(error => {

            console.error(
              "تعذر تشغيل الأذان:",
              error
            );

          });

      } else {

        audio.pause();


        adhanButton.textContent =
          "▶ تشغيل الأذان";

      }

    }
  );


  const normalAudio =
    document.getElementById(
      "adhanAudio"
    );


  const fajrAudio =
    document.getElementById(
      "fajrAudio"
    );


  [normalAudio, fajrAudio]
    .forEach(audio => {

      if (!audio) return;


      audio.addEventListener(
        "ended",
        () => {

          adhanButton.textContent =
            "▶ تشغيل الأذان";

        }
      );

    });

}


// ===============================
// إعدادات الصوت
// ===============================

function setupAudioSettings() {

  const autoAdhan =
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


  if (
    !autoAdhan ||
    !volumeSlider ||
    !volumeValue ||
    !testButton
  ) {

    return;

  }


  // =========================
  // استرجاع الإعدادات
  // =========================

  const savedAuto =
    localStorage.getItem(
      "anyas_auto_adhan"
    );


  const savedVolume =
    localStorage.getItem(
      "anyas_adhan_volume"
    );


  autoAdhan.checked =
    savedAuto === null
      ? true
      : savedAuto === "true";


  volumeSlider.value =
    savedVolume === null
      ? 100
      : savedVolume;


  updateVolume();


  // =========================
  // الأذان التلقائي
  // =========================

  autoAdhan.addEventListener(
    "change",
    () => {

      localStorage.setItem(
        "anyas_auto_adhan",
        autoAdhan.checked
      );

    }
  );


  // =========================
  // مستوى الصوت
  // =========================

  volumeSlider.addEventListener(
    "input",
    () => {

      localStorage.setItem(
        "anyas_adhan_volume",
        volumeSlider.value
      );


      updateVolume();


      const normalAudio =
        document.getElementById(
          "adhanAudio"
        );


      const fajrAudio =
        document.getElementById(
          "fajrAudio"
        );


      const volume =
        getSavedVolume();


      if (normalAudio) {

        normalAudio.volume =
          volume;

      }


      if (fajrAudio) {

        fajrAudio.volume =
          volume;

      }

    }
  );


  // =========================
  // تجربة الأذان
  // =========================

  testButton.addEventListener(
    "click",
    () => {

      const audio =
        getAdhanAudio();


      if (!audio) return;


      audio.volume =
        getSavedVolume();


      audio.currentTime = 0;


      audio
        .play()
        .catch(error => {

          console.error(
            "تعذر تشغيل الأذان:",
            error
          );

        });

    }
  );


  function updateVolume() {

    volumeValue.textContent =
      `${volumeSlider.value}%`;

  }

}


// ===============================
// تشغيل الأذان تلقائيًا
// ===============================

function playAutomaticAdhan() {

  const autoAdhan =
    localStorage.getItem(
      "anyas_auto_adhan"
    );


  if (
    autoAdhan === "false"
  ) {

    return;

  }


  const audio =
    getAdhanAudio();


  if (!audio) return;


  audio.volume =
    getSavedVolume();


  audio.currentTime =
    0;


  audio
    .play()
    .catch(error => {

      console.log(
        "المتصفح منع التشغيل التلقائي:",
        error
      );

    });

}


// ===============================
// مستوى الصوت المحفوظ
// ===============================

function getSavedVolume() {

  const volume =
    localStorage.getItem(
      "anyas_adhan_volume"
    );


  if (volume === null) {

    return 1;

  }


  return (
    Number(volume) / 100
  );

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
    item => {

      item.addEventListener(
        "click",
        () => {

          navItems.forEach(
            nav => {

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
