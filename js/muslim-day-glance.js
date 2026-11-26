/* يوم المسلم: شريط «اليوم في لمحة» (ورد اليوم، دعاء اليوم، الاستغفار، موضعك في المصحف). */
(function () {
  "use strict";
  var DUAS = [
    ["رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ", "البقرة ٢٠١"],
    ["رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي", "طه ٢٥–٢٦"],
    ["رَبِّ زِدْنِي عِلْمًا", "طه ١١٤"],
    ["رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِنْ لَدُنْكَ رَحْمَةً ۚ إِنَّكَ أَنْتَ الْوَهَّابُ", "آل عمران ٨"],
    ["رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا", "الفرقان ٧٤"],
    ["رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ", "إبراهيم ٤١"],
    ["رَبَّنَا ظَلَمْنَا أَنْفُسَنَا وَإِنْ لَمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ", "الأعراف ٢٣"],
    ["رَبَّنَا تَقَبَّلْ مِنَّا ۖ إِنَّكَ أَنْتَ السَّمِيعُ الْعَلِيمُ", "البقرة ١٢٧"]
  ];
  var TOTAL_PAGES = 604;
  function $(id) { return document.getElementById(id); }
  function ar(n) { return String(n).replace(/\d/g, function (d) { return "٠١٢٣٤٥٦٧٨٩"[d]; }); }
  function dayIndex() {
    try { if (typeof getHijriDayOfYear === "function") return getHijriDayOfYear(); } catch (e) {}
    var d = new Date(); return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
  }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
  function goQuran() { var n = document.querySelector('.nav-item[data-page="quran"]'); if (n) n.click(); }
  function lastRead() { try { return JSON.parse(localStorage.getItem("anyas_quran_last") || "null"); } catch (e) { return null; } }

  function build() {
    if ($("mdGlance")) return;
    var anchor = document.querySelector("#page-tasks .daily-overview-card");
    if (!anchor) return;
    var sec = document.createElement("section");
    sec.id = "mdGlance"; sec.className = "md-glance"; sec.setAttribute("aria-label", "اليوم في لمحة");
    sec.innerHTML =
      '<div class="md-glance-head"><h2>اليوم في لمحة</h2></div><div class="md-glance-row">' +
      '<button type="button" class="md-tile md-ayah" id="mdAyah"><small>ورد اليوم</small><p></p><span></span></button>' +
      '<article class="md-tile md-dua"><small>دعاء اليوم</small><p id="mdDuaText"></p><span id="mdDuaRef"></span></article>' +
      '<button type="button" class="md-tile md-istighfar" id="mdIstighfar"><small>الاستغفار</small><strong id="mdIstCount">٠</strong><span>اضغط للعدّ</span></button>' +
      '<button type="button" class="md-tile md-mushaf" id="mdMushaf"><small>موضعك في المصحف</small><strong id="mdMushafPage">—</strong><i><b id="mdMushafBar"></b></i><span id="mdMushafSub"></span></button>' +
      '</div>';
    anchor.insertAdjacentElement("afterend", sec);
    $("mdAyah").addEventListener("click", goQuran);
    $("mdMushaf").addEventListener("click", goQuran);
    $("mdIstighfar").addEventListener("click", function () {
      var b = document.querySelector('[data-increment-dhikr="istighfar"]'); if (b) b.click();
    });
    var list = $("dhikrGoalList");
    if (list) new MutationObserver(paint).observe(list, { childList: true, subtree: true });
    var page = $("page-tasks");
    if (page) new MutationObserver(paint).observe(page, { attributes: true, attributeFilter: ["class"] });
    paint();
  }

  function paint() {
    if (!$("mdGlance")) return;
    var day = dayIndex(), verses = window.dailyQuranSelection || [], v = verses[(day - 1) % (verses.length || 1)];
    var ay = $("mdAyah");
    if (v) { ay.querySelector("p").textContent = v.text; ay.querySelector("span").textContent = "سورة " + v.surahName + " · آية " + ar(v.ayah); }
    var d = DUAS[day % DUAS.length];
    $("mdDuaText").textContent = d[0]; $("mdDuaRef").textContent = d[1];
    var c = document.querySelector('.dhikr-goal-card[data-goal-id="istighfar"] .dhikr-goal-count');
    $("mdIstCount").textContent = c ? c.textContent.trim() : "٠";
    var lv = lastRead(), p = lv && lv.p ? Number(lv.p) : 0;
    $("mdMushafPage").textContent = p ? "صفحة " + ar(p) : "ابدأ القراءة";
    $("mdMushafBar").style.width = (p ? Math.min(100, p / TOTAL_PAGES * 100) : 0) + "%";
    $("mdMushafSub").textContent = p ? "من " + ar(TOTAL_PAGES) + (lv.n ? " · " + lv.n : "") : "من أول المصحف";
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();
})();
