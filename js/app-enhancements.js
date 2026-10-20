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

  function initOfflineMode() {
    const status = byId("offlineConnectionStatus");
    const retry = byId("retryOfflineDataButton");
    if (!status && !retry) return;
    const render = () => {
      const english = document.documentElement.lang === "en";
      if (status) status.textContent = navigator.onLine
        ? (english ? "Online — fresh data can be loaded." : "متصل — يمكن تحميل بيانات حديثة.")
        : (english ? "Offline — using local data." : "غير متصل — يتم استخدام البيانات المحلية.");
      if (retry) retry.textContent = english ? "Refresh prayer times" : "إعادة تحديث المواقيت";
    };
    retry?.addEventListener("click", async () => {
      retry.disabled = true;
      retry.textContent = document.documentElement.lang === "en" ? "Refreshing…" : "جارٍ التحديث…";
      try {
        const latitude = Number(window.currentLatitude);
        const longitude = Number(window.currentLongitude);
        if (Number.isFinite(latitude) && Number.isFinite(longitude) && typeof window.loadPrayerTimes === "function") await window.loadPrayerTimes(latitude, longitude);
        else window.detectLocationAndLoadTimes?.({ allowPrompt: false });
      } finally { retry.disabled = false; render(); }
    });
    window.addEventListener("online", render);
    window.addEventListener("offline", render);
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
      if (window.anyasReturnToMosquesAfterManualLocation) {
        window.anyasReturnToMosquesAfterManualLocation = false;
        window.openMosqueDirectory?.({ location: safeLocation });
        return;
      }
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
  }

  function initNotificationsList() {
    const list = byId("notificationList");
    if (!list) return;
    const bell = byId("notificationBellButton");
    const badge = byId("notificationBadge");
    const back = byId("notificationsBackButton");
    const unreadCount = byId("notificationUnreadCount");
    const unreadLabel = byId("notificationUnreadLabel");
    const filterAll = byId("filterAllNotificationsButton");
    const filterUnread = byId("filterUnreadNotificationsButton");
    const markAll = byId("markAllNotificationsReadButton");
    const clearAll = byId("clearNotificationsButton");
    const manage = byId("manageNotificationsButton");
    const openSettingsFromEmpty = () => {
      openPage("settings");
      window.setTimeout(() => byId("notificationSettingsHeading")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    };
    let unreadOnly = false;
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
    const deleteItem = id => {
      if (!id) return;
      if (window.AnyasAndroid && typeof window.AnyasAndroid.deleteNotificationHistoryItem === "function") {
        window.AnyasAndroid.deleteNotificationHistoryItem(String(id));
        return;
      }
      try { localStorage.setItem("anyas_notification_history", JSON.stringify(readHistory().filter(item => item.id !== id))); } catch (error) { console.warn("تعذر حذف الإشعار:", error); }
    };
    const clearHistory = () => {
      if (window.AnyasAndroid && typeof window.AnyasAndroid.clearNotificationHistory === "function") {
        window.AnyasAndroid.clearNotificationHistory();
        return;
      }
      try { localStorage.removeItem("anyas_notification_history"); } catch (error) { console.warn("تعذر مسح سجل الإشعارات:", error); }
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
      filterAll?.setAttribute("aria-pressed", String(!unreadOnly));
      filterUnread?.setAttribute("aria-pressed", String(unreadOnly));
      const visibleItems = unreadOnly ? items.filter(item => !item.read) : items;
      list.replaceChildren();
      if (!visibleItems.length) {
        const empty = document.createElement("div");
        empty.className = "notification-empty";
        const icon = document.createElement("span");
        icon.className = "notification-empty-icon";
        icon.innerHTML = bellSvg;
        const title = document.createElement("strong");
        title.textContent = unreadOnly ? "لا توجد إشعارات غير مقروءة" : t("لا توجد إشعارات بعد");
        const hint = document.createElement("small");
        hint.textContent = unreadOnly ? "انتقل إلى «الكل» لعرض سجل الإشعارات." : t("ستظهر هنا التنبيهات عند وصولها، لتراجعها متى شئت.");
        empty.append(icon, title, hint);
        if (!unreadOnly) {
          const settingsButton = document.createElement("button");
          settingsButton.type = "button";
          settingsButton.className = "notification-empty-action";
          settingsButton.textContent = "فتح إعدادات التذكيرات";
          settingsButton.addEventListener("click", openSettingsFromEmpty);
          empty.append(settingsButton);
        }
        list.append(empty);
      } else {
        visibleItems.forEach(item => {
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
          const remove = document.createElement("button");
          remove.type = "button";
          remove.className = "notification-item-delete";
          remove.textContent = t("حذف");
          remove.setAttribute("aria-label", `${t("حذف الإشعار")}: ${title.textContent}`);
          remove.addEventListener("click", () => { deleteItem(item.id); render(); });
          card.append(icon, copy, remove);
          list.append(card);
        });
      }
    };
    render();
    window.anyasNotificationInboxRefresh = () => render();
    window.addEventListener("anyas-notification-recorded", () => render());
    window.addEventListener("storage", event => { if (event.key === "anyas_notification_history") render(); });
    window.setInterval(() => { if (!document.hidden) render(); }, 30_000);
    bell?.addEventListener("click", () => { openPage("notifications"); render(); });
    back?.addEventListener("click", () => openPage("home"));
    filterAll?.addEventListener("click", () => { unreadOnly = false; render(); });
    filterUnread?.addEventListener("click", () => { unreadOnly = true; render(); });
    markAll?.addEventListener("click", () => render(true));
    clearAll?.addEventListener("click", () => {
      if (!readHistory().length) return;
      if (window.confirm(t("هل تريد مسح سجل الإشعارات بالكامل؟"))) { clearHistory(); render(); }
    });
    manage?.addEventListener("click", openSettingsFromEmpty);
  }

  function updateHomeMosqueSummary({ name, address, distanceText } = {}) {
    const nameElement = byId("homeMosqueName");
    const addressElement = byId("homeMosqueAddress");
    const distanceElement = byId("homeMosqueDistance");
    if (nameElement && name) nameElement.textContent = name;
    if (addressElement && address) addressElement.textContent = address;
    if (distanceElement && distanceText) {
      distanceElement.textContent = distanceText;
      distanceElement.hidden = false;
    }
  }

  let mosqueSearchSequence = 0;
  let activeMosqueController = null;
  function setMosqueStatus(kind, title, message = "") {
    const status = byId("mosquesStatus");
    const retry = byId("mosquesRetryButton");
    const manual = byId("mosquesManualLocationButton");
    if (!status) return;
    status.replaceChildren();
    status.className = `mosque-state-card is-${kind}`;
    status.dataset.state = kind;
    status.setAttribute("aria-busy", String(kind === "loading"));
    if (kind === "loading") {
      const spinner = document.createElement("span");
      spinner.className = "mosque-spinner";
      spinner.setAttribute("aria-hidden", "true");
      status.append(spinner);
    }
    const copy = document.createElement("span");
    copy.className = "mosque-state-copy";
    const heading = document.createElement("strong");
    heading.textContent = title;
    copy.append(heading);
    if (message) {
      const detail = document.createElement("small");
      detail.textContent = message;
      copy.append(detail);
    }
    status.append(copy);
    if (retry) retry.hidden = kind !== "error" && kind !== "empty";
    if (manual) manual.hidden = kind !== "error";
  }
  function isValidMosqueLocation(location) {
    const latitude = Number(location?.latitude);
    const longitude = Number(location?.longitude);
    return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
  }
  function requestMosqueLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(Object.assign(new Error("GEOLOCATION_UNAVAILABLE"), { code: 0 }));
        return;
      }
      let settled = false;
      const timeout = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(Object.assign(new Error("LOCATION_TIMEOUT"), { code: 3 }));
      }, 12000);
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        callback(value);
      };
      try {
        navigator.geolocation.getCurrentPosition(
          position => finish(resolve, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            city: "موقعك الحالي",
            accuracy: position.coords.accuracy
          }),
          error => finish(reject, error || new Error("LOCATION_UNAVAILABLE")),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      } catch (error) {
        finish(reject, error);
      }
    });
  }
  async function openMosqueDirectory(options = {}) {
    openPage("mosques");
    const english = document.documentElement.lang === "en";
    const list = byId("mosquesList");
    const mapButton = byId("openMosquesMapButton");
    const retry = byId("mosquesRetryButton");
    const manual = byId("mosquesManualLocationButton");
    if (!list) return;
    const requestId = ++mosqueSearchSequence;
    activeMosqueController?.abort();
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    activeMosqueController = controller;
    list.replaceChildren();
    if (mapButton) mapButton.hidden = true;
    if (retry) retry.hidden = true;
    if (manual) manual.hidden = true;
    setMosqueStatus("loading", english ? "Finding your location…" : "جارٍ تحديد موقعك…", english ? "Nearby mosques will be searched using your device location." : "سيتم البحث حول إحداثيات جهازك الفعلية.");
    const stillCurrent = () => requestId === mosqueSearchSequence;
    try {
      if (navigator.onLine === false) throw Object.assign(new Error("OFFLINE"), { kind: "offline" });
      const location = options.location && isValidMosqueLocation(options.location)
        ? options.location
        : await requestMosqueLocation();
      if (!stillCurrent()) return;
      if (!isValidMosqueLocation(location)) throw Object.assign(new Error("INVALID_LOCATION"), { kind: "location" });
      const latitude = Number(location.latitude);
      const longitude = Number(location.longitude);
      const city = location.city || (english ? "your selected location" : "الموقع المحدد يدويًا");
      const label = byId("mosquesLocationLabel");
      if (label) label.textContent = options.location
        ? (english ? `Near ${city}` : `حول ${city}`)
        : (english ? "Near your current location" : "حول موقعك الحالي");
      const radius = 15000;
      const query = `[out:json][timeout:15];(nwr[amenity=mosque](around:${radius},${latitude},${longitude});nwr[amenity=place_of_worship][religion=muslim](around:${radius},${latitude},${longitude});nwr[amenity=place_of_worship][religion=islam](around:${radius},${latitude},${longitude});nwr[building=mosque](around:${radius},${latitude},${longitude}););out center tags;`;
      const mapUrl = `https://www.google.com/maps/search/${encodeURIComponent("مسجد")}/@${latitude},${longitude},15z`;
      if (mapButton) {
        mapButton.hidden = false;
        mapButton.textContent = english ? "Open nearby mosques on the map" : "عرض المساجد القريبة على الخريطة";
        mapButton.onclick = () => window.open(mapUrl, "_blank", "noopener");
      }
      setMosqueStatus("loading", english ? "Searching nearby mosques…" : "جارٍ البحث عن المساجد القريبة…", english ? "Checking OpenStreetMap data. This may take a few seconds." : "يتم التحقق من بيانات OpenStreetMap؛ قد يستغرق ذلك بضع ثوانٍ.");
      const endpoints = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
      let data;
      let lastError;
      const searchPromise = (async () => {
        for (const endpoint of endpoints) {
          if (controller?.signal.aborted) throw new Error("SEARCH_ABORTED");
          const requestController = typeof AbortController === "function" ? new AbortController() : null;
          const abortRequest = () => requestController?.abort();
          controller?.signal.addEventListener("abort", abortRequest, { once: true });
          const requestTimer = window.setTimeout(() => requestController?.abort(), 8000);
          try {
            const response = await fetch(endpoint, {
              method: "POST",
              body: query,
              headers: { "Content-Type": "text/plain;charset=UTF-8", Accept: "application/json" },
              ...(requestController ? { signal: requestController.signal } : {})
            });
            if (!response.ok) throw new Error(`OVERPASS_HTTP_${response.status}`);
            data = await response.json();
            if (!Array.isArray(data?.elements)) throw new Error("INVALID_MAP_DATA");
            return data;
          } catch (error) {
            lastError = requestController?.signal.aborted && !controller?.signal.aborted
              ? Object.assign(new Error("SEARCH_TIMEOUT"), { kind: "timeout" })
              : error;
            if (controller?.signal.aborted) throw error;
          } finally {
            window.clearTimeout(requestTimer);
            controller?.signal.removeEventListener("abort", abortRequest);
          }
        }
        throw lastError || new Error("MAP_SERVICE_UNAVAILABLE");
      })();
      let overallTimer;
      const timeoutPromise = new Promise((resolve, reject) => {
        overallTimer = window.setTimeout(() => {
          controller?.abort();
          reject(Object.assign(new Error("SEARCH_TIMEOUT"), { kind: "timeout" }));
        }, 18000);
      });
      try {
        await Promise.race([searchPromise, timeoutPromise]);
      } finally {
        window.clearTimeout(overallTimer);
      }
      if (!stillCurrent()) return;
      const isMosque = place => {
        const tags = place.tags || {};
        const amenity = String(tags.amenity || "").toLowerCase();
        const building = String(tags.building || "").toLowerCase();
        const religions = String(tags.religion || "").toLowerCase().split(/[;,]/).map(value => value.trim()).filter(Boolean);
        if (religions.length && !religions.every(value => value === "muslim" || value === "islam")) return false;
        return amenity === "mosque" || building === "mosque" || (amenity === "place_of_worship" && religions.length > 0);
      };
      const distanceMeters = (lat1, lon1, lat2, lon2) => {
        const radians = degrees => degrees * Math.PI / 180;
        const dLat = radians(lat2 - lat1);
        const dLon = radians(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
        const bounded = Math.min(1, Math.max(0, a));
        return 6371000 * 2 * Math.atan2(Math.sqrt(bounded), Math.sqrt(1 - bounded));
      };
      const seen = new Set();
      const places = (data.elements || []).filter(isMosque).map(place => {
        const lat = Number(place.lat ?? place.center?.lat);
        const lon = Number(place.lon ?? place.center?.lon);
        return { place, lat, lon, distance: distanceMeters(latitude, longitude, lat, lon) };
      }).filter(result => {
        if (!Number.isFinite(result.lat) || !Number.isFinite(result.lon) || Math.abs(result.lat) > 90 || Math.abs(result.lon) > 180) return false;
        const key = result.place.id ? `${result.place.type || "place"}/${result.place.id}` : `${result.lat},${result.lon}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).sort((a, b) => a.distance - b.distance).slice(0, 12);
      list.replaceChildren();
      if (!places.length) {
        setMosqueStatus("empty", english ? "No mapped mosques found nearby" : "لم نعثر على مساجد مسجّلة بالقرب منك", english ? "No matching mosque data was returned for the 15 km search area. You can retry or check the map." : "لم تُرجع بيانات OpenStreetMap مساجد ضمن نطاق البحث البالغ ١٥ كم. يمكنك إعادة المحاولة أو فتح الخريطة.");
        return;
      }
      const statusTitle = english ? `Found ${places.length} nearby mosque${places.length === 1 ? "" : "s"}` : `عُثر على ${toArabic(places.length)} مسجد قريب`;
      setMosqueStatus("results", statusTitle, english ? `Results from OpenStreetMap within ${radius / 1000} km.` : "المسافات المباشرة محسوبة من إحداثيات بيانات الخريطة.");
      if (mapButton) mapButton.hidden = false;
      const favoriteKey = "anyas_favorite_mosque";
      const readFavorite = () => { try { return JSON.parse(localStorage.getItem(favoriteKey) || "null"); } catch (_) { return null; } };
      const writeFavorite = value => { try { value ? localStorage.setItem(favoriteKey, JSON.stringify(value)) : localStorage.removeItem(favoriteKey); } catch (_) { /* المفضلة اختيارية */ } };
      places.forEach(({ place, lat, lon, distance }, index) => {
        const tags = place.tags || {};
        const name = tags["name:ar"] || tags.name || (english ? "Nearby mosque" : "مسجد قريب");
        const phone = tags.phone || tags["contact:phone"] || "";
        const key = place.id ? `${place.type || "place"}/${place.id}` : `${lat},${lon}`;
        const item = document.createElement("article");
        item.className = "mosque-result";
        item.dataset.mosqueKey = key;
        const icon = document.createElement("span");
        icon.className = "mosque-result-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = "م";
        const info = document.createElement("span");
        info.className = "mosque-result-info";
        const title = document.createElement("strong");
        title.textContent = name;
        const details = document.createElement("small");
        const distanceText = distance < 1000
          ? `${toArabic(Math.round(distance / 10) * 10)} ${english ? "m" : "م"}`
          : `${toArabic((distance / 1000).toFixed(1))} ${english ? "km" : "كم"}`;
        details.textContent = english ? `${distanceText} · straight-line distance` : `${distanceText} · مسافة مباشرة`;
        item.dataset.distanceMeters = String(Math.round(distance));
        info.append(title, details);
        const actions = document.createElement("span");
        actions.className = "mosque-result-actions";
        const directions = document.createElement("a");
        directions.className = "mosque-result-link mosque-directions-link";
        directions.target = "_blank";
        directions.rel = "noopener";
        directions.href = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=walking`;
        directions.textContent = english ? "Directions" : "الاتجاهات";
        directions.setAttribute("aria-label", `${directions.textContent}: ${name}`);
        const favorite = document.createElement("button");
        favorite.type = "button";
        favorite.className = "mosque-favorite-button";
        favorite.setAttribute("aria-label", english ? `Save ${name} as favorite` : `حفظ ${name} كمفضل`);
        const renderFavorite = () => {
          const active = readFavorite()?.key === key;
          favorite.textContent = active ? "★" : "☆";
          favorite.setAttribute("aria-pressed", String(active));
          favorite.title = active ? (english ? "Remove favorite" : "إزالة من المفضلة") : (english ? "Save favorite" : "حفظ كمفضل");
        };
        favorite.addEventListener("click", () => {
          const active = readFavorite()?.key === key;
          writeFavorite(active ? null : { key, name, lat, lon, phone });
          list.querySelectorAll(".mosque-favorite-button").forEach(button => {
            button.setAttribute("aria-pressed", "false");
            if (button !== favorite) button.textContent = "☆";
          });
          renderFavorite();
        });
        renderFavorite();
        actions.append(directions, favorite);
        if (phone) {
          const call = document.createElement("a");
          call.className = "mosque-result-link";
          call.href = `tel:${phone}`;
          call.textContent = english ? "Call" : "اتصال";
          call.setAttribute("aria-label", `${call.textContent}: ${name}`);
          actions.append(call);
        }
        item.append(icon, info, actions);
        list.appendChild(item);
        if (index === 0) {
          const address = [tags["addr:street"], tags["addr:housenumber"], tags["addr:city"]].filter(Boolean).join("، ") || (english ? "Address not available in map data" : "العنوان غير متاح في بيانات الخريطة");
          const visibleDistance = distance < 1000 ? `${toArabic(Math.round(distance / 10) * 10)} م` : `${toArabic((distance / 1000).toFixed(1))} كم`;
          updateHomeMosqueSummary({ name, address, distanceText: visibleDistance });
        }
      });
    } catch (error) {
      if (!stillCurrent()) return;
      list.replaceChildren();
      const denied = Number(error?.code) === 1;
      const locationFailed = [0, 1, 2, 3].includes(Number(error?.code)) || error?.kind === "location";
      const offline = navigator.onLine === false || error?.kind === "offline" || error?.name === "TypeError";
      const title = offline
        ? (english ? "No internet connection" : "لا يوجد اتصال بالإنترنت")
        : denied
          ? (english ? "Location permission is blocked" : "إذن الموقع مرفوض")
          : locationFailed
            ? (english ? "Could not get your current location" : "تعذر تحديد موقعك الحالي")
            : (english ? "Mosque search could not be completed" : "تعذر إكمال البحث عن المساجد");
      const message = offline
        ? (english ? "Connect to the internet, then retry. No sample results are shown." : "اتصل بالإنترنت ثم أعد المحاولة. لن نعرض نتائج افتراضية.")
        : denied
          ? (english ? "Allow location access in your browser settings, or choose a location manually." : "اسمح للتطبيق بالوصول إلى موقعك من إعدادات المتصفح، أو اختر موقعًا يدويًا.")
          : locationFailed
            ? (english ? "Check location services and retry, or choose a location manually." : "تحقق من تفعيل خدمات الموقع ثم أعد المحاولة، أو اختر موقعًا يدويًا.")
            : error?.kind === "timeout"
              ? (english ? "The map service took too long to respond. Please retry." : "استغرقت خدمة الخرائط وقتًا أطول من المهلة المحددة. أعد المحاولة.")
              : (english ? "Check your connection and retry. No estimated or fabricated results are shown." : "تحقق من الاتصال ثم أعد المحاولة. لا نعرض نتائج وهمية أو تقديرية.");
      setMosqueStatus("error", title, message);
    } finally {
      if (requestId === mosqueSearchSequence) activeMosqueController = null;
    }
  }
  document.addEventListener("DOMContentLoaded", () => {
    initOfflineMode(); initCityPicker(); initPrayerSchedule(); initPrayerShare(); initNotificationsList();
    byId("mosquesBackButton")?.addEventListener("click", () => openPage("home"));
    byId("mosquesRetryButton")?.addEventListener("click", () => openMosqueDirectory());
    byId("mosquesManualLocationButton")?.addEventListener("click", () => {
      window.anyasReturnToMosquesAfterManualLocation = true;
      openPage("city-picker");
    });
    updateFridayPrayerLabel(); updatePrayerMoment(); setInterval(updatePrayerMoment, 5000);
  });
  window.updatePrayerMoment = updatePrayerMoment;
  window.openMosqueDirectory = openMosqueDirectory;
  window.updateHomeMosqueSummary = updateHomeMosqueSummary;
})();
