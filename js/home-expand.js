// آية اليوم وحديث اليوم: النص الطويل يُقصّ بسطور محددة، وزر «قراءة كاملة» يعرضه كاملًا ثم يطويه.
(function () {
  "use strict";
  var card = document.getElementById("dailyContentCard");
  if (!card) return;
  card.querySelectorAll(".content-block").forEach(function (b) {
    var text = b.querySelector(".ayah, .hadith-text");
    if (!text) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "daily-more-button";
    btn.textContent = "قراءة كاملة";
    btn.hidden = true;
    btn.setAttribute("aria-expanded", "false");
    text.insertAdjacentElement("afterend", btn);
    btn.addEventListener("click", function () {
      var open = b.classList.toggle("expanded");
      btn.textContent = open ? "إخفاء" : "قراءة كاملة";
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    function check() {
      if (b.classList.contains("expanded")) { btn.hidden = false; return; }
      btn.hidden = !(text.scrollHeight > text.clientHeight + 2);
    }
    new MutationObserver(check).observe(text, { childList: true, characterData: true, subtree: true });
    window.addEventListener("resize", check);
    setTimeout(check, 300); setTimeout(check, 1500);
  });
})();
