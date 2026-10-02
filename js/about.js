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

  const permissionCards = {
    location: {
      status: "locationPermissionStatus",
      enable: "enableLocationPermission",
      settings: "openLocationPermissionSettings",
      message: "locationPermissionMessage",
      enabledMessage: "تم تفعيل إذن الموقع."
    },
    notifications: {
      status: "notificationsPermissionStatus",
      enable: "enableNotificationsPermission",
      settings: "openNotificationsPermissionSettings",
      message: "notificationsPermissionMessage",
      enabledMessage: "تم تفعيل إذن الإشعارات."
    }
  };
  const permissionNeedsSettings = { location: false, notifications: false };

  function hasNativePermissionBridge() {
    const bridge = window.AnyasAndroid;
    return Boolean(bridge && typeof bridge.hasAboutPermission === "function"
      && typeof bridge.requestAboutPermission === "function");
  }

  async function isPermissionGranted(kind) {
    const bridge = window.AnyasAndroid;
    if (bridge && typeof bridge.hasAboutPermission === "function") {
      try { return Boolean(bridge.hasAboutPermission(kind)); } catch (error) { /* use browser permission state */ }
    }
    if (kind === "notifications") {
      return "Notification" in window && Notification.permission === "granted";
    }
    try {
      const permission = await navigator.permissions.query({ name: "geolocation" });
      return permission.state === "granted";
    } catch (error) {
      return false;
    }
  }

  function renderPermission(kind, granted, message = "") {
    const card = permissionCards[kind];
    if (!card) return;
    const status = $(card.status);
    const enableButton = $(card.enable);
    const settingsButton = $(card.settings);
    const messageElement = $(card.message);
    if (status) {
      status.textContent = t(granted ? "مفعّل" : "غير مفعّل");
      status.classList.toggle("is-enabled", Boolean(granted));
    }
    if (enableButton) {
      enableButton.disabled = Boolean(granted);
      enableButton.textContent = t(granted ? "مفعّل" : kind === "location" ? "تفعيل إذن الموقع" : "تفعيل إذن الإشعارات");
    }
    if (settingsButton) {
      settingsButton.hidden = Boolean(granted) || !permissionNeedsSettings[kind] || !hasNativePermissionBridge();
    }
    if (messageElement) messageElement.textContent = message;
  }

  function finishPermissionRequest(kind, granted, message) {
    permissionNeedsSettings[kind] = !granted;
    const fallbackMessage = granted
      ? t(permissionCards[kind].enabledMessage)
      : hasNativePermissionBridge()
        ? t("لم يتم منح الإذن. يمكنك فتح إعدادات التطبيق لتفعيله.")
        : t("أكمل تفعيل الإذن من إعدادات المتصفح أو الهاتف.");
    renderPermission(kind, granted, message || fallbackMessage);
  }

  async function enablePermission(kind) {
    const card = permissionCards[kind];
    const button = $(card?.enable);
    const message = $(card?.message);
    if (!card || !button) return;
    button.disabled = true;
    if (message) message.textContent = t("جارٍ طلب الإذن من الهاتف...");

    try {
      const bridge = window.AnyasAndroid;
      if (hasNativePermissionBridge()) {
        bridge.requestAboutPermission(kind);
        return;
      }

      if (kind === "notifications") {
        if (!("Notification" in window)) {
          finishPermissionRequest(kind, false, t("الإشعارات غير مدعومة على هذا الجهاز."));
          return;
        }
        const result = await Notification.requestPermission();
        finishPermissionRequest(kind, result === "granted");
        return;
      }

      if (!navigator.geolocation) {
        finishPermissionRequest(kind, false, t("الموقع غير متاح في هذا المتصفح."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        () => finishPermissionRequest(kind, true),
        async error => {
          const granted = await isPermissionGranted(kind);
          const messageText = granted
            ? t(card.enabledMessage)
            : error?.code === 1
              ? t("أكمل تفعيل الإذن من إعدادات المتصفح أو الهاتف.")
              : t("تعذر طلب الإذن. افتح إعدادات التطبيق من الهاتف وحاول مرة أخرى.");
          finishPermissionRequest(kind, granted, messageText);
        },
        { maximumAge: 0, timeout: 12000 }
      );
    } catch (error) {
      finishPermissionRequest(kind, false, t("تعذر طلب الإذن. افتح إعدادات التطبيق من الهاتف وحاول مرة أخرى."));
    }
  }

  async function refreshPermissionStatuses() {
    for (const kind of Object.keys(permissionCards)) {
      renderPermission(kind, await isPermissionGranted(kind));
    }
  }

  function setupPermissionAccordions() {
    for (const kind of Object.keys(permissionCards)) {
      const card = permissionCards[kind];
      $(card.enable)?.closest("details")?.addEventListener("toggle", refreshPermissionStatuses);
      $(card.enable)?.addEventListener("click", () => enablePermission(kind));
      $(card.settings)?.addEventListener("click", () => {
        const bridge = window.AnyasAndroid;
        if (bridge && typeof bridge.openAboutPermissionSettings === "function") {
          bridge.openAboutPermissionSettings();
          const message = $(card.message);
          if (message) message.textContent = t("أكمل تفعيل الإذن من إعدادات المتصفح أو الهاتف.");
        }
      });
    }
    window.anyasAboutPermissionResult = (kind, granted) => {
      if (permissionCards[kind]) finishPermissionRequest(kind, Boolean(granted));
    };
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) refreshPermissionStatuses();
    });
    window.addEventListener("focus", refreshPermissionStatuses);
    refreshPermissionStatuses();
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("aboutSupportButton")?.addEventListener("click", () => openFeedback("support"));
    $("aboutFeedbackButton")?.addEventListener("click", () => openFeedback("feedback"));
    setupPermissionAccordions();

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

    $("aboutPlayStoreRatingButton")?.addEventListener("click", event => {
      const status = $("aboutRatingStatus");
      const rawUrl = event.currentTarget?.dataset.googlePlayUrl?.trim() || "";
      let playStoreUrl = "";
      try {
        const candidate = new URL(rawUrl);
        if (candidate.protocol === "https:" && candidate.hostname === "play.google.com"
          && candidate.pathname.startsWith("/store/apps/details")) playStoreUrl = candidate.href;
      } catch (error) { /* a store URL has not been configured yet */ }

      if (!playStoreUrl) {
        if (status) status.textContent = t("رابط Google Play سيُضاف قريبًا.");
        return;
      }
      const link = document.createElement("a");
      link.href = playStoreUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.click();
    });
  }, { once: true });
})();
