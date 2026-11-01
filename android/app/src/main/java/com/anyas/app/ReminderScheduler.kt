package com.anyas.app

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import org.json.JSONObject
import java.util.Calendar
import java.util.Locale

/** Native reminder scheduling, keeping the static API used by existing Android components. */
object ReminderScheduler {
    const val PREFS = "anyas_reminders"
    private const val DAILY = 0
    private val SATURDAY = Calendar.SATURDAY

    @JvmStatic
    fun scheduleSaved(context: Context) {
        try {
            val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("settings", "{}") ?: "{}"
            val data = JSONObject(raw)
            val enabledSettings = data.optJSONObject("enabled")
            val prayers = data.optJSONObject("prayers")
            val schedules = data.optJSONObject("schedules")
            val sound = data.optBoolean("sound", true)
            val masterVolume = data.optDouble("volume", 100.0).coerceIn(0.0, 100.0).toFloat() / 100f
            val ayatVoice = data.optString("ayatVoice", "mishary")
            val alarm = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
            cancelKnown(context, alarm)
            val reminders = mutableListOf<Reminder>()

            addCustomizableDaily(reminders, enabledSettings, schedules, "notifyWardAwakening", "أذكار الاستيقاظ", "04:30", "03:00", "11:59", null)
            addCustomizableDaily(reminders, enabledSettings, schedules, "notifyWardMorning", "أذكار الصباح", "05:30", "04:00", "11:59", null)
            addDaily(reminders, enabledSettings, "notifyWardGeneral", "أذكار اليوم", "12:00", null)
            addCustomizableDaily(reminders, enabledSettings, schedules, "notifyWardEvening", "أذكار المساء", "15:30", "12:00", "23:59", null)
            addCustomizableDaily(reminders, enabledSettings, schedules, "notifyWardSleep", "أذكار النوم", "20:00", "18:00", "23:59", null)
            addDaily(reminders, enabledSettings, "notifyWardSahar", "استغفار السحر", "02:00", "qiyam-al-layl-reminder.mp3")
            addDaily(reminders, enabledSettings, "notifyHadith", "حديث اليوم", "12:30", "hadith-reminder.mp3")
            addDaily(reminders, enabledSettings, "notifyBaqiyat", "الباقيات الصالحات", "14:00", "baqiyat-as-salihat-reminder.mp3")
            addDaily(reminders, enabledSettings, "notifySalawat_1", "الصلاة على النبي ﷺ", "10:00", "salawat-reminder-1.mp3")
            addDaily(reminders, enabledSettings, "notifySalawat_2", "الصلاة على النبي ﷺ", "17:00", "salawat-reminder-2.mp3")

            val maghrib = time(prayers, "Maghrib")
            if (isEnabled(enabledSettings, "notifyAyatKursi")) {
                val ayatSchedule = schedules?.optJSONObject("notifyAyatKursi")
                val ayatMode = ayatSchedule?.optString("mode", "beforeMaghrib") ?: "beforeMaghrib"
                var ayatTime = if (ayatMode == "custom" && ayatSchedule != null) {
                    normalizeClockTime(ayatSchedule.optString("time", "18:00"))
                } else null
                if (ayatTime == null && maghrib != null) ayatTime = minusMinutes(maghrib, 30)
                if (ayatTime != null) addDaily(reminders, "notifyAyatKursi", "آية الكرسي", ayatTime, ayatSound(ayatVoice))
            }

            val sunrise = time(prayers, "Sunrise")
            if (isEnabled(enabledSettings, "notifySunrise") && sunrise != null) addDaily(reminders, "notifySunrise", "الشروق", sunrise, "sunrise-birds.mp3")
            if (isEnabled(enabledSettings, "notifyDuha") && sunrise != null) addDaily(reminders, "notifyDuha", "صلاة الضحى", plusMinutes(sunrise, 30), "duha-prayer-reminder.mp3")
            if (isEnabled(enabledSettings, "beforeFajrReminder")) {
                val fajr = time(prayers, "Fajr")
                if (fajr != null) addDaily(reminders, "beforeFajrReminder", "تنبيه قبل الفجر", minusMinutes(fajr, 30), "before-fajr-30min.mp3")
            }
            if (isEnabled(enabledSettings, "notifyPrayerSoon") && prayers != null) {
                val prayerNames = arrayOf(
                    arrayOf("Fajr", "الفجر", "before-prayer-fajr.mp3"),
                    arrayOf("Dhuhr", "الظهر", "before-prayer-dhuhr.mp3"),
                    arrayOf("Asr", "العصر", "before-prayer-asr.mp3"),
                    arrayOf("Maghrib", "المغرب", "before-prayer-maghrib.mp3"),
                    arrayOf("Isha", "العشاء", "before-prayer-isha.mp3")
                )
                for (prayer in prayerNames) {
                    val prayerTime = time(prayers, prayer[0])
                    if (prayerTime != null) addDaily(
                        reminders,
                        "prayer_${prayer[0]}",
                        "اقترب موعد صلاة ${prayer[1]}",
                        minusMinutes(prayerTime, 15),
                        prayer[2]
                    )
                }
            }

            addWeekly(reminders, enabledSettings, "notifyFastingThursday1", "صيام الخميس", "fasting-thursday-reminder-1.mp3", Calendar.WEDNESDAY, "20:00")
            addWeekly(reminders, enabledSettings, "notifyFastingThursday2", "صيام الخميس", "fasting-thursday-reminder-2.mp3", Calendar.WEDNESDAY, "20:00")
            addWeekly(reminders, enabledSettings, "notifyFastingMonday", "صيام الاثنين", "fasting-monday-reminder.mp3", Calendar.SUNDAY, "20:00")
            addWeekly(reminders, enabledSettings, "notifyFastingFisabilillah", "صيام في سبيل الله", "fasting-fisabilillah-reminder.mp3", SATURDAY, "20:00")

            if (isEnabled(enabledSettings, "notifyFridayKahf") && prayers != null) {
                time(prayers, "Fajr")?.let { addWeekly(reminders, "notifyFridayKahf", "سورة الكهف", it, null, Calendar.FRIDAY) }
            }
            if (isEnabled(enabledSettings, "notifyFridayPrayer") && prayers != null) {
                time(prayers, "Dhuhr")?.let { addWeekly(reminders, "notifyFridayPrayer", "صلاة الجمعة", minusMinutes(it, 45), "friday-prayer-reminder.mp3", Calendar.FRIDAY) }
            }
            if (isEnabled(enabledSettings, "notifyFridayHour") && prayers != null) {
                time(prayers, "Asr")?.let { addWeekly(reminders, "notifyFridayHour", "ساعة الإجابة", it, null, Calendar.FRIDAY) }
            }
            if (isEnabled(enabledSettings, "notifyFridaySalawat") && prayers != null) {
                maghrib?.let { addWeekly(reminders, "notifyFridaySalawat", "الصلاة على النبي ﷺ", it, null, Calendar.THURSDAY) }
            }

            if (isEnabled(enabledSettings, "notifyLastThird") && prayers != null) {
                lastThirdStart(time(prayers, "Maghrib"), time(prayers, "Fajr"))?.let {
                    addDaily(reminders, "notifyLastThird", "الثلث الأخير من الليل", it, "qiyam-al-layl-reminder.mp3")
                }
            }

            reminders.forEach { scheduleOne(context, alarm, it, sound, masterVolume) }
            if (isEnabled(enabledSettings, "notifyRainSunnah")) RainReceiver.schedule(context) else RainReceiver.cancel(context)
        } catch (_: Exception) {
            // Invalid or incomplete saved settings should not crash app startup or a receiver.
        }
    }

