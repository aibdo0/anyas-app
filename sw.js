const CACHE_NAME = "anyas-shell-v1.3.4-coffee-20261018-2";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/anyas-app-icon.png",
  "./assets/prayer-hero.jpg",
  "./css/style.css",
  "./css/home.css",
  "./css/home-hero-polish.css?v=20261016-5",
  "./css/prayer.css",
  "./css/azkar.css",
  "./css/wird-session.css?v=20261016-3",
  "./css/daily-adhkar.css",
  "./css/settings.css",
  "./css/audio-library.css",
  "./css/offline-fonts.css",
  "./css/theme-white-gold.css?v=20261016-2",
  "./css/card-backgrounds.css?v=20261017-1",
  "./css/anyas-fixes.css",
  "./css/app-background.css?v=20261015-2",
  "./css/home-compact.css?v=20261016-5",
  "./css/mobile-ux-foundation.css?v=20261016-1",
  "./css/home-redesign.css?v=20261017-2",
  "./css/palette-warm-gold.css?v=20261015-2",
  "./css/tasks-ux.css",
  "./css/tasks-structure.css",
  "./css/home-structure.css",
  "./css/friday.css",
  "./css/notification-settings.css?v=20261014-1",
  "./css/more-page.css?v=20261016-2",
  "./css/app-design-system.css?v=20261016-2",
  "./css/first-run-onboarding.css",
  "./css/privacy.css",
  "./css/dawn-mist-theme.css?v=20261017-3",
  "./css/coffee-theme.css?v=20261018-2",
  "./data/app-version.js?v=20261016-2",
  "./data/en-ui-translations.json?v=20261017-1",
  "./js/i18n.js?v=20261016-1",
  "./data/azkar-topics.js",
  "./data/azkar-benefits.js",
  "./data/daily-quran.js",
  "./data/daily-hadith-ids.js",
  "./data/daily-devotions.js",
  "./js/vendor/adhan.umd.min.js",
  "./css/privacy.css?v=20261017-1",
  "./css/wird-session.css?v=20261017-1",
  "./js/i18n.js?v=20261017-1",
  "./js/prayer.js?v=20261017-1",
  "./js/azkar.js?v=20261017-1",
  "./js/optional-audio.js?v=20261017-1",
  "./js/app-enhancements.js?v=20261017-1",
  "./js/daily-devotions.js?v=20261017-1",
  "./js/about.js?v=20261017-1",
  "./data/daily-devotions.js?v=20261017-1",
  "./js/prayer.js",
  "./js/daily-adhkar.js",
  "./js/quiet-hours.js?v=20261014-1",
  "./js/friday.js?v=20261014-1",
  "./js/favorites.js",
  "./js/azkar.js?v=20261016-7",
  "./js/wird-playlists.js?v=20261016-1",
  "./js/wird.js",
  "./js/settings.js?v=20261015-2",
  "./js/qibla.js",
  "./js/app-enhancements.js",
  "./js/daily-devotions.js",
  "./js/app.js",
  "./js/about.js",
  "./js/home-compact.js?v=20261016-2",
  "./js/home-ui-enhancements.js?v=20261016-1",
  "./js/quran-wird.js",
  "./js/share-card.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all(
        CORE_ASSETS.map(asset => cache.add(asset).catch(error => {
          console.warn("تعذر تخزين ملف للعمل دون اتصال:", asset, error.message);
          return null;
        }))
      ))
      .then(() => self.skipWaiting())
  );
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
