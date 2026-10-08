(() => {
  "use strict";

  const CACHE_NAME = "anyas-optional-audio-v1";
  const REMOTE_BASE = "https://raw.githubusercontent.com/aibdo0/anyas-app/main/";
  const isAndroid = () => Boolean(window.AnyasAndroid);
  const text = (arabic, english) => document.documentElement.lang === "en" ? english : arabic;
  const cacheUrl = source => new URL(String(source).split("?")[0], window.location.href).href;
  const remoteUrl = source => `${REMOTE_BASE}${String(source).replace(/^\.\//, "").split("?")[0]}`;
  const source = relative => isAndroid() ? remoteUrl(relative) : relative;

  async function cached(relative) {
    if (!window.caches) return null;
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(cacheUrl(relative)) || await cache.match(remoteUrl(relative));
    if (!response) return null;
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  async function download(relative) {
    if (!window.caches) throw new Error("Cache API unavailable");
    const cache = await caches.open(CACHE_NAME);
    const requestUrl = remoteUrl(relative);
    let response = await cache.match(requestUrl);
    if (!response) {
      response = await fetch(requestUrl, { cache: "no-cache" });
      if (!response.ok) throw new Error(`Audio HTTP ${response.status}`);
      await cache.put(requestUrl, response.clone());
    }
    return response;
  }

  async function remove(relative) {
    if (!window.caches) return;
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(cacheUrl(relative));
    await cache.delete(remoteUrl(relative));
  }

  async function isDownloaded(relative) {
    if (!window.caches) return false;
    const cache = await caches.open(CACHE_NAME);
    return Boolean(await cache.match(cacheUrl(relative)) || await cache.match(remoteUrl(relative)));
  }
  const formatBytes = bytes => {
    if (!bytes) return text("٠ ك.ب", "0 KB");
    if (bytes < 1024 * 1024) return document.documentElement.lang === "en" ? `${Math.max(1, Math.round(bytes / 1024)).toLocaleString("en-US")} KB` : `${Math.max(1, Math.round(bytes / 1024)).toLocaleString("ar-EG")} ك.ب`;
    const megabytes = (bytes / 1024 / 1024).toFixed(1);
    return document.documentElement.lang === "en" ? `${megabytes} MB` : `${megabytes.replace(".", "٫").replace(/\d/g, digit => "٠١٢٣٤٥٦٧٨٩"[digit])} م.ب`;
  };
  async function cacheUsage() {
    if (!window.caches) return 0;
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    let total = 0;
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) total += (await response.blob()).size;
    }
    return total;
  }
  async function clearAll() {
    if (window.caches) await caches.delete(CACHE_NAME);
  }

  async function useCachedAudio(audio, relative) {
    if (!audio || !relative) return false;
    const objectUrl = await cached(relative);
    if (!objectUrl) return false;
    audio.src = objectUrl;
    audio.dataset.audioResolved = "true";
    audio.load();
    return true;
  }

  function setup() {
    document.querySelectorAll("audio").forEach(audio => {
      const relative = audio.dataset.audioSource || audio.querySelector("source")?.getAttribute("src");
      if (!relative || !relative.startsWith("audio/")) return;
      if (isAndroid()) {
        const sourceElement = audio.querySelector("source");
        if (sourceElement) sourceElement.src = source(relative);
        audio.preload = "none";
      }
      audio.dataset.audioSource = relative.split("?")[0];
      audio.addEventListener("play", async event => {
        if (audio.dataset.audioResolved === "true" || audio.dataset.audioResolving === "true") return;
        event.preventDefault();
        audio.dataset.audioResolving = "true";
        try {
          const found = await useCachedAudio(audio, audio.dataset.audioSource);
          if (!found) {
            audio.src = source(audio.dataset.audioSource);
            audio.load();
          }
          await audio.play();
        } catch (error) {
          console.warn("تعذر تجهيز الصوت الاختياري:", error);
        } finally {
          audio.dataset.audioResolving = "false";
        }
      });
    });
    document.querySelectorAll("[data-download-audio]").forEach(button => {
      const relative = button.dataset.downloadAudio;
      const status = document.querySelector(`[data-audio-status="${relative}"]`);
      const render = async () => {
        const ready = await isDownloaded(relative);
        button.textContent = ready ? text("حذف التنزيل", "Delete download") : text("تنزيل الصوت", "Download audio");
        button.setAttribute("aria-pressed", String(ready));
        if (status && !ready) status.textContent = text("يُنزل عند الطلب؛ لا يُحمل مع التثبيت", "Downloaded on demand; not bundled with the install");
        if (status && ready) status.textContent = text("محفوظ على هذا الجهاز", "Saved on this device");
      };
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          if (await isDownloaded(relative)) await remove(relative);
          else await download(relative);
          await render();
          document.getElementById("optionalAudioUsage")?.replaceChildren(text("المساحة المحفوظة: ", "Saved space: ") + formatBytes(await cacheUsage()));
        } catch (error) {
          if (status) status.textContent = "تعذر التنزيل؛ تحقق من الاتصال وحاول مرة أخرى.";
        } finally { button.disabled = false; }
      });
      render();
    });
    const usage = document.getElementById("optionalAudioUsage");
    const refreshUsage = async () => { if (usage) usage.textContent = text("المساحة المحفوظة: ", "Saved space: ") + formatBytes(await cacheUsage()); };
    document.getElementById("clearOptionalAudioButton")?.addEventListener("click", async () => {
      const total = await cacheUsage();
      if (!total || !window.confirm(text("هل تريد حذف كل التسجيلات المحفوظة؟", "Delete all saved recordings?"))) return;
      await clearAll();
      document.querySelectorAll("[data-download-audio]").forEach(button => {
        button.textContent = text("تنزيل الصوت", "Download audio");
        button.setAttribute("aria-pressed", "false");
      });
      document.querySelectorAll("[data-audio-status]").forEach(status => { status.textContent = text("يُنزل عند الطلب", "Downloaded on demand"); });
      refreshUsage();
    });
    refreshUsage();
  }

  window.AnyasAudio = { source, download, remove, isDownloaded, useCachedAudio };
  document.addEventListener("DOMContentLoaded", setup);
})();
