(() => {
  "use strict";

  const byId = id => document.getElementById(id);
  const bridge = window.AnyasAndroid;
  const tokenButton = byId("copyFirebaseTokenButton");
  const updateButton = byId("checkAppUpdateButton");
  const status = byId("firebaseTokenStatus");
  const connection = byId("firebaseConnectionStatus");
  const version = byId("firebaseAppVersion");
  const toggle = byId("firebaseUpdatesEnabled");
  const toolsStatus = byId("settingsToolsStatus");
  const exportButton = byId("exportAnyasSettingsButton");
  const importButton = byId("importAnyasSettingsButton");
  const importInput = byId("importAnyasSettingsInput");
  const rescheduleButton = byId("rescheduleAnyasButton");
  if (!tokenButton && !updateButton && !toggle) return;

  const nativeToken = () => {
    try { return bridge && typeof bridge.getFirebaseToken === "function" ? String(bridge.getFirebaseToken() || "").trim() : ""; } catch (error) { return ""; }
  };
  const copy = async text => {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
    const input = document.createElement("textarea"); input.value = text; input.setAttribute("readonly", ""); input.style.position = "fixed"; input.style.opacity = "0"; document.body.append(input); input.select(); document.execCommand("copy"); input.remove();
  };
  const setStatus = text => { if (status) status.textContent = text; };
  const currentVersion = () => {
    try { return bridge && typeof bridge.getAppVersionName === "function" ? String(bridge.getAppVersionName() || "1.1.5") : "1.1.5"; } catch (error) { return "1.1.5"; }
  };
  const compareVersions = (a, b) => {
    const left = String(a).replace(/^v/i, "").split(".").map(Number), right = String(b).replace(/^v/i, "").split(".").map(Number);
    for (let i = 0; i < Math.max(left.length, right.length); i += 1) { const x = left[i] || 0, y = right[i] || 0; if (x !== y) return x > y ? 1 : -1; }
    return 0;
  };

  const refreshConnection = () => {
    const connected = !!(bridge && typeof bridge.isFirebaseConnected === "function" && bridge.isFirebaseConnected());
    if (connection) { connection.textContent = connected ? "متصل" : "في انتظار اتصال الجهاز"; connection.dataset.state = connected ? "connected" : "pending"; }
    if (version) version.textContent = currentVersion();
    if (toggle && bridge && typeof bridge.areFirebaseUpdatesEnabled === "function") toggle.checked = bridge.areFirebaseUpdatesEnabled();
  };

  tokenButton?.addEventListener("click", async () => {
    tokenButton.disabled = true; setStatus("جارٍ الحصول على رمز الجهاز…");
    let token = nativeToken();
    for (let attempt = 0; !token && attempt < 4; attempt += 1) { await new Promise(resolve => setTimeout(resolve, 700)); token = nativeToken(); }
    if (!token) { setStatus("افتح التطبيق مع الإنترنت ثم أعد المحاولة."); tokenButton.disabled = false; refreshConnection(); return; }
    try { await copy(token); setStatus("تم نسخ الرمز؛ الصقه في اختبار Firebase."); } catch (error) { setStatus("تعذر النسخ تلقائيًا؛ حاول مرة أخرى."); }
    tokenButton.disabled = false; refreshConnection();
  });

  toggle?.addEventListener("change", () => {
    if (bridge && typeof bridge.setFirebaseUpdatesEnabled === "function") bridge.setFirebaseUpdatesEnabled(toggle.checked);
    setStatus(toggle.checked ? "إشعارات التحديثات مفعّلة." : "تم إيقاف إشعارات التحديثات فقط.");
  });

  updateButton?.addEventListener("click", async () => {
    updateButton.disabled = true; setStatus("جارٍ فحص آخر إصدار…");
    try {
      const response = await fetch("https://raw.githubusercontent.com/aibdo0/anyas-app/main/data/app-update.json?" + Date.now(), { cache: "no-store" });
      if (!response.ok) throw new Error("update manifest unavailable");
      const manifest = await response.json();
      const local = currentVersion();
      if (manifest.version && compareVersions(manifest.version, local) > 0) {
        setStatus(`يوجد تحديث جديد ${manifest.version}.`);
        if (manifest.url) { const link = document.createElement("a"); link.href = manifest.url; link.target = "_blank"; link.rel = "noopener"; link.textContent = "فتح صفحة التحميل"; link.className = "firebase-update-link"; updateButton.after(link); }
      } else setStatus(`أنت تستخدم آخر إصدار (${local}).`);
    } catch (error) { setStatus("تعذر فحص التحديث؛ تحقق من الإنترنت."); }
    updateButton.disabled = false;
  });

  const settingsSnapshot = () => {
    const values = {};
    for (let i = 0; i < localStorage.length; i += 1) { const key = localStorage.key(i); if (key) values[key] = localStorage.getItem(key); }
    return { format: 1, app: "anyas", exportedAt: new Date().toISOString(), values };
  };
  exportButton?.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(settingsSnapshot(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "anyas-settings-backup.json"; link.click(); URL.revokeObjectURL(url);
    if (toolsStatus) toolsStatus.textContent = "تم تصدير نسخة الإعدادات.";
  });
  importButton?.addEventListener("click", () => importInput?.click());
  importInput?.addEventListener("change", async () => {
    const file = importInput.files?.[0]; if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      if (payload?.app !== "anyas" || !payload.values || typeof payload.values !== "object") throw new Error("invalid backup");
      Object.entries(payload.values).forEach(([key, value]) => { if (typeof value === "string") localStorage.setItem(key, value); });
      if (toolsStatus) toolsStatus.textContent = "تم الاستيراد؛ ستُطبّق الإعدادات بعد إعادة فتح التطبيق.";
      setTimeout(() => location.reload(), 900);
    } catch (error) { if (toolsStatus) toolsStatus.textContent = "ملف الإعدادات غير صالح."; }
    importInput.value = "";
  });
  rescheduleButton?.addEventListener("click", () => {
    if (bridge && typeof bridge.rescheduleRemindersNow === "function") { bridge.rescheduleRemindersNow(); if (toolsStatus) toolsStatus.textContent = "تمت إعادة جدولة التذكيرات."; }
    else if (toolsStatus) toolsStatus.textContent = "يتوفر هذا الزر داخل نسخة Android فقط.";
  });

  refreshConnection();
})();
