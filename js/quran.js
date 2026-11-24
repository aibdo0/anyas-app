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

  function renderList(q) {
    var Q = window.ANIAS_QURAN;
    var box = $("quranList");
    if (!Q || !box) return;
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
  var SHEETS = ["quranListView", "quranSettings", "quranSearchSheet", "quranVerseSheet", "quranFavSheet"];
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
  function selectVerse(s1, a1) {
    var Q = window.ANIAS_QURAN;
    sel = { s: s1, a: a1 };
    applySel();
    var t = Q.ayahs[s1 - 1][a1 - 1];
    var B = Q.ayahs[0][0];
    if (a1 === 1 && s1 !== 1 && s1 !== 9 && t.indexOf(B + " ") === 0) t = t.slice(B.length + 1);
    $("quranVerseRef").textContent = "سورة " + Q.names[s1 - 1] + " · آية " + ar(a1);
    $("quranVerseText").textContent = t;
    $("quranVerseNote").textContent = "التفسير قيد التجهيز وسيُضاف في إصدار قادم.";
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
  function doFind(q) {
    var Q = window.ANIAS_QURAN, out = $("quranFindList"), term = norm(q);
    if (!normCache) normCache = Q.ayahs.map(function (arr, i) { return arr.map(function (t, k) { return norm(i !== 0 && i !== 8 && k === 0 ? t.replace(Q.ayahs[0][0], "") : t); }); });
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
  function openSettings() {
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
    var fr = $("quranFavRow"), fc = getFavs().length;
    fr.hidden = !fc;
    fr.textContent = "الآيات المفضلة (" + ar(fc) + ")";
  }

  function juzOf(s1, a1) {
    var j = 1;
    window.ANIAS_QURAN_PAGES.juz.forEach(function (x, k) { if (x[0] < s1 || (x[0] === s1 && x[1] <= a1)) j = k + 1; });
    return j;
  }

  function openPage(pg, keepScroll) {
    var Q = window.ANIAS_QURAN, PG = window.ANIAS_QURAN_PAGES;
    if (!Q || !PG) return;
    pg = Math.max(1, Math.min(604, pg));
    cur = pg;
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
        if (a === 1 && s !== 1 && s !== 9 && t.indexOf(BISM + " ") === 0) t = t.slice(BISM.length + 1);
        txt += '<span class="quran-ayah" data-s="' + s + '" data-a="' + a + '">' + t + ' <span class="quran-end">' + ar(a) + "</span></span> ";
      }
      body += '<p class="quran-text">' + txt + "</p>";
      if (a > n) { s++; a = 1; } else break;
    }
    $("quranReader").innerHTML = '<article class="quran-page"><div class="quran-pills"><span class="quran-pill">سورة ' + Q.names[st[0] - 1] +
      '</span><span class="quran-pill">' + JUZ[juzOf(st[0], st[1]) - 1] + "</span></div>" + body +
      '<div class="quran-pageno"><span>' + ar(pg) + "</span></div></article>";
    closeSheet();
    $("quranTitle").textContent = "سورة " + Q.names[st[0] - 1];
    $("quranSub").textContent = "صفحة " + ar(pg) + " من ٦٠٤";
    $("quranPrev").hidden = pg === 1;
    $("quranNext").hidden = pg === 604;
    setLast({ p: pg });
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
    $("quranReader").addEventListener("click", function (e) {
      var v = e.target.closest(".quran-ayah");
      if (v) { selectVerse(Number(v.dataset.s), Number(v.dataset.a)); return; }
      var tb = $("quranToolbar");
      tb.hidden = !tb.hidden;
      syncToolbar();
    });
    $("quranTbGear").addEventListener("click", openSettings);
    $("quranTbSearch").addEventListener("click", function () { showOnly("quranSearchSheet"); $("quranFind").focus(); });
    $("quranTbMark").addEventListener("click", function () {
      try { if (getMark() === cur) localStorage.removeItem(KS.mark); else localStorage.setItem(KS.mark, String(cur)); } catch (e) {}
      syncToolbar();
    });
    $("quranFind").addEventListener("input", function (e) { doFind(e.target.value); });
    $("quranMarkRow").addEventListener("click", function () { openPage(Number($("quranMarkRow").dataset.page)); });
    $("quranFavRow").addEventListener("click", function () { renderFavs(); showOnly("quranFavSheet"); });
    ["quranSearchGrip", "quranVerseGrip", "quranFavGrip"].forEach(function (id) { $(id).addEventListener("click", closeSheet); });
    document.addEventListener("click", function (e) {
      var r = e.target.closest(".quran-find-row");
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
      window.anyasShareImage.shareCustom(plainVerse(sel.s, sel.a), refLabel(sel.s + ":" + sel.a), function (m) { $("quranVerseNote").textContent = m || "التفسير قيد التجهيز وسيُضاف في إصدار قادم."; });
    });
    applyOrn();
    $("quranGear").addEventListener("click", openSettings);
    $("quranSetGrip").addEventListener("click", closeSheet);
    $("quranOrnToggle").addEventListener("click", function () {
      try { localStorage.setItem(ORN, ornOn() ? "false" : "true"); } catch (e) {}
      applyOrn();
    });
    $("quranBack").addEventListener("click", openSheet);
    $("quranBackdrop").addEventListener("click", closeSheet);
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
    $("quranNext").addEventListener("click", function () { openPage(cur + 1); });
    $("quranPrev").addEventListener("click", function () { openPage(cur - 1); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
