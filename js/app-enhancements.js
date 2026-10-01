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
    const latitude = Number(location?.latitude);
    const longitude = Number(location?.longitude);
    const cityName = location?.city || "موقعك الحالي";
    if (!list || location?.latitude == null || location?.longitude == null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      if (list) list.textContent = "حدّد مدينتك أولًا لعرض المساجد القريبة.";
      return;
    }
    const mapButton = byId("openMosquesMapButton");
    if (mapButton) mapButton.onclick = () => window.open(`https://www.google.com/maps/search/?api=1&query=mosque+near+${latitude},${longitude}`, "_blank");
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
    initGreeting(); initCityPicker(); initPrayerSchedule(); initNotificationsList();
    byId("mosquesBackButton")?.addEventListener("click", () => openPage("home"));
    updateFridayPrayerLabel(); updatePrayerMoment(); setInterval(updatePrayerMoment, 5000);
  });
  window.updatePrayerMoment = updatePrayerMoment;
  window.openMosqueDirectory = openMosqueDirectory;
})();
