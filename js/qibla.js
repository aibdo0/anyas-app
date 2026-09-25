const KAABA_LATITUDE = 21.422487;
const KAABA_LONGITUDE = 39.826206;

let qiblaBearing = null;
let currentHeading = null;
let orientationStarted = false;

// حساب اتجاه القبلة
function calculateQibla(latitude, longitude) {
  const lat1 = latitude * Math.PI / 180;
  const lat2 = KAABA_LATITUDE * Math.PI / 180;
  const deltaLongitude =
    (KAABA_LONGITUDE - longitude) * Math.PI / 180;

  const y = Math.sin(deltaLongitude);

  const x =
    Math.cos(lat1) * Math.tan(lat2) -
    Math.sin(lat1) * Math.cos(deltaLongitude);

  let bearing = Math.atan2(y, x) * 180 / Math.PI;

  bearing = (bearing + 360) % 360;

  return bearing;
}

// تحويل الدرجة إلى اتجاه
function getDirectionName(degree) {
  if (degree >= 337.5 || degree < 22.5) {
    return "شمال";
  }

  if (degree < 67.5) {
    return "شمال شرقي";
  }

  if (degree < 112.5) {
    return "شرق";
  }

  if (degree < 157.5) {
    return "جنوب شرقي";
  }

  if (degree < 202.5) {
    return "جنوب";
  }

  if (degree < 247.5) {
    return "جنوب غربي";
  }

  if (degree < 292.5) {
    return "غرب";
  }

  return "شمال غربي";
}

// تحديث معلومات القبلة
function updateQiblaInfo() {
  const degreeElement = document.getElementById("qiblaDegree");
  const directionElement = document.getElementById("qiblaDirection");

  if (qiblaBearing === null) return;

  const rounded = Math.round(qiblaBearing);

  if (degreeElement) {
    degreeElement.textContent = `${rounded}°`;
  }

  if (directionElement) {
    directionElement.textContent =
      `اتجاه القبلة: ${getDirectionName(qiblaBearing)}`;
  }
}

// ضبط الدرجة بين 0 و 360
function normalizeDegree(degree) {
  return (degree + 360) % 360;
}

// تحديث السهم حسب اتجاه الهاتف
function updateArrow() {
  const arrow = document.getElementById("qiblaArrow");

  if (!arrow || qiblaBearing === null || currentHeading === null) {
    return;
  }

  const rotation =
    normalizeDegree(qiblaBearing - currentHeading);

  arrow.style.transform = `rotate(${rotation}deg)`;
}

// الحصول على اتجاه الجهاز
function getHeading(event) {
  let heading = null;

  // أجهزة iPhone / iPad
  if (
    typeof event.webkitCompassHeading === "number" &&
    event.webkitCompassHeading >= 0
  ) {
    heading = event.webkitCompassHeading;
  }

  // أجهزة Android والمتصفحات الأخرى
  else if (typeof event.alpha === "number") {
    heading = 360 - event.alpha;
  }

  if (heading !== null) {
    currentHeading = normalizeDegree(heading);
    updateArrow();
  }
}

// تفعيل حساس الاتجاه
function activateOrientation() {
  if (orientationStarted) return;

  window.addEventListener(
    "deviceorientation",
    getHeading,
    true
  );

  orientationStarted = true;

  const status = document.getElementById("qiblaStatus");

  if (status) {
    status.textContent = "البوصلة جاهزة";
  }
}

// بدء البوصلة
async function startOrientation() {
  try {
    // iOS يحتاج إذنًا خاصًا
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      const permission =
        await DeviceOrientationEvent.requestPermission();

      if (permission === "granted") {
        activateOrientation();
      } else {
        const message =
          document.getElementById("qiblaMessage");

        if (message) {
          message.textContent =
            "يجب السماح باستخدام مستشعر اتجاه الجهاز.";
        }
      }
    } else {
      activateOrientation();
    }
  } catch (error) {
    console.error(
      "حدث خطأ أثناء تشغيل البوصلة:",
      error
    );

    const message =
      document.getElementById("qiblaMessage");

    if (message) {
      message.textContent =
        "تعذر تشغيل البوصلة على هذا الجهاز.";
    }
  }
}

// الحصول على موقع المستخدم
function getLocation() {
  const status =
    document.getElementById("qiblaStatus");

  const message =
    document.getElementById("qiblaMessage");

  if (!navigator.geolocation) {
    if (status) {
      status.textContent =
        "الموقع الجغرافي غير مدعوم";
    }

    if (message) {
      message.textContent =
        "جهازك أو المتصفح لا يدعم تحديد الموقع.";
    }

    return;
  }

  if (status) {
    status.textContent =
      "جاري تحديد موقعك...";
  }

  navigator.geolocation.getCurrentPosition(
    position => {
      const latitude =
        position.coords.latitude;

      const longitude =
        position.coords.longitude;

      qiblaBearing =
        calculateQibla(latitude, longitude);

      updateQiblaInfo();

      if (status) {
        status.textContent =
          "تم تحديد اتجاه القبلة";
      }

      if (message) {
        message.textContent =
          "حرّك الهاتف ببطء حتى يتجه السهم نحو القبلة.";
      }

      startOrientation();
    },

    error => {
      console.error(
        "خطأ في تحديد الموقع:",
        error
      );

      if (status) {
        status.textContent =
          "تعذر تحديد موقعك";
      }

      if (message) {
        if (error.code === 1) {
          message.textContent =
            "اسمح للتطبيق باستخدام موقعك حتى يتم تحديد اتجاه القبلة.";
        } else {
          message.textContent =
            "تعذر الحصول على الموقع. حاول مرة أخرى.";
        }
      }
    },

    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000
    }
  );
}

// تشغيل القبلة
function startQibla() {
  getLocation();
}

// تجهيز صفحة القبلة
function setupQiblaCompassButton() {
  const button =
    document.getElementById("startQiblaButton");

  if (!button) return;

  button.addEventListener(
    "click",
    startQibla
  );
}

// تشغيل بعد تحميل الصفحة
document.addEventListener(
  "DOMContentLoaded",
  setupQiblaCompassButton
);
