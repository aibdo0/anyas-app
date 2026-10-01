(() => {
  const manual = {
    "أنياس": "Anias", "القاهرة": "Cairo", "مصر": "Egypt",
    "الفجر": "Fajr", "الشروق": "Sunrise", "الظهر": "Dhuhr", "العصر": "Asr", "المغرب": "Maghrib", "العشاء": "Isha",
    "عن التطبيق": "About the App", "معلومات أنياس ومصادره": "About Anias and its sources",
    "اللغة، المصادر، ومعلومات أنياس": "Language, sources, and app details",
    "رفيقك اليومي للعبادة وتنظيم يومك": "Your daily companion for worship and an organized day",
    "آخر إصدار رسمي: 1.1.5": "Latest official release: 1.1.5",
    "اختر لغة واجهة التطبيق. نصوص القرآن والأذكار الأصلية تبقى بالعربية.": "Choose the app language. Original Quran and adhkar texts remain in Arabic.",
    "لغة الواجهة": "Interface language", "العربية": "Arabic",
    "أذونات التطبيق": "App permissions", "الموقع": "Location",
    "اختياري؛ للمواقيت والقبلة والمساجد القريبة. يمكنك اختيار مدينة يدويًا دون منحه.": "Optional. Used for prayer times, Qibla, and nearby mosques. You can choose a city manually without granting it.",
    "اختياري؛ لعرض اتجاه القبلة عند فتح البوصلة، إذا كان جهازك يدعم ذلك.": "Optional. Used to show the Qibla direction when you open the compass, if your device supports it.",
    "الإشعارات": "Notifications",
    "اختيارية؛ لتذكيرات الصلاة والأذكار التي تفعّلها. لن تُرسل التنبيهات إذا رفضت الإذن.": "Optional. Used for the prayer and adhkar reminders you enable. Alerts will not be delivered if permission is denied.",
    "الاتصال بالإنترنت": "Internet access",
    "لجلب المواقيت والخرائط والحديث اليومي عند الحاجة.": "Used to retrieve prayer times, maps, and the daily hadith when needed.",
    "استعادة التذكيرات بعد إعادة التشغيل": "Restore reminders after restart",
    "إذن نظامي في أندرويد يعيد جدولة تذكيراتك المحفوظة بعد تشغيل الجهاز، ولا يحتاج نافذة موافقة.": "An Android system permission that restores your saved reminders after the device restarts; it does not show a permission prompt.",
    "اتجاه الجهاز والبوصلة": "Device orientation and compass",
    "اختياري؛ لعرض اتجاه القبلة على البوصلة عند فتحها، إذا كان جهازك يدعم ذلك.": "Optional. Used to point the Qibla compass when opened, if supported by your device.",
    "الظهور فوق التطبيقات الأخرى": "Display over other apps",
    "غير مستخدم وغير مطلوب في الإصدار الحالي؛ لا يحتاج أنياس إلى نافذة عائمة.": "Not used or required in this version. Anias does not need a floating window.",
    "تحسين البطارية": "Battery optimization",
    "اترك تحسين البطارية مفعّلًا؛ لا يحتاج التطبيق إلى استثنائه. إذا تأخرت التنبيهات، فقد يساعد السماح بعمله في الخلفية، لكن ذلك قد يزيد استهلاك البطارية قليلًا.": "Keep battery optimization enabled; the app does not need an exemption. If reminders are delayed, allowing background activity may help, but could slightly increase battery use.",
    "لا يطلب أنياس هذه الأذونات إلا عند الحاجة لوظيفتها، ويمكنك الرفض أو تغييرها من إعدادات جهازك. بعض بيانات الموقع تُرسل إلى خدمات التوقيت والخرائط عند استخدام تلك الميزات.": "Anias requests permissions only when their feature is used. You can deny or change them in your device settings. Some location data is sent to timing and map services when you use those features.",
    "كل إذن مرتبط بوظيفة محددة ولا يضر الجهاز بذاته. إذن الموقع يكشف موقعك عند استخدام ميزاته؛ امنحه فقط إذا رغبت فيها.": "Each permission serves a specific feature and does not harm your device by itself. Location permission reveals your location when you use those features; grant it only if you want them.",
    "إعدادات التذكيرات والإشعارات": "Reminder and notification settings",
    "نجمة واحدة": "One star", "نجمتان": "Two stars", "ثلاث نجوم": "Three stars", "أربع نجوم": "Four stars", "خمس نجوم": "Five stars",
    "إعدادات الموقع الجغرافي": "Location settings",
    "مصادر المحتوى": "Content sources", "القرآن الكريم": "The Quran",
    "نص عثماني من مشروع تنزيل، يُعرض كما ورد دون تغيير.": "Uthmani text from the Tanzil Project, displayed as provided without alteration.",
    "حديث اليوم": "Hadith of the day", "من موسوعة الحديث النبوي": "From the Prophetic Hadith Encyclopedia",
    "الأذكار": "Adhkar", "مبنية على أبواب حصن المسلم؛ والشروح الموجزة توضيحية وليست نصوصًا من المصدر.": "Based on Hisn al-Muslim chapters. Brief explanations are editorial and are not part of the source text.",
    "مواقيت الصلاة والتاريخ الهجري": "Prayer times and Hijri date",
    "تُحسب عبر": "Calculated via",
    "وفق موقعك وطريقة الحساب المختارة.": "according to your location and selected calculation method.",
    "المدن والمساجد": "Cities and mosques",
    "بحث الخرائط يعتمد على بيانات": "Map search uses data from",
    "مشروع تنزيل — مصدر نص القرآن": "Tanzil Project — Quran text source",
    "نحتاج رأيك": "We value your feedback", "الحصول على الدعم": "Get support",
    "اكتب وصفًا للمشكلة واختر طريقة مشاركته": "Describe the issue and choose how to share it",
    "الملاحظات والاقتراحات": "Feedback and suggestions",
    "شارك رأيك يدويًا، دون إرسال تلقائي": "Share your feedback yourself; nothing is sent automatically",
    "مشاركة التطبيق": "Share the app", "أرسل رابط أنياس لمن تحب": "Share the Anias link with someone",
    "تقييم التطبيق": "Rate the app", "قيّم التطبيق من نجمة إلى خمس نجوم": "Rate the app from one to five stars",
    "يُحفظ تقييمك على هذا الجهاز فقط؛ لا يوجد رابط متجر للتقييم حاليًا.": "Your rating is saved only on this device; no app-store rating link is configured yet.",
    "سياسة الخصوصية": "Privacy policy", "سياسة الخصوصية التفصيلية قيد الإعداد وستُضاف لاحقًا.": "A full privacy policy is planned and will be added later.",
    "قريبًا": "Coming soon", "ملاحظاتك": "Your feedback",
    "اكتب رسالتك، ثم اختر مشاركتها من قائمة جهازك.": "Write your message, then choose how to share it from your device.",
    "اكتب هنا…": "Write here…", "مشاركة الرسالة": "Share message", "نسخ الرسالة": "Copy message",
    "إعدادات الموقع الجغرافي": "Location settings",
    "اختر مدينة يدويًا أو استخدم موقعك لحساب المواقيت والقبلة والمساجد القريبة. إذن الموقع اختياري.": "Choose a city manually or use your location for prayer times, Qibla, and nearby mosques. Location permission is optional.",
    "استخدام موقعي الحالي": "Use my current location", "اختيار المدينة يدويًا": "Choose a city manually",
    "خلفية حسب وقت اليوم": "Background by time of day",
    "تتغير تلقائيًا بين الفجر والنهار والغروب والليل": "Automatically changes between dawn, day, sunset, and night",
    "تفعيل الخلفيات حسب وقت اليوم": "Enable time-based backgrounds",
    "خلفية الفجر مفعّلة — تتغير تلقائيًا حسب ساعة جهازك": "Dawn background enabled — changes automatically with your device clock",
    "خلفية النهار مفعّلة — تتغير تلقائيًا حسب ساعة جهازك": "Day background enabled — changes automatically with your device clock",
    "خلفية الغروب مفعّلة — تتغير تلقائيًا حسب ساعة جهازك": "Sunset background enabled — changes automatically with your device clock",
    "خلفية الليل مفعّلة — تتغير تلقائيًا حسب ساعة جهازك": "Night background enabled — changes automatically with your device clock",
    "الليل": "Night", "النهار": "Daytime", "الغروب": "Sunset",
    "الخلفية التلقائية متوقفة": "Automatic background is off",
    "ظهر خطأ أثناء المشاركة. يمكنك نسخ الرسالة بدلًا من ذلك.": "Sharing failed. You can copy the message instead.",
    "تم نسخ الرسالة": "Message copied", "لم نتمكن من النسخ؛ يمكنك تحديد الرسالة ونسخها يدويًا.": "Could not copy. You can select and copy the message manually.",
    "شكرًا لتقييم أنياس!": "Thank you for rating Anias!", "لا توجد قناة دعم رسمية مضافة بعد.": "No official support contact is configured yet.",
    "تم حفظ تقييمك على هذا الجهاز فقط.": "Your rating was saved on this device only.",
    "اكتب رسالتك أولًا.": "Write your message first.",
    "تم فتح قائمة المشاركة على جهازك.": "Your device's share menu was opened.",
    "تم نسخ رابط التطبيق": "App link copied",
    "لا توجد قناة دعم رسمية مضافة بعد.": "No official support contact is configured yet.",
    "تعذر حفظ التقييم على هذا الجهاز.": "Could not save the rating on this device.",
    "آخر إصدار رسمي: 1.1.5": "Latest official release: 1.1.5",
    "سورة الرعد — 28": "Surah Ar-Ra'd — 28", "مدينة الصلاة": "Prayer location",
    "غدًا": "Tomorrow", "الشهر الهجري": "Hijri month", "بدون تعديل": "No adjustment",
    "يوم سابق": "Previous day", "يوم لاحق": "Next day",
    "تتبع المظهر في جهازك": "Follow your device appearance", "المظهر الفاتح مفعّل": "Light appearance enabled", "المظهر الداكن مفعّل": "Dark appearance enabled"
  };

  const protectedSelector = [
    "script", "style", "textarea", "input",
    ".azkar-favorite-text", ".azkar-detail-text", ".azkar-item-text", ".dhikr-text", ".dhikr-arabic", ".zikr-text", ".zikr-meaning", ".wird-item-text", ".dhikr-goal-card h3",
    ".quran-text", ".quran-verse", ".verse-text", ".verse-arabic", ".ayah-text",
    ".hadith-text", ".hadith-arabic", ".arabic-text", ".tasbeeh-selected-dhikr", ".tasbeeh-preset", "[data-sacred-text]"
  ].join(",");

  let dictionary = { ...manual };
  let reverse = {};
  let forwardPairs = [];
  let reversePairs = [];
  let current = "ar";
  const originalTextNodes = new WeakMap();
  const renderedTextNodes = new WeakMap();
  const originalAttributes = new WeakMap();
  const renderedAttributes = new WeakMap();
  const rebuildReverse = () => {
    reverse = {};
    for (const [ar, en] of Object.entries(dictionary)) if (en && !reverse[en]) reverse[en] = ar;
    const prepare = map => Object.entries(map).filter(([key, result]) => key.length > 4 && result && key !== result).sort((a, b) => b[0].length - a[0].length);
    forwardPairs = prepare(dictionary);
    reversePairs = prepare(reverse);
  };
  rebuildReverse();

  const normalize = value => String(value).replace(/\s+/g, " ").trim();
  const latinDigits = value => value.replace(/[٠-٩]/g, digit => "٠١٢٣٤٥٦٧٨٩".indexOf(digit));
  const arabicDigits = value => value.replace(/[0-9]/g, digit => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]);
  const translatePhrase = (value, target) => {
    const source = normalize(value);
    const exact = target === "en" ? dictionary[source] : reverse[source];
    if (exact) return exact;
    let output = source;
    const pairs = target === "en" ? forwardPairs : reversePairs;
    for (const [key, result] of pairs) output = output.split(key).join(result);
    return output;
  };

  const shouldProtect = node => {
    const parent = node.parentElement;
    return !parent || Boolean(parent.closest(protectedSelector));
  };
  const translateTextNode = node => {
    if (shouldProtect(node)) return;
    const currentValue = node.nodeValue || "";
    if (!originalTextNodes.has(node) || renderedTextNodes.get(node) !== currentValue) originalTextNodes.set(node, currentValue);
    const sourceValue = originalTextNodes.get(node) || "";
    const leading = sourceValue.match(/^\s*/)?.[0] || "";
    const trailing = sourceValue.match(/\s*$/)?.[0] || "";
    const core = normalize(sourceValue);
    if (!core) return;
    let translated = translatePhrase(core, current);
    translated = current === "en" ? latinDigits(translated) : arabicDigits(translated);
    const next = leading + translated + trailing;
    renderedTextNodes.set(node, next);
    if (next !== currentValue) node.nodeValue = next;
  };
  const translateElement = element => {
    if (!(element instanceof Element)) return;
    const originals = originalAttributes.get(element) || {};
    const rendered = renderedAttributes.get(element) || {};
    for (const attribute of ["placeholder", "aria-label", "title"]) {
      const value = element.getAttribute(attribute);
      if (value) {
        if (!(attribute in originals) || rendered[attribute] !== value) originals[attribute] = value;
        const translated = translatePhrase(originals[attribute], current);
        rendered[attribute] = translated;
        if (translated !== value) element.setAttribute(attribute, translated);
      }
    }
    originalAttributes.set(element, originals);
    renderedAttributes.set(element, rendered);
  };
  const applyTranslations = root => {
    const base = root?.nodeType === Node.ELEMENT_NODE ? root : document.documentElement;
    translateElement(base);
    const walker = document.createTreeWalker(base, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) translateTextNode(node);
    if (base.querySelectorAll) base.querySelectorAll("[placeholder],[aria-label],[title]").forEach(translateElement);
  };

  window.anyasTranslate = (value, language = current) => translatePhrase(value, language);
  window.setAppLanguage = (language, persist = true) => {
    current = language === "en" ? "en" : "ar";
    document.documentElement.lang = current;
    document.documentElement.dir = current === "en" ? "ltr" : "rtl";
    document.title = current === "en" ? "Anias — Islamic Companion" : "أنياس";
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = current === "en"
      ? "Anias — a daily companion for prayer times, the Quran, and adhkar."
      : "أنياس - رفيق يومي لمواقيت الصلاة والقرآن والأذكار";
    document.querySelectorAll("#languageSelect, #aboutLanguageSelect").forEach(select => { select.value = current; });
    if (persist) {
      try { localStorage.setItem("anyas_language", current); } catch (error) { /* locale still applies in memory */ }
    }
    applyTranslations(document.documentElement);
    window.dispatchEvent(new CustomEvent("anyas:languagechange", { detail: { language: current } }));
  };

  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === "characterData") translateTextNode(record.target);
      else {
        record.addedNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
          else if (node.nodeType === Node.ELEMENT_NODE) applyTranslations(node);
        });
        if (record.type === "attributes") translateElement(record.target);
      }
    }
  });
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["placeholder", "aria-label", "title"] });

  try { current = localStorage.getItem("anyas_language") === "en" ? "en" : "ar"; } catch (error) { current = "ar"; }
  document.documentElement.lang = current;
  document.documentElement.dir = current === "en" ? "ltr" : "rtl";
  fetch("data/en-ui-translations.json?v=20261001-1")
    .then(response => { if (!response.ok) throw new Error("translation data unavailable"); return response.json(); })
    .then(data => {
      dictionary = { ...data, ...manual };
      rebuildReverse();
      window.setAppLanguage(current, false);
    })
    .catch(() => window.setAppLanguage(current, false));
})();
