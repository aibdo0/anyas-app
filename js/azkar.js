// يطابق المعدود مع العدد: ١ مفرد، ٢ مثنى، ٣-١٠ جمع، ١١-٩٩ مفرد منصوب، والمئات مفرد مجرور.
// forms: [مفرد, مثنى مرفوع, مثنى مجرور, جمع, مفرد منصوب, مفرد مجرور]
window.arCount = function (n, f, oblique) {
  n = Number(n) || 0;
  const r = n % 100;
  if (n < 100) {
    if (n === 1) return `${f[0]} واحد`;
    if (n === 2) return oblique ? f[2] : f[1];
    if (n === 0) return `لا ${f[0]}`;
    if (r >= 3 && r <= 10) return `${n} ${f[3]}`;
    return `${n} ${f[4]}`;
  }
  if (r === 0 || r === 1 || r === 2) return `${n} ${f[5]}`;
  if (r >= 3 && r <= 10) return `${n} ${f[3]}`;
  return `${n} ${f[4]}`;
};
window.AR_NOUNS = {
  dhikr: ["ذكر", "ذكران", "ذكرين", "أذكار", "ذكرًا", "ذكر"],
  bab: ["باب", "بابان", "بابين", "أبواب", "بابًا", "باب"],
  qism: ["قسم", "قسمان", "قسمين", "أقسام", "قسمًا", "قسم"]
};

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

  const groups = window.azkarGroups || [];
  const byNumber = {};
  topics.forEach(t => { byNumber[t.number] = t; });

  if (countElement) {
    countElement.textContent = groups.length
      ? window.arCount(groups.length, window.AR_NOUNS.qism)
      : window.arCount(topics.length, window.AR_NOUNS.bab);
  }

  grid.innerHTML = "";

  const makeRow = topic => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "category-card";
    card.innerHTML = `
      <span class="category-card-title">${topic.title || "باب الأذكار"}</span>
      <span class="category-card-count">${topic.items ? topic.items.length : 0}</span>
    `;
    card.addEventListener("click", () => openAzkarTopic(topic.number));
    return card;
  };

  if (!groups.length) {
    topics.forEach(t => grid.appendChild(makeRow(t)));
  } else {
    groups.forEach(group => {
      const list = group.topics.map(n => byNumber[n]).filter(Boolean);
      if (!list.length) return;
      const total = list.reduce((n, t) => n + (t.items ? t.items.length : 0), 0);
      const box = document.createElement("div");
      box.className = "azkar-group";
      const head = document.createElement("button");
      head.type = "button";
      head.className = "azkar-group-head";
      head.setAttribute("aria-expanded", "false");
      head.innerHTML = `<span class="azkar-group-title">${group.title}</span><span class="azkar-group-meta">${window.arCount(total, window.AR_NOUNS.dhikr)}</span><span class="azkar-group-chev" aria-hidden="true"></span>`;
      const body = document.createElement("div");
      body.className = "azkar-group-body";
      body.hidden = true;
      if (list.length === 1) {
        head.addEventListener("click", () => openAzkarTopic(list[0].number));
        head.classList.add("single");
      } else {
        list.forEach(t => body.appendChild(makeRow(t)));
        head.addEventListener("click", () => {
          const open = body.hidden;
          body.hidden = !open;
          head.setAttribute("aria-expanded", String(open));
          box.classList.toggle("open", open);
        });
      }
      box.appendChild(head);
      box.appendChild(body);
      grid.appendChild(box);
    });
  }

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
      if (countElement) countElement.textContent = window.arCount(topics.length, window.AR_NOUNS.bab);
      if (status) status.textContent = "";
      return;
    }

    const matches = [];

    topics.forEach(topic => {
      const title = normalizeAzkarSearchText(topic.title);

      if (terms.every(term => title.includes(term))) {
        matches.push({ topic, index: null, text: `يحتوي هذا الباب على ${window.arCount(topic.items.length, window.AR_NOUNS.dhikr, true)}.` });
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

  window.__zikrIdx = 0;
  if (Number.isInteger(focusIndex)) {
    const ix = options?.itemIndexes ? options.itemIndexes.indexOf(focusIndex) : focusIndex;
    window.__zikrIdx = Math.max(ix, 0);
  }
  renderAzkarTopic(topic.number, options?.itemIndexes || null, options?.title || null);

  if (Number.isInteger(focusIndex)) {
    // التمرير الأفقي إلى الذكر يتم داخل setupZikrPager
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

  items.forEach(({ item: zikr, sourceIndex }, pos) => {

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

    (function () {
      const tx = card.querySelector(".zikr-text");
      let timer = null;
      const stop = () => { if (timer) { clearTimeout(timer); timer = null; } };
      const start = () => { stop(); timer = setTimeout(() => { timer = null; copyZikrText(String(zikr.text || "").replace(/\s+/g, " ").trim()); }, 550); };
      tx.addEventListener("touchstart", start, { passive: true });
      tx.addEventListener("touchmove", stop, { passive: true });
      tx.addEventListener("touchend", stop);
      tx.addEventListener("touchcancel", stop);
      tx.addEventListener("mousedown", start);
      tx.addEventListener("mouseup", stop);
      tx.addEventListener("mouseleave", stop);
      tx.addEventListener("contextmenu", e => e.preventDefault());
    })();

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

          window.__zikrIdx = newProgress >= count ? Math.min(pos + 1, items.length - 1) : pos;
          renderAzkarTopic(number, itemIndexes, titleOverride);

        }
      );

    }

    list.appendChild(card);

  });

  setupZikrPager(list, items.length);

  if (itemIndexes) {
    document.getElementById("azkarTopicNavigation")?.replaceChildren();
  } else {
    renderTopicNavigation(number);
  }

}


