package com.anyas.app;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;

final class ReminderScheduler {
    static final String PREFS = "anyas_reminders";
    private static final int DAILY = 0;
    private static final int SATURDAY = Calendar.SATURDAY;

    static void scheduleSaved(Context context) {
        try {
            String raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("settings", "{}");
            JSONObject data = new JSONObject(raw);
            JSONObject enabled = data.optJSONObject("enabled");
            JSONObject prayers = data.optJSONObject("prayers");
            boolean sound = data.optBoolean("sound", true);
            JSONObject volumes = data.optJSONObject("volumes");
            String morningVoice = data.optString("morningVoice", "mishary");
            String eveningVoice = data.optString("eveningVoice", "mishary");
            String ayatVoice = data.optString("ayatVoice", "mishary");
            AlarmManager alarm = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            cancelKnown(context, alarm);
            List<Reminder> reminders = new ArrayList<>();

            addDaily(reminders, enabled, "notifyWardAwakening", "أذكار الاستيقاظ", "04:30", "adhkar-wakeup-mishary-alafasy.mp3");
            addDaily(reminders, enabled, "notifyWardMorning", "أذكار الصباح", "05:30", "ahmed".equals(morningVoice) ? "adhkar-morning-ahmed-al-nafis.mp3" : "adhkar-morning-mishary-alafasy.mp3");
            addDaily(reminders, enabled, "notifyWardGeneral", "أذكار اليوم", "12:00", null);
            addDaily(reminders, enabled, "notifyWardEvening", "أذكار المساء", "15:30", "ahmed".equals(eveningVoice) ? "adhkar-evening-ahmed-al-nafis.mp3" : "adhkar-evening-mishary-alafasy.mp3");
            addDaily(reminders, enabled, "notifyWardSleep", "أذكار النوم", "20:00", "adhkar-sleep-mishary-alafasy.mp3");
            addDaily(reminders, enabled, "notifyWardSahar", "استغفار السحر", "02:00", "qiyam-al-layl-reminder.mp3");
            addDaily(reminders, enabled, "notifyHadith", "حديث اليوم", "12:30", "hadith-reminder.mp3");
            addDaily(reminders, enabled, "notifyBaqiyat", "الباقيات الصالحات", "14:00", "baqiyat-as-salihat-reminder.mp3");
            addDaily(reminders, enabled, "notifySalawat_1", "الصلاة على النبي ﷺ", "10:00", "salawat-reminder-1.mp3");
            addDaily(reminders, enabled, "notifySalawat_2", "الصلاة على النبي ﷺ", "17:00", "salawat-reminder-2.mp3");
            addDaily(reminders, enabled, "notifyAyatKursi", "آية الكرسي", "21:00", ayatSound(ayatVoice));

            String sunrise = time(prayers, "Sunrise");
            if (enabled(enabled, "notifySunrise") && sunrise != null) addDaily(reminders, "notifySunrise", "الشروق", sunrise, "sunrise-birds.mp3");
            if (enabled(enabled, "notifyDuha") && sunrise != null) addDaily(reminders, "notifyDuha", "صلاة الضحى", plusMinutes(sunrise, 30), "duha-prayer-reminder.mp3");
            if (enabled(enabled, "beforeFajrReminder")) {
                String fajr = time(prayers, "Fajr");
                if (fajr != null) addDaily(reminders, "beforeFajrReminder", "تنبيه قبل الفجر", minusMinutes(fajr, 30), "before-fajr-30min.mp3");
            }
            if (enabled(enabled, "notifyPrayerSoon") && prayers != null) {
                String[][] prayerNames = {{"Fajr", "الفجر", "before-prayer-fajr.mp3"}, {"Dhuhr", "الظهر", "before-prayer-dhuhr.mp3"}, {"Asr", "العصر", "before-prayer-asr.mp3"}, {"Maghrib", "المغرب", "before-prayer-maghrib.mp3"}, {"Isha", "العشاء", "before-prayer-isha.mp3"}};
                for (String[] prayer : prayerNames) {
                    String prayerTime = time(prayers, prayer[0]);
                    if (prayerTime != null) addDaily(reminders, "prayer_" + prayer[0], "اقترب موعد صلاة " + prayer[1], minusMinutes(prayerTime, 15), prayer[2]);
                }
            }

            addWeekly(reminders, enabled, "notifyFastingThursday1", "صيام الخميس", "fasting-thursday-reminder-1.mp3", Calendar.WEDNESDAY, "20:00");
            addWeekly(reminders, enabled, "notifyFastingThursday2", "صيام الخميس", "fasting-thursday-reminder-2.mp3", Calendar.WEDNESDAY, "20:00");
            addWeekly(reminders, enabled, "notifyFastingMonday", "صيام الاثنين", "fasting-monday-reminder.mp3", Calendar.SUNDAY, "20:00");
            addWeekly(reminders, enabled, "notifyFastingFisabilillah", "صيام في سبيل الله", "fasting-fisabilillah-reminder.mp3", SATURDAY, "20:00");

            if (enabled(enabled, "notifyFridayKahf") && prayers != null) {
                String fajr = time(prayers, "Fajr");
                if (fajr != null) addWeekly(reminders, "notifyFridayKahf", "سورة الكهف", fajr, null, Calendar.FRIDAY);
            }
            if (enabled(enabled, "notifyFridayPrayer") && prayers != null) {
                String dhuhr = time(prayers, "Dhuhr");
                if (dhuhr != null) addWeekly(reminders, "notifyFridayPrayer", "صلاة الجمعة", minusMinutes(dhuhr, 45), "friday-prayer-reminder.mp3", Calendar.FRIDAY);
            }
            if (enabled(enabled, "notifyFridayHour") && prayers != null) {
                String asr = time(prayers, "Asr");
                if (asr != null) addWeekly(reminders, "notifyFridayHour", "ساعة الإجابة", asr, null, Calendar.FRIDAY);
            }
            if (enabled(enabled, "notifyFridaySalawat") && prayers != null) {
                String maghrib = time(prayers, "Maghrib");
                if (maghrib != null) addWeekly(reminders, "notifyFridaySalawat", "الصلاة على النبي ﷺ", maghrib, null, Calendar.THURSDAY);
            }

            if (enabled(enabled, "notifyLastThird") && prayers != null) {
                String target = lastThirdStart(time(prayers, "Maghrib"), time(prayers, "Fajr"));
                if (target != null) addDaily(reminders, "notifyLastThird", "الثلث الأخير من الليل", target, "qiyam-al-layl-reminder.mp3");
            }
            for (Reminder reminder : reminders) scheduleOne(context, alarm, reminder, sound, volumes);
            if (enabled(enabled, "notifyRainSunnah")) RainReceiver.schedule(context);
            else RainReceiver.cancel(context);
        } catch (Exception ignored) {
        }
    }

