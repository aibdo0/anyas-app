import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";

const require = createRequire(new URL("../package.json", import.meta.url));
const prayerSource = fs.readFileSync(new URL("../js/prayer.js", import.meta.url), "utf8");
const appSource = fs.readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
const enhancementsSource = fs.readFileSync(new URL("../js/app-enhancements.js", import.meta.url), "utf8");
const adhan = require("./js/vendor/adhan.umd.min.js");
const NativeDate = Date;

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function createHarness(initialDate) {
  let now = initialDate.getTime();
  class TestDate extends NativeDate {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const stored = new Map();
  const elements = new Map([
    "prayerDataStatus", "fajrTime", "sunriseTime", "dhuhrTime", "asrTime", "maghribTime", "ishaTime",
    "nextPrayerName", "nextPrayerTime", "countdown", "prayerHeroCity"
  ].map(id => [id, { id, textContent: "", style: {}, classList: { add() {}, remove() {}, toggle() {} } }]));
  const document = {
    documentElement: { lang: "ar" },
    addEventListener() {},
    getElementById(id) { return elements.get(id) || null; },
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
  const localStorage = {
    getItem(key) { return stored.has(key) ? stored.get(key) : null; },
    setItem(key, value) { stored.set(key, String(value)); },
    removeItem(key) { stored.delete(key); }
  };
  const window = { adhan, addEventListener() {}, dispatchEvent() {}, todayTimings: null, lastKnownLocation: null };
  const context = vm.createContext({
    window, document, localStorage, Date: TestDate, Intl, console: { log() {}, warn() {}, error() {}, info() {} },
    navigator: { geolocation: null }, CustomEvent: class {}, setInterval() {}, clearInterval() {},
    fetch: async () => { throw new Error("unexpected live network request"); }
  });
  vm.runInContext(prayerSource, context, { filename: "js/prayer.js" });
  context.updatePrayerStates = () => {};
  context.updatePrayerProgress = () => {};
  context.setPrayerTime = () => {};
  return {
    context, window, document, localStorage, elements,
    setTime(date) { now = date instanceof NativeDate ? date.getTime() : new NativeDate(date).getTime(); },
    currentTime() { return new TestDate(); }
  };
}

function response(timings) {
  return { ok: true, async json() { return { data: { timings } }; } };
}

const standardTimings = {
  Fajr: "05:00", Sunrise: "06:20", Dhuhr: "12:00", Asr: "15:00", Maghrib: "18:00", Isha: "20:00"
};

// Each tick recomputes the true remaining duration; at the prayer boundary the card advances.
{
  const env = createHarness(new NativeDate(2026, 9, 19, 4, 59, 58));
  env.window.todayTimings = { ...standardTimings };
  env.window.prayerTimingsDateKey = dateKey(env.currentTime());
  env.window.lastKnownLocation = { latitude: 30.0444, longitude: 31.2357 };
  env.context.updateCountdown();
  const first = env.elements.get("countdown").textContent;
  env.setTime(new NativeDate(2026, 9, 19, 4, 59, 59));
  env.context.updateCountdown();
  const second = env.elements.get("countdown").textContent;
  assert.equal(first, "00:00:02");
  assert.equal(second, "00:00:01");
  env.setTime(new NativeDate(2026, 9, 19, 5, 0, 0));
  env.context.updateCountdown();
  assert.equal(env.elements.get("nextPrayerName").textContent, "الظهر");
  assert.equal(env.elements.get("countdown").textContent, "07:00:00");
  assert.match(appSource, /setInterval\(updateCountdown, 1000\)/);
}

// A local-date rollover reloads the timings for the saved coordinates and stamps the new date.
{
  const beforeMidnight = new NativeDate(2026, 9, 18, 23, 59, 55);
  const env = createHarness(beforeMidnight);
  env.window.todayTimings = { ...standardTimings };
  env.window.prayerTimingsDateKey = dateKey(beforeMidnight);
  env.window.lastKnownLocation = { latitude: 30.0444, longitude: 31.2357 };
  const requests = [];
  env.window.anyasFetch = async url => { requests.push(url); throw new Error("offline by test design"); };
  env.context.updateCountdown();
  const afterMidnight = new NativeDate(2026, 9, 19, 0, 0, 5);
  env.setTime(afterMidnight);
  env.context.updateCountdown();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(env.window.prayerTimingsDateKey, dateKey(afterMidnight));
  assert.equal(requests.length, 1);
  assert.match(requests[0], /timings\/19-10-2026\?latitude=30\.0444&longitude=31\.2357/);
  env.context.updateCountdown();
  assert.equal(env.window.nextPrayer.time.getDate(), 19);
}

// Different coordinates produce different locally calculated timings; a late old response cannot win.
{
  const env = createHarness(new NativeDate(2026, 9, 18, 12, 0, 0));
  const pending = [];
  env.window.anyasFetch = url => new Promise(resolve => pending.push({ url, resolve }));
  const cairoRequest = env.context.loadPrayerTimes(30.0444, 31.2357);
  const cairoDhuhr = env.window.originalPrayerTimings.Dhuhr;
  const riyadhRequest = env.context.loadPrayerTimes(24.7136, 46.6753);
  const riyadhDhuhr = env.window.originalPrayerTimings.Dhuhr;
  assert.notEqual(cairoDhuhr, riyadhDhuhr);
  assert.match(pending[0].url, /latitude=30\.0444&longitude=31\.2357/);
  assert.match(pending[1].url, /latitude=24\.7136&longitude=46\.6753/);

  pending[1].resolve(response({ ...standardTimings, Fajr: "02:00" }));
  await riyadhRequest;
  assert.equal(env.window.originalPrayerTimings.Fajr, "02:00");
  pending[0].resolve(response({ ...standardTimings, Fajr: "03:00" }));
  await cairoRequest;
  assert.equal(env.window.originalPrayerTimings.Fajr, "02:00");
}

// Startup restores a manually selected city and immediately requests timings for its saved coordinates.
{
  const env = createHarness(new NativeDate(2026, 9, 18, 12, 0, 0));
  env.localStorage.setItem("anyas_manual_location", JSON.stringify({ latitude: 24.7136, longitude: 46.6753, city: "الرياض" }));
  const calls = [];
  env.context.loadPrayerTimes = (latitude, longitude) => calls.push([latitude, longitude]);
  env.context.detectLocationAndLoadTimes({ allowPrompt: false });
  assert.deepEqual(calls, [[24.7136, 46.6753]]);
  assert.equal(env.window.currentLatitude, 24.7136);
  assert.equal(env.window.currentLongitude, 46.6753);
  assert.equal(env.elements.get("prayerHeroCity").textContent, "الرياض");
  assert.match(enhancementsSource, /localStorage\.setItem\("anyas_manual_location", JSON\.stringify\(safeLocation\)\)/);
  assert.match(enhancementsSource, /window\.loadPrayerTimes\?\.\(safeLocation\.latitude, safeLocation\.longitude\)/);
}

console.log("نجحت اختبارات الصلاة التشغيلية: العدّاد، انتقال الصلاة، منتصف الليل، اختلاف المدينة، تجاهل الرد القديم، واستعادة المدينة بعد إعادة الفتح.");
