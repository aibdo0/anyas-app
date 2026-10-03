package com.anyas.app;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

final class NotificationHistory {
    private static final String PREFS = "anyas_notification_history";
    private static final String ITEMS = "items";
    private static final int MAX_ITEMS = 100;
    private static final long DUPLICATE_WINDOW_MS = 90_000L;

    private NotificationHistory() { }

    static void record(Context context, String tag, String title, String body) {
        synchronized (NotificationHistory.class) {
            SharedPreferences preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            JSONArray previous = readArray(preferences.getString(ITEMS, "[]"));
            long now = System.currentTimeMillis();
            String safeTag = tag == null || tag.trim().isEmpty() ? "anyas" : tag.trim();
            String normalizedTag = normalizeTag(safeTag);
            for (int i = 0; i < previous.length(); i++) {
                JSONObject item = previous.optJSONObject(i);
                if (item == null || !normalizedTag.equals(normalizeTag(item.optString("tag")))) continue;
                if (Math.abs(now - item.optLong("timestamp")) < DUPLICATE_WINDOW_MS) return;
            }

            JSONObject item = new JSONObject();
            try {
                item.put("id", safeTag + "-" + now);
                item.put("tag", safeTag);
                item.put("title", title == null || title.trim().isEmpty() ? "أنياس" : title.trim());
                item.put("body", body == null ? "" : body.trim());
                item.put("timestamp", now);
                item.put("read", false);
            } catch (Exception ignored) {
                return;
            }

            JSONArray updated = new JSONArray();
            updated.put(item);
            for (int i = 0; i < previous.length() && updated.length() < MAX_ITEMS; i++) {
                JSONObject oldItem = previous.optJSONObject(i);
                if (oldItem != null) updated.put(oldItem);
            }
            preferences.edit().putString(ITEMS, updated.toString()).commit();
        }
    }

    static String getJson(Context context) {
        synchronized (NotificationHistory.class) {
            return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(ITEMS, "[]");
        }
    }

    static void markAllRead(Context context) {
        synchronized (NotificationHistory.class) {
            SharedPreferences preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            JSONArray previous = readArray(preferences.getString(ITEMS, "[]"));
            JSONArray updated = new JSONArray();
            for (int i = 0; i < previous.length(); i++) {
                JSONObject oldItem = previous.optJSONObject(i);
                if (oldItem == null) continue;
                try { oldItem.put("read", true); } catch (Exception ignored) { }
                updated.put(oldItem);
            }
            preferences.edit().putString(ITEMS, updated.toString()).commit();
        }
    }

    private static JSONArray readArray(String raw) {
        try { return new JSONArray(raw); } catch (Exception ignored) { return new JSONArray(); }
    }

    private static String normalizeTag(String tag) {
        if (tag == null) return "";
        return tag.trim().replaceFirst("^anyas-", "").replace('_', '-');
    }
}