    private static void addDaily(List<Reminder> list, JSONObject enabled, String key, String title, String time, String soundFile) {
        if (enabled(enabled, key)) list.add(new Reminder(key, title, time, reminderBody(key, title), soundFile, DAILY));
    }

    private static void addDaily(List<Reminder> list, String key, String title, String time, String soundFile) {
        list.add(new Reminder(key, title, time, reminderBody(key, title), soundFile, DAILY));
    }

    private static void addWeekly(List<Reminder> list, JSONObject enabled, String key, String title, String soundFile, int weekday, String time) {
        if (enabled(enabled, key)) list.add(new Reminder(key, title, time, reminderBody(key, title), soundFile, weekday));
    }

    private static void addWeekly(List<Reminder> list, String key, String title, String time, String soundFile, int weekday) {
        list.add(new Reminder(key, title, time, reminderBody(key, title), soundFile, weekday));
    }

    private static String reminderBody(String key, String title) {
        if (key.startsWith("prayer_")) return "تبقّى ١٥ دقيقة على موعد الصلاة.";
        if ("beforeFajrReminder".equals(key)) return "تبقّى ٣٠ دقيقة على الفجر؛ استعد للصلاة.";
        if (key.startsWith("notifyWard")) return "حان وقت وردك؛ خذ دقيقة للذكر وافتح أنياس.";
        if (key.startsWith("notifyFasting")) return "تذكير بصيام الغد؛ استعد للسحور إن رغبت.";
        if ("notifyHadith".equals(key)) return "اقرأ حديث اليوم وخذ منه ما ينفعك.";
        if ("notifyAyatKursi".equals(key)) return "لحظة للذكر وقراءة آية الكرسي.";
        if ("notifySalawat_1".equals(key) || "notifySalawat_2".equals(key) || "notifyFridaySalawat".equals(key)) return "أكثر من الصلاة على النبي ﷺ.";
        if ("notifyBaqiyat".equals(key)) return "جدّد وردك من الباقيات الصالحات.";
        if ("notifyLastThird".equals(key)) return "هذه ساعة مباركة للدعاء والقيام.";
        if ("notifySunrise".equals(key)) return "حان وقت الشروق؛ ابدأ يومك بهدوء.";
        if ("notifyDuha".equals(key)) return "حان وقت صلاة الضحى.";
        if ("notifyRainSunnah".equals(key)) return "عند نزول المطر، ادعُ بما تحب وتذكّر السنة.";
        if ("notifyFridayKahf".equals(key)) return "لا تنس قراءة سورة الكهف اليوم.";
        if ("notifyFridayPrayer".equals(key)) return "اقترب وقت صلاة الجمعة؛ استعد لها.";
        if ("notifyFridayHour".equals(key)) return "وقت للدعاء من بعد العصر إلى المغرب.";
        return "حان وقت " + title + ". افتح أنياس للتفاصيل.";
    }

