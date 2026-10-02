package com.anyas.app;

import android.app.Notification;
import android.app.Service;
import android.content.Intent;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.IBinder;

public class ReminderPlayerService extends Service {
    private MediaPlayer player;

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        ReminderScheduler.createChannels(this);
        String file = intent == null ? "" : intent.getStringExtra("soundFile");
        String title = intent == null ? "صوت التذكير" : intent.getStringExtra("title");
        float volume = intent == null ? 1f : Math.max(0f, Math.min(1f, intent.getFloatExtra("volume", 1f)));
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(this, "reminder_playback")
                : new Notification.Builder(this);
        Notification notification = builder.setSmallIcon(android.R.drawable.ic_lock_silent_mode_off)
                .setContentTitle(title == null ? "صوت التذكير" : title)
                .setContentText("يعمل صوت التذكير الآن")
                .setOngoing(true)
                .build();
        if (Build.VERSION.SDK_INT >= 26) startForeground(9001, notification);
        else startForeground(9001, notification);
        releasePlayer();
        int resource = getResources().getIdentifier(rawName(file), "raw", getPackageName());
        if (resource == 0) { stopSelf(startId); return START_NOT_STICKY; }
        player = MediaPlayer.create(this, resource);
        if (player == null) { stopSelf(startId); return START_NOT_STICKY; }
        player.setVolume(volume, volume);
        player.setOnCompletionListener(done -> stopSelf(startId));
        player.setOnErrorListener((mp, what, extra) -> { stopSelf(startId); return true; });
        player.start();
        return START_NOT_STICKY;
    }

    private static String rawName(String file) {
        if (file == null) return "";
        String name = file.toLowerCase(java.util.Locale.US).replaceFirst("\\.[^.]+$", "");
        return name.replaceAll("[^a-z0-9_]", "_");
    }

    private void releasePlayer() {
        if (player != null) {
            try { if (player.isPlaying()) player.stop(); } catch (Exception ignored) { }
            player.release();
            player = null;
        }
    }

    @Override public void onDestroy() { releasePlayer(); super.onDestroy(); }
    @Override public IBinder onBind(Intent intent) { return null; }
}
