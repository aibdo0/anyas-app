# بناء وإصدار Android

## البناء التجريبي

يتولى GitHub Actions تشغيل فحص JavaScript واختبارات smoke ثم بناء APK تجريبي:

```bash
gradle --no-daemon -p android assembleDebug
```

ملف APK الناتج هو `android/app/build/outputs/apk/debug/app-debug.apk`.

## البناء الرسمي

الإصدار الرسمي المفضل للنشر على Google Play هو Android App Bundle:

```bash
gradle --no-daemon -p android bundleRelease
```

يتطلب البناء الرسمي أربعة أسرار في إعدادات المستودع:

- `ANYAS_KEYSTORE_BASE64`
- `ANYAS_RELEASE_STORE_PASSWORD`
- `ANYAS_RELEASE_KEY_ALIAS`
- `ANYAS_RELEASE_KEY_PASSWORD`

لا ترفع ملف keystore أو كلمات المرور إلى المستودع. ينشئ Workflow ملف التوقيع مؤقتًا أثناء البناء ويحذفه مع بيئة التنفيذ.

## الصوتيات وحجم التطبيق

تُضمّن أصوات الأذان والتنبيهات القصيرة اللازمة للعمل دون اتصال. أما تسجيلات أذكار الصباح والمساء والاستيقاظ والنوم فتُحمّل عند الطلب من مدير الصوت الاختياري، ولا تدخل APK. تظل تذكيرات Android الخاصة بالورد تعمل كإشعارات نصية دون تشغيل تسجيل طويل في الخلفية.

## مصدر ملفات التطبيق

يقرأ Android ملفات الويب من جذر المشروع أثناء مهمة `syncWebAssets`. أما الصوتيات المطلوبة للتذكيرات فتُنسخ إلى موارد Android من قائمة المراجع الموجودة في كود Java. لذلك لا تعدّل الملفات الناتجة داخل `android/app/src/main/assets` أو `android/app/src/main/res/raw` يدويًا.

## قبل النشر

اختبر الإشعارات بعد إعادة تشغيل الجهاز، ومواقيت الصلاة، والصوت في الخلفية، والموقع والقبلة، والعمل دون اتصال. راجع كذلك سياسة الخصوصية ومصادر الأصول قبل إنشاء GitHub Release أو رفع AAB إلى Google Play.
