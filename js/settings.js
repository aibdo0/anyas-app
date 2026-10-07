// =====================================================
// مَآبُ الأوَّاب
// الإعدادات
// الأذان + الوضع الليلي + اللغة
// الإشعارات + الاهتزاز + العبادات والمواسم
// =====================================================


// =====================================================
// مشغل الأذان الرئيسي
// =====================================================

function setupAdhan() {

  const button =
    document.getElementById("adhanButton");

  const audio =
    document.getElementById("adhanAudio");

  if (!button || !audio) return;

  button.addEventListener("click", () => {

    if (audio.paused) {

      syncSelectedMuezzinAudio("adhanAudio", "normalMuezzin", "anyas_normalMuezzin", "normalMuezzinOptions");
      audio.currentTime = 0;

      audio.play()
        .then(() => {

          button.textContent =
            "إيقاف الأذان";

        })
        .catch(error => {

          console.error(
            "تعذر تشغيل الأذان:",
            error
          );

        });

    } else {

      audio.pause();

      button.textContent =
        "تشغيل الأذان";

    }

  });

  audio.addEventListener("ended", () => {

    button.textContent =
      "تشغيل الأذان";

  });

}


// =====================================================
// إعدادات الأذان
// =====================================================

function setupAdhanSettings() {

  const auto =
    document.getElementById("autoAdhan");

  const volume =
    document.getElementById("adhanVolume");

  const volumeValue =
    document.getElementById("volumeValue");
  const muteToggle = document.getElementById("audioMuteToggle");
  const volumeStatus = document.getElementById("audioVolumeStatus");

  const formatVolumeLabel = value => {
    const locale = document.documentElement.lang === "en" ? "en" : "ar";
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0, useGrouping: false }).format(value)}%`;
  };

  const testButton =
    document.getElementById("testAdhanButton");

  const testAdhkarButton = document.getElementById("testAdhkarButton");
  const testNotificationButton = document.getElementById("testNotificationButton");
  const testReminderButton = document.getElementById("testReminderButton");
  const audioTestStatus = document.getElementById("audioTestStatus");

  const adhan =
    document.getElementById("adhanAudio");

  const fajr =
    document.getElementById("fajrAudio");

  const savedAuto =
    localStorage.getItem("anyas_autoAdhan");

  const savedVolume =
    localStorage.getItem("anyas_adhanVolume");
  window.anyasAudioMuted = localStorage.getItem("anyas_audio_muted") === "true";
  const renderMuteState = () => {
    const english = document.documentElement.lang === "en";
    if (muteToggle) {
      muteToggle.setAttribute("aria-pressed", String(window.anyasAudioMuted));
      muteToggle.textContent = window.anyasAudioMuted ? (english ? "Unmute" : "إلغاء الكتم") : (english ? "Mute" : "كتم الصوت");
    }
    if (volumeStatus) volumeStatus.textContent = window.anyasAudioMuted ? (english ? "Sound is muted" : "الصوت مكتوم") : (english ? "Sound is on" : "الصوت يعمل");
  };

  const volumeRecoveryKey = "anyas_audio_zero_volume_recovered_v1";
  const recoveredLegacySilentVolume = savedVolume !== null
    && Number(savedVolume) === 0
    && localStorage.getItem(volumeRecoveryKey) !== "done";
  if (recoveredLegacySilentVolume) {
    try {
      localStorage.setItem("anyas_adhanVolume", "70");
      localStorage.setItem(volumeRecoveryKey, "done");
    } catch (error) {
      console.warn("تعذر حفظ استعادة مستوى الصوت:", error);
    }
  }

  if (savedAuto !== null && auto) {

    auto.checked =
      savedAuto === "true";

  }

  const parsedInitialVolume = savedVolume === null ? 100 : Number(savedVolume);
  const storedInitialVolume = Number.isFinite(parsedInitialVolume)
    ? Math.max(0, Math.min(100, parsedInitialVolume))
    : 100;
  const initialVolume = recoveredLegacySilentVolume ? 70 : storedInitialVolume;

  if (volume) {

    volume.value =
      initialVolume;

  }

  if (volumeValue) {

    volumeValue.textContent = formatVolumeLabel(initialVolume);

  }

  applyAudioVolume(initialVolume);
  renderMuteState();

  muteToggle?.addEventListener("click", () => {
    window.anyasAudioMuted = !window.anyasAudioMuted;
    localStorage.setItem("anyas_audio_muted", String(window.anyasAudioMuted));
    applyAudioVolume(Number(volume?.value || initialVolume));
    renderMuteState();
  });

  if (auto) {

    auto.addEventListener("change", () => {

      localStorage.setItem(
        "anyas_autoAdhan",
        auto.checked
      );

    });

  }

  if (volume) {

    volume.addEventListener("input", () => {

      const value =
        Number(volume.value);

      if (volumeValue) {

        volumeValue.textContent = formatVolumeLabel(value);

      }

      applyAudioVolume(value);

      localStorage.setItem(
        "anyas_adhanVolume",
        value
      );
      syncAndroidNotificationSettings();

    });

    window.addEventListener("anyas:languagechange", () => {
      if (volumeValue) volumeValue.textContent = formatVolumeLabel(Number(volume.value));
      renderMuteState();
    });

  }

  let audioTestStopTimer = null;
  let audioTestRun = 0;
  const playAudioTest = (button, audio, label, audioId) => {
    if (!button || !audio) return;
    button.addEventListener("click", () => {
      const masterVolume = volume ? Number(volume.value) : initialVolume;
      if (masterVolume <= 0) {
        if (audioTestStatus) audioTestStatus.textContent = "مستوى الصوت الموحد صفر؛ ارفعه أولًا لتسمع الاختبار.";
        return;
      }
      const runId = ++audioTestRun;
      if (audioTestStopTimer) window.clearTimeout(audioTestStopTimer);
      stopOtherAudioPreviews(button);
      stopAllAudioExcept(audio);
      if (audioId === "adhanAudio") {
        syncSelectedMuezzinAudio("adhanAudio", "normalMuezzin", "anyas_normalMuezzin", "normalMuezzinOptions");
      }
      audio.currentTime = 0;
      if (audioTestStatus) audioTestStatus.textContent = `جارٍ اختبار ${label}…`;
      let playPromise;
      try {
        playPromise = audio.play();
      } catch (error) {
        showAudioTestError(label, audio, error);
        return;
      }
      Promise.resolve(playPromise).then(() => {
        if (runId !== audioTestRun) return;
        if (audioTestStatus) audioTestStatus.textContent = `بدأ تشغيل عينة ${label}.`;
        audioTestStopTimer = window.setTimeout(() => {
          audio.pause();
          audio.currentTime = 0;
          if (audioTestStatus) audioTestStatus.textContent = `انتهى اختبار ${label}. إذا لم تسمعها، ارفع صوت الوسائط في الهاتف.`;
        }, 3000);
      }).catch(error => { if (runId === audioTestRun) showAudioTestError(label, audio, error); });
    });
  };

  playAudioTest(testButton, adhan, "الأذان", "adhanAudio");
  playAudioTest(testAdhkarButton, document.getElementById("morningWardAudio"), "أذكار الصباح", "morningWardAudio");

  if (testNotificationButton) {
    testNotificationButton.addEventListener("click", () => {
      audioTestRun++;
      if (audioTestStopTimer) window.clearTimeout(audioTestStopTimer);
      stopOtherAudioPreviews(testNotificationButton);
      stopAllAudioExcept(null);
      const masterVolume = volume ? Number(volume.value) : initialVolume;
      if (masterVolume <= 0) {
        if (audioTestStatus) audioTestStatus.textContent = "مستوى الصوت الموحد صفر؛ ارفعه أولًا.";
        return;
      }
      const morningVoice = localStorage.getItem("anyas_morningWardVoice") === "ahmed" ? "adhkar-morning-ahmed-al-nafis.mp3" : "adhkar-morning-mishary-alafasy.mp3";
      if (window.AnyasAndroid && typeof window.AnyasAndroid.testNotificationAndSound === "function") {
        const result = window.AnyasAndroid.testNotificationAndSound(morningVoice, masterVolume / 100);
        const messages = {
          started: "أُرسل إشعار الاختبار وشُغّل صوت الأذكار لبضع ثوانٍ.",
          permission_required: "لم يصل الإشعار: فعّل إذن الإشعارات من إعدادات الهاتف.",
          channel_disabled: "قناة إشعارات أنياس متوقفة في إعدادات الهاتف.",
          volume_muted: "مستوى الصوت الموحد صفر؛ ارفعه أولًا.",
          invalid_audio: "تعذر اختيار ملف صوت الاختبار. أعد اختيار صوت الأذكار الافتراضي.",
          notification_only: "وصل إشعار الاختبار، لكن تعذر بدء صوت الخلفية.",
          failed: "تعذر إرسال اختبار الإشعار والصوت. تحقق من أذونات التطبيق."
        };
        if (audioTestStatus) audioTestStatus.textContent = messages[result] || messages.failed;
        return;
      }
      if (!("Notification" in window)) {
        if (audioTestStatus) audioTestStatus.textContent = "اختبار إشعار النظام متاح في نسخة Android من التطبيق.";
        return;
      }
      const showBrowserTest = permission => {
        if (permission === "granted") {
          new Notification("اختبار إشعار أنياس", { body: "إذا ظهر هذا التنبيه فإذن الإشعارات يعمل." });
          if (audioTestStatus) audioTestStatus.textContent = "تم إرسال إشعار الاختبار. اختبر صوت الأذان والأذكار من الزرين المجاورين.";
        } else if (audioTestStatus) {
          audioTestStatus.textContent = "لم يُسمح بإشعارات المتصفح؛ فعّل الإذن ثم أعد الاختبار.";
        }
      };
      if (Notification.permission === "granted") showBrowserTest("granted");
      else if (Notification.permission === "denied") showBrowserTest("denied");
      else Notification.requestPermission().then(showBrowserTest).catch(() => showBrowserTest("denied"));
    });
  }

  testReminderButton?.addEventListener("click", async () => {
    audioTestRun++;
    stopOtherAudioPreviews(testReminderButton);
    stopAllAudioExcept(null);
    const audio = document.getElementById("morningWardAudio");
    if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
    const voice = localStorage.getItem("anyas_morningWardVoice") === "ahmed" ? "adhkar-morning-ahmed-al-nafis.mp3" : "adhkar-morning-mishary-alafasy.mp3";
    if (window.AnyasAndroid && typeof window.AnyasAndroid.testNotificationAndSound === "function") {
      const result = window.AnyasAndroid.testNotificationAndSound(voice, (volume ? Number(volume.value) : initialVolume) / 100);
      if (audioTestStatus) audioTestStatus.textContent = result === "started" ? "تم اختبار التذكير كاملًا: الإشعار والصوت." : "تعذر اختبار التذكير؛ تحقق من الأذونات وإعدادات البطارية.";
      return;
    }
    if (!("Notification" in window)) {
      if (audioTestStatus) audioTestStatus.textContent = "تم اختبار الصوت؛ إشعار النظام متاح في نسخة Android.";
      return;
    }
    const showTest = permission => {
      if (permission === "granted") {
        const title = "اختبار تذكير أنياس";
        const body = "إذا ظهر هذا التنبيه وعمل الصوت، فالتذكيرات جاهزة.";
        new Notification(title, { body, tag: "anyas-reminder-test", icon: "assets/anyas-app-icon.png" });
        recordAnyasNotification(title, body, "anyas-reminder-test");
        if (audioTestStatus) audioTestStatus.textContent = "تم اختبار التذكير كاملًا: الإشعار والصوت.";
      } else if (audioTestStatus) audioTestStatus.textContent = "تم اختبار الصوت، لكن إذن الإشعارات غير مفعّل.";
    };
    if (Notification.permission === "granted") showTest("granted");
    else if (Notification.permission === "denied") showTest("denied");
    else Notification.requestPermission().then(showTest).catch(() => showTest("denied"));
  });

  setupAudioLibrary();

  function applyAudioVolume(value) {

    const normalized =
      value / 100;
    const effectiveVolume = window.anyasAudioMuted ? 0 : normalized;

    document.querySelectorAll("audio").forEach(audioElement => {
      audioElement.volume = effectiveVolume;
    });
    [window.anyasMuezzinPreview, window.anyasAyatPreview, window.anyasAdhkarPreview]
      .forEach(preview => { if (preview) preview.volume = effectiveVolume; });

  }

}


function setupBeforeFajrReminder() {
  const toggle = document.getElementById("beforeFajrReminder");
  const button = document.getElementById("beforeFajrPreviewButton");
  const audio = document.getElementById("beforeFajrAudio");
  if (!toggle || !button || !audio) return;

  toggle.checked = localStorage.getItem("anyas_beforeFajrReminder") === "true";
  toggle.addEventListener("change", () => {
    localStorage.setItem("anyas_beforeFajrReminder", String(toggle.checked));
    if (typeof syncAndroidNotificationSettings === "function") syncAndroidNotificationSettings();
  });

  button.addEventListener("click", () => {
    if (audio.paused) {
      audio.currentTime = 0;
      audio.play().then(() => { button.textContent = "إيقاف"; }).catch(error => {
        console.error("تعذر تشغيل تنبيه الفجر:", error);
        button.textContent = "تشغيل";
      });
    } else {
      audio.pause();
      audio.currentTime = 0;
      button.textContent = "تشغيل";
    }
    audio.onended = () => { button.textContent = "تشغيل"; };
  });
}

function checkBeforeFajrReminder() {
  const toggle = document.getElementById("beforeFajrReminder");
  const audio = document.getElementById("beforeFajrAudio");
  const fajrTime = window.todayTimings?.Fajr;
  if (!toggle?.checked || !audio || !fajrTime) return;

  const [hour, minute] = String(fajrTime).split(":").map(Number);
  const fajrMinutes = hour * 60 + minute;
  const targetMinutes = fajrMinutes - 30;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const todayKey = now.toDateString();
  const reminderKey = `${todayKey}-before-fajr-30`;
  const isDue = Number.isFinite(targetMinutes)
    && currentMinutes >= targetMinutes
    && currentMinutes <= targetMinutes + 1;
  if (!isDue || window.lastBeforeFajrReminder === reminderKey) return;

  window.lastBeforeFajrReminder = reminderKey;
  audio.currentTime = 0;
  audio.play().catch(error => console.error("تعذر تشغيل تنبيه الفجر تلقائيًا:", error));
}

function setupAyatKursiVoices() {
  const options = document.getElementById("ayatKursiOptions");
  const audio = document.getElementById("ayatKursiAudio");
  if (!options || !audio) return;

  const radios = options.querySelectorAll('input[name="ayatKursiVoice"]');
  const saved = localStorage.getItem("anyas_ayatKursiVoice") || "mishary";
  const selected = Array.from(radios).find(radio => radio.value === saved) || radios[0];
  if (!selected) return;
  selected.checked = true;

  const applySource = radio => {
    if (!radio?.dataset.audioSource) return;
    audio.src = radio.dataset.audioSource;
    audio.load();
  };
  applySource(selected);

  radios.forEach(radio => radio.addEventListener("change", () => {
    if (!radio.checked) return;
    localStorage.setItem("anyas_ayatKursiVoice", radio.value);
    applySource(radio);
    if (typeof syncAndroidNotificationSettings === "function") syncAndroidNotificationSettings();
  }));

  options.querySelectorAll("[data-ayat-preview]").forEach(button => {
    button.addEventListener("click", () => {
      if (button._ayatPreview) {
        button._ayatPreview.pause();
        button._ayatPreview.currentTime = 0;
        button._ayatPreview = null;
        button.textContent = "تشغيل";
        return;
      }
      stopOtherAudioPreviews(button);
      stopAllAudioExcept(null);
      const preview = new Audio(button.dataset.ayatPreview);
      preview.volume = audio.volume;
      button._ayatPreview = preview;
      window.anyasAyatPreview = preview;
      window.anyasAyatPreviewButton = button;
      button.textContent = "إيقاف";
      preview.play().catch(() => { button.textContent = "تشغيل"; button._ayatPreview = null; });
      preview.onended = () => { button.textContent = "تشغيل"; button._ayatPreview = null; };
    });
  });
}


// =====================================================
// رفع الأصوات المخصصة — حفظ ومعاينة محلية
// =====================================================

const DEFAULT_MUEZZIN_SOURCES = {
  adhanAudio: "audio/adhan.mp3?v=20261002-1",
  fajrAudio: "audio/fajr.mp3"
};

const MAX_MUEZZIN_FILE_SIZE = 15 * 1024 * 1024;

function restoreDefaultMuezzinAudio(audioId) {
  const audio = document.getElementById(audioId);
  const source = DEFAULT_MUEZZIN_SOURCES[audioId];
  if (!audio || !source) return;
  audio.src = source;
  audio.load();
}

function syncSelectedMuezzinAudio(audioId, radioName, storageKey, optionsId) {
  const audio = document.getElementById(audioId);
  const options = document.getElementById(optionsId);
  if (!audio || !options) return;

  const savedChoice = localStorage.getItem(storageKey) || "default";
  const selected = options.querySelector(`input[name="${radioName}"][value="${savedChoice}"]`)
    || options.querySelector(`input[name="${radioName}"][value="default"]`);
  if (!selected) return;

  if (selected.dataset.audioSource) {
    audio.src = selected.dataset.audioSource;
    audio.load();
  } else if (selected.value === "custom") {
    const customSource = localStorage.getItem(`anyas_audio_${audioId}`);
    if (customSource) {
      audio.src = customSource;
      audio.load();
    }
  } else {
    restoreDefaultMuezzinAudio(audioId);
  }
}

function setupAudioLibrary() {
  const audioGroups = Array.from(document.querySelectorAll(".audio-library-group"));
  audioGroups.forEach(group => group.addEventListener("toggle", () => {
    if (!group.open) return;
    audioGroups.forEach(other => { if (other !== group) other.open = false; });
  }));

  document.querySelectorAll("[data-audio-upload]").forEach(input => {
    const audioId = input.dataset.audioUpload;
    const nameId = input.dataset.audioName;
    const customRadioId = input.dataset.muezzinRadio || "";
    const selectedId = audioId === "adhanAudio"
      ? "normalMuezzinSelected"
      : audioId === "fajrAudio"
        ? "fajrMuezzinSelected"
        : "";
    const audio = document.getElementById(audioId);
    const name = document.getElementById(nameId);
    const selected = selectedId ? document.getElementById(selectedId) : null;
    const status = document.getElementById(`${audioId}Status`);
    const deleteButton = document.querySelector(`[data-audio-delete="${audioId}"]`);
    const applyButton = document.querySelector(`[data-audio-apply="${audioId}"]`);
    const customRadio = customRadioId ? document.getElementById(customRadioId) : null;
    if (!audio) return;

    const savedSource = localStorage.getItem(`anyas_audio_${audioId}`);
    const savedName = localStorage.getItem(`anyas_audio_name_${audioId}`);
    if (savedSource) {
      audio.src = savedSource;
      audio.load();
    }
    if (savedName && name) name.textContent = savedName;
    if (savedName && selected) selected.textContent = savedName;
    if (savedName && customRadio) {
      customRadio.checked = true;
      if (input.dataset.muezzinName) localStorage.setItem(`anyas_${input.dataset.muezzinName}`, "custom");
    }
    if (savedName && deleteButton) deleteButton.hidden = false;
    if (savedName && applyButton) applyButton.hidden = true;

    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("audio/")) {
        if (status) status.textContent = "الملف غير صالح — اختر ملفًا صوتيًا فقط";
        input.value = "";
        return;
      }
      if (file.size > MAX_MUEZZIN_FILE_SIZE) {
        if (status) status.textContent = "الملف كبير جدًا — الحد الأقصى 15 ميجابايت";
        input.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const source = String(reader.result || "");
        try {
          localStorage.setItem(`anyas_audio_${audioId}`, source);
          localStorage.setItem(`anyas_audio_name_${audioId}`, file.name);
        } catch (error) {
          console.warn("تعذر حفظ الملف الصوتي محليًا:", error);
        }
        audio.src = source;
        audio.load();
        if (name) name.textContent = file.name;
        if (selected) selected.textContent = file.name;
        if (status) status.textContent = "تم حفظ الصوت — يمكنك تغييره أو حذفه";
        if (deleteButton) deleteButton.hidden = false;
        if (applyButton) applyButton.hidden = false;
      };
      reader.readAsDataURL(file);
    });

    deleteButton?.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      localStorage.removeItem(`anyas_audio_${audioId}`);
      localStorage.removeItem(`anyas_audio_name_${audioId}`);
      restoreDefaultMuezzinAudio(audioId);
      if (name) name.textContent = "لم يتم اختيار ملف";
      if (selected) selected.textContent = audioId === "fajrAudio" ? "مشاري العفاسي" : "مشاري العفاسي";
      if (status) status.textContent = "تم حذف الصوت والعودة إلى مشاري العفاسي";
      if (deleteButton) deleteButton.hidden = true;
      if (applyButton) applyButton.hidden = true;
      if (customRadio) customRadio.checked = false;
      const defaultRadio = document.querySelector(`input[name="${input.dataset.muezzinName}"][value="default"]`);
      if (defaultRadio) {
        defaultRadio.checked = true;
        defaultRadio.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    applyButton?.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      if (!customRadio) return;
      customRadio.checked = true;
      customRadio.dispatchEvent(new Event("change", { bubbles: true }));
      if (applyButton) applyButton.hidden = true;
      if (status) status.textContent = "تم اعتماد الصوت المخصص";
    });
  });

}


// =====================================================
function setupAdhkarAudioControls() {
  document.querySelectorAll("[data-adhkar-preview]").forEach(button => {
    button.addEventListener("click", () => {
      const audio = document.getElementById(button.dataset.adhkarPreview);
      if (!audio) return;
      if (button._adhkarPreview) {
        button._adhkarPreview.pause();
        button._adhkarPreview.currentTime = 0;
        button._adhkarPreview = null;
        button.textContent = "تشغيل";
        return;
      }
      stopOtherAudioPreviews(button);
      stopAllAudioExcept(audio);
      audio.currentTime = 0;
      button._adhkarPreview = audio;
      window.anyasAdhkarPreview = audio;
      window.anyasAdhkarPreviewButton = button;
      button.textContent = "إيقاف";
      audio.play().catch(() => { button.textContent = "تشغيل"; button._adhkarPreview = null; });
      audio.onended = () => { button.textContent = "تشغيل"; button._adhkarPreview = null; };
    });
  });
}

function setupAdhkarVoiceChoices() {
  const choices = [
    { id: "morningWardVoice", storage: "anyas_morningWardVoice", audioId: "morningWardAudio", mishary: "audio/adhkar-morning-mishary-alafasy.mp3?v=20261003-1", ahmed: "audio/adhkar-morning-ahmed-al-nafis.mp3" },
    { id: "eveningWardVoice", storage: "anyas_eveningWardVoice", audioId: "eveningWardAudio", mishary: "audio/adhkar-evening-mishary-alafasy.mp3?v=20261003-1", ahmed: "audio/adhkar-evening-ahmed-al-nafis.mp3" }
  ];
  choices.forEach(choice => {
    const select = document.getElementById(choice.id);
    const audio = document.getElementById(choice.audioId);
    if (!select || !audio) return;
    const saved = localStorage.getItem(choice.storage) === "ahmed" ? "ahmed" : "mishary";
    select.value = saved;
    const apply = value => {
      const source = audio.querySelector("source");
      if (!source) return;
      source.src = value === "ahmed" ? choice.ahmed : choice.mishary;
      audio.load();
    };
    apply(saved);
    select.addEventListener("change", () => {
      const value = select.value === "ahmed" ? "ahmed" : "mishary";
      localStorage.setItem(choice.storage, value);
      apply(value);
      if (typeof syncAndroidNotificationSettings === "function") syncAndroidNotificationSettings();
    });
  });
}

function recordAnyasNotification(title, body, tag) {
  const safeTag = String(tag || `anyas-${Date.now()}`);
  if (window.AnyasAndroid && typeof window.AnyasAndroid.recordNotification === "function") {
    window.AnyasAndroid.recordNotification(safeTag, title, body);
    window.dispatchEvent(new Event("anyas-notification-recorded"));
    return;
  }
  try {
    const storageKey = "anyas_notification_history";
    const now = Date.now();
    const history = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (history.some(item => item?.tag === safeTag && Math.abs(now - Number(item.timestamp)) < 90_000)) return;
    const entry = { id: `${safeTag}-${now}-${Math.random().toString(36).slice(2, 7)}`, tag: safeTag, title: String(title || "أنياس"), body: String(body || ""), timestamp: now, read: false };
    localStorage.setItem(storageKey, JSON.stringify([entry, ...history].slice(0, 100)));
    window.dispatchEvent(new Event("anyas-notification-recorded"));
  } catch (error) {
    console.warn("تعذر حفظ سجل الإشعارات محليًا:", error);
  }
}

const ANYAS_REMINDER_SCHEDULE_CONFIG = Object.freeze({
  notifyAyatKursi: { defaultMode: "beforeMaghrib", defaultTime: "18:00", minTime: "00:00", maxTime: "23:59", suggestedSummary: "قبل المغرب بنصف ساعة" },
  notifyWardAwakening: { defaultMode: "suggested", defaultTime: "04:30", minTime: "03:00", maxTime: "11:59", suggestedSummary: "المقترح · ٤:٣٠ ص" },
  notifyWardMorning: { defaultMode: "suggested", defaultTime: "05:30", minTime: "04:00", maxTime: "11:59", suggestedSummary: "المقترح · ٥:٣٠ ص" },
  notifyWardEvening: { defaultMode: "suggested", defaultTime: "15:30", minTime: "12:00", maxTime: "23:59", suggestedSummary: "المقترح · ٣:٣٠ م" },
  notifyWardSleep: { defaultMode: "suggested", defaultTime: "20:00", minTime: "18:00", maxTime: "23:59", suggestedSummary: "المقترح · ٨:٠٠ م" }
});

function anyasParseClockMinutes(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 ? hours * 60 + minutes : null;
}

function anyasNormalizeClock(value) {
  const minutes = anyasParseClockMinutes(value);
  return minutes === null ? null : `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function anyasIsReminderTimeValid(id, value) {
  const config = ANYAS_REMINDER_SCHEDULE_CONFIG[id];
  const minutes = anyasParseClockMinutes(value);
  const minimum = config && anyasParseClockMinutes(config.minTime);
  const maximum = config && anyasParseClockMinutes(config.maxTime);
  return minutes !== null && minimum !== null && maximum !== null && minutes >= minimum && minutes <= maximum;
}

