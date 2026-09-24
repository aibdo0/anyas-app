// =====================================================
// أنياس
// التطبيق الرئيسي وربط صفحات التطبيق
// =====================================================

document.addEventListener("DOMContentLoaded", () => {

  updateDate();
  setupNavigation();

  setupAdhan();
  setupAdhanSettings();
  setupThemeAndLanguage();
  setupNotifications();
  setupVibration();
  setupMuezzinSettings();

  setupAzkarTopics();
  setupWorshipSettings();

  setupQuickActions();
  setupDailyTasks();
  setupDailyDua();
  setupUpcomingOccasion();

  detectLocationAndLoadTimes();

  setInterval(updateDate, 60 * 1000);
  setInterval(updateCountdown, 1000);
  setInterval(checkAutoAdhan, 1000 * 20);

});


// =====================================================
// التاريخ الميلادي والهجري
// =====================================================

function updateDate() {

  const today =
    new Date();

  const dateElement =
    document.getElementById(
      "todayDate"
    );

  if (dateElement) {

    dateElement.textContent =
      today.toLocaleDateString(
        "ar-EG",
        {
          weekday: "long",
          day: "numeric",
          month: "long"
        }
      );

  }

  const hijriElement =
    document.getElementById(
      "todayHijri"
    );

  if (
    hijriElement &&
    typeof getHijriParts ===
    "function"
  ) {

    const hijri =
      getHijriParts(today);

    if (hijri) {

      hijriElement.textContent =
        `${hijri.day} ${hijri.month} ${hijri.year} هـ`;

    }

  }

}


// =====================================================
// التنقل بين الصفحات
// =====================================================

function setupNavigation() {

  const navItems =
    document.querySelectorAll(
      ".nav-item"
    );

  navItems.forEach(item => {

    item.addEventListener(
      "click",
      () => {

        const targetPage =
          item.getAttribute(
            "data-page"
          );

        if (!targetPage) {
          return;
        }

        goToPage(
          targetPage
        );

      }
    );

  });

}


// =====================================================
// فتح صفحة
// =====================================================

