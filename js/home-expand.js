// آية اليوم وحديث اليوم: الضغط على البطاقة يعرض النص كاملًا، وضغطة أخرى تطويه.
(function () {
  "use strict";
  var card = document.getElementById("dailyContentCard");
  if (!card) return;
  var blocks = card.querySelectorAll(".content-block");
  blocks.forEach(function (b) {
    b.setAttribute("role", "button");
    b.setAttribute("tabindex", "0");
    b.setAttribute("aria-expanded", "false");
    function toggle() {
      var open = b.classList.toggle("expanded");
      b.setAttribute("aria-expanded", open ? "true" : "false");
    }
    b.addEventListener("click", toggle);
    b.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
    });
  });
})();
