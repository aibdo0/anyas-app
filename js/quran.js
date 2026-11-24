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
  var SHEETS = ["quranNotesSheet", "quranListView", "quranSettings", "quranSearchSheet", "quranVerseSheet", "quranFavSheet"];
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
        var one = '<span class="quran-ayah" data-s="' + s + '" data-a="' + a + '">' + t + ' <span class="quran-end">' + ar(a) + "</span>" + (isSajda(s, a) ? '<span class="quran-sajda" title="موضع سجدة تلاوة">\u06E9</span>' : "") + (getNote(s + ":" + a) ? '<span class="quran-notedot" title="لديك ملاحظة"></span>' : "") + "</span> ";
        if (viewMode() === "verse") body += '<div class="quran-vcard"><p class="quran-text">' + one + '</p><div class="quran-vref">سورة ' + Q.names[s - 1] + " · آية " + ar(a) + "</div></div>";
        else txt += one;
      }
      if (txt) body += '<p class="quran-text">' + txt + "</p>";
      if (a > n) { s++; a = 1; } else break;
    }
    $("quranReader").innerHTML = '<article class="quran-page' + (viewMode() === "verse" ? " quran-verses" : "") + '"><div class="quran-pills"><span class="quran-pill">سورة ' + Q.names[st[0] - 1] +
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
