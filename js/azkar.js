// =====================================================
// مَآبُ الأوَّاب
// الأذكار والأبواب
// =====================================================

function setupAzkarTopics() {

  const topics = window.azkarTopics || [];

  const countElement =
    document.getElementById("azkarTopicsCount");

  const grid =
    document.getElementById("categoryGrid");

  if (!grid) return;

  if (countElement) {
    countElement.textContent =
      `${topics.length} بابًا`;
  }

  grid.innerHTML = "";


  topics.forEach(topic => {

    const card =
      document.createElement("button");

    card.type = "button";
    card.className = "category-card";

    card.innerHTML = `
      <span class="category-card-title">
        ${topic.number}. ${topic.title || "باب الأذكار"}
      </span>

      <span class="category-card-count">
        ${topic.items ? topic.items.length : 0} أذكار
      </span>
    `;

    card.addEventListener("click", () => {
      openAzkarTopic(topic.number);
    });

    grid.appendChild(card);

  });

  window.azkarFavorites?.render();
  setupAzkarSearch(topics, grid, countElement);

}


function normalizeAzkarSearchText(value) {

  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

}


function setupAzkarSearch(topics, grid, countElement) {

  const input = document.getElementById("azkarSearchInput");
  const clearButton = document.getElementById("azkarSearchClear");
  const results = document.getElementById("azkarSearchResults");
  const status = document.getElementById("azkarSearchStatus");

  if (!input || !clearButton || !results) return;

  const renderResults = () => {
    const query = normalizeAzkarSearchText(input.value);
    const terms = query.split(" ").filter(Boolean);

    clearButton.hidden = !query;
    grid.hidden = Boolean(query);
    results.hidden = !query;
    results.innerHTML = "";

    if (!query) {
      if (countElement) countElement.textContent = `${topics.length} بابًا`;
      if (status) status.textContent = "";
      return;
    }

    const matches = [];

    topics.forEach(topic => {
      const title = normalizeAzkarSearchText(topic.title);

      if (terms.every(term => title.includes(term))) {
        matches.push({ topic, index: null, text: `يحتوي هذا الباب على ${topic.items.length} ذكرًا.` });
        return;
      }

      (Array.isArray(topic.items) ? topic.items : []).forEach((zikr, index) => {
        const text = String(zikr.text || "");
        const searchable = normalizeAzkarSearchText(`${topic.title} ${text}`);
        if (terms.every(term => searchable.includes(term))) {
          matches.push({ topic, index, text });
        }
      });
    });

    if (countElement) {
      countElement.textContent = `${matches.length} نتيجة`;
    }

    if (status) {
      status.textContent = matches.length
        ? `عدد النتائج: ${matches.length}`
        : "لا توجد نتائج مطابقة";
    }

    if (!matches.length) {
      const empty = document.createElement("p");
      empty.className = "azkar-search-empty";
      empty.textContent = "لا توجد نتائج مطابقة. جرّب كلمات أخرى.";
      results.appendChild(empty);
      return;
    }

    matches.slice(0, 80).forEach(match => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "azkar-search-result";

      const heading = document.createElement("span");
      heading.className = "azkar-search-result-title";
      heading.textContent = `${match.topic.number}. ${match.topic.title}`;

      const excerpt = document.createElement("span");
      excerpt.className = "azkar-search-result-excerpt";
      const plainText = match.text.replace(/\s+/g, " ").trim();
      excerpt.textContent = plainText.length > 190
        ? `${plainText.slice(0, 190)}…`
        : plainText;

      const action = document.createElement("span");
      action.className = "azkar-search-result-action";
      action.textContent = match.index === null ? "افتح الباب" : "افتح الذكر";

      button.append(heading, excerpt, action);
      button.addEventListener("click", () => {
        openAzkarTopic(match.topic.number, match.index);
      });
      results.appendChild(button);
    });

    if (matches.length > 80) {
      const more = document.createElement("p");
      more.className = "azkar-search-empty";
      more.textContent = `يتم عرض أول 80 نتيجة من أصل ${matches.length}. أضف كلمات للبحث لتضييق النتائج.`;
      results.appendChild(more);
    }
  };

  input.addEventListener("input", renderResults);
  clearButton.addEventListener("click", () => {
    input.value = "";
    renderResults();
    input.focus();
  });

}


// =====================================================
// فتح باب الأذكار
// =====================================================

