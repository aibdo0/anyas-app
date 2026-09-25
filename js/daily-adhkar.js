(() => {
  const byId = (id) => document.getElementById(id);
  const title = byId("dailyAdhkarHeading");
  const text = byId("dailyAdhkarText");
  const badge = byId("dailyAdhkarBadge");
  const hint = byId("dailyAdhkarHint");
  const openButton = byId("openDailyAdhkarButton");
  if (!title || !text || !badge || !hint || !openButton) return;

  const normalizeDigits = (value) => String(value || "")
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x6f0))
    .replace(/[٫.]/g, ":");

  function parseTime(value, prayerName, fallback) {
    const normalized = normalizeDigits(value).toLowerCase();
    const match = normalized.match(/(\d{1,2})\s*:\s*(\d{2})/);
    if (!match) return fallback;
    let hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour > 23 || minute > 59) return fallback;
    const pm = /(?:\bpm\b|مساء|م)/i.test(normalized);
    const am = /(?:\bam\b|صباح|ص)/i.test(normalized);
    if (pm && hour < 12) hour += 12;
    if (am && hour === 12) hour = 0;
    // Some locale formatters omit AM/PM; Dhuhr and Asr are daytime prayers.
    if (!pm && !am && (prayerName === "dhuhr" || prayerName === "asr") && hour > 0 && hour < 12) hour += 12;
    return hour * 60 + minute;
  }

  function prayerMinute(id, prayerName, fallback) {
    const node = byId(id);
    return parseTime(node ? node.textContent : "", prayerName, fallback);
  }

  function showPeriod() {
    const now = new Date();
    const current = now.getHours() * 60 + now.getMinutes();
    const dhuhr = prayerMinute("dhuhrTime", "dhuhr", 12 * 60);
    const asr = prayerMinute("asrTime", "asr", 15 * 60);

    if (current < dhuhr) {
      title.textContent = "أذكار الصباح";
      badge.textContent = "الصباح";
      text.textContent = "ابدأ أذكار الصباح من قسم الأذكار، وسيبقى هذا التذكير ظاهرًا حتى دخول وقت الظهر.";
      hint.textContent = "حتى دخول وقت الظهر";
      openButton.textContent = "افتح أذكار الصباح";
    } else if (current < asr) {
      title.textContent = "ذكر عام";
      badge.textContent = "ورد اليوم";
      text.textContent = "سُبْحَانَ اللهِ وَبِحَمْدِهِ، سُبْحَانَ اللهِ الْعَظِيمِ";
      hint.textContent = "ذكر عام، وليس مخصوصًا بوقت الظهر";
      openButton.textContent = "المزيد من الأذكار";
    } else {
      title.textContent = "أذكار المساء";
      badge.textContent = "المساء";
      text.textContent = "ابدأ أذكار المساء من قسم الأذكار؛ يبدأ هذا الورد بعد العصر.";
      hint.textContent = "من بعد العصر";
      openButton.textContent = "افتح أذكار المساء";
    }
  }

  openButton.addEventListener("click", () => {
    if (typeof window.openAzkarTopic === "function") {
      window.openAzkarTopic(27);
      return;
    }

    const quickAzkar = byId("quickAzkar");
    const azkarTab = document.querySelector('.nav-item[data-page="azkar"]');
    if (quickAzkar) quickAzkar.click();
    else if (azkarTab) azkarTab.click();
  });

  showPeriod();
  window.setInterval(showPeriod, 30000);
  if (window.MutationObserver) {
    const observer = new MutationObserver(showPeriod);
    [byId("dhuhrTime"), byId("asrTime")].filter(Boolean).forEach((node) => {
      observer.observe(node, { childList: true, characterData: true, subtree: true });
    });
  }
})();
