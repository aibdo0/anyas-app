/* يوم المسلم: لوحة يومية من سبعة أقسام. تقرأ الصلاة والتاريخ من وحدات التطبيق الموجودة،
   وتقرأ علامات الإكمال التي تكتبها صفحتا الأذكار والقرآن الأصليتان. لا تحسب إنجازًا من مجرد فتح صفحة. */
(function () {
  "use strict";
  var AR = "٠١٢٣٤٥٦٧٨٩";
  function ar(n) { return String(n).replace(/\d/g, function (d) { return AR[d]; }); }
  function $(id) { return document.getElementById(id); }
  function dk() { return new Date().toLocaleDateString("en-CA"); }
  function jget(k, f) { try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? f : v; } catch (e) { return f; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function go(p) { if (typeof window.goToPage === "function") window.goToPage(p); else { var n = document.querySelector('.nav-item[data-page="' + p + '"]'); if (n) n.click(); } }
  function dayIdx() { var d = new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); }

  /* ===== محتوى ثابت تمت مراجعة مصادره، لا يُولَّد وقت التشغيل ===== */
  var HADITH = [
    ["إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى", "متفق عليه: البخاري (١) ومسلم (١٩٠٧)، واللفظ للبخاري"],
    ["مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الْآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ", "متفق عليه: البخاري (٦٠١٨) ومسلم (٤٧)"],
    ["لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ", "متفق عليه: البخاري (١٣) ومسلم (٤٥)"],
    ["الْكَلِمَةُ الطَّيِّبَةُ صَدَقَةٌ", "متفق عليه: البخاري (٢٩٨٩) ومسلم (١٠٠٩)"],
    ["أَحَبُّ الْأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ", "رواه مسلم (٧٨٢)، وبنحوه البخاري (٦٤٦٤)"],
    ["الطُّهُورُ شَطْرُ الْإِيمَانِ", "رواه مسلم (٢٢٣)"],
    ["مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ", "رواه مسلم (٢٦٩٩)"]
  ];
  var DUAS = [
    ["رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِن لَّدُنكَ رَحْمَةً إِنَّكَ أَنتَ ٱلْوَهَّابُ","سورة آل عمران · آية ٨"],
    ["رَبَّنَآ ءَاتِنَا فِى ٱلدُّنْيَا حَسَنَةً وَفِى ٱلْـَٔاخِرَةِ حَسَنَةً وَقِنَا عَذَابَ ٱلنَّارِ","سورة البقرة · آية ٢٠١"],
    ["رَّبِّ زِدْنِى عِلْمًا","سورة طه · آية ١١٤"],
    ["رَبِّ ٱشْرَحْ لِى صَدْرِى وَيَسِّرْ لِىٓ أَمْرِى","سورة طه · الآيتان ٢٥ و٢٦"],
    ["رَبَّنَا هَبْ لَنَا مِنْ أَزْوَٰجِنَا وَذُرِّيَّٰتِنَا قُرَّةَ أَعْيُنٍ وَٱجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا","سورة الفرقان · آية ٧٤"],
    ["بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا","رواه البخاري (٦٣٢٤)"]
  ];
  var PRAYERS = [["Fajr", "الفجر"], ["Dhuhr", "الظهر"], ["Asr", "العصر"], ["Maghrib", "المغرب"], ["Isha", "العشاء"]];
  var WIRD = [["morning", "أذكار الصباح"], ["quran", "ورد القرآن"], ["evening", "أذكار المساء"], ["sleep", "أذكار النوم"]];
  var TASKS = [["parents", "بر الوالدين"], ["sadaqa", "صدقة"], ["kin", "صلة رحم"], ["istighfar", "استغفار"]];
  var GOALS = [1, 2, 5, 10];

  /* ===== مفاتيح يومية: anyas_yawm_tasks-YYYY-MM-DD و anyas_yawm_wird-<id>-YYYY-MM-DD ===== */
  var tasksKey = function () { return "anyas_yawm_tasks-" + dk(); };
  var wirdKey = function (id) { return "anyas_yawm_wird-" + id + "-" + dk(); };
  function cleanup() {
    // يحذف فقط مفاتيح المهام والورد اليومية الأقدم من أمس. المفضلة وما لا تاريخ له لا يُمس.
    try {
      var keep = {}; keep[dk()] = 1; var y = new Date(); y.setDate(y.getDate() - 1); keep[y.toLocaleDateString("en-CA")] = 1;
      Object.keys(localStorage).forEach(function (k) {
        var m = /^anyas_yawm_(?:tasks|wird-[a-z]+)-(\d{4}-\d{2}-\d{2})$/.exec(k) || /^anyas_yawm_tasks-(\d{4}-\d{2}-\d{2})$/.exec(k);
        if (m && !keep[m[1]]) localStorage.removeItem(k);
      });
    } catch (e) {}
  }

  /* ===== حالة الإنجاز الفعلية ===== */
  function quranPages() { var o = jget("anyas_yawm_qread", {}); return (o[dk()] || []).length; }
  function quranGoal() { return Number(localStorage.getItem("anyas_yawm_quran_goal") || 0); }
  function wirdState() {
    var s = {};
    WIRD.forEach(function (w) {
      if (w[0] === "quran") { var g = quranGoal(); s.quran = { done: g > 0 && quranPages() >= g, goal: g, pages: quranPages() }; }
      else s[w[0]] = { done: localStorage.getItem(wirdKey(w[0])) === "1" };
    });
    return s;
  }
  function tasksState() { return jget(tasksKey(), {}); }

  /* ===== بناء الصفحة ===== */
  function build() {
    var page = $("page-tasks"); if (!page || $("yawmRoot")) return;
    var r = document.createElement("div"); r.id = "yawmRoot"; r.className = "yw";
    r.innerHTML =
      '<header class="yw-head"><p class="yw-greet" id="ywGreet"></p><h1>يوم المسلم</h1><p class="yw-dates"><span id="ywHijri"></span><i></i><span id="ywGreg"></span></p></header>' +
      '<section class="yw-card yw-next"><div class="yw-row"><div><small>الصلاة القادمة</small><strong id="ywNextName">—</strong></div><div class="yw-left"><b id="ywNextTime">--:--</b><span id="ywCount">--:--:--</span></div></div>' +
      '<div class="yw-bar" aria-hidden="true"><i id="ywBar"></i></div><button type="button" class="yw-link" id="ywSchedule">مواقيت الصلاة كاملة ‹</button></section>' +
      '<section class="yw-card"><div class="yw-title"><h2>وِردك اليوم</h2><span class="yw-badge" id="ywWirdBadge"></span></div><div id="ywWird"></div></section>' +
      '<section class="yw-sec"><h2 class="yw-h">زاد يومك</h2><div id="ywZad"></div></section>' +
      '<section class="yw-card"><h2 class="yw-h2">محطات يومك</h2><ol class="yw-tl" id="ywTl"></ol></section>' +
      '<section class="yw-card"><div class="yw-title"><h2>أعمال اليوم</h2><span class="yw-badge" id="ywTaskBadge"></span></div><div id="ywTasks"></div></section>' +
      '<section class="yw-card yw-sleep"><h2 class="yw-h2">قبل أن تنام</h2><p id="ywSum"></p><button type="button" class="yw-btn" id="ywSleepGo">أذكار النوم</button></section>';
    page.appendChild(r);
    $("ywSchedule").addEventListener("click", function () { go("prayer-schedule"); });
    $("ywSleepGo").addEventListener("click", function () { openWird("sleep"); });
    r.addEventListener("click", onClick);
    paintStatic(); paintWird(); paintTasks(); paintZad(); paintSum();
    tick();
    setInterval(function () { tick(); if (!$("ywHijri").textContent) paintHijri(); }, 1000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    new MutationObserver(refresh).observe(page, { attributes: true, attributeFilter: ["class"] });
  }
  var shownDay = "";
  function refresh() {
    if (shownDay !== dk()) { cleanup(); paintStatic(); paintZad(); shownDay = dk(); }
    paintWird(); paintTasks(); paintSum();
  }
  function openWird(id) {
    if (id === "quran") { go("quran"); return; }
    if (typeof window.openAzkarWird === "function") window.openAzkarWird(id);
  }

  function paintHijri() {
    var hj = $("hijriDate"), t = hj ? hj.textContent.trim() : "";
    var el = $("ywHijri"); if (el) el.textContent = t && t.indexOf("جاري") < 0 ? t : "";
  }

  function paintStatic() {
    var h = new Date().getHours();
    $("ywGreet").textContent = h >= 4 && h < 12 ? "صباح الخير" : h >= 12 && h < 17 ? "طاب يومك" : "طاب مساؤك";
    var hj = $("hijriDate"), t = hj ? hj.textContent.trim() : "";
    $("ywHijri").textContent = t && t.indexOf("جاري") < 0 ? t : "";
    try { $("ywGreg").textContent = new Date().toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); } catch (e) {}
    shownDay = dk();
  }

  function paintWird() {
    var s = wirdState(), n = 0;
    $("ywWird").innerHTML = WIRD.map(function (w) {
      var st = s[w[0]], sub, extra = "";
      if (st.done) n++;
      if (w[0] === "quran") {
        if (!st.goal) sub = "حدّد هدفك اليومي، وأكّد قراءة كل صفحة";
        else sub = ar(Math.min(st.pages, st.goal)) + " من " + ar(st.goal) + (st.goal <= 2 ? " صفحة" : " صفحات") + (st.done ? " · مكتمل" : "");
        extra = '<button type="button" class="yw-chip" data-goal>' + (st.goal ? "الهدف: " + ar(st.goal) : "الهدف") + "</button>";
      } else sub = st.done ? "مكتمل" : "لم يكتمل بعد";
      return '<div class="yw-item' + (st.done ? " is-done" : "") + '" data-open="' + w[0] + '"><span class="yw-dot" aria-hidden="true">' + (st.done ? "✓" : "") + '</span><span class="yw-txt"><strong>' + w[1] + "</strong><small>" + sub + "</small></span>" + extra + '<span class="yw-go" aria-hidden="true">‹</span></div>';
    }).join("");
    $("ywWirdBadge").textContent = ar(n) + " من " + ar(WIRD.length);
  }
  function paintTasks() {
    var s = tasksState(), n = 0;
    $("ywTasks").innerHTML = TASKS.map(function (t) {
      var on = !!s[t[0]]; if (on) n++;
      return '<button type="button" class="yw-item yw-task' + (on ? " is-done" : "") + '" data-task="' + t[0] + '" role="checkbox" aria-checked="' + on + '"><span class="yw-dot" aria-hidden="true">' + (on ? "✓" : "") + '</span><span class="yw-txt"><strong>' + t[1] + "</strong></span></button>";
    }).join("");
    $("ywTaskBadge").textContent = ar(n) + " من " + ar(TASKS.length);
  }
  function paintSum() {
    var s = wirdState(), w = 0, t = 0, ts = tasksState();
    WIRD.forEach(function (x) { if (s[x[0]].done) w++; });
    TASKS.forEach(function (x) { if (ts[x[0]]) t++; });
    $("ywSum").textContent = "الورد: " + ar(w) + " من " + ar(WIRD.length) + "  ·  الأعمال: " + ar(t) + " من " + ar(TASKS.length);
  }

  /* زاد يومك */
  var shown = {};
  function paintZad() {
    var d = dayIdx(), sel = window.dailyQuranSelection || [], v = sel.length ? sel[d % sel.length] : null, h = HADITH[d % HADITH.length], du = DUAS[d % DUAS.length], items = [];
    if (v) items.push({ id: "a-" + v.surah + ":" + v.ayah, k: "آية", text: v.text, src: "سورة " + v.surahName + " · آية " + ar(v.ayah) });
    items.push({ id: "h-" + (d % HADITH.length), k: "حديث", text: h[0], src: h[1] });
    items.push({ id: "d-" + (d % DUAS.length), k: "دعاء", text: du[0], src: du[1] });
    shown = {}; items.forEach(function (x) { shown[x.id] = x; });
    var saved = jget("anyas_yawm_saved", []);
    $("ywZad").innerHTML = items.map(function (x) {
      var on = saved.indexOf(x.id) >= 0;
      return '<article class="yw-card yw-zad" data-z="' + x.id + '"><small>' + x.k + '</small><p class="yw-ztext is-clamped">' + x.text + '</p><span class="yw-src">' + x.src + '</span>' +
        '<div class="yw-acts"><button type="button" data-act="read">قراءة</button><button type="button" data-act="copy">نسخ</button><button type="button" data-act="save" aria-pressed="' + on + '">' + (on ? "محفوظ ✓" : "حفظ") + "</button></div></article>";
    }).join("");
  }
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
    return new Promise(function (ok, no) { var f = document.createElement("textarea"); f.value = t; f.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(f); f.select(); try { document.execCommand("copy") ? ok() : no(); } catch (e) { no(e); } f.remove(); });
  }

  function onClick(e) {
    var b;
    if ((b = e.target.closest("[data-goal]"))) {
      e.stopPropagation();
      var i = GOALS.indexOf(quranGoal());
      localStorage.setItem("anyas_yawm_quran_goal", String(GOALS[(i + 1) % GOALS.length])); paintWird(); paintSum(); return;
    }
    if ((b = e.target.closest("[data-open]"))) { openWird(b.dataset.open); return; }
    if ((b = e.target.closest("[data-task]"))) {
      var s = tasksState(); if (s[b.dataset.task]) delete s[b.dataset.task]; else s[b.dataset.task] = 1; jset(tasksKey(), s); paintTasks(); paintSum(); return;
    }
    if ((b = e.target.closest("[data-act]"))) {
      var card = b.closest("[data-z]"), x = shown[card.dataset.z], act = b.dataset.act;
      if (act === "read") { var p = card.querySelector(".yw-ztext"); var c = p.classList.toggle("is-clamped"); b.textContent = c ? "قراءة" : "طيّ"; }
      else if (act === "copy") { copyText(x.text + " (" + x.src + ")").then(function () { b.textContent = "تم النسخ"; }, function () { b.textContent = "تعذّر النسخ"; }); setTimeout(function () { b.textContent = "نسخ"; }, 1600); }
      else { var sv = jget("anyas_yawm_saved", []), j = sv.indexOf(x.id); if (j >= 0) sv.splice(j, 1); else sv.push(x.id); jset("anyas_yawm_saved", sv); b.setAttribute("aria-pressed", j < 0); b.textContent = j < 0 ? "محفوظ ✓" : "حفظ"; }
    }
  }

  /* عدّاد الصلاة القادمة ومحطات اليوم: من window.nextPrayer و window.todayTimings التي تحسبها وحدة المواقيت */
  function pdate(raw, off) { return typeof window.createPrayerDate === "function" ? window.createPrayerDate(raw, off || 0) : (typeof createPrayerDate === "function" ? createPrayerDate(raw, off || 0) : null); }
  function two(n) { return String(n).padStart(2, "0"); }
  function tick() {
    if (!$("ywNextName")) return;
    var np = window.nextPrayer, tm = window.todayTimings, now = new Date();
    if (np && np.time) {
      $("ywNextName").textContent = np.name;
      $("ywNextTime").textContent = ((String(np.raw || "").match(/\d{1,2}:\d{2}/) || [""])[0]) || two(np.time.getHours()) + ":" + two(np.time.getMinutes());
      var ms = Math.max(0, np.time - now), s = Math.floor(ms / 1000);
      $("ywCount").textContent = two(Math.floor(s / 3600)) + ":" + two(Math.floor(s % 3600 / 60)) + ":" + two(s % 60);
      var prev = null;
      if (tm) {
        PRAYERS.forEach(function (p) { var d = pdate(tm[p[0]]); if (d && d <= now) prev = d; });
        if (!prev && tm.Isha) prev = pdate(tm.Isha, -1);
      }
      var pct = prev && np.time > prev ? Math.min(100, Math.max(0, (now - prev) / (np.time - prev) * 100)) : 0;
      $("ywBar").style.width = pct + "%";
    }
    if (tm) {
      var cur = -1;
      PRAYERS.forEach(function (p, i) { var d = pdate(tm[p[0]]); if (d && d <= now) cur = i; });
      var h = PRAYERS.map(function (p, i) {
        var raw = tm[p[0]] || "", t = (String(raw).match(/\d{1,2}:\d{2}/) || ["--:--"])[0];
        return '<li class="' + (i === cur ? "is-now" : i < cur ? "is-past" : "") + '"><i></i><strong>' + p[1] + "</strong><small>" + t + "</small></li>";
      }).join("");
      if ($("ywTl").dataset.h !== h) { $("ywTl").innerHTML = h; $("ywTl").dataset.h = h; }
    }
    if (shownDay !== dk()) refresh();
  }

  cleanup();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();
})();