function anyasReminderScheduleKey(id, part) {
  return `anyas_reminder_schedule_${id}_${part}`;
}

function anyasGetReminderSchedule(id) {
  const config = ANYAS_REMINDER_SCHEDULE_CONFIG[id];
  if (!config) return null;
  const savedMode = localStorage.getItem(anyasReminderScheduleKey(id, "mode"));
  const validModes = id === "notifyAyatKursi" ? ["beforeMaghrib", "custom"] : ["suggested", "custom"];
  const mode = validModes.includes(savedMode) ? savedMode : config.defaultMode;
  const savedTime = localStorage.getItem(anyasReminderScheduleKey(id, "time"));
  const time = anyasIsReminderTimeValid(id, savedTime) ? anyasNormalizeClock(savedTime) : config.defaultTime;
  return { mode, time };
}

function anyasReminderTargetMinute(id, maghribMinute = null) {
  const config = ANYAS_REMINDER_SCHEDULE_CONFIG[id];
  const selection = anyasGetReminderSchedule(id);
  if (!config || !selection) return null;
  if (id === "notifyAyatKursi" && selection.mode === "beforeMaghrib") {
    return maghribMinute === null ? null : (maghribMinute - 30 + 1440) % 1440;
  }
  return anyasParseClockMinutes(selection.mode === "custom" ? selection.time : config.defaultTime);
}

