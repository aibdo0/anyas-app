package com.anyas.app

import android.app.TimePickerDialog
import android.content.Context
import android.os.Build
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.json.JSONObject
import java.util.Locale

internal data class NativeReminderSchedule(val mode: String, val time: String)

internal data class NativeReminderSettings(
    val enabled: Map<String, Boolean>,
    val schedules: Map<String, NativeReminderSchedule>,
    val sound: Boolean,
    val volume: Int,
    val ayatVoice: String,
    val morningVoice: String,
    val eveningVoice: String
)

internal data class NativeReminderDefinition(
    val keys: List<String>,
    val title: String,
    val description: String,
    val scheduleKey: String? = null
)

internal data class NativeReminderSection(val title: String, val items: List<NativeReminderDefinition>)

internal object NativeReminderCatalog {
    val allKeys = listOf(
        "notifyPrayerSoon", "notifySunrise", "notifyLastThird", "notifyAyatKursi", "notifyHadith", "notifyDuha", "notifyBaqiyat",
        "notifyFastingThursday1", "notifyFastingThursday2", "notifyFastingMonday", "notifyFastingFisabilillah", "notifyRainSunnah",
        "beforeFajrReminder", "notifyWardAwakening", "notifyWardMorning", "notifyWardGeneral", "notifyWardEvening", "notifyWardSleep",
        "notifyWardSahar", "notifyFridayKahf", "notifyFridayPrayer", "notifyFridayHour", "notifyFridaySalawat", "notifySalawat_1", "notifySalawat_2"
    )

    val defaultSchedules = mapOf(
        "notifyAyatKursi" to NativeReminderSchedule("beforeMaghrib", "18:00"),
        "notifyWardAwakening" to NativeReminderSchedule("suggested", "04:30"),
        "notifyWardMorning" to NativeReminderSchedule("suggested", "05:30"),
        "notifyWardEvening" to NativeReminderSchedule("suggested", "15:30"),
        "notifyWardSleep" to NativeReminderSchedule("suggested", "20:00")
    )

    val sections = listOf(
        NativeReminderSection("أذكار اليوم", listOf(
            NativeReminderDefinition(listOf("notifyWardAwakening"), "أذكار الاستيقاظ", "موعد مقترح 04:30", "notifyWardAwakening"),
            NativeReminderDefinition(listOf("notifyWardMorning"), "أذكار الصباح", "موعد مقترح 05:30", "notifyWardMorning"),
            NativeReminderDefinition(listOf("notifyWardGeneral"), "أذكار اليوم", "تذكير يومي الساعة 12:00"),
            NativeReminderDefinition(listOf("notifyWardEvening"), "أذكار المساء", "موعد مقترح 15:30", "notifyWardEvening"),
            NativeReminderDefinition(listOf("notifyWardSleep"), "أذكار النوم", "موعد مقترح 20:00", "notifyWardSleep"),
            NativeReminderDefinition(listOf("notifyWardSahar"), "استغفار السحر", "تذكير يومي الساعة 02:00")
        )),
        NativeReminderSection("الصلاة", listOf(
            NativeReminderDefinition(listOf("notifyPrayerSoon"), "التنبيه قبل الصلاة", "قبل كل صلاة بـ15 دقيقة"),
            NativeReminderDefinition(listOf("beforeFajrReminder"), "التنبيه قبل الفجر", "قبل الفجر بـ30 دقيقة"),
            NativeReminderDefinition(listOf("notifySunrise"), "تذكير الشروق", "عند وقت الشروق"),
            NativeReminderDefinition(listOf("notifyDuha"), "تذكير صلاة الضحى", "بعد الشروق بـ30 دقيقة"),
            NativeReminderDefinition(listOf("notifyLastThird"), "الثلث الأخير من الليل", "يُحسب من المغرب والفجر")
        )),
        NativeReminderSection("أذكار وورد إضافي", listOf(
            NativeReminderDefinition(listOf("notifyAyatKursi"), "آية الكرسي", "قبل المغرب بنصف ساعة أو وقت تختاره", "notifyAyatKursi"),
            NativeReminderDefinition(listOf("notifyHadith"), "حديث اليوم", "تذكير يومي الساعة 12:30"),
            NativeReminderDefinition(listOf("notifyBaqiyat"), "الباقيات الصالحات", "تذكير يومي الساعة 14:00"),
            NativeReminderDefinition(listOf("notifySalawat_1", "notifySalawat_2"), "الصلاة على النبي ﷺ", "تذكيران يوميًا الساعة 10:00 و17:00")
        )),
        NativeReminderSection("الجمعة والصيام", listOf(
            NativeReminderDefinition(listOf("notifyFridayKahf"), "سورة الكهف", "صباح الجمعة بعد الفجر"),
            NativeReminderDefinition(listOf("notifyFridayPrayer"), "صلاة الجمعة", "قبل الظهر بـ45 دقيقة يوم الجمعة"),
            NativeReminderDefinition(listOf("notifyFridayHour"), "ساعة الإجابة", "بعد العصر يوم الجمعة"),
            NativeReminderDefinition(listOf("notifyFridaySalawat"), "الصلاة على النبي ﷺ يوم الجمعة", "مساء الخميس عند المغرب"),
            NativeReminderDefinition(listOf("notifyFastingThursday1", "notifyFastingThursday2"), "صيام الخميس", "تذكيران مساء الأربعاء"),
            NativeReminderDefinition(listOf("notifyFastingMonday"), "صيام الاثنين", "مساء الأحد"),
            NativeReminderDefinition(listOf("notifyFastingFisabilillah"), "صيام في سبيل الله", "مساء السبت")
        )),
        NativeReminderSection("تنبيهات أخرى", listOf(
            NativeReminderDefinition(listOf("notifyRainSunnah"), "سُنّة المطر", "تذكير عند توفر تنبيه المطر")
        ))
    )

