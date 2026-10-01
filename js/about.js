(() => {
  const $ = id => document.getElementById(id);
  const t = value => window.anyasTranslate ? window.anyasTranslate(value) : value;

  function setStatus(message) {
    const status = $("aboutActionStatus");
    if (status) {
      status.hidden = false;
      status.textContent = t(message);
    }
  }

  async function copyText(value) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
    return false;
  }

  function makeFeedbackMessage() {
    const text = $("aboutFeedbackText")?.value.trim() || "";
    const title = $("aboutFeedbackTitle")?.textContent.trim() || "Anias feedback";
    return `${title}\n${text}\n\nAnias ${document.documentElement.lang === "en" ? "version" : "الإصدار"} 1.1.5`;
  }

  function openFeedback(kind) {
    const dialog = $("aboutFeedbackDialog");
    const title = $("aboutFeedbackTitle");
    const hint = $("aboutFeedbackHint");
    const textarea = $("aboutFeedbackText");
    if (!dialog || !title || !hint || !textarea) return;
    if (kind === "support") {
      title.textContent = t("الحصول على الدعم");
      hint.textContent = t("لا توجد قناة دعم رسمية مضافة بعد.") + " " + t("اكتب رسالتك، ثم اختر مشاركتها من قائمة جهازك.");
    } else {
      title.textContent = t("الملاحظات والاقتراحات");
      hint.textContent = t("اكتب رسالتك، ثم اختر مشاركتها من قائمة جهازك.");
    }
    textarea.value = "";
    try { dialog.showModal(); } catch (error) { dialog.setAttribute("open", ""); }
    textarea.focus();
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("aboutSupportButton")?.addEventListener("click", () => openFeedback("support"));
    $("aboutFeedbackButton")?.addEventListener("click", () => openFeedback("feedback"));
    $("aboutNotificationSettingsButton")?.addEventListener("click", () => {
      if (typeof window.goToPage === "function") window.goToPage("settings");
    });

    $("aboutFeedbackShare")?.addEventListener("click", async () => {
      const textarea = $("aboutFeedbackText");
      if (!textarea?.value.trim()) {
        textarea?.focus();
        setStatus("اكتب رسالتك أولًا.");
        return;
      }
      const title = $("aboutFeedbackTitle")?.textContent.trim() || "Anias feedback";
      const text = makeFeedbackMessage();
      try {
        if (navigator.share) {
          await navigator.share({ title, text, url: location.href });
          setStatus("تم فتح قائمة المشاركة على جهازك.");
        } else if (await copyText(text)) {
          setStatus("تم نسخ الرسالة");
        } else {
          setStatus("لم نتمكن من النسخ؛ يمكنك تحديد الرسالة ونسخها يدويًا.");
        }
      } catch (error) {
        if (error?.name !== "AbortError") setStatus("ظهر خطأ أثناء المشاركة. يمكنك نسخ الرسالة بدلًا من ذلك.");
      }
    });

    $("aboutFeedbackCopy")?.addEventListener("click", async () => {
      if (!$("aboutFeedbackText")?.value.trim()) {
        $("aboutFeedbackText")?.focus();
        setStatus("اكتب رسالتك أولًا.");
        return;
      }
      try {
        if (await copyText(makeFeedbackMessage())) setStatus("تم نسخ الرسالة");
        else setStatus("لم نتمكن من النسخ؛ يمكنك تحديد الرسالة ونسخها يدويًا.");
      } catch (error) {
        setStatus("لم نتمكن من النسخ؛ يمكنك تحديد الرسالة ونسخها يدويًا.");
      }
    });

    $("aboutShareButton")?.addEventListener("click", async () => {
      const url = location.href.split("#")[0];
      const title = t("أنياس");
      const text = t("رفيقك اليومي للعبادة وتنظيم يومك");
      try {
        if (navigator.share) {
          await navigator.share({ title, text, url });
          setStatus("تم فتح قائمة المشاركة على جهازك.");
        } else if (await copyText(url)) {
          setStatus("تم نسخ رابط التطبيق");
        } else {
          setStatus(url);
        }
      } catch (error) {
        if (error?.name !== "AbortError") setStatus("ظهر خطأ أثناء المشاركة. يمكنك نسخ الرسالة بدلًا من ذلك.");
      }
    });

    const ratingButtons = [...( $("aboutRatingControl")?.querySelectorAll("[data-rating]") || [] )];
    const renderRating = rating => {
      ratingButtons.forEach(button => {
        const selected = Number(button.dataset.rating) <= rating;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-checked", String(Number(button.dataset.rating) === rating));
        button.tabIndex = Number(button.dataset.rating) === (rating || 1) ? 0 : -1;
      });
    };
    let savedRating = 0;
    try { savedRating = Number(localStorage.getItem("anyas_rating") || 0); } catch (error) { /* rating is optional */ }
    renderRating(savedRating >= 1 && savedRating <= 5 ? savedRating : 0);
    ratingButtons.forEach(button => {
      button.addEventListener("keydown", event => {
        if (!["ArrowRight", "ArrowUp", "ArrowLeft", "ArrowDown"].includes(event.key)) return;
        event.preventDefault();
        const direction = ["ArrowRight", "ArrowUp"].includes(event.key) ? 1 : -1;
        const currentIndex = ratingButtons.indexOf(button);
        ratingButtons[(currentIndex + direction + ratingButtons.length) % ratingButtons.length]?.click();
        ratingButtons[(currentIndex + direction + ratingButtons.length) % ratingButtons.length]?.focus();
      });
      button.addEventListener("click", () => {
      const rating = Number(button.dataset.rating);
      renderRating(rating);
      let stored = true;
      try { localStorage.setItem("anyas_rating", String(rating)); } catch (error) { stored = false; }
      const status = $("aboutRatingStatus");
      if (status) status.textContent = t(stored ? "تم حفظ تقييمك على هذا الجهاز فقط." : "تعذر حفظ التقييم على هذا الجهاز.");
      });
    });
  }, { once: true });
})();
