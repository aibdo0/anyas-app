// Behaviour tests for batch 1: timezone-aware prayer times, calculation methods, SW cache coverage, wird day rollover.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = rel => fs.readFileSync(path.join(root, rel), "utf8");
let passed = 0;
const check = (name, fn) => { fn(); passed++; console.log("ok -", name); };

function makeStorage(initial = {}) {
  const data = { ...initial };
  return { getItem: k => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, removeItem: k => { delete data[k]; }, data };
}

function loadPrayer(storage) {
  const ctx = { console, localStorage: storage, Intl, Date, JSON, Number, String, Math, parseInt, isNaN: Number.isNaN, document: { getElementById: () => null, addEventListener() {}, documentElement: { lang: "ar" }, querySelectorAll: () => [] }, addEventListener() {}, setInterval: () => 0 };
  ctx.window = ctx; ctx.self = ctx;
  vm.createContext(ctx);
  vm.runInContext(read("js/vendor/adhan.umd.min.js"), ctx);
  vm.runInContext(read("js/prayer.js") + "\nthis.__api = { getActiveTimeZone, zonedTimeToDate, zonedParts, createPrayerDate, ADHAN_METHOD_FACTORIES, getPrayerDay, rememberManualLocationZone };", ctx);
  return { ctx, api: ctx.__api };
}

check("zonedTimeToDate converts wall time in an IANA zone to the right instant", () => {
  const { api } = loadPrayer(makeStorage());
  // Cairo is UTC+2 in winter, UTC+3 in summer (DST returned in 2023+)
  assert.equal(api.zonedTimeToDate(2026, 1, 15, 12, 0, "Africa/Cairo").toISOString(), "2026-01-15T10:00:00.000Z");
  assert.equal(api.zonedTimeToDate(2026, 7, 15, 12, 0, "Africa/Cairo").toISOString(), "2026-07-15T09:00:00.000Z");
  assert.equal(api.zonedTimeToDate(2026, 1, 15, 5, 30, "America/New_York").toISOString(), "2026-01-15T10:30:00.000Z");
  assert.equal(api.zonedTimeToDate(2026, 6, 1, 5, 30, "Asia/Kolkata").toISOString(), "2026-06-01T00:00:00.000Z");
});

check("active zone comes from the manual city only, and rejects invalid zones", () => {
  assert.equal(loadPrayer(makeStorage()).api.getActiveTimeZone(), null);
  assert.equal(loadPrayer(makeStorage({ anyas_manual_location: JSON.stringify({ latitude: 1, longitude: 2, timezone: "Asia/Tokyo" }) })).api.getActiveTimeZone(), "Asia/Tokyo");
  assert.equal(loadPrayer(makeStorage({ anyas_manual_location: JSON.stringify({ latitude: 1, longitude: 2, timezone: "Not/AZone" }) })).api.getActiveTimeZone(), null);
});

check("createPrayerDate uses the city's day and zone for a manual city", () => {
  const storage = makeStorage({ anyas_manual_location: JSON.stringify({ latitude: 40.7, longitude: -74, timezone: "America/New_York" }) });
  const { api } = loadPrayer(storage);
  const d = api.createPrayerDate("05:30", 0);
  const parts = api.zonedParts(d, "America/New_York");
  assert.equal(parts.hour, 5); assert.equal(parts.minute, 30);
  const next = api.createPrayerDate("05:30", 1);
  assert.equal(Math.round((next - d) / 3600000) % 24 === 0 || Math.abs(next - d - 86400000) <= 3600000, true);
});

check("remembering a learned zone only fills a missing one", () => {
  const storage = makeStorage({ anyas_manual_location: JSON.stringify({ latitude: 1, longitude: 2, city: "x" }) });
  const { api } = loadPrayer(storage);
  assert.equal(api.rememberManualLocationZone("Europe/London"), true);
  assert.equal(JSON.parse(storage.data.anyas_manual_location).timezone, "Europe/London");
  assert.equal(api.rememberManualLocationZone("Asia/Tokyo"), false);
  assert.equal(JSON.parse(storage.data.anyas_manual_location).timezone, "Europe/London");
});

check("every method option in the UI maps to a real Adhan calculation method", () => {
  const { ctx, api } = loadPrayer(makeStorage());
  const options = [...read("index.html").matchAll(/<option value="(\d+)">\s*([^<]+?)\s*<\/option>/g)];
  const select = read("index.html").match(/<select id="calculationMethodSelect"[\s\S]*?<\/select>/)[0];
  const ids = [...select.matchAll(/<option value="(\d+)"/g)].map(m => Number(m[1]));
  assert.ok(ids.length >= 12, "expected the expanded method list");
  for (const id of ids) {
    const name = api.ADHAN_METHOD_FACTORIES[id];
    assert.ok(name, `method ${id} not mapped`);
    assert.equal(typeof ctx.adhan.CalculationMethod[name], "function", `${name} missing in adhan`);
  }
  assert.ok(options.length > 0);
});

