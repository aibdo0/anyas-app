const KAABA_LATITUDE = 21.422487;
const KAABA_LONGITUDE = 39.826206;

let qiblaBearing = null;
let currentHeading = null;
let compassCardRotation = null;
let arrowRotation = null;
let northProjectionAvailable = true;
let orientationStarted = false;
let orientationWarningShown = false;
let orientationDataReceived = false;

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
  return ((degree % 360) + 360) % 360;
}

// إسقاط اتجاه على مستوى الشاشة باستخدام مصفوفة Device Orientation القياسية.
function projectBearingToScreen(bearing, alpha, beta, gamma) {
  if (![bearing, alpha, beta, gamma].every(Number.isFinite)) return null;

  const radians = Math.PI / 180;
  const x = beta * radians;
  const y = gamma * radians;
  const z = alpha * radians;
  const cX = Math.cos(x), cY = Math.cos(y), cZ = Math.cos(z);
  const sX = Math.sin(x), sY = Math.sin(y), sZ = Math.sin(z);

  // مصفوفة W3C: تحول محاور الهاتف إلى محاور الأرض (شرق، شمال، أعلى).
  const m11 = cZ * cY - sZ * sX * sY;
  const m12 = -cX * sZ;
  const m21 = cY * sZ + cZ * sX * sY;
  const m22 = cZ * cX;
  const east = Math.sin(bearing * radians);
  const north = Math.cos(bearing * radians);
  const screenRight = m11 * east + m21 * north;
  const screenUp = m12 * east + m22 * north;

  if (Math.hypot(screenRight, screenUp) < 0.03) return null;
  return normalizeDegree(Math.atan2(screenRight, screenUp) / radians);
}

// مزامنة وردة البوصلة والسهم مع اتجاه الهاتف.
function updateArrow() {
  const arrow = document.getElementById("qiblaArrow");
  const ring = document.querySelector("#page-qibla .compass-ring");
  if (!arrow || !ring) return;
  document.querySelectorAll("#page-qibla .compass-mark").forEach(mark => {
    mark.style.visibility = northProjectionAvailable ? "visible" : "hidden";
  });

  if (compassCardRotation === null || arrowRotation === null) {
    ring.style.transform = "rotate(0deg)";
    arrow.style.visibility = "hidden";
    return;
  }

  ring.style.transform = `rotate(${compassCardRotation}deg)`;
  arrow.style.transform = `rotate(${arrowRotation}deg)`;
  arrow.style.visibility = "visible";
}

// الحصول على اتجاه الجهاز
function getHeading(event) {
  if (!event || qiblaBearing === null) return;

  const hasAbsoluteOrientation = event.absolute === true &&
    [event.alpha, event.beta, event.gamma].every(value => typeof value === "number" && Number.isFinite(value));

  if (hasAbsoluteOrientation) {
    orientationDataReceived = true;
    const northAngle = projectBearingToScreen(0, event.alpha, event.beta, event.gamma);
    const qiblaAngle = projectBearingToScreen(qiblaBearing, event.alpha, event.beta, event.gamma);
    if (qiblaAngle === null) {
      compassCardRotation = null;
      arrowRotation = null;
      updateArrow();
      const status = document.getElementById("qiblaStatus");
      const message = document.getElementById("qiblaMessage");
      if (status) status.textContent = "عدّل وضع الهاتف قليلًا";
      if (message) message.textContent = "اتجاه القبلة عمودي على الشاشة الآن؛ أمل الهاتف قليلًا ليظهر السهم.";
      return;
    }

    northProjectionAvailable = northAngle !== null;
    compassCardRotation = northAngle ?? 0;
    arrowRotation = normalizeDegree(qiblaAngle - compassCardRotation);
    currentHeading = null;
    orientationWarningShown = false;
    updateArrow();
    const status = document.getElementById("qiblaStatus");
    const message = document.getElementById("qiblaMessage");
    if (status) status.textContent = "البوصلة مضبوطة";
    if (message) message.textContent = "اتبع السهم نحو القبلة. إذا تذبذب، حرّك الهاتف على شكل ٨ بعيدًا عن المعادن.";
    return;
  }

  // Safari على iPhone يوفّر اتجاه البوصلة مباشرة.
  if (typeof event.webkitCompassHeading === "number" && event.webkitCompassHeading >= 0) {
    orientationDataReceived = true;
    currentHeading = normalizeDegree(event.webkitCompassHeading);
    northProjectionAvailable = true;
    compassCardRotation = normalizeDegree(-currentHeading);
    arrowRotation = normalizeDegree(qiblaBearing);
    orientationWarningShown = false;
    updateArrow();
    const status = document.getElementById("qiblaStatus");
    const message = document.getElementById("qiblaMessage");
    if (status) status.textContent = "البوصلة مضبوطة";
    if (message) message.textContent = "اتبع السهم نحو القبلة. أبقِ الهاتف ثابتًا وأبعده عن المعادن والمغناطيس.";
    return;
  }

  if (event.absolute === false) return;

  // لا نستخدم alpha النسبي كأنه شمال حقيقي؛ فهذا قد يجعل السهم معكوسًا.
  if (!orientationWarningShown) {
    orientationWarningShown = true;
    const status = document.getElementById("qiblaStatus");
    const message = document.getElementById("qiblaMessage");
    if (status) status.textContent = "مستشعر الشمال غير متاح";
    if (message) message.textContent = "المتصفح لم يوفّر اتجاهًا مطلقًا للبوصلة. اسمح بحساس الاتجاه أو استخدم متصفحًا يدعم البوصلة.";
  }
}

