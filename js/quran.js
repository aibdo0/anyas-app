(function () {
  "use strict";
  var KEY = "anyas_quran_last";
  var loading = null;
  var cur = 0;
  var JUZ = ["الأول","الثاني","الثالث","الرابع","الخامس","السادس","السابع","الثامن","التاسع","العاشر","الحادي عشر","الثاني عشر","الثالث عشر","الرابع عشر","الخامس عشر","السادس عشر","السابع عشر","الثامن عشر","التاسع عشر","العشرون","الحادي والعشرون","الثاني والعشرون","الثالث والعشرون","الرابع والعشرون","الخامس والعشرون","السادس والعشرون","السابع والعشرون","الثامن والعشرون","التاسع والعشرون","الثلاثون"].map(function (x) { return "الجزء " + x; });
  var $ = function (id) { return document.getElementById(id); };

  function ar(n) {
    return String(n).replace(/\d/g, function (d) { return "٠١٢٣٤٥٦٧٨٩"[d]; });
  }
  function norm(t) {
    return String(t).replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/[ىئ]/g, "ي").replace(/ؤ/g, "و").replace(/\s+/g, " ").trim();
  }
  function load() {
    if (window.ANIAS_QURAN && window.ANIAS_QURAN_PAGES) return Promise.resolve(window.ANIAS_QURAN);
    if (loading) return loading;
    function one(src, ok) {
      return ok() ? Promise.resolve() : new Promise(function (res, rej) {
        var s = document.createElement("script");
        s.src = src;
        s.onload = res;
        s.onerror = function () { rej(new Error("quran-load")); };
        document.head.appendChild(s);
      });
    }
    loading = Promise.all([
      one("data/quran-full.js", function () { return window.ANIAS_QURAN; }),
      one("data/quran-pages.js", function () { return window.ANIAS_QURAN_PAGES; })
    ]).then(function () { return window.ANIAS_QURAN; }, function (e) { loading = null; throw e; });
    return loading;
  }
  function getLast() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; }
  }
  function setLast(v) {
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {}
  }

  var SAJDA = [[7,206],[13,15],[16,50],[17,109],[19,58],[22,18],[22,77],[25,60],[27,26],[32,15],[38,24],[41,38],[53,62],[84,21],[96,19]];
  function isSajda(s1, a1) { return SAJDA.some(function (x) { return x[0] === s1 && x[1] === a1; }); }
  var seg = "surah";
  function setSeg(v) {
    seg = v;
    document.querySelectorAll("#quranSeg button").forEach(function (b) {
      var on = b.dataset.seg === v;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    document.querySelector(".quran-searchwrap").hidden = v !== "surah";
    document.querySelector("#quranListView .quran-sheet-title").textContent = v === "juz" ? "فهرس الأجزاء" : v === "sajda" ? "مواضع السجدات" : "فهرس السور";
    renderList($("quranSearch").value || "");
  }
  function renderSegList(box) {
    var Q = window.ANIAS_QURAN, PG = window.ANIAS_QURAN_PAGES, html = "";
    if (seg === "juz") {
      PG.juz.forEach(function (x, k) {
        html += '<button type="button" class="quran-row" data-gs="' + x[0] + '" data-ga="' + x[1] + '"><span class="quran-num">' + ar(k + 1) + '</span><span class="quran-name">' + JUZ[k] + '</span><span class="quran-count">سورة ' + Q.names[x[0] - 1] + ' · ' + ar(x[1]) + '</span></button>';
      });
    } else {
      SAJDA.forEach(function (x, k) {
        html += '<button type="button" class="quran-row" data-gs="' + x[0] + '" data-ga="' + x[1] + '"><span class="quran-num">' + ar(k + 1) + '</span><span class="quran-name">سورة ' + Q.names[x[0] - 1] + '</span><span class="quran-count">آية ' + ar(x[1]) + ' · صفحة ' + ar(pageOfAyah(x[0], x[1])) + '</span></button>';
      });
    }
    box.innerHTML = html;
    box.classList.add("quran-group");
  }
  function renderList(q) {
    var Q = window.ANIAS_QURAN;
    var box = $("quranList");
    if (!Q || !box) return;
    if (seg !== "surah") { renderSegList(box); return; }
    var term = norm(q || "").trim();
    var html = "";
    Q.names.forEach(function (name, i) {
      if (term && norm(name).indexOf(term) < 0 && String(i + 1) !== term && ar(i + 1) !== q.trim()) return;
      html += '<button type="button" class="quran-row" data-surah="' + i + '"><span class="quran-num">' + ar(i + 1) +
        '</span><span class="quran-name">سورة ' + name + '</span><span class="quran-count">' + ar(Q.ayahs[i].length) + ' آية</span></button>';
    });
    box.innerHTML = html || '<p class="quran-empty">لا توجد سورة بهذا الاسم.</p>';
    box.classList.toggle("quran-group", !!html);
  }

  function pageOfSurah(i) {
    var PG = window.ANIAS_QURAN_PAGES, s1 = i + 1, pg = 1;
    PG.pages.forEach(function (p, k) {
      if (p[0] < s1 || (p[0] === s1 && p[1] <= 1)) pg = k + 1;
    });
    return pg;
  }
  function lastPage() {
    var l = getLast();
    if (!l) return 0;
    if (l.p) return l.p;
    if (typeof l.s === "number") return pageOfSurah(l.s);
    return 0;
  }

  function openSheet() {
    showOnly("quranListView");
    updateResume();
    renderList($("quranSearch").value || "");
  }
  var SHEETS = ["quranTafsirSheet", "quranSavedSheet", "quranNotesSheet", "quranListView", "quranSettings", "quranSearchSheet", "quranVerseSheet", "quranFavSheet"];
  function closeSheet() {
    SHEETS.forEach(function (id) { if ($(id)) $(id).hidden = true; });
    $("quranBackdrop").hidden = true;
    clearSel();
  }
  function showOnly(id) {
    SHEETS.forEach(function (x) { $(x).hidden = x !== id; });
    $("quranBackdrop").hidden = false;
  }
  var KS = { mark: "anyas_quran_bookmark", fav: "anyas_quran_favs" };
  function getMark() { try { return Number(localStorage.getItem(KS.mark)) || 0; } catch (e) { return 0; } }
  function getFavs() { try { return JSON.parse(localStorage.getItem(KS.fav) || "[]"); } catch (e) { return []; } }
  function setFavs(v) { try { localStorage.setItem(KS.fav, JSON.stringify(v)); } catch (e) {} }
  var NOTEK = "anyas_quran_notes";
  function allNotes() { try { return JSON.parse(localStorage.getItem(NOTEK) || "{}") || {}; } catch (e) { return {}; } }
  function getNote(k) { return allNotes()[k] || ""; }
  function setNote(k, v) {
    var n = allNotes();
    if (v.trim()) n[k] = v; else delete n[k];
    try { localStorage.setItem(NOTEK, JSON.stringify(n)); } catch (e) {}
  }
  function renderNotes() {
    var n = allNotes(), ks = Object.keys(n);
    $("quranNotesList").innerHTML = ks.length ? ks.map(function (k) {
      var p = k.split(":");
      return '<button type="button" class="quran-find-row" data-fs="' + p[0] + '" data-fa="' + p[1] + '"><span class="quran-find-ref">' + refLabel(k) + '</span><span class="quran-find-text">' + plainVerse(Number(p[0]), Number(p[1])) + '</span><span class="quran-note-preview"></span></button>';
    }).join("") : '<p class="quran-empty">لا توجد ملاحظات بعد. اضغط على آية ثم اكتب ملاحظتك.</p>';
    var rows = $("quranNotesList").querySelectorAll(".quran-find-row");
    ks.forEach(function (k, i) { rows[i].querySelector(".quran-note-preview").textContent = n[k]; });
  }
  var FSK = "anyas_quran_fs", FSS = [20, 22, 25, 28, 32];
  function fsIdx() { try { var v = Number(localStorage.getItem(FSK)); return v >= 0 && v < FSS.length && localStorage.getItem(FSK) !== null ? v : 2; } catch (e) { return 2; } }
  function applyFs() {
    var i = fsIdx();
    $("page-quran").style.setProperty("--quran-fs", FSS[i] + "px");
    $("quranFsLabel").textContent = "المستوى " + ar(i + 1) + " من " + ar(FSS.length);
    $("quranFsDown").disabled = i === 0;
    $("quranFsUp").disabled = i === FSS.length - 1;
  }
  function stepFs(d) {
    var i = Math.max(0, Math.min(FSS.length - 1, fsIdx() + d));
    try { localStorage.setItem(FSK, String(i)); } catch (e) {}
    applyFs();
  }
  var MTK = "anyas_quran_mushaf", MTS = ["auto", "paper", "white", "green", "night"];
  function mtVal() { try { var v = localStorage.getItem(MTK); return MTS.indexOf(v) >= 0 ? v : "auto"; } catch (e) { return "auto"; } }
  function applyMt() {
    var v = mtVal();
    $("page-quran").setAttribute("data-mushaf", v);
    document.querySelectorAll("#quranThemes button").forEach(function (b) { b.setAttribute("aria-checked", b.dataset.mt === v ? "true" : "false"); });
  }
  var VMK = "anyas_quran_view";
  function viewMode() { try { return localStorage.getItem(VMK) === "verse" ? "verse" : "page"; } catch (e) { return "page"; } }
  function applyView() {
    var v = viewMode();
    document.querySelectorAll("#quranView button").forEach(function (b) { b.setAttribute("aria-checked", b.dataset.vm === v ? "true" : "false"); });
  }
  var sel = null;
  function clearSel() {
    sel = null;
    document.querySelectorAll(".quran-sel").forEach(function (e) { e.classList.remove("quran-sel"); });
  }
  function applySel() {
    document.querySelectorAll(".quran-sel").forEach(function (e) { e.classList.remove("quran-sel"); });
    if (!sel) return;
    var el = document.querySelector('.quran-ayah[data-s="' + sel.s + '"][data-a="' + sel.a + '"]');
    if (el) el.classList.add("quran-sel");
  }
  function pageOfAyah(s1, a1) {
    var pg = 1;
    window.ANIAS_QURAN_PAGES.pages.forEach(function (p, k) { if (p[0] < s1 || (p[0] === s1 && p[1] <= a1)) pg = k + 1; });
    return pg;
  }
  function syncToolbar() {
    var Q = window.ANIAS_QURAN, PG = window.ANIAS_QURAN_PAGES;
    if (!Q || !PG || !cur) return;
    var st = PG.pages[cur - 1];
    $("quranTbPage").textContent = "صفحة " + ar(cur) + " · " + Q.names[st[0] - 1];
    var on = getMark() === cur;
    $("quranTbMark").setAttribute("aria-pressed", on ? "true" : "false");
    $("quranTbMark").classList.toggle("is-on", on);
  }
  var tafsirLoading = null;
  function loadTafsir() {
    if (window.ANIAS_TAFSIR) return Promise.resolve();
    if (tafsirLoading) return tafsirLoading;
    tafsirLoading = new Promise(function (res, rej) {
      var sc = document.createElement("script");
      sc.src = "data/quran-tafsir.js?v=20261124-1";
      sc.onload = res;
      sc.onerror = function () { tafsirLoading = null; rej(new Error("tafsir-load")); };
      document.head.appendChild(sc);
    });
    return tafsirLoading;
  }
  function showTafsir(s1, a1) {
    var box = $("quranTafsir"), note = $("quranVerseNote");
    if (!box) return;
    var key = s1 + ":" + a1;
    box.dataset.key = key;
    box.textContent = "";
    note.textContent = "جارٍ تحميل التفسير…";
    loadTafsir().then(function () {
      if (box.dataset.key !== key) return;
      box.textContent = window.ANIAS_TAFSIR.items[s1 - 1][a1 - 1];
      note.textContent = "التفسير الميسر، مجمع الملك فهد لطباعة المصحف الشريف، عبر موسوعة القرآن الكريم (QuranEnc.com)، الإصدار " + window.ANIAS_TAFSIR.version;
    }, function () {
      if (box.dataset.key === key) note.textContent = "تعذر تحميل التفسير. تحقق من الاتصال ثم أعد المحاولة.";
    });
  }
  function selectVerse(s1, a1) {
    var Q = window.ANIAS_QURAN;
    sel = { s: s1, a: a1 };
    applySel();
    var t = Q.ayahs[s1 - 1][a1 - 1];
    var B = Q.ayahs[0][0];
    if (a1 === 1 && s1 !== 1 && s1 !== 9 && t.indexOf(B + " ") === 0) t = t.slice(B.length + 1);
    $("quranVerseRef").textContent = "سورة " + Q.names[s1 - 1] + " · آية " + ar(a1);
    $("quranVerseText").textContent = t;
    showTafsir(s1, a1);
    $("quranNoteArea").value = getNote(s1 + ":" + a1);
    var fav = getFavs().indexOf(s1 + ":" + a1) >= 0;
    $("quranFav").setAttribute("aria-pressed", fav ? "true" : "false");
    $("quranFav").classList.toggle("is-on", fav);
    SHEETS.forEach(function (x) { $(x).hidden = x !== "quranVerseSheet"; });
    $("quranBackdrop").hidden = true;
    $("quranVerseSheet").hidden = false;
    var el = document.querySelector(".quran-sel");
    if (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom > window.innerHeight * 0.5 || r.top < 80) window.scrollBy({ top: r.top - window.innerHeight * 0.18, behavior: "auto" });
    }
  }
  function refLabel(key) {
    var Q = window.ANIAS_QURAN, p = key.split(":");
    return "سورة " + Q.names[p[0] - 1] + " · آية " + ar(p[1]);
  }
  function plainVerse(s1, a1) {
    var Q = window.ANIAS_QURAN, t = Q.ayahs[s1 - 1][a1 - 1], B = Q.ayahs[0][0];
    if (a1 === 1 && s1 !== 1 && s1 !== 9 && t.indexOf(B + " ") === 0) t = t.slice(B.length + 1);
    return t;
  }
  var normCache = null;
  var RSK = "anyas_quran_recent";
  function getRecent() { try { return JSON.parse(localStorage.getItem(RSK) || "[]") || []; } catch (e) { return []; } }
  function setRecent(v) { try { localStorage.setItem(RSK, JSON.stringify(v.slice(0, 12))); } catch (e) {} }
  function addRecent(q) {
    q = (q || "").trim();
    if (norm(q).length < 2) return;
    setRecent([q].concat(getRecent().filter(function (x) { return x !== q; })));
  }
  function renderRecent() {
    var r = getRecent(), out = $("quranFindList");
    $("quranFindCount").textContent = "";
    if (!r.length) { out.innerHTML = ""; return; }
    out.innerHTML = '<div class="quran-recent-head">مؤخرًا</div>' + r.map(function (t, i) {
      return '<div class="quran-recent-row"><button type="button" class="quran-recent-term" data-ri="' + i + '"></button><button type="button" class="quran-recent-x" data-rx="' + i + '" aria-label="حذف">\u2715</button></div>';
    }).join("");
    out.querySelectorAll(".quran-recent-term").forEach(function (b, i) { b.textContent = r[i]; });
  }
  function doFind(q) {
    var Q = window.ANIAS_QURAN, out = $("quranFindList"), term = norm(q);
    if (!normCache) normCache = Q.ayahs.map(function (arr, i) { return arr.map(function (t, k) { return norm(i !== 0 && i !== 8 && k === 0 ? t.replace(Q.ayahs[0][0], "") : t); }); });
    if (!term) { renderRecent(); return; }
    if (term.length < 2) { out.innerHTML = ""; $("quranFindCount").textContent = term ? "اكتب حرفين على الأقل." : ""; return; }
    var hits = [], total = 0;
    for (var i = 0; i < 114; i++) for (var k = 0; k < normCache[i].length; k++) {
      if (normCache[i][k].indexOf(term) >= 0) { total++; if (hits.length < 80) hits.push([i + 1, k + 1]); }
    }
    $("quranFindCount").textContent = total ? ("النتائج: " + ar(total) + (total > 80 ? " (أول ٨٠ نتيجة)" : "")) : "لا توجد نتائج.";
    out.innerHTML = hits.map(function (h) {
      return '<button type="button" class="quran-find-row" data-fs="' + h[0] + '" data-fa="' + h[1] + '"><span class="quran-find-ref">' + refLabel(h[0] + ":" + h[1]) + '</span><span class="quran-find-text">' + plainVerse(h[0], h[1]) + "</span></button>";
    }).join("");
  }
  function renderFavs() {
    var favs = getFavs();
    $("quranFavList").innerHTML = favs.length ? favs.map(function (k) {
      var p = k.split(":");
      return '<button type="button" class="quran-find-row" data-fs="' + p[0] + '" data-fa="' + p[1] + '"><span class="quran-find-ref">' + refLabel(k) + '</span><span class="quran-find-text">' + plainVerse(Number(p[0]), Number(p[1])) + "</span></button>";
    }).join("") : '<p class="quran-empty">لا توجد آيات مفضلة بعد. اضغط على آية ثم النجمة.</p>';
  }
  function pageAyahList(pg) {
    var PG = window.ANIAS_QURAN_PAGES, Q = window.ANIAS_QURAN;
    var st = PG.pages[pg - 1], en = pg < 604 ? PG.pages[pg] : [115, 1], s = st[0], a = st[1], out = [];
    while (s <= 114 && (s < en[0] || (s === en[0] && a < en[1]))) {
      var n = Q.ayahs[s - 1].length;
      for (; a <= n && (s < en[0] || a < en[1]); a++) out.push([s, a]);
      if (a > n) { s++; a = 1; } else break;
    }
    return out;
  }
  function openTafsirSheet() {
    var box = $("quranTafsirList");
    $("quranTafsirSub").textContent = "صفحة " + ar(cur);
    box.innerHTML = '<p class="quran-empty">جارٍ تحميل التفسير…</p>';
    showOnly("quranTafsirSheet");
    loadTafsir().then(function () {
      var list = pageAyahList(cur);
      box.innerHTML = list.map(function () { return '<div class="quran-tf-row"><span class="quran-find-ref"></span><span class="quran-find-text"></span><p class="quran-tf-body"></p></div>'; }).join("");
      var rows = box.querySelectorAll(".quran-tf-row");
      list.forEach(function (x, i) {
        rows[i].querySelector(".quran-find-ref").textContent = refLabel(x[0] + ":" + x[1]);
        rows[i].querySelector(".quran-find-text").textContent = plainVerse(x[0], x[1]);
        rows[i].querySelector(".quran-tf-body").textContent = window.ANIAS_TAFSIR.items[x[0] - 1][x[1] - 1];
      });
      $("quranTafsirCredit").textContent = "التفسير الميسر، مجمع الملك فهد لطباعة المصحف الشريف، عبر موسوعة القرآن الكريم (QuranEnc.com)، الإصدار " + window.ANIAS_TAFSIR.version;
    }, function () { box.innerHTML = '<p class="quran-empty">تعذر تحميل التفسير. تحقق من الاتصال ثم أعد المحاولة.</p>'; });
  }
  function renderSaved(which) {
    document.querySelectorAll("#quranSavedSeg button").forEach(function (b) { b.classList.toggle("is-on", b.dataset.sv === which); });
    var box = $("quranSavedList"), PG = window.ANIAS_QURAN_PAGES, Q = window.ANIAS_QURAN;
    if (which === "fav") {
      var favs = getFavs();
      box.innerHTML = favs.length ? favs.map(function (k) {
        var p = k.split(":");
        return '<button type="button" class="quran-find-row" data-fs="' + p[0] + '" data-fa="' + p[1] + '"><span class="quran-find-ref">' + refLabel(k) + '</span><span class="quran-find-text">' + plainVerse(Number(p[0]), Number(p[1])) + "</span></button>";
      }).join("") : '<p class="quran-empty">لا توجد آيات مفضلة بعد. اضغط على آية ثم النجمة.</p>';
    } else {
      var m = getMark();
      if (m) {
        var st = PG.pages[m - 1];
        box.innerHTML = '<button type="button" class="quran-find-row" data-fs="' + st[0] + '" data-fa="' + st[1] + '"><span class="quran-find-ref">فاصل الصفحة</span><span class="quran-find-text">صفحة ' + ar(m) + " · سورة " + Q.names[st[0] - 1] + "</span></button>";
      } else box.innerHTML = '<p class="quran-empty">لا يوجد فاصل صفحة بعد. اضغط على العلامة في الشريط لحفظ مكانك.</p>';
    }
  }
  function goVerse(s1, a1) {
    openPage(pageOfAyah(s1, a1));
    sel = { s: s1, a: a1 };
    applySel();
    var el = document.querySelector(".quran-sel");
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "center" });
  }
  var ORN = "anyas_quran_ornaments";
  function ornOn() {
    try { return localStorage.getItem(ORN) !== "false"; } catch (e) { return true; }
  }
  function applyOrn() {
    var on = ornOn();
    $("page-quran").classList.toggle("quran-plain", !on);
    $("quranOrnToggle").setAttribute("aria-checked", on ? "true" : "false");
  }
  var HFK = "anyas_quran_hifz";
  function hifzOn() { try { return localStorage.getItem(HFK) === "1"; } catch (e) { return false; } }
  function applyHifz() {
    var on = hifzOn();
    $("quranReader").classList.toggle("quran-hifz", on);
    document.querySelectorAll(".quran-hifz-shown").forEach(function (e) { e.classList.remove("quran-hifz-shown"); });
    var t = $("quranHifzToggle"); if (t) t.setAttribute("aria-checked", on ? "true" : "false");
    var h = $("quranHifzHint"); if (h) h.hidden = !on;
  }
  function openSettings() {
    paintStats();
    showOnly("quranSettings");
    applyOrn();
  }

  function updateResume() {
    var Q = window.ANIAS_QURAN, b = $("quranResume"), pg = Q && window.ANIAS_QURAN_PAGES ? lastPage() : 0;
    if (!b) return;
    if (pg > 0) {
      var first = window.ANIAS_QURAN_PAGES.pages[pg - 1];
      b.hidden = false;
      var pct = Math.max(1, Math.round(pg / 604 * 100));
      b.innerHTML = '<span class="quran-rs-top"><strong>كمّل القراءة</strong><em>سورة ' + Q.names[first[0] - 1] + '</em></span><span class="quran-rs-sub">صفحة ' + ar(pg) + ' من ٦٠٤ · ' + ar(pct) + '٪</span><span class="quran-rs-bar"><i style="width:' + pct + '%"></i></span>';
      b.dataset.page = pg;
    } else b.hidden = true;
    var m = getMark(), mr = $("quranMarkRow");
    if (m && window.ANIAS_QURAN_PAGES) {
      mr.hidden = false; mr.dataset.page = m;
      mr.textContent = "علامتك: صفحة " + ar(m) + " · سورة " + Q.names[window.ANIAS_QURAN_PAGES.pages[m - 1][0] - 1];
    } else mr.hidden = true;
    var nr = $("quranNotesRow"), nc = Object.keys(allNotes()).length;
    nr.hidden = !nc;
    nr.textContent = "ملاحظاتي (" + ar(nc) + ")";
    var fr = $("quranFavRow"), fc = getFavs().length;
    fr.hidden = !fc;
    fr.textContent = "الآيات المفضلة (" + ar(fc) + ")";
  }

  function juzOf(s1, a1) {
    var j = 1;
    window.ANIAS_QURAN_PAGES.juz.forEach(function (x, k) { if (x[0] < s1 || (x[0] === s1 && x[1] <= a1)) j = k + 1; });
    return j;
  }

  var STK = "anyas_quran_stats";
  function dayKey(d) { d = d || new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function readStats() { try { var o = JSON.parse(localStorage.getItem(STK) || "{}"); return o && typeof o === "object" ? o : {}; } catch (e) { return {}; } }
  function recordRead(pg) {
    try {
      var o = readStats(), k = dayKey(), arr = o[k] || [];
      if (arr.indexOf(pg) < 0) arr.push(pg);
      o[k] = arr;
      var keys = Object.keys(o).sort();
      while (keys.length > 90) delete o[keys.shift()];
      localStorage.setItem(STK, JSON.stringify(o));
    } catch (e) {}
  }
  // قراءة مقصودة لـ«يوم المسلم»: لا تُحسب الصفحة بمجرد عرضها، بل بعد بقائها ظاهرة مدة كافية.
  var INTENT_KEY = "anyas_yawm_qread", INTENT_MS = 25000, intentTimer = null;
  function watchIntentRead(pg) {
    clearTimeout(intentTimer);
    intentTimer = setTimeout(function () {
      var pageEl = document.getElementById("page-quran");
      if (document.hidden || !pageEl || !pageEl.classList.contains("active") || cur !== pg) return;
      try {
        var o = JSON.parse(localStorage.getItem(INTENT_KEY) || "{}"), k = dayKey(), arr = o[k] || [];
        if (arr.indexOf(pg) < 0) arr.push(pg);
        var n = {}; n[k] = arr;
        localStorage.setItem(INTENT_KEY, JSON.stringify(n));
      } catch (e) {}
    }, INTENT_MS);
  }
  function statsSummary() {
    var o = readStats(), today = (o[dayKey()] || []).length, week = 0, streak = 0, i, d;
    for (i = 0; i < 7; i++) { d = new Date(); d.setDate(d.getDate() - i); week += (o[dayKey(d)] || []).length; }
    for (i = 0; i < 90; i++) { d = new Date(); d.setDate(d.getDate() - i); if ((o[dayKey(d)] || []).length) streak++; else if (i > 0) break; }
    return { today: today, week: week, streak: streak };
  }
  function pagesWord(n) { return window.arCount ? window.arCount(n, ["صفحة", "صفحتان", "صفحتين", "صفحات", "صفحة", "صفحة"], false) : n + " صفحة"; }
  function daysWord(n) { return window.arCount ? window.arCount(n, ["يوم", "يومان", "يومين", "أيام", "يومًا", "يوم"], false) : n + " يوم"; }
  function paintStats() {
    var b = $("quranStatsBox"); if (!b) return;
    var st = statsSummary();
    b.innerHTML = '<div><strong>' + ar(st.today) + '</strong><small>اليوم</small></div><div><strong>' + ar(st.week) + '</strong><small>آخر ٧ أيام</small></div><div><strong>' + ar(st.streak) + '</strong><small>أيام متتالية</small></div>';
  }
  function paintHomeResume() {
    var old = document.getElementById("homeResumeCard");
    if (old) old.remove();
    var sub = document.getElementById("tasksQuranRowSub");
    if (!sub) return;
    var lv = getLast(), pg = lv && lv.p ? lv.p : 0, st = statsSummary();
    if (!pg) { sub.textContent = "ابدأ القراءة من أول المصحف"; return; }
    sub.textContent = (lv.n ? "سورة " + lv.n + " · " : "") + "صفحة " + ar(pg) + (st.today ? " · قرأت اليوم " + pagesWord(st.today) : "");
  }
  var TJK = "anyas_quran_tajweed";
  function tjOn() { try { return localStorage.getItem(TJK) === "1"; } catch (e) { return false; } }
  function tjHtml(s, a, t, shift) {
    var sp = window.ANIAS_TAJWEED[s + ":" + a];
    if (!sp) return t;
    var cp = Array.from(t), out = "", pos = 0;
    sp.split(",").forEach(function (x) {
      var m = /^(\d+)-(\d+)(\w)$/.exec(x);
      if (!m) return;
      var b = Number(m[1]) - shift, e = Number(m[2]) - shift;
      if (b < pos || e <= b || e > cp.length) return;
      out += cp.slice(pos, b).join("") + '<span class="tj-' + m[3] + '">' + cp.slice(b, e).join("") + "</span>";
      pos = e;
    });
    return out + cp.slice(pos).join("");
  }
  function tjLoad(then) {
    if (window.ANIAS_TAJWEED) return then();
    var sc = document.createElement("script");
    sc.src = "data/quran-tajweed.js?v=20261124-1";
    sc.onload = then;
    sc.onerror = function () { var r = $("quranTjHint"); if (r) r.textContent = "تعذّر تحميل ألوان التجويد. حاول مرة أخرى."; };
    document.head.appendChild(sc);
  }
  function applyTj() {
    var on = tjOn(), t = $("quranTjToggle");
    if (t) t.setAttribute("aria-checked", on ? "true" : "false");
    var lg = $("quranTjLegend"); if (lg) lg.hidden = !on;
    $("quranReader").classList.toggle("quran-tj", on);
  }
  function openPage(pg, keepScroll) {
    var Q = window.ANIAS_QURAN, PG = window.ANIAS_QURAN_PAGES;
    if (!Q || !PG) return;
    pg = Math.max(1, Math.min(604, pg));
    cur = pg;
    recordRead(pg);
    watchIntentRead(pg);
    var BISM = Q.ayahs[0][0];
    var st = PG.pages[pg - 1];
    var en = pg < 604 ? PG.pages[pg] : [115, 1];
    var s = st[0], a = st[1], body = "";
    while (s <= 114 && (s < en[0] || (s === en[0] && a < en[1]))) {
      var n = Q.ayahs[s - 1].length;
      if (a === 1) {
        body += '<div class="quran-surah-banner">سورة ' + Q.names[s - 1] + "</div>" + (s !== 1 && s !== 9 ? '<p class="quran-bism">' + BISM + "</p>" : "");
      }
      var txt = "";
      for (; a <= n && (s < en[0] || a < en[1]); a++) {
        var t = Q.ayahs[s - 1][a - 1];
        var shift = 0;
        if (a === 1 && s !== 1 && s !== 9 && t.indexOf(BISM + " ") === 0) { t = t.slice(BISM.length + 1); shift = Array.from(BISM).length + 1; }
        if (tjOn() && window.ANIAS_TAJWEED) t = tjHtml(s, a, t, shift);
        var one = '<span class="quran-ayah" data-s="' + s + '" data-a="' + a + '">' + t + ' <span class="quran-end">' + ar(a) + "</span>" + (isSajda(s, a) ? '<span class="quran-sajda" title="موضع سجدة تلاوة">\u06E9</span>' : "") + (getNote(s + ":" + a) ? '<span class="quran-notedot" title="لديك ملاحظة"></span>' : "") + "</span> ";
        if (viewMode() === "verse") body += '<div class="quran-vcard"><p class="quran-text">' + one + '</p><div class="quran-vref">سورة ' + Q.names[s - 1] + " · آية " + ar(a) + "</div></div>";
        else txt += one;
      }
      if (txt) body += '<p class="quran-text">' + txt + "</p>";
      if (a > n) { s++; a = 1; } else break;
    }
    $("quranReader").innerHTML = '<article class="quran-page' + (viewMode() === "verse" ? " quran-verses" : "") + '"><div class="quran-pills"><button type="button" class="quran-pill" data-open="surah">سورة ' + Q.names[st[0] - 1] +
      '</button><button type="button" class="quran-pill" data-open="juz">' + JUZ[juzOf(st[0], st[1]) - 1] + "</button></div>" + body +
      '<div class="quran-pageno"><span>' + ar(pg) + "</span></div></article>";
    closeSheet();
    $("quranTitle").textContent = "سورة " + Q.names[st[0] - 1];
    $("quranSub").textContent = "صفحة " + ar(pg) + " من ٦٠٤";
    setLast({ p: pg, n: Q.names[st[0] - 1] });
    paintHomeResume();
    applySel();
    syncToolbar();
    if (!keepScroll) window.scrollTo(0, 0);
  }

  function init() {
    var page = $("page-quran");
    if (!page) return;
    document.querySelectorAll('.nav-item[data-page="quran"]').forEach(function (b) {
      b.addEventListener("click", function () {
        load().then(function () {
          var pg = lastPage();
          openPage(pg || 1);
          if (!pg) openSheet();
        }).catch(function () {
          $("quranReader").innerHTML = '<p class="quran-empty">تعذّر تحميل المصحف. حاول مرة أخرى.</p>';
        });
      });
    });
    ["quranBackdrop", "quranToolbar"].concat(SHEETS).forEach(function (id) { document.body.appendChild($(id)); });
    document.querySelectorAll(".nav-item").forEach(function (n) { n.addEventListener("click", function () { closeSheet(); $("quranToolbar").hidden = true; }); });
    var lpTimer = null, lpFired = false;
    function lpCancel() { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; } }
    function lpStart(e) {
      var v = e.target.closest && e.target.closest(".quran-ayah");
      lpFired = false;
      lpCancel();
      if (!v) return;
      lpTimer = setTimeout(function () {
        lpTimer = null;
        lpFired = true;
        selectVerse(Number(v.dataset.s), Number(v.dataset.a));
        var t = $("quranTafsir");
        if (t && t.scrollIntoView) t.scrollIntoView({ block: "start" });
      }, 480);
    }
    var rd = $("quranReader");
    rd.addEventListener("touchstart", lpStart, { passive: true });
    rd.addEventListener("touchmove", lpCancel, { passive: true });
    rd.addEventListener("touchend", lpCancel);
    rd.addEventListener("touchcancel", lpCancel);
    rd.addEventListener("mousedown", lpStart);
    rd.addEventListener("mouseup", lpCancel);
    rd.addEventListener("contextmenu", function (e) { if (e.target.closest(".quran-ayah")) e.preventDefault(); });
    rd.addEventListener("click", function (e) {
      if (lpFired) { lpFired = false; return; }
      var tb = $("quranToolbar");
      var v = e.target.closest(".quran-ayah");
      if (v && hifzOn()) { v.classList.toggle("quran-hifz-shown"); return; }
      if (v) {
        var s1 = Number(v.dataset.s), a1 = Number(v.dataset.a);
        if (!tb.hidden && sel && sel.s === s1 && sel.a === a1) { tb.hidden = true; clearSel(); return; }
        sel = { s: s1, a: a1 };
        applySel();
        tb.hidden = false;
        syncToolbar();
        return;
      }
      tb.hidden = !tb.hidden;
      if (tb.hidden) clearSel();
      syncToolbar();
    });
    $("quranTbGear").addEventListener("click", openSettings);
    $("quranTbTafsir").addEventListener("click", openTafsirSheet);
    $("quranTafsirGrip").addEventListener("click", closeSheet);
    $("quranTbShare").addEventListener("click", function () {
      if (!sel) { var lb = $("quranTbPage"), old = lb.textContent; lb.textContent = "المس آية أولًا"; setTimeout(function () { lb.textContent = old; }, 1800); return; }
      if (window.anyasShareImage) window.anyasShareImage.shareCustom(plainVerse(sel.s, sel.a), refLabel(sel.s + ":" + sel.a), function () {});
    });
    $("quranTbIndex").addEventListener("click", function () { openSheet(); setSeg("surah"); });
    $("quranTbSaved").addEventListener("click", function () { renderSaved("mark"); showOnly("quranSavedSheet"); });
    $("quranSavedGrip").addEventListener("click", closeSheet);
    $("quranSavedSeg").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-sv]");
      if (b) renderSaved(b.dataset.sv);
    });
    $("quranTbSearch").addEventListener("click", function () { showOnly("quranSearchSheet"); doFind($("quranFind").value); $("quranFind").focus(); });
    $("quranTbMark").addEventListener("click", function () {
      try { if (getMark() === cur) localStorage.removeItem(KS.mark); else localStorage.setItem(KS.mark, String(cur)); } catch (e) {}
      syncToolbar();
    });
    $("quranFind").addEventListener("input", function (e) { doFind(e.target.value); });
    $("quranMarkRow").addEventListener("click", function () { openPage(Number($("quranMarkRow").dataset.page)); });
    $("quranFavRow").addEventListener("click", function () { renderFavs(); showOnly("quranFavSheet"); });
    ["quranSearchGrip", "quranVerseGrip", "quranFavGrip"].forEach(function (id) { $(id).addEventListener("click", closeSheet); });
    document.addEventListener("click", function (e) {
      var rt = e.target.closest(".quran-recent-term"), rx = e.target.closest(".quran-recent-x");
      if (rt) { var tx = getRecent()[Number(rt.dataset.ri)]; $("quranFind").value = tx; doFind(tx); return; }
      if (rx) { var arr = getRecent(); arr.splice(Number(rx.dataset.rx), 1); setRecent(arr); renderRecent(); return; }
      var r = e.target.closest(".quran-find-row");
      if (r && r.closest("#quranFindList")) addRecent($("quranFind").value);
      if (r) goVerse(Number(r.dataset.fs), Number(r.dataset.fa));
    });
    $("quranFav").addEventListener("click", function () {
      if (!sel) return;
      var k = sel.s + ":" + sel.a, f = getFavs(), i = f.indexOf(k);
      if (i >= 0) f.splice(i, 1); else f.push(k);
      setFavs(f);
      var on = i < 0;
      $("quranFav").setAttribute("aria-pressed", on ? "true" : "false");
      $("quranFav").classList.toggle("is-on", on);
    });
    $("quranShare").addEventListener("click", function () {
      if (!sel || !window.anyasShareImage) return;
      window.anyasShareImage.shareCustom(plainVerse(sel.s, sel.a), refLabel(sel.s + ":" + sel.a), function (m) { if (m) $("quranVerseNote").textContent = m; });
    });
    applyView();
    $("quranView").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-vm]");
      if (!b) return;
      try { localStorage.setItem(VMK, b.dataset.vm); } catch (x) {}
      applyView();
      if (cur) openPage(cur, true);
    });
    applyMt();
    $("quranThemes").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-mt]");
      if (!b) return;
      try { localStorage.setItem(MTK, b.dataset.mt); } catch (x) {}
      applyMt();
    });
    applyFs();
    $("quranFsDown").addEventListener("click", function () { stepFs(-1); });
    $("quranFsUp").addEventListener("click", function () { stepFs(1); });
    $("quranNoteArea").addEventListener("input", function (e) {
      if (!sel) return;
      setNote(sel.s + ":" + sel.a, e.target.value);
      var el = document.querySelector('.quran-ayah[data-s="' + sel.s + '"][data-a="' + sel.a + '"]');
      if (el) {
        var d = el.querySelector(".quran-notedot");
        if (e.target.value.trim() && !d) { d = document.createElement("span"); d.className = "quran-notedot"; el.appendChild(d); }
        else if (!e.target.value.trim() && d) d.remove();
      }
    });
    $("quranNotesRow").addEventListener("click", function () { renderNotes(); showOnly("quranNotesSheet"); });
    $("quranNotesGrip").addEventListener("click", closeSheet);
    document.querySelectorAll("#quranSeg button").forEach(function (b) { b.addEventListener("click", function () { setSeg(b.dataset.seg); }); });
    $("quranList").addEventListener("click", function (e) {
      var r = e.target.closest(".quran-row[data-gs]");
      if (r) openPage(pageOfAyah(Number(r.dataset.gs), Number(r.dataset.ga)));
    });
    applyOrn();
    $("quranGear").addEventListener("click", openSettings);
    $("quranSetGrip").addEventListener("click", closeSheet);
    $("quranOrnToggle").addEventListener("click", function () {
      try { localStorage.setItem(ORN, ornOn() ? "false" : "true"); } catch (e) {}
      applyOrn();
    });
    $("quranHifzToggle").addEventListener("click", function () {
      try { localStorage.setItem(HFK, hifzOn() ? "0" : "1"); } catch (e) {}
      var tb = $("quranToolbar"); if (tb) tb.hidden = true; clearSel();
      applyHifz();
    });
    $("quranHifzHint").addEventListener("click", function () { applyHifz(); });
    $("quranTjToggle").addEventListener("click", function () {
      var turnOn = !tjOn();
      try { localStorage.setItem(TJK, turnOn ? "1" : "0"); } catch (e) {}
      applyTj();
      var redo = function () { if (cur) openPage(cur, true); };
      if (turnOn) tjLoad(redo); else redo();
    });
    applyTj();
    if (tjOn()) tjLoad(function () { if (cur) openPage(cur, true); });
    applyHifz();
    paintHomeResume();
    document.addEventListener("visibilitychange", paintHomeResume);
    var qr = $("tasksQuranRow");
    if (qr) qr.addEventListener("click", function () {
      var n = document.querySelector('.nav-item[data-page="quran"]'); if (n) n.click();
      setTimeout(function () { openPage(lastPage() || 1); }, 60);
    });
    new MutationObserver(function () { if (hifzOn()) document.querySelectorAll(".quran-hifz-shown").forEach(function (e) { e.classList.remove("quran-hifz-shown"); }); }).observe($("quranReader"), { childList: true });
    $("quranBack").addEventListener("click", function () { openSheet(); setSeg("surah"); });
    $("quranTbPage").addEventListener("click", function () { openSheet(); setSeg("surah"); });
    document.addEventListener("click", function (e) {
      var p = e.target.closest(".quran-pill[data-open]");
      if (!p) return;
      e.stopPropagation();
      openSheet();
      setSeg(p.dataset.open);
    }, true);
    $("quranBackdrop").addEventListener("click", closeSheet);
    document.addEventListener("click", function (e) {
      var open = ["quranVerseSheet", "quranTafsirSheet", "quranSavedSheet", "quranNotesSheet", "quranFavSheet", "quranSettings"].filter(function (id) { return $(id) && !$(id).hidden; });
      if (!open.length) return;
      if (e.target.closest(".quran-sheet") || e.target.closest("#quranToolbar")) return;
      closeSheet();
    }, true);
    $("quranGrip").addEventListener("click", closeSheet);
    var tx = null;
    var rv = $("quranReadView");
    rv.addEventListener("touchstart", function (e) { tx = e.touches.length === 1 ? [e.touches[0].clientX, e.touches[0].clientY] : null; }, { passive: true });
    rv.addEventListener("touchend", function (e) {
      if (!tx) return;
      var dx = e.changedTouches[0].clientX - tx[0], dy = e.changedTouches[0].clientY - tx[1];
      tx = null;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) openPage(cur + (dx > 0 ? 1 : -1));
    }, { passive: true });
    $("quranSearch").addEventListener("input", function (e) { renderList(e.target.value); });
    document.addEventListener("click", function (e) {
      if (!e.target.closest("#quranListView")) return;
      var r = e.target.closest("[data-surah]");
      if (r) openPage(pageOfSurah(Number(r.dataset.surah)));
      var rs = e.target.closest("#quranResume");
      if (rs) openPage(Number(rs.dataset.page));
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
