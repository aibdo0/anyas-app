// =====================================================
// أنياس
// التطبيق الرئيسي
// التنقل + بدء تشغيل الوحدات
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

  detectLocationAndLoadTimes();

  setInterval(updateCountdown, 1000);

  setInterval(checkAutoAdhan, 1000 * 20);

});


// =====================================================
// التاريخ
// =====================================================

function updateDate() {

  const el =
    document.getElementById("todayDate");

  if (!el) return;

  const today = new Date();

  el.textContent =
    today.toLocaleDateString("ar-EG", {
      weekday: "long",
      day: "numeric",
      month: "long"
    });

}


// =====================================================
// التنقل بين الصفحات
// =====================================================

function setupNavigation() {

  const navItems =
    document.querySelectorAll(".nav-item");

  navItems.forEach(item => {

    item.addEventListener("click", () => {

      const targetPage =
        item.getAttribute("data-page");

      if (!targetPage) return;

      navItems.forEach(nav => {
        nav.classList.remove("active");
      });

      item.classList.add("active");

      goToPage(targetPage);

    });

  });

}


function goToPage(pageId) {

  document
    .querySelectorAll(".page")
    .forEach(page => {
      page.classList.remove("active");
    });

  const page =
    document.getElementById(`page-${pageId}`);

  if (page) {

    page.classList.add("active");

  }

}


// =====================================================
// أرقام
// =====================================================

function formatNumber(number) {

  return String(number)
    .padStart(2, "0");

}
