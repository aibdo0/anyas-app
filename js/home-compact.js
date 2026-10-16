(() => {
  "use strict";

  const byId = id => document.getElementById(id);
  const trackedPrayerKeys = new Set(["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]);

  function isEnglish() {
    return document.documentElement.lang.toLowerCase().startsWith("en");
  }

  function updateLabels() {
    const english = isEnglish();
    const ayahTab = byId("homeAyahTab");
    const hadithTab = byId("homeHadithTab");
    const tabList = document.querySelector("#dailyContentCard [role='tablist']");
    const recordButton = byId("homeRecordPrayerButton");
    const adhkarButton = byId("openDailyAdhkarButton");

    if (ayahTab) ayahTab.textContent = english ? "Verse today" : "آية اليوم";
    if (hadithTab) hadithTab.textContent = english ? "Hadith today" : "حديث اليوم";
    if (tabList) tabList.setAttribute("aria-label", english ? "Daily content" : "المحتوى اليومي");

    if (recordButton) {
      recordButton.textContent = english ? "Log prayer" : "تسجيل الصلاة";
      recordButton.setAttribute("aria-label", english ? "Log this prayer" : "تسجيل الصلاة القادمة");
    }
    if (adhkarButton) {
      const label = english ? "Open adhkar" : "افتح الأذكار";
      if (adhkarButton.textContent.trim() !== label) adhkarButton.textContent = label;
      adhkarButton.setAttribute("aria-label", label);
    }
  }

  function activateTab(tabName, moveFocus = false) {
    const config = {
      ayah: { button: byId("homeAyahTab"), panel: byId("dailyAyahBlock") },
      hadith: { button: byId("homeHadithTab"), panel: byId("dailyHadithBlock") }
    };
    const selected = config[tabName];
    if (!selected?.button || !selected.panel) return;

    Object.entries(config).forEach(([name, item]) => {
      if (!item.button || !item.panel) return;
      const active = name === tabName;
      item.button.setAttribute("aria-selected", String(active));
      item.button.tabIndex = active ? 0 : -1;
      item.button.classList.toggle("is-active", active);
      item.panel.hidden = !active;
      item.panel.tabIndex = active ? 0 : -1;
    });
    if (moveFocus) selected.button.focus();
  }

  function setupDailyContentTabs() {
    const tabList = document.querySelector("#dailyContentCard [role='tablist']");
    if (!tabList) return;

    tabList.addEventListener("click", event => {
      const tab = event.target.closest("[role='tab']");
      if (!tab || !tabList.contains(tab)) return;
      activateTab(tab.id === "homeHadithTab" ? "hadith" : "ayah");
    });

    tabList.addEventListener("keydown", event => {
      const tabs = [...tabList.querySelectorAll("[role='tab']")];
      const current = tabs.indexOf(event.target.closest("[role='tab']"));
      if (current < 0) return;
      let next = current;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") next = (current + 1) % tabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      else return;
      event.preventDefault();
      activateTab(tabs[next].id === "homeHadithTab" ? "hadith" : "ayah", true);
    });

    activateTab("ayah");
  }

  function updatePrayerCount() {
    const badge = byId("homePrayerProgressBadge");
    const tracker = byId("todayPrayerTracker");
    if (!badge || !tracker) return;

    const total = tracker.querySelectorAll(".prayer-track-item").length || 5;
    const done = tracker.querySelectorAll(".prayer-track-item.completed").length;
    const format = new Intl.NumberFormat(isEnglish() ? "en" : "ar");
    const count = `${format.format(done)}/${format.format(total)}`;
    badge.textContent = isEnglish() ? `Prayers today ${count}` : `الصلوات اليوم ${count}`;
    badge.setAttribute("aria-label", isEnglish()
      ? `${format.format(done)} of ${format.format(total)} prayers recorded today`
      : `تم تسجيل ${format.format(done)} من ${format.format(total)} صلوات اليوم`);
  }

  function updateNextPrayerButton() {
    const button = byId("homeRecordPrayerButton");
    if (!button) return;

    const row = document.querySelector("#prayerList .prayer-row.next[data-prayer]");
    const prayer = row?.dataset.prayer || window.nextPrayer?.key || "Fajr";
    const key = trackedPrayerKeys.has(prayer) ? prayer : "Fajr";
    if (button.dataset.trackPrayer !== key) {
      button.dataset.trackPrayer = key;
      window.updatePrayerTrackingUI?.();
    }
  }

  function updateFridayVisibility() {
    const section = document.querySelector("#page-home .friday-feature-section");
    if (!section) return;
    const fridayState = window.anyasFriday?.getFridayState?.();
    const isFriday = typeof fridayState?.isFriday === "boolean"
      ? fridayState.isFriday
      : new Date().getDay() === 5;
    section.dataset.homeCompactFriday = String(isFriday);
  }

  function start() {
    updateLabels();
    setupDailyContentTabs();
    updatePrayerCount();
    updateNextPrayerButton();
    updateFridayVisibility();

    const tracker = byId("todayPrayerTracker");
    if (tracker) {
      new MutationObserver(updatePrayerCount).observe(tracker, {
        subtree: true,
        attributes: true,
        attributeFilter: ["class"]
      });
    }

    const prayerList = byId("prayerList");
    if (prayerList) {
      new MutationObserver(updateNextPrayerButton).observe(prayerList, {
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "data-prayer"]
      });
    }

    const adhkarButton = byId("openDailyAdhkarButton");
    if (adhkarButton) {
      new MutationObserver(updateLabels).observe(adhkarButton, {
        childList: true,
        characterData: true,
        subtree: true
      });
    }

    new MutationObserver(updateLabels).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"]
    });

    document.addEventListener("anyas:languagechange", updateLabels);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) return;
      updatePrayerCount();
      updateNextPrayerButton();
      updateFridayVisibility();
    });
    window.setInterval(updateFridayVisibility, 60 * 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