function goToPage(pageId) {

  document
    .querySelectorAll(".page")
    .forEach(page => {

      page.classList.remove(
        "active"
      );

    });

  const page =
    document.getElementById(
      `page-${pageId}`
    );

  if (page) {

    page.classList.add(
      "active"
    );

  }

  /*
   * تحديث حالة شريط التنقل السفلي
   */

  document
    .querySelectorAll(".nav-item")
    .forEach(nav => {

      const target =
        nav.getAttribute(
          "data-page"
        );

      nav.classList.toggle(
        "active",
        target === pageId
      );

    });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


// =====================================================
// الوصول السريع
// =====================================================

function setupQuickActions() {

  const quickAzkar =
    document.getElementById(
      "quickAzkar"
    );

  const quickDuas =
    document.getElementById(
      "quickDuas"
    );

  const quickTasbeeh =
    document.getElementById(
      "quickTasbeeh"
    );

  const quickSettings =
    document.getElementById(
      "quickSettings"
    );


  if (quickAzkar) {

    quickAzkar.addEventListener(
      "click",
      () => {

        goToPage("azkar");

      }
    );

  }


  if (quickDuas) {

    quickDuas.addEventListener(
      "click",
      () => {

        goToPage("duas");

      }
    );

  }


  if (quickSettings) {

    quickSettings.addEventListener(
      "click",
      () => {

        goToPage("settings");

      }
    );

  }


  /*
   * التسبيح
   *
   * لو عندك صفحة تسبيح موجودة بالفعل
   * يتم فتحها.
   *
   * ولو غير موجودة لا يحدث أي خطأ.
   */

  if (quickTasbeeh) {

    quickTasbeeh.addEventListener(
      "click",
      () => {

        const tasbeehPage =
          document.getElementById(
            "page-tasbeeh"
          );

        if (tasbeehPage) {

          goToPage("tasbeeh");

        } else {

          openTasbeehFallback();

        }

      }
    );

  }

}


// =====================================================
// التسبيح - واجهة احتياطية بسيطة
// =====================================================

function openTasbeehFallback() {

  let modal =
    document.getElementById(
      "tasbeehFallback"
    );

  if (modal) {

    modal.classList.add(
      "show"
    );

    return;

  }

  modal =
    document.createElement(
      "div"
    );

  modal.id =
    "tasbeehFallback";

  modal.innerHTML = `
    <div class="tasbeeh-fallback-card">

      <button
        type="button"
        class="tasbeeh-close"
        aria-label="إغلاق"
      >
        ×
      </button>

      <div class="tasbeeh-fallback-title">
        التسبيح
      </div>

      <div
        class="tasbeeh-count"
        id="tasbeehFallbackCount"
      >
        0
      </div>

      <button
        type="button"
        class="tasbeeh-button"
        id="tasbeehFallbackButton"
      >
        سبحان الله
      </button>

      <button
        type="button"
        class="tasbeeh-reset"
        id="tasbeehFallbackReset"
      >
        تصفير
      </button>

    </div>
  `;

  document.body.appendChild(
    modal
  );

  let count = 0;

  const countElement =
    document.getElementById(
      "tasbeehFallbackCount"
    );

  const button =
    document.getElementById(
      "tasbeehFallbackButton"
    );

  const reset =
    document.getElementById(
      "tasbeehFallbackReset"
    );

  const close =
    modal.querySelector(
      ".tasbeeh-close"
    );


  button.addEventListener(
    "click",
    () => {

      count++;

      countElement.textContent =
        count;

    }
  );


  reset.addEventListener(
    "click",
    () => {

      count = 0;

      countElement.textContent =
        "0";

    }
  );


  close.addEventListener(
    "click",
    () => {

      modal.classList.remove(
        "show"
      );

    }
  );


  modal.addEventListener(
    "click",
    event => {

      if (
        event.target === modal
      ) {

        modal.classList.remove(
          "show"
        );

      }

    }
  );

  modal.classList.add(
    "show"
  );

}


// =====================================================
// مهام اليوم
// =====================================================

function setupDailyTasks() {

  const morning =
    document.getElementById(
      "morningAzkarTask"
    );

  const evening =
    document.getElementById(
      "eveningAzkarTask"
    );

  const dailyWird =
    document.getElementById(
      "dailyWirdTask"
    );


  if (morning) {

    morning.addEventListener(
      "click",
      () => {

        openAzkarTopic(
          1
        );

      }
    );

  }


  if (evening) {

    evening.addEventListener(
      "click",
      () => {

        openAzkarTopic(
          2
        );

      }
    );

  }


  if (dailyWird) {

    dailyWird.addEventListener(
      "click",
      () => {

        goToPage(
          "azkar"
        );

      }
    );

  }

}


// =====================================================
// فتح باب أذكار
// =====================================================

function openAzkarTopic(topicId) {

  goToPage(
    "azkar"
  );

  setTimeout(() => {

    /*
     * نحاول استخدام الدالة الموجودة
     * في azkar.js إن كانت متاحة.
     */

    if (
      typeof openAzkarDetail ===
      "function"
    ) {

      openAzkarDetail(
        topicId
      );

      return;

    }

    if (
      typeof showAzkarTopic ===
      "function"
    ) {

      showAzkarTopic(
        topicId
      );

      return;

    }

    /*
     * إذا لم توجد دالة،
     * نبحث عن العنصر الخاص بالباب.
     */

    const topic =
      document.querySelector(
        `[data-topic-id="${topicId}"]`
      );

    if (topic) {

      topic.click();

    }

  }, 100);

}


// =====================================================
// الدعاء اليومي
// =====================================================

const DAILY_DUAS = [

  "اللهم أعني على ذكرك وشكرك وحسن عبادتك.",

  "اللهم اهدني وسددني.",

  "رب اغفر لي وارحمني واهدني وعافني وارزقني.",

  "اللهم إني أسألك الهدى والتقى والعفاف والغنى.",

  "ربنا آتنا في الدنيا حسنة وفي الآخرة حسنة وقنا عذاب النار.",

  "يا مقلب القلوب ثبت قلبي على دينك.",

  "اللهم اغفر لي ولوالدي وارحمهما كما ربياني صغيرًا.",

  "اللهم إني أسألك علمًا نافعًا ورزقًا طيبًا وعملًا متقبلًا."

];

function setupDailyDua() {

  const duaElement =
    document.getElementById(
      "dailyDuaText"
    );

  const moreButton =
    document.getElementById(
      "moreDuasButton"
    );

  if (duaElement) {

    const today =
      new Date();

    const dayNumber =
      Math.floor(
        new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        ).getTime() /
        86400000
      );

    const index =
      Math.abs(
        dayNumber
      ) %
      DAILY_DUAS.length;

    duaElement.textContent =
      DAILY_DUAS[index];

  }


  if (moreButton) {

    moreButton.addEventListener(
      "click",
      () => {

        goToPage(
          "duas"
        );

      }
    );

  }

}


// =====================================================
// المناسبة القادمة
// =====================================================

function setupUpcomingOccasion() {

  updateUpcomingOccasion();

  /*
   * يتم تحديثها كل ساعة
   */

  setInterval(
    updateUpcomingOccasion,
    60 * 60 * 1000
  );

}


function updateUpcomingOccasion() {

  const element =
    document.getElementById(
      "upcomingOccasion"
    );

  if (!element) {
    return;
  }

  if (
    typeof daysUntilHijri !==
    "function"
  ) {

    element.textContent =
      "تابع مواسم الطاعة من الإعدادات";

    return;

  }


  const occasions = [

    {
      month: 9,
      day: 1,
      text: "رمضان"
    },

    {
      month: 10,
      day: 1,
      text: "عيد الفطر"
    },

    {
      month: 12,
      day: 8,
      text: "الحج"
    },

    {
      month: 12,
      day: 9,
      text: "يوم عرفة"
    },

    {
      month: 12,
      day: 10,
      text: "عيد الأضحى"
    }

  ];


  let nearest =
    null;

  occasions.forEach(
    occasion => {

      const days =
        daysUntilHijri(
          occasion.month,
          occasion.day
        );

      if (
        days === null ||
        days === undefined
      ) {
        return;
      }

      if (
        !nearest ||
        days < nearest.days
      ) {

        nearest = {
          ...occasion,
          days
        };

      }

    }
  );


  if (!nearest) {

    element.textContent =
      "تابع مواسم الطاعة من الإعدادات";

    return;

  }


  if (nearest.days === 0) {

    element.textContent =
      `اليوم: ${nearest.text}`;

    return;

  }


  if (nearest.days === 1) {

    element.textContent =
      `غدًا: ${nearest.text}`;

    return;

  }


  element.textContent =
    `باقي ${nearest.days} يوم على ${nearest.text}`;

}


// =====================================================
// تنسيق الأرقام
// =====================================================

function formatNumber(number) {

  return String(
    number
  ).padStart(
    2,
    "0"
  );

}
