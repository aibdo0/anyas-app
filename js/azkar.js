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

  renderDailyAzkarOrder();

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


function renderDailyAzkarOrder() {
  const list = document.getElementById("azkarDayOrderList");
  if (!list) return;

  const steps = [
    { title: "أذكار أذان الفجر", detail: "من الأذان حتى انتهاء الصلاة", topic: 15 },
    { title: "أذكار ما بعد صلاة الفجر", detail: "لمدة ١٥ دقيقة", wird: "afterPrayer" },
    { title: "ذكر عام", detail: "بعد الفجر حتى الشروق — التسبيح والتحميد والتهليل", topic: 130 },
    { title: "أذكار الصباح", detail: "من الشروق حتى الضحى", wird: "morning" },
    { title: "ذكر عام", detail: "من الضحى حتى صلاة الظهر", topic: 130 },
    { title: "أذكار ما بعد صلاة الظهر", detail: "لمدة ١٥ دقيقة", wird: "afterPrayer" },
    { title: "ذكر عام", detail: "من بعد الظهر حتى صلاة العصر", topic: 130 },
    { title: "أذكار ما بعد صلاة العصر", detail: "لمدة ١٥ دقيقة", wird: "afterPrayer" },
    { title: "أذكار المساء", detail: "من بعد العصر حتى صلاة المغرب", wird: "evening" },
    { title: "أذكار ما بعد صلاة المغرب", detail: "لمدة ١٥ دقيقة", wird: "afterPrayer" },
    { title: "ذكر عام", detail: "من بعد المغرب حتى صلاة العشاء", topic: 130 },
    { title: "أذكار ما بعد صلاة العشاء", detail: "لمدة ١٥ دقيقة", wird: "afterPrayer" },
    { title: "أذكار الليل", detail: "التسبيح والتحميد والتهليل", topic: 130 },
    { title: "الاستغفار", detail: "أذكار الاستغفار والتوبة", topic: 129 },
    { title: "أذكار النوم", detail: "عند الاستعداد للنوم", wird: "beforeSleep" },
    { title: "أذكار السحر", detail: "الاستغفار حتى أذان الفجر", topic: 129 }
  ];

  list.replaceChildren();
  steps.forEach((step, index) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "azkar-day-step";

    const number = document.createElement("span");
    number.className = "azkar-day-step-number";
    number.textContent = String(index + 1).replace(/\d/g, digit => "٠١٢٣٤٥٦٧٨٩"[digit]);

    const copy = document.createElement("span");
    copy.className = "azkar-day-step-copy";
    const title = document.createElement("strong");
    title.textContent = step.title;
    const detail = document.createElement("small");
    detail.textContent = step.detail;
    copy.append(title, detail);

    const arrow = document.createElement("span");
    arrow.className = "azkar-day-step-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "‹";
    button.append(number, copy, arrow);
    button.addEventListener("click", () => {
      if (step.wird) window.openAzkarWird?.(step.wird);
      else openAzkarTopic(step.topic);
    });
    item.appendChild(button);
    list.appendChild(item);
  });
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
    const dayOrder = document.getElementById("azkarDayOrder");

    clearButton.hidden = !query;
    grid.hidden = Boolean(query);
    if (dayOrder) dayOrder.hidden = Boolean(query);
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
