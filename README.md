# أنياس (Anyas)

أنياس تطبيق عربي لمتابعة الصلاة والأذكار والقرآن والقبلة والمهام اليومية. يضم المشروع نسخة ويب تقدمية (PWA) مستقلة وتطبيق Android أصليًا مبنيًا بـKotlin وJetpack Compose.

## مكونات المشروع

- **PWA / Web:** واجهة الويب في `index.html`، والوظائف في `js/`، والتنسيقات في `css/`.
- **المحتوى:** بيانات الأذكار والقرآن والإعدادات في `data/`، والأصول في `assets/`، والتسجيلات في `audio/`.
- **Android:** الواجهة والمواقيت وبوصلة القبلة الحية والبحث الاختياري عن المساجد القريبة واتجاهات المشي وإعدادات التذكيرات والجدولة ومستقبِلات الإشعارات والإقلاع والمطر والويدجت وسجل الإشعارات تستخدم Kotlin. يُطلب إذن الموقع عند بدء بحث المساجد فقط، وتُرسل الإحداثيات إلى OpenStreetMap لإجراء البحث دون حفظها داخل التطبيق. لا يضم APK نسخة مكررة من ملفات PWA.
- **الاختبارات:** فحوصات التكامل الحالية في `tests/smoke.mjs`، والتحقق من كتالوج الصوت في `tools/validate-audio-catalog.mjs`.
- **الأتمتة:** GitHub Actions تنفذ الفحوصات وبناء APK عند الدفع إلى `main` أو `android/apk-wrapper`، وعند فتح طلب دمج إلى `main`، أو بالتشغيل اليدوي.

## تشغيل نسخة الويب محليًا

يمكن تشغيل نسخة الويب من جذر المشروع عبر خادم ملفات ثابت:

```bash
python3 -m http.server 8080
```

ثم افتح `http://localhost:8080`.

## الاختبارات

```bash
for file in $(find js data -type f -name '*.js' | sort); do node --check "$file"; done
node tools/validate-audio-catalog.mjs
node tests/smoke.mjs
```

## بناء تطبيق Android

يتطلب البناء Java 17 وAndroid SDK وGradle 8.10.2:

```bash
gradle --no-daemon -p android assembleDebug
```

ينتج APK التجربة في `android/app/build/outputs/apk/debug/app-debug.apk`. أثناء البناء تُنشأ أصول التطبيق من المصادر في جذر المشروع، ويُحوّل محتوى حصن المسلم إلى JSON محلي لتقرأه شاشة Kotlin. لا تعدّل الملفات الناتجة في `android/app/src/main/assets` أو `android/app/src/main/res/raw` يدويًا.

## ملاحظات

- التحويل إلى Android أصلي مرحلي، ولم تُنقل كل ميزات الويب بعد. راجع `docs/ANDROID-RELEASE.md` لمعرفة نطاق المرحلة الحالية.
- تفاصيل تقسيم الملفات موجودة في `docs/PROJECT-STRUCTURE.md`، وتفاصيل التغييرات في `CHANGELOG.md`.
- راجع `data/content/SOURCES.md` قبل نشر أي محتوى أو أصل جديد، ووثّق مصدره وترخيصه.
