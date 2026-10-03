(() => {
  "use strict";

  const settings = {
    notifyFridayKahf: "anyas_notifyFridayKahf",
    notifyFridayPrayer: "anyas_notifyFridayPrayer",
    notifyFridayHour: "anyas_notifyFridayHour",
    notifyFridaySalawat: "anyas_notifyFridaySalawat",
    notificationSound: "anyas_notificationSound"
  };

  const isEnabled = id => localStorage.getItem(settings[id]) === "true";
  const pad = value => String(value).padStart(2, "0");
  const dateKey = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const arabicTime = date => date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });

  function timeToday(name, fallbackHour, fallbackMinute) {
    const raw = window.todayTimings?.[name];
    const match = typeof raw === "string" && raw.match(/(\d{1,2}):(\d{2})/);
    const result = new Date();
    result.setSeconds(0, 0);
    result.setHours(match ? Number(match[1]) : fallbackHour, match ? Number(match[2]) : fallbackMinute, 0, 0);
    return result;
  }

  function getFridayState(now = new Date()) {
    const fajr = timeToday("Fajr", 5, 0);
    const dhuhr = timeToday("Dhuhr", 12, 0);
    const asr = timeToday("Asr", 15, 30);
    const maghrib = timeToday("Maghrib", 18, 0);
    const isFriday = now.getDay() === 5;
    const isThursdayEvening = now.getDay() === 4 && now >= maghrib;
    const salawatStart = isThursdayEvening ? maghrib : new Date(maghrib.getTime() - 24 * 60 * 60 * 1000);
    const salawatEnd = isThursdayEvening ? new Date(maghrib.getTime() + 24 * 60 * 60 * 1000) : maghrib;
    const isSalawatWindow = (isFriday || isThursdayEvening) && now >= salawatStart && now < salawatEnd;
    const isPrayerWindow = isFriday && now >= new Date(dhuhr.getTime() - 45 * 60 * 1000) && now < new Date(dhuhr.getTime() + 60 * 60 * 1000);
    const isAnswerHour = isFriday && now >= asr && now < maghrib;
    return { isFriday, isThursdayEvening, fajr, dhuhr, asr, maghrib, salawatStart, salawatEnd, isSalawatWindow, isPrayerWindow, isAnswerHour };
  }

  function renderCards() {
    const state = getFridayState();
    const homeCard = document.getElementById("homeFridayCard");
    const homeBadge = document.getElementById("homeFridayBadge");
    const homeText = document.getElementById("homeFridayText");
    const homeMeta = document.getElementById("homeFridayMeta");
    const azkarText = document.getElementById("azkarFridayText");

    let phase = "upcoming";
    let badge = "الجمعة";
    let text = state.isFriday ? "جمعة مباركة؛ ابدأ بسورة الكهف وأكثر من الصلاة على النبي ﷺ." : "تذكير أسبوعي بسورة الكهف وصلاة الجمعة والصلاة على النبي ﷺ.";
    let meta = `الصلاة على النبي: من ${arabicTime(state.salawatStart)} إلى ${arabicTime(state.salawatEnd)}`;
    if (state.isPrayerWindow) { phase = "prayer"; badge = "وقت الصلاة"; text = "حان وقت صلاة الجمعة؛ نسأل الله أن يتقبل منك."; }
    else if (state.isAnswerHour) { phase = "active"; badge = "ساعة الإجابة"; text = "من بعد العصر إلى المغرب؛ أكثر من الدعاء في هذه الساعة."; }
    else if (state.isSalawatWindow) { phase = "salawat"; badge = "الصلاة على النبي ﷺ"; text = "أكثر من الصلاة على النبي ﷺ حتى مغرب الجمعة."; }
    else if (state.isFriday) { phase = "active"; badge = "جمعة مباركة"; }

    if (homeCard) homeCard.dataset.fridayPhase = phase;
    if (homeBadge) homeBadge.textContent = badge;
    if (homeText) homeText.textContent = text;
    if (homeMeta) homeMeta.textContent = meta;
    if (azkarText) azkarText.textContent = state.isFriday ? `${badge} · ${text}` : "تذكير أسبوعي: سورة الكهف، صلاة الجمعة، والصلاة على النبي ﷺ";
  }

  function openFridayTasks() {
    const tasks = document.querySelector('.nav-item[data-page="tasks"]');
    if (tasks) tasks.click();
  }

  function playNotificationSound() {
    if (!isEnabled("notificationSound")) return;
    const audio = document.getElementById("fridayReminderAudio") || document.getElementById("ayatKursiAudio") || document.getElementById("adhanAudio");
    if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
  }

  function sendNotification(id, title, body, target) {
    if (!isEnabled(id) || !("Notification" in window) || Notification.permission !== "granted") return;
    const key = `anyas_friday_notice_${id}_${dateKey(target)}`;
    if (localStorage.getItem(key) === "true") return;
    localStorage.setItem(key, "true");
    new Notification(title, { body, tag: `anyas-${id}`, icon: "assets/anyas-app-icon.png", badge: "assets/anyas-app-icon.png", dir: "rtl", lang: "ar" });
    playNotificationSound();
  }

  function checkNotifications() {
    const now = new Date();
    const state = getFridayState(now);
    const sameMinute = (target, tolerance = 90) => Math.abs(now.getTime() - target.getTime()) <= tolerance * 1000;
    const friday = now.getDay() === 5;
    if (friday && sameMinute(state.fajr)) sendNotification("notifyFridayKahf", "سورة الكهف", "لا تنس قراءة سورة الكهف اليوم.", now);
    if (friday && sameMinute(new Date(state.dhuhr.getTime() - 45 * 60 * 1000))) sendNotification("notifyFridayPrayer", "صلاة الجمعة", "استعد لصلاة الجمعة بحسب توقيت مسجدك.", now);
    if (friday && sameMinute(state.asr)) sendNotification("notifyFridayHour", "ساعة الإجابة", "من بعد العصر إلى المغرب؛ أكثر من الدعاء.", now);
    if (state.isThursdayEvening && sameMinute(state.salawatStart)) sendNotification("notifyFridaySalawat", "الصلاة على النبي ﷺ", "بدأ وقت الصلاة على النبي من مغرب الخميس إلى مغرب الجمعة.", now);
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderCards();
    document.getElementById("homeFridayAction")?.addEventListener("click", openFridayTasks);
    document.getElementById("azkarFridayAction")?.addEventListener("click", openFridayTasks);
    setInterval(() => { renderCards(); checkNotifications(); }, 30 * 1000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) { renderCards(); checkNotifications(); } });
  });

  window.anyasFriday = Object.freeze({ getFridayState, renderCards, checkNotifications });
})();
