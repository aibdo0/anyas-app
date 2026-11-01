package com.anyas.app

import android.content.Context
import com.batoulapps.adhan.CalculationMethod
import com.batoulapps.adhan.Coordinates
import com.batoulapps.adhan.Madhab
import com.batoulapps.adhan.PrayerTimes
import com.batoulapps.adhan.data.DateComponents
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

internal data class NativeCity(
    val name: String,
    val country: String,
    val latitude: Double,
    val longitude: Double
)

internal object NativeCities {
    val all = listOf(
        NativeCity("القاهرة", "مصر", 30.0444, 31.2357),
        NativeCity("الإسكندرية", "مصر", 31.2001, 29.9187),
        NativeCity("الجيزة", "مصر", 30.0131, 31.2089),
        NativeCity("الرياض", "السعودية", 24.7136, 46.6753),
        NativeCity("مكة المكرمة", "السعودية", 21.3891, 39.8579),
        NativeCity("المدينة المنورة", "السعودية", 24.5247, 39.5692),
        NativeCity("جدة", "السعودية", 21.4858, 39.1925),
        NativeCity("دبي", "الإمارات", 25.2048, 55.2708),
        NativeCity("أبو ظبي", "الإمارات", 24.4539, 54.3773),
        NativeCity("الدوحة", "قطر", 25.2854, 51.5310),
        NativeCity("الكويت", "الكويت", 29.3759, 47.9774),
        NativeCity("مسقط", "عُمان", 23.5880, 58.3829),
        NativeCity("المنامة", "البحرين", 26.2235, 50.5876),
        NativeCity("عمّان", "الأردن", 31.9454, 35.9284),
        NativeCity("القدس", "فلسطين", 31.7683, 35.2137),
        NativeCity("بيروت", "لبنان", 33.8938, 35.5018),
        NativeCity("دمشق", "سوريا", 33.5138, 36.2765),
        NativeCity("بغداد", "العراق", 33.3152, 44.3661),
        NativeCity("الجزائر", "الجزائر", 36.7538, 3.0588),
        NativeCity("تونس", "تونس", 36.8065, 10.1815),
        NativeCity("الرباط", "المغرب", 34.0209, -6.8416),
        NativeCity("الخرطوم", "السودان", 15.5007, 32.5599)
    )

    fun load(context: Context): NativeCity {
        val preferences = context.getSharedPreferences("anyas_native", Context.MODE_PRIVATE)
        val name = preferences.getString("city", null)
        val savedLatitude = preferences.getString("city_latitude", null)?.toDoubleOrNull()
        val savedLongitude = preferences.getString("city_longitude", null)?.toDoubleOrNull()
        val savedCity = all.firstOrNull { it.name == name }
            ?: if (name != null && savedLatitude != null && savedLongitude != null) {
                NativeCity(name, preferences.getString("city_country", "مدينة محفوظة") ?: "مدينة محفوظة", savedLatitude, savedLongitude)
            } else null
        if (savedCity != null) return savedCity

        val oldSettings = context.getSharedPreferences("anyas_reminders", Context.MODE_PRIVATE)
            .getString("settings", "{}") ?: "{}"
        val oldData = runCatching { JSONObject(oldSettings) }.getOrDefault(JSONObject())
        val oldName = oldData.optString("city", "").trim()
        val latitude = oldData.optDouble("latitude", Double.NaN)
        val longitude = oldData.optDouble("longitude", Double.NaN)
        val migrated = if (oldName.isNotBlank() && oldName != "مدينتك" && latitude.isFinite() && longitude.isFinite() && latitude in -90.0..90.0 && longitude in -180.0..180.0) {
            val matched = all.firstOrNull { oldName == it.name || oldName.startsWith(it.name) }
            matched ?: NativeCity(oldName, "مدينة محفوظة", latitude, longitude)
        } else {
            all.firstOrNull { oldName == it.name || oldName.startsWith(it.name) } ?: all.first()
        }
        save(context, migrated)
        return migrated
    }

    fun save(context: Context, city: NativeCity) {
        context.getSharedPreferences("anyas_native", Context.MODE_PRIVATE)
            .edit()
            .putString("city", city.name)
            .putString("city_country", city.country)
            .putString("city_latitude", city.latitude.toString())
            .putString("city_longitude", city.longitude.toString())
            .apply()
    }
}

internal enum class NativeCalculationMethod(val title: String, val value: CalculationMethod) {
    EGYPTIAN("الهيئة المصرية", CalculationMethod.EGYPTIAN),
    MUSLIM_WORLD_LEAGUE("رابطة العالم الإسلامي", CalculationMethod.MUSLIM_WORLD_LEAGUE)
}

internal enum class NativeAsrMadhab(val title: String, val value: Madhab) {
    SHAFI("شافعي", Madhab.SHAFI),
    HANAFI("حنفي", Madhab.HANAFI)
}

internal data class NativePrayerTime(val name: String, val epochMillis: Long)

internal object NativePrayerCalculator {
    fun forDate(
        city: NativeCity,
        method: NativeCalculationMethod,
        madhab: NativeAsrMadhab,
        dateMillis: Long = System.currentTimeMillis()
    ): List<NativePrayerTime> {
        val calendar = Calendar.getInstance().apply { timeInMillis = dateMillis }
        val date = DateComponents(
            calendar.get(Calendar.YEAR),
            calendar.get(Calendar.MONTH) + 1,
            calendar.get(Calendar.DAY_OF_MONTH)
        )
        val parameters = method.value.getParameters().apply { this.madhab = madhab.value }
        val times = PrayerTimes(
            Coordinates(city.latitude, city.longitude),
            date,
            parameters
        )
        return listOf(
            NativePrayerTime("الفجر", times.fajr.time),
            NativePrayerTime("الشروق", times.sunrise.time),
            NativePrayerTime("الظهر", times.dhuhr.time),
            NativePrayerTime("العصر", times.asr.time),
            NativePrayerTime("المغرب", times.maghrib.time),
            NativePrayerTime("العشاء", times.isha.time)
        )
    }

    fun formatTime(epochMillis: Long): String =
        SimpleDateFormat("HH:mm", Locale.US).format(Date(epochMillis))

    fun formattedArabicDate(epochMillis: Long): String =
        SimpleDateFormat("EEEE، d MMMM yyyy", Locale("ar")).format(Date(epochMillis))
}

internal data class NativeAzkarItem(val id: Int, val text: String, val count: Int)
internal data class NativeAzkarTopic(
    val number: Int,
    val title: String,
    val description: String,
    val items: List<NativeAzkarItem>
)

internal object NativeAzkarRepository {
    fun read(context: Context): List<NativeAzkarTopic> = runCatching {
        val source = context.assets.open("azkar-topics.json").bufferedReader().use { it.readText() }
        val topics = JSONArray(source)
        buildList {
            for (topicIndex in 0 until topics.length()) {
                val topic = topics.getJSONObject(topicIndex)
                val jsonItems = topic.optJSONArray("items") ?: JSONArray()
                val items = buildList {
                    for (itemIndex in 0 until jsonItems.length()) {
                        val item = jsonItems.getJSONObject(itemIndex)
                        add(NativeAzkarItem(item.optInt("id"), item.optString("text"), item.optInt("count", 1).coerceAtLeast(1)))
                    }
                }
                add(NativeAzkarTopic(
                    topic.optInt("number"),
                    topic.optString("title"),
                    topic.optString("description"),
                    items
                ))
            }
        }
    }.getOrDefault(emptyList())
}
