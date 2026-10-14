package com.anyas.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import org.json.JSONObject;

public class ReminderPlayerService extends Service {
    static final String ACTION_DISMISS = "com.anyas.app.action.DISMISS_REMINDER";
    static final String ACTION_SNOOZE = "com.anyas.app.action.SNOOZE_REMINDER";
    private static final String SNOOZE_PREFS = "anyas_snooze_reminders";
    private MediaPlayer player;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable testStop;
    private int activeStartId;
    private String notificationKey;
    private String notificationTitle;
    private String notificationBody;
    private boolean notificationRestored;
    private boolean snoozeAvailable = true;

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_DISMISS.equals(intent.getAction())) {
            dismissReminder(intent.getStringExtra("notificationKey"), startId);
            return START_NOT_STICKY;
        }
        if (intent != null && ACTION_SNOOZE.equals(intent.getAction())) {
            snoozeReminder(intent.getStringExtra("notificationKey"), startId);
            return START_NOT_STICKY;
        }
        ReminderScheduler.createChannels(this);
        String file = intent == null ? "" : intent.getStringExtra("soundFile");
        String title = intent == null ? "صوت التذكير" : intent.getStringExtra("title");
        String body = intent == null ? null : intent.getStringExtra("body");
        String key = intent == null ? null : intent.getStringExtra("notificationKey");
        float volume = intent == null ? 1f : Math.max(0f, Math.min(1f, intent.getFloatExtra("volume", 1f)));
        int testDurationMs = intent == null ? 0 : intent.getIntExtra("testDurationMs", 0);
        snoozeAvailable = intent != null && intent.getBooleanExtra("snoozeAvailable", key != null && !key.startsWith("test"));
        activeStartId = startId;
        notificationKey = key == null || key.trim().isEmpty() ? "audio-playback" : key;
        notificationTitle = title == null || title.trim().isEmpty() ? "صوت التذكير" : title;
        notificationBody = body == null || body.trim().isEmpty() ? "حان وقت تذكيرك. افتح أنياس للتفاصيل." : body;
        notificationRestored = false;
        startForeground(ReminderScheduler.requestCode(notificationKey),
                ReminderReceiver.buildNotification(this, notificationKey, notificationTitle, notificationBody, true, snoozeAvailable));
        releasePlayer();
        int resource = getResources().getIdentifier(rawName(file), "raw", getPackageName());
        if (resource == 0) { finishPlayback(startId); return START_NOT_STICKY; }
        AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
        player = MediaPlayer.create(this, resource, audioAttributes, 0);
        if (player == null) { finishPlayback(startId); return START_NOT_STICKY; }
        player.setVolume(volume, volume);
        player.setOnCompletionListener(done -> finishPlayback(startId));
        player.setOnErrorListener((mp, what, extra) -> { finishPlayback(startId); return true; });
        player.start();
        if (testDurationMs > 0) {
            int boundedDuration = Math.max(1000, Math.min(10000, testDurationMs));
            testStop = () -> finishPlayback(startId);
            handler.postDelayed(testStop, boundedDuration);
        }
        return START_NOT_STICKY;
    }

    private void dismissReminder(String key, int startId) {
        if (key == null || key.trim().isEmpty()) {
            stopSelfResult(startId);
            return;
        }
        android.app.NotificationManager manager = (android.app.NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (manager != null) manager.cancel(ReminderScheduler.requestCode(key));
        getSharedPreferences(SNOOZE_PREFS, MODE_PRIVATE).edit().remove(key).apply();
        if (key.equals(notificationKey)) {
            releasePlayer();
            notificationRestored = true;
            stopForeground(true);
        }
        stopSelfResult(startId);
    }

    private void snoozeReminder(String key, int startId) {
        if (key == null || key.trim().isEmpty()) {
            stopSelfResult(startId);
            return;
        }
        String saved = getSharedPreferences(SNOOZE_PREFS, MODE_PRIVATE).getString(key, null);
        if (saved == null) {
            stopSelfResult(startId);
            return;
        }
        boolean scheduled = false;
        try {
            JSONObject reminderData = new JSONObject(saved);
            Intent reminder = new Intent(this, ReminderReceiver.class)
                    .putExtra("id", key)
                    .putExtra("title", reminderData.optString("title", "تذكير من أنياس"))
                    .putExtra("body", reminderData.optString("body", "حان وقت تذكيرك."))
                    .putExtra("sound", reminderData.optBoolean("sound", false))
                    .putExtra("soundFile", reminderData.optString("soundFile", ""))
                    .putExtra("volume", (float) reminderData.optDouble("volume", 1d))
                    .putExtra("snoozed", true);
            int request = ReminderScheduler.requestCode("snooze-" + key);
            PendingIntent alarmIntent = PendingIntent.getBroadcast(this, request, reminder, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            AlarmManager alarm = (AlarmManager) getSystemService(ALARM_SERVICE);
            if (alarm != null) {
                alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, System.currentTimeMillis() + 10L * 60L * 1000L, alarmIntent);
                scheduled = true;
            }
        } catch (Exception ignored) { }
        if (scheduled) dismissReminder(key, startId);
        else stopSelfResult(startId);
    }

    static void rememberReminderForSnooze(Context context, String id, String title, String body, boolean sound, String soundFile, float volume) {
        if (id == null || id.trim().isEmpty()) return;
        try {
            JSONObject reminder = new JSONObject()
                    .put("title", title == null ? "تذكير من أنياس" : title)
                    .put("body", body == null ? "حان وقت تذكيرك." : body)
                    .put("sound", sound)
                    .put("soundFile", soundFile == null ? "" : soundFile)
                    .put("volume", Math.max(0f, Math.min(1f, volume)));
            context.getSharedPreferences(SNOOZE_PREFS, Context.MODE_PRIVATE).edit().putString(id, reminder.toString()).apply();
        } catch (Exception ignored) { }
    }

    private void finishPlayback(int startId) {
        if (startId != activeStartId) {
            stopSelfResult(startId);
            return;
        }
        releasePlayer();
        stopForeground(true);
        if (notificationKey != null && !notificationRestored) {
            ReminderReceiver.restoreReminderNotification(this, notificationKey, notificationTitle, notificationBody, snoozeAvailable);
            notificationRestored = true;
        }
        stopSelfResult(startId);
    }

    private static String rawName(String file) {
        if (file == null) return "";
        String name = file.toLowerCase(java.util.Locale.US).replaceFirst("\\.[^.]+$", "");
        return name.replaceAll("[^a-z0-9_]", "_");
    }

    private void releasePlayer() {
        if (testStop != null) {
            handler.removeCallbacks(testStop);
            testStop = null;
        }
        if (player != null) {
            try { if (player.isPlaying()) player.stop(); } catch (Exception ignored) { }
            player.release();
            player = null;
        }
    }

    @Override public void onDestroy() {
        releasePlayer();
        if (notificationKey != null && !notificationRestored) {
            ReminderReceiver.restoreReminderNotification(this, notificationKey, notificationTitle, notificationBody, snoozeAvailable);
            notificationRestored = true;
        }
        super.onDestroy();
    }
    @Override public IBinder onBind(Intent intent) { return null; }
}
