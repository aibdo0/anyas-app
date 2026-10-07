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
  assert.match(enhancements, /localStorage\.setItem\("anyas_manual_location", JSON\.stringify\(location\)\)/);
  assert.match(prayer, /JSON\.parse\(localStorage\.getItem\("anyas_manual_location"/);
  assert.match(prayer, /window\.currentLatitude\s*=\s*Number\(saved\.latitude\)/);
  assert.match(prayer, /window\.currentLongitude\s*=\s*Number\(saved\.longitude\)/);
});

check("prayer times have an offline local calculation path", () => {
  assert.match(prayer, /const calculateLocally = \(\) =>/);
  assert.match(prayer, /if \(!rawTimings\) rawTimings = calculateLocally\(\)/);
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
});

console.log(`Smoke tests passed: ${passed.length}`);
for (const name of passed) console.log(`✓ ${name}`);
