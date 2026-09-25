// =====================================================
// أنياس
// نظام تحديد اتجاه القبلة
// =====================================================

(function () {

  "use strict";


  // إحداثيات الكعبة المشرفة
  const KAABA_LATITUDE = 21.422487;
  const KAABA_LONGITUDE = 39.826206;


  let qiblaBearing = null;
  let currentHeading = null;
  let orientationStarted = false;


  // =====================================================
  // عناصر الصفحة
  // =====================================================

  function getElements() {

    return {
      status: document.getElementById("qiblaStatus"),
      degree: document.getElementById("qiblaDegree"),
      direction: document.getElementById("qiblaDirection"),
      arrow: document.getElementById("qiblaArrow"),
      message: document.getElementById("qiblaMessage"),
      startButton: document.getElementById("startQiblaButton")
    };

  }


  // =====================================================
  // حساب اتجاه القبلة
  // =====================================================

  function calculateQibla(latitude, longitude) {

    const lat1 =
      latitude * Math.PI / 180;

    const lat2 =
      KAABA_LATITUDE * Math.PI / 180;

    const deltaLongitude =
      (KAABA_LONGITUDE - longitude) *
      Math.PI / 180;


    const y =
      Math.sin(deltaLongitude);

    const x =
      Math.cos(lat1) *
      Math.tan(lat2) -
      Math.sin(lat1) *
      Math.cos(deltaLongitude);


    let bearing =
      Math.atan2(y, x) *
      180 / Math.PI;


    bearing =
      (bearing + 360) % 360;


    return bearing;

  }


  // =====================================================
  // تحديد اسم الاتجاه
  // =====================================================

  function getDirectionName(degree) {

    const directions = [
      "الشمال",
      "الشمال الشرقي",
      "الشرق",
      "الجنوب الشرقي",
      "الجنوب",
      "الجنوب الغربي",
      "الغرب",
      "الشمال الغربي"
    ];


    const index =
      Math.round(degree / 45) % 8;


    return directions[index];

  }


  // =====================================================
  // تحديث معلومات القبلة
  // =====================================================

  function updateQiblaInfo() {

    const elements =
      getElements();


    if (
      !elements.degree ||
      qiblaBearing === null
    ) {
      return;
    }


    const rounded =
      Math.round(qiblaBearing);


    elements.degree.textContent =
      `${rounded}°`;


    elements.direction.textContent =
      `اتجاه القبلة ${getDirectionName(qiblaBearing)}`;

  }


  // =====================================================
  // تطبيع الدرجة
  // =====================================================

  function normalizeDegree(degree) {

    return (
      (degree % 360) + 360
    ) % 360;

  }


  // =====================================================
  // تحديث السهم
  // =====================================================

  function updateArrow() {

    const elements =
      getElements();


    if (
      !elements.arrow ||
      qiblaBearing === null ||
      currentHeading === null
    ) {
      return;
    }


    const rotation =
      normalizeDegree(
        qiblaBearing - currentHeading
      );


    elements.arrow.style.transform =
      `rotate(${rotation}deg)`;

  }


  // =====================================================
  // الحصول على اتجاه الجهاز
  // =====================================================

  function getHeading(event) {

    let heading = null;


    // أجهزة iPhone / iPad
    if (
      typeof event.webkitCompassHeading === "number" &&
      !Number.isNaN(event.webkitCompassHeading)
    ) {

      heading =
        event.webkitCompassHeading;

    }


    // المتصفحات الأخرى
    else if (
      typeof event.alpha === "number" &&
      !Number.isNaN(event.alpha)
    ) {

      heading =
        360 - event.alpha;

    }


    if (heading === null) {
      return;
    }


    currentHeading =
      normalizeDegree(heading);


    updateArrow();

  }


  // =====================================================
  // تشغيل البوصلة
  // =====================================================

  function startOrientation() {

    if (orientationStarted) {
      return;
    }


    const elements =
      getElements();


    if (
      !window.DeviceOrientationEvent
    ) {

      if (elements.status) {

        elements.status.textContent =
          "البوصلة غير مدعومة على هذا الجهاز";

      }

      return;

    }


    // أجهزة iOS الحديثة
    if (
      typeof DeviceOrientationEvent.requestPermission ===
      "function"
    ) {

      DeviceOrientationEvent
        .requestPermission()
        .then(function (permission) {

          if (permission !== "granted") {

            if (elements.status) {

              elements.status.textContent =
                "تم رفض إذن البوصلة";

            }

            if (elements.message) {

              elements.message.textContent =
                "اسمح للتطبيق باستخدام اتجاه الجهاز من إعدادات المتصفح.";

            }

            return;

          }


          activateOrientation();

        })
        .catch(function () {

          if (elements.status) {

            elements.status.textContent =
              "تعذر تشغيل البوصلة";

          }

        });

    }

    else {

      activateOrientation();

    }

  }


  // =====================================================
  // تفعيل مستشعر الاتجاه
  // =====================================================

  function activateOrientation() {

    const elements =
      getElements();


    if (orientationStarted) {
      return;
    }


    orientationStarted = true;


    window.addEventListener(
      "deviceorientation",
      getHeading,
      true
    );


    if (elements.status) {

      elements.status.textContent =
        "حرّك الهاتف لمعرفة اتجاه القبلة";

    }


    if (elements.message) {

      elements.message.textContent =
        "وجّه الهاتف في اتجاه السهم للوصول إلى القبلة.";

    }

  }


  // =====================================================
  // الحصول على الموقع
  // =====================================================

  function getLocation() {

    const elements =
      getElements();


    if (!navigator.geolocation) {

      if (elements.status) {

        elements.status.textContent =
          "تحديد الموقع غير مدعوم";

      }

      return;

    }


    if (elements.status) {

      elements.status.textContent =
        "جاري تحديد موقعك...";

    }


    navigator.geolocation.getCurrentPosition(

      function (position) {

        const latitude =
          position.coords.latitude;

        const longitude =
          position.coords.longitude;


        qiblaBearing =
          calculateQibla(
            latitude,
            longitude
          );


        updateQiblaInfo();


        if (elements.status) {

          elements.status.textContent =
            "تم تحديد اتجاه القبلة";

        }


        startOrientation();

      },


      function (error) {

        if (!elements.status) {
          return;
        }


        switch (error.code) {

          case error.PERMISSION_DENIED:

            elements.status.textContent =
              "تم رفض إذن الموقع";

            break;


          case error.POSITION_UNAVAILABLE:

            elements.status.textContent =
              "تعذر تحديد موقعك";

            break;


          case error.TIMEOUT:

            elements.status.textContent =
              "انتهى وقت تحديد الموقع";

            break;


          default:

            elements.status.textContent =
              "حدث خطأ أثناء تحديد الموقع";

        }


        if (elements.message) {

          elements.message.textContent =
            "اسمح للموقع بالوصول إلى موقعك ثم حاول مرة أخرى.";

        }

      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000
      }

    );

  }


  // =====================================================
  // بدء تحديد القبلة
  // =====================================================

  function startQibla() {

    const elements =
      getElements();


    if (elements.startButton) {

      elements.startButton.disabled = true;

      elements.startButton.textContent =
        "جاري التحديد...";

    }


    getLocation();


    setTimeout(function () {

      if (elements.startButton) {

        elements.startButton.disabled = false;

        elements.startButton.textContent =
          "إعادة تحديد القبلة";

      }

    }, 2000);

  }


  // =====================================================
  // تشغيل النظام
  // =====================================================

  function setupQibla() {

    const elements =
      getElements();


    if (!elements.startButton) {
      return;
    }


    elements.startButton.addEventListener(
      "click",
      startQibla
    );

  }


  // =====================================================
  // عند تحميل الصفحة
  // =====================================================

  document.addEventListener(
    "DOMContentLoaded",
    setupQibla
  );


})();
