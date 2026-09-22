// ===============================
// أنياس
// مواقيت الصلاة + العد التنازلي
// + مشغل الأذان + الأذكار اليومية والهجرية
// ===============================

document.addEventListener("DOMContentLoaded", () => {
  updateDate();
  setupNavigation();
  setupAdhan();
  setupAdhanSettings();
  detectLocationAndLoadTimes();

  // تحديث العد التنازلي كل ثانية
  setInterval(updateCountdown, 1000);

  // التحقق من الأذان التلقائي كل 20 ثانية
  setInterval(checkAutoAdhan, 1000 * 20);

  // التحقق من تشغيل الأذكار الصوتية التلقائية كل دقيقة
  setInterval(checkAutoAzkar, 1000 * 60);
});

// ===============================
// بيانات آية وحديث وذكر اليوم (354 عنصرًا)
// ===============================

const dailyAyahs = [
  { text: "﴿ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ ﴾", surah: "سورة الرعد — 28" },
  { text: "﴿ وَقُل رَّبِّ زِدْنِي عِلْمًا ﴾", surah: "سورة طه — 114" },
  { text: "﴿ إِنَّ مَعَ الْعُسْرِ يُسْرًا ﴾", surah: "سورة الشرح — 6" },
  { text: "﴿ وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا ﴾", surah: "سورة الطلاق — 2" }
  // يمكن إكمال المصفوفة لـ 354 آية
];

const dailyHadiths = [
  { text: "«خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ»", source: "صحيح البخاري" },
  { text: "«إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ»", source: "متفق عليه" },
  { text: "«مَنْ صَلَّى عَلَيَّ وَاحِدَةً صَلَّى اللَّهُ عَلَيْهِ عَشْرًا»", source: "صحيح مسلم" }
  // يمكن إكمال المصفوفة لـ 354 حديثاً
];

const dailyZikr = [
  "سبحان الله وبحمده، سبحان الله العظيم",
  "لا حول ولا قوة إلا بالله العلي العظيم",
  "أستغفر الله العظيم وأتوب إليه",
  "اللهم صلِّ وسلم وبارك على نبينا محمد"
  // يمكن إكمال المصفوفة لـ 354 ذكراً
];

// ===============================
// مواعيد الأذكار الصوتية التلقائية
// ===============================

const autoAzkarSchedule = [
  { id: "sabahAudio", time: "07:00", label: "أذكار الصباح" },
  { id: "massaAudio", time: "17:00", label: "أذكار المساء" },
  { id: "sleepAudio", time: "22:30", label: "أذكار النوم" }
];

// ===============================
// التاريخ الهجري والميلادي
// ===============================

function updateDate() {
  const dateElement = document.getElementById("todayDate");
  if (!dateElement) return;

  const today = new Date();
  dateElement.textContent = today.toLocaleDateString("ar-EG", {
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
      nameEl.textContent = "القاهرة (المتصفح لا يدعم تحديد الموقع)";
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
        nameEl.textContent = "📍 القاهرة (تعذر تحديد موقعك)";
      }
      loadPrayerTimes(fallbackLat, fallbackLng);
    },
    {
      timeout: 8000,
      maximumAge: 1000 * 60 * 30
    }
  );
}

// ===============================
// جلب اسم المدينة من الإحداثيات
// ===============================

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
      address.city ||
      address.town ||
      address.village ||
      address.county ||
      "موقعك الحالي";

    const country = address.country || "";

    if (nameEl) {
      nameEl.textContent = `📍 ${city}${country ? "، " + country : ""}`;
    }
  } catch (error) {
    console.error("تعذر جلب اسم المدينة:", error);
    if (nameEl) {
      nameEl.textContent = "📍 موقعك الحالي";
    }
  }
}

// ===============================
// مواقيت الصلاة والمحتوى الهجري
// ===============================

async function loadPrayerTimes(latitude, longitude) {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = today.getFullYear();

  const url =
    `https://api.aladhan.com/v1/timings/${day}-${month}-${year}` +
    `?latitude=${latitude}` +
    `&longitude=${longitude}` +
    `&method=5`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== 200 || !data.data || !data.data.timings) {
      throw new Error("فشل الحصول على المواقيت");
    }

    const timings = data.data.timings;
    const hijriData = data.data.date.hijri;

    window.todayTimings = timings;
    window.lastKnownLocation = { latitude, longitude };

    setPrayerTime("fajrTime", timings.Fajr);
    setPrayerTime("sunriseTime", timings.Sunrise);
    setPrayerTime("dhuhrTime", timings.Dhuhr);
    setPrayerTime("asrTime", timings.Asr);
    setPrayerTime("maghribTime", timings.Maghrib);
    setPrayerTime("ishaTime", timings.Isha);

    updateNextPrayer(timings);

    // حساب يوم السنة الهجرية (1 - 354) لعرض المحتوى اليومي
    if (hijriData) {
      const hDay = parseInt(hijriData.day, 10);
      const hMonth = hijriData.month.number;
      const dayIndex = Math.floor(((hMonth - 1) * 29.5) + hDay - 1) % 354;

      updateDailyContent(dayIndex, hijriData);
    }
  } catch (error) {
    console.error("حدث خطأ في جلب مواقيت الصلاة:", error);
  }
}