function anyasFormatReminderTime(value) {
  const minutes = anyasParseClockMinutes(value);
  if (minutes === null) return value || "";
  const hours = Math.floor(minutes / 60);
  const format = new Intl.NumberFormat("ar-EG", { useGrouping: false });
  const formatMinute = new Intl.NumberFormat("ar-EG", { useGrouping: false, minimumIntegerDigits: 2 });
  return `${format.format(hours % 12 || 12)}:${formatMinute.format(minutes % 60)} ${hours < 12 ? "ص" : "م"}`;
}

function checkDailyAdhkarNotifications() {
  const schedule = [
    { id: "notifyWardSahar", key: "sahar", title: "أذكار السحر", body: "حان وقت الاستغفار والدعاء.", minute: 120, audioId: "qiyamReminderAudio" },
    { id: "notifyWardAwakening", key: "awakening", title: "أذكار الاستيقاظ", body: "ابدأ يومك بذكر الله.", minute: 270, audioId: "wakeupWardAudio" },
    { id: "notifyWardMorning", key: "morning", title: "أذكار الصباح", body: "حان وقت أذكار الصباح.", minute: 330, audioId: "morningWardAudio" },
    { id: "notifyWardGeneral", key: "general", title: "أذكار اليوم", body: "تذكير بوردك اليومي.", minute: 720, audioId: "" },
    { id: "notifyWardEvening", key: "evening", title: "أذكار المساء", body: "حان وقت أذكار المساء.", minute: 930, audioId: "eveningWardAudio" },
    { id: "notifyWardSleep", key: "sleep", title: "أذكار النوم", body: "اختم يومك بأذكار النوم.", minute: 1200, audioId: "sleepWardAudio" }
  ];
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const dayKey = now.toDateString();
  window.anyasDailyNotificationFired ||= {};

  schedule.forEach(item => {
    const enabled = localStorage.getItem(`anyas_${item.id}`) === "true";
    const targetMinute = ANYAS_REMINDER_SCHEDULE_CONFIG[item.id] ? anyasReminderTargetMinute(item.id) : item.minute;
    if (!enabled || targetMinute === null || currentMinutes < targetMinute || currentMinutes > targetMinute + 1) return;
    const firedKey = `${dayKey}-${item.key}`;
    if (window.anyasDailyNotificationFired[firedKey]) return;
    window.anyasDailyNotificationFired[firedKey] = true;

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(item.title, { body: item.body, tag: `anyas-${item.key}`, icon: "assets/anyas-app-icon.png", badge: "assets/anyas-app-icon.png", dir: "rtl", lang: "ar" });
      recordAnyasNotification(item.title, item.body, `anyas-${item.key}`);
    }
    if (localStorage.getItem("anyas_notificationSound") !== "false" && item.audioId) {
      const audio = document.getElementById(item.audioId);
      if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
    }
  });
}


