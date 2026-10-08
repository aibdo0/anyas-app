package com.anyas.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;

public class PrayerWidgetProvider extends AppWidgetProvider {
    private static final String[] KEYS = {"Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"};
    private static final String[] NAMES = {"الفجر", "الشروق", "الظهر", "العصر", "المغرب", "العشاء"};

    @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) update(context, manager, id);
    }

    @Override public void onEnabled(Context context) { updateAll(context); }
    @Override public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (AppWidgetManager.ACTION_APPWIDGET_UPDATE.equals(intent.getAction()) || "com.anyas.app.UPDATE_WIDGET".equals(intent.getAction())) updateAll(context);
    }

    static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, PrayerWidgetProvider.class);
        for (int id : manager.getAppWidgetIds(component)) update(context, manager, id);
    }

    private static void update(Context context, AppWidgetManager manager, int id) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_prayer);
        SharedPreferences prefs = context.getSharedPreferences(ReminderScheduler.PREFS, Context.MODE_PRIVATE);
        String raw = prefs.getString("settings", "{}");
        String city = "مدينتك";
        String prayerName = "افتح أنياس للإعداد";
        String prayerTime = "--:--";
        try {
            JSONObject root = new JSONObject(raw);
            city = root.optString("city", city);
            JSONObject prayers = root.optJSONObject("prayers");
            Calendar now = Calendar.getInstance();
            int nowMinutes = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);
            int bestMinutes = Integer.MAX_VALUE;
            for (int i = 0; i < KEYS.length; i++) {
                String value = prayers == null ? "" : prayers.optString(KEYS[i], "");
                int minutes = parseMinutes(value);
                if (minutes >= nowMinutes && minutes < bestMinutes) {
                    bestMinutes = minutes;
                    prayerName = NAMES[i];
                    prayerTime = value.substring(0, 5);
                }
            }
            if (bestMinutes == Integer.MAX_VALUE) {
                int fajr = prayers == null ? -1 : parseMinutes(prayers.optString("Fajr", ""));
                if (fajr >= 0) { prayerName = "الفجر غدًا"; prayerTime = prayers.optString("Fajr", "").substring(0, 5); }
            }
        } catch (Exception ignored) { }
        views.setTextViewText(R.id.widgetCity, city);
        views.setTextViewText(R.id.widgetPrayerName, prayerName);
        views.setTextViewText(R.id.widgetPrayerTime, formatDigits(prayerTime));
        Intent open = new Intent(context, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pending = PendingIntent.getActivity(context, 7000 + id, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widgetRoot, pending);
        manager.updateAppWidget(id, views);
    }

    private static int parseMinutes(String value) {
        try { String[] parts = value.substring(0, 5).split(":"); return Integer.parseInt(parts[0]) * 60 + Integer.parseInt(parts[1]); }
        catch (Exception ignored) { return -1; }
    }
    private static String formatDigits(String value) {
        return value.replace('0', '٠').replace('1', '١').replace('2', '٢').replace('3', '٣').replace('4', '٤').replace('5', '٥').replace('6', '٦').replace('7', '٧').replace('8', '٨').replace('9', '٩');
    }
}
