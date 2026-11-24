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
    return String(t).replace(/[\u064B-\u065F\u0670\u0640]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
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
        '</span><span class="quran-name">سورة ' + name + '</span></button>';
    });
    box.innerHTML = html || '<p class="quran-empty">لا توجد سورة بهذا الاسم.</p>';
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
    $("quranListView").hidden = false;
    $("quranBackdrop").hidden = false;
    updateResume();
    renderList($("quranSearch").value || "");
  }
  function closeSheet() {
    $("quranListView").hidden = true;
    $("quranSettings").hidden = true;
    $("quranBackdrop").hidden = true;
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
    $("quranListView").hidden = true;
    $("quranSettings").hidden = false;
    $("quranBackdrop").hidden = false;
    applyOrn();
  }

  function updateResume() {
    var Q = window.ANIAS_QURAN, b = $("quranResume"), pg = Q && window.ANIAS_QURAN_PAGES ? lastPage() : 0;
    if (!b) return;
    if (pg > 0) {
      var first = window.ANIAS_QURAN_PAGES.pages[pg - 1];
      b.hidden = false;
      b.textContent = "آخر قراءة: صفحة " + ar(pg) + " · سورة " + Q.names[first[0] - 1];
      b.dataset.page = pg;
    } else b.hidden = true;
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
        txt += '<span class="quran-ayah">' + t + ' <span class="quran-end">' + ar(a) + "</span></span> ";
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
    ["quranBackdrop", "quranListView", "quranSettings"].forEach(function (id) { document.body.appendChild($(id)); });
    document.querySelectorAll(".nav-item").forEach(function (n) { n.addEventListener("click", closeSheet); });
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
