/* يوم المسلم: قائمة مهام يومية بسيطة. تُصفَّر تلقائيًا مع تغيّر التاريخ المحلي (منتصف الليل). */
(function () {
  "use strict";
  var KEY = "anyas_md_checklist";
  var ICONS = {
    sun: '<path d="M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4"/><circle cx="12" cy="12" r="3.5"/>',
    book: '<path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5z"/><path d="M12 6v13.5"/>',
    mosque: '<path d="M3 20h18M5 20v-7h14v7M8 13a4 4 0 0 1 8 0M12 6V4M12 9.2v.1"/>',
    dusk: '<path d="M3 18h18M6 18a6 6 0 0 1 12 0M12 9v3M4.6 11.6l2 2M19.4 11.6l-2 2"/>',
    star: '<path d="M12 4l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 9.3l5-.7z"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>'
  };
  var ITEMS = [
    { id: "morning", title: "أذكار الصباح", icon: "sun", open: "morning" },
    { id: "salawat", title: "الصلاة على النبي ﷺ", icon: "heart", friday: true },
    { id: "friday", title: "مهام الجمعة", sub: "سورة الكهف وصلاة الجمعة", icon: "cal", friday: true },
    { id: "quran", title: "ورد من القرآن", icon: "book", nav: "quran" },
    { id: "afterPrayer", title: "أذكار بعد كل صلاة", icon: "mosque", open: "afterPrayer" },
    { id: "evening", title: "أذكار المساء", icon: "dusk", open: "evening" },
    { id: "istighfar", title: "استغفار", icon: "star" },
    { id: "sleep", title: "أذكار النوم", icon: "moon", open: "beforeSleep" }
  ];
  function $(id) { return document.getElementById(id); }
  function today() { var d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && s.date === today()) return s; } catch (e) {}
    return { date: today(), done: {} };
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function svg(k) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[k] + "</svg>"; }
  function isFriday() { return new Date().getDay() === 5; }

  function render() {
    var box = $("mdList"); if (!box) return;
    var s = load(), fri = isFriday();
    box.innerHTML = ITEMS.filter(function (it) { return !it.friday || fri; }).map(function (it) {
      var on = !!s.done[it.id];
      return '<div class="mdc-row' + (on ? " is-done" : "") + '" data-id="' + it.id + '">' +
        '<button type="button" class="mdc-check" role="checkbox" aria-checked="' + on + '" aria-label="' + it.title + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>' +
        '<span class="mdc-ico">' + svg(it.icon) + "</span>" +
        '<span class="mdc-txt"><strong>' + it.title + "</strong>" + (it.sub ? "<small>" + it.sub + "</small>" : "") + "</span>" +
        ((it.open || it.nav) ? '<button type="button" class="mdc-go" aria-label="فتح ' + it.title + '">‹</button>' : "") +
        "</div>";
    }).join("");
  }
  function head() {
    var d = new Date(), day = "";
    try { day = d.toLocaleDateString("ar-EG", { weekday: "long" }); } catch (e) {}
    var el = $("mdDay"); if (el) el.textContent = day;
    var h = $("hijriDate"), hv = $("mdHijri");
    if (hv && h) { var t = h.textContent.trim(); if (t && t.indexOf("جاري") < 0) hv.textContent = t; }
    var n = $("nextPrayerName"), c = $("countdown"), mn = $("mdNextName"), mc = $("mdCount");
    if (n && mn) mn.textContent = n.textContent.trim();
    if (c && mc) mc.textContent = c.textContent.trim();
    var s = load();
    if (window.__mdDate !== s.date || window.__mdFri !== isFriday()) { window.__mdDate = s.date; window.__mdFri = isFriday(); render(); }
  }
  function openTarget(it) {
    if (it.nav) { var n = document.querySelector('.nav-item[data-page="' + it.nav + '"]'); if (n) n.click(); return; }
    var t = document.querySelector('[data-wird-toggle="' + it.open + '"]'); if (t) t.click();
  }
  function build() {
    if ($("mdChecklist")) return;
    var page = $("page-tasks"); if (!page) return;
    var sec = document.createElement("section");
    sec.id = "mdChecklist"; sec.className = "mdc";
    sec.innerHTML =
      '<header class="mdc-head"><div><h1 id="mdDay">اليوم</h1><p id="mdHijri"></p></div>' +
      '<div class="mdc-next"><small>الصلاة القادمة · <b id="mdNextName">--</b></small><strong id="mdCount">--:--:--</strong></div></header>' +
      '<div class="mdc-list" id="mdList"></div>';
    page.insertBefore(sec, page.firstChild);
    sec.addEventListener("click", function (e) {
      var row = e.target.closest(".mdc-row"); if (!row) return;
      var it = ITEMS.filter(function (x) { return x.id === row.dataset.id; })[0];
      if (e.target.closest(".mdc-go")) { openTarget(it); return; }
      var s = load(); s.done[it.id] = !s.done[it.id]; if (!s.done[it.id]) delete s.done[it.id]; save(s); render();
    });
    render(); head();
    setInterval(head, 1000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();
})();
