// مشاركة آية/حديث اليوم كصورة (مقاس ٩:١٦ مناسب لحالة واتساب) بنفس هوية التطبيق.
(function () {
  "use strict";
  var W = 1080, H = 1920, GOLD = "#e3c98f", GOLD2 = "#c6a363";

  function wrap(ctx, text, maxWidth) {
    var words = String(text).replace(/\s+/g, " ").trim().split(" "), lines = [], line = "";
    words.forEach(function (w) {
      var test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; } else line = test;
    });
    if (line) lines.push(line);
    return lines;
  }

  function loadImage(src) {
    return new Promise(function (res) {
      var img = new Image();
      img.onload = function () { res(img); };
      img.onerror = function () { res(null); };
      img.src = src;
    });
  }

  async function render(kind, text, reference) {
    try {
      await Promise.all([document.fonts.load("700 60px Amiri"), document.fonts.load("800 40px Tajawal"), document.fonts.load("400 40px Amiri")]);
    } catch (e) { /* الخط الاحتياطي يكفي */ }
    var canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext("2d");
    ctx.direction = "rtl"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";

    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0d111c"); bg.addColorStop(1, "#171821");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    var photo = await loadImage("assets/prayer-hero.jpg");
    if (photo) {
      var ph = 760, scale = Math.max(W / photo.width, ph / photo.height);
      var dw = photo.width * scale, dh = photo.height * scale;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, H - ph, W, ph); ctx.clip();
      ctx.drawImage(photo, (W - dw) / 2, H - ph + (ph - dh) / 2, dw, dh);
      ctx.restore();
      var fade = ctx.createLinearGradient(0, H - ph, 0, H);
      fade.addColorStop(0, "#0f1320"); fade.addColorStop(.45, "rgba(15,19,32,.55)"); fade.addColorStop(1, "rgba(10,10,16,.35)");
      ctx.fillStyle = fade; ctx.fillRect(0, H - ph, W, ph);
    }

    // إطار ذهبي رفيع
    ctx.strokeStyle = "rgba(227,201,143,.55)"; ctx.lineWidth = 3;
    ctx.strokeRect(54, 54, W - 108, H - 108);
    ctx.strokeStyle = "rgba(227,201,143,.22)"; ctx.lineWidth = 1.5;
    ctx.strokeRect(72, 72, W - 144, H - 144);

    // العنوان بين خطين ذهبيين
    var title = kind === "ayah" ? "آية اليوم" : "حديث اليوم";
    ctx.fillStyle = GOLD; ctx.font = "800 54px Tajawal, sans-serif";
    ctx.fillText(title, W / 2, 250);
    var tw = ctx.measureText(title).width;
    ctx.strokeStyle = GOLD2; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(W / 2 - tw / 2 - 150, 234); ctx.lineTo(W / 2 - tw / 2 - 30, 234); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W / 2 + tw / 2 + 30, 234); ctx.lineTo(W / 2 + tw / 2 + 150, 234); ctx.stroke();

    // النص: يصغَّر الخط تدريجيًا حتى يتّسع
    var body = kind === "ayah" ? text : text;
    var maxW = W - 240, top = 340, bottom = 1130, size = kind === "ayah" ? 78 : 66, lines, lh;
    for (; size >= 34; size -= 2) {
      ctx.font = "700 " + size + "px Amiri, serif";
      lines = wrap(ctx, body, maxW); lh = size * 1.85;
      if (lines.length * lh <= bottom - top) break;
    }
    var blockH = lines.length * lh, y = top + (bottom - top - blockH) / 2 + size;
    ctx.fillStyle = "#fff8e8";
    ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 12;
    lines.forEach(function (l) { ctx.fillText(l, W / 2, y); y += lh; });
    ctx.shadowBlur = 0;

    // المرجع
    if (reference) {
      ctx.fillStyle = GOLD; ctx.font = "700 44px Tajawal, sans-serif";
      ctx.fillText(reference, W / 2, Math.min(y + 40, 1220));
    }

    // الاسم
    ctx.fillStyle = "#fff"; ctx.font = "800 64px Tajawal, sans-serif";
    ctx.fillText("أنياس", W / 2, H - 150);
    ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.font = "500 32px Tajawal, sans-serif";
    ctx.fillText("رفيقك اليومي للصلاة والذكر", W / 2, H - 100);
    return canvas;
  }

  function toBlob(canvas) { return new Promise(function (res) { canvas.toBlob(res, "image/png"); }); }
  function toBase64(canvas) { return canvas.toDataURL("image/png").split(",")[1]; }

  var note;
  function say(msg) {
    var el = document.getElementById("homeShareStatus");
    if (!el) return;
    el.hidden = false; el.textContent = msg;
    clearTimeout(note); note = setTimeout(function () { el.hidden = true; }, 3500);
  }

  async function share(kind) {
    var id = kind === "ayah" ? ["dailyAyahText", "dailyAyahReference"] : ["dailyHadithText", "dailyHadithReference"];
    var text = (document.getElementById(id[0]) || {}).textContent || "";
    var ref = (document.getElementById(id[1]) || {}).textContent || "";
    ref = ref.replace(/\s*اليوم\s*[\d٠-٩]+\s*هجريًا?/g, "").trim();
    if (!text.trim()) return;
    say("جارٍ تجهيز الصورة…");
    try {
      var canvas = await render(kind, text, ref);
      if (window.AnyasAndroid && typeof window.AnyasAndroid.shareImage === "function") {
        window.AnyasAndroid.shareImage(toBase64(canvas), kind === "ayah" ? "آية اليوم" : "حديث اليوم");
        say("");
        return;
      }
      var blob = await toBlob(canvas);
      var file = new File([blob], "anyas-" + kind + ".png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: kind === "ayah" ? "آية اليوم" : "حديث اليوم" });
        say("تم فتح قائمة المشاركة.");
      } else {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = "anyas-" + kind + ".png";
        document.body.appendChild(a); a.click(); a.remove();
        say("تم حفظ الصورة.");
      }
    } catch (e) {
      if (e && e.name === "AbortError") { say(""); return; }
      say("تعذرت مشاركة الصورة. حاول مرة أخرى.");
    }
  }

  async function shareCustom(text, ref, notify) {
    var tell = notify || function () {};
    if (!String(text || "").trim()) return;
    tell("جارٍ تجهيز الصورة…");
    try {
      var canvas = await render("ayah", text, ref);
      if (window.AnyasAndroid && typeof window.AnyasAndroid.shareImage === "function") {
        window.AnyasAndroid.shareImage(toBase64(canvas), ref || "آية");
        tell("");
        return;
      }
      var blob = await toBlob(canvas);
      var file = new File([blob], "anyas-ayah.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: ref || "آية" });
        tell("");
      } else {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = "anyas-ayah.png";
        document.body.appendChild(a); a.click(); a.remove();
        tell("تم حفظ الصورة.");
      }
    } catch (e) {
      if (e && e.name === "AbortError") { tell(""); return; }
      tell("تعذرت مشاركة الصورة. حاول مرة أخرى.");
    }
  }

  window.anyasShareImage = { render: render, share: share, shareCustom: shareCustom };

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-share-daily]").forEach(function (btn) {
      btn.addEventListener("click", function (e) { e.stopPropagation(); share(btn.dataset.shareDaily); });
    });
  });
})();
