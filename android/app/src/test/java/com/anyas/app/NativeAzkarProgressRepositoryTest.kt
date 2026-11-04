package com.anyas.app

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.util.UUID

@RunWith(RobolectricTestRunner::class)
class NativeAzkarProgressRepositoryTest {
    private val context: Context = ApplicationProvider.getApplicationContext()
    private val databaseName = "azkar-progress-${UUID.randomUUID()}.db"
    private val preferenceName = "azkar-progress-${UUID.randomUUID()}"
    private var database: AniasDatabase? = null

    @After
    fun cleanUp() {
        database?.close()
        context.deleteDatabase(databaseName)
        context.getSharedPreferences(preferenceName, Context.MODE_PRIVATE).edit().clear().commit()
    }

    @Test
    fun legacyProgressIsImportedOnceAndRoomProgressSurvivesReopen() = runBlocking {
        val localDate = "2026-11-04"
        val preferences = context.getSharedPreferences(preferenceName, Context.MODE_PRIVATE)
        preferences.edit()
            .putInt("dhikr_27_1", 9) // imported count is capped to the source repeat count
            .putInt("dhikr_27_2", 2)
            .putInt("dhikr_27_3", 4)
            .putInt("dhikr_27_404", 1) // stale IDs are ignored and recorded as skipped
            .putInt("unrelated_preference", 12)
            .commit()

        database = openDatabase()
        val firstDao = database!!.nativeWirdDao()
        firstDao.insertTopics(listOf(AzkarTopicEntity(27, "أذكار الصباح", "وصف")))
        firstDao.insertDhikrItems(
            listOf(
                DhikrItemEntity(27, 0, 1, "الذكر الأول", 3),
                DhikrItemEntity(27, 1, 2, "الذكر الثاني", 5),
                DhikrItemEntity(27, 2, 3, "الذكر الثالث", 4)
            )
        )
        firstDao.saveTopicProgress(TopicDhikrProgressEntity(localDate, 27, 2, 1, System.currentTimeMillis()))

        val repository = NativeAzkarProgressRepository(database!!)
        repository.importLegacyProgress(preferences, localDate)
        repository.importLegacyProgress(preferences, localDate)

        var rows = firstDao.getTopicProgressForDate(localDate).sortedBy { it.itemIndex }
        assertEquals(listOf(3, 2, 1), rows.map { it.count })
        assertEquals(3, firstDao.getTopicProgressForDate(localDate).size)
        val import = firstDao.getImportRun("android-sharedpreferences-azkar-progress-v1")
        assertNotNull(import)
        assertEquals("completed_with_skips", import!!.status)
        assertEquals(2, import.importedRowCount) // pre-existing Room row was not overwritten
        assertEquals(9, preferences.getInt("dhikr_27_1", 0)) // source is retained unchanged

        repository.increment(localDate, topicNumber = 27, itemIndex = 1, maximum = 5)
        database!!.close()
        database = openDatabase()

        rows = database!!.nativeWirdDao().getTopicProgressForDate(localDate).sortedBy { it.itemIndex }
        assertEquals(listOf(3, 3, 1), rows.map { it.count })
        assertEquals(12, preferences.getInt("unrelated_preference", 0))
        assertNull(database!!.nativeWirdDao().getTopicProgress("2026-11-05", 27, 1))
    }

    private fun openDatabase(): AniasDatabase =
        Room.databaseBuilder(context, AniasDatabase::class.java, databaseName)
            .allowMainThreadQueries()
            .build()
}
