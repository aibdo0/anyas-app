const CACHE_NAME = "anyas-shell-v1.1.6";
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
  "./css/daily-adhkar.css",
  "./css/settings.css",
  "./css/audio-library.css",
  "./css/offline-fonts.css",
  "./css/theme-white-gold.css",
  "./css/tasks-ux.css",
  "./css/tasks-structure.css",
  "./css/home-structure.css",
  "./css/friday.css",
  "./css/notification-settings.css",
  "./css/more-page.css",
  "./css/app-design-system.css",
  "./css/first-run-onboarding.css",
  "./css/privacy.css",
  "./data/app-version.js",
  "./data/azkar-topics.js",
  "./data/azkar-benefits.js",
  "./data/daily-quran.js",
  "./data/daily-hadith-ids.js",
  "./data/daily-devotions.js",
  "./js/vendor/adhan.umd.min.js",
  "./js/prayer.js",
  "./js/daily-adhkar.js",
  "./js/friday.js",
  "./js/favorites.js",
  "./js/azkar.js",
  "./js/wird.js",
  "./js/settings.js",
  "./js/qibla.js",
  "./js/app-enhancements.js",
  "./js/daily-devotions.js",
  "./js/app.js",
  "./js/about.js"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()));
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
  event.respondWith(
    caches.match(request).then(cached => {
      const refresh = fetch(request).then(response => {
        if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
        return response;
      }).catch(() => cached || caches.match("./index.html"));
      return cached || refresh;
    })
  );
});
