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
        '</span><span class="quran-name">سورة ' + name + '</span><span class="quran-count">' + ar(Q.ayahs[i].length) + ' آية</span></button>';
    });
    box.innerHTML = html || '<p class="quran-empty">لا توجد سورة بهذا الاسم.</p>';
  }

  function showList() {
    $("quranReadView").hidden = true;
    $("quranListView").hidden = false;
    $("quranBack").hidden = true;
    $("quranTitle").textContent = "القرآن الكريم";
    $("quranSub").textContent = "اختر سورة للقراءة";
    updateResume();
    window.scrollTo(0, 0);
  }

  function updateResume() {
    var Q = window.ANIAS_QURAN, b = $("quranResume"), l = getLast();
    if (!b) return;
    if (Q && l && Q.names[l.s]) {
      b.hidden = false;
      b.textContent = "كمّل القراءة من سورة " + Q.names[l.s];
      b.dataset.surah = l.s;
      b.dataset.resume = "1";
    } else b.hidden = true;
  }

  function openSurah(i, resume) {
    var Q = window.ANIAS_QURAN;
    if (!Q || i < 0 || i > 113) return;
    cur = i;
    var BISM = Q.ayahs[0][0];
    var v = Q.ayahs[i].slice();
    var PG = window.ANIAS_QURAN_PAGES, n = v.length;
    var hasBism = i !== 0 && i !== 8;
    if (hasBism && v[0].indexOf(BISM + " ") === 0) v[0] = v[0].slice(BISM.length + 1);
    // pages that start inside this surah, plus the page that holds ayah 1
    var starts = [[1, 1]], s1 = i + 1, firstPage = 1;
    PG.pages.forEach(function (p, k) {
      if (p[0] < s1 || (p[0] === s1 && p[1] <= 1)) firstPage = k + 1;
      else if (p[0] === s1) starts.push([p[1], k + 1]);
    });
    starts[0][1] = firstPage;
    function juzOf(a) {
      var j = 1;
      PG.juz.forEach(function (x, k) { if (x[0] < s1 || (x[0] === s1 && x[1] <= a)) j = k + 1; });
      return j;
    }
    var html = "";
    starts.forEach(function (st, k) {
      var from = st[0], to = k + 1 < starts.length ? starts[k + 1][0] - 1 : n;
      var txt = "";
      for (var a = from; a <= to; a++) {
        txt += '<span class="quran-ayah">' + v[a - 1] + ' <span class="quran-end">' + ar(a) + "</span></span> ";
      }
      html += '<article class="quran-page"><div class="quran-pills"><span class="quran-pill">سورة ' + Q.names[i] +
        '</span><span class="quran-pill">' + JUZ[juzOf(from) - 1] + "</span></div>" +
        (k === 0 && hasBism ? '<p class="quran-bism">' + BISM + "</p>" : "") +
        '<p class="quran-text">' + txt + '</p><div class="quran-pageno"><span>' + ar(st[1]) + "</span></div></article>";
    });
    $("quranReader").innerHTML = html;
    $("quranListView").hidden = true;
    $("quranReadView").hidden = false;
    $("quranBack").hidden = false;
    $("quranTitle").textContent = "سورة " + Q.names[i];
    $("quranSub").textContent = ar(Q.ayahs[i].length) + " آية";
    $("quranPrev").hidden = i === 0;
    $("quranNext").hidden = i === 113;
    var l = getLast();
    var y = resume && l && l.s === i ? l.y || 0 : 0;
    setLast({ s: i, y: y });
    setTimeout(function () { window.scrollTo(0, y); }, 30);
  }

  var t;
  window.addEventListener("scroll", function () {
    if (!$("quranReadView") || $("quranReadView").hidden || !$("page-quran").classList.contains("active")) return;
    clearTimeout(t);
    t = setTimeout(function () { setLast({ s: cur, y: Math.round(window.scrollY) }); }, 400);
  }, { passive: true });

  function init() {
    var page = $("page-quran");
    if (!page) return;
    document.querySelectorAll('[data-page="quran"]').forEach(function (b) {
      b.addEventListener("click", function () {
        load().then(function () {
          renderList("");
          showList();
        }).catch(function () {
          $("quranList").innerHTML = '<p class="quran-empty">تعذّر تحميل المصحف. حاول مرة أخرى.</p>';
        });
      });
    });
    $("quranSearch").addEventListener("input", function (e) { renderList(e.target.value); });
    page.addEventListener("click", function (e) {
      var r = e.target.closest("[data-surah]");
      if (r) openSurah(Number(r.dataset.surah), r.dataset.resume === "1");
    });
    $("quranNext").addEventListener("click", function () { openSurah(cur + 1); });
    $("quranPrev").addEventListener("click", function () { openSurah(cur - 1); });
    document.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("#quranBack");
      if (b && !$("quranReadView").hidden) {
        e.stopImmediatePropagation();
        e.preventDefault();
        showList();
      }
    }, true);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
