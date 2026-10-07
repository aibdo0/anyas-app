# إصدار Android Release

## الحالة

المشروع يدعم الآن بناء `app-release.aab` موقّعًا، لكن التوقيع لا يعمل إلا بعد إضافة مفتاح الإصدار الدائم إلى GitHub Secrets. لا تضع ملف `.jks` أو كلمات المرور داخل المستودع.

## Secrets المطلوبة

أضف القيم التالية في إعدادات مستودع GitHub تحت **Settings → Secrets and variables → Actions**:

| اسم Secret | القيمة |
|---|---|
| `ANYAS_KEYSTORE_BASE64` | محتوى ملف keystore بعد تحويله إلى Base64 |
| `ANYAS_RELEASE_STORE_PASSWORD` | كلمة مرور ملف keystore |
| `ANYAS_RELEASE_KEY_ALIAS` | اسم المفتاح داخل keystore |
| `ANYAS_RELEASE_KEY_PASSWORD` | كلمة مرور المفتاح |

## تجهيز Secret الأول

نفّذ محليًا على جهاز آمن، وليس داخل المستودع:

```bash
base64 -w 0 anyas-release.jks
```

انسخ الناتج إلى Secret باسم `ANYAS_KEYSTORE_BASE64`. لا تحفظ الناتج في ملف داخل المشروع ولا ترسله في المحادثة.

## إنشاء مفتاح جديد

أنشئ مفتاحًا جديدًا فقط إذا لم يكن للتطبيق مفتاح Google Play سابقًا. احتفظ بنسخة احتياطية مشفرة من ملف keystore وكلمات المرور في مكانين آمنين. فقدان مفتاح التوقيع قد يمنع تحديث التطبيق المنشور.

مثال إنشاء مفتاح جديد:

```bash
keytool -genkeypair \
  -v \
  -keystore anyas-release.jks \
  -alias anyas \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

غيّر اسم alias والقيم وفق سياسة الأمان لديك، ولا تستخدم كلمات مرور تجريبية.

## ما يفعله GitHub Actions

1. يبني APK تصحيحيًا للاختبار كما كان سابقًا.
2. إذا وجد `ANYAS_KEYSTORE_BASE64`، يعيد إنشاء ملف keystore مؤقتًا داخل بيئة البناء.
3. يقرأ بقية بيانات التوقيع من Secrets.
4. يبني `app-release.aab` باستخدام `versionName` و`versionCode` المركزيين.
5. يرفع ملف AAB كـ artifact باسم `anyas-android-release-aab`.

إذا لم تضف Secrets بعد، سيستمر بناء APK التصحيحي، وسيتم تخطي خطوة AAB الموقّع بدلًا من استخدام توقيع غير آمن.

## ملاحظات Google Play

- استخدم Google Play App Signing عند إنشاء التطبيق إن كان متاحًا.
- لا تغيّر `applicationId` بعد أول نشر.
- ارفع `versionCode` في `data/app-version.js` مع كل إصدار جديد.
- اختبر نسخة Release على جهاز حقيقي قبل النشر.
- لا تنشر التطبيق قبل توثيق حقوق الصوت والصور والمحتوى.