// ===============================
// تحديث محتوى الواجهة (آية، حديث، ذكر)
// ===============================

function updateDailyContent(dayIndex, hijriData) {
  // التاريخ الهجري
  const hijriEl = document.getElementById("hijriDate");
  if (hijriEl && hijriData) {
    hijriEl.textContent = `${hijriData.day} ${hijriData.month.ar} ${hijriData.year} هـ`;
  }

  // آية اليوم
  const ayahTextEl = document.getElementById("ayahText");
  const ayahSurahEl = document.getElementById("ayahSurah");
  const ayah = dailyAyahs[dayIndex % dailyAyahs.length];
  if (ayahTextEl && ayah) {
    ayahTextEl.textContent = ayah.text;
    if (ayahSurahEl) ayahSurahEl.textContent = ayah.surah;
  }

  // حديث اليوم
  const hadithTextEl = document.getElementById("hadithText");
  const hadithSourceEl = document.getElementById("hadithSource");
  const hadith = dailyHadiths[dayIndex % dailyHadiths.length];
  if (hadithTextEl && hadith) {
    hadithTextEl.textContent = hadith.text;
    if (hadithSourceEl) hadithSourceEl.textContent = hadith.source;
  }

  // ذكر اليوم
  const zikrTextEl = document.getElementById("zikrText");
  const zikr = dailyZikr[dayIndex % dailyZikr.length];
  if (zikrTextEl && zikr) {
    zikrTextEl.textContent = zikr;
  }
}

// ===============================
// عرض وقت الصلاة وتحويله
// ===============================

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

  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;
}

// ===============================
// الصلاة القادمة والعد التنازلي
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

function updateCountdown() {
  const countdownElement = document.getElementById("countdown");
  if (!countdownElement || !window.nextPrayerData) return;

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
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);

  countdownElement.textContent =
    `متبقي ${formatNumber(hours)}:${formatNumber(minutes)}:${formatNumber(seconds)}`;
}

// ===============================
// مشغل الأذان الأساسي وإعدادات الصوت
// ===============================

function setupAdhan() {
  const adhanButton = document.getElementById("adhanButton");
  const adhanAudio = document.getElementById("adhanAudio");

  if (!adhanButton || !adhanAudio) return;

  adhanButton.addEventListener("click", () => {
    if (adhanAudio.paused) {
      adhanAudio.play()
        .then(() => { adhanButton.textContent = "⏸ إيقاف الأذان"; })
        .catch((err) => console.error("تعذر تشغيل الأذان:", err));
    } else {
      adhanAudio.pause();
      adhanButton.textContent = "▶ تشغيل الأذان";
    }
  });

  adhanAudio.addEventListener("ended", () => {
    adhanButton.textContent = "▶ تشغيل الأذان";
  });
}

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

  const initialVolume = savedVolume !== null ? Number(savedVolume) : 100;

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
      adhanAudio.play().catch((err) => console.error("تعذر تشغيل التجربة:", err));
    });
  }

  function applyVolume(value) {
    const normalized = value / 100;
    if (adhanAudio) adhanAudio.volume = normalized;
    if (fajrAudio) fajrAudio.volume = normalized;
  }
}

// ===============================
// الأذان التلقائي والأذكار الصوتية التلقائية
// ===============================

function checkAutoAdhan() {
  const autoAdhanToggle = document.getElementById("autoAdhan");
  if (!autoAdhanToggle || !autoAdhanToggle.checked || !window.todayTimings) return;

  const prayers = [
    { key: "Fajr", time: window.todayTimings.Fajr },
    { key: "Dhuhr", time: window.todayTimings.Dhuhr },
    { key: "Asr", time: window.todayTimings.Asr },
    { key: "Maghrib", time: window.todayTimings.Maghrib },
    { key: "Isha", time: window.todayTimings.Isha }
  ];

  const now = new Date();
  const currentHM =
    `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
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
  const audioToPlay = prayerKey === "Fajr" && fajrAudio ? fajrAudio : adhanAudio;

  if (!audioToPlay) return;

  audioToPlay.currentTime = 0;
  audioToPlay.play().catch((err) => console.error("تعذر تشغيل الأذان التلقائي:", err));
}

function checkAutoAzkar() {
  const now = new Date();
  const currentHM =
    `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const todayKey = now.toDateString();

  for (const item of autoAzkarSchedule) {
    if (
      item.time === currentHM &&
      window.lastAzkarFired !== `${todayKey}-${item.id}`
    ) {
      window.lastAzkarFired = `${todayKey}-${item.id}`;
      const audioEl = document.getElementById(item.id);
      if (audioEl) {
        audioEl.currentTime = 0;
        audioEl.play().catch((err) => console.error(`تعذر تشغيل ${item.label}:`, err));
      }
    }
  }
}

// ===============================
// التنقل وتنسيق الأرقام
// ===============================

function setupNavigation() {
  const navItems = document.querySelectorAll(".nav-item");

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      navItems.forEach((nav) => nav.classList.remove("active"));
      item.classList.add("active");
    });
  });
}

function formatNumber(number) {
  return String(number).padStart(2, "0");
}

