// The cache name follows data/app-version.js, so every release gets a fresh cache automatically.
self.window = self;
importScripts("./data/app-version.js");
const CACHE_NAME = `anyas-shell-v${self.ANIAS_APP_VERSION || "0"}-${self.ANIAS_VERSION_CODE || 0}`;
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/anyas-app-icon.png",
  "./assets/anyas-morning-background.webp",
  "./assets/anyas-night-background.webp",
  "./assets/prayer-hero.jpg",
  "./css/style.css",
  "./css/home.css",
  "./css/prayer.css",
  "./css/azkar.css",
  "./css/daily-adhkar.css?v=20261125-1",
  "./css/settings.css",
  "./css/audio-library.css",
  "./css/offline-fonts.css",
  "./css/theme-white-gold.css",
  "./css/tasks-ux.css",
  "./css/tasks-structure.css",
  "./css/home-structure.css",
  "./css/friday.css",
  "./css/notification-settings.css?v=20261014-1",
  "./css/more-page.css",
  "./css/app-design-system.css",
  "./css/first-run-onboarding.css",
  "./css/welcome.css",
  "./css/quran.css?v=20261125-1",
  "./js/quran.js?v=20261125-2",
  "./data/quran-full.js",
  "./data/quran-pages.js",
  "./data/quran-tafsir.js?v=20261124-1",
  "./data/quran-tajweed.js?v=20261124-1",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-maskable-192.png",
  "./assets/icons/icon-maskable-512.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/favicon-32.png",
  "./assets/icons/favicon-48.png",
  "./css/privacy.css",
  "./css/home-header.css",
  "./css/home-polish.css",
  "./data/app-version.js?v=20261014-3",
  "./js/i18n.js?v=20261014-1",
  "./data/azkar-topics.js",
  "./data/azkar-groups.js",
  "./data/azkar-benefits.js",
  "./data/daily-quran.js",
  "./data/daily-hadith-ids.js",
  "./data/daily-devotions.js",
  "./js/vendor/adhan.umd.min.js",
  "./js/prayer.js",
  "./js/daily-adhkar.js?v=20261125-1",
  "./js/home-expand.js",
  "./js/home-extras.js",
  "./js/share-image.js",
  "./js/quiet-hours.js?v=20261014-1",
  "./js/friday.js?v=20261014-1",
  "./js/favorites.js",
  "./js/azkar.js",
  "./js/wird.js",
  "./js/settings.js?v=20261125-1",
  "./js/qibla.js",
  "./js/app-enhancements.js",
  "./js/daily-devotions.js",
  "./js/app.js?v=20261125-3",
  "./js/about.js",
  "./js/optional-audio.js",
  "./js/duas.js",
  "./data/common-cities.js",
  "./data/en-ui-translations.json",
  "./css/duas.css",
  "./assets/fonts/Tajawal-400.ttf",
  "./assets/fonts/Tajawal-500.ttf",
  "./assets/fonts/Tajawal-700.ttf",
  "./assets/fonts/Tajawal-800.ttf",
  "./assets/fonts/Amiri-400.ttf",
  "./assets/fonts/Amiri-700.ttf",
  "./css/audio-library.css"
];


// index.html loads css/js/data with ?v=... query strings. Cache those exact URLs too,
// so the first offline start finds every file under the same URL the page asks for.
async function versionedAssetsFromIndex() {
  try {
    const response = await fetch("./index.html", { cache: "no-store" });
    const html = await response.text();
    const urls = new Set();
    for (const match of html.matchAll(/(?:href|src)="((?:css|js|data|assets)\/[^"#]+)"/g)) urls.add(`./${match[1]}`);
    return [...urls];
  } catch (_) {
    return [];
  }
}

// One missing file must not block the whole install.
async function precache(cache, urls) {
  await Promise.all(urls.map(url => cache.add(new Request(url, { cache: "reload" })).catch(error => console.info("sw: skipped", url, error && error.message))));
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await precache(cache, CORE_ASSETS);
    await precache(cache, (await versionedAssetsFromIndex()).filter(url => !CORE_ASSETS.includes(url)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith("anyas-shell-") && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Exact URL first; if only another ?v= copy exists, use it rather than failing offline.
    const cached = (await cache.match(request)) || (await cache.match(request, { ignoreSearch: true }));
    const refresh = fetch(request).then(response => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    }).catch(() => cached || (request.mode === "navigate" ? cache.match("./index.html", { ignoreSearch: true }) : Response.error()));
    return cached || refresh;
  })());
});
