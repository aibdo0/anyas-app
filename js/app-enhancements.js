window.anyasFetch = async function anyasFetch(url, options = {}, config = {}) {
  const timeoutMs = Number(config.timeoutMs || 10000);
  const retries = Math.max(0, Number(config.retries ?? 1));
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controller ? window.setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const response = await fetch(url, { ...options, ...(controller ? { signal: controller.signal } : {}) });
      if (timer) window.clearTimeout(timer);
      if (response.ok || response.status < 500 || attempt === retries) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (timer) window.clearTimeout(timer);
      lastError = error;
      if (attempt === retries) break;
    }
    await new Promise(resolve => window.setTimeout(resolve, 250 * (attempt + 1)));
  }
  throw lastError || new Error("فشل طلب الشبكة");
};

(() => {
  "use strict";

  const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
  const toArabic = value => String(value).replace(/\d/g, d => ARABIC_DIGITS[d]);
  const byId = id => document.getElementById(id);
  const t = value => window.anyasTranslate ? window.anyasTranslate(value) : value;
  const prayerNames = { Fajr: "الفجر", Dhuhr: "الظهر", Asr: "العصر", Maghrib: "المغرب", Isha: "العشاء" };
  const prayerKeys = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  const prayerLabel = (key, date = new Date()) => key === "Dhuhr" && date.getDay() === 5 ? "الجمعة" : prayerNames[key];

  function initGreeting() {
    const input = byId("userNameInput");
    const greeting = byId("homeGreeting");
    const saved = localStorage.getItem("anyas_user_name") || "أخي المسلم";
    const render = () => {
      const name = (input?.value || saved || "أخي المسلم").trim() || "أخي المسلم";
      if (greeting) greeting.textContent = `السلام عليكم يا ${name}`;
    };
    if (input) {
      input.value = saved === "أخي المسلم" ? "" : saved;
      input.addEventListener("input", () => {
        const value = input.value.trim();
        localStorage.setItem("anyas_user_name", value || "أخي المسلم");
        render();
      });
    }
    render();
  }

  function openPage(id) {
    if (typeof window.goToPage === "function") window.goToPage(id);
    else document.getElementById(`page-${id}`)?.classList.add("active");
  }

  function currentCoordinates() {
    const saved = JSON.parse(localStorage.getItem("anyas_manual_location") || "null");
    return saved?.latitude && saved?.longitude ? saved : {
      latitude: window.currentLatitude,
      longitude: window.currentLongitude,
      city: byId("prayerHeroCity")?.textContent || "موقعك الحالي"
    };
  }

  function initPrayerShare() {
    const button = byId("sharePrayerTimesButton");
    const status = byId("prayerShareStatus");
    if (!button) return;
    const format = value => {
      const match = String(value || "--").match(/^(\d{1,2}):(\d{2})/);
      if (!match) return String(value || "--");
      const hour = Number(match[1]);
      if (window.getTimeFormat?.() === "24") return `${String(hour).padStart(2, "0")}:${match[2]}`;
      return `${String(hour % 12 || 12).padStart(2, "0")}:${match[2]} ${hour >= 12 ? "م" : "ص"}`;
    };
    button.addEventListener("click", async () => {
      const english = document.documentElement.lang === "en";
      const timings = window.todayTimings || {};
      const city = byId("prayerHeroCity")?.textContent || (english ? "My city" : "مدينتي");
      const names = english ? { Fajr: "Fajr", Sunrise: "Sunrise", Dhuhr: "Dhuhr", Asr: "Asr", Maghrib: "Maghrib", Isha: "Isha" } : { Fajr: "الفجر", Sunrise: "الشروق", Dhuhr: "الظهر", Asr: "العصر", Maghrib: "المغرب", Isha: "العشاء" };
      const lines = Object.keys(names).map(key => `${names[key]}: ${format(timings[key])}`);
      const text = english ? `Prayer times for ${city}\n${lines.join("\n")}\n\nShared from Anias` : `مواقيت الصلاة في ${city}\n${lines.join("\n")}\n\nمشاركة من تطبيق أنياس`;
      try {
        if (navigator.share) await navigator.share({ title: english ? "Prayer times" : "مواقيت الصلاة", text });
        else if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
        else throw new Error("clipboard unavailable");
        if (status) { status.hidden = false; status.textContent = navigator.share ? (english ? "Share sheet opened." : "تم فتح قائمة المشاركة.") : (english ? "Prayer times copied." : "تم نسخ المواقيت."); window.setTimeout(() => { status.hidden = true; }, 2800); }
      } catch (error) {
        if (error?.name !== "AbortError" && status) { status.hidden = false; status.textContent = english ? "Could not share. Try again." : "تعذر المشاركة. حاول مرة أخرى."; }
      }
    });
  }

  function initCityPicker() {
    const open = byId("openCityPickerButton");
    const back = byId("cityPickerBackButton");
    const search = byId("citySearchButton");
    const input = byId("citySearchInput");
    const results = byId("citySearchResults");
    const recentResults = byId("recentCityResults");
    const recentSection = byId("recentCitiesSection");
    const commonResults = byId("commonCityResults");
    const current = byId("useCurrentLocationButton");
    if (!open || !search || !input || !results) return;
    const recentKey = "anyas_recent_cities";
    const commonCities = Array.isArray(window.ANYAS_COMMON_CITIES) ? window.ANYAS_COMMON_CITIES : [];
    const normalize = value => String(value || "").trim().toLocaleLowerCase("ar");
    const readRecent = () => {
      try { return JSON.parse(localStorage.getItem(recentKey) || "[]").filter(item => Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude))); }
      catch (_) { return []; }
    };
    const saveRecent = location => {
      const key = `${Number(location.latitude).toFixed(3)},${Number(location.longitude).toFixed(3)}`;
      const next = [location, ...readRecent().filter(item => `${Number(item.latitude).toFixed(3)},${Number(item.longitude).toFixed(3)}` !== key)].slice(0, 5);
      try { localStorage.setItem(recentKey, JSON.stringify(next)); } catch (_) { /* optional */ }
    };
    const selectCity = location => {
      const safeLocation = { latitude: Number(location.latitude), longitude: Number(location.longitude), city: location.city || "موقعك الحالي", country: location.country || "" };
      localStorage.setItem("anyas_manual_location", JSON.stringify(safeLocation));
      localStorage.setItem("anyas_city_name", safeLocation.country ? `${safeLocation.city}، ${safeLocation.country}` : safeLocation.city);
      localStorage.setItem("anyas_location_start_choice", "manual");
      saveRecent(safeLocation);
      window.currentLatitude = safeLocation.latitude;
      window.currentLongitude = safeLocation.longitude;
      window.lastKnownLocation = safeLocation;
      const city = byId("prayerHeroCity");
      if (city) city.textContent = safeLocation.country ? `${safeLocation.city}، ${safeLocation.country}` : safeLocation.city;
      window.loadPrayerTimes?.(safeLocation.latitude, safeLocation.longitude);
      window.dispatchEvent(new CustomEvent("anyas:location-updated", { detail: safeLocation }));
      renderLocalCities();
      openPage("home");
    };
    const renderButtons = (container, cities) => {
      if (!container) return;
      container.replaceChildren();
      cities.forEach(location => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "city-result";
        button.textContent = location.country ? `${location.city}، ${location.country}` : location.city;
        button.addEventListener("click", () => selectCity(location));
        container.appendChild(button);
      });
    };
    const renderLocalCities = (query = "") => {
      const needle = normalize(query);
      const matches = city => !needle || normalize(`${city.city} ${city.country}`).includes(needle);
      const recent = readRecent().filter(matches);
      const common = commonCities.filter(matches).filter(city => !recent.some(item => Number(item.latitude).toFixed(3) === Number(city.latitude).toFixed(3) && Number(item.longitude).toFixed(3) === Number(city.longitude).toFixed(3)));
      if (recentSection) recentSection.hidden = recent.length === 0;
      renderButtons(recentResults, recent);
      renderButtons(commonResults, common.slice(0, 12));
      return recent.length + common.length;
    };
    open.addEventListener("click", () => openPage("city-picker"));
    back?.addEventListener("click", () => openPage("home"));
    renderLocalCities();
    input.addEventListener("input", () => renderLocalCities(input.value));
    current?.addEventListener("click", () => {
      try { localStorage.setItem("anyas_location_start_choice", "current"); } catch (error) { /* optional */ }
      localStorage.removeItem("anyas_manual_location");
      results.textContent = "جارٍ تحديد موقعك…";
      window.detectLocationAndLoadTimes?.();
      openPage("home");
    });
    search.addEventListener("click", async () => {
      const query = input.value.trim();
      if (!query) return;
      results.textContent = "جارٍ البحث…";
      try {
        const language = document.documentElement.lang === "en" ? "en" : "ar";
        const localMatches = commonCities.filter(city => normalize(`${city.city} ${city.country}`).includes(normalize(query)));
        if (!navigator.onLine) {
          results.replaceChildren();
          renderButtons(results, localMatches);
          if (!localMatches.length) results.textContent = "لا توجد مدينة محفوظة بهذا الاسم دون اتصال.";
          return;
        }
        const response = await window.anyasFetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=${language}&q=${encodeURIComponent(query)}`, {}, { timeoutMs: 9000, retries: 1 });
        const places = await response.json();
        results.replaceChildren();
        const seen = new Set();
        [...localMatches.map(city => ({ ...city, display_name: `${city.city}، ${city.country}` })), ...places].forEach(place => {
          const key = `${Number(place.lat ?? place.latitude).toFixed(3)},${Number(place.lon ?? place.longitude).toFixed(3)}`;
          if (seen.has(key)) return;
          seen.add(key);
          const button = document.createElement("button");
          button.type = "button";
          button.className = "city-result";
          button.textContent = place.display_name || `${place.city}، ${place.country}`;
          button.addEventListener("click", () => selectCity({ latitude: place.lat ?? place.latitude, longitude: place.lon ?? place.longitude, city: place.name || place.city || query, country: place.address?.country || place.country || "" }));
          results.appendChild(button);
        });
        if (!results.children.length) results.textContent = "لم نجد المدينة. جرّب كتابة المدينة والدولة.";
      } catch (error) {
        results.replaceChildren();
        renderButtons(results, commonCities.filter(city => normalize(`${city.city} ${city.country}`).includes(normalize(query))));
        if (!results.children.length) results.textContent = "تعذر البحث الآن. جرّب مرة أخرى أو استخدم مدينة شائعة.";
      }
    });
  }

  function initPrayerSchedule() {
    const open = byId("openPrayerScheduleButton");
    const back = byId("prayerScheduleBackButton");
    const list = byId("prayerScheduleList");
    const adjust = byId("scheduleManualAdjustButton");
    if (!open || !list) return;
    open.addEventListener("click", () => { openPage("prayer-schedule"); loadSchedule("tomorrow"); });
    back?.addEventListener("click", () => openPage("home"));
    adjust?.addEventListener("click", () => byId("openManualPrayerSettings")?.click());
    document.querySelectorAll("[data-schedule-view]").forEach(tab => tab.addEventListener("click", () => {
      document.querySelectorAll("[data-schedule-view]").forEach(item => item.classList.toggle("active", item === tab));
      loadSchedule(tab.dataset.scheduleView);
    }));
    let latestScheduleRequest = 0;
    async function loadSchedule(view) {
      const requestId = ++latestScheduleRequest;
      const location = currentCoordinates();
      const latitude = Number(location?.latitude);
      const longitude = Number(location?.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) { list.textContent = "حدّد مدينتك أولًا."; return; }
      list.innerHTML = '<div class="schedule-loading">جارٍ تحميل المواقيت…</div>';
      const date = new Date();
      if (view === "tomorrow") date.setDate(date.getDate() + 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const hijriMonth = view === "month" ? window.getDisplayedHijriParts?.(date) : null;
      const method = window.getCalculationMethod?.() || 5;
      const school = window.getAsrMadhab?.() === "hanafi" ? 1 : 0;
      try {
        let data;
        if (view === "tomorrow") {
          const day = String(date.getDate()).padStart(2, "0");
          const response = await window.anyasFetch(`https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${latitude}&longitude=${longitude}&method=${method}&school=${school}`, {}, { timeoutMs: 9000, retries: 1 });
          if (!response.ok) throw new Error("Prayer time request failed");
          data = (await response.json()).data;
          if (!data) throw new Error("Prayer time data is missing");
          if (requestId !== latestScheduleRequest) return;
          renderDay(data, date);
        } else if (hijriMonth?.year && hijriMonth?.month) {
          const response = await window.anyasFetch(`https://api.aladhan.com/v1/hijriCalendar/${hijriMonth.year}/${hijriMonth.month}?latitude=${latitude}&longitude=${longitude}&method=${method}&school=${school}`, {}, { timeoutMs: 9000, retries: 1 });
          if (!response.ok) throw new Error("Hijri calendar request failed");
          data = (await response.json()).data || [];
          if (requestId !== latestScheduleRequest) return;
          renderMonth(data, hijriMonth);
        } else {
          const response = await window.anyasFetch(`https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${latitude}&longitude=${longitude}&method=${method}&school=${school}`, {}, { timeoutMs: 9000, retries: 1 });
          if (!response.ok) throw new Error("Calendar request failed");
          data = (await response.json()).data || [];
          if (requestId !== latestScheduleRequest) return;
          renderMonth(data, null);
        }
        const label = byId("scheduleLocationLabel");
        if (label) label.textContent = `${location.city || "مدينتك"} · مواقيت الصلاة`;
      } catch (error) {
        if (requestId === latestScheduleRequest) list.textContent = "تعذر تحميل الجدول. تأكد من الاتصال بالإنترنت.";
      }
    }
    function hijriDateFor(date, source) {
      const displayed = window.getDisplayedHijriParts?.(date);
      if (displayed) return displayed;
      const monthNames = ["", "المحرّم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان", "رمضان", "شوّال", "ذو القعدة", "ذو الحجة"];
      const month = Number(source?.month?.number) || 0;
      return {
        day: Number(source?.day) || date.getDate(),
        month,
        monthName: source?.month?.ar || monthNames[month] || "التاريخ الهجري",
        year: Number(source?.year) || date.getFullYear()
      };
    }
    function formatScheduleTime(value) {
      const clean = String(value || "--").replace(/\s*\([^)]*\)/g, "").trim();
      const match = clean.match(/^(\d{1,2}):(\d{2})/);
      if (!match) return clean;
      const hour = Number(match[1]);
      if (window.getTimeFormat?.() === "24") return `${String(hour).padStart(2, "0")}:${match[2]}`;
      const hour12 = hour % 12 || 12;
      const period = hour >= 12 ? "م" : "ص";
      return `${String(hour12).padStart(2, "0")}:${match[2]} ${period}`;
    }
    function renderDay(data, date) {
      const timings = data.timings || {};
      const hijri = hijriDateFor(date, data.date?.hijri);
      const heading = document.createElement("div");
      heading.className = "schedule-day-title";
      const primaryDate = document.createElement("strong");
      primaryDate.textContent = `${toArabic(hijri.day)} ${hijri.monthName} ${toArabic(hijri.year)} هـ`;
      const secondaryDate = document.createElement("span");
      secondaryDate.textContent = date.toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" });
      heading.append(primaryDate, secondaryDate);
      list.replaceChildren(heading);
      prayerKeys.forEach(key => addRow(prayerLabel(key, date), timings[key]));
    }
    function renderMonth(data, selectedHijriMonth) {
      const weekdays = { Sunday: "الأحد", Monday: "الاثنين", Tuesday: "الثلاثاء", Wednesday: "الأربعاء", Thursday: "الخميس", Friday: "الجمعة", Saturday: "السبت" };
      list.replaceChildren();
      if (!Array.isArray(data) || !data.length) { list.textContent = "لا توجد مواقيت متاحة لهذا الشهر."; return; }
      const firstHijri = data[0].date?.hijri || {};
      const monthName = selectedHijriMonth?.monthName || firstHijri.month?.ar || firstHijri.month?.en || "الشهر الهجري";
      const monthYear = selectedHijriMonth?.year || firstHijri.year || "";
      const note = document.createElement("div");
      note.className = "schedule-month-note";
      const title = document.createElement("strong");
      title.textContent = `${monthName} ${toArabic(monthYear)} هـ`;
      const hint = document.createElement("span");
      hint.textContent = "التاريخ الميلادي للتوضيح";
      note.append(title, hint);
      list.appendChild(note);
      data.slice(0, 31).forEach(day => {
        const gregorian = day.date?.gregorian || {};
        const gregYear = Number(gregorian.year) || new Date().getFullYear();
        const gregMonth = Math.max(1, Number(gregorian.month?.number) || 1) - 1;
        const gregDay = Math.max(1, Number(gregorian.day) || 1);
        const dayDate = new Date(gregYear, gregMonth, gregDay);
        const hijri = day.date?.hijri || {};
        const hijriDay = toArabic(hijri.day || "");
        const row = document.createElement("div");
        row.className = "schedule-month-row";
        const dateHeader = document.createElement("div");
        dateHeader.className = "schedule-month-date";
        const dateNumber = document.createElement("strong");
        dateNumber.className = "schedule-month-day";
        dateNumber.textContent = hijriDay;
        const dateCopy = document.createElement("div");
        dateCopy.className = "schedule-month-copy";
        const monthLabel = document.createElement("b");
        const apiMonthNumber = Number(hijri.month?.number);
        monthLabel.textContent = selectedHijriMonth && apiMonthNumber === Number(selectedHijriMonth.month)
          ? monthName
          : hijri.month?.ar || hijri.month?.en || monthName;
        const gregorianDate = document.createElement("small");
        const weekday = weekdays[gregorian.weekday?.en] || "";
        gregorianDate.textContent = `${weekday ? `${weekday} · ` : ""}${dayDate.toLocaleDateString("ar-EG", { day: "numeric", month: "short" })}`;
        dateCopy.append(monthLabel, gregorianDate);
        dateHeader.append(dateNumber, dateCopy);
        const times = document.createElement("div");
        times.className = "schedule-month-times";
        times.setAttribute("aria-label", "مواقيت الصلوات");
        prayerKeys.forEach(key => {
          const timeCell = document.createElement("div");
          timeCell.className = "schedule-month-time";
          const prayerName = document.createElement("span");
          prayerName.textContent = prayerLabel(key, dayDate);
          const time = document.createElement("strong");
          time.textContent = formatScheduleTime(day.timings?.[key]);
          timeCell.append(prayerName, time);
          times.appendChild(timeCell);
        });
        row.append(dateHeader, times);
        list.appendChild(row);
      });
    }
    function addRow(name, time) {
      const row = document.createElement("div"); row.className = "schedule-row";
      const label = document.createElement("span"); label.textContent = name;
      const value = document.createElement("strong"); value.textContent = formatScheduleTime(time);
      row.append(label, value); list.appendChild(row);
    }
  }

  function getTime(key) {
    const value = window.todayTimings?.[key];
    if (!value) return null;
    const match = String(value).match(/(\d{1,2}):(\d{2})/); if (!match) return null;
    const date = new Date(); date.setHours(Number(match[1]), Number(match[2]), 0, 0); return date;
  }

  function updateFridayPrayerLabel() {
    const title = document.querySelector('[data-prayer="Dhuhr"] .prayer-title');
    if (title) title.textContent = prayerLabel("Dhuhr");
  }

  function updatePrayerMoment() {
    const now = new Date();
    let active = null;
    for (const key of prayerKeys) {
      const time = getTime(key); if (!time) continue;
      const diff = Math.floor((now - time) / 60000);
      if (diff >= 0 && diff < (key === "Maghrib" ? 0 : 15)) active = { key, diff };
    }
    const note = byId("prayerStateNote") || (() => { const el = document.createElement("div"); el.id = "prayerStateNote"; el.className = "prayer-state-note"; byId("countdown")?.after(el); return el; })();
    if (active) note.textContent = `الإقامة بعد ${toArabic(15 - active.diff)} دقيقة`;
    else note.textContent = "";
    const card = byId("dailyAdhkarCard");
    const title = byId("dailyAdhkarHeading"), badge = byId("dailyAdhkarBadge"), text = byId("dailyAdhkarText"), hint = byId("dailyAdhkarHint"), button = byId("openDailyAdhkarButton");
    if (!title || !text || !button) return;
    let after = null;
    for (const key of prayerKeys) { const time = getTime(key); if (!time) continue; const diff = Math.floor((now - time) / 60000); if (diff >= 0 && diff < 10) after = key; }
    const sunrise = getTime("Sunrise") || (() => { const t = byId("sunriseTime")?.textContent.match(/(\d{1,2}):(\d{2})/); if (!t) return null; const d = new Date(); d.setHours(+t[1], +t[2], 0, 0); return d; })();
    let state = after ? { title: `أذكار ما بعد صلاة ${prayerLabel(after)}`, badge: "بعد الصلاة", text: "ورد قصير بعد السلام؛ اغتنم الدقائق الأولى بعد الصلاة.", hint: "متاح ١٠ دقائق", action: "afterPrayer" } : null;
    if (!state && sunrise && now < sunrise) state = { title: "أذكار السحر والاستغفار", badge: "قبل الفجر", text: "وقت هادئ للاستغفار والدعاء وقيام الليل.", hint: "حتى دخول الفجر", action: "sahar" };
    if (!state && sunrise && now < new Date(sunrise.getTime() + 20 * 60000)) state = { title: "أذكار عامة", badge: "بعد الشروق", text: "أكثر من ذكر الله بما تيسر لك حتى يبدأ ورد الصباح.", hint: "ورد مطلق", action: "general" };
    if (!state) state = { title: now.getHours() >= 16 ? "أذكار المساء" : "أذكار الصباح", badge: now.getHours() >= 16 ? "المساء" : "الصباح", text: "ورد مناسب لوقتك، افتحه واقرأه بهدوء.", hint: "افتح الورد", action: now.getHours() >= 16 ? "evening" : "morning" };
    title.textContent = state.title; badge && (badge.textContent = state.badge); text.textContent = state.text; hint && (hint.textContent = state.hint); button.textContent = "افتح الأذكار"; button.dataset.adhkarAction = state.action;
    if (card) card.dataset.adhkarPeriod = state.action;
  }

  function initNotificationsList() {
    const list = byId("notificationList");
    if (!list) return;
    const bell = byId("notificationBellButton");
    const badge = byId("notificationBadge");
    const back = byId("notificationsBackButton");
    const unreadCount = byId("notificationUnreadCount");
    const unreadLabel = byId("notificationUnreadLabel");
    const markAll = byId("markAllNotificationsReadButton");
    const manage = byId("manageNotificationsButton");
    const bellSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>';
    const readHistory = () => {
      try {
        const raw = window.AnyasAndroid && typeof window.AnyasAndroid.getNotificationHistory === "function"
          ? window.AnyasAndroid.getNotificationHistory()
          : localStorage.getItem("anyas_notification_history") || "[]";
        const items = JSON.parse(raw);
        return Array.isArray(items) ? items.filter(item => item && typeof item === "object").sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0)) : [];
      } catch (error) {
        console.warn("تعذر قراءة صندوق الإشعارات:", error);
        return [];
      }
    };
    const markAllRead = () => {
      if (window.AnyasAndroid && typeof window.AnyasAndroid.markNotificationHistoryRead === "function") {
        window.AnyasAndroid.markNotificationHistoryRead();
        return;
      }
      const items = readHistory().map(item => ({ ...item, read: true }));
      try { localStorage.setItem("anyas_notification_history", JSON.stringify(items)); } catch (error) { console.warn("تعذر تحديث حالة قراءة الإشعارات:", error); }
    };
    const formatTime = timestamp => {
      const date = new Date(Number(timestamp));
      if (!Number.isFinite(date.getTime())) return "";
      let locale = "ar-EG";
      try { if (localStorage.getItem("anyas_language") === "en") locale = "en-US"; } catch (error) { }
      return new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(date);
    };
    const render = (markRead = false) => {
      let items = readHistory();
      if (markRead && items.some(item => !item.read)) {
        markAllRead();
        items = items.map(item => ({ ...item, read: true }));
      }
      const unread = items.filter(item => !item.read).length;
      if (badge) {
        badge.textContent = toArabic(unread);
        badge.hidden = unread === 0;
        badge.setAttribute("aria-label", `${toArabic(unread)} ${t(unread === 1 ? "إشعار غير مقروء" : "إشعارات غير مقروءة")}`);
      }
      if (unreadCount) unreadCount.textContent = toArabic(unread);
      if (unreadLabel) unreadLabel.textContent = t(unread === 1 ? "إشعار غير مقروء" : "إشعارات غير مقروءة");
      list.replaceChildren();
      if (!items.length) {
        const empty = document.createElement("div");
        empty.className = "notification-empty";
        const icon = document.createElement("span");
        icon.className = "notification-empty-icon";
        icon.innerHTML = bellSvg;
        const title = document.createElement("strong");
        title.textContent = t("لا توجد إشعارات بعد");
        const hint = document.createElement("small");
        hint.textContent = t("ستظهر هنا التنبيهات عند وصولها، لتراجعها متى شئت.");
        empty.append(icon, title, hint);
        list.append(empty);
      } else {
        items.forEach(item => {
          const card = document.createElement("article");
          card.className = `notification-history-item${item.read ? "" : " unread"}`;
          const icon = document.createElement("span");
          icon.className = "notification-history-icon";
          icon.innerHTML = bellSvg;
          const copy = document.createElement("div");
          copy.className = "notification-history-copy";
          const heading = document.createElement("div");
          heading.className = "notification-history-heading";
          const title = document.createElement("strong");
          title.textContent = item.title || t("إشعار من أنياس");
          const status = document.createElement("span");
          status.className = `notification-history-status${item.read ? " read" : " unread"}`;
          status.textContent = t(item.read ? "مقروء" : "جديد");
          heading.append(title, status);
          const body = document.createElement("p");
          body.textContent = item.body || "";
          const time = document.createElement("small");
          time.className = "notification-history-time";
          time.textContent = formatTime(item.timestamp);
          copy.append(heading);
          if (item.body) copy.append(body);
          copy.append(time);
          card.append(icon, copy);
          list.append(card);
        });
      }
    };
    render();
    window.anyasNotificationInboxRefresh = () => render();
    window.addEventListener("anyas-notification-recorded", () => render());
    window.addEventListener("storage", event => { if (event.key === "anyas_notification_history") render(); });
    window.setInterval(() => { if (!document.hidden) render(); }, 30_000);
    bell?.addEventListener("click", () => { openPage("notifications"); render(true); });
    back?.addEventListener("click", () => openPage("home"));
    markAll?.addEventListener("click", () => render(true));
    manage?.addEventListener("click", () => {
      openPage("settings");
      window.setTimeout(() => byId("notificationSettingsHeading")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    });
  }

  async function openMosqueDirectory() {
    openPage("mosques");
    const list = byId("mosquesList");
    const location = currentCoordinates();
    const latitude = Number(location?.latitude);
    const longitude = Number(location?.longitude);
    const cityName = location?.city || "موقعك الحالي";
    if (!list || location?.latitude == null || location?.longitude == null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      if (list) list.textContent = "حدّد مدينتك أولًا لعرض المساجد القريبة.";
      return;
    }
    const mapButton = byId("openMosquesMapButton");
    const mosqueMapUrl = `https://www.google.com/maps/search/${encodeURIComponent("مسجد")}/@${latitude},${longitude},15z`;
    if (mapButton) mapButton.onclick = () => window.open(mosqueMapUrl, "_blank");
    list.textContent = `جارٍ البحث عن مساجد قرب ${cityName}…`;

    const isMosque = place => {
      const tags = place.tags || {};
      const amenity = String(tags.amenity || "").toLowerCase();
      const building = String(tags.building || "").toLowerCase();
      const religion = String(tags.religion || "").toLowerCase().split(/[;,]/).map(value => value.trim()).filter(Boolean);
      const isMuslim = religion.length > 0 && religion.every(value => value === "muslim" || value === "islam");
      if (religion.length && !isMuslim) return false;
      return amenity === "mosque" || building === "mosque" || (amenity === "place_of_worship" && isMuslim);
    };
    const distanceMeters = (lat1, lon1, lat2, lon2) => {
      const radians = degrees => degrees * Math.PI / 180;
      const dLat = radians(lat2 - lat1), dLon = radians(lon2 - lon1);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
      const bounded = Math.min(1, Math.max(0, a));
      return 6371000 * 2 * Math.atan2(Math.sqrt(bounded), Math.sqrt(1 - bounded));
    };
    const fetchOverpass = async query => {
      let lastError;
      for (const endpoint of ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]) {
        try {
          const response = await fetch(endpoint, { method: "POST", body: query });
          if (!response.ok) throw new Error(`Overpass HTTP ${response.status}`);
          return await response.json();
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError || new Error("تعذر الاتصال بخدمة الخرائط");
    };
    try {
      let candidates = [];
      for (const radius of [5000, 15000, 30000]) {
        const query = `[out:json][timeout:25];(nwr[amenity=mosque](around:${radius},${latitude},${longitude});nwr[amenity=place_of_worship][religion=muslim](around:${radius},${latitude},${longitude});nwr[amenity=place_of_worship][religion=islam](around:${radius},${latitude},${longitude});nwr[building=mosque](around:${radius},${latitude},${longitude}););out center tags;`;
        const data = await fetchOverpass(query);
        candidates = (data.elements || []).filter(isMosque);
        if (candidates.length) break;
      }
      const seen = new Set();
      const places = candidates.map(place => {
        const lat = Number(place.lat ?? place.center?.lat);
        const lon = Number(place.lon ?? place.center?.lon);
        return { place, lat, lon, distance: distanceMeters(latitude, longitude, lat, lon) };
      }).filter(result => {
        if (!Number.isFinite(result.lat) || !Number.isFinite(result.lon)) return false;
        const key = result.place.id ? `${result.place.type || "place"}/${result.place.id}` : `${result.lat},${result.lon}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).sort((a, b) => a.distance - b.distance).slice(0, 12);
      list.replaceChildren();
      if (!places.length) { list.textContent = `لم نجد مسجدًا مسجّلًا قرب ${cityName}. جرّب الخريطة أو اختر المدينة مرة أخرى.`; return; }
      places.forEach(({ place, lat, lon, distance }) => {
        const name = place.tags?.["name:ar"] || place.tags?.name || "مسجد قريب";
        const item = document.createElement("a"); item.className = "mosque-result"; item.target = "_blank"; item.rel = "noopener";
        item.href = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=walking`;
        const icon = document.createElement("span"); icon.className = "mosque-result-icon"; icon.textContent = "م";
        const info = document.createElement("span");
        const title = document.createElement("strong"); title.textContent = name;
        const details = document.createElement("small");
        const distanceText = distance < 1000 ? `${toArabic(Math.max(10, Math.round(distance / 10) * 10))} م` : `${toArabic((distance / 1000).toFixed(1))} كم`;
        details.textContent = `يبعد تقريبًا ${distanceText} · فتح الاتجاهات`;
        info.append(title, details);
        const arrow = document.createElement("span"); arrow.setAttribute("aria-hidden", "true"); arrow.textContent = "‹";
        item.append(icon, info, arrow);
        list.appendChild(item);
      });
    } catch (error) {
      list.textContent = `تعذر تحميل مساجد قرب ${cityName} الآن. استخدم زر الخريطة للبحث المباشر.`;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initGreeting(); initCityPicker(); initPrayerSchedule(); initPrayerShare(); initNotificationsList();
    byId("mosquesBackButton")?.addEventListener("click", () => openPage("home"));
    updateFridayPrayerLabel(); updatePrayerMoment(); setInterval(updatePrayerMoment, 5000);
  });
  window.updatePrayerMoment = updatePrayerMoment;
  window.openMosqueDirectory = openMosqueDirectory;
})();