    private fun addDaily(list: MutableList<Reminder>, enabled: JSONObject?, key: String, title: String, time: String, soundFile: String?) {
        if (isEnabled(enabled, key)) list.add(Reminder(key, title, time, reminderBody(key, title), soundFile, DAILY))
    }

    private fun addCustomizableDaily(
        list: MutableList<Reminder>, enabled: JSONObject?, schedules: JSONObject?, key: String,
        title: String, suggestedTime: String, minTime: String, maxTime: String, soundFile: String?
    ) {
        if (!isEnabled(enabled, key)) return
        val preference = schedules?.optJSONObject(key)
        var selectedTime = suggestedTime
        if (preference != null && preference.optString("mode", "suggested") == "custom") {
            val customTime = normalizeClockTime(preference.optString("time", suggestedTime))
            if (isWithinClockRange(customTime, minTime, maxTime)) selectedTime = customTime!!
        }
        list.add(Reminder(key, title, selectedTime, reminderBody(key, title), soundFile, DAILY))
    }

    private fun addDaily(list: MutableList<Reminder>, key: String, title: String, time: String, soundFile: String?) {
        list.add(Reminder(key, title, time, reminderBody(key, title), soundFile, DAILY))
    }

    private fun addWeekly(
        list: MutableList<Reminder>, enabled: JSONObject?, key: String, title: String,
        soundFile: String?, weekday: Int, time: String
    ) {
        if (isEnabled(enabled, key)) list.add(Reminder(key, title, time, reminderBody(key, title), soundFile, weekday))
    }

