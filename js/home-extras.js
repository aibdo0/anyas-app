// الصفحة الرئيسية: خلفية البطاقة بحسب الوقت، و«كمّل من وقفت».
(function () {
  "use strict";
  var root = document.documentElement;
  var num = function (v) { return Number(v || 0).toLocaleString("ar-EG"); };

  // 1) مشهد الوقت: فجر / نهار / مغرب / ليل
  function minutes(str) {
    var m = /(\d{1,2}):(\d{2})/.exec(String(str || ""));
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  }
  function currentScene() {
    var now = new Date(), cur = now.getHours() * 60 + now.getMinutes();
    var t = window.todayTimings || {};
    var fajr = minutes(t.Fajr), sunrise = minutes(t.Sunrise), maghrib = minutes(t.Maghrib), isha = minutes(t.Isha);
    if (fajr == null || sunrise == null || maghrib == null || isha == null) {
      var h = now.getHours();
      return h >= 4 && h < 7 ? "fajr" : h >= 7 && h < 16 ? "day" : h >= 16 && h < 19 ? "maghrib" : "night";
    }
    if (cur >= fajr && cur < sunrise + 45) return "fajr";
    if (cur >= sunrise + 45 && cur < maghrib - 45) return "day";
    if (cur >= maghrib - 45 && cur < isha) return "maghrib";
    return "night";
  }
  function applyScene() { root.dataset.homeScene = currentScene(); }

  // 2) كمّل من وقفت
  function renderContinue() {
    var card = document.getElementById("homeContinueCard");
    if (!card) return;
    var title = card.querySelector("[data-continue-title]");
    var meta = card.querySelector("[data-continue-meta]");
    var sections = (window.anyasWird && window.anyasWird.sections()) || [];
    var part = sections.filter(function (s) { return s.done > 0 && s.done < s.total; })
      .sort(function (a, b) { return (b.done / b.total) - (a.done / a.total); })[0];
    if (part) {
      card.dataset.target = "wird:" + part.id;
      title.textContent = "كمّل " + part.title;
      meta.textContent = "وقفت عند " + num(part.done) + " من " + num(part.total);
      card.hidden = false;
      return;
    }
    card.hidden = true;
  }

  document.addEventListener("DOMContentLoaded", function () {
    applyScene();
    setInterval(applyScene, 60 * 1000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) applyScene(); });

    var card = document.getElementById("homeContinueCard");
    if (card) card.addEventListener("click", function () {
      var target = card.dataset.target || "";
      if (target.indexOf("wird:") === 0 && window.openWirdCategory) window.openWirdCategory(target.slice(5));
      else if (target === "tasbeeh" && window.goToPage) window.goToPage("tasbeeh");
    });

    document.addEventListener("anyas:wird-progress", renderContinue);
    // تأخير بسيط حتى تنتهي بقية السكربتات من التهيئة
    setTimeout(function () { renderContinue(); }, 0);
  });
})();
