package com.anyas.app

import android.content.Context
import org.json.JSONArray
import java.time.Instant
import java.time.ZoneId
import java.time.chrono.HijrahDate
import java.time.temporal.ChronoField

internal data class NativeDailyQuranVerse(
    val surah: Int,
    val surahName: String,
    val ayah: Int,
    val text: String,
    val hijriDay: Int
)

internal object NativeDailyQuranContent {
    const val ASSET_NAME = "daily-quran.json"
    const val TANZIL_URL = "https://tanzil.net/"
    const val TANZIL_NOTICE = "Tanzil Quran Text\n" +
        "Copyright (C) 2007-2021 Tanzil Project\n" +
        "License: Creative Commons Attribution 3.0\n" +
        "Verbatim copying and distribution permitted; changing the text is not allowed. " +
        "If used in a website/application, clearly indicate Tanzil Project as source, " +
        "link to https://tanzil.net/ and include this notice."

    fun read(context: Context): List<NativeDailyQuranVerse> {
        val json = context.assets.open(ASSET_NAME).bufferedReader(Charsets.UTF_8).use { it.readText() }
        val array = JSONArray(json)
        return buildList(array.length()) {
            for (index in 0 until array.length()) {
                val item = array.getJSONObject(index)
                add(
                    NativeDailyQuranVerse(
                        surah = item.getInt("surah"),
                        surahName = item.getString("surahName"),
                        ayah = item.getInt("ayah"),
                        text = item.getString("text"),
                        hijriDay = index + 1
                    )
                )
            }
        }
    }

    fun forDate(
        verses: List<NativeDailyQuranVerse>,
        epochMillis: Long,
        hijriAdjustmentDays: Int = 0
    ): NativeDailyQuranVerse? {
        if (verses.size < 354) return null
        val localDate = Instant.ofEpochMilli(epochMillis)
            .atZone(ZoneId.systemDefault())
            .toLocalDate()
            .plusDays(hijriAdjustmentDays.coerceIn(-3, 3).toLong())
        val hijriDate = HijrahDate.from(localDate)
        val dayOfHijriYear = hijriDate.get(ChronoField.DAY_OF_YEAR)
        return verses.getOrNull(dayOfHijriYear - 1)?.copy(hijriDay = dayOfHijriYear)
    }
}
