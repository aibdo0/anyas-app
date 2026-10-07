(() => {
  "use strict";
  const open = document.getElementById("openReminderTestsButton");
  const page = document.getElementById("page-reminder-tests");
  if (!page) return;
  const back = document.getElementById("reminderTestsBackButton");
  const allButton = document.getElementById("testAllRemindersButton");
  const status = document.getElementById("reminderTestStatus");
  const notificationResult = document.getElementById("reminderNotificationResult");
  const audioResult = document.getElementById("reminderAudioResult");
  const timeResult = document.getElementById("reminderTestTime");
  const cards = [...document.querySelectorAll("[data-reminder-test][data-audio]")];
  let activeAudio = null;
  let testing = false;

  const volume = () => Math.max(0, Math.min(1, Number(localStorage.getItem("anyas_masterVolume") || 80) / 100));
  const setPage = id => { if (typeof window.goToPage === "function") window.goToPage(id); else if (typeof window.openPage === "function") window.openPage(id); };
  const resultTime = () => new Intl.DateTimeFormat("ar-EG", { hour: "numeric", minute: "2-digit" }).format(new Date());
  const updateResult = (label, audioOk, notificationOk = true) => {
    if (status) status.textContent = `اكتمل اختبار ${label}.`;
    if (notificationResult) notificationResult.textContent = notificationOk ? "تم التشغيل" : "لم يصل";
    if (audioResult) audioResult.textContent = audioOk ? "تم التشغيل" : "تعذر التشغيل";
    if (timeResult) timeResult.textContent = resultTime();
  };
  const nativeTest = (file, label) => {
    const bridge = window.AnyasAndroid;
    if (!bridge || typeof bridge.testNotificationAndSound !== "function") return null;
    const response = bridge.testNotificationAndSound(file, volume());
    const ok = response === "started";
    updateResult(label, ok, ok || response === "notification_only");
    if (status && !ok) status.textContent = response === "permission_required" ? "فعّل إذن الإشعارات ثم أعد الاختبار." : response === "volume_muted" ? "ارفع مستوى الصوت أولًا." : "تعذر تشغيل اختبار هذا التذكير.";
    return ok;
  };
  const browserTest = async (file, label) => {
    if (activeAudio) { activeAudio.pause(); activeAudio.currentTime = 0; }
    const audio = new Audio(`audio/${encodeURIComponent(file)}`);
    audio.volume = volume(); activeAudio = audio;
    try { await audio.play(); updateResult(label, true, "Notification" in window); } catch (error) { updateResult(label, false, false); if (status) status.textContent = `تعذر تشغيل ${label}. اضغط مرة أخرى وارفع صوت الوسائط.`; return; }
    await new Promise(resolve => setTimeout(resolve, 3000)); audio.pause(); audio.currentTime = 0;
  };
  const testCard = async card => {
    if (testing) return;
    const label = card.dataset.reminderTest, file = card.dataset.audio;
    card.classList.add("testing");
    if (status) status.textContent = `جارٍ اختبار ${label}…`;
    let ok = nativeTest(file, label);
    if (ok === null) { await browserTest(file, label); ok = true; }
    card.classList.remove("testing"); card.classList.add("tested");
  };
  cards.forEach(card => card.addEventListener("click", () => testCard(card)));
  allButton?.addEventListener("click", async () => {
    if (testing) return;
    testing = true; allButton.disabled = true;
    for (const card of cards) { await testCard(card); await new Promise(resolve => setTimeout(resolve, 350)); }
    if (status) status.textContent = "اكتمل اختبار جميع التذكيرات.";
    testing = false; allButton.disabled = false;
  });
  open?.addEventListener("click", () => setPage("reminder-tests"));
  back?.addEventListener("click", () => setPage("settings"));
})();
