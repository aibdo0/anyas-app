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
const homeCompact = read("js/home-compact.js");
const homeCompactCss = read("css/home-compact.css");

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

check("optional backgrounds follow morning, evening, and sleep periods", () => {
  const palette = read("css/palette-warm-gold.css");
  const backgrounds = read("css/app-background.css");
  assert.match(index, /id="timeBackgroundToggle" type="checkbox"/);
  assert.match(index, /localStorage\.getItem\("anyas_autoBackground"\) === "true"/);
  assert.match(settings, /minutes >= 270 && minutes < 930 \? "morning"/);
  assert.match(settings, /minutes >= 930 && minutes < 1200 \? "evening"/);
  assert.match(settings, /: "sleep"/);
  assert.match(backgrounds, /data-background-scene="morning"/);
  assert.match(backgrounds, /data-background-scene="evening"/);
  assert.match(backgrounds, /data-background-scene="sleep"/);
  assert.match(backgrounds, /data-auto-background="true"\] body/);
  assert.match(backgrounds, /#page-home \.daily-adhkar-card\[data-adhkar-period\]/);
  assert.match(backgrounds, /data-theme="dark"\]\[data-auto-background="true"\].*#page-home \.daily-adhkar-card/s);
  assert.match(palette, /:root\[data-theme="dark"\] #page-home \.nearby-mosque-card/);
  assert.match(read("js/daily-adhkar.js"), /card\.dataset\.adhkarPeriod = period\.id/);
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

check("wird session read-aloud is user initiated, repeat-aware, and locally resumable", () => {
  const azkarScript = read("js/azkar.js");
  const sessionCss = read("css/wird-session.css");
  assert.match(index, /id="wirdSessionPlayToggle"/);
  assert.match(index, /id="wirdSessionPrevious"/);
  assert.match(index, /id="wirdSessionNextItem"/);
  assert.match(index, /id="wirdSessionRate"/);
  assert.match(azkarScript, /function toggleWirdAudio\(\)/);
  assert.match(azkarScript, /wirdSessionPlayToggle[^\n]*addEventListener/);
  assert.match(azkarScript, /speechSynthesis\.pause\(\)/);
  assert.match(azkarScript, /speechSynthesis\.resume\(\)/);
  assert.match(azkarScript, /const remaining = wirdAudioReplayCurrent \? 1 : count - completed/);
  assert.match(azkarScript, /saveTopicProgress\(wirdSession\.number, wirdSession\.progress\)/);
  assert.match(azkarScript, /function wirdAudioVolume\(\)/);
  assert.match(azkarScript, /localStorage\.getItem\("anyas_wirdVolume"\)/);
  assert.doesNotMatch(azkarScript, /anyas_adhanVolume/);
  assert.match(azkarScript, /wirdAudioWaitingForNext/);
  assert.match(azkarScript, /anyas_wirdSpeechRate/);
  assert.match(azkarScript, /speechSynthesis\.cancel\(\)/);
  assert.doesNotMatch(azkarScript, /addEventListener\("pagehide", cancelWirdAudio\)/);
  assert.match(index, /الصوت آلي من محرك جهازك/);
  assert.match(sessionCss, /\.wird-session-audio-controls/);
});

check("custom wird playlists validate counts, retain source references, and resolve current adhkar", () => {
  const storage = new Map();
  const window = { azkarTopics: [{ number: 4, title: "باب الاختبار", items: [{ text: "ذكر تجريبي", count: 3 }] }] };
  const document = { addEventListener() {}, documentElement: { lang: "ar" } };
  const localStorage = {
    getItem: key => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, String(value))
  };
  vm.runInNewContext(read("js/wird-playlists.js"), { window, document, localStorage });
  const api = window.AnyasWirdPlaylists;
  const playlist = api.normalize({ id: "test-list_1", name: "قائمة اختبار", revision: 1, items: [{ topicNumber: 4, sourceIndex: 0, count: 5 }] });
  assert.equal(playlist.items[0].count, 5);
  assert.equal(api.normalize({ id: "invalid", name: "bad", items: [{ topicNumber: 4, sourceIndex: 0, count: 0 }] }), null);
  assert.equal(api.save([playlist]), true);
  assert.equal(api.load().length, 1);
  const resolved = api.resolve(playlist.items);
  assert.equal(resolved.length, 1);
  assert.equal(resolved[0].count, 5, "a user-selected repeat count is honored");
  assert.equal(resolved[0].sourceCount, 3, "the original sourced count remains available");
  assert.equal(resolved[0].item.text, "ذكر تجريبي");
  assert.equal(api.resolve([{ topicNumber: 4, sourceIndex: 9, count: 1 }]).length, 0);
  const storedItem = JSON.parse(storage.get("anyas_wird_playlists_v1"))[0].items[0];
  assert.equal("text" in storedItem, false, "playlist persists source references, not copied adhkar text");
});

check("custom-session controls and playlist module are wired into the offline shell", () => {
  const azkarScript = read("js/azkar.js");
  const translations = JSON.parse(read("data/en-ui-translations.json"));
  const version = read("data/app-version.js");
  assert.match(index, /id="wirdPlaylistManager"/);
  assert.match(index, /id="wirdSessionSource"/);
  assert.match(index, /id="wirdSessionVolume"/);
  assert.match(azkarScript, /anyas_wirdVolume/);
  assert.match(azkarScript, /updateWirdPlaybackSettings/);
  assert.match(index, /id="wirdSessionReplay"/);
  assert.match(index, /id="wirdSessionRestart"/);
  assert.match(index, /id="wirdSessionStop"/);
  assert.match(index, /js\/wird-playlists\.js\?v=20261016-1/);
  assert.match(index, /css\/wird-session\.css\?v=20261016-3/);
  assert.match(index, /js\/azkar\.js\?v=20261016-7/);
  assert.match(azkarScript, /window\.openWirdCustomSession = openWirdCustomSession/);
  assert.match(azkarScript, /anyas_wird_custom_progress_/);
  assert.match(azkarScript, /wirdAudioRetryCount < 1/);
  assert.match(serviceWorker, /js\/wird-playlists\.js\?v=20261016-1/);
  assert.match(serviceWorker, /css\/wird-session\.css\?v=20261016-3/);
  assert.match(serviceWorker, /js\/azkar\.js\?v=20261016-7/);
  assert.match(serviceWorker, /app-version\.js\?v=20261016-2/);
  assert.match(serviceWorker, /en-ui-translations\.json\?v=20261016-1/);
  assert.match(version, /ANIAS_APP_VERSION = "1\.3\.1"/);
  assert.match(version, /ANIAS_VERSION_CODE = 15/);
  assert.equal(translations["جلساتي المخصصة"], "My custom sessions");
  assert.equal(translations["إعادة الذكر"], "Repeat dhikr");
});

check("Android wird playback has a foreground TTS service and lock-screen controls", () => {
  const activity = read("android/app/src/main/java/com/anyas/app/MainActivity.java");
  const service = read("android/app/src/main/java/com/anyas/app/WirdPlaybackService.java");
  const manifest = read("android/app/src/main/AndroidManifest.xml");
  const azkarScript = read("js/azkar.js");
  assert.match(manifest, /\.WirdPlaybackService[^>]+foregroundServiceType="mediaPlayback"/);
  assert.match(activity, /startWirdPlayback\(String queueJson, String title, int startIndex, double volume, double rate, boolean replayCurrent, int returnIndex, String sessionToken\)/);
  assert.match(activity, /updateWirdPlaybackSettings/);
  assert.match(activity, /startForegroundService\(playback\)/);
  assert.match(service, /TextToSpeech/);
  assert.match(service, /MediaSession/);
  assert.match(service, /Notification\.MediaStyle/);
  assert.match(service, /ACTION_PAUSE/);
  assert.match(service, /ACTION_RESUME/);
  assert.match(service, /ACTION_NEXT/);
  assert.match(service, /ACTION_STOP/);
  assert.match(service, /ACTION_SETTINGS/);
  assert.match(service, /AudioManager\.AUDIOFOCUS_GAIN_TRANSIENT/);
  assert.match(service, /AUDIOFOCUS_LOSS_TRANSIENT/);
  assert.match(service, /pausedForFocus/);
  assert.match(service, /ttsRetryCount < 1/);
  assert.match(azkarScript, /window\.anyasAndroidWirdUtteranceCompleted/);
  assert.match(azkarScript, /window\.anyasAndroidWirdProgress/);
  assert.match(azkarScript, /window\.anyasAndroidWirdNext/);
  assert.match(azkarScript, /startWirdPlayback/);
  assert.match(azkarScript, /JSON\.stringify\(queue\)/);
  assert.match(manifest, /android\.permission\.WAKE_LOCK/);
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

check("compact home omits the extra prayer counter and logging button while preserving tracking and accessible daily tabs", () => {
  assert.match(index, /href="css\/home-compact\.css\?v=20261016-4"/);
  assert.match(index, /src="js\/home-compact\.js\?v=20261016-2"/);
  assert.ok(index.indexOf("css/home-compact.css") > index.indexOf("css/app-background.css"));
  assert.doesNotMatch(index, /homePrayerProgressBadge|homeRecordPrayerButton|تسجيل الصلاة/);
  assert.match(index, /role="tablist" aria-label="المحتوى اليومي"/);
  assert.match(index, /id="dailyAyahBlock" role="tabpanel"/);
  assert.match(index, /id="dailyHadithBlock" role="tabpanel"/);
  assert.match(index, /class="section home-location-tools"/);
  for (const id of ["prayerList", "nextPrayerName", "nextPrayerTime", "dailyAyahText", "dailyHadithText", "nearbyMosqueButton", "openQiblaButton"]) {
    assert.match(index, new RegExp(`id="${id}"`));
  }
  assert.doesNotMatch(homeCompact, /updatePrayerTrackingUI|todayPrayerTracker|prayer-row\.next/);
  assert.match(read("js/app.js"), /updatePrayerTrackingUI/);
  assert.match(read("js/app.js"), /todayPrayerTracker/);
  assert.match(homeCompact, /getFridayState/);
  assert.match(homeCompactCss, /grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(homeCompactCss, /data-home-compact-friday="false"/);
  assert.match(homeCompactCss, /daily-adhkar-card\s*\{[^}]*height:\s*142px !important/);
  assert.match(homeCompactCss, /friday-feature-card\s*\{[^}]*height:\s*142px/);
  assert.match(homeCompactCss, /\.next-prayer\s*\{[^}]*height:\s*142px !important/);
  assert.match(homeCompactCss, /\.next-prayer\s*\{[^}]*width:\s*100%/);
  assert.match(serviceWorker, /home-compact\.css\?v=20261016-4/);
  assert.match(serviceWorker, /home-compact\.js\?v=20261016-2/);
});

console.log(`Smoke tests passed: ${passed.length}`);
for (const name of passed) console.log(`✓ ${name}`);
