(() => {
  "use strict";

  const button = document.getElementById("copyFirebaseTokenButton");
  const status = document.getElementById("firebaseTokenStatus");
  if (!button || !status) return;

  const nativeToken = () => {
    try {
      return window.AnyasAndroid && typeof window.AnyasAndroid.getFirebaseToken === "function"
        ? String(window.AnyasAndroid.getFirebaseToken() || "").trim()
        : "";
    } catch (error) {
      return "";
    }
  };

  const copy = async text => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.append(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  };

  button.addEventListener("click", async () => {
    button.disabled = true;
    status.textContent = "جارٍ الحصول على رمز الجهاز…";
    let token = nativeToken();
    for (let attempt = 0; !token && attempt < 3; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 700));
      token = nativeToken();
    }
    if (!token) {
      status.textContent = "افتح التطبيق مع الإنترنت ثم أعد المحاولة.";
      button.disabled = false;
      return;
    }
    try {
      await copy(token);
      status.textContent = "تم نسخ الرمز؛ الصقه في اختبار Firebase.";
    } catch (error) {
      status.textContent = "تعذر النسخ تلقائيًا؛ حاول مرة أخرى.";
    } finally {
      button.disabled = false;
    }
  });
})();
