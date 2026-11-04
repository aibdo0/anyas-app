package com.anyas.app

import android.content.SharedPreferences
import androidx.room.withTransaction
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import java.security.MessageDigest

/** Owns the local read/write path for daily topic-based adhkar progress. */
internal class NativeAzkarProgressRepository(
    private val database: AniasDatabase
) {
    private val dao = database.nativeWirdDao()

    fun observeTopicProgress(localDate: String, topicNumber: Int): Flow<List<TopicDhikrProgressEntity>> =
        dao.observeTopicProgress(localDate, topicNumber)

    /**
     * Imports the app's pre-Room SharedPreferences counters once. The source keys are
     * deliberately left untouched; the Room insert ignores conflicts so this is safe
     * to retry if the transaction is interrupted.
     */
    suspend fun importLegacyProgress(
        preferences: SharedPreferences,
        localDate: String
    ) = withContext(Dispatchers.IO) {
        val sourceEntries = preferences.all.entries.mapNotNull { (key, value) ->
            val match = LEGACY_PROGRESS_KEY.matchEntire(key) ?: return@mapNotNull null
            val rawCount = when (value) {
                is Int -> value
                is Long -> value.takeIf { it in Int.MIN_VALUE.toLong()..Int.MAX_VALUE.toLong() }?.toInt()
                is String -> value.toIntOrNull()
                else -> null
            } ?: return@mapNotNull null
            if (rawCount <= 0) return@mapNotNull null
            LegacyProgress(
                key = key,
                topicNumber = match.groupValues[1].toIntOrNull() ?: return@mapNotNull null,
                sourceId = match.groupValues[2].toIntOrNull() ?: return@mapNotNull null,
                count = rawCount
            )
        }.sortedBy(LegacyProgress::key)
        val fingerprint = fingerprint(sourceEntries)
        val startedAt = System.currentTimeMillis()

        database.withTransaction {
            if (dao.getImportRun(IMPORT_ID) != null) return@withTransaction

            val itemByLegacyKey = dao.getAllDhikrItems().associateBy { "${it.topicNumber}_${it.sourceId}" }
            val mappedProgress = sourceEntries.mapNotNull { legacy ->
                val item = itemByLegacyKey["${legacy.topicNumber}_${legacy.sourceId}"] ?: return@mapNotNull null
                TopicDhikrProgressEntity(
                    localDate = localDate,
                    topicNumber = item.topicNumber,
                    itemIndex = item.itemIndex,
                    count = legacy.count.coerceAtMost(item.repeatCount),
                    updatedAtMillis = startedAt
                )
            }
            val insertResults = if (mappedProgress.isEmpty()) emptyList() else dao.insertTopicProgressIfAbsent(mappedProgress)
            val insertedCount = insertResults.count { it != -1L }
            val skippedCount = sourceEntries.size - mappedProgress.size
            val status = if (skippedCount == 0) STATUS_COMPLETED else STATUS_COMPLETED_WITH_SKIPS

            dao.saveImportRun(
                LegacyImportRunEntity(
                    importId = IMPORT_ID,
                    sourceVersion = SOURCE_VERSION,
                    status = status,
                    startedAtMillis = startedAt,
                    expectedSourceKeyCount = sourceEntries.size,
                    stagedSourceKeyCount = mappedProgress.size,
                    importedRowCount = insertedCount,
                    sourceFingerprint = fingerprint,
                    completedAtMillis = System.currentTimeMillis(),
                    lastError = if (skippedCount == 0) null else "$skippedCount legacy keys did not match current content"
                )
            )
        }
    }

    suspend fun increment(
        localDate: String,
        topicNumber: Int,
        itemIndex: Int,
        maximum: Int
    ) = withContext(Dispatchers.IO) {
        if (maximum <= 0) return@withContext
        database.withTransaction {
            val current = dao.getTopicProgress(localDate, topicNumber, itemIndex)
            val currentCount = current?.count?.coerceIn(0, maximum) ?: 0
            if (currentCount < maximum) {
                dao.saveTopicProgress(
                    TopicDhikrProgressEntity(
                        localDate = localDate,
                        topicNumber = topicNumber,
                        itemIndex = itemIndex,
                        count = currentCount + 1,
                        updatedAtMillis = System.currentTimeMillis()
                    )
                )
            }
        }
    }

    private data class LegacyProgress(
        val key: String,
        val topicNumber: Int,
        val sourceId: Int,
        val count: Int
    )

    private fun fingerprint(entries: List<LegacyProgress>): String {
        val source = entries.joinToString("\n") { "${it.key}=${it.count}" }
        val digest = MessageDigest.getInstance("SHA-256").digest(source.toByteArray(Charsets.UTF_8))
        return digest.joinToString("") { "%02x".format(it) }
    }

    private companion object {
        const val IMPORT_ID = "android-sharedpreferences-azkar-progress-v1"
        const val SOURCE_VERSION = 1
        const val STATUS_COMPLETED = "completed"
        const val STATUS_COMPLETED_WITH_SKIPS = "completed_with_skips"
        val LEGACY_PROGRESS_KEY = Regex("dhikr_(\\d+)_(\\d+)")
    }
}