// تفعيل حساس الاتجاه
function activateOrientation() {
  if (orientationStarted) return;
  orientationWarningShown = false;
  orientationDataReceived = false;

  window.addEventListener("deviceorientationabsolute", getHeading, true);
  window.addEventListener("deviceorientation", getHeading, true);
  window.setTimeout(() => {
    if (orientationDataReceived || orientationWarningShown) return;
    orientationWarningShown = true;
    const status = document.getElementById("qiblaStatus");
    const message = document.getElementById("qiblaMessage");
    if (status) status.textContent = "مستشعر الشمال غير متاح";
    if (message) message.textContent = "المتصفح لم يوفّر اتجاهًا مطلقًا للبوصلة. اسمح بحساس الاتجاه أو استخدم متصفحًا يدعم البوصلة.";
  }, 3500);

  orientationStarted = true;

  const status = document.getElementById("qiblaStatus");

  if (status) {
    status.textContent = "بانتظار بيانات البوصلة…";
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
        await DeviceOrientationEvent.requestPermission(true);

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

  let savedLocation = null;
  try {
    savedLocation = JSON.parse(localStorage.getItem("anyas_manual_location") || "null");
  } catch (error) {
    savedLocation = null;
  }
  if (savedLocation?.latitude != null && savedLocation?.longitude != null &&
      Number.isFinite(Number(savedLocation.latitude)) && Number.isFinite(Number(savedLocation.longitude))) {
    qiblaBearing = calculateQibla(Number(savedLocation.latitude), Number(savedLocation.longitude));
    currentHeading = null;
    compassCardRotation = null;
    arrowRotation = null;
    northProjectionAvailable = true;
    updateQiblaInfo();
    updateArrow();
    if (status) status.textContent = "تم استخدام المدينة المختارة";
    if (message) message.textContent = `اتجاه القبلة من ${savedLocation.city || "مدينتك"}. انتظر ضبط البوصلة ثم اتبع السهم.`;
    return;
  }

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

      qiblaBearing = calculateQibla(latitude, longitude);
      currentHeading = null;
      compassCardRotation = null;
      arrowRotation = null;
      northProjectionAvailable = true;
      updateQiblaInfo();
      updateArrow();

      if (status) {
        status.textContent =
          "تم تحديد اتجاه القبلة";
      }

      if (message) {
        message.textContent =
          "حرّك الهاتف ببطء حتى يتجه السهم نحو القبلة.";
      }

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
  startOrientation();
  getLocation();
}

// تجهيز صفحة القبلة
function setupQiblaCompassButton() {
  const button =
    document.getElementById("startQiblaButton");
  const arrow = document.getElementById("qiblaArrow");

  if (arrow) arrow.style.visibility = "hidden";

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