function checkPrayerReminderNotifications() {
  if (localStorage.getItem("anyas_notifyPrayerSoon") !== "true") return;
  const timings = window.todayTimings;
  if (!timings) return;
  const sounds = {
    Fajr: "beforePrayerFajrAudio",
    Dhuhr: "beforePrayerDhuhrAudio",
    Asr: "beforePrayerAsrAudio",
    Maghrib: "beforePrayerMaghribAudio",
    Isha: "beforePrayerIshaAudio"
  };
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const dayKey = now.toDateString();
  window.anyasPrayerReminderFired ||= {};
  Object.entries(sounds).forEach(([prayer, audioId]) => {
    const match = String(timings[prayer] || "").match(/(\d{1,2}):(\d{2})/);
    if (!match) return;
    const prayerMinutes = Number(match[1]) * 60 + Number(match[2]);
    const target = (prayerMinutes - 15 + 1440) % 1440;
    if (currentMinutes < target || currentMinutes > target + 1) return;
    const key = `${dayKey}-${prayer}`;
    if (window.anyasPrayerReminderFired[key]) return;
    window.anyasPrayerReminderFired[key] = true;
    if ("Notification" in window && Notification.permission === "granted") {
      const names = { Fajr: "الفجر", Dhuhr: "الظهر", Asr: "العصر", Maghrib: "المغرب", Isha: "العشاء" };
      const title = `اقتربت صلاة ${names[prayer]}`;
      const body = "تبقّى ربع ساعة على موعد الصلاة.";
      new Notification(title, { body, tag: `anyas-prayer-${prayer}`, icon: "assets/anyas-app-icon.png", badge: "assets/anyas-app-icon.png", dir: "rtl", lang: "ar" });
      recordAnyasNotification(title, body, `anyas-prayer-${prayer}`);
    }
    if (localStorage.getItem("anyas_notificationSound") !== "false") {
      const audio = document.getElementById(audioId);
      if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
    }
  });
}

function fireOptionalReminder(id, key, title, body, audioId, dayKey = new Date().toDateString()) {
  if (localStorage.getItem(`anyas_${id}`) !== "true") return;
  const firedKey = `anyas_optional_${key}_${dayKey}`;
  if (localStorage.getItem(firedKey) === "true") return;
  localStorage.setItem(firedKey, "true");
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, tag: `anyas-${key}`, icon: "assets/anyas-app-icon.png", badge: "assets/anyas-app-icon.png", dir: "rtl", lang: "ar" });
    recordAnyasNotification(title, body, `anyas-${key}`);
  }
  if (localStorage.getItem("anyas_notificationSound") !== "false" && audioId) {
    const audio = document.getElementById(audioId);
    if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
  }
}

function checkLastThirdNotification() {
  const timings = window.todayTimings;
  if (localStorage.getItem("anyas_notifyLastThird") !== "true" || !timings) return;
  const parseToday = value => {
    const match = String(value || "").match(/(\d{1,2}):(\d{2})/);
    if (!match) return null;
    const date = new Date();
    date.setHours(Number(match[1]), Number(match[2]), 0, 0);
    return date;
  };
  const now = new Date();
  const fajr = parseToday(timings.Fajr);
  const maghrib = parseToday(timings.Maghrib);
  if (!fajr || !maghrib) return;
  let nightStart;
  let nightEnd;
  if (now < fajr) {
    nightStart = new Date(maghrib.getTime() - 24 * 60 * 60 * 1000);
    nightEnd = fajr;
  } else if (now >= maghrib) {
    nightStart = maghrib;
    nightEnd = new Date(fajr.getTime() + 24 * 60 * 60 * 1000);
  } else return;
  const target = new Date(nightStart.getTime() + (nightEnd.getTime() - nightStart.getTime()) * (2 / 3));
  if (now < target || now > new Date(target.getTime() + 2 * 60 * 1000)) return;
  fireOptionalReminder("notifyLastThird", "last-third", "الثلث الأخير من الليل", "حان وقت قيام الليل والدعاء.", "qiyamReminderAudio", nightStart.toDateString());
}

