import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const exists = relative => fs.existsSync(path.join(root, relative));
const passed = [];
const check = (name, fn) => {
  fn();
  passed.push(name);
};

const index = read("index.html");
const settings = read("js/settings.js");
const prayer = read("js/prayer.js");
const enhancements = read("js/app-enhancements.js");
const commonCities = read("data/common-cities.js");
const scheduler = read("android/app/src/main/java/com/anyas/app/ReminderScheduler.java");
const serviceWorker = read("sw.js");

check("reminder settings expose a test notification button", () => {
  assert.match(index, /id="testNotificationButton"/);
  assert.match(settings, /testNotificationButton\.addEventListener/);
  assert.match(settings, /testNotificationAndSound/);
});

check("web reminder keys are represented in Android scheduling", () => {
  const webKeys = [...settings.matchAll(/id:\s*"([^"]+)"/g)].map(match => match[1]);
  const androidKeys = [...scheduler.matchAll(/(?:addDaily|addCustomizableDaily|addWeekly)\(reminders,?\s*(?:enabled,\s*)?(?:schedules,\s*)?"([^"]+)"/g)].map(match => match[1]);
  const missing = webKeys.filter(key => key.startsWith("notify") && !androidKeys.includes(key));
  assert.deepEqual(missing, [], `missing Android reminder keys: ${missing.join(", ")}`);
  assert.match(scheduler, /scheduleOne\(context, alarm, reminder/);
});

check("manual city selection persists and is read on startup", () => {
  assert.match(enhancements, /localStorage\.setItem\("anyas_manual_location", JSON\.stringify\(safeLocation\)\)/);
  assert.match(prayer, /JSON\.parse\(localStorage\.getItem\("anyas_manual_location"/);
  assert.match(prayer, /window\.currentLatitude\s*=\s*Number\(saved\.latitude\)/);
  assert.match(prayer, /window\.currentLongitude\s*=\s*Number\(saved\.longitude\)/);
});

check("common cities and recent city history work offline", () => {
  assert.match(commonCities, /القاهرة/);
  assert.match(commonCities, /الرياض/);
  assert.match(enhancements, /anyas_recent_cities/);
  assert.match(enhancements, /navigator\.onLine/);
  assert.match(enhancements, /commonCities\.filter/);
  assert.match(enhancements, /slice\(0, 5\)/);
  assert.match(index, /data\/common-cities\.js/);
});

check("external services use timeout and bounded retry handling", () => {
  assert.match(enhancements, /window\.anyasFetch = async function/);
  assert.match(enhancements, /AbortController/);
  assert.match(enhancements, /retries = Math\.max/);
  assert.match(prayer, /window\.anyasFetch\(url, \{\}, \{ timeoutMs: 9000, retries: 1 \}\)/);
  assert.match(enhancements, /timeoutMs: 9000, retries: 1/);
  assert.match(settings, /timeoutMs: 8000, retries: 1/);
});

check("prayer times have an offline local calculation path", () => {
  assert.match(prayer, /const calculateLocally = \(\) =>/);
  assert.match(prayer, /rawTimings = calculateLocally\(\)/);
  assert.match(prayer, /localStorage\.getItem\(cacheKey\)/);
  assert.match(prayer, /catch \(error\) \{[\s\S]*?استخدام حساب مواقيت الصلاة المحلي/);
  assert.ok(exists("js/vendor/adhan.umd.min.js"), "local Adhan library is missing");
});

check("core HTML dependencies are local and present", () => {
  const localRefs = [...index.matchAll(/(?:src|href)="([^"#]+)"/g)]
    .map(match => match[1])
    .filter(ref => !/^(?:https?:|data:|mailto:|tel:|javascript:)/i.test(ref));
  const missing = localRefs
    .map(ref => ref.split("?")[0].replace(/^\.\//, ""))
    .filter(ref => ref && !exists(ref));
  assert.deepEqual(missing, [], `missing local HTML dependencies: ${missing.join(", ")}`);
  assert.match(index, /js\/vendor\/adhan\.umd\.min\.js/);
});

check("PWA install and offline shell are configured", () => {
  assert.ok(exists("manifest.webmanifest"), "PWA manifest is missing");
  assert.ok(exists("sw.js"), "Service Worker is missing");
  assert.match(index, /rel="manifest"/);
  assert.match(index, /serviceWorker\.register\("\.\/sw\.js"\)/);
  assert.match(serviceWorker, /caches\.open\(CACHE_NAME\)/);
  assert.match(serviceWorker, /self\.addEventListener\("fetch"/);
  assert.match(serviceWorker, /caches\.match\("\.\/index\.html"\)/);
  assert.match(index, /id="pwaStatusBanner"/);
  assert.match(index, /beforeinstallprompt/);
  assert.match(index, /addEventListener\("offline"/);
});

check("keyboard and screen-reader accessibility basics are present", () => {
  assert.match(index, /class="skip-link" href="#page-home"/);
  for (const match of index.matchAll(/<img\b([^>]*)>/gi)) assert.match(match[1], /\balt=/, "every image needs alt text");
  for (const match of index.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)) {
    const visibleText = match[2].replace(/<[^>]+>/g, "").replace(/&[^;]+;/g, "").trim();
    if (!visibleText) assert.match(match[1], /(aria-label|title)=/, "icon-only buttons need an accessible name");
  }
  assert.match(read("css/theme-white-gold.css"), /prefers-reduced-motion/);
});

check("FAQ answers are available without JavaScript", () => {
  assert.match(index, /id="aboutFaqHeading"/);
  assert.ok((index.match(/<details>/g) || []).length >= 5, "FAQ should contain at least five answers");
  assert.match(index, /كيف أغيّر المدينة؟/);
  assert.match(index, /هل يعمل أنياس بدون إنترنت؟/);
  assert.match(read("css/theme-white-gold.css"), /\.faq-list details/);
});

check("prayer data freshness is visible and cached", () => {
  assert.match(index, /id="prayerDataStatus" aria-live="polite"/);
  assert.match(prayer, /cacheMetaKey/);
  assert.match(prayer, /setDataStatus\("online"\)/);
  assert.match(prayer, /setDataStatus\("cache"/);
  assert.match(prayer, /setDataStatus\("local"\)/);
  assert.match(read("css/theme-white-gold.css"), /\.prayer-data-status/);
});

check("Asr madhab selection is persisted and applied", () => {
  assert.match(index, /id="asrMadhabSelect"/);
  assert.match(index, /value="shafi"/);
  assert.match(index, /value="hanafi"/);
  assert.match(read("js/app.js"), /anyas_asr_madhab/);
  assert.match(prayer, /function getAsrMadhab/);
  assert.match(prayer, /Madhab\.Hanafi/);
  assert.match(prayer, /Madhab\.Shafi/);
  assert.match(prayer, /school=\$\{school\}/);
  assert.match(enhancements, /const school = window\.getAsrMadhab/);
});

check("audio mute state is visible and persisted", () => {
  assert.match(index, /id="audioMuteToggle"[^>]+aria-pressed="false"/);
  assert.match(index, /id="audioVolumeStatus"[^>]+aria-live="polite"/);
  const settingsText = read("js/settings.js");
  assert.match(settingsText, /anyas_audio_muted/);
  assert.match(settingsText, /audioMuteToggle/);
  assert.match(settingsText, /effectiveVolume = window\.anyasAudioMuted/);
  assert.match(read("css/audio-library.css"), /\.audio-mute-toggle/);
});

check("12 and 24 hour time formats are persisted and applied", () => {
  assert.match(index, /id="timeFormatSelect"/);
  assert.match(index, /option value="12"/);
  assert.match(index, /option value="24"/);
  assert.match(read("js/app.js"), /anyas_time_format/);
  assert.match(prayer, /function getTimeFormat/);
  assert.match(prayer, /function format24Hour/);
  assert.match(prayer, /getTimeFormat\(\) === "24"/);
  assert.match(enhancements, /window\.getTimeFormat\?\.\(\) === "24"/);
});

check("daily prayer times can be shared or copied", () => {
  assert.match(index, /id="sharePrayerTimesButton"/);
  assert.match(index, /id="prayerShareStatus"[^>]+aria-live="polite"/);
  assert.match(enhancements, /navigator\.share/);
  assert.match(enhancements, /navigator\.clipboard\?\.writeText/);
  assert.match(enhancements, /initPrayerShare\(\)/);
});

check("full reminder test covers notification and sound", () => {
  assert.match(index, /id="testReminderButton"/);
  const settingsText = read("js/settings.js");
  assert.match(settingsText, /testReminderButton/);
  assert.match(settingsText, /testNotificationAndSound/);
  assert.match(settingsText, /anyas-reminder-test/);
  assert.match(settingsText, /recordAnyasNotification\(title, body, "anyas-reminder-test"\)/);
});

check("notification inbox supports marking all items read", () => {
  assert.match(index, /id="markAllNotificationsReadButton"/);
  assert.match(enhancements, /const markAll = byId\("markAllNotificationsReadButton"\)/);
  assert.match(enhancements, /markAll\?\.addEventListener\("click", \(\) => render\(true\)\)/);
  assert.match(enhancements, /localStorage\.setItem\("anyas_notification_history"/);
  assert.match(enhancements, /markNotificationHistoryRead/);
});

check("notification inbox can filter unread items only", () => {
  assert.match(index, /id="filterUnreadNotificationsButton"[^>]+aria-pressed="false"/);
  assert.match(enhancements, /let unreadOnly = false/);
  assert.match(enhancements, /const visibleItems = unreadOnly \? items\.filter\(item => !item\.read\) : items/);
  assert.match(enhancements, /filterUnread\?\.addEventListener\("click"/);
  assert.match(enhancements, /لا توجد إشعارات غير مقروءة/);
  assert.match(read("css/theme-white-gold.css"), /notification-list-actions button\[aria-pressed="true"\]/);
});

console.log(`Smoke tests passed: ${passed.length}`);
for (const name of passed) console.log(`✓ ${name}`);
