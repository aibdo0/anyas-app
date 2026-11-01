package com.anyas.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import org.json.JSONObject
import java.util.Calendar

class PrayerWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        ids.forEach { update(context, manager, it) }
    }

    override fun onEnabled(context: Context) {
        updateAll(context)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == AppWidgetManager.ACTION_APPWIDGET_UPDATE || intent.action == "com.anyas.app.UPDATE_WIDGET") {
            updateAll(context)
        }
    }

    companion object {
        private val KEYS = arrayOf("Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha")
        private val NAMES = arrayOf("الفجر", "الشروق", "الظهر", "العصر", "المغرب", "العشاء")

        @JvmStatic
        fun updateAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val component = ComponentName(context, PrayerWidgetProvider::class.java)
            manager.getAppWidgetIds(component).forEach { update(context, manager, it) }
        }

        private fun update(context: Context, manager: AppWidgetManager, id: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_prayer)
            val preferences = context.getSharedPreferences(ReminderScheduler.PREFS, Context.MODE_PRIVATE)
            val raw = preferences.getString("settings", "{}") ?: "{}"
            var city = "مدينتك"
            var prayerName = "افتح أنياس للإعداد"
            var prayerTime = "--:--"
            try {
                val root = JSONObject(raw)
                city = root.optString("city", city)
                val prayers = root.optJSONObject("prayers")
                val now = Calendar.getInstance()
                val nowMinutes = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE)
                var bestMinutes = Int.MAX_VALUE
                for (index in KEYS.indices) {
                    val value = prayers?.optString(KEYS[index], "") ?: ""
                    val minutes = parseMinutes(value)
                    if (minutes >= nowMinutes && minutes < bestMinutes) {
                        bestMinutes = minutes
                        prayerName = NAMES[index]
                        prayerTime = value.take(5)
                    }
                }
                if (bestMinutes == Int.MAX_VALUE) {
                    val fajr = prayers?.optString("Fajr", "") ?: ""
                    val fajrMinutes = parseMinutes(fajr)
                    if (fajrMinutes >= 0) {
                        prayerName = "الفجر غدًا"
                        prayerTime = fajr.take(5)
                    }
                }
            } catch (_: Exception) {
            }
            views.setTextViewText(R.id.widgetCity, city)
            views.setTextViewText(R.id.widgetPrayerName, prayerName)
            views.setTextViewText(R.id.widgetPrayerTime, formatDigits(prayerTime))
            val open = Intent(context, NativeMainActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            val pending = PendingIntent.getActivity(
                context, 7000 + id, open,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widgetRoot, pending)
            manager.updateAppWidget(id, views)
        }

        private fun parseMinutes(value: String): Int {
            return try {
                val parts = value.take(5).split(":")
                if (parts.size != 2) -1 else parts[0].toInt() * 60 + parts[1].toInt()
            } catch (_: Exception) {
                -1
            }
        }

        private fun formatDigits(value: String): String = value
            .replace('0', '٠').replace('1', '١').replace('2', '٢').replace('3', '٣').replace('4', '٤')
            .replace('5', '٥').replace('6', '٦').replace('7', '٧').replace('8', '٨').replace('9', '٩')
    }
}