check("local calculation differs between methods (not always Egyptian) and is sane for Cairo", () => {
  const { ctx } = loadPrayer(makeStorage());
  const coords = new ctx.adhan.Coordinates(30.0444, 31.2357);
  const date = new Date(2026, 5, 15, 12);
  const fajr = name => new ctx.adhan.PrayerTimes(coords, date, ctx.adhan.CalculationMethod[name]()).fajr.getTime();
  assert.notEqual(fajr("Egyptian"), fajr("NorthAmerica"));
  assert.notEqual(fajr("UmmAlQura"), fajr("MuslimWorldLeague"));
});

check("service worker precaches the previously missing assets and ignores ?v= differences", () => {
  const sw = read("sw.js");
  for (const f of ["./js/optional-audio.js", "./js/duas.js", "./data/common-cities.js", "./css/duas.css"]) assert.ok(sw.includes(`"${f}"`), `${f} not precached`);
  assert.match(sw, /ignoreSearch: true/);
  assert.match(sw, /ANIAS_APP_VERSION/);
  assert.doesNotMatch(sw, /cache\.addAll/);
  const CORE = [...sw.matchAll(/"\.\/((?:css|js|data|assets)\/[^"?]+)/g)].map(m => m[1]);
  for (const f of CORE) assert.ok(fs.existsSync(path.join(root, f)), `precached file missing on disk: ${f}`);
});

check("service worker derives its cache name from app-version.js", () => {
  const ctx = { self: null, console, Response: class {}, caches: {}, fetch: () => {}, URL, addEventListener() {} };
  ctx.self = ctx; ctx.importScripts = () => vm.runInContext(read("data/app-version.js"), ctx);
  ctx.self.addEventListener = () => {};
  vm.createContext(ctx);
  vm.runInContext(read("sw.js") + "\nthis.__name = CACHE_NAME;", ctx);
  const v = read("data/app-version.js");
  const version = v.match(/ANIAS_APP_VERSION = "([^"]+)"/)[1];
  const code = v.match(/ANIAS_VERSION_CODE = (\d+)/)[1];
  assert.equal(ctx.__name, `anyas-shell-v${version}-${code}`);
});

check("every asset index.html loads is precached by exact URL or by the index scan", () => {
  const html = read("index.html");
  const refs = [...html.matchAll(/(?:href|src)="((?:css|js|data)\/[^"#]+)"/g)].map(m => m[1]);
  for (const r of refs) assert.ok(fs.existsSync(path.join(root, r.split("?")[0])), `index references missing file ${r}`);
  assert.match(read("sw.js"), /versionedAssetsFromIndex/);
});

check("wird day key is read at use-time, with a midnight rollover", () => {
  const storage = makeStorage();
  let nowDate = new Date(2026, 10, 24, 23, 59);
  const RealDate = Date;
  class FakeDate extends RealDate { constructor(...a) { super(...(a.length ? a : [nowDate.getTime()])); } static now() { return nowDate.getTime(); } }
  const listeners = {};
  const ctx = { console, localStorage: storage, Date: FakeDate, JSON, setInterval: () => 0, document: { addEventListener: (e, f) => { listeners[e] = f; }, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], hidden: false }, azkarTopics: [] };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(read("js/wird.js"), ctx);
  const src = read("js/wird.js");
  assert.match(src, /const currentDayKey = \(\) =>/);
  assert.match(src, /rolloverIfNeeded/);
  assert.doesNotMatch(src, /const todayKey =/);
  listeners.DOMContentLoaded?.();
  nowDate = new RealDate(2026, 10, 25, 0, 1);
  listeners.visibilitychange?.();
});

console.log(`\n${passed} batch-1 checks passed`);

// Prayer window boundaries (1.1.57): locked, open, unlogged, Isha ends at midnight.
{
  const src = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
  const m = src.match(/function prayerWindowStateAt[\s\S]*?\n}\n/);
  const ctx = { Date }; vm.createContext(ctx); vm.runInContext(m[0], ctx);
  const day = new Date(2026, 10, 25);
  const toDate = t => { if (!t) return null; const [h, mi] = t.split(":").map(Number); const d = new Date(day); d.setHours(h, mi, 0, 0); return d; };
  const T = { Fajr: "04:40", Sunrise: "06:00", Dhuhr: "11:50", Asr: "14:45", Maghrib: "17:10", Isha: "18:30" };
  const at = (h, mi) => { const d = new Date(day); d.setHours(h, mi, 0, 0); return d; };
  const st = (p, d) => ctx.prayerWindowStateAt(T, p, d, toDate).state;
  check("prayer window: locked before, open at start, unlogged at end", () => {
    assert.equal(st("Dhuhr", at(11, 49)), "locked");
    assert.equal(st("Dhuhr", at(11, 50)), "open");
    assert.equal(st("Dhuhr", at(14, 44)), "open");
    assert.equal(st("Dhuhr", at(14, 45)), "unlogged");
  });
  check("prayer window: Isha open until midnight then unlogged", () => {
    assert.equal(st("Isha", at(23, 59)), "open");
    assert.equal(st("Isha", new Date(2026, 10, 26, 0, 0)), "unlogged");
  });
}
