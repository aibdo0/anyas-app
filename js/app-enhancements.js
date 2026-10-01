(() => {
  "use strict";

  const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
  const toArabic = value => String(value).replace(/\d/g, d => ARABIC_DIGITS[d]);
  const byId = id => document.getElementById(id);
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

  function initCityPicker() {
    const open = byId("openCityPickerButton");
    const back = byId("cityPickerBackButton");
    const search = byId("citySearchButton");
    const input = byId("citySearchInput");
    const results = byId("citySearchResults");
    const current = byId("useCurrentLocationButton");
    if (!open || !search || !input || !results) return;
    open.addEventListener("click", () => openPage("city-picker"));
    back?.addEventListener("click", () => openPage("home"));
    current?.addEventListener("click", () => {
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
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=ar&q=${encodeURIComponent(query)}`);
        const places = await response.json();
        results.replaceChildren();
        if (!places.length) { results.textContent = "لم نجد المدينة. جرّب كتابة المدينة والدولة."; return; }
        places.forEach(place => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "city-result";
          button.textContent = place.display_name;
          button.addEventListener("click", () => {
            const location = { latitude: Number(place.lat), longitude: Number(place.lon), city: place.name || query };
            localStorage.setItem("anyas_manual_location", JSON.stringify(location));
            window.currentLatitude = location.latitude;
            window.currentLongitude = location.longitude;
            window.lastKnownLocation = location;
            const city = byId("prayerHeroCity");
            if (city) city.textContent = location.city;
            window.loadPrayerTimes?.(location.latitude, location.longitude);
            window.dispatchEvent(new CustomEvent("anyas:location-updated", { detail: location }));
            openPage("home");
          });
          results.appendChild(button);
        });
      } catch (error) {
        results.textContent = "تعذر البحث الآن. جرّب مرة أخرى أو استخدم موقعك الحالي.";
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
    async function loadSchedule(view) {
      const location = currentCoordinates();
      if (!location.latitude || !location.longitude) { list.textContent = "حدّد مدينتك أولًا."; return; }
      list.innerHTML = '<div class="schedule-loading">جارٍ تحميل المواقيت…</div>';
      const date = new Date();
      if (view === "tomorrow") date.setDate(date.getDate() + 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      try {
        let data;
        if (view === "tomorrow") {
          const day = String(date.getDate()).padStart(2, "0");
          const response = await fetch(`https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${location.latitude}&longitude=${location.longitude}&method=${window.getCalculationMethod?.() || 5}`);
          data = (await response.json()).data;
          renderDay(data, date);
        } else {
          const response = await fetch(`https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${location.latitude}&longitude=${location.longitude}&method=5`);
          data = (await response.json()).data || [];
          renderMonth(data);
        }
        const label = byId("scheduleLocationLabel");
        if (label) label.textContent = `${location.city || "مدينتك"} · مواقيت الصلاة`;
      } catch (error) { list.textContent = "تعذر تحميل الجدول. تأكد من الاتصال بالإنترنت."; }
    }
    function renderDay(data, date) {
      const timings = data.timings || {};
      list.innerHTML = `<div class="schedule-day-title">${date.toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" })}</div>`;
      prayerKeys.forEach(key => addRow(prayerLabel(key, date), timings[key]));
    }
    function renderMonth(data) {
      const weekdays = { Sunday: "الأحد", Monday: "الاثنين", Tuesday: "الثلاثاء", Wednesday: "الأربعاء", Thursday: "الخميس", Friday: "الجمعة", Saturday: "السبت" };
      const cleanTime = value => String(value || "--").replace(/\s*\([^)]*\)/g, "").trim();
      list.replaceChildren();
      data.slice(0, 31).forEach(day => {
        const row = document.createElement("div"); row.className = "schedule-month-row";
        const weekday = weekdays[day.date?.gregorian?.weekday?.en] || "";
        const dateNumber = toArabic(day.date?.gregorian?.day || "");
        const dayDate = new Date(Number(day.date?.gregorian?.year), Number(day.date?.gregorian?.month?.number || 1) - 1, Number(day.date?.gregorian?.day || 1));
        const times = prayerKeys.map(key => `${prayerLabel(key, dayDate)} ${cleanTime(day.timings?.[key])}`).join(" · ");
        row.innerHTML = `<strong>${dateNumber}</strong><span class="schedule-month-info"><b>${weekday}</b><em>${times}</em></span>`;
        list.appendChild(row);
      });
    }
    function addRow(name, time) {
      const row = document.createElement("div"); row.className = "schedule-row";
      row.innerHTML = `<span>${name}</span><strong>${time || "--"}</strong>`; list.appendChild(row);
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
    const render = () => {
      const items = [];
      if (byId("notifyPrayerSoon")?.checked) items.push("تنبيه اقتراب الصلاة");
      if (byId("notifyWardMorning")?.checked) items.push("ورد الصباح");
      if (byId("notifyWardEvening")?.checked) items.push("ورد المساء");
      list.innerHTML = items.length ? items.map((item, index) => `<div class="notification-item"><span class="notification-item-icon">${index === 0 ? "ص" : "ذ"}</span><span><strong>${item}</strong><small>مفعّل من إعدادات أنياس</small></span></div>`).join("") : `<div class="notification-empty">فعّل تنبيهات الصلاة أو الأذكار من الإعدادات لتظهر هنا.</div>`;
      if (badge) { badge.textContent = toArabic(items.length); badge.hidden = !items.length; }
    };
    document.querySelectorAll('#page-settings input[type="checkbox"]').forEach(input => input.addEventListener("change", render));
    render();
    bell?.addEventListener("click", () => openPage("notifications"));
    back?.addEventListener("click", () => openPage("home"));
  }

  async function openMosqueDirectory() {
    openPage("mosques");
    const list = byId("mosquesList");
    const location = currentCoordinates();
    if (!list || !location.latitude || !location.longitude) {
      if (list) list.textContent = "حدّد مدينتك أولًا لعرض المساجد القريبة.";
      return;
    }
    list.innerHTML = '<div class="schedule-loading">جارٍ البحث حولك…</div>';
    const radius = 5000;
    const query = `[out:json][timeout:25];(nwr[amenity=place_of_worship](around:${radius},${location.latitude},${location.longitude});nwr[building=mosque](around:${radius},${location.latitude},${location.longitude}););out center tags;`;
    try {
      let response = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: query });
      if (!response.ok) response = await fetch("https://overpass.kumi.systems/api/interpreter", { method: "POST", body: query });
      const data = await response.json();
      const seen = new Set();
      const places = (data.elements || []).filter(place => {
        const lat = place.lat ?? place.center?.lat, lon = place.lon ?? place.center?.lon;
        const key = `${lat},${lon}`; if (!lat || !lon || seen.has(key)) return false; seen.add(key); return true;
      }).slice(0, 12);
      list.replaceChildren();
      if (!places.length) { list.innerHTML = '<div class="schedule-loading">لم نجد مسجدًا مسجلًا قريبًا. جرّب الخريطة لرؤية نتائج أكثر.</div>'; return; }
      places.forEach(place => {
        const lat = place.lat ?? place.center?.lat, lon = place.lon ?? place.center?.lon;
        const name = place.tags?.name || place.tags?.["name:ar"] || "مسجد قريب";
        const item = document.createElement("a"); item.className = "mosque-result"; item.target = "_blank"; item.rel = "noopener";
        item.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}@${lat},${lon}`;
        item.innerHTML = `<span class="mosque-result-icon">م</span><span><strong>${name}</strong><small>فتح الاتجاهات على الخريطة</small></span><span aria-hidden="true">‹</span>`;
        list.appendChild(item);
      });
    } catch (error) {
      list.innerHTML = '<div class="schedule-loading">تعذر تحميل القائمة الآن. استخدم زر الخريطة للبحث المباشر.</div>';
    }
    byId("openMosquesMapButton")?.addEventListener("click", () => {
      window.open(`https://www.google.com/maps/search/?api=1&query=mosque+near+${location.latitude},${location.longitude}`, "_blank");
    }, { once: true });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initGreeting(); initCityPicker(); initPrayerSchedule(); initNotificationsList();
    byId("mosquesBackButton")?.addEventListener("click", () => openPage("home"));
    updateFridayPrayerLabel(); updatePrayerMoment(); setInterval(updatePrayerMoment, 5000);
  });
  window.updatePrayerMoment = updatePrayerMoment;
  window.openMosqueDirectory = openMosqueDirectory;
})();