    static void scheduleOne(Context context, AlarmManager alarm, Reminder reminder, boolean sound, JSONObject volumes) {
        try {
            Calendar target = Calendar.getInstance();
            String[] parts = reminder.time.split(":");
            target.set(Calendar.HOUR_OF_DAY, Integer.parseInt(parts[0]));
            target.set(Calendar.MINUTE, Integer.parseInt(parts[1]));
            target.set(Calendar.SECOND, 0);
            target.set(Calendar.MILLISECOND, 0);
            if (reminder.weekday != DAILY) {
                target.set(Calendar.DAY_OF_WEEK, reminder.weekday);
                while (target.getTimeInMillis() <= System.currentTimeMillis()) target.add(Calendar.WEEK_OF_YEAR, 1);
            } else if (target.getTimeInMillis() <= System.currentTimeMillis()) {
                target.add(Calendar.DAY_OF_YEAR, 1);
            }
            Intent intent = new Intent(context, ReminderReceiver.class)
                    .putExtra("id", reminder.id)
                    .putExtra("title", reminder.title)
                    .putExtra("body", reminder.body)
                    .putExtra("sound", sound)
                    .putExtra("soundFile", reminder.soundFile == null ? "" : reminder.soundFile)
                    .putExtra("volume", volumeFor(volumes, reminder.soundFile))
                    .putExtra("time", reminder.time);
            PendingIntent pending = PendingIntent.getBroadcast(context, requestCode(reminder.id), intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, target.getTimeInMillis(), pending);
        } catch (Exception ignored) {
        }
    }

    static void cancelKnown(Context context, AlarmManager alarm) {
        String[] ids = {"notifyWardAwakening", "notifyWardMorning", "notifyWardGeneral", "notifyWardEvening", "notifyWardSleep", "notifyWardSahar", "notifyHadith", "notifyBaqiyat", "notifySalawat_1", "notifySalawat_2", "notifyAyatKursi", "notifySunrise", "notifyDuha", "beforeFajrReminder", "notifyLastThird", "notifyFastingThursday1", "notifyFastingThursday2", "notifyFastingMonday", "notifyFastingFisabilillah", "notifyFridayKahf", "notifyFridayPrayer", "notifyFridayHour", "notifyFridaySalawat", "prayer_Fajr", "prayer_Dhuhr", "prayer_Asr", "prayer_Maghrib", "prayer_Isha"};
        for (String id : ids) cancel(context, alarm, id);
    }