    fun load(context: Context): NativeReminderSettings {
        val raw = context.getSharedPreferences(ReminderScheduler.PREFS, Context.MODE_PRIVATE)
            .getString("settings", "{}") ?: "{}"
        val data = runCatching { JSONObject(raw) }.getOrDefault(JSONObject())
        val enabledJson = data.optJSONObject("enabled")
        val enabled = allKeys.associateWith { enabledJson?.optBoolean(it, false) == true }.toMutableMap()
        if (enabledJson?.optBoolean("notifySalawat", false) == true) {
            enabled["notifySalawat_1"] = true
            enabled["notifySalawat_2"] = true
        }
        val savedSchedules = data.optJSONObject("schedules")
        val schedules = defaultSchedules.mapValues { (key, default) ->
            val saved = savedSchedules?.optJSONObject(key)
            val rawTime = saved?.optString("time", default.time) ?: default.time
            val normalized = normalizeTime(rawTime) ?: default.time
            val rawMode = saved?.optString("mode", default.mode) ?: default.mode
            val mode = when {
                key == "notifyAyatKursi" && rawMode in listOf("beforeMaghrib", "custom") -> rawMode
                key != "notifyAyatKursi" && rawMode in listOf("suggested", "custom") -> rawMode
                else -> default.mode
            }
            NativeReminderSchedule(mode, normalized)
        }
        return NativeReminderSettings(
            enabled = enabled,
            schedules = schedules,
            sound = data.optBoolean("sound", true),
            volume = data.optInt("volume", 100).coerceIn(0, 100),
            ayatVoice = data.optString("ayatVoice", "mishary"),
            morningVoice = data.optString("morningVoice", "mishary"),
            eveningVoice = data.optString("eveningVoice", "mishary")
        )
    }

    fun saveAndSchedule(
        context: Context,
        city: NativeCity,
        prayerTimes: List<NativePrayerTime>,
        settings: NativeReminderSettings,
        calculationMethod: NativeCalculationMethod,
        asrMadhab: NativeAsrMadhab
    ) {
        try {
            val enabled = JSONObject()
            allKeys.forEach { enabled.put(it, settings.enabled[it] == true) }
            val prayers = JSONObject()
            val prayerKeys = mapOf(
                "الفجر" to "Fajr", "الشروق" to "Sunrise", "الظهر" to "Dhuhr",
                "العصر" to "Asr", "المغرب" to "Maghrib", "العشاء" to "Isha"
            )
            prayerTimes.forEach { item ->
                val key = prayerKeys[item.name]
                if (key != null) prayers.put(key, NativePrayerCalculator.formatTime(item.epochMillis))
            }
            val schedules = JSONObject()
            settings.schedules.forEach { (key, value) ->
                schedules.put(key, JSONObject().put("mode", value.mode).put("time", value.time))
            }
            val data = JSONObject()
                .put("enabled", enabled)
                .put("prayers", prayers)
                .put("city", city.name)
                .put("country", city.country)
                .put("latitude", city.latitude)
                .put("longitude", city.longitude)
                .put("calculationMethod", calculationMethod.name)
                .put("asrMadhab", asrMadhab.name)
                .put("schedules", schedules)
                .put("morningVoice", settings.morningVoice)
                .put("eveningVoice", settings.eveningVoice)
                .put("ayatVoice", settings.ayatVoice)
                .put("sound", settings.sound)
                .put("volume", settings.volume)
            context.getSharedPreferences(ReminderScheduler.PREFS, Context.MODE_PRIVATE)
                .edit().putString("settings", data.toString()).apply()
            PrayerWidgetProvider.updateAll(context)
            ReminderScheduler.scheduleSaved(context)
        } catch (_: Exception) {
        }
    }

