package com.anyas.app;

import android.app.AlarmManager;
import android.content.BroadcastReceiver;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Calendar;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONObject;

public class RainReceiver extends BroadcastReceiver {
    private static final int REQUEST_CODE = 19031;

    static void schedule(Context context) {
        AlarmManager alarm = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarm == null) return;
        Intent intent = new Intent(context, RainReceiver.class);
        PendingIntent pending = PendingIntent.getBroadcast(context, REQUEST_CODE, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        long first = System.currentTimeMillis() + 60_000L;
        alarm.setInexactRepeating(AlarmManager.RTC_WAKEUP, first, 30 * 60_000L, pending);
    }

    static void cancel(Context context) {
        AlarmManager alarm = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarm == null) return;
        PendingIntent pending = PendingIntent.getBroadcast(context, REQUEST_CODE, new Intent(context, RainReceiver.class), PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
        if (pending != null) alarm.cancel(pending);
    }

    @Override public void onReceive(Context context, Intent intent) {
        final PendingResult result = goAsync();
        new Thread(() -> {
            try {
                String raw = context.getSharedPreferences(ReminderScheduler.PREFS, Context.MODE_PRIVATE).getString("settings", "{}");
                JSONObject root = new JSONObject(raw);
                JSONObject enabled = root.optJSONObject("enabled");
                float masterVolume = (float) Math.max(0d, Math.min(100d, root.optDouble("volume", 100d))) / 100f;
                double latitude = root.optDouble("latitude", Double.NaN);
                double longitude = root.optDouble("longitude", Double.NaN);
                if (enabled == null || !enabled.optBoolean("notifyRainSunnah", false) || Double.isNaN(latitude) || Double.isNaN(longitude)) return;
                String url = "https://api.open-meteo.com/v1/forecast?latitude=" + latitude + "&longitude=" + longitude + "&current=rain,precipitation&timezone=auto";
                HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
                connection.setConnectTimeout(12_000);
                connection.setReadTimeout(12_000);
                connection.setRequestMethod("GET");
                StringBuilder body = new StringBuilder();
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream()))) {
                    String line; while ((line = reader.readLine()) != null) body.append(line);
                } finally { connection.disconnect(); }
                double rain = number(body.toString(), "rain");
                double precipitation = number(body.toString(), "precipitation");
                if (rain <= 0 && precipitation <= 0) return;
                Calendar now = Calendar.getInstance();
                String key = String.format(java.util.Locale.US, "%04d-%03d-%02d", now.get(Calendar.YEAR), now.get(Calendar.DAY_OF_YEAR), now.get(Calendar.HOUR_OF_DAY));
                android.content.SharedPreferences prefs = context.getSharedPreferences(ReminderScheduler.PREFS, Context.MODE_PRIVATE);
                if (key.equals(prefs.getString("lastRainReminder", ""))) return;
                prefs.edit().putString("lastRainReminder", key).apply();
                ReminderReceiver.showNotification(context, "notifyRainSunnah", "سنة نزول المطر", "اللهم صيبًا نافعًا.");
                Intent player = new Intent(context, ReminderPlayerService.class).putExtra("soundFile", "rain-sunnah-reminder.mp3").putExtra("title", "سنة نزول المطر").putExtra("volume", masterVolume);
                if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(player); else context.startService(player);
            } catch (Exception ignored) {
            } finally {
                result.finish();
            }
        }).start();
    }

    private static double number(String json, String key) {
        Matcher matcher = Pattern.compile("\\\"" + key + "\\\"\\s*:\\s*([-+]?\\d+(?:\\.\\d+)?)").matcher(json);
        return matcher.find() ? Double.parseDouble(matcher.group(1)) : 0;
    }
}
