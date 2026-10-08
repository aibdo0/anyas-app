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
const appjs = read("js/app.js");
const enhancements = read("js/app-enhancements.js");
const qibla = read("js/qibla.js");
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

check("qibla shows sensor accuracy when available and offers calibration help", () => {
  assert.match(index, /id="qiblaAccuracy"[^>]+aria-live="polite"/);
  assert.match(index, /<details class="qibla-calibration">/);
  assert.match(qibla, /webkitCompassAccuracy/);
  assert.match(qibla, /dataset\.accuracyDegrees/);
  assert.match(qibla, /لا يوفّر هذا المتصفح تقديرًا رقميًا لدقة البوصلة/);
  const theme = read("css/theme-white-gold.css");
  assert.match(theme, /\.qibla-accuracy\[data-accuracy="good"\]/);
  assert.match(theme, /\.qibla-calibration summary/);
  assert.match(theme, /prefers-reduced-motion/);
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

check("optional audio manager shows sizes and can clear all downloads", () => {
  const optionalAudio = read("js/optional-audio.js");
  assert.match(index, /id="optionalAudioUsage"/);
  assert.match(index, /id="clearOptionalAudioButton"/);
  assert.match(index, /١٢٫١ م\.ب/);
  assert.match(optionalAudio, /async function cacheUsage\(\)/);
  assert.match(optionalAudio, /async function clearAll\(\)/);
  assert.match(optionalAudio, /caches\.delete\(CACHE_NAME\)/);
});

check("optional audio downloads are cached and excluded from Android web assets", () => {
  const optionalAudio = read("js/optional-audio.js");
  const gradle = read("android/app/build.gradle");
  assert.match(index, /id="optionalAudioManager"/);
  assert.match(index, /data-download-audio=/);
  assert.match(index, /js\/optional-audio\.js/);
  assert.match(optionalAudio, /caches\.open\(CACHE_NAME\)/);
  assert.match(optionalAudio, /raw\.githubusercontent\.com/);
  assert.doesNotMatch(gradle, /include 'audio\/\*\*'/);
});

check("compressed audio stays playable and within the app size budget", () => {
  const audioDir = path.join(root, "audio");
  const audioFiles = fs.readdirSync(audioDir).filter(file => /\.(mp3|m4a)$/i.test(file));
  assert.ok(audioFiles.length >= 30);
  for (const file of audioFiles) {
    assert.ok(fs.statSync(path.join(audioDir, file)).size <= 16_000_000, `${file} exceeds audio size budget`);
  }
  assert.match(index, /audio\/(?:[^"' ]+\.(?:mp3|m4a))/);
});

check("mosque search shows distance, walking time, and directions", () => {
  assert.match(enhancements, /walkingMinutes = Math\.max\(1, Math\.round\(distance \/ 80\)\)/);
  assert.match(enhancements, /walkingMinutes/);
  assert.match(enhancements, /maps\/dir\/\?api=1&destination=/);
  assert.match(enhancements, /openMosquesMapButton/);
});

check("worship statistics use local prayer, wird, and devotion data", () => {
  assert.match(index, /id="worshipStatsHeading"/);
  assert.match(index, /id="worshipStatsDhikr"/);
  assert.match(index, /id="worshipStatsTasbeeh"/);
  assert.match(appjs, /function getWorshipStats\(days = 7\)/);
  assert.match(appjs, /anyas_wird_progress_/);
  assert.match(appjs, /anyas_devotions_hijri_/);
  assert.match(appjs, /updateWorshipStats\(days\)/);
  assert.match(read("css/home.css"), /\.worship-stats-grid/);
});

check("Android prayer widget shows the next prayer and refreshes", () => {
  const widget = read("android/app/src/main/java/com/anyas/app/PrayerWidgetProvider.java");
  const manifest = read("android/app/src/main/AndroidManifest.xml");
  assert.match(manifest, /PrayerWidgetProvider/);
  assert.match(read("android/app/src/main/res/layout/widget_prayer.xml"), /widgetPrayerName/);
  assert.match(read("android/app/src/main/res/xml/prayer_widget_info.xml"), /updatePeriodMillis/);
  assert.match(widget, /ReminderScheduler\.PREFS/);
  assert.match(widget, /manager\.updateAppWidget/);
  assert.match(read("android/app/src/main/java/com/anyas/app/MainActivity.java"), /PrayerWidgetProvider\.updateAll/);
  assert.match(read("js/settings.js"), /city: document\.getElementById\("prayerHeroCity"\)/);
});

console.log(`Smoke tests passed: ${passed.length}`);
for (const name of passed) console.log(`✓ ${name}`);
