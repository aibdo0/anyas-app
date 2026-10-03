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

  function timeToday(name, fallbackHour, fallbackMinute, date = new Date()) {
    const raw = window.todayTimings?.[name];
    const match = typeof raw === "string" && raw.match(/(\d{1,2}):(\d{2})/);
    const result = new Date(date);
    result.setSeconds(0, 0);
    result.setHours(match ? Number(match[1]) : fallbackHour, match ? Number(match[2]) : fallbackMinute, 0, 0);
    return result;
  }

  function getFridayState(now = new Date()) {
    const fajr = timeToday("Fajr", 5, 0, now);
    const dhuhr = timeToday("Dhuhr", 12, 0, now);
    const asr = timeToday("Asr", 15, 30, now);
    const maghrib = timeToday("Maghrib", 18, 0, now);
    const isFriday = now.getDay() === 5;
    const fridayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    fridayDate.setDate(fridayDate.getDate() + ((5 - fridayDate.getDay() + 7) % 7));
    const fridayEnd = new Date(fridayDate);
    fridayEnd.setHours(23, 59, 59, 999);
    const thursdayDate = new Date(fridayDate);
    thursdayDate.setDate(thursdayDate.getDate() - 1);
    const salawatStart = timeToday("Maghrib", 18, 0, thursdayDate);
    const salawatEnd = fridayEnd;
    const isThursdayEvening = now.getDay() === 4 && now >= salawatStart;
    const isWeeklyWindow = isThursdayEvening || (isFriday && now <= fridayEnd);
    const isSalawatWindow = isWeeklyWindow;
    const isPrayerWindow = isFriday && now >= new Date(dhuhr.getTime() - 45 * 60 * 1000) && now < new Date(dhuhr.getTime() + 60 * 60 * 1000);
    const isAnswerHour = isFriday && now >= asr && now < maghrib;
    return { isFriday, isThursdayEvening, isWeeklyWindow, fridayDate, fridayEnd, fajr, dhuhr, asr, maghrib, salawatStart, salawatEnd, isSalawatWindow, isPrayerWindow, isAnswerHour };
  }

  function renderCards(now = new Date()) {
    const state = getFridayState(now);
    const homeSection = document.querySelector(".friday-feature-section");
    const homeCard = document.getElementById("homeFridayCard");
    const homeBadge = document.getElementById("homeFridayBadge");
    const homeText = document.getElementById("homeFridayText");
    const homeMeta = document.getElementById("homeFridayMeta");
    const azkarText = document.getElementById("azkarFridayText");
    const azkarCard = document.getElementById("azkarFridayCard");
    const tasksCard = document.getElementById("fridayTasksCard");
    const tasksStatus = document.getElementById("fridayTasksStatus");

    let phase = "upcoming";
    let badge = "الجمعة";
    let text = state.isFriday ? "جمعة مباركة؛ ابدأ بسورة الكهف وأكثر من الصلاة على النبي ﷺ." : "بدأ وقت الجمعة؛ أكثر من الصلاة على النبي ﷺ واستعد لمهام اليوم المبارك.";
    let meta = "الصلاة على النبي: من مغرب الخميس إلى نهاية يوم الجمعة";
    if (state.isPrayerWindow) { phase = "prayer"; badge = "وقت الصلاة"; text = "حان وقت صلاة الجمعة؛ نسأل الله أن يتقبل منك."; }
    else if (state.isAnswerHour) { phase = "active"; badge = "ساعة الإجابة"; text = "من بعد العصر إلى المغرب؛ أكثر من الدعاء في هذه الساعة."; }
    else if (state.isSalawatWindow) { phase = "salawat"; badge = "الصلاة على النبي ﷺ"; text = "أكثر من الصلاة على النبي ﷺ حتى نهاية يوم الجمعة."; }
    else if (state.isFriday) { phase = "active"; badge = "جمعة مباركة"; }

    if (homeSection) homeSection.hidden = !state.isWeeklyWindow;
    if (azkarCard) azkarCard.hidden = !state.isWeeklyWindow;
    if (tasksCard) tasksCard.hidden = !state.isWeeklyWindow;
    if (homeCard) homeCard.dataset.fridayPhase = phase;
    if (homeBadge) homeBadge.textContent = badge;
    if (homeText) homeText.textContent = text;
    if (homeMeta) homeMeta.textContent = meta;
    if (azkarText) azkarText.textContent = `${badge} · ${text}`;
    if (tasksStatus) tasksStatus.textContent = state.isThursdayEvening ? "بدأ وقت الجمعة · تقبل الله طاعتكم" : state.isFriday ? "مهام الجمعة اليوم · تقبل الله" : "تظهر مهام الجمعة من مغرب الخميس إلى نهاية يوم الجمعة";
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
    if (typeof recordAnyasNotification === "function") recordAnyasNotification(title, body, `anyas-${id}`);
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
    if (state.isThursdayEvening && sameMinute(state.salawatStart)) sendNotification("notifyFridaySalawat", "الصلاة على النبي ﷺ", "بدأ وقت الصلاة على النبي من مغرب الخميس إلى نهاية يوم الجمعة.", now);
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