function checkAdditionalReminders() {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const withinMinute = target => currentMinutes >= target && currentMinutes <= target + 1;
  const timings = window.todayTimings || {};
  const timeMinutes = value => {
    const match = String(value || "").match(/(\d{1,2}):(\d{2})/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  };

  if (withinMinute(750)) fireOptionalReminder("notifyHadith", "hadith", "حديث اليوم", "تذكير بحديث اليوم.", "hadithReminderAudio");
  if (withinMinute(600)) fireOptionalReminder("notifySalawat", "salawat-1", "الصلاة على النبي ﷺ", "أكثر من الصلاة والسلام على النبي ﷺ.", "salawatReminderOneAudio");
  if (withinMinute(1020)) fireOptionalReminder("notifySalawat", "salawat-2", "الصلاة على النبي ﷺ", "أكثر من الصلاة والسلام على النبي ﷺ.", "salawatReminderTwoAudio");
  if (withinMinute(840)) fireOptionalReminder("notifyBaqiyat", "baqiyat", "الباقيات الصالحات", "سبحان الله والحمد لله ولا إله إلا الله والله أكبر.", "baqiyatReminderAudio");
  const sunrise = timeMinutes(timings.Sunrise);
  if (sunrise !== null && withinMinute(sunrise)) fireOptionalReminder("notifySunrise", "sunrise", "الشروق", "ابدأ صباحك بذكر الله.", "sunriseReminderAudio");
  const maghrib = timeMinutes(timings.Maghrib);
  const ayatKursiMinute = anyasReminderTargetMinute("notifyAyatKursi", maghrib);
  const ayatKursiMode = anyasGetReminderSchedule("notifyAyatKursi")?.mode;
  const ayatKursiBody = ayatKursiMode === "custom" ? "حان موعد تذكيرك بقراءة آية الكرسي." : "تذكير بقراءة آية الكرسي قبل أذان المغرب بنصف ساعة.";
  if (ayatKursiMinute !== null && withinMinute(ayatKursiMinute)) fireOptionalReminder("notifyAyatKursi", "ayat-kursi", "آية الكرسي", ayatKursiBody, "ayatKursiAudio");
  if (sunrise !== null && withinMinute((sunrise + 30) % 1440)) fireOptionalReminder("notifyDuha", "duha", "صلاة الضحى", "حان وقت صلاة الضحى.", "duhaReminderAudio");

  const weekday = now.getDay();
  if (weekday === 3 && withinMinute(1200)) {
    fireOptionalReminder("notifyFastingThursday1", "fasting-thursday-1", "صيام الخميس", "تذكير بصيام يوم الخميس.", "fastingThursdayOneAudio");
    fireOptionalReminder("notifyFastingThursday2", "fasting-thursday-2", "صيام الخميس", "تذكير بصيام يوم الخميس.", "fastingThursdayTwoAudio");
  }
  if (weekday === 0 && withinMinute(1200)) fireOptionalReminder("notifyFastingMonday", "fasting-monday", "صيام الاثنين", "تذكير بصيام يوم الاثنين.", "fastingMondayAudio");
  if (weekday === 6 && withinMinute(1200)) fireOptionalReminder("notifyFastingFisabilillah", "fasting-fisabilillah", "صيام في سبيل الله", "تذكير بالصيام في سبيل الله.", "fastingFisabilillahAudio");

  if (localStorage.getItem("anyas_notifyRainSunnah") !== "true" || !window.currentLatitude || !window.currentLongitude) return;
  if (window.anyasRainCheckAt && Date.now() < window.anyasRainCheckAt) return;
  window.anyasRainCheckAt = Date.now() + 30 * 60 * 1000;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(window.currentLatitude)}&longitude=${encodeURIComponent(window.currentLongitude)}&current=rain,precipitation&timezone=auto`;
  (window.anyasFetch ? window.anyasFetch(url, {}, { timeoutMs: 8000, retries: 1 }) : fetch(url)).then(response => response.ok ? response.json() : null).then(data => {
    const current = data?.current;
    if (!current || !(Number(current.rain) > 0 || Number(current.precipitation) > 0)) return;
    fireOptionalReminder("notifyRainSunnah", "rain-sunnah", "سنة نزول المطر", "اللهم صيبًا نافعًا.", "rainSunnahAudio", `${now.toDateString()}-${now.getHours()}`);
  }).catch(() => {});
}


// اختيار المؤذن
// =====================================================

function setupMuezzinSettings() {

  setupMuezzinPicker(
    "normalMuezzinRow",
    "normalMuezzinOptions",
    "normalMuezzinSelected",
    "normalMuezzin",
    "anyas_normalMuezzin"
  );

  setupMuezzinPicker(
    "fajrMuezzinRow",
    "fajrMuezzinOptions",
    "fajrMuezzinSelected",
    "fajrMuezzin",
    "anyas_fajrMuezzin"
  );

}


function setupMuezzinPicker(
  rowId,
  optionsId,
  selectedId,
  radioName,
  storageKey
) {

  const row =
    document.getElementById(rowId);

  const options =
    document.getElementById(optionsId);

  const selected =
    document.getElementById(selectedId);

  if (!row || !options) return;

  const saved =
    localStorage.getItem(storageKey);

  const radios =
    options.querySelectorAll(
      `input[name="${radioName}"]`
    );

  const hasSavedChoice = Array.from(radios).some(radio => radio.value === saved);
  if (saved && hasSavedChoice) {
    radios.forEach(radio => {
      radio.checked = radio.value === saved;
    });
  } else {
    const defaultRadio = options.querySelector(`input[name="${radioName}"][value="default"]`);
    if (defaultRadio) defaultRadio.checked = true;
  }

  updateSelectedName();

  const togglePicker = () => {
    const isOpen = options.classList.toggle("open");
    row.classList.toggle("open", isOpen);
    row.setAttribute("aria-expanded", String(isOpen));
  };

  row.addEventListener("click", event => {

    if (
      event.target.closest(".preview-button")
    ) {
      return;
    }

    togglePicker();

  });

  row.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    togglePicker();
  });

  radios.forEach(radio => {

    radio.addEventListener("change", () => {

      if (!radio.checked) return;

      localStorage.setItem(
        storageKey,
        radio.value
      );

      const audioId = radio.dataset.audioId;
      if (audioId && radio.dataset.audioSource) {
        const audio = document.getElementById(audioId);
        if (audio) {
          audio.src = radio.dataset.audioSource;
          audio.load();
        }
      } else if (audioId && radio.value === "default") {
        restoreDefaultMuezzinAudio(audioId);
      } else if (audioId && radio.value === "custom") {
        const savedSource = localStorage.getItem(`anyas_audio_${audioId}`);
        const audio = document.getElementById(audioId);
        if (savedSource && audio) {
          audio.src = savedSource;
          audio.load();
          document.querySelector(`[data-audio-apply="${audioId}"]`)?.setAttribute("hidden", "hidden");
        } else {
          const status = document.getElementById(`${audioId}Status`);
          const defaultRadio = options.querySelector(`input[name="${radioName}"][value="default"]`);
          if (status) status.textContent = "ارفع صوتًا مخصصًا أولًا لاستخدام هذا الخيار";
          if (defaultRadio) {
            defaultRadio.checked = true;
            localStorage.setItem(storageKey, "default");
            restoreDefaultMuezzinAudio(audioId);
          }
        }
      }

      updateSelectedName();

    });

  });

  const initialChecked = options.querySelector(`input[name="${radioName}"]:checked`);
  initialChecked?.dispatchEvent(new Event("change", { bubbles: true }));

  const previewButtons =
    options.querySelectorAll(
      ".preview-button"
    );

  previewButtons.forEach(button => {

    button.addEventListener("click", event => {

      event.stopPropagation();

      const audioId =
        button.dataset.audio;

      const audio =
        document.getElementById(button.dataset.audio);

      if (!audio) return;

      if (button._previewAudio) {
        const previousPreview = button._previewAudio;
        previousPreview.pause();
        previousPreview.currentTime = 0;
        button._previewAudio = null;
        if (window.anyasMuezzinPreview === previousPreview) window.anyasMuezzinPreview = null;
        button.textContent = "تشغيل";
        return;
      }

      stopOtherAudioPreviews(button);

      const cardRadio = button.closest(".muezzin-card")?.querySelector('input[type="radio"]');
      const source = cardRadio?.dataset.audioSource
        || (cardRadio?.value === "default" ? DEFAULT_MUEZZIN_SOURCES[button.dataset.audio] : "")
        || (cardRadio?.value === "custom" ? localStorage.getItem(`anyas_audio_${button.dataset.audio}`) : "")
        || audio.currentSrc
        || audio.src;
      if (!source) return;

      stopAllAudioExcept(audio);
      const previewAudio = new Audio(source);
      previewAudio.volume = audio.volume;
      button._previewAudio = previewAudio;
      window.anyasMuezzinPreview = previewAudio;
      window.anyasMuezzinPreviewButton = button;
      button.textContent = "إيقاف";

      previewAudio.play().catch(error => {
        console.error("تعذر تشغيل معاينة الأذان:", error);
        button.textContent = "تشغيل";
        button._previewAudio = null;
        if (window.anyasMuezzinPreview === previewAudio) window.anyasMuezzinPreview = null;
      });

      previewAudio.onended = () => {
        button.textContent = "تشغيل";
        button._previewAudio = null;
        if (window.anyasMuezzinPreview === previewAudio) window.anyasMuezzinPreview = null;
      };

    });

  });


  function updateSelectedName() {

    const checked =
      options.querySelector(
        `input[name="${radioName}"]:checked`
      );

    if (!checked || !selected) return;

    const label =
      checked.closest(".muezzin-select");

    const name = label?.querySelector(".muezzin-name");
    const customAudioId = checked.dataset.audioId;
    const savedCustomName = customAudioId
      ? localStorage.getItem(`anyas_audio_name_${customAudioId}`)
      : "";

    if (savedCustomName && checked.value === "custom") {
      selected.textContent = savedCustomName;
    } else if (name) {
      selected.textContent = name.textContent;
    }

  }

}


// =====================================================
// إيقاف الأصوات الأخرى
// =====================================================

function stopAllAudioExcept(currentAudio) {

  document
    .querySelectorAll("audio")
    .forEach(audio => {

      if (audio !== currentAudio) {

        audio.pause();
        audio.currentTime = 0;

      }

    });

}


function stopOtherAudioPreviews(activeButton) {
  const previews = [
    ["anyasMuezzinPreview", "anyasMuezzinPreviewButton", "_previewAudio"],
    ["anyasAyatPreview", "anyasAyatPreviewButton", "_ayatPreview"],
    ["anyasAdhkarPreview", "anyasAdhkarPreviewButton", "_adhkarPreview"]
  ];
  previews.forEach(([audioKey, buttonKey, buttonAudioKey]) => {
    const button = window[buttonKey];
    const audio = window[audioKey];
    if (!audio || button === activeButton) return;
    audio.pause();
    try { audio.currentTime = 0; } catch (error) { }
    if (button) { button.textContent = "تشغيل"; button[buttonAudioKey] = null; }
    window[audioKey] = null;
    window[buttonKey] = null;
  });
}


// =====================================================
// الأذان التلقائي
// =====================================================

function checkAutoAdhan() {

  const auto =
    document.getElementById("autoAdhan");

  if (!auto || !auto.checked) return;

  if (!window.todayTimings) return;

  const prayers = [

    {
      key: "Fajr",
      time: window.todayTimings.Fajr
    },

    {
      key: "Dhuhr",
      time: window.todayTimings.Dhuhr
    },

    {
      key: "Asr",
      time: window.todayTimings.Asr
    },

    {
      key: "Maghrib",
      time: window.todayTimings.Maghrib
    },

    {
      key: "Isha",
      time: window.todayTimings.Isha
    }

  ];

  const now =
    new Date();

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const todayKey =
    now.toDateString();

  for (const prayer of prayers) {

    const [hour, minute] = String(prayer.time || "").split(":").map(Number);
    const prayerMinutes = hour * 60 + minute;
    const isDue = Number.isFinite(prayerMinutes)
      && currentMinutes >= prayerMinutes
      && currentMinutes <= prayerMinutes + 1;

    if (isDue && window.lastAdhanFired !== `${todayKey}-${prayer.key}`) {

      window.lastAdhanFired =
        `${todayKey}-${prayer.key}`;

      playAdhanFor(prayer.key);

      break;

    }

  }

}


function playAdhanFor(prayerKey) {

  const fajr =
    document.getElementById("fajrAudio");

  const adhan =
    document.getElementById("adhanAudio");

  const audio =
    prayerKey === "Fajr" && fajr
      ? fajr
      : adhan;

  if (!audio) return;

  if (prayerKey === "Fajr") {
    syncSelectedMuezzinAudio("fajrAudio", "fajrMuezzin", "anyas_fajrMuezzin", "fajrMuezzinOptions");
  } else {
    syncSelectedMuezzinAudio("adhanAudio", "normalMuezzin", "anyas_normalMuezzin", "normalMuezzinOptions");
  }

  stopAllAudioExcept(audio);

  audio.currentTime = 0;

  audio.play()
    .catch(error => {

      console.error(
        "تعذر تشغيل الأذان التلقائي:",
        error
      );

    });

}


// =====================================================
// الوضع الليلي واللغة
// =====================================================

function setupThemeAndLanguage() {

  const root = document.documentElement;
  const themeChoices = document.querySelectorAll('input[name="themeMode"]');
  const themeDescription = document.getElementById("themeModeDescription");
  const themeColorMeta = document.getElementById("themeColorMeta");
  const timeBackgroundToggle = document.getElementById("timeBackgroundToggle");
  const timeBackgroundDescription = document.getElementById("timeBackgroundDescription");

  const languageControls =
    document.querySelectorAll("#languageSelect");

  let initialMode = "light";
  try {
    const savedMode = localStorage.getItem("anyas_themeMode");
    const legacyMode = localStorage.getItem("anyas_darkMode");
    initialMode = ["system", "light", "dark"].includes(savedMode)
      ? savedMode
      : legacyMode === "false"
        ? "light"
        : legacyMode === "true"
          ? "dark"
          : "light";
  } catch (error) {
    initialMode = "light";
  }

  function applyTheme(mode, persist = true) {
    const safeMode = ["system", "light", "dark"].includes(mode) ? mode : "dark";
    const systemDark = Boolean(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const isDark = safeMode === "dark" || (safeMode === "system" && systemDark);

    root.dataset.themeMode = safeMode;
    root.dataset.theme = isDark ? "dark" : "light";
    root.style.colorScheme = isDark ? "dark" : "light";
    document.body.classList.toggle("dark-mode", isDark);

    const themeToggleIcon = document.getElementById("themeToggleIcon");
    if (themeToggleIcon) themeToggleIcon.textContent = isDark ? "☀" : "☾";

    if (themeColorMeta) {
      themeColorMeta.setAttribute("content", isDark ? "#111216" : "#fbfaf7");
    }

    themeChoices.forEach(choice => {
      choice.checked = choice.value === safeMode;
    });

    if (themeDescription) {
      themeDescription.textContent = safeMode === "system"
        ? "يتبع إعداد المظهر في جهازك"
        : safeMode === "light"
          ? "المظهر الفاتح مفعّل"
          : "المظهر الداكن مفعّل";
    }

    if (persist) {
      try {
        localStorage.setItem("anyas_themeMode", safeMode);
        localStorage.removeItem("anyas_darkMode");
      } catch (error) {
        console.warn("تعذر حفظ اختيار المظهر:", error);
      }
    }
  }

  applyTheme(initialMode, false);

  themeChoices.forEach(choice => {
    choice.addEventListener("change", () => {
      if (choice.checked) applyTheme(choice.value);
    });
  });

  if (window.matchMedia) {
    const systemPreference = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = () => {
      if (root.dataset.themeMode === "system") applyTheme("system", false);
    };
    if (systemPreference.addEventListener) {
      systemPreference.addEventListener("change", updateSystemTheme);
    } else if (systemPreference.addListener) {
      systemPreference.addListener(updateSystemTheme);
    }
  }

  let timeBackgroundEnabled = true;
  try {
    const savedTimeBackground = localStorage.getItem("anyas_autoBackground");
    if (savedTimeBackground === "false") timeBackgroundEnabled = false;
  } catch (error) { /* time-based backgrounds default to on */ }

  const updateTimeBackground = () => {
    const hour = new Date().getHours();
    const scene = hour >= 6 && hour < 18 ? "morning" : "night";
    root.dataset.timeScene = scene;
    root.dataset.autoBackground = timeBackgroundEnabled ? "true" : "false";
    const sceneNames = { morning: "الصباح", night: "الليل" };
    if (timeBackgroundDescription) {
      timeBackgroundDescription.textContent = timeBackgroundEnabled
        ? `الخلفية ${sceneNames[scene]} مفعّلة — تتبدّل تلقائيًا حسب ساعة جهازك`
        : "خلفيات العدادات متوقفة";
    }
    if (timeBackgroundToggle) timeBackgroundToggle.checked = timeBackgroundEnabled;
  };

  timeBackgroundToggle?.addEventListener("change", () => {
    timeBackgroundEnabled = timeBackgroundToggle.checked;
    try { localStorage.setItem("anyas_autoBackground", String(timeBackgroundEnabled)); } catch (error) { /* preference is optional */ }
    updateTimeBackground();
  });
  updateTimeBackground();
  window.setInterval(updateTimeBackground, 60 * 1000);

  let savedLanguage = "ar";
  try {
    savedLanguage = localStorage.getItem("anyas_language") === "en" ? "en" : "ar";
  } catch (error) { /* use Arabic if storage is unavailable */ }
  languageControls.forEach(control => {
    control.value = savedLanguage;
    control.addEventListener("change", () => {
      const nextLanguage = control.value === "en" ? "en" : "ar";
      if (typeof window.setAppLanguage === "function") {
        window.setAppLanguage(nextLanguage);
      }
      languageControls.forEach(peer => { peer.value = nextLanguage; });
    });
  });

}


// =====================================================
// الإشعارات
// =====================================================

function setupNotifications() {

  const ids = [

    "notifyPrayerSoon",
    "notifySunrise",
    "notifyLastThird",
    "notifyAyatKursi",
    "notificationSound",
    "notifyHadith",
    "notifyDuha",
    "notifySalawat",
    "notifyBaqiyat",
    "notifyFastingThursday1",
    "notifyFastingThursday2",
    "notifyFastingMonday",
    "notifyFastingFisabilillah",
    "notifyRainSunnah",
    "beforeFajrReminder",
    "notifyWardAwakening",
    "notifyWardMorning",
    "notifyWardGeneral",
    "notifyWardEvening",
    "notifyWardSleep",
    "notifyWardSahar",
    "notifyFridayKahf",
    "notifyFridayPrayer",
    "notifyFridayHour",
    "notifyFridaySalawat"

  ];

  ids.forEach(id => {

    const element =
      document.getElementById(id);

    if (!element) return;

    const key =
      `anyas_${id}`;

    const saved =
      localStorage.getItem(key);

    if (saved !== null) {

      element.checked =
        saved === "true";

    }

    element.addEventListener(
      "change",
      async () => {

        localStorage.setItem(
          key,
          element.checked
        );
        syncAndroidNotificationSettings();

        if (
          element.checked &&
          !window.AnyasAndroid &&
          "Notification" in window
        ) {

          try {

            await Notification.requestPermission();

          } catch (error) {

            console.error(
              "تعذر طلب إذن الإشعارات:",
              error
            );

          }

        }

      }
    );

  });
  setupReminderScheduleSettings();
  setupNotificationGroupStatus();
  setupNotificationReadiness();
  syncAndroidNotificationSettings();
}

function setupNotificationReadiness() {
  const status = document.getElementById("notificationReadinessStatus");
  const openBatteryButton = document.getElementById("openBatterySettingsButton");
  if (!status) return;

  const text = message => window.anyasTranslate ? window.anyasTranslate(message) : message;
  const refresh = () => {
    openBatteryButton?.toggleAttribute("hidden", true);
    if (window.AnyasAndroid && typeof window.AnyasAndroid.getBatteryOptimizationStatus === "function") {
      const notificationReady = typeof window.AnyasAndroid.hasAboutPermission !== "function" || window.AnyasAndroid.hasAboutPermission("notifications");
      const batteryStatus = window.AnyasAndroid.getBatteryOptimizationStatus();
      if (!notificationReady) {
        status.textContent = text("فعّل إذن الإشعارات أولًا من إعدادات الهاتف.");
      } else if (batteryStatus === "optimized") {
        status.textContent = text("قد يؤخر توفير البطارية التذكيرات؛ اسمح لأنياس بالعمل دون تقييد.");
        openBatteryButton?.toggleAttribute("hidden", false);
      } else if (batteryStatus === "unrestricted") {
        status.textContent = text("الإشعارات مفعّلة وأنياس غير مقيّد من إعدادات البطارية.");
      } else {
        status.textContent = text("الإشعارات مفعّلة؛ اختبرها من زر الإشعار أدناه.");
      }
      return;
    }

    if (!("Notification" in window)) {
      status.textContent = text("اختبار الإشعارات متاح في نسخة Android من أنياس.");
    } else if (Notification.permission === "granted") {
      status.textContent = text("إذن إشعارات المتصفح مفعّل؛ اختبر التنبيه من زر الإشعار أدناه.");
    } else {
      status.textContent = text("فعّل إذن الإشعارات ثم اختبر التنبيه من الزر أدناه.");
    }
  };

  openBatteryButton?.addEventListener("click", () => {
    if (typeof window.AnyasAndroid?.openBatteryOptimizationSettings === "function") {
      window.AnyasAndroid.openBatteryOptimizationSettings();
    }
  });
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
  refresh();
}

function setupNotificationGroupStatus() {
  const groups = document.querySelectorAll("[data-notification-settings-group]");
  const formatNumber = new Intl.NumberFormat("ar-EG", { useGrouping: false });

  groups.forEach(group => {
    const status = group.querySelector("[data-notification-group-status]");
    const toggles = [...group.querySelectorAll(".notification-settings-group-content input[type='checkbox']")];
    if (!status || !toggles.length) return;

    const refreshStatus = () => {
      const enabledCount = toggles.filter(toggle => toggle.checked).length;
      const enabledText = formatNumber.format(enabledCount);
      const totalText = formatNumber.format(toggles.length);
      status.textContent = `${enabledText} / ${totalText}`;
      status.setAttribute("aria-label", `${enabledText} من ${totalText} تذكيرات مفعّلة`);
      group.classList.toggle("has-enabled-reminders", enabledCount > 0);
    };

    toggles.forEach(toggle => toggle.addEventListener("change", refreshStatus));
    refreshStatus();
  });
}

function setupReminderScheduleSettings() {
  Object.entries(ANYAS_REMINDER_SCHEDULE_CONFIG).forEach(([id, config]) => {
    const toggle = document.getElementById(id);
    const panel = document.querySelector(`[data-reminder-schedule-panel="${id}"]`);
    const modeControl = document.querySelector(`[data-reminder-schedule-mode="${id}"]`);
    const timeControl = document.querySelector(`[data-reminder-schedule-time="${id}"]`);
    const timeLabel = document.querySelector(`[data-reminder-custom-label="${id}"]`);
    const summary = document.querySelector(`[data-reminder-schedule-summary="${id}"]`);
    if (!panel || !modeControl || !timeControl) return;

    const saved = anyasGetReminderSchedule(id);
    modeControl.value = saved.mode;
    timeControl.value = saved.time;

    const updatePanel = () => {
      const custom = modeControl.value === "custom";
      panel.hidden = toggle?.checked !== true;
      timeControl.hidden = !custom;
      timeControl.disabled = !custom || toggle?.checked !== true;
      if (timeLabel) timeLabel.hidden = !custom;
      if (summary) summary.textContent = custom
        ? `وقت مخصص · ${anyasFormatReminderTime(timeControl.value)}`
        : config.suggestedSummary;
    };

    modeControl.addEventListener("change", () => {
      const validModes = id === "notifyAyatKursi" ? ["beforeMaghrib", "custom"] : ["suggested", "custom"];
      if (!validModes.includes(modeControl.value)) modeControl.value = config.defaultMode;
      localStorage.setItem(anyasReminderScheduleKey(id, "mode"), modeControl.value);
      updatePanel();
      syncAndroidNotificationSettings();
    });

    timeControl.addEventListener("change", () => {
      if (!anyasIsReminderTimeValid(id, timeControl.value)) {
        timeControl.value = anyasGetReminderSchedule(id).time;
        return;
      }
      localStorage.setItem(anyasReminderScheduleKey(id, "time"), anyasNormalizeClock(timeControl.value));
      updatePanel();
      syncAndroidNotificationSettings();
    });

    toggle?.addEventListener("change", updatePanel);
    updatePanel();
  });
}

function syncAndroidNotificationSettings() {
  if (!window.AnyasAndroid || !window.AnyasAndroid.syncSettings) return;
  const ids = ["notifyPrayerSoon", "notifySunrise", "notifyLastThird", "notifyAyatKursi", "notifyHadith", "notifyDuha", "notifyBaqiyat", "notifyFastingThursday1", "notifyFastingThursday2", "notifyFastingMonday", "notifyFastingFisabilillah", "notifyRainSunnah", "beforeFajrReminder", "notifyWardAwakening", "notifyWardMorning", "notifyWardGeneral", "notifyWardEvening", "notifyWardSleep", "notifyWardSahar", "notifyFridayKahf", "notifyFridayPrayer", "notifyFridayHour", "notifyFridaySalawat"];
  const enabled = {};
  ids.forEach(id => {
    const element = document.getElementById(id);
    enabled[id] = element ? element.checked : localStorage.getItem(`anyas_${id}`) === "true";
  });
  const salawatEnabled = document.getElementById("notifySalawat")?.checked === true || localStorage.getItem("anyas_notifySalawat") === "true";
  enabled.notifySalawat_1 = salawatEnabled;
  enabled.notifySalawat_2 = salawatEnabled;
  const prayers = {};
  ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"].forEach(key => {
    const raw = window.todayTimings && window.todayTimings[key];
    const match = raw && String(raw).match(/(\d{1,2}:\d{2})/);
    if (match) prayers[key] = match[1].padStart(5, "0");
  });
  const storedVolume = localStorage.getItem("anyas_adhanVolume");
  const parsedVolume = storedVolume === null ? 100 : Number(storedVolume);
  const masterVolume = Number.isFinite(parsedVolume) ? Math.max(0, Math.min(100, parsedVolume)) : 100;
  const schedules = {};
  Object.entries(ANYAS_REMINDER_SCHEDULE_CONFIG).forEach(([id]) => {
    const modeControl = document.querySelector(`[data-reminder-schedule-mode="${id}"]`);
    const timeControl = document.querySelector(`[data-reminder-schedule-time="${id}"]`);
    const saved = anyasGetReminderSchedule(id);
    const mode = modeControl?.value || saved.mode;
    const time = timeControl && anyasIsReminderTimeValid(id, timeControl.value) ? anyasNormalizeClock(timeControl.value) : saved.time;
    schedules[id] = { mode, time };
  });
  window.AnyasAndroid.syncSettings(JSON.stringify({
    enabled,
    prayers,
    schedules,
    latitude: Number(window.currentLatitude),
    longitude: Number(window.currentLongitude),
    morningVoice: localStorage.getItem("anyas_morningWardVoice") || "mishary",
    eveningVoice: localStorage.getItem("anyas_eveningWardVoice") || "mishary",
    ayatVoice: localStorage.getItem("anyas_ayatKursiVoice") || "mishary",
    sound: document.getElementById("notificationSound")?.checked === true,
    volume: masterVolume
  }));
}


// =====================================================
// الاهتزاز
// =====================================================

function setupVibration() {

  const toggle =
    document.getElementById(
      "vibrationToggle"
    );

  if (!toggle) return;

  const saved =
    localStorage.getItem(
      "anyas_vibration"
    );

  if (saved !== null) {

    toggle.checked =
      saved === "true";

  }

  toggle.addEventListener(
    "change",
    () => {

      localStorage.setItem(
        "anyas_vibration",
        toggle.checked
      );

      if (
        toggle.checked &&
        navigator.vibrate
      ) {

        navigator.vibrate(40);

      }

    }
  );

}


// =====================================================
// العبادات والمواسم
// =====================================================

function setupWorshipSettings() {

  const ids = [

    "reminderMondayThursday",
    "reminderWhiteDays",
    "reminderAshura",
    "reminderArafah",
    "reminderDhulHijjah",
    "reminderEidTakbeer"

  ];

  ids.forEach(id => {

    const element =
      document.getElementById(id);

    if (!element) return;

    const key =
      `anyas_${id}`;

    const saved =
      localStorage.getItem(key);

    if (saved !== null) {

      element.checked =
        saved === "true";

    }

    element.addEventListener(
      "change",
      async () => {

        localStorage.setItem(
          key,
          element.checked
        );

        if (
          element.checked &&
          "Notification" in window
        ) {

          try {

            if (
              Notification.permission ===
              "default"
            ) {

              await Notification.requestPermission();

            }

          } catch (error) {

            console.error(
              "تعذر طلب إذن الإشعارات:",
              error
            );

          }

        }

      }
    );

  });

  updateHijriDate();

  updateWorshipCountdowns();

}


// =====================================================
// التاريخ الهجري
// =====================================================

const hijriFormatterCache = new Map();

function getHijriParts(date = new Date()) {

  const months = [
    "",
    "المحرّم",
    "صفر",
    "ربيع الأول",
    "ربيع الآخر",
    "جمادى الأولى",
    "جمادى الآخرة",
    "رجب",
    "شعبان",
    "رمضان",
    "شوّال",
    "ذو القعدة",
    "ذو الحجة"
  ];

  const locales = [
    "ar-SA-u-ca-islamic-umalqura-nu-latn",
    "en-u-ca-islamic-umalqura-nu-latn",
    "en-u-ca-islamic-civil-nu-latn",
    "en-u-ca-islamic-nu-latn"
  ];

  const parseLocalizedNumber = value => {
    const normalized = String(value)
      .replace(/[٠-٩]/g, digit => String.fromCharCode(digit.charCodeAt(0) - 0x0660 + 48))
      .replace(/[۰-۹]/g, digit => String.fromCharCode(digit.charCodeAt(0) - 0x06f0 + 48));
    const number = Number(normalized);
    return Number.isFinite(number) ? number : null;
  };

  for (const locale of locales) {
    try {
      let formatter = hijriFormatterCache.get(locale);
      if (!formatter) {
        formatter = new Intl.DateTimeFormat(locale, {
          day: "numeric",
          month: "numeric",
          year: "numeric",
          numberingSystem: "latn"
        });
        hijriFormatterCache.set(locale, formatter);
      }

      // Some browsers silently fall back to Gregorian when a calendar is unsupported.
      if (!formatter.resolvedOptions().calendar.startsWith("islamic")) {
        continue;
      }

      const result = {};

      formatter.formatToParts(date).forEach(part => {
        if (["day", "month", "year"].includes(part.type)) {
          result[part.type] = parseLocalizedNumber(part.value);
        }
      });

      if (
        Number.isInteger(result.day) && result.day >= 1 && result.day <= 30 &&
        Number.isInteger(result.month) && result.month >= 1 && result.month <= 12 &&
        Number.isInteger(result.year) && result.year > 1000
      ) {
        return {
          day: result.day,
          month: result.month,
          monthName: months[result.month],
          year: result.year
        };
      }
    } catch (error) {
      // Try the next supported Islamic calendar/locale.
    }
  }

  console.error("تعذر حساب التاريخ الهجري: لا يتوفر تقويم إسلامي مدعوم في هذا المتصفح.");
  return null;
}


function getDisplayedHijriParts(date = new Date()) {
  const adjustment = Number.parseInt(
    localStorage.getItem("anyas_hijri_adjustment") || "0",
    10
  );
  const adjustedDate = new Date(date);
  if (Number.isInteger(adjustment)) adjustedDate.setDate(adjustedDate.getDate() + adjustment);
  return getHijriParts(adjustedDate);
}


function updateHijriDate() {

  const element =
    document.getElementById(
      "hijriDate"
    );

  if (!element) return;

  const hijri =
    getDisplayedHijriParts();

  if (!hijri) {

    element.textContent =
      "تعذر حساب التاريخ الهجري";

    return;

  }

  const months = [

    "",
    "المحرّم",
    "صفر",
    "ربيع الأول",
    "ربيع الآخر",
    "جمادى الأولى",
    "جمادى الآخرة",
    "رجب",
    "شعبان",
    "رمضان",
    "شوّال",
    "ذو القعدة",
    "ذو الحجة"

  ];

  element.textContent =
    `${hijri.day} ` +
    `${months[hijri.month] || ""} ` +
    `${hijri.year} هـ`;

}


// =====================================================
// حساب الأيام حتى تاريخ هجري
// =====================================================

function daysUntilHijri(
  targetMonth,
  targetDay
) {

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  for (
    let i = 0;
    i <= 400;
    i++
  ) {

    const date =
      new Date(today);

    date.setDate(
      today.getDate() + i
    );

    const hijri =
      getHijriParts(date);

    if (!hijri) continue;

    if (
      hijri.month === targetMonth &&
      hijri.day === targetDay
    ) {

      return i;

    }

  }

  return null;

}


// =====================================================
// عرض العد التنازلي
// =====================================================

function setWorshipCountdown(
  elementId,
  days
) {

  const element =
    document.getElementById(
      elementId
    );

  if (!element) return;

  if (days === null) {

    element.textContent =
      "غير متاح";

    return;

  }

  if (days === 0) {

    element.textContent =
      "اليوم";

    return;

  }

  element.textContent =
    `باقي ${days} يوم`;

}


// =====================================================
// تحديث عدادات المواسم
// =====================================================

function updateWorshipCountdowns() {

  // رمضان
  setWorshipCountdown(
    "ramadanCountdown",
    daysUntilHijri(9, 1)
  );

  // عيد الفطر
  setWorshipCountdown(
    "fitrCountdown",
    daysUntilHijri(10, 1)
  );

  // بداية الحج
  setWorshipCountdown(
    "hajjCountdown",
    daysUntilHijri(12, 8)
  );

  // عيد الأضحى
  setWorshipCountdown(
    "adhaCountdown",
    daysUntilHijri(12, 10)
  );

        }


function showAudioTestError(label, audio, error) {
  const mediaError = audio && audio.error;
  const detail = mediaError ? `رمز الوسائط ${mediaError.code}` : (error && error.name ? error.name : "خطأ غير معروف");
  console.error(`تعذر تشغيل اختبار ${label}:`, error || mediaError);
  const status = document.getElementById("audioTestStatus");
  if (status) status.textContent = `تعذر تشغيل ${label} (${detail}). تحقق من ملف الصوت ومستوى صوت الوسائط.`;
}
