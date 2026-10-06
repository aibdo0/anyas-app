package com.anyas.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class AnyasFirebaseMessagingService extends FirebaseMessagingService {
    private static final String TAG = "AnyasFCM";
    private static final String CHANNEL_ID = "app_updates";

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        getSharedPreferences("anyas_firebase", MODE_PRIVATE)
                .edit()
                .putString("fcm_token", token)
                .apply();
        Log.d(TAG, "FCM token refreshed");
    }

    @Override
    public void onMessageReceived(@NonNull RemoteMessage message) {
        super.onMessageReceived(message);
        RemoteMessage.Notification notification = message.getNotification();
        String title = notification != null && notification.getTitle() != null
                ? notification.getTitle()
                : message.getData().getOrDefault("title", "تحديث جديد من أنياس");
        String body = notification != null && notification.getBody() != null
                ? notification.getBody()
                : message.getData().getOrDefault("body", "تمت إضافة محتوى جديد إلى التطبيق.");
        showUpdateNotification(title, body);
    }

    private void showUpdateNotification(String title, String body) {
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (manager == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "تحديثات أنياس",
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            channel.setDescription("إشعارات المحتوى والتحديثات الجديدة في أنياس.");
            manager.createNotificationChannel(channel);
        }

        Intent openApp = new Intent(this, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pending = PendingIntent.getActivity(
                this,
                7201,
                openApp,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification)
                .setColor(getColorCompat(R.color.primary))
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setContentIntent(pending)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT);
        manager.notify((int) (System.currentTimeMillis() & 0x7fffffff), builder.build());
    }

    private int getColorCompat(int resourceId) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) return getColor(resourceId);
        return getResources().getColor(resourceId);
    }
}