    private fun addWeekly(list: MutableList<Reminder>, key: String, title: String, time: String, soundFile: String?, weekday: Int) {
        list.add(Reminder(key, title, time, reminderBody(key, title), soundFile, weekday))
    }

    private fun reminderBody(key: String, title: String): String = when {
        key.startsWith("prayer_") -> "تبقّى ١٥ دقيقة على موعد الصلاة."
        key == "beforeFajrReminder" -> "تبقّى ٣٠ دقيقة على الفجر؛ استعد للصلاة."
        key.startsWith("notifyWard") -> "حان وقت وردك؛ خذ دقيقة للذكر وافتح أنياس."
        key.startsWith("notifyFasting") -> "تذكير بصيام الغد؛ استعد للسحور إن رغبت."
        key == "notifyHadith" -> "اقرأ حديث اليوم وخذ منه ما ينفعك."
        key == "notifyAyatKursi" -> "لحظة للذكر وقراءة آية الكرسي."
        key == "notifySalawat_1" || key == "notifySalawat_2" || key == "notifyFridaySalawat" -> "أكثر من الصلاة على النبي ﷺ."
        key == "notifyBaqiyat" -> "جدّد وردك من الباقيات الصالحات."
        key == "notifyLastThird" -> "هذه ساعة مباركة للدعاء والقيام."
        key == "notifySunrise" -> "حان وقت الشروق؛ ابدأ يومك بهدوء."
        key == "notifyDuha" -> "حان وقت صلاة الضحى."
        key == "notifyRainSunnah" -> "عند نزول المطر، ادعُ بما تحب وتذكّر السنة."
        key == "notifyFridayKahf" -> "لا تنس قراءة سورة الكهف اليوم."
        key == "notifyFridayPrayer" -> "اقترب وقت صلاة الجمعة؛ استعد لها."
        key == "notifyFridayHour" -> "وقت للدعاء من بعد العصر إلى المغرب."
        else -> "حان وقت $title. افتح أنياس للتفاصيل."
    }

