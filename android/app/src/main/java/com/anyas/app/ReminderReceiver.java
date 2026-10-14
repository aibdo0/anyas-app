package com.anyas.app;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Build;

public class ReminderReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        String id = intent.getStringExtra("id");
        if (id == null) return;
        if (ReminderScheduler.quietHoursActive(context)) {
            ReminderScheduler.scheduleSaved(context);
            return;
        }
        String title = intent.getStringExtra("title");
        String body = intent.getStringExtra("body");
        boolean sound = intent.getBooleanExtra("sound", true);
        String soundFile = intent.getStringExtra("soundFile");
        float volume = intent.getFloatExtra("volume", 1f);
        boolean snoozeAvailable = !intent.getBooleanExtra("snoozed", false);
        ReminderPlayerService.rememberReminderForSnooze(context, id, title, body, sound, soundFile, volume);
        showNotification(context, id, title, body, snoozeAvailable);
        if (sound && soundFile != null && !soundFile.isEmpty()) {
            Intent player = new Intent(context, ReminderPlayerService.class)
                    .putExtra("soundFile", soundFile)
                    .putExtra("title", title)
                    .putExtra("body", body)
                    .putExtra("notificationKey", id)
                    .putExtra("volume", volume)
                    .putExtra("snoozeAvailable", snoozeAvailable);
            try {
                if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(player);
                else context.startService(player);
            } catch (Exception ignored) { }
        }
        ReminderScheduler.scheduleSaved(context);
    }

    static void showNotification(Context context, String id, String title, String body) {
        showNotification(context, id, title, body, true, true);
    }

    static void showNotification(Context context, String id, String title, String body, boolean snoozeAvailable) {
        showNotification(context, id, title, body, snoozeAvailable, true);
    }

    static void showTestNotification(Context context, String id, String title, String body) {
        showNotification(context, id, title, body, false, false);
    }

    private static void showNotification(Context context, String id, String title, String body, boolean snoozeAvailable, boolean recordHistory) {
        ReminderScheduler.createChannels(context);
        String safeTitle = title == null || title.trim().isEmpty() ? "أنياس" : title.trim();
        String safeBody = body == null || body.trim().isEmpty() ? "حان وقت تذكيرك. افتح أنياس للتفاصيل." : body.trim();
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;
        if (Build.VERSION.SDK_INT >= 24 && !manager.areNotificationsEnabled()) return;
        if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        manager.notify(ReminderScheduler.requestCode(id), buildNotification(context, id, safeTitle, safeBody, false, snoozeAvailable));
        if (recordHistory) NotificationHistory.record(context, id, safeTitle, safeBody);
    }

    static Notification buildNotification(Context context, String id, String title, String body, boolean ongoing) {
        return buildNotification(context, id, title, body, ongoing, true);
    }

    static Notification buildNotification(Context context, String id, String title, String body, boolean ongoing, boolean snoozeAvailable) {
        Intent open = new Intent(context, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pending = PendingIntent.getActivity(context, ReminderScheduler.requestCode(id), open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Intent dismiss = new Intent(context, ReminderPlayerService.class)
                .setAction(ReminderPlayerService.ACTION_DISMISS)
                .putExtra("notificationKey", id);
        PendingIntent dismissPending = PendingIntent.getService(context, ReminderScheduler.requestCode(id) ^ 0x4a31, dismiss, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Intent snooze = new Intent(context, ReminderPlayerService.class)
                .setAction(ReminderPlayerService.ACTION_SNOOZE)
                .putExtra("notificationKey", id);
        PendingIntent snoozePending = PendingIntent.getService(context, ReminderScheduler.requestCode(id) ^ 0x2b71, snooze, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(context, ongoing ? "reminder_playback" : "reminders")
                : new Notification.Builder(context).setDefaults(ongoing ? 0 : Notification.DEFAULT_VIBRATE);
        return builder.setSmallIcon(R.drawable.ic_notification)
                .setColor(Color.rgb(196, 154, 85))
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new Notification.BigTextStyle().setBigContentTitle(title).bigText(body))
                .setPriority(Notification.PRIORITY_DEFAULT)
                .setVisibility(Notification.VISIBILITY_PRIVATE)
                .setOngoing(ongoing)
                .setAutoCancel(!ongoing)
                .setContentIntent(pending)
                .setCategory(ongoing ? Notification.CATEGORY_SERVICE : Notification.CATEGORY_REMINDER);
        if (snoozeAvailable && !id.startsWith("test") && !"anyas-reminder-test".equals(id)) {
            builder.addAction(android.R.drawable.ic_lock_idle_alarm, "غفوة ١٠ دقائق", snoozePending);
        }
        return builder.addAction(android.R.drawable.ic_menu_close_clear_cancel, "إزالة وإيقاف الصوت", dismissPending).build();
    }

    static void restoreReminderNotification(Context context, String id, String title, String body) {
        restoreReminderNotification(context, id, title, body, true);
    }

    static void restoreReminderNotification(Context context, String id, String title, String body, boolean snoozeAvailable) {
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;
        manager.notify(ReminderScheduler.requestCode(id), buildNotification(context, id, title, body, false, snoozeAvailable));
    }
}
