package com.anyas.app

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

object NotificationHistory {
    private const val PREFS = "anyas_notification_history"
    private const val ITEMS = "items"
    private const val MAX_ITEMS = 100
    private const val DUPLICATE_WINDOW_MS = 90_000L

    @JvmStatic
    fun record(context: Context, tag: String?, title: String?, body: String?) = synchronized(this) {
        val preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val previous = readArray(preferences.getString(ITEMS, "[]") ?: "[]")
        val now = System.currentTimeMillis()
        val safeTag = tag?.trim()?.takeIf { it.isNotEmpty() } ?: "anyas"
        val normalizedTag = normalizeTag(safeTag)
        for (index in 0 until previous.length()) {
            val item = previous.optJSONObject(index) ?: continue
            if (normalizedTag != normalizeTag(item.optString("tag"))) continue
            if (kotlin.math.abs(now - item.optLong("timestamp")) < DUPLICATE_WINDOW_MS) return@synchronized
        }

        val item = JSONObject()
        try {
            item.put("id", "$safeTag-$now")
            item.put("tag", safeTag)
            item.put("title", title?.trim()?.takeIf { it.isNotEmpty() } ?: "أنياس")
            item.put("body", body?.trim() ?: "")
            item.put("timestamp", now)
            item.put("read", false)
        } catch (_: Exception) {
            return@synchronized
        }

        val updated = JSONArray().put(item)
        for (index in 0 until previous.length()) {
            if (updated.length() >= MAX_ITEMS) break
            previous.optJSONObject(index)?.let(updated::put)
        }
        preferences.edit().putString(ITEMS, updated.toString()).commit()
    }

    @JvmStatic
    fun getJson(context: Context): String = synchronized(this) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(ITEMS, "[]") ?: "[]"
    }

    @JvmStatic
    fun delete(context: Context, id: String?) {
        if (id.isNullOrBlank()) return
        synchronized(this) {
            val preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val previous = readArray(preferences.getString(ITEMS, "[]") ?: "[]")
            val updated = JSONArray()
            for (index in 0 until previous.length()) {
                val item = previous.optJSONObject(index)
                if (item != null && id != item.optString("id")) updated.put(item)
            }
            preferences.edit().putString(ITEMS, updated.toString()).commit()
        }
    }

    @JvmStatic
    fun clear(context: Context) {
        synchronized(this) {
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(ITEMS).commit()
        }
    }

    @JvmStatic
    fun markAllRead(context: Context) {
        synchronized(this) {
            val preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val previous = readArray(preferences.getString(ITEMS, "[]") ?: "[]")
            val updated = JSONArray()
            for (index in 0 until previous.length()) {
                val item = previous.optJSONObject(index) ?: continue
                try {
                    item.put("read", true)
                } catch (_: Exception) {
                }
                updated.put(item)
            }
            preferences.edit().putString(ITEMS, updated.toString()).commit()
        }
    }

    private fun readArray(raw: String): JSONArray = try {
        JSONArray(raw)
    } catch (_: Exception) {
        JSONArray()
    }

    private fun normalizeTag(tag: String?): String = tag?.trim()?.replaceFirst(Regex("^anyas-"), "")?.replace('_', '-') ?: ""
}
