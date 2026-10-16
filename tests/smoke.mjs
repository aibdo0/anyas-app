import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
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
const quietHoursSource = read("js/quiet-hours.js");

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

check("offline mode responds to connectivity and retains local prayer refresh", () => {
  assert.match(enhancements, /function initOfflineMode\(\)/);
  assert.match(enhancements, /addEventListener\("offline"/);
  assert.match(enhancements, /loadPrayerTimes/);
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

check("Android reminders use one compact card with a remove-and-stop action", () => {
  const receiver = read("android/app/src/main/java/com/anyas/app/ReminderReceiver.java");
  const player = read("android/app/src/main/java/com/anyas/app/ReminderPlayerService.java");
  assert.match(receiver, /manager\.notify\(ReminderScheduler\.requestCode\(id\), buildNotification/);
  assert.doesNotMatch(receiver, /setLargeIcon|setSubText\("أنياس"\)/);
  assert.match(receiver, /addAction\([^\n]+إزالة وإيقاف الصوت/);
  assert.match(receiver, /ReminderScheduler\.scheduleSaved\(context\)/);
  assert.match(player, /ACTION_DISMISS\.equals\(intent\.getAction\(\)\)/);
  assert.match(player, /if \(key\.equals\(notificationKey\)\)[\s\S]*?releasePlayer\(\)[\s\S]*?stopForeground\(true\)/);
});

check("Android reminders support one 10-minute snooze without changing regular schedules", () => {
  const receiver = read("android/app/src/main/java/com/anyas/app/ReminderReceiver.java");
  const player = read("android/app/src/main/java/com/anyas/app/ReminderPlayerService.java");
  assert.match(receiver, /غفوة ١٠ دقائق/);
  assert.match(player, /putExtra\("snoozed", true\)/);
  assert.match(receiver, /rememberReminderForSnooze\(context, id, title, body, sound, soundFile, volume\)/);
  assert.match(player, /ACTION_SNOOZE\.equals\(intent\.getAction\(\)\)/);
  assert.match(player, /10L \* 60L \* 1000L/);
  assert.match(player, /setAndAllowWhileIdle\(AlarmManager\.RTC_WAKEUP/);
  assert.match(player, /if \(scheduled\) dismissReminder\(key, startId\)/);
  assert.match(read("android/app/src/main/java/com/anyas/app/ReminderScheduler.java"), /scheduleOne\(context, alarm, reminder/);
});

check("Android reminder actions open the right app section and mark only the matching item done", () => {
  const receiver = read("android/app/src/main/java/com/anyas/app/ReminderReceiver.java");
  const player = read("android/app/src/main/java/com/anyas/app/ReminderPlayerService.java");
  const history = read("android/app/src/main/java/com/anyas/app/NotificationHistory.java");
  const activity = read("android/app/src/main/java/com/anyas/app/MainActivity.java");
  assert.match(receiver, /"تم", donePending/);
  assert.match(receiver, /\.putExtra\("anyas_page", destination\)/);
  assert.match(receiver, /\.setContentIntent\(pending\)/);
  assert.match(receiver, /id\.startsWith\("notifyWard"\)[\s\S]*?return "azkar"/);
  assert.match(receiver, /return "tasks"/);
  assert.match(player, /ACTION_DONE\.equals\(intent\.getAction\(\)\)/);
  assert.match(player, /NotificationHistory\.markLatestRead\(this, key\)/);
  assert.match(history, /static void markLatestRead\(Context context, String tag\)/);
  assert.match(history, /normalizedTag\.equals\(normalizeTag\(item\.optString\("tag"\)\)\)/);
  assert.match(activity, /"tasks"\.equals\(page\)/);
});

check("notification inbox supports marking all items read", () => {
  assert.match(index, /id="markAllNotificationsReadButton"/);
  assert.match(enhancements, /const markAll = byId\("markAllNotificationsReadButton"\)/);
  assert.match(enhancements, /markAll\?\.addEventListener\("click", \(\) => render\(true\)\)/);
  assert.match(enhancements, /localStorage\.setItem\("anyas_notification_history"/);
  assert.match(enhancements, /markNotificationHistoryRead/);
});

check("notification inbox can filter unread items only", () => {
  assert.match(index, /id="filterAllNotificationsButton"[^>]+aria-pressed="true"/);
  assert.match(index, /id="filterUnreadNotificationsButton"[^>]+aria-pressed="false"/);
  assert.match(enhancements, /let unreadOnly = false/);
  assert.match(enhancements, /const visibleItems = unreadOnly \? items\.filter\(item => !item\.read\) : items/);
  assert.match(enhancements, /filterAll\?\.addEventListener\("click"/);
  assert.match(enhancements, /filterUnread\?\.addEventListener\("click"/);
  assert.match(enhancements, /لا توجد إشعارات غير مقروءة/);
  assert.match(read("css/theme-white-gold.css"), /notification-list-actions button\[aria-pressed="true"\]/);
});

check("quiet hours are optional and correctly handle midnight crossings", () => {
  const storage = new Map();
  const window = {};
  vm.runInNewContext(quietHoursSource, {
    window,
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    document: { getElementById: () => null }
  });
  const isQuiet = window.anyasIsQuietHours;
  assert.equal(isQuiet(new Date(2026, 9, 14, 23, 0)), false, "quiet hours are off by default");
  const overnight = { enabled: true, start: "22:00", end: "06:00" };
  assert.equal(isQuiet(new Date(2026, 9, 14, 21, 59), overnight), false);
  assert.equal(isQuiet(new Date(2026, 9, 14, 22, 0), overnight), true);
  assert.equal(isQuiet(new Date(2026, 9, 15, 5, 59), overnight), true);
  assert.equal(isQuiet(new Date(2026, 9, 15, 6, 0), overnight), false);
  assert.match(index, /id="quietHoursEnabled"/);
  assert.match(index, /id="quietHoursStart" type="time" value="22:00"/);
  assert.match(index, /id="quietHoursEnd" type="time" value="06:00"/);
  assert.match(settings, /quietHours: window\.anyasGetQuietHoursSettings/);
  assert.match(settings, /if \(window\.anyasIsQuietHours\?\.\(\)\) return/);
  assert.match(read("js/friday.js"), /if \(window\.anyasIsQuietHours\?\.\(\)\) return/);
  assert.match(scheduler, /static boolean quietHoursActive\(Context context\)/);
  assert.match(read("android/app/src/main/java/com/anyas/app/ReminderReceiver.java"), /if \(ReminderScheduler\.quietHoursActive\(context\)\)/);
  assert.match(read("android/app/src/main/java/com/anyas/app/RainReceiver.java"), /if \(ReminderScheduler\.quietHoursActive\(context\)\) return/);
  assert.match(serviceWorker, /quiet-hours\.js\?v=20261014-1/);
});

check("encrypted backups use local AES-GCM with password-protected import", () => {
  assert.match(index, /id="exportEncryptedDataButton"/);
  assert.match(index, /id="backupPasswordInput"[^>]+type="password"/);
  assert.match(appjs, /PBKDF2-SHA-256/);
  assert.match(appjs, /name: "AES-GCM"/);
  assert.match(appjs, /crypto\.subtle\.encrypt/);
  assert.match(appjs, /crypto\.subtle\.decrypt/);
  assert.match(appjs, /payload\?\.encrypted === true/);
  assert.match(appjs, /schema: 2/);
});

check("English and accessibility states cover the new audio and mosque controls", () => {
  const optionalAudio = read("js/optional-audio.js");
  assert.match(optionalAudio, /document\.documentElement\.lang === "en"/);
  assert.match(enhancements, /Directions/);
  assert.match(index, /id="clearOptionalAudioButton"/);
  assert.match(index, /aria-pressed="false"/);
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

check("mosque search supports local favorites and contact actions", () => {
  assert.match(enhancements, /anyas_favorite_mosque/);
  assert.match(enhancements, /mosque-favorite-button/);
  assert.match(enhancements, /aria-pressed/);
  assert.match(enhancements, /tel:\$\{phone\}/);
  assert.match(read("css/theme-white-gold.css"), /\.mosque-result-actions/);
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

check("Android app shortcuts open prayer, Qibla, tasbeeh, and adhkar", () => {
  const manifest = read("android/app/src/main/AndroidManifest.xml");
  const shortcuts = read("android/app/src/main/res/xml/shortcuts.xml");
  const activity = read("android/app/src/main/java/com/anyas/app/MainActivity.java");
  assert.match(manifest, /android\.app\.shortcuts/);
  for (const page of ["home", "qibla", "tasbeeh", "azkar"]) assert.match(shortcuts, new RegExp(`android:value="${page}"`));
  assert.match(activity, /shortcutPage\(Intent intent\)/);
  assert.match(activity, /openPendingShortcut/);
  assert.match(activity, /onNewIntent/);
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

check("light and dark theme text, accents, borders, and actions meet WCAG AA contrast", () => {
  const palette = read("css/palette-warm-gold.css");
  const light = palette.match(/:root\s*\{([^}]*)\}/)?.[1];
  const dark = palette.match(/:root\[data-theme="dark"\]\s*\{([^}]*)\}/)?.[1];
  assert.ok(light && dark, "both theme token blocks must exist");
  const token = (block, name) => {
    const value = block.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i"))?.[1];
    assert.ok(value, `missing ${name} token`);
    return value;
  };
  const luminance = hex => {
    const rgb = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
    const linear = rgb.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const contrast = (foreground, background) => {
    const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
  };
  const cases = [
    { name: "light", block: light, surfaces: ["fffefa", "f7f5ef", "f1ece2"], actionInk: "#ffffff" },
    { name: "dark", block: dark, surfaces: ["242220", "191817", "302c27"], actionInk: "#29241b" },
  ];
  for (const mode of cases) {
    for (const role of ["ink", "muted", "gold-dark", "gold-light", "gold"]) {
      for (const surface of mode.surfaces) {
        assert.ok(contrast(token(mode.block, role), `#${surface}`) >= 4.5, `${mode.name} ${role} must meet 4.5:1 on #${surface}`);
      }
    }
    for (const surface of mode.surfaces) {
      assert.ok(contrast(token(mode.block, "line"), `#${surface}`) >= 3, `${mode.name} borders must meet 3:1 on #${surface}`);
    }
    assert.ok(contrast(mode.actionInk, token(mode.block, "action-bg")) >= 4.5, `${mode.name} action text must meet 4.5:1`);
  }
});

check("app-level background images stay removed while card imagery remains", () => {
  const appBackground = read("css/app-background.css");
  const palette = read("css/palette-warm-gold.css");
  const theme = read("css/theme-white-gold.css");
  assert.match(appBackground, /html,\s*body\s*\{[^}]*background-image:\s*none\s*!important/s);
  assert.doesNotMatch(appBackground, /url\s*\(/i);
  assert.doesNotMatch(`${theme}\n${palette}`, /data-time-scene|data-auto-background/);
  const cardRules = palette.slice(palette.indexOf("/* صور البطاقات فقط"));
  assert.doesNotMatch(cardRules, /background-image:\s*linear-gradient/i, "card photos must not have a dimming gradient");
  for (const image of [
    "prayer-hero.jpg",
    "anyas-tasks-hero.jpg",
    "anyas-hisn-hero.jpg",
    "anyas-more-hero.jpg",
    "anyas-more-tools-hero.jpg",
    "adhkar-morning-card.jpg",
    "adhkar-evening-card.jpg",
    "adhkar-sleep-card.jpg",
  ]) assert.ok(palette.includes(`../assets/${image}`), `card background ${image} must remain available`);
  assert.doesNotMatch(index, /timeBackgroundToggle|timeBackgroundDescription|data-auto-background/);
  assert.doesNotMatch(settings, /timeBackgroundToggle|timeBackgroundDescription|updateTimeBackground/);
  assert.match(serviceWorker, /anyas-shell-v1\.3\.4/);
  assert.match(serviceWorker, /\.\/assets\/prayer-hero\.jpg/);
  assert.doesNotMatch(serviceWorker, /anyas-morning-background|anyas-night-background/);
});

console.log(`Smoke tests passed: ${passed.length}`);
for (const name of passed) console.log(`✓ ${name}`);