    private fun scheduleOne(context: Context, alarm: AlarmManager, reminder: Reminder, sound: Boolean, masterVolume: Float) {
        try {
            val parts = reminder.time.split(":")
            val target = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, parts[0].toInt())
                set(Calendar.MINUTE, parts[1].toInt())
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
                if (reminder.weekday != DAILY) {
                    set(Calendar.DAY_OF_WEEK, reminder.weekday)
                    while (timeInMillis <= System.currentTimeMillis()) add(Calendar.WEEK_OF_YEAR, 1)
                } else if (timeInMillis <= System.currentTimeMillis()) {
                    add(Calendar.DAY_OF_YEAR, 1)
                }
            }
            val intent = Intent(context, ReminderReceiver::class.java)
                .putExtra("id", reminder.id)
                .putExtra("title", reminder.title)
                .putExtra("body", reminder.body)
                .putExtra("sound", sound)
                .putExtra("soundFile", reminder.soundFile ?: "")
                .putExtra("volume", masterVolume)
                .putExtra("time", reminder.time)
            val pending = PendingIntent.getBroadcast(
                context, requestCode(reminder.id), intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, target.timeInMillis, pending)
        } catch (_: Exception) {
        }
    }

    private fun cancelKnown(context: Context, alarm: AlarmManager) {
        val ids = arrayOf(
            "notifyWardAwakening", "notifyWardMorning", "notifyWardGeneral", "notifyWardEvening", "notifyWardSleep", "notifyWardSahar",
            "notifyHadith", "notifyBaqiyat", "notifySalawat_1", "notifySalawat_2", "notifyAyatKursi", "notifySunrise", "notifyDuha",
            "beforeFajrReminder", "notifyLastThird", "notifyFastingThursday1", "notifyFastingThursday2", "notifyFastingMonday",
            "notifyFastingFisabilillah", "notifyFridayKahf", "notifyFridayPrayer", "notifyFridayHour", "notifyFridaySalawat",
            "prayer_Fajr", "prayer_Dhuhr", "prayer_Asr", "prayer_Maghrib", "prayer_Isha"
        )
        ids.forEach { cancel(context, alarm, it) }
    }

    private fun cancel(context: Context, alarm: AlarmManager, id: String) {
        val pending = PendingIntent.getBroadcast(
            context, requestCode(id), Intent(context, ReminderReceiver::class.java),
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
        )
        if (pending != null) alarm.cancel(pending)
    }

    @JvmStatic
    fun requestCode(id: String): Int = id.hashCode() and 0x7fffffff

    private fun isEnabled(enabled: JSONObject?, key: String): Boolean = enabled?.optBoolean(key, false) == true

    private fun time(source: JSONObject?, key: String): String? {
        val value = source?.optString(key, "") ?: return null
        return if (Regex("\\d{1,2}:\\d{2}(:\\d{2})?").matches(value)) value.substring(0, 5) else null
    }

    private fun normalizeClockTime(value: String?): String? {
        return try {
            val parts = value?.split(":") ?: return null
            if (parts.size != 2) return null
            val hours = parts[0].toInt()
            val minutes = parts[1].toInt()
            if (hours !in 0..23 || minutes !in 0..59) return null
            String.format(Locale.US, "%02d:%02d", hours, minutes)
        } catch (_: Exception) {
            null
        }
    }

    private fun isWithinClockRange(value: String?, minTime: String, maxTime: String): Boolean {
        val normalized = normalizeClockTime(value) ?: return false
        return normalized >= minTime && normalized <= maxTime
    }

    private fun minusMinutes(value: String, amount: Int): String = shiftMinutes(value, -amount)
    private fun plusMinutes(value: String, amount: Int): String = shiftMinutes(value, amount)

    private fun shiftMinutes(value: String, amount: Int): String {
        return try {
            val parts = value.split(":")
            val total = (parts[0].toInt() * 60 + parts[1].toInt() + amount + 1440) % 1440
            String.format(Locale.US, "%02d:%02d", total / 60, total % 60)
        } catch (_: Exception) {
            value
        }
    }

    private fun lastThirdStart(maghrib: String?, fajr: String?): String? {
        return try {
            if (maghrib == null || fajr == null) return null
            val start = maghrib.substring(0, 2).toInt() * 60 + maghrib.substring(3, 5).toInt()
            var end = fajr.substring(0, 2).toInt() * 60 + fajr.substring(3, 5).toInt()
            if (end <= start) end += 1440
            val target = (start + (end - start) * (2.0 / 3.0)).let { kotlin.math.round(it).toInt() }
            String.format(Locale.US, "%02d:%02d", (target / 60) % 24, target % 60)
        } catch (_: Exception) {
            null
        }
    }

    private fun ayatSound(voice: String): String = when (voice) {
        "abdulBasit" -> "ayat-al-kursi-abdul-basit-abdus-samad.mp3"
        "minshawi" -> "ayat-al-kursi-muhammad-siddiq-al-minshawi.mp3"
        "hussary" -> "ayat-al-kursi-mahmoud-khalil-al-hussary.mp3"
        "ahmedAlNafis" -> "ayat-al-kursi-ahmed-al-nafis.mp3"
        else -> "ayat-al-kursi-mishary-alafasy.mp3"
    }

    @JvmStatic
    fun createChannels(context: Context) {
        if (Build.VERSION.SDK_INT < 26) return
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
        val reminders = NotificationChannel("reminders", "تذكيرات أنياس", NotificationManager.IMPORTANCE_DEFAULT).apply {
            description = "تنبيهات مواقيت الصلاة والأذكار التي اخترتها في أنياس."
            setSound(null, null)
        }
        manager.createNotificationChannel(reminders)
        val playback = NotificationChannel("reminder_playback", "صوت التذكيرات", NotificationManager.IMPORTANCE_LOW).apply {
            description = "إشعار مؤقت أثناء تشغيل صوت التذكير."
            setSound(null, null)
        }
        manager.createNotificationChannel(playback)
    }

    private data class Reminder(
        val id: String,
        val title: String,
        val time: String,
        val body: String,
        val soundFile: String?,
        val weekday: Int
    )
}
