// ===============================
// أنياس
// مواقيت الصلاة + العد التنازلي
// + مشغل الأذان + الأذكار
// ===============================


document.addEventListener(
  "DOMContentLoaded",
  () => {

    updateDate();

    setupNavigation();

    setupAdhan();

    setupAdhanSettings();

    setupAzkarCategories();

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
// تحديد الموقع الجغرافي
// ===============================

function detectLocationAndLoadTimes() {


  const fallbackLat = 30.0444;
  const fallbackLng = 31.2357;


  if (!navigator.geolocation) {

    const nameEl = document.getElementById("locationName");

    if (nameEl) {
      nameEl.textContent =
        "📍 القاهرة (المتصفح لا يدعم تحديد الموقع)";
    }

    loadPrayerTimes(fallbackLat, fallbackLng);
    return;

  }


  navigator.geolocation.getCurrentPosition(

    (position) => {

      const { latitude, longitude } = position.coords;

      loadPrayerTimes(latitude, longitude);
      fetchCityName(latitude, longitude);

    },

    (error) => {

      const nameEl = document.getElementById("locationName");

      if (nameEl) {
        nameEl.textContent =
          "📍 القاهرة (تعذر تحديد موقعك)";
      }

      loadPrayerTimes(fallbackLat, fallbackLng);

    },

    { timeout: 8000, maximumAge: 1000 * 60 * 30 }

  );

}


async function fetchCityName(latitude, longitude) {


  const nameEl = document.getElementById("locationName");


  try {

    const url =
      `https://nominatim.openstreetmap.org/reverse` +
      `?format=json&lat=${latitude}&lon=${longitude}` +
      `&accept-language=ar`;

    const response = await fetch(url);
    const data = await response.json();
    const address = data.address || {};

    const city =
      address.city || address.town ||
      address.village || address.county ||
      "موقعك الحالي";

    const country = address.country || "";

    if (nameEl) {
      nameEl.textContent =
        `📍 ${city}${country ? "، " + country : ""}`;
    }

  } catch (error) {

    console.error("تعذر جلب اسم المدينة:", error);

    if (nameEl) nameEl.textContent = "📍 موقعك الحالي";

  }

}


// ===============================
// مواقيت الصلاة
// ===============================

async function loadPrayerTimes(latitude, longitude) {


  const today = new Date();

  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = today.getFullYear();


  const url =
    `https://api.aladhan.com/v1/timings/${day}-${month}-${year}` +
    `?latitude=${latitude}&longitude=${longitude}&method=5`;


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

    window.todayTimings = timings;
    window.lastKnownLocation = { latitude, longitude };

    setPrayerTime("fajrTime", timings.Fajr);
    setPrayerTime("sunriseTime", timings.Sunrise);
    setPrayerTime("dhuhrTime", timings.Dhuhr);
    setPrayerTime("asrTime", timings.Asr);
    setPrayerTime("maghribTime", timings.Maghrib);
    setPrayerTime("ishaTime", timings.Isha);

    updateNextPrayer(timings);

  } catch (error) {

    console.error("حدث خطأ في جلب مواقيت الصلاة:", error);

  }

}


function setPrayerTime(id, time) {

  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = convertTo12Hour(time);

}


function convertTo12Hour(time) {

  const [hour, minute] = time.split(":").map(Number);
  const period = hour >= 12 ? "م" : "ص";
  let h = hour % 12;
  if (h === 0) h = 12;

  return (
    `${String(h).padStart(2, "0")}:` +
    `${String(minute).padStart(2, "0")} ${period}`
  );

}


// ===============================
// الصلاة القادمة
// ===============================

function updateNextPrayer(timings) {


  const prayers = [
    { name: "الفجر", key: "Fajr", time: timings.Fajr },
    { name: "الظهر", key: "Dhuhr", time: timings.Dhuhr },
    { name: "العصر", key: "Asr", time: timings.Asr },
    { name: "المغرب", key: "Maghrib", time: timings.Maghrib },
    { name: "العشاء", key: "Isha", time: timings.Isha }
  ];


  const now = new Date();
  let nextPrayer = null;


  for (const prayer of prayers) {

    const [hour, minute] = prayer.time.split(":").map(Number);
    const prayerDate = new Date();
    prayerDate.setHours(hour, minute, 0, 0);

    if (prayerDate > now) {
      nextPrayer = { ...prayer, date: prayerDate };
      break;
    }

  }


  if (!nextPrayer) {

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [hour, minute] = prayers[0].time.split(":").map(Number);
    tomorrow.setHours(hour, minute, 0, 0);

    nextPrayer = { ...prayers[0], date: tomorrow };

  }


  window.nextPrayerData = nextPrayer;

  const nameElement = document.getElementById("nextPrayerName");
  const timeElement = document.getElementById("nextPrayerTime");

  if (nameElement) nameElement.textContent = nextPrayer.name;
  if (timeElement) timeElement.textContent = convertTo12Hour(nextPrayer.time);

  updateCountdown();

}


// ===============================
// العد التنازلي
// ===============================

function updateCountdown() {


  const countdownElement = document.getElementById("countdown");

  if (!countdownElement) return;
  if (!window.nextPrayerData) return;


  const now = new Date();
  const difference = window.nextPrayerData.date - now;


  if (difference <= 0) {

    const location = window.lastKnownLocation;

    if (location) {
      loadPrayerTimes(location.latitude, location.longitude);
    } else {
      detectLocationAndLoadTimes();
    }

    return;

  }


  const hours = Math.floor(difference / (1000 * 60 * 60));

  const minutes = Math.floor(
    (difference % (1000 * 60 * 60)) / (1000 * 60)
  );

  const seconds = Math.floor(
    (difference % (1000 * 60)) / 1000
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


  const adhanButton = document.getElementById("adhanButton");
  const adhanAudio = document.getElementById("adhanAudio");

  if (!adhanButton || !adhanAudio) return;


  adhanButton.addEventListener("click", () => {

    if (adhanAudio.paused) {

      adhanAudio.play()
        .then(() => {
          adhanButton.textContent = "⏸ إيقاف الأذان";
        })
        .catch((error) => {
          console.error("تعذر تشغيل الأذان:", error);
          adhanButton.textContent = "▶ تشغيل الأذان";
        });

    } else {

      adhanAudio.pause();
      adhanButton.textContent = "▶ تشغيل الأذان";

    }

  });


  adhanAudio.addEventListener("ended", () => {
    adhanButton.textContent = "▶ تشغيل الأذان";
  });


}


// ===============================
// إعدادات الصوت
// ===============================

function setupAdhanSettings() {


  const autoAdhanToggle = document.getElementById("autoAdhan");
  const volumeSlider = document.getElementById("adhanVolume");
  const volumeValue = document.getElementById("volumeValue");
  const testButton = document.getElementById("testAdhanButton");
  const adhanAudio = document.getElementById("adhanAudio");
  const fajrAudio = document.getElementById("fajrAudio");


  const savedAuto = localStorage.getItem("anyas_autoAdhan");
  const savedVolume = localStorage.getItem("anyas_adhanVolume");


  if (autoAdhanToggle && savedAuto !== null) {
    autoAdhanToggle.checked = savedAuto === "true";
  }


  const initialVolume =
    savedVolume !== null ? Number(savedVolume) : 100;


  if (volumeSlider) volumeSlider.value = initialVolume;
  if (volumeValue) volumeValue.textContent = `${initialVolume}%`;

  applyVolume(initialVolume);


  if (autoAdhanToggle) {
    autoAdhanToggle.addEventListener("change", () => {
      localStorage.setItem("anyas_autoAdhan", autoAdhanToggle.checked);
    });
  }


  if (volumeSlider) {

    volumeSlider.addEventListener("input", () => {

      const value = Number(volumeSlider.value);

      if (volumeValue) volumeValue.textContent = `${value}%`;

      applyVolume(value);

      localStorage.setItem("anyas_adhanVolume", value);

    });

  }


  if (testButton && adhanAudio) {

    testButton.addEventListener("click", () => {
      adhanAudio.currentTime = 0;
      adhanAudio.play().catch((error) => {
        console.error("تعذر تشغيل تجربة الأذان:", error);
      });
    });

  }


  function applyVolume(value) {

    const normalized = value / 100;

    if (adhanAudio) adhanAudio.volume = normalized;
    if (fajrAudio) fajrAudio.volume = normalized;

  }

}


// ===============================
// التحقق من دخول وقت صلاة
// ===============================

function checkAutoAdhan() {


  const autoAdhanToggle = document.getElementById("autoAdhan");

  if (!autoAdhanToggle || !autoAdhanToggle.checked) return;
  if (!window.todayTimings) return;


  const prayers = [
    { key: "Fajr", time: window.todayTimings.Fajr },
    { key: "Dhuhr", time: window.todayTimings.Dhuhr },
    { key: "Asr", time: window.todayTimings.Asr },
    { key: "Maghrib", time: window.todayTimings.Maghrib },
    { key: "Isha", time: window.todayTimings.Isha }
  ];


  const now = new Date();

  const currentHM =
    `${String(now.getHours()).padStart(2, "0")}:` +
    `${String(now.getMinutes()).padStart(2, "0")}`;

  const todayKey = now.toDateString();


  for (const prayer of prayers) {

    if (
      prayer.time === currentHM &&
      window.lastAdhanFired !== `${todayKey}-${prayer.key}`
    ) {

      window.lastAdhanFired = `${todayKey}-${prayer.key}`;
      playAdhanFor(prayer.key);
      break;

    }

  }

}


function playAdhanFor(prayerKey) {


  const fajrAudio = document.getElementById("fajrAudio");
  const adhanAudio = document.getElementById("adhanAudio");

  const audioToPlay =
    prayerKey === "Fajr" && fajrAudio ? fajrAudio : adhanAudio;

  if (!audioToPlay) return;

  audioToPlay.currentTime = 0;

  audioToPlay.play().catch((error) => {
    console.error("تعذر تشغيل الأذان التلقائي:", error);
  });

}


// ===============================
// التنقل بين الصفحات
// ===============================

function setupNavigation() {


  const navItems = document.querySelectorAll(".nav-item");


  navItems.forEach((item) => {

    item.addEventListener("click", () => {

      const targetPage = item.getAttribute("data-page");

      if (!targetPage) return;

      navItems.forEach((nav) => nav.classList.remove("active"));
      item.classList.add("active");

      goToPage(targetPage);

    });

  });

}


function goToPage(pageId) {

  document
    .querySelectorAll(".page")
    .forEach((page) => page.classList.remove("active"));

  const pageElement =
    document.getElementById(`page-${pageId}`);

  if (pageElement) pageElement.classList.add("active");

}


// ===============================
// بيانات الأذكار (مقسّمة بالفئات)
// من "حصن المسلم" - سعيد بن علي القحطاني
// الأقسام المؤكدة دقتها من المصدر الرسمي
// موسومة بـ verified: true
// ===============================

const azkarCategories = {


  morning: {

    title: "أذكار الصباح",
    icon: "🌅",
    dailyReset: true,

    items: [

      {
        text: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
        count: 1
      },

      {
        text: "اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ",
        count: 1
      },

      {
        text: "اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَهَ إِلَّا أَنْتَ",
        count: 3
      },

      {
        text: "حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ، عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ",
        count: 7
      },

      {
        text: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ",
        count: 3
      },

      {
        text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
        count: 100
      },

      {
        text: "أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ",
        count: 100
      }

    ]

  },


  evening: {

    title: "أذكار المساء",
    icon: "🌙",
    dailyReset: true,

    items: [

      {
        text: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
        count: 1
      },

      {
        text: "اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ",
        count: 1
      },

      {
        text: "اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَهَ إِلَّا أَنْتَ",
        count: 3
      },

      {
        text: "حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ، عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ",
        count: 7
      },

      {
        text: "اللَّهُمَّ إِنِّي أَمْسَيْتُ أُشْهِدُكَ وَأُشْهِدُ حَمَلَةَ عَرْشِكَ وَمَلَائِكَتَكَ وَجَمِيعَ خَلْقِكَ أَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلَّا أَنْتَ وَحْدَكَ لَا شَرِيكَ لَكَ وَأَنَّ مُحَمَّدًا عَبْدُكَ وَرَسُولُكَ",
        count: 1
      },

      {
        text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
        count: 100
      },

      {
        text: "أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ",
        count: 100
      }

    ]

  },


  sleep: {

    title: "أذكار النوم",
    icon: "😴",
    dailyReset: false,

    items: [

      {
        text: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا",
        count: 1
      },

      {
        text: "اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ",
        count: 3
      },

      {
        text: "اللَّهُمَّ أَسْلَمْتُ نَفْسِي إِلَيْكَ، وَفَوَّضْتُ أَمْرِي إِلَيْكَ، وَوَجَّهْتُ وَجْهِي إِلَيْكَ، وَأَلْجَأْتُ ظَهْرِي إِلَيْكَ، رَغْبَةً وَرَهْبَةً إِلَيْكَ، لَا مَلْجَأَ وَلَا مَنْجَا مِنْكَ إِلَّا إِلَيْكَ، آمَنْتُ بِكِتَابِكَ الَّذِي أَنْزَلْتَ، وَبِنَبِيِّكَ الَّذِي أَرْسَلْتَ",
        count: 1
      },

      {
        text: "سُبْحَانَ اللَّهِ (٣٣)، وَالْحَمْدُ لِلَّهِ (٣٣)، وَاللَّهُ أَكْبَرُ (٣٤)",
        count: 1
      }

    ]

  },


  waking: {

    title: "أذكار الاستيقاظ",
    icon: "🌄",
    dailyReset: false,

    items: [

      {
        text: "الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ",
        count: 1
      },

      {
        text: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ",
        count: 1
      }

    ]

  },


  wuduBefore: {

    title: "الذكر قبل الوضوء",
    icon: "💧",
    dailyReset: false,
    verified: true,

    items: [

      {
        text: "بِسْمِ اللَّهِ",
        count: 1
      }

    ]

  },


  wuduAfter: {

    title: "الذكر بعد الوضوء",
    icon: "✅",
    dailyReset: false,
    verified: true,

    items: [

      {
        text: "أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ",
        count: 1
      },

      {
        text: "اللَّهُمَّ اجْعَلْنِي مِنَ التَّوَّابِينَ، وَاجْعَلْنِي مِنَ الْمُتَطَهِّرِينَ",
        count: 1
      },

      {
        text: "سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا أَنْتَ، أَسْتَغْفِرُكَ وَأَتُوبُ إِلَيْكَ",
        count: 1
      }

    ]

  },


  khalaa: {

    title: "دخول وخروج الخلاء",
    icon: "🚪",
    dailyReset: false,
    verified: true,

    items: [

      {
        text: "عند الدخول: بِسْمِ اللَّهِ، اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبْثِ وَالْخَبَائِثِ",
        count: 1
      },

      {
        text: "عند الخروج: غُفْرَانَكَ",
        count: 1
      }

    ]

  },


  afterPrayer: {

    title: "بعد الصلاة",
    icon: "🕌",
    dailyReset: false,

    items: [

      {
        text: "أَسْتَغْفِرُ اللَّهَ (٣ مرات)، اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ",
        count: 1
      },

      {
        text: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، اللَّهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ، وَلَا مُعْطِيَ لِمَا مَنَعْتَ، وَلَا يَنْفَعُ ذَا الْجَدِّ مِنْكَ الْجَدُّ",
        count: 1
      },

      {
        text: "سُبْحَانَ اللَّهِ",
        count: 33
      },

      {
        text: "الْحَمْدُ لِلَّهِ",
        count: 33
      },

      {
        text: "اللَّهُ أَكْبَرُ",
        count: 33
      },

      {
        text: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ (تكملة المئة)",
        count: 1
      }

    ]

  },


  distress: {

    title: "الهمّ والحزن",
    icon: "🤲",
    dailyReset: false,

    items: [

      {
        text: "اللَّهُمَّ إِنِّي عَبْدُكَ، ابْنُ عَبْدِكَ، ابْنُ أَمَتِكَ، نَاصِيَتِي بِيَدِكَ، مَاضٍ فِيَّ حُكْمُكَ، عَدْلٌ فِيَّ قَضَاؤُكَ، أَسْأَلُكَ بِكُلِّ اسْمٍ هُوَ لَكَ... أَنْ تَجْعَلَ الْقُرْآنَ رَبِيعَ قَلْبِي، وَنُورَ صَدْرِي، وَجَلَاءَ حُزْنِي، وَذَهَابَ هَمِّي",
        count: 1
      },

      {
        text: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ",
        count: 1
      },

      {
        text: "لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ",
        count: 1
      }

    ]

  },


  travel: {

    title: "دعاء السفر",
    icon: "🧳",
    dailyReset: false,

    items: [

      {
        text: "اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ",
        count: 1
      },

      {
        text: "اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى، وَمِنَ الْعَمَلِ مَا تَرْضَى، اللَّهُمَّ هَوِّنْ عَلَيْنَا سَفَرَنَا هَذَا وَاطْوِ عَنَّا بُعْدَهُ، اللَّهُمَّ أَنْتَ الصَّاحِبُ فِي السَّفَرِ، وَالْخَلِيفَةُ فِي الْأَهْلِ",
        count: 1
      },

      {
        text: "آيِبُونَ تَائِبُونَ عَابِدُونَ لِرَبِّنَا حَامِدُونَ (تقال عند الرجوع من السفر)",
        count: 1
      }

    ]

  },


  home: {

    title: "دخول وخروج المنزل",
    icon: "🏠",
    dailyReset: false,
    verified: true,

    items: [

      {
        text: "عند الدخول: بِسْمِ اللَّهِ وَلَجْنَا، وَبِسْمِ اللَّهِ خَرَجْنَا، وَعَلَى رَبِّنَا تَوَكَّلْنَا، ثُمَّ يُسَلِّمُ عَلَى أَهْلِهِ",
        count: 1
      },

      {
        text: "عند الخروج: بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ",
        count: 1
      },

      {
        text: "عند الخروج أيضًا: اللَّهُمَّ إِنِّي أَعُوذُ بِكَ أَنْ أَضِلَّ أَوْ أُضَلَّ، أَوْ أَزِلَّ أَوْ أُزَلَّ، أَوْ أَظْلِمَ أَوْ أُظْلَمَ، أَوْ أَجْهَلَ أَوْ يُجْهَلَ عَلَيَّ",
        count: 1
      }

    ]

  },


  mosque: {

    title: "دخول وخروج المسجد",
    icon: "🕋",
    dailyReset: false,

    items: [

      {
        text: "عند الدخول: أَعُوذُ بِاللَّهِ الْعَظِيمِ، وَبِوَجْهِهِ الْكَرِيمِ، وَسُلْطَانِهِ الْقَدِيمِ، مِنَ الشَّيْطَانِ الرَّجِيمِ، اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ",
        count: 1
      },

      {
        text: "عند الخروج: اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ",
        count: 1
      }

    ]

  }


};


// ===============================
// عرض قائمة أقسام الأذكار
// ===============================

function setupAzkarCategories() {


  const grid = document.getElementById("categoryGrid");
  const backButton = document.getElementById("azkarBackButton");


  if (grid) {

    Object.keys(azkarCategories).forEach((key) => {

      const category = azkarCategories[key];

      const card = document.createElement("button");
      card.type = "button";
      card.className = "category-card";

      card.innerHTML =
        `<div class="category-icon">${category.icon}</div>` +
        `<div class="category-name">${category.title}</div>`;

      card.addEventListener("click", () => {
        openAzkarCategory(key);
      });

      grid.appendChild(card);

    });

  }


  if (backButton) {

    backButton.addEventListener("click", () => {

      goToPage("azkar");

      document
        .querySelectorAll(".nav-item")
        .forEach((nav) => nav.classList.remove("active"));

      const azkarNav =
        document.querySelector('.nav-item[data-page="azkar"]');

      if (azkarNav) azkarNav.classList.add("active");

    });

  }

}


function openAzkarCategory(key) {


  const category = azkarCategories[key];

  if (!category) return;


  const titleEl =
    document.getElementById("categoryDetailTitle");

  if (titleEl) titleEl.textContent = category.title;


  goToPage("azkar-detail");


  renderAzkarCategory(key);

}


// ===============================
// تخزين تقدّم الفئات اليومية
// ===============================

function getAzkarStorageKey(key) {

  const todayKey = new Date().toDateString();
  return `anyas_azkar_${key}_${todayKey}`;

}


function loadAzkarProgress(key) {

  const raw = localStorage.getItem(getAzkarStorageKey(key));

  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch (error) {
    return {};
  }

}


function saveAzkarProgress(key, progress) {

  localStorage.setItem(
    getAzkarStorageKey(key),
    JSON.stringify(progress)
  );

}


// ===============================
// عرض أذكار قسم معيّن
// ===============================

function renderAzkarCategory(key) {


  const category = azkarCategories[key];

  if (!category) return;


  const container = document.getElementById("azkarList");

  if (!container) return;

  container.innerHTML = "";


  const progress =
    category.dailyReset ? loadAzkarProgress(key) : {};


  category.items.forEach((zikr, index) => {


    const item = document.createElement("div");


    if (category.dailyReset) {

      const remaining =
        progress[index] !== undefined
          ? progress[index]
          : zikr.count;

      const isDone = remaining <= 0;

      item.className =
        "azkar-item" + (isDone ? " done" : "");


      const textDiv = document.createElement("div");
      textDiv.className = "azkar-text";
      textDiv.textContent = zikr.text;


      const row = document.createElement("div");
      row.className = "azkar-counter-row";


      const remainingSpan = document.createElement("span");
      remainingSpan.className = "azkar-remaining";

      remainingSpan.textContent =
        isDone
          ? "✓ تم"
          : `متبقي ${remaining} من ${zikr.count}`;


      const button = document.createElement("button");
      button.type = "button";
      button.className = "azkar-count-button";
      button.textContent = isDone ? "✓" : "تسبيح";


      button.addEventListener("click", () => {

        const currentProgress = loadAzkarProgress(key);

        const current =
          currentProgress[index] !== undefined
            ? currentProgress[index]
            : zikr.count;

        const updated = Math.max(0, current - 1);

        currentProgress[index] = updated;

        saveAzkarProgress(key, currentProgress);

        renderAzkarCategory(key);

      });


      row.appendChild(remainingSpan);
      row.appendChild(button);

      item.appendChild(textDiv);
      item.appendChild(row);


    } else {


      item.className = "azkar-item";


      const textDiv = document.createElement("div");
      textDiv.className = "azkar-text";
      textDiv.textContent = zikr.text;

      item.appendChild(textDiv);


      if (zikr.count > 1) {

        const badge = document.createElement("span");
        badge.className = "repeat-badge";
        badge.textContent = `يُكرر ${zikr.count} مرات`;

        item.appendChild(badge);

      }

    }


    container.appendChild(item);

  });

}


// ===============================
// تنسيق الأرقام
// ===============================

function formatNumber(number) {
  return String(number).padStart(2, "0");
  }
