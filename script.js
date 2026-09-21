// ===============================
// أنياس - التفاعل الأساسي
// ===============================

document.addEventListener("DOMContentLoaded", () => {

  // التاريخ
  updateDate();

  // أزرار التنقل
  setupNavigation();

  // تحديث العد التنازلي
  updateCountdown();

  setInterval(updateCountdown, 1000);
});


// ===============================
// التاريخ
// ===============================

function updateDate() {
  const dateElement = document.getElementById("todayDate");

  if (!dateElement) return;

  const today = new Date();

  dateElement.textContent = today.toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
}


// ===============================
// أزرار القائمة السفلية
// ===============================

function setupNavigation() {

  const navItems = document.querySelectorAll(".nav-item");

  navItems.forEach((item) => {

    item.addEventListener("click", () => {

      navItems.forEach((nav) => {
        nav.classList.remove("active");
      });

      item.classList.add("active");

      const page = item.textContent.trim();

      console.log("تم اختيار:", page);

    });

  });

}


// ===============================
// العد التنازلي
// ===============================

function updateCountdown() {

  const countdownElement =
    document.getElementById("countdown");

  if (!countdownElement) return;

  // وقت تجريبي مؤقت
  // سنستبدله بمواقيت الصلاة الحقيقية لاحقًا

  const nextPrayer = new Date();

  nextPrayer.setHours(4);
  nextPrayer.setMinutes(18);
  nextPrayer.setSeconds(0);

  const now = new Date();

  let difference = nextPrayer - now;

  // إذا انتهى الوقت، ننتقل لليوم التالي
  if (difference <= 0) {

    nextPrayer.setDate(
      nextPrayer.getDate() + 1
    );

    difference = nextPrayer - now;

  }

  const hours =
    Math.floor(difference / (1000 * 60 * 60));

  const minutes =
    Math.floor(
      (difference % (1000 * 60 * 60))
      / (1000 * 60)
    );

  const seconds =
    Math.floor(
      (difference % (1000 * 60))
      / 1000
    );

  countdownElement.textContent =
    `متبقي ${formatNumber(hours)}:${formatNumber(minutes)}:${formatNumber(seconds)}`;
}


// ===============================
// تحويل الأرقام لشكل عربي
// ===============================

function formatNumber(number) {

  return String(number).padStart(2, "0");

}
