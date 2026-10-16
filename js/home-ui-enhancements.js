(() => {
  "use strict";

  const BANNER_DISMISS_KEY = "anyas_pwa_status_banner_dismissed_v1";

  function initStatusBanner() {
    const banner = document.getElementById("pwaStatusBanner");
    const status = document.getElementById("pwaStatusText");
    const installButton = document.getElementById("pwaInstallButton");
    const dismissButton = document.getElementById("pwaStatusDismissButton");
    if (!banner || !status) return;

    let installPrompt = null;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(BANNER_DISMISS_KEY) === "true";
    } catch (_) {}

    const isStandalone = () =>
      window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
    const setVisible = visible => {
      banner.hidden = !visible;
      if (visible) banner.removeAttribute("aria-hidden");
      else banner.setAttribute("aria-hidden", "true");
    };
    const refresh = () => {
      if (dismissed) {
        setVisible(false);
        return;
      }
      if (!navigator.onLine) {
        status.textContent = "أنت تعمل دون اتصال؛ المحتوى المحفوظ ما زال متاحًا.";
        setVisible(true);
      } else if (!installPrompt) {
        setVisible(false);
      }
    };

    dismissButton?.addEventListener("click", () => {
      dismissed = true;
      try {
        localStorage.setItem(BANNER_DISMISS_KEY, "true");
      } catch (_) {}
      setVisible(false);
    });

    window.addEventListener("offline", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("beforeinstallprompt", event => {
      event.preventDefault();
      installPrompt = event;
      if (installButton && !isStandalone() && !dismissed) {
        if (navigator.onLine) status.textContent = "ثبّت أنياس للوصول السريع والعمل دون اتصال.";
        installButton.hidden = false;
        setVisible(true);
      }
    });

    installButton?.addEventListener("click", async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      installButton.hidden = true;
      refresh();
    });

    if (dismissed) setVisible(false);
    else refresh();
  }

  function toLatinDigits(value) {
    return String(value)
      .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660))
      .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0));
  }

  function initPrayerProgressBadge() {
    const badge = document.getElementById("homePrayerProgressBadge");
    const source = document.getElementById("todayPrayerProgressText");
    const progress = document.getElementById("todayPrayerProgressBar");
    if (!badge) return;

    const isEnglish = document.documentElement.lang === "en";
    const formatter = new Intl.NumberFormat(isEnglish ? "en" : "ar", { useGrouping: false });
    const label = isEnglish ? "Prayers today" : "الصلوات اليوم";
    const update = () => {
      const text = toLatinDigits(source?.textContent || "");
      const parsed = text.match(/\d+/);
      const progressValue = Number(progress?.getAttribute("aria-valuenow"));
      const completed = Math.max(0, Math.min(5, parsed ? Number(parsed[0]) : (progressValue || 0)));
      const count = `${formatter.format(completed)}/${formatter.format(5)}`;
      badge.textContent = `${label} ${count}`;
      badge.setAttribute("aria-label", `${label} ${formatter.format(completed)} ${isEnglish ? "of" : "من"} ${formatter.format(5)}`);
    };

    update();
    if (window.MutationObserver) {
      const observer = new MutationObserver(update);
      if (source) observer.observe(source, { childList: true, characterData: true, subtree: true });
      if (progress) observer.observe(progress, { attributes: true, attributeFilter: ["aria-valuenow"] });
    }
  }

  function initSunnahToggle() {
    const toggle = document.querySelector("#page-tasks .sunnah-heading-toggle");
    const checklist = document.getElementById("sunnahChecklist");
    const virtue = document.getElementById("sunnahVirtue");
    if (!toggle || !checklist || !virtue) return;

    const setExpanded = expanded => {
      toggle.setAttribute("aria-expanded", String(expanded));
      checklist.hidden = !expanded;
      virtue.hidden = !expanded;
    };
    setExpanded(toggle.getAttribute("aria-expanded") !== "false");
    toggle.addEventListener("click", () => {
      setExpanded(toggle.getAttribute("aria-expanded") !== "true");
    });
  }

  function initFridayVisibility() {
    const page = document.getElementById("page-tasks");
    if (!page) return;
    const update = () => {
      page.dataset.isFriday = String(new Date().getDay() === 5);
    };
    update();
    window.setInterval(update, 60 * 1000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) update();
    });
  }

  function initFavoritePanel() {
    const panel = document.querySelector("#page-azkar .azkar-favorites-panel");
    const count = document.getElementById("favoritesCount");
    const favorites = document.getElementById("azkarFavorites");
    if (!panel || !count) return;

    const update = () => {
      const parsed = toLatinDigits(count.textContent).match(/\d+/);
      const isEmpty = parsed ? Number(parsed[0]) === 0 : !favorites?.querySelector(".azkar-favorite-card");
      panel.classList.toggle("is-empty", isEmpty);
    };
    update();
    if (window.MutationObserver) {
      const observer = new MutationObserver(update);
      observer.observe(count, { childList: true, characterData: true, subtree: true });
      if (favorites) observer.observe(favorites, { childList: true, subtree: true });
    }
  }

  initStatusBanner();
  initPrayerProgressBadge();
  initSunnahToggle();
  initFridayVisibility();
  initFavoritePanel();
})();
