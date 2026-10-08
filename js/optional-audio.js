(() => {
  "use strict";

  const CACHE_NAME = "anyas-optional-audio-v1";
  const REMOTE_BASE = "https://raw.githubusercontent.com/aibdo0/anyas-app/main/";
  const isAndroid = () => Boolean(window.AnyasAndroid);
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
        button.textContent = ready ? "حذف التنزيل" : "تنزيل الصوت";
        button.setAttribute("aria-pressed", String(ready));
        if (status) status.textContent = ready ? "محفوظ على هذا الجهاز" : "يُنزل عند الطلب؛ لا يُحمل مع التثبيت";
      };
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          if (await isDownloaded(relative)) await remove(relative);
          else await download(relative);
          await render();
        } catch (error) {
          if (status) status.textContent = "تعذر التنزيل؛ تحقق من الاتصال وحاول مرة أخرى.";
        } finally { button.disabled = false; }
      });
      render();
    });
  }

  window.AnyasAudio = { source, download, remove, isDownloaded, useCachedAudio };
  document.addEventListener("DOMContentLoaded", setup);
})();