function openAzkarTopic(number, focusIndex = null, options = null) {

  const topics =
    window.azkarTopics || [];

  const topic =
    topics.find(
      item => Number(item.number) === Number(number)
    );

  if (!topic) return;

  goToPage("azkar");

  const topicsPage =
    document.getElementById("page-azkar");

  const detailPage =
    document.getElementById("page-azkar-detail");

  if (topicsPage) topicsPage.classList.remove("active");
  if (detailPage) detailPage.classList.add("active");

  const titleElement =
    document.getElementById("categoryDetailTitle");

  if (titleElement) {
    titleElement.textContent = options?.title
      || `${topic.number}. ${topic.title || "باب الأذكار"}`;
  }

  const sessionButton = document.getElementById("openWirdSessionButton");
  if (sessionButton) {
    sessionButton.dataset.topicNumber = String(topic.number);
    sessionButton.dataset.itemIndexes = JSON.stringify(options?.itemIndexes || null);
    sessionButton.dataset.title = options?.title || topic.title || "الورد اليومي";
  }

  renderAzkarTopic(topic.number, options?.itemIndexes || null, options?.title || null);

  if (Number.isInteger(focusIndex)) {
    requestAnimationFrame(() => {
      document.querySelector(`[data-zikr-index="${focusIndex}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

}

window.openAzkarTopic = openAzkarTopic;

// =====================================================
// جلسة الورد — ذكر واحد في كل مرة
// =====================================================
let wirdSession = null;
let wirdAudioState = "idle";
let wirdAudioGeneration = 0;
let wirdAudioReplayCurrent = false;
let wirdAudioReplayReturnIndex = null;
let wirdAudioMode = "web";
let wirdAudioSessionToken = "";
let wirdAudioNextTimer = null;
let wirdAudioWaitingForNext = false;

function wirdAudioText(arabic, english) {
  return document.documentElement.lang === "en" ? english : arabic;
}

function renderWirdAudioControls() {
  const button = document.getElementById("wirdSessionPlayToggle");
  const rate = document.getElementById("wirdSessionRate");
  const rateValue = document.getElementById("wirdSessionRateValue");
  const previous = document.getElementById("wirdSessionPrevious");
  const next = document.getElementById("wirdSessionNextItem");
  const note = document.getElementById("wirdSessionAudioStatus");
  const rateLabel = document.querySelector('label[for="wirdSessionRate"]');
  if (button) {
    const labels = {
      idle: ["ابدأ القراءة بصوت الجهاز", "Read aloud on this device"],
      playing: ["إيقاف مؤقت", "Pause reading"],
      paused: ["استئناف القراءة", "Resume reading"]
    };
    button.textContent = wirdAudioText(...labels[wirdAudioState]);
    button.setAttribute("aria-pressed", String(wirdAudioState === "playing"));
  }
  if (previous) { previous.textContent = wirdAudioText("السابق", "Previous"); previous.setAttribute("aria-label", wirdAudioText("الذكر السابق", "Previous dhikr")); }
  if (next) { next.textContent = wirdAudioText("التالي", "Next"); next.setAttribute("aria-label", wirdAudioText("الذكر التالي", "Next dhikr")); }
  if (rateLabel) rateLabel.firstChild.textContent = wirdAudioText("سرعة القراءة ", "Reading speed ");
  if (rate && rateValue) {
    const value = Number(rate.value) || 1;
    rateValue.textContent = wirdAudioText(`${arabicNumber(value)}×`, `${value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}×`);
  }
  if (note && wirdAudioState === "idle" && !note.dataset.hasError) {
    const androidNative = Boolean(window.AnyasAndroid && typeof window.AnyasAndroid.startWirdPlayback === "function");
    note.textContent = androidNative
      ? wirdAudioText("صوت آلي من محرك Android؛ قد تحتاج إلى تثبيت صوت عربي من إعدادات النظام. يستمر بالخلفية، ويظهر إشعار التحكم إذا سمحت بالإشعارات. النطق غير موثّق وليس تلاوة للقرآن.", "Synthetic Android speech; you may need to install an Arabic voice in system settings. Playback continues in the background; controls appear if notifications are allowed. Pronunciation is not verified and is not Quran recitation.")
      : wirdAudioText("صوت آلي من جهازك؛ قد يحتاج إلى تنزيل صوت عربي، وقد يتوقف عند قفل الشاشة حسب الجهاز. النطق غير موثّق، ولا يُستخدم كتلاوة للقرآن.", "Synthetic speech from your device; an Arabic voice may need to be downloaded, and playback may stop when the screen locks. Pronunciation is not verified and is not a Quran recitation.");
  }
}

function cancelWirdAudio() {
  wirdAudioGeneration += 1;
  if (wirdAudioNextTimer !== null) window.clearTimeout(wirdAudioNextTimer);
  wirdAudioNextTimer = null;
  wirdAudioWaitingForNext = false;
  if (wirdAudioMode === "native") window.AnyasAndroid?.stopWirdPlayback?.(wirdAudioSessionToken);
  else if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  wirdAudioMode = "web";
  wirdAudioState = "idle";
  renderWirdAudioControls();
}

function saveWirdSessionPosition() {
  if (!wirdSession) return;
  try { localStorage.setItem(getWirdSessionKey(wirdSession.number), String(wirdSession.index)); } catch (_) {}
}

function startNativeWirdUtterance() {
  if (!wirdSession || !window.AnyasAndroid || typeof window.AnyasAndroid.startWirdPlayback !== "function") return false;
  if (!wirdSession.items[wirdSession.index]) return false;
  const queue = wirdSession.items.map(({ item, sourceIndex }) => {
    const count = Math.max(1, Number(item.count) || 1);
    return { text: String(item.text || ""), count, completed: Math.min(Math.max(0, Number(wirdSession.progress[sourceIndex]) || 0), count) };
  });
  let volumeSetting = 100;
  try {
    const raw = localStorage.getItem("anyas_adhanVolume");
    volumeSetting = raw === null ? 100 : Number(raw);
  } catch (_) { }
  const volume = Math.max(0, Math.min(1, (Number.isFinite(volumeSetting) ? volumeSetting : 100) / 100));
  const rate = Math.max(0.75, Math.min(1.25, Number(document.getElementById("wirdSessionRate")?.value) || 1));
  const response = window.AnyasAndroid.startWirdPlayback(
    JSON.stringify(queue), String(wirdSession.title || "جلسة الأذكار"),
    wirdSession.index, volume, rate, wirdAudioReplayCurrent,
    Number(wirdAudioReplayReturnIndex ?? wirdSession.index), wirdAudioSessionToken
  );
  if (response === "started") return true;
  const status = document.getElementById("wirdSessionAudioStatus");
  if (status) status.textContent = wirdAudioText("تعذر بدء مشغل Android؛ تابع يدويًا أو استخدم قراءة المتصفح.", "Android playback could not start; continue manually or use browser read-aloud.");
  return false;
}

function finishWirdAudioSession() {
  const wasNative = wirdAudioMode === "native";
  wirdAudioMode = "web";
  if (wasNative) window.AnyasAndroid?.stopWirdPlayback?.(wirdAudioSessionToken);
  else if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  wirdAudioState = "idle";
  renderWirdAudioControls();
  const status = document.getElementById("wirdSessionAudioStatus");
  if (status) status.textContent = wirdAudioText("اكتملت الجلسة الصوتية.", "Audio session complete.");
}

function finishWirdAudioUtterance() {
  if (!wirdSession) return;
  const entry = wirdSession.items[wirdSession.index];
  const count = Math.max(1, Number(entry.item.count) || 1);
  const replaying = wirdAudioReplayCurrent;
  if (!replaying) {
    const completed = Math.min(Number(wirdSession.progress[entry.sourceIndex]) || 0, count);
    wirdSession.progress[entry.sourceIndex] = Math.min(completed + 1, count);
    saveTopicProgress(wirdSession.number, wirdSession.progress);
  }
  renderAzkarTopic(wirdSession.number, wirdSession.items.map(({ sourceIndex }) => sourceIndex), wirdSession.title);
  if (replaying) {
    wirdSession.index = Math.max(0, Math.min(wirdSession.items.length - 1, Number(wirdAudioReplayReturnIndex ?? wirdSession.index)));
  } else if ((Number(wirdSession.progress[entry.sourceIndex]) || 0) >= count && wirdSession.index < wirdSession.items.length - 1) {
    wirdSession.index += 1;
  }
  wirdAudioReplayCurrent = false;
  wirdAudioReplayReturnIndex = null;
  saveWirdSessionPosition();
  renderWirdSession();
  const activeEntry = wirdSession.items[wirdSession.index];
  const activeCount = Math.max(1, Number(activeEntry?.item.count) || 1);
  if (wirdSession.index === wirdSession.items.length - 1 && (Number(wirdSession.progress[activeEntry?.sourceIndex]) || 0) >= activeCount) {
    finishWirdAudioSession();
    return;
  }
  if (wirdAudioState !== "playing") return;
  if (wirdAudioMode === "native") {
    if (!startNativeWirdUtterance()) {
      wirdAudioState = "idle";
      wirdAudioMode = "web";
      renderWirdAudioControls();
    }
    return;
  }
  wirdAudioWaitingForNext = true;
  wirdAudioNextTimer = window.setTimeout(() => {
    wirdAudioNextTimer = null;
    if (wirdAudioState !== "playing") return;
    wirdAudioWaitingForNext = false;
    speakWirdCurrentItem();
  }, 220);
}

window.anyasAndroidWirdUtteranceCompleted = () => {
  if (wirdAudioMode === "native" && wirdAudioState === "playing") finishWirdAudioUtterance();
};
window.anyasAndroidWirdProgress = (completedIndex, completedCount, nextIndex, token) => {
  if (wirdAudioMode !== "native" || !wirdSession || token !== wirdAudioSessionToken) return;
  const entry = wirdSession.items[Number(completedIndex)];
  if (!entry) return;
  const count = Math.max(1, Number(entry.item.count) || 1);
  wirdSession.progress[entry.sourceIndex] = Math.min(Math.max(0, Number(completedCount) || 0), count);
  saveTopicProgress(wirdSession.number, wirdSession.progress);
  renderAzkarTopic(wirdSession.number, wirdSession.items.map(({ sourceIndex }) => sourceIndex), wirdSession.title);
  if (Number(nextIndex) >= 0 && Number(nextIndex) < wirdSession.items.length) {
    wirdSession.index = Number(nextIndex);
    saveWirdSessionPosition();
    renderWirdSession();
  } else {
    finishWirdAudioSession();
  }
};
window.anyasAndroidWirdPosition = (nextIndex, token) => {
  if (wirdAudioMode !== "native" || !wirdSession || token !== wirdAudioSessionToken) return;
  const index = Number(nextIndex);
  if (!Number.isInteger(index) || index < 0 || index >= wirdSession.items.length) return;
  wirdSession.index = index;
  wirdAudioReplayCurrent = false;
  wirdAudioReplayReturnIndex = null;
  saveWirdSessionPosition();
  renderWirdSession();
};
window.anyasAndroidWirdPaused = token => {
  if (wirdAudioMode !== "native" || token !== wirdAudioSessionToken) return;
  wirdAudioState = "paused";
  renderWirdAudioControls();
};
window.anyasAndroidWirdResumed = token => {
  if (wirdAudioMode !== "native" || token !== wirdAudioSessionToken) return;
  wirdAudioState = "playing";
  renderWirdAudioControls();
};
window.anyasAndroidWirdStopped = token => {
  if (wirdAudioMode !== "native" || token !== wirdAudioSessionToken) return;
  wirdAudioMode = "web";
  wirdAudioState = "idle";
  renderWirdAudioControls();
};
window.anyasAndroidWirdCompleted = token => {
  if (wirdAudioMode === "native" && token === wirdAudioSessionToken) finishWirdAudioSession();
};
window.anyasAndroidWirdNext = () => {
  if (wirdSession && wirdAudioMode === "native") moveWirdSession(1);
};
window.anyasAndroidWirdFailed = token => {
  if (wirdAudioMode !== "native" || token !== wirdAudioSessionToken) return;
  wirdAudioMode = "web";
  const canFallback = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  const status = document.getElementById("wirdSessionAudioStatus");
  if (canFallback && wirdSession && wirdAudioState === "playing") {
    if (status) status.textContent = wirdAudioText("تعذر صوت Android؛ نجرب صوت المتصفح.", "Android voice failed; trying the browser voice.");
    speakWirdCurrentItem();
  } else {
    wirdAudioState = "idle";
    if (status) status.textContent = wirdAudioText("تعذر تشغيل الصوت العربي على هذا الجهاز. تابع يدويًا أو نزّل صوتًا عربيًا من إعدادات النظام.", "Arabic speech is unavailable on this device. Continue manually or install an Arabic system voice.");
    renderWirdAudioControls();
  }
};

function speakWirdCurrentItem() {
  if (!wirdSession || wirdAudioState !== "playing") return;
  const entry = wirdSession.items[wirdSession.index];
  if (!entry) return;
  if (wirdAudioMode === "native") {
    if (!startNativeWirdUtterance()) {
      wirdAudioMode = "web";
      if ("speechSynthesis" in window && "SpeechSynthesisUtterance" in window) speakWirdCurrentItem();
      else { wirdAudioState = "idle"; renderWirdAudioControls(); }
    }
    return;
  }
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
  const count = Math.max(1, Number(entry.item.count) || 1);
  const completed = Math.min(Math.max(0, Number(wirdSession.progress[entry.sourceIndex]) || 0), count);
  const remaining = wirdAudioReplayCurrent ? 1 : count - completed;
  if (remaining <= 0) {
    if (wirdSession.index >= wirdSession.items.length - 1) {
      cancelWirdAudio();
      const status = document.getElementById("wirdSessionAudioStatus");
      if (status) status.textContent = wirdAudioText("اكتملت الجلسة الصوتية.", "Audio session complete.");
      return;
    }
    wirdSession.index += 1;
    wirdAudioReplayCurrent = false;
    saveWirdSessionPosition();
    renderWirdSession();
    speakWirdCurrentItem();
    return;
  }

  const generation = wirdAudioGeneration;
  const utterance = new SpeechSynthesisUtterance(String(entry.item.text || ""));
  utterance.lang = "ar-SA";
  utterance.rate = Math.max(0.75, Math.min(1.25, Number(document.getElementById("wirdSessionRate")?.value) || 1));
  try {
    const rawVolume = localStorage.getItem("anyas_adhanVolume");
    const savedVolume = rawVolume === null ? 100 : Number(rawVolume);
    utterance.volume = Math.max(0, Math.min(1, (Number.isFinite(savedVolume) ? savedVolume : 100) / 100));
  } catch (_) { utterance.volume = 1; }
  const voices = window.speechSynthesis.getVoices?.() || [];
  const arabicVoice = voices.find(voice => /^ar(?:-|$)/i.test(voice.lang));
  if (arabicVoice) utterance.voice = arabicVoice;
  utterance.onend = () => {
    if (generation !== wirdAudioGeneration || !wirdSession || wirdAudioState !== "playing") return;
    finishWirdAudioUtterance();
  };
  utterance.onerror = event => {
    if (generation !== wirdAudioGeneration || event.error === "canceled" || event.error === "interrupted") return;
    wirdAudioState = "idle";
    renderWirdAudioControls();
    const status = document.getElementById("wirdSessionAudioStatus");
    if (status) status.textContent = wirdAudioText("تعذرت القراءة الصوتية على هذا الجهاز. يمكنك متابعة الورد يدويًا.", "Read-aloud is unavailable on this device. You can continue manually.");
  };
  try { window.speechSynthesis.speak(utterance); }
  catch (_) {
    wirdAudioState = "idle";
    renderWirdAudioControls();
  }
}

function toggleWirdAudio() {
  if (!wirdSession) return;
  const nativeAvailable = Boolean(window.AnyasAndroid && typeof window.AnyasAndroid.startWirdPlayback === "function");
  const browserAvailable = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  if (!nativeAvailable && !browserAvailable) {
    const status = document.getElementById("wirdSessionAudioStatus");
    if (status) status.textContent = wirdAudioText("القراءة الصوتية غير مدعومة في هذا المتصفح.", "Read-aloud is not supported in this browser.");
    return;
  }
  if (wirdAudioState === "playing") {
    if (wirdAudioMode === "native") {
      window.AnyasAndroid.pauseWirdPlayback?.(wirdAudioSessionToken);
    } else if (wirdAudioNextTimer !== null) {
      window.clearTimeout(wirdAudioNextTimer);
      wirdAudioNextTimer = null;
      wirdAudioWaitingForNext = true;
      wirdAudioState = "paused";
      renderWirdAudioControls();
      return;
    } else {
      window.speechSynthesis.pause();
    }
    wirdAudioState = "paused";
    renderWirdAudioControls();
    return;
  }
  if (wirdAudioState === "paused") {
    if (wirdAudioMode === "native") window.AnyasAndroid.resumeWirdPlayback?.(wirdAudioSessionToken);
    else window.speechSynthesis.resume();
    wirdAudioState = "playing";
    renderWirdAudioControls();
    if (wirdAudioWaitingForNext) {
      wirdAudioWaitingForNext = false;
      speakWirdCurrentItem();
    }
    return;
  }
  wirdAudioState = "playing";
  wirdAudioMode = nativeAvailable ? "native" : "web";
  wirdAudioSessionToken = `${wirdSession.number}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  wirdAudioGeneration += 1;
  renderWirdAudioControls();
  const status = document.getElementById("wirdSessionAudioStatus");
  if (status) status.textContent = nativeAvailable
    ? wirdAudioText("بدأ صوت Android الأصلي. استخدم إشعار الجلسة للتحكم بها عند إغلاق الشاشة.", "Android speech started. Use the session notification to control playback with the screen off.")
    : wirdAudioText("جارٍ القراءة بصوت الجهاز. قد يختلف النطق حسب محرك الصوت.", "Reading with your device voice. Pronunciation depends on its speech engine.");
  if (wirdAudioMode === "native") {
    if (!startNativeWirdUtterance()) {
      wirdAudioMode = "web";
      if (browserAvailable) speakWirdCurrentItem();
      else { wirdAudioState = "idle"; renderWirdAudioControls(); }
    }
  } else speakWirdCurrentItem();
}

function moveWirdSession(delta) {
  if (!wirdSession) return;
  const wasPlaying = wirdAudioState === "playing";
  const wasNative = wirdAudioMode === "native";
  const originalIndex = wirdSession.index;
  cancelWirdAudio();
  wirdSession.index = Math.max(0, Math.min(wirdSession.items.length - 1, wirdSession.index + delta));
  wirdAudioReplayCurrent = delta < 0;
  wirdAudioReplayReturnIndex = delta < 0 ? originalIndex : null;
  saveWirdSessionPosition();
  renderWirdSession();
  if (wasPlaying) {
    wirdAudioState = "playing";
    wirdAudioMode = wasNative ? "native" : "web";
    wirdAudioSessionToken = `${wirdSession.number}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    wirdAudioGeneration += 1;
    renderWirdAudioControls();
    if (wasNative) {
      if (!startNativeWirdUtterance()) { wirdAudioMode = "web"; speakWirdCurrentItem(); }
    } else speakWirdCurrentItem();
  }
}

function arabicNumber(value) {
  return String(value).replace(/\d/g, digit => "٠١٢٣٤٥٦٧٨٩"[digit]);
}

function getWirdSessionKey(number) {
  return `anyas_wird_session_${number}_${new Date().toLocaleDateString("en-CA")}`;
}

function openWirdSession(number, itemIndexes = null, titleOverride = null) {
  const topic = (window.azkarTopics || []).find(item => Number(item.number) === Number(number));
  const modal = document.getElementById("wirdSessionModal");
  if (!topic || !modal) return;
  const allItems = Array.isArray(topic.items) ? topic.items : [];
  const items = allItems.map((item, sourceIndex) => ({ item, sourceIndex }))
    .filter(entry => !itemIndexes || itemIndexes.includes(entry.sourceIndex));
  if (!items.length) return;

  const progress = loadTopicProgress(number);
  let savedIndex = 0;
  try { savedIndex = Number(localStorage.getItem(getWirdSessionKey(number))) || 0; } catch (_) {}
  const firstPending = items.findIndex(({ item, sourceIndex }) => (Number(progress[sourceIndex]) || 0) < (Number(item.count) || 1));
  cancelWirdAudio();
  wirdAudioReplayCurrent = false;
  wirdSession = { number, title: titleOverride || topic.title || "الورد اليومي", items, progress, index: Math.min(Math.max(savedIndex, 0), items.length - 1) };
  if (firstPending >= 0 && savedIndex >= items.length) wirdSession.index = firstPending;
  modal.hidden = false;
  document.body.classList.add("wird-session-open");
  renderWirdSession();
}

function closeWirdSession() {
  cancelWirdAudio();
  const modal = document.getElementById("wirdSessionModal");
  if (modal) modal.hidden = true;
  document.body.classList.remove("wird-session-open");
  wirdSession = null;
}

function renderWirdSession() {
  if (!wirdSession) return;
  const { number, title, items, progress } = wirdSession;
  const entry = items[wirdSession.index];
  const item = entry.item;
  const count = Number(item.count) || 1;
  const current = Math.min(Number(progress[entry.sourceIndex]) || 0, count);
  let completed = 0;
  items.forEach(({ item: currentItem, sourceIndex }) => {
    completed += Math.min(Number(progress[sourceIndex]) || 0, Number(currentItem.count) || 1);
  });
  const total = items.reduce((sum, currentItem) => sum + (Number(currentItem.item.count) || 1), 0);
  const percent = total ? Math.round(completed / total * 100) : 0;
  document.getElementById("wirdSessionTitle").textContent = title;
  document.getElementById("wirdSessionText").textContent = item.text || "";
  document.getElementById("wirdSessionStep").textContent = `الذكر ${arabicNumber(wirdSession.index + 1)} من ${arabicNumber(items.length)}`;
  document.getElementById("wirdSessionPercent").textContent = `${arabicNumber(percent)}٪`;
  document.getElementById("wirdSessionProgress").style.width = `${percent}%`;
  document.getElementById("wirdSessionCount").textContent = count > 1 ? `التكرار ${arabicNumber(current + 1)} من ${arabicNumber(count)}` : "اقرأ الذكر بهدوء";
  const next = document.getElementById("wirdSessionNext");
  next.textContent = current + 1 >= count ? (wirdSession.index + 1 >= items.length ? "إنهاء الجلسة" : "تم الذكر — التالي") : "تم الذكر — التكرار التالي";
  document.getElementById("wirdSessionNote").textContent = percent >= 100 ? "أحسنت، اكتمل وردك اليوم." : "سيُحفظ آخر موضع لك على هذا الجهاز.";
  renderWirdAudioControls();
}

function advanceWirdSession(markComplete) {
  if (!wirdSession) return;
  if (wirdAudioState !== "idle") cancelWirdAudio();
  const entry = wirdSession.items[wirdSession.index];
  const count = Number(entry.item.count) || 1;
  if (markComplete) wirdSession.progress[entry.sourceIndex] = Math.min((Number(wirdSession.progress[entry.sourceIndex]) || 0) + 1, count);
  const current = Number(wirdSession.progress[entry.sourceIndex]) || 0;
  if (current >= count || !markComplete) wirdSession.index = Math.min(wirdSession.index + 1, wirdSession.items.length - 1);
  wirdAudioReplayCurrent = false;
  saveWirdSessionPosition();
  saveTopicProgress(wirdSession.number, wirdSession.progress);
  renderAzkarTopic(wirdSession.number, wirdSession.items.map(({ sourceIndex }) => sourceIndex), wirdSession.title);
  renderWirdSession();
  if (markComplete && current >= count && wirdSession.index === wirdSession.items.length - 1 && current >= count) {
    const allDone = wirdSession.items.every(({ item, sourceIndex }) => (Number(wirdSession.progress[sourceIndex]) || 0) >= (Number(item.count) || 1));
    if (allDone) document.getElementById("wirdSessionNote").textContent = "أحسنت، اكتمل وردك اليوم.";
  }
}

window.openWirdSession = openWirdSession;

// =====================================================
// مفتاح حفظ التقدم
// =====================================================

function getTopicStorageKey(number) {

  const today =
    new Date().toDateString();

  return `anyas_topic_${number}_${today}`;

}


// =====================================================
// تحميل تقدم الباب
// =====================================================

function loadTopicProgress(number) {

  const key =
    getTopicStorageKey(number);

  try {

    const saved =
      localStorage.getItem(key);

    if (!saved) {
      return {};
    }

    return JSON.parse(saved);

  } catch (error) {

    console.error(
      "تعذر تحميل تقدم الأذكار:",
      error
    );

    return {};

  }

}


// =====================================================
// حفظ تقدم الباب
// =====================================================

function saveTopicProgress(number, progress) {

  const key =
    getTopicStorageKey(number);

  try {

    localStorage.setItem(
      key,
      JSON.stringify(progress)
    );

  } catch (error) {

    console.error(
      "تعذر حفظ تقدم الأذكار:",
      error
    );

  }

}


// =====================================================
// عرض أذكار الباب
// =====================================================

function renderAzkarTopic(number, itemIndexes = null, titleOverride = null) {

  const topics =
    window.azkarTopics || [];

  const topic =
    topics.find(
      item => Number(item.number) === Number(number)
    );

  const list =
    document.getElementById("azkarList");

  if (!topic || !list) return;

  list.innerHTML = "";

  const progress =
    loadTopicProgress(number);

  const allItems =
    Array.isArray(topic.items)
      ? topic.items
      : [];

  const items = allItems
    .map((item, sourceIndex) => ({ item, sourceIndex }))
    .filter(entry => !itemIndexes || itemIndexes.includes(entry.sourceIndex));

  items.forEach(({ item: zikr, sourceIndex }) => {

    const count =
      Number(zikr.count) || 1;

    const current =
      Number(progress[sourceIndex]) || 0;

    const remaining =
      Math.max(
        count - current,
        0
      );

    const card =
      document.createElement("article");

    card.className =
      "zikr-card";
    card.dataset.zikrIndex = String(sourceIndex);

    card.innerHTML = `
      <div class="zikr-text">
        ${zikr.text || ""}
      </div>

      <div class="zikr-meaning-wrap">
        <strong>المعنى والفائدة</strong>
        <p class="zikr-meaning"></p>
      </div>

      <div class="zikr-footer">

        <button
          type="button"
          class="zikr-favorite-button"
          aria-pressed="false"
          aria-label="أضف إلى المفضلة"
        >☆</button>

        <button
          type="button"
          class="zikr-share-button"
          aria-label="مشاركة هذا الذكر"
        >مشاركة</button>

        <span class="zikr-count">
          ${
            remaining > 0
              ? `متبقي ${remaining} من ${count}`
              : "تم"
          }
        </span>

        <button
          type="button"
          class="zikr-button"
        >
          ${remaining > 0 ? "تسبيح" : "تم"}
        </button>

      </div>
    `;

    const meaning = window.azkarBenefits?.[String(number)]?.[sourceIndex]
      || "توضيح معنى هذا الذكر غير متاح حاليًا.";
    card.querySelector(".zikr-meaning").textContent = meaning;

    card.querySelector(".zikr-share-button").addEventListener("click", () => {
      shareAzkarItem(topic, zikr, meaning, titleOverride);
    });

    window.azkarFavorites?.bindButton(
      card.querySelector(".zikr-favorite-button"),
      Number(number),
      sourceIndex
    );

    const button =
      card.querySelector(".zikr-button");

    if (remaining <= 0) {

      button.disabled = true;

    } else {

      button.addEventListener(
        "click",
        () => {

          const currentProgress =
            Number(progress[sourceIndex]) || 0;

          const newProgress =
            Math.min(
              currentProgress + 1,
              count
            );

          progress[sourceIndex] =
            newProgress;

          saveTopicProgress(
            number,
            progress
          );

          if (
            localStorage.getItem(
              "anyas_vibration"
            ) === "true" &&
            navigator.vibrate
          ) {
            navigator.vibrate(30);
          }

          renderAzkarTopic(number, itemIndexes, titleOverride);

        }
      );

    }

    list.appendChild(card);

  });

  if (itemIndexes) {
    document.getElementById("azkarTopicNavigation")?.replaceChildren();
  } else {
    renderTopicNavigation(number);
  }

}


async function shareAzkarItem(topic, zikr, meaning, titleOverride = null) {
  const displayTitle = titleOverride || topic.title;
  const payload = `${displayTitle}\n\n${String(zikr.text || "").trim()}\n\nالمعنى والفائدة: ${meaning}\n\nمن تطبيق أنياس — حصن المسلم`;
  const status = document.getElementById("azkarShareStatus");
  const announce = message => {
    if (!status) return;
    status.textContent = message;
    window.clearTimeout(announce.timer);
    announce.timer = window.setTimeout(() => { status.textContent = ""; }, 3500);
  };

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: `ذكر من حصن المسلم — ${displayTitle}`, text: payload });
      announce("تم فتح خيارات المشاركة.");
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(payload);
    } else {
      const field = document.createElement("textarea");
      field.value = payload;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      const copied = document.execCommand("copy");
      field.remove();
      if (!copied) throw new Error("clipboard unavailable");
    }
    announce("نُسخ الذكر ومعناه؛ يمكنك لصقه ومشاركته على أي منصة.");
  } catch (_) {
    announce("تعذّر النسخ تلقائيًا؛ حدّد نص الذكر وانسخه للمشاركة.");
  }
}


// =====================================================
// التنقل بين أبواب الأذكار
// =====================================================

function renderTopicNavigation(currentNumber) {

  const container =
    document.getElementById(
      "azkarTopicNavigation"
    );

  if (!container) return;

  const topics =
    window.azkarTopics || [];

  const currentIndex =
    topics.findIndex(
      topic =>
        Number(topic.number) ===
        Number(currentNumber)
    );

  if (currentIndex === -1) {
    container.innerHTML = "";
    return;
  }

  const previousTopic =
    topics[currentIndex - 1];

  const nextTopic =
    topics[currentIndex + 1];

  container.innerHTML = "";

  const wrapper =
    document.createElement("div");

  wrapper.style.display = "flex";
  wrapper.style.gap = "10px";
  wrapper.style.marginTop = "15px";
  wrapper.style.width = "100%";

  if (previousTopic) {

    const previousButton =
      document.createElement("button");

    previousButton.type = "button";
    previousButton.textContent =
      "الباب السابق";

    previousButton.style.flex = "1";

    previousButton.addEventListener(
      "click",
      () => {
        openAzkarTopic(
          previousTopic.number
        );
      }
    );

    wrapper.appendChild(
      previousButton
    );

  }

  if (nextTopic) {

    const nextButton =
      document.createElement("button");

    nextButton.type = "button";
    nextButton.textContent =
      "الباب التالي";

    nextButton.style.flex = "1";

    nextButton.addEventListener(
      "click",
      () => {
        openAzkarTopic(
          nextTopic.number
        );
      }
    );

    wrapper.appendChild(
      nextButton
    );

  }

  container.appendChild(wrapper);

}


// =====================================================
// زر الرجوع من تفاصيل الأذكار
// =====================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const backButton =
      document.getElementById(
        "azkarBackButton"
      );

    if (!backButton) return;

    backButton.addEventListener(
      "click",
      () => {

        const detailPage =
          document.getElementById(
            "page-azkar-detail"
          );

        if (detailPage) detailPage.classList.remove("active");
        document.getElementById("page-azkar")?.classList.add("active");

      }
    );

  }
);

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("openWirdSessionButton")?.addEventListener("click", event => {
    const button = event.currentTarget;
    let itemIndexes = null;
    try { itemIndexes = JSON.parse(button.dataset.itemIndexes || "null"); } catch (_) {}
    openWirdSession(Number(button.dataset.topicNumber), itemIndexes, button.dataset.title);
  });
  document.getElementById("wirdSessionNext")?.addEventListener("click", () => advanceWirdSession(true));
  document.getElementById("wirdSessionSkip")?.addEventListener("click", () => advanceWirdSession(false));
  document.getElementById("wirdSessionPlayToggle")?.addEventListener("click", toggleWirdAudio);
  document.getElementById("wirdSessionPrevious")?.addEventListener("click", () => moveWirdSession(-1));
  document.getElementById("wirdSessionNextItem")?.addEventListener("click", () => moveWirdSession(1));
  document.getElementById("wirdSessionRate")?.addEventListener("input", renderWirdAudioControls);
  document.getElementById("wirdSessionRate")?.addEventListener("change", event => {
    try { localStorage.setItem("anyas_wirdSpeechRate", String(event.currentTarget.value)); } catch (_) {}
  });
  try {
    const savedRate = localStorage.getItem("anyas_wirdSpeechRate");
    if (savedRate && document.getElementById("wirdSessionRate")) document.getElementById("wirdSessionRate").value = String(Math.max(0.75, Math.min(1.25, Number(savedRate) || 1)));
  } catch (_) {}
  document.querySelectorAll("[data-close-wird-session]").forEach(element => element.addEventListener("click", closeWirdSession));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && wirdSession) closeWirdSession();
  });
  window.addEventListener("anyas:languagechange", renderWirdAudioControls);
});
