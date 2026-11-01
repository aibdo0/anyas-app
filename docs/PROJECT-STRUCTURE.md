# هيكل مشروع أنياس

يحتوي المستودع على نسخة ويب تقدمية (PWA) مستقلة وتطبيق Android أصلي بواجهة Kotlin وJetpack Compose. لا تُنسخ ملفات PWA إلى APK، ويُولّد Gradle فقط محتوى الأذكار المحلي والصوتيات التي يحتاجها Android.

## المجلدات الأساسية

| المسار | المسؤولية |
| --- | --- |
| `index.html` و`js/` و`css/` | واجهة PWA ووظائفها وتنسيقاتها |
| `js/core/` | تشغيل الويب واللغة والتخزين |
| `js/features/` | ميزات الصلاة والأذكار والقبلة والمهام والإعدادات للويب |
| `js/services/` | الصوت والكاش والتكاملات والخدمات المشتركة |
| `data/content/` | محتوى الأذكار والقرآن ومصادره |
| `data/config/` و`data/locations/` | إعدادات الإصدار والصوت والمدن |
| `android/app/src/main/java/com/anyas/app/NativeMainActivity.kt` | واجهة Android الأصلية والتنقل بـJetpack Compose |
| `android/app/src/main/java/com/anyas/app/NativePrayerCore.kt` | نماذج المدينة، وحساب المواقيت والقبلة، وقراءة محتوى الأذكار في Kotlin |
| `android/app/src/main/java/com/anyas/app/NativeQiblaCompass.kt` | صفحة البوصلة الحية ورسم اتجاه القبلة ومؤشرات الدقة والمعايرة |
| `android/app/src/main/java/com/anyas/app/NativeReminderSettings.kt` | حفظ واستيراد إعدادات التنبيهات وبناء لوحة التفضيلات الأصلية |
| `android/app/src/main/java/com/anyas/app/ReminderScheduler.kt` | جدولة التنبيهات محليًا وتحديث الويدجت |
| `android/app/src/main/java/com/anyas/app/ReminderReceiver.kt` | استقبال المنبهات وبناء إشعارات Android وفتح الواجهة الأصلية |
| `android/app/src/main/java/com/anyas/app/ReminderPlayerService.kt` | تشغيل وإيقاف صوت التذكير وإدارة إشعار الخدمة الأمامي |
| `android/app/src/main/java/com/anyas/app/NotificationHistory.kt` | سجل الإشعارات المحلي |
| `android/app/src/main/java/com/anyas/app/BootReceiver.kt` و`RainReceiver.kt` | إعادة الجدولة عند الإقلاع وفحص تنبيه المطر |
| `android/app/src/main/java/com/anyas/app/PrayerWidgetProvider.kt` | ويدجت مواقيت الصلاة وفتح النشاط الأصلي |
| `android/app/src/main/res/` | موارد Android الأصلية مثل الأيقونات والاختصارات والودجت |
| `tests/` | اختبارات smoke الحالية للتكامل |
| `.github/` | سير عمل GitHub Actions وقوالب المساهمة |
| `docs/` | توثيق التطوير والبنية والإصدار |

## قواعد مهمة

1. تعمل واجهة Android الجديدة محليًا، وتستخدم مكتبة Adhan Java من كود Kotlin لحساب مواقيت الصلاة. لا تستبدل الحساب المحلي بطلب شبكة إلزامي.
2. يبقى تطبيق PWA مصدرًا مستقلًا في الجذر؛ لا تنسخ ملفاته إلى أصول Android. يتولى Gradle توليد بيانات الأذكار والصوتيات اللازمة من المصدر.
3. ملفات `android/app/build/` و`android/app/src/main/res/raw/` مخرجات بناء؛ المصادر الأصلية للأذكار والصوت في `data/` و`audio/`.
4. ينشئ Gradle نسخة JSON محلية من `data/content/azkar-topics.js` للاستخدام الأصلي. عدّل المصدر، لا الملف المولّد.
5. أي محتوى جديد يحتاج مصدرًا وترخيصًا موثقين في `data/content/SOURCES.md`.
6. شغّل فحوصات JavaScript واختبارات smoke، ثم ابنِ APK Android قبل دمج التغييرات.
