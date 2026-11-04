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
const settings = read("js/features/settings.js");
const prayer = read("js/features/prayer.js");
const appjs = read("js/core/app.js");
const enhancements = read("js/services/app-enhancements.js");
const qibla = read("js/features/qibla.js");
const commonCities = read("data/locations/common-cities.js");
const scheduler = read("android/app/src/main/java/com/anyas/app/ReminderScheduler.kt");
const nativeReminderSettings = read("android/app/src/main/java/com/anyas/app/NativeReminderSettings.kt");
const notificationHistory = read("android/app/src/main/java/com/anyas/app/NotificationHistory.kt");
const serviceWorker = read("sw.js");

check("reminder settings expose a test notification button", () => {
  assert.match(index, /id="testNotificationButton"/);
  assert.match(settings, /testNotificationButton\.addEventListener/);
  assert.match(settings, /testNotificationAndSound/);
});

check("web reminder keys are represented in Android scheduling", () => {
  const webKeys = [...settings.matchAll(/id:\s*"([^"]+)"/g)].map(match => match[1]);
  const nativeReminderSource = `${scheduler}\n${nativeReminderSettings}`;
  const androidKeys = [...nativeReminderSource.matchAll(/"(notify[A-Za-z0-9_]+)"/g)].map(match => match[1]);
  const missing = webKeys.filter(key => key.startsWith("notify") && !androidKeys.includes(key));
  assert.deepEqual(missing, [], `missing Android reminder keys: ${missing.join(", ")}`);
  assert.match(scheduler, /scheduleOne\(context, alarm, it,/);
});

check("native reminder preferences save and reschedule alarms", () => {
  assert.match(nativeReminderSettings, /NativeReminderSettingsPanel/);
  assert.match(nativeReminderSettings, /putString\("settings", data\.toString\(\)\)/);
  assert.match(scheduler, /@JvmStatic\s+fun scheduleSaved/);
});

check("Room schema seeds all source-backed azkar and valid daily-wird references", () => {
  const database = read("android/app/src/main/java/com/anyas/app/NativeWirdDatabase.kt");
  const gradle = read("android/app/build.gradle");
  const azkarSource = read("data/content/azkar-topics.js");
  const first = azkarSource.indexOf("[");
  const last = azkarSource.lastIndexOf("]");
  assert.ok(first >= 0 && last > first, "azkar source array is missing");
  const topics = JSON.parse(azkarSource.slice(first, last + 1));
  const byNumber = new Map(topics.map(topic => [topic.number, topic]));
  const definitions = [...database.matchAll(/SectionSeed\("([^\"]+)",\s*"[^\"]+",\s*(\d+),\s*(\(0\.\.\d+\)\.toList\(\)(?:\s*\+\s*\d+)?|listOf\([\d, ]+\)),\s*\d+\)/g)];

  assert.match(gradle, /androidx\.room:room-runtime:2\.6\.1/);
  assert.match(gradle, /androidx\.room:room-ktx:2\.6\.1/);
  assert.match(gradle, /room\.schemaLocation/);
  assert.match(database, /@Database\([\s\S]*?version = 1/);
  assert.match(database, /exportSchema = true/);
  assert.doesNotMatch(database, /fallbackToDestructiveMigration/);
  assert.match(database, /wird_item_progress/);
  assert.match(database, /topic_dhikr_progress/);
  assert.match(database, /daily_dhikr_progress/);
  assert.match(database, /daily_sunnah_progress/);
  assert.match(database, /legacy_import_runs/);
  assert.match(database, /legacy_import_raw/);
  assert.equal(definitions.length, 4, "expected the four existing daily wird sections");

  for (const [, id, rawTopicNumber, rawIndexes] of definitions) {
    const topicNumber = Number(rawTopicNumber);
    const topic = byNumber.get(topicNumber);
    assert.ok(topic, `${id} points to missing topic ${topicNumber}`);
    const indexes = rawIndexes.startsWith("listOf(")
      ? [...rawIndexes.matchAll(/\d+/g)].map(match => Number(match[0]))
      : [...Array(Number(rawIndexes.match(/\.\.(\d+)/)[1]) + 1).keys(), ...(rawIndexes.match(/\+\s*(\d+)/) ? [Number(rawIndexes.match(/\+\s*(\d+)/)[1])] : [])];
    assert.equal(new Set(indexes).size, indexes.length, `${id} contains a duplicate source index`);
    for (const itemIndex of indexes) {
      assert.ok(topic.items[itemIndex], `${id} refers to missing item ${topicNumber}:${itemIndex}`);
    }
  }
});

check("saved reminder settings retain the inputs needed to recalculate prayer times", () => {
  assert.match(nativeReminderSettings, /\.put\("latitude", city\.latitude\)/);
  assert.match(nativeReminderSettings, /\.put\("longitude", city\.longitude\)/);
  assert.match(nativeReminderSettings, /\.put\("calculationMethod", calculationMethod\.name\)/);
  assert.match(nativeReminderSettings, /\.put\("asrMadhab", asrMadhab\.name\)/);
  assert.match(scheduler, /recalculatePrayerTimes\(data\)/);
  assert.match(scheduler, /NativePrayerCalculator\.forDate\(city, method, madhab\)/);
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
  assert.match(index, /data\/locations\/common-cities\.js/);
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
  assert.match(read("css/theme/theme-white-gold.css"), /prefers-reduced-motion/);
});

check("FAQ answers are available without JavaScript", () => {
  assert.match(index, /id="aboutFaqHeading"/);
  assert.ok((index.match(/<details>/g) || []).length >= 5, "FAQ should contain at least five answers");
  assert.match(index, /كيف أغيّر المدينة؟/);
  assert.match(index, /هل يعمل أنياس بدون إنترنت؟/);
  assert.match(read("css/theme/theme-white-gold.css"), /\.faq-list details/);
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
  assert.match(read("css/theme/theme-white-gold.css"), /\.prayer-data-status/);
});

check("Asr madhab selection is persisted and applied", () => {
  assert.match(index, /id="asrMadhabSelect"/);
  assert.match(index, /value="shafi"/);
  assert.match(index, /value="hanafi"/);
  assert.match(read("js/core/app.js"), /anyas_asr_madhab/);
  assert.match(prayer, /function getAsrMadhab/);
  assert.match(prayer, /Madhab\.Hanafi/);
  assert.match(prayer, /Madhab\.Shafi/);
  assert.match(prayer, /school=\$\{school\}/);
  assert.match(enhancements, /const school = window\.getAsrMadhab/);
});

check("audio mute state is visible and persisted", () => {
  assert.match(index, /id="audioMuteToggle"[^>]+aria-pressed="false"/);
  assert.match(index, /id="audioVolumeStatus"[^>]+aria-live="polite"/);
  const settingsText = read("js/features/settings.js");
  assert.match(settingsText, /anyas_audio_muted/);
  assert.match(settingsText, /audioMuteToggle/);
  assert.match(settingsText, /effectiveVolume = window\.anyasAudioMuted/);
  assert.match(read("css/components/audio-library.css"), /\.audio-mute-toggle/);
});

check("12 and 24 hour time formats are persisted and applied", () => {
  assert.match(index, /id="timeFormatSelect"/);
  assert.match(index, /option value="12"/);
  assert.match(index, /option value="24"/);
  assert.match(read("js/core/app.js"), /anyas_time_format/);
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
  const theme = read("css/theme/theme-white-gold.css");
  assert.match(theme, /\.qibla-accuracy\[data-accuracy="good"\]/);
  assert.match(theme, /\.qibla-calibration summary/);
  assert.match(theme, /prefers-reduced-motion/);
});

check("full reminder test covers notification and sound", () => {
  assert.match(index, /id="testReminderButton"/);
  const settingsText = read("js/features/settings.js");
  assert.match(settingsText, /testReminderButton/);
  assert.match(settingsText, /testNotificationAndSound/);
  assert.match(settingsText, /anyas-reminder-test/);
  assert.match(settingsText, /recordAnyasNotification\(title, body, "anyas-reminder-test"\)/);
});

check("Android reminders use one compact card with a remove-and-stop action", () => {
  const receiver = read("android/app/src/main/java/com/anyas/app/ReminderReceiver.kt");
  const player = read("android/app/src/main/java/com/anyas/app/ReminderPlayerService.kt");
  assert.match(receiver, /manager\.notify\(ReminderScheduler\.requestCode\(id\), buildNotification/);
  assert.doesNotMatch(receiver, /setLargeIcon|setSubText\("أنياس"\)/);
  assert.match(receiver, /addAction\([^\n]+إزالة وإيقاف الصوت/);
  assert.match(receiver, /ReminderScheduler\.scheduleSaved\(context\)/);
  assert.match(player, /intent\?\.action == ACTION_DISMISS/);
  assert.match(player, /if \(key != notificationKey\) \{[\s\S]*?return/);
  assert.match(player, /releasePlayer\(\)[\s\S]*?notificationRestored = true[\s\S]*?stopForeground\(true\)/);
});

check("notification inbox supports marking all items read", () => {
  assert.match(index, /id="markAllNotificationsReadButton"/);
  assert.match(enhancements, /const markAll = byId\("markAllNotificationsReadButton"\)/);
  assert.match(enhancements, /markAll\?\.addEventListener\("click", \(\) => render\(true\)\)/);
  assert.match(enhancements, /localStorage\.setItem\("anyas_notification_history"/);
  assert.match(enhancements, /markNotificationHistoryRead/);
});

check("Android notification history remains available through Kotlin static APIs", () => {
  assert.match(notificationHistory, /object NotificationHistory/);
  for (const method of ["record", "getJson", "delete", "clear", "markAllRead"]) {
    assert.match(notificationHistory, new RegExp(`@JvmStatic\\s+fun ${method}\\(`));
  }
  assert.match(notificationHistory, /MAX_ITEMS = 100/);
  assert.match(notificationHistory, /DUPLICATE_WINDOW_MS = 90_000L/);
});

check("notification inbox can filter unread items only", () => {
  assert.match(index, /id="filterAllNotificationsButton"[^>]+aria-pressed="true"/);
  assert.match(index, /id="filterUnreadNotificationsButton"[^>]+aria-pressed="false"/);
  assert.match(enhancements, /let unreadOnly = false/);
  assert.match(enhancements, /const visibleItems = unreadOnly \? items\.filter\(item => !item\.read\) : items/);
  assert.match(enhancements, /filterAll\?\.addEventListener\("click"/);
  assert.match(enhancements, /filterUnread\?\.addEventListener\("click"/);
  assert.match(enhancements, /لا توجد إشعارات غير مقروءة/);
  assert.match(read("css/theme/theme-white-gold.css"), /notification-list-actions button\[aria-pressed="true"\]/);
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
  const optionalAudio = read("js/services/optional-audio.js");
  assert.match(optionalAudio, /document\.documentElement\.lang === "en"/);
  assert.match(enhancements, /Directions/);
  assert.match(index, /id="clearOptionalAudioButton"/);
  assert.match(index, /aria-pressed="false"/);
});

check("optional audio manager shows sizes and can clear all downloads", () => {
  const optionalAudio = read("js/services/optional-audio.js");
  assert.match(index, /id="optionalAudioUsage"/);
  assert.match(index, /id="clearOptionalAudioButton"/);
  assert.match(index, /١٢٫١ م\.ب/);
  assert.match(optionalAudio, /async function cacheUsage\(\)/);
  assert.match(optionalAudio, /async function clearAll\(\)/);
  assert.match(optionalAudio, /caches\.delete\(CACHE_NAME\)/);
});

check("optional audio stays remote and PWA assets are not copied into Android", () => {
  const optionalAudio = read("js/services/optional-audio.js");
  const gradle = read("android/app/build.gradle");
  assert.match(index, /id="optionalAudioManager"/);
  assert.match(index, /data-download-audio=/);
  assert.match(index, /js\/services\/optional-audio\.js/);
  assert.match(optionalAudio, /caches\.open\(CACHE_NAME\)/);
  assert.match(optionalAudio, /raw\.githubusercontent\.com/);
  assert.match(optionalAudio, /isAndroid\(\) \? remoteUrl/);
  assert.doesNotMatch(gradle, /syncWebAssets|include 'audio\/\*\*'/);
  assert.match(gradle, /catalog\.audio\.findAll \{ it\.bundled && it\.androidResource \}/);
});

check("audio catalog centralizes web and Android audio paths", () => {
  const catalog = JSON.parse(read("data/config/audio-catalog.json"));
  assert.ok(Array.isArray(catalog.audio) && catalog.audio.length >= 30);
  assert.ok(catalog.audio.some(entry => entry.id === "reminder.hadith" && entry.androidResource === "hadith_reminder"));
  assert.ok(catalog.audio.some(entry => entry.id === "adhkar.morning.mishary" && entry.bundled === false));
  assert.match(index, /js\/services\/audio-catalog\.js/);
  assert.match(read("android/app/build.gradle"), /data\/config\/audio-catalog\.json/);
});

check("compressed audio stays playable and within the app size budget", () => {
  const audioDir = path.join(root, "audio");
  const audioFiles = fs.readdirSync(audioDir, { withFileTypes: true })
    .flatMap(entry => entry.isDirectory()
      ? fs.readdirSync(path.join(audioDir, entry.name)).map(file => path.join(entry.name, file))
      : [entry.name])
    .filter(file => /\.(mp3|m4a)$/i.test(file));
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
  assert.match(read("css/theme/theme-white-gold.css"), /\.mosque-result-actions/);
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
  assert.match(read("css/pages/home.css"), /\.worship-stats-grid/);
});

check("Android app shortcuts open prayer, Qibla, tasbeeh, and adhkar", () => {
  const manifest = read("android/app/src/main/AndroidManifest.xml");
  const shortcuts = read("android/app/src/main/res/xml/shortcuts.xml");
  const activity = read("android/app/src/main/java/com/anyas/app/NativeMainActivity.kt");
  assert.match(manifest, /android\.app\.shortcuts/);
  assert.match(manifest, /\.NativeMainActivity/);
  for (const page of ["home", "qibla", "tasbeeh", "azkar"]) assert.match(shortcuts, new RegExp(`android:value="${page}"`));
  assert.match(activity, /intent\.getStringExtra\("anyas_page"\)/);
  assert.match(activity, /"qibla" -> NativePage\.QIBLA/);
  assert.equal(exists("android/app/src/main/java/com/anyas/app/MainActivity.java"), false);
});

check("Android native build excludes legacy WebView and duplicate PWA assets", () => {
  const manifest = read("android/app/src/main/AndroidManifest.xml");
  const gradle = read("android/app/build.gradle");
  assert.doesNotMatch(manifest, /android:name="\.MainActivity"|REQUEST_IGNORE_BATTERY_OPTIMIZATIONS/);
  assert.doesNotMatch(gradle, /androidx\.webkit|syncWebAssets|index\.html|css\/\*\*/);
  assert.equal(exists("android/app/src/main/assets/index.html"), false);
});

check("Android Qibla compass uses phone sensors and magnetic declination correction", () => {
  const activity = read("android/app/src/main/java/com/anyas/app/NativeMainActivity.kt");
  const compass = read("android/app/src/main/java/com/anyas/app/NativeQiblaCompass.kt");
  assert.match(activity, /SensorEventListener/);
  assert.match(activity, /Sensor\.TYPE_ROTATION_VECTOR/);
  assert.match(activity, /Sensor\.TYPE_GEOMAGNETIC_ROTATION_VECTOR/);
  assert.match(activity, /remapCoordinateSystem/);
  assert.match(activity, /unregisterListener\(this\)/);
  assert.match(compass, /GeomagneticField/);
  assert.match(compass, /حرّكه على شكل رقم 8/);
  assert.match(compass, /NativeQiblaCompass\(/);
  assert.match(compass, /المؤشر المباشر/);
  assert.match(compass, /اتجاه الهاتف/);
  assert.match(compass, /semantics \{ contentDescription/);
});

check("Android Qibla page offers privacy-aware nearby mosque search and walking directions", () => {
  const manifest = read("android/app/src/main/AndroidManifest.xml");
  const compass = read("android/app/src/main/java/com/anyas/app/NativeQiblaCompass.kt");
  const nearby = read("android/app/src/main/java/com/anyas/app/NativeNearbyMosques.kt");
  assert.match(manifest, /android\.permission\.ACCESS_COARSE_LOCATION/);
  assert.match(manifest, /android\.permission\.ACCESS_FINE_LOCATION/);
  assert.match(compass, /NearbyMosquesSection\(\)/);
  assert.match(nearby, /RequestMultiplePermissions/);
  assert.match(nearby, /OpenStreetMap/);
  assert.match(nearby, /around:\$RADIUS_METERS/);
  assert.match(nearby, /travelmode=walking/);
  assert.match(nearby, /دون حفظها داخل التطبيق/);
  assert.match(nearby, /Dispatchers\.IO/);
});

check("Android prayer widget shows the next prayer and refreshes", () => {
  const widget = read("android/app/src/main/java/com/anyas/app/PrayerWidgetProvider.kt");
  const manifest = read("android/app/src/main/AndroidManifest.xml");
  assert.match(manifest, /PrayerWidgetProvider/);
  assert.match(read("android/app/src/main/res/layout/widget_prayer.xml"), /widgetPrayerName/);
  assert.match(read("android/app/src/main/res/xml/prayer_widget_info.xml"), /updatePeriodMillis/);
  assert.match(widget, /ReminderScheduler\.PREFS/);
  assert.match(widget, /manager\.updateAppWidget/);
  assert.match(widget, /NativeMainActivity::class\.java/);
  assert.match(read("js/features/settings.js"), /city: document\.getElementById\("prayerHeroCity"\)/);
});

check("native home next prayer excludes sunrise", () => {
  const activity = read("android/app/src/main/java/com/anyas/app/NativeMainActivity.kt");
  assert.match(activity, /prayerTimes\.firstOrNull \{ it\.name != "الشروق" && it\.epochMillis > now \}/);
});

check("system date changes refresh saved prayer times and the widget", () => {
  const manifest = read("android/app/src/main/AndroidManifest.xml");
  const receiver = read("android/app/src/main/java/com/anyas/app/BootReceiver.kt");
  assert.match(manifest, /android\.intent\.action\.DATE_CHANGED/);
  assert.match(receiver, /ReminderScheduler\.scheduleSaved\(context\)/);
  assert.match(receiver, /PrayerWidgetProvider\.updateAll\(context\)/);
});

check("dismissing another reminder keeps active playback alive", () => {
  const service = read("android/app/src/main/java/com/anyas/app/ReminderPlayerService.kt");
  assert.match(service, /private var latestStartId = 0/);
  assert.match(service, /if \(key != notificationKey\) \{[\s\S]*?if \(notificationKey == null\) stopSelfResult\(startId\)[\s\S]*?return/);
  assert.match(service, /stopSelfResult\(latestStartId\)/);
});

console.log(`Smoke tests passed: ${passed.length}`);
for (const name of passed) console.log(`✓ ${name}`);