function azkarToast(msg) {
  let t = document.getElementById("azkarToast");
  if (!t) { t = document.createElement("div"); t.id = "azkarToast"; t.className = "azkar-toast"; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add("on");
  clearTimeout(azkarToast.timer);
  azkarToast.timer = setTimeout(() => t.classList.remove("on"), 2000);
}

async function copyZikrText(text) {
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else {
      const f = document.createElement("textarea");
      f.value = text; f.setAttribute("readonly", ""); f.style.position = "fixed"; f.style.opacity = "0";
      document.body.appendChild(f); f.select();
      const ok = document.execCommand("copy"); f.remove();
      if (!ok) throw new Error("copy");
    }
    azkarToast("تم نسخ الذكر");
  } catch (_) { azkarToast("تعذّر النسخ"); }
}

async function shareAzkarItem(topic, zikr, meaning, titleOverride = null) {
  const displayTitle = titleOverride || topic.title;
  const plain = String(zikr.text || "").replace(/\s+/g, " ").trim();
  if (window.anyasShareImage && plain && plain.length <= 650) {
    window.anyasShareImage.shareCustom(plain, displayTitle, m => { if (m) azkarToast(m); }, "dhikr");
    return;
  }
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


// بطاقة ورد الوقت: صباحًا «ابدأ ورد الصباح» وبعد الظهر «ورد المساء».
(function () {
  function update() {
    const card = document.getElementById("azkarSmartCard");
    if (!card) return;
    const alt = document.getElementById("azkarSmartAlt");
    const hour = new Date().getHours();
    const morning = hour >= 3 && hour < 15;
    card.dataset.openWird = morning ? "morning" : "evening";
    if (alt) {
      alt.dataset.openWird = morning ? "evening" : "morning";
      alt.textContent = morning ? "أذكار المساء" : "أذكار الصباح";
    }
    document.getElementById("azkarSmartTitle").textContent = morning ? "ابدأ ورد الصباح" : "ورد المساء";
    document.getElementById("azkarSmartSub").textContent = morning ? "ابدأ يومك بالذكر" : "اختم يومك بالذكر";
    document.getElementById("azkarSmartIcon").textContent = morning ? "☀" : "☾";
  }
  document.addEventListener("DOMContentLoaded", update);
  document.addEventListener("visibilitychange", update);
  window.addEventListener("pageshow", update);
  update();
})();


// عرض الأذكار ذكرًا ذكرًا: يمرَّر أفقيًا بالإصبع.
function setupZikrPager(list, total) {
  let bar = document.getElementById("azkarPager");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "azkarPager";
    bar.className = "azkar-pager";
    bar.innerHTML = '<button type="button" class="azkar-pager-btn" data-dir="-1" aria-label="الذكر السابق">›</button><span class="azkar-pager-pos" aria-live="polite"></span><button type="button" class="azkar-pager-btn" data-dir="1" aria-label="الذكر التالي">‹</button>';
    list.parentNode.insertBefore(bar, list);
    bar.addEventListener("click", e => {
      const b = e.target.closest(".azkar-pager-btn");
      if (!b) return;
      const n = Math.max(0, Math.min((list.children.length || 1) - 1, (window.__zikrIdx || 0) + Number(b.dataset.dir)));
      goZikr(list, n, true);
    });
    list.addEventListener("scroll", () => {
      const w = list.clientWidth || 1;
      const n = Math.round(Math.abs(list.scrollLeft) / (w + 12));
      if (n !== window.__zikrIdx && n < list.children.length) { window.__zikrIdx = n; paintPager(list); }
    }, { passive: true });
  }
  list.classList.add("azkar-pager-list");
  bar.hidden = total < 2;
  const n = Math.min(window.__zikrIdx || 0, Math.max(total - 1, 0));
  window.__zikrIdx = n;
  goZikr(list, n, false);
}

function goZikr(list, n, smooth) {
  window.__zikrIdx = n;
  const card = list.children[n];
  if (card) {
    const w = list.clientWidth || 0;
    list.scrollTo({ left: -(n * (w + 12)), behavior: smooth ? "smooth" : "auto" });
  }
  paintPager(list);
}

function paintPager(list) {
  const pos = document.querySelector("#azkarPager .azkar-pager-pos");
  if (!pos) return;
  const toAr = v => String(v).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
  pos.textContent = `${toAr((window.__zikrIdx || 0) + 1)} من ${toAr(list.children.length)}`;
}
