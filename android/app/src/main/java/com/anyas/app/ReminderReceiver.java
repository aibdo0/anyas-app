package com.anyas.app;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.drawable.Icon;
import android.os.Build;

public class ReminderReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        String id = intent.getStringExtra("id");
        if (id == null) return;
        String title = intent.getStringExtra("title");
        String body = intent.getStringExtra("body");
        boolean sound = intent.getBooleanExtra("sound", true);
        String soundFile = intent.getStringExtra("soundFile");
        showNotification(context, id, title, body);
        if (sound && soundFile != null && !soundFile.isEmpty()) {
            Intent player = new Intent(context, ReminderPlayerService.class).putExtra("soundFile", soundFile).putExtra("title", title).putExtra("volume", intent.getFloatExtra("volume", 1f));
            try {
                if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(player);
                else context.startService(player);
            } catch (Exception ignored) { }
        }
        ReminderScheduler.scheduleSaved(context);
    }

    static void showNotification(Context context, String id, String title, String body) {
        ReminderScheduler.createChannels(context);
        Intent open = new Intent(context, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pending = PendingIntent.getActivity(context, ReminderScheduler.requestCode(id), open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        String safeTitle = title == null || title.trim().isEmpty() ? "أنياس" : title.trim();
        String safeBody = body == null || body.trim().isEmpty() ? "حان وقت تذكيرك. افتح أنياس للتفاصيل." : body.trim();
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;
        if (Build.VERSION.SDK_INT >= 24 && !manager.areNotificationsEnabled()) return;
        if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(context, "reminders") : new Notification.Builder(context).setDefaults(Notification.DEFAULT_VIBRATE);
        builder.setSmallIcon(R.drawable.ic_notification)
                .setLargeIcon(Icon.createWithResource(context, R.mipmap.ic_launcher))
                .setColor(Color.rgb(196, 154, 85))
                .setSubText("أنياس")
                .setContentTitle(safeTitle)
                .setContentText(safeBody)
                .setStyle(new Notification.BigTextStyle().setBigContentTitle(safeTitle).bigText(safeBody))
                .setPriority(Notification.PRIORITY_DEFAULT)
                .setVisibility(Notification.VISIBILITY_PRIVATE)
                .setAutoCancel(true)
                .setContentIntent(pending)
                .setCategory(Notification.CATEGORY_REMINDER);
        manager.notify(ReminderScheduler.requestCode(id), builder.build());
        NotificationHistory.record(context, id, safeTitle, safeBody);
    }
}
