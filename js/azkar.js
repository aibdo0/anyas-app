// =====================================================
// أنياس
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

}


// =====================================================
// فتح باب الأذكار
// =====================================================

function openAzkarTopic(number) {

  const topics =
    window.azkarTopics || [];

  const topic =
    topics.find(
      item => Number(item.number) === Number(number)
    );

  if (!topic) return;

  const topicsPage =
    document.getElementById("page-azkar");

  const detailPage =
    document.getElementById("page-azkar-detail");

  if (topicsPage) {
    topicsPage.classList.remove("active");
  }

  if (detailPage) {
    detailPage.classList.add("active");
  }

  const titleElement =
    document.getElementById("categoryDetailTitle");

  if (titleElement) {
    titleElement.textContent =
      `${topic.number}. ${topic.title || "باب الأذكار"}`;
  }

  renderAzkarTopic(topic.number);

}


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

function renderAzkarTopic(number) {

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

  const items =
    Array.isArray(topic.items)
      ? topic.items
      : [];

  items.forEach((zikr, index) => {

    const count =
      Number(zikr.count) || 1;

    const current =
      Number(progress[index]) || 0;

    const remaining =
      Math.max(
        count - current,
        0
      );

    const card =
      document.createElement("article");

    card.className =
      "zikr-card";

    card.innerHTML = `
      <div class="zikr-text">
        ${zikr.text || ""}
      </div>

      <div class="zikr-footer">

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

    const button =
      card.querySelector(".zikr-button");

    if (remaining <= 0) {

      button.disabled = true;

    } else {

      button.addEventListener(
        "click",
        () => {

          const currentProgress =
            Number(progress[index]) || 0;

          const newProgress =
            Math.min(
              currentProgress + 1,
              count
            );

          progress[index] =
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

          renderAzkarTopic(number);

        }
      );

    }

    list.appendChild(card);

  });

  renderTopicNavigation(number);

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

        const azkarPage =
          document.getElementById(
            "page-azkar"
          );

        if (detailPage) {
          detailPage.classList.remove(
            "active"
          );
        }

        if (azkarPage) {
          azkarPage.classList.add(
            "active"
          );
        }

      }
    );

  }
);
