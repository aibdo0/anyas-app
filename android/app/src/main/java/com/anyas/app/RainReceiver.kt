package com.anyas.app

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.Calendar
import java.util.Locale

class RainReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val result = goAsync()
        Thread {
            try {
                val raw = context.getSharedPreferences(ReminderScheduler.PREFS, Context.MODE_PRIVATE)
                    .getString("settings", "{}") ?: "{}"
                val root = JSONObject(raw)
                val enabled = root.optJSONObject("enabled")
                val masterVolume = root.optDouble("volume", 100.0).coerceIn(0.0, 100.0).toFloat() / 100f
                val soundEnabled = root.optBoolean("sound", true)
                val latitude = root.optDouble("latitude", Double.NaN)
                val longitude = root.optDouble("longitude", Double.NaN)
                if (enabled?.optBoolean("notifyRainSunnah", false) != true || !latitude.isFinite() || !longitude.isFinite()) return@Thread

                val requestUrl = "https://api.open-meteo.com/v1/forecast?latitude=$latitude&longitude=$longitude&current=rain,precipitation&timezone=auto"
                val connection = URL(requestUrl).openConnection() as HttpURLConnection
                connection.connectTimeout = 12_000
                connection.readTimeout = 12_000
                connection.requestMethod = "GET"
                val response = try {
                    connection.inputStream.bufferedReader().use { it.readText() }
                } finally {
                    connection.disconnect()
                }
                val rain = number(response, "rain")
                val precipitation = number(response, "precipitation")
                if (rain <= 0.0 && precipitation <= 0.0) return@Thread

                val now = Calendar.getInstance()
                val key = String.format(
                    Locale.US, "%04d-%03d-%02d",
                    now.get(Calendar.YEAR), now.get(Calendar.DAY_OF_YEAR), now.get(Calendar.HOUR_OF_DAY)
                )
                val preferences = context.getSharedPreferences(ReminderScheduler.PREFS, Context.MODE_PRIVATE)
                if (key == preferences.getString("lastRainReminder", "")) return@Thread
                preferences.edit().putString("lastRainReminder", key).apply()

                val title = "سُنّة المطر"
                val body = "اللهم صيبًا نافعًا."
                ReminderReceiver.showNotification(context, "notifyRainSunnah", title, body)
                if (soundEnabled) {
                    val player = Intent(context, ReminderPlayerService::class.java)
                        .putExtra("soundFile", "rain-sunnah-reminder.mp3")
                        .putExtra("title", title)
                        .putExtra("body", body)
                        .putExtra("notificationKey", "notifyRainSunnah")
                        .putExtra("volume", masterVolume)
                    try {
                        if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(player) else context.startService(player)
                    } catch (_: Exception) {
                    }
                }
            } catch (_: Exception) {
            } finally {
                result.finish()
            }
        }.start()
    }

    companion object {
        private const val REQUEST_CODE = 19031

        @JvmStatic
        fun schedule(context: Context) {
            val alarm = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
            val pending = PendingIntent.getBroadcast(
                context, REQUEST_CODE, Intent(context, RainReceiver::class.java),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            alarm.setInexactRepeating(AlarmManager.RTC_WAKEUP, System.currentTimeMillis() + 60_000L, 30 * 60_000L, pending)
        }

        @JvmStatic
        fun cancel(context: Context) {
            val alarm = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
            val pending = PendingIntent.getBroadcast(
                context, REQUEST_CODE, Intent(context, RainReceiver::class.java),
                PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
            )
            if (pending != null) alarm.cancel(pending)
        }

        private fun number(json: String, key: String): Double {
            return try {
                val value = JSONObject(json).optJSONObject("current")?.optDouble(key, 0.0) ?: 0.0
                if (value.isFinite()) value else 0.0
            } catch (_: Exception) {
                0.0
            }
        }
    }
}
