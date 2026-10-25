const CACHE_NAME = "anyas-shell-v1.1.6";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/icons/anyas-app-icon.png",
  "./assets/images/anyas-morning-background.webp",
  "./assets/images/anyas-night-background.webp",
  "./assets/images/prayer-hero.jpg",
  "./css/base/style.css",
  "./css/pages/home.css",
  "./css/pages/prayer.css",
  "./css/pages/azkar.css",
  "./css/pages/daily-adhkar.css",
  "./css/pages/settings.css",
  "./css/components/audio-library.css",
  "./css/base/offline-fonts.css",
  "./css/theme/theme-white-gold.css",
  "./css/components/tasks-ux.css",
  "./css/components/tasks-structure.css",
  "./css/components/home-structure.css",
  "./css/pages/friday.css",
  "./css/components/notification-settings.css",
  "./css/pages/more-page.css",
  "./css/components/app-design-system.css",
  "./css/components/first-run-onboarding.css",
  "./css/pages/privacy.css",
  "./data/app-version.js",
  "./data/azkar-topics.js",
  "./data/azkar-benefits.js",
  "./data/daily-quran.js",
  "./data/daily-hadith-ids.js",
  "./data/daily-devotions.js",
  "./js/vendor/adhan.umd.min.js",
  "./js/features/prayer.js",
  "./js/features/daily-adhkar.js",
  "./js/features/friday.js",
  "./js/features/favorites.js",
  "./js/features/azkar.js",
  "./js/features/wird.js",
  "./js/features/settings.js",
  "./js/features/qibla.js",
  "./js/services/app-enhancements.js",
  "./js/features/daily-devotions.js",
  "./js/core/app.js",
  "./js/features/about.js"
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
