/* شريط الصلوات الخمس داخل بطاقة الصلاة القادمة + تفاصيل الصلاة عند الضغط + الشروق.
   يقرأ المواقيت المعروضة أصلاً ولا يغيّر منطق حساب الصلوات. */
(function () {
  var card = document.querySelector("#page-home .next-prayer");
  var nameEl = document.getElementById("nextPrayerName");
  var timeEl = document.getElementById("nextPrayerTime");
  if (!card || !nameEl) return;
  var items = [["الفجر", "fajrTime"], ["الظهر", "dhuhrTime"], ["العصر", "asrTime"], ["المغرب", "maghribTime"], ["العشاء", "ishaTime"]];
  var strip = document.createElement("div");
  strip.className = "hero-strip";
  card.appendChild(strip);
  var sun = document.createElement("div");
  sun.className = "hero-sunrise";
  card.appendChild(sun);
  var pop = document.createElement("div");
  pop.className = "hero-pop";
  pop.hidden = true;
  card.appendChild(pop);
  var popTimer = null;

  function ar(n) { return String(n).replace(/\d/g, function (d) { return "٠١٢٣٤٥٦٧٨٩"[d]; }); }
  function parse(text) {
    var t = String(text || "").replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); });
    var m = t.match(/(\d{1,2})\s*:\s*(\d{2})/);
    if (!m) return null;
    var h = +m[1], mi = +m[2];
    if (/[مP]/i.test(t) && h < 12) h += 12;
    if (/[صA]/i.test(t) && h === 12) h = 0;
    return { h: h, m: mi };
  }
  function unit(n, one, two, few, many) {
    if (n === 1) return one;
    if (n === 2) return two;
    return ar(n) + " " + (n >= 3 && n <= 10 ? few : many);
  }
  function span(mins) {
    var h = Math.floor(mins / 60), m = mins % 60, out = [];
    if (h) out.push(unit(h, "ساعة", "ساعتان", "ساعات", "ساعة"));
    if (m) out.push(unit(m, "دقيقة", "دقيقتان", "دقائق", "دقيقة"));
    return out.length ? out.join(" و") : "أقل من دقيقة";
  }
  function closePop() { pop.hidden = true; clearTimeout(popTimer); }
  function openPop(item) {
    var src = document.getElementById(item[1]);
    var p = parse(src && src.textContent);
    if (!p) return;
    var now = new Date();
    var at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), p.h, p.m, 0);
    var isNext = (nameEl.textContent || "").trim() === item[0];
    if (isNext && at <= now) at = new Date(at.getTime() + 86400000);
    var mins = Math.round(Math.abs(at - now) / 60000);
    var rel = at > now ? "بعد " + span(mins) : "مضى منذ " + span(mins);
    pop.innerHTML = "";
    var h = document.createElement("div"); h.className = "hero-pop-head";
    var nm = document.createElement("b"); nm.textContent = item[0];
    var tm = document.createElement("span"); tm.textContent = src.textContent.trim();
    var x = document.createElement("button"); x.type = "button"; x.className = "hero-pop-x"; x.setAttribute("aria-label", "إغلاق"); x.textContent = "×";
    x.addEventListener("click", closePop);
    h.appendChild(nm); h.appendChild(tm); h.appendChild(x);
    var r = document.createElement("div"); r.className = "hero-pop-rel"; r.textContent = rel;
    pop.appendChild(h); pop.appendChild(r);
    pop.hidden = false;
    clearTimeout(popTimer);
    popTimer = setTimeout(closePop, 7000);
  }
  function render() {
    var next = (nameEl.textContent || "").trim();
    strip.innerHTML = "";
    items.forEach(function (it) {
      var src = document.getElementById(it[1]);
      var cell = document.createElement("button");
      cell.type = "button";
      cell.className = "hero-strip-item" + (it[0] === next ? " is-next" : "");
      cell.setAttribute("aria-label", it[0]);
      var n = document.createElement("span"); n.textContent = it[0];
      var t = document.createElement("b"); t.textContent = src ? src.textContent.replace(/\s*[صم]$/, "").trim() : "";
      cell.appendChild(n); cell.appendChild(t);
      cell.addEventListener("click", function () { openPop(it); });
      strip.appendChild(cell);
    });
    var s = document.getElementById("sunriseTime");
    sun.textContent = s && /\d|[٠-٩]/.test(s.textContent) ? "الشروق " + s.textContent.trim() : "";
  }
  var mo = new MutationObserver(render);
  [nameEl, timeEl].concat(items.map(function (it) { return document.getElementById(it[1]); }), [document.getElementById("sunriseTime")]).forEach(function (e) {
    if (e) mo.observe(e, { childList: true, characterData: true, subtree: true });
  });
  document.addEventListener("click", function (e) { if (!pop.hidden && !pop.contains(e.target) && !strip.contains(e.target)) closePop(); });
  render();
})();
