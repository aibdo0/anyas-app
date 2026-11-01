package com.anyas.app

import android.Manifest
import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build

class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getStringExtra("id") ?: return
        val title = intent.getStringExtra("title")
        val body = intent.getStringExtra("body")
        val sound = intent.getBooleanExtra("sound", true)
        val soundFile = intent.getStringExtra("soundFile")
        showNotification(context, id, title, body)
        if (sound && !soundFile.isNullOrEmpty()) {
            val player = Intent(context, ReminderPlayerService::class.java)
                .putExtra("soundFile", soundFile)
                .putExtra("title", title)
                .putExtra("body", body)
                .putExtra("notificationKey", id)
                .putExtra("volume", intent.getFloatExtra("volume", 1f))
            try {
                if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(player) else context.startService(player)
            } catch (_: Exception) {
            }
        }
        ReminderScheduler.scheduleSaved(context)
    }

    companion object {
        @JvmStatic
        fun showNotification(context: Context, id: String, title: String?, body: String?) {
            showNotification(context, id, title, body, true)
        }

        @JvmStatic
        fun showTestNotification(context: Context, id: String, title: String?, body: String?) {
            showNotification(context, id, title, body, false)
        }

        private fun showNotification(context: Context, id: String, title: String?, body: String?, recordHistory: Boolean) {
            ReminderScheduler.createChannels(context)
            val safeTitle = title?.trim()?.takeIf { it.isNotEmpty() } ?: "أنياس"
            val safeBody = body?.trim()?.takeIf { it.isNotEmpty() } ?: "حان وقت تذكيرك. افتح أنياس للتفاصيل."
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
            if (Build.VERSION.SDK_INT >= 24 && !manager.areNotificationsEnabled()) return
            if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
            manager.notify(ReminderScheduler.requestCode(id), buildNotification(context, id, safeTitle, safeBody, false))
            if (recordHistory) NotificationHistory.record(context, id, safeTitle, safeBody)
        }

        @JvmStatic
        fun buildNotification(context: Context, id: String, title: String, body: String, ongoing: Boolean): Notification {
            val open = Intent(context, NativeMainActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            val pending = PendingIntent.getActivity(
                context, ReminderScheduler.requestCode(id), open,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            val dismiss = Intent(context, ReminderPlayerService::class.java)
                .setAction(ReminderPlayerService.ACTION_DISMISS)
                .putExtra("notificationKey", id)
            val dismissPending = PendingIntent.getService(
                context, ReminderScheduler.requestCode(id) xor 0x4a31, dismiss,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            val builder = if (Build.VERSION.SDK_INT >= 26) {
                Notification.Builder(context, if (ongoing) "reminder_playback" else "reminders")
            } else {
                Notification.Builder(context).setDefaults(if (ongoing) 0 else Notification.DEFAULT_VIBRATE)
            }
            return builder.setSmallIcon(R.drawable.ic_notification)
                .setColor(Color.rgb(196, 154, 85))
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(Notification.BigTextStyle().setBigContentTitle(title).bigText(body))
                .setPriority(Notification.PRIORITY_DEFAULT)
                .setVisibility(Notification.VISIBILITY_PRIVATE)
                .setOngoing(ongoing)
                .setAutoCancel(!ongoing)
                .setContentIntent(pending)
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "إزالة وإيقاف الصوت", dismissPending)
                .setCategory(if (ongoing) Notification.CATEGORY_SERVICE else Notification.CATEGORY_REMINDER)
                .build()
        }

        @JvmStatic
        fun restoreReminderNotification(context: Context, id: String, title: String, body: String) {
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
            manager.notify(ReminderScheduler.requestCode(id), buildNotification(context, id, title, body, false))
        }
    }
}