    static void cancel(Context context, AlarmManager alarm, String id) {
        Intent intent = new Intent(context, ReminderReceiver.class);
        PendingIntent pending = PendingIntent.getBroadcast(context, requestCode(id), intent, PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
        if (pending != null) alarm.cancel(pending);
    }

    static int requestCode(String id) { return id.hashCode() & 0x7fffffff; }
    private static float volumeFor(JSONObject volumes, String file) {
        if (volumes == null || file == null) return 1f;
        String key;
        if (file.startsWith("adhkar-wakeup")) key = "wakeupWard";
        else if (file.startsWith("adhkar-morning")) key = "morningWard";
        else if (file.startsWith("adhkar-evening")) key = "eveningWard";
        else if (file.startsWith("adhkar-sleep")) key = "sleepWard";
        else if (file.startsWith("ayat-al-kursi")) key = "ayatKursi";
        else if (file.startsWith("before-fajr")) key = "beforeFajr";
        else return 1f;
        return Math.max(0f, Math.min(1f, (float) volumes.optDouble(key, 100d) / 100f));
    }
    static boolean enabled(JSONObject enabled, String key) { return enabled != null && enabled.optBoolean(key, false); }
    static String time(JSONObject object, String key) { if (object == null) return null; String value = object.optString(key, ""); return value.matches("\\d{1,2}:\\d{2}(:\\d{2})?") ? value.substring(0, 5) : null; }
    static String minusMinutes(String value, int amount) { return shiftMinutes(value, -amount); }
    static String plusMinutes(String value, int amount) { return shiftMinutes(value, amount); }
    static String shiftMinutes(String value, int amount) { try { String[] p = value.split(":"); int total = (Integer.parseInt(p[0]) * 60 + Integer.parseInt(p[1]) + amount + 1440) % 1440; return String.format(java.util.Locale.US, "%02d:%02d", total / 60, total % 60); } catch (Exception e) { return value; } }

    static String lastThirdStart(String maghrib, String fajr) {
        try {
            int start = Integer.parseInt(maghrib.substring(0, 2)) * 60 + Integer.parseInt(maghrib.substring(3, 5));
            int end = Integer.parseInt(fajr.substring(0, 2)) * 60 + Integer.parseInt(fajr.substring(3, 5));
            if (end <= start) end += 1440;
            int target = (int) Math.round(start + (end - start) * (2.0 / 3.0));
            return String.format(java.util.Locale.US, "%02d:%02d", (target / 60) % 24, target % 60);
        } catch (Exception e) { return null; }
    }

    private static String ayatSound(String voice) {
        if ("abdulBasit".equals(voice)) return "ayat-al-kursi-abdul-basit-abdus-samad.mp3";
        if ("minshawi".equals(voice)) return "ayat-al-kursi-muhammad-siddiq-al-minshawi.mp3";
        if ("hussary".equals(voice)) return "ayat-al-kursi-mahmoud-khalil-al-hussary.mp3";
        if ("ahmedAlNafis".equals(voice)) return "ayat-al-kursi-ahmed-al-nafis.mp3";
        return "ayat-al-kursi-mishary-alafasy.mp3";
    }

    static void createChannels(Context context) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;
        NotificationChannel reminders = new NotificationChannel("reminders", "تذكيرات أنياس", NotificationManager.IMPORTANCE_DEFAULT);
        reminders.setDescription("تنبيهات مواقيت الصلاة والأذكار التي اخترتها في أنياس.");
        reminders.setSound(null, null);
        manager.createNotificationChannel(reminders);
        NotificationChannel playback = new NotificationChannel("reminder_playback", "صوت التذكيرات", NotificationManager.IMPORTANCE_LOW);
        playback.setDescription("إشعار مؤقت أثناء تشغيل صوت التذكير.");
        playback.setSound(null, null);
        manager.createNotificationChannel(playback);
    }

    static class Reminder {
        final String id, title, time, body, soundFile;
        final int weekday;
        Reminder(String id, String title, String time, String body, String soundFile, int weekday) { this.id = id; this.title = title; this.time = time; this.body = body; this.soundFile = soundFile; this.weekday = weekday; }
    }
}