    fun normalizeTime(value: String): String? {
        val parts = value.split(":")
        if (parts.size != 2) return null
        val hour = parts[0].toIntOrNull() ?: return null
        val minute = parts[1].toIntOrNull() ?: return null
        if (hour !in 0..23 || minute !in 0..59) return null
        return String.format(Locale.US, "%02d:%02d", hour, minute)
    }
}

@Composable
internal fun NativeReminderSettingsPanel(
    settings: NativeReminderSettings,
    onSettingsChange: (NativeReminderSettings) -> Unit,
    onRequestNotificationPermission: () -> Unit,
    notificationsAllowed: Boolean
) {
    val context = LocalContext.current
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("التذكيرات والإشعارات", color = DeepGreen, fontSize = 21.sp, fontWeight = FontWeight.Bold)
        Text(
            if (Build.VERSION.SDK_INT >= 33 && !notificationsAllowed)
                "فعّل الإشعارات حتى تظهر التنبيهات. اختياراتك ستُحفظ حتى تمنح الإذن."
            else "اختر التذكيرات التي تناسبك؛ تُحفظ وتُجدول على الجهاز.",
            color = Muted, fontSize = 13.sp
        )
        NativeReminderCatalog.sections.forEach { section ->
            Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(20.dp)) {
                Column(Modifier.padding(15.dp)) {
                    Text(section.title, color = DeepGreen, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Spacer(Modifier.height(4.dp))
                    section.items.forEach { definition ->
                        val isEnabled = definition.keys.any { settings.enabled[it] == true }
                        ReminderPreferenceRow(
                            definition = definition,
                            checked = isEnabled,
                            selectedTime = definition.scheduleKey?.let { settings.schedules[it]?.time },
                            onToggle = { checked ->
                                val nextEnabled = settings.enabled.toMutableMap().apply {
                                    definition.keys.forEach { put(it, checked) }
                                }
                                onSettingsChange(settings.copy(enabled = nextEnabled))
                                if (checked) onRequestNotificationPermission()
                            },
                            onTimeClick = { scheduleKey ->
                                val current = settings.schedules[scheduleKey]?.time ?: "18:00"
                                val parts = current.split(":")
                                TimePickerDialog(
                                    context,
                                    { _, hour, minute ->
                                        val updated = settings.schedules.toMutableMap()
                                        updated[scheduleKey] = NativeReminderSchedule(
                                            mode = if (scheduleKey == "notifyAyatKursi") "custom" else "custom",
                                            time = String.format(Locale.US, "%02d:%02d", hour, minute)
                                        )
                                        onSettingsChange(settings.copy(schedules = updated))
                                    },
                                    parts.getOrNull(0)?.toIntOrNull() ?: 18,
                                    parts.getOrNull(1)?.toIntOrNull() ?: 0,
                                    true
                                ).show()
                            }
                        )
                    }
                }
            }
        }
        Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(20.dp)) {
            Column(Modifier.padding(15.dp)) {
                Text("صوت التذكيرات", color = DeepGreen, fontWeight = FontWeight.Bold)
                ReminderPreferenceRow(
                    definition = NativeReminderDefinition(emptyList(), "تشغيل الصوت مع التذكير", "يمكنك كتم الصوت مع إبقاء الإشعارات"),
                    checked = settings.sound,
                    onToggle = { onSettingsChange(settings.copy(sound = it)) },
                    onTimeClick = {}
                )
            }
        }
    }
}

@Composable
private fun ReminderPreferenceRow(
    definition: NativeReminderDefinition,
    checked: Boolean,
    selectedTime: String? = null,
    onToggle: (Boolean) -> Unit,
    onTimeClick: (String) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f).padding(end = 8.dp)) {
            Text(definition.title, color = Ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            Text(definition.description, color = Muted, fontSize = 11.sp)
            if (selectedTime != null && definition.scheduleKey != null) {
                TextButton(
                    onClick = { onTimeClick(definition.scheduleKey) },
                    modifier = Modifier.padding(start = 0.dp)
                ) { Text("الوقت: $selectedTime · تغيير", color = Green, fontSize = 12.sp) }
            }
        }
        Switch(checked = checked, onCheckedChange = onToggle)
    }
}
