package com.anyas.app

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.Upsert
import androidx.sqlite.db.SupportSQLiteDatabase
import kotlinx.coroutines.flow.Flow
import org.json.JSONArray

@Entity(tableName = "azkar_topics")
data class AzkarTopicEntity(
    @PrimaryKey val topicNumber: Int,
    val title: String,
    val description: String
)

@Entity(
    tableName = "dhikr_items",
    primaryKeys = ["topicNumber", "itemIndex"],
    foreignKeys = [
        ForeignKey(
            entity = AzkarTopicEntity::class,
            parentColumns = ["topicNumber"],
            childColumns = ["topicNumber"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index(value = ["topicNumber"])]
)
data class DhikrItemEntity(
    val topicNumber: Int,
    val itemIndex: Int,
    val sourceId: Int,
    val text: String,
    val repeatCount: Int
)

@Entity(tableName = "wird_sections")
data class WirdSectionEntity(
    @PrimaryKey val sectionId: String,
    val title: String,
    val sortOrder: Int
)

@Entity(
    tableName = "wird_section_items",
    primaryKeys = ["sectionId", "position"],
    foreignKeys = [
        ForeignKey(
            entity = WirdSectionEntity::class,
            parentColumns = ["sectionId"],
            childColumns = ["sectionId"],
            onDelete = ForeignKey.CASCADE
        ),
        ForeignKey(
            entity = DhikrItemEntity::class,
            parentColumns = ["topicNumber", "itemIndex"],
            childColumns = ["topicNumber", "itemIndex"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [
        Index("sectionId"),
        Index(value = ["topicNumber", "itemIndex"]),
        Index(value = ["sectionId", "topicNumber", "itemIndex"], unique = true)
    ]
)
data class WirdSectionItemEntity(
    val sectionId: String,
    val position: Int,
    val topicNumber: Int,
    val itemIndex: Int
)

@Entity(
    tableName = "wird_item_progress",
    primaryKeys = ["localDate", "sectionId", "topicNumber", "itemIndex"],
    indices = [Index(value = ["localDate", "sectionId"])]
)
data class WirdItemProgressEntity(
    val localDate: String,
    val sectionId: String,
    val topicNumber: Int,
    val itemIndex: Int,
    val completed: Boolean,
    val updatedAtMillis: Long
)

@Entity(
    tableName = "topic_dhikr_progress",
    primaryKeys = ["localDate", "topicNumber", "itemIndex"],
    indices = [Index(value = ["localDate", "topicNumber"])]
)
data class TopicDhikrProgressEntity(
    val localDate: String,
    val topicNumber: Int,
    val itemIndex: Int,
    val count: Int,
    val updatedAtMillis: Long
)

@Entity(
    tableName = "daily_dhikr_progress",
    primaryKeys = ["hijriDateKey", "dhikrId"]
)
data class DailyDhikrProgressEntity(
    val hijriDateKey: String,
    val dhikrId: String,
    val count: Int,
    val updatedAtMillis: Long
)

@Entity(
    tableName = "daily_sunnah_progress",
    primaryKeys = ["hijriDateKey", "sunnahId"]
)
data class DailySunnahProgressEntity(
    val hijriDateKey: String,
    val sunnahId: String,
    val completed: Boolean,
    val updatedAtMillis: Long
)

@Entity(
    tableName = "favorite_dhikr",
    primaryKeys = ["topicNumber", "itemIndex"],
    indices = [Index(value = ["topicNumber"])]
)
data class FavoriteDhikrEntity(
    val topicNumber: Int,
    val itemIndex: Int,
    val addedAtMillis: Long
)

@Entity(tableName = "legacy_import_runs")
data class LegacyImportRunEntity(
    @PrimaryKey val importId: String,
    val sourceVersion: Int,
    val status: String,
    val startedAtMillis: Long,
    val expectedSourceKeyCount: Int,
    val stagedSourceKeyCount: Int,
    val importedRowCount: Int,
    val sourceFingerprint: String?,
    val completedAtMillis: Long?,
    val lastError: String?
)

@Entity(
    tableName = "legacy_import_raw",
    primaryKeys = ["importId", "localStorageKey"],
    foreignKeys = [
        ForeignKey(
            entity = LegacyImportRunEntity::class,
            parentColumns = ["importId"],
            childColumns = ["importId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index(value = ["importId"])]
)
data class LegacyImportRawEntity(
    val importId: String,
    val localStorageKey: String,
    val rawValue: String,
    val valueFingerprint: String
)

data class WirdContentRow(
    val sectionId: String,
    val sectionPosition: Int,
    val topicNumber: Int,
    val itemIndex: Int,
    val sourceId: Int,
    val text: String,
    val repeatCount: Int
)

@Dao
interface NativeWirdDao {
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertTopics(topics: List<AzkarTopicEntity>)

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertDhikrItems(items: List<DhikrItemEntity>)

    @Query("SELECT * FROM azkar_topics ORDER BY topicNumber")
    fun observeTopics(): Flow<List<AzkarTopicEntity>>

    @Query("SELECT * FROM dhikr_items WHERE topicNumber = :topicNumber ORDER BY itemIndex")
    fun observeTopicItems(topicNumber: Int): Flow<List<DhikrItemEntity>>

    @Query("SELECT * FROM dhikr_items ORDER BY topicNumber, itemIndex")
    suspend fun getAllDhikrItems(): List<DhikrItemEntity>

    @Query(
        """SELECT section_items.sectionId AS sectionId,
                  section_items.position AS sectionPosition,
                  section_items.topicNumber AS topicNumber,
                  section_items.itemIndex AS itemIndex,
                  dhikr_items.sourceId AS sourceId,
                  dhikr_items.text AS text,
                  dhikr_items.repeatCount AS repeatCount
           FROM wird_section_items AS section_items
           INNER JOIN dhikr_items
             ON dhikr_items.topicNumber = section_items.topicNumber
            AND dhikr_items.itemIndex = section_items.itemIndex
           WHERE section_items.sectionId = :sectionId
           ORDER BY section_items.position"""
    )
    fun observeWirdItems(sectionId: String): Flow<List<WirdContentRow>>

    @Query("SELECT * FROM wird_sections ORDER BY sortOrder")
    fun observeWirdSections(): Flow<List<WirdSectionEntity>>

    @Query("SELECT * FROM wird_item_progress WHERE localDate = :localDate AND sectionId = :sectionId")
    fun observeWirdProgress(localDate: String, sectionId: String): Flow<List<WirdItemProgressEntity>>

    @Query("SELECT * FROM wird_item_progress WHERE localDate = :localDate")
    suspend fun getWirdProgressForDate(localDate: String): List<WirdItemProgressEntity>

    @Query("SELECT * FROM wird_section_items WHERE sectionId = :sectionId AND topicNumber = :topicNumber AND itemIndex = :itemIndex LIMIT 1")
    suspend fun findWirdSectionItem(sectionId: String, topicNumber: Int, itemIndex: Int): WirdSectionItemEntity?

    @Upsert
    suspend fun saveWirdProgress(progress: WirdItemProgressEntity)

    @Upsert
    suspend fun saveWirdProgress(progress: List<WirdItemProgressEntity>)

    @Query("SELECT * FROM topic_dhikr_progress WHERE localDate = :localDate")
    suspend fun getTopicProgressForDate(localDate: String): List<TopicDhikrProgressEntity>

    @Query("SELECT * FROM topic_dhikr_progress WHERE localDate = :localDate AND topicNumber = :topicNumber")
    fun observeTopicProgress(localDate: String, topicNumber: Int): Flow<List<TopicDhikrProgressEntity>>

    @Query("SELECT * FROM topic_dhikr_progress WHERE localDate = :localDate AND topicNumber = :topicNumber AND itemIndex = :itemIndex LIMIT 1")
    suspend fun getTopicProgress(localDate: String, topicNumber: Int, itemIndex: Int): TopicDhikrProgressEntity?

    @Upsert
    suspend fun saveTopicProgress(progress: TopicDhikrProgressEntity)

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertTopicProgressIfAbsent(progress: List<TopicDhikrProgressEntity>): List<Long>

    @Query("SELECT * FROM daily_dhikr_progress WHERE hijriDateKey = :hijriDateKey")
    suspend fun getDailyDhikrProgress(hijriDateKey: String): List<DailyDhikrProgressEntity>

    @Upsert
    suspend fun saveDailyDhikrProgress(progress: DailyDhikrProgressEntity)

    @Query("SELECT * FROM daily_sunnah_progress WHERE hijriDateKey = :hijriDateKey")
    suspend fun getDailySunnahProgress(hijriDateKey: String): List<DailySunnahProgressEntity>

    @Upsert
    suspend fun saveDailySunnahProgress(progress: DailySunnahProgressEntity)

    @Query("SELECT * FROM favorite_dhikr ORDER BY addedAtMillis DESC")
    fun observeFavorites(): Flow<List<FavoriteDhikrEntity>>

    @Upsert
    suspend fun saveFavorite(favorite: FavoriteDhikrEntity)

    @Query("DELETE FROM favorite_dhikr WHERE topicNumber = :topicNumber AND itemIndex = :itemIndex")
    suspend fun removeFavorite(topicNumber: Int, itemIndex: Int)

    @Query("SELECT * FROM legacy_import_runs WHERE importId = :importId LIMIT 1")
    suspend fun getImportRun(importId: String): LegacyImportRunEntity?

    @Upsert
    suspend fun saveImportRun(run: LegacyImportRunEntity)

    @Query("SELECT * FROM legacy_import_raw WHERE importId = :importId ORDER BY localStorageKey")
    suspend fun getStagedLegacyValues(importId: String): List<LegacyImportRawEntity>

    @Upsert
    suspend fun stageLegacyValues(values: List<LegacyImportRawEntity>)

    @Query("DELETE FROM legacy_import_raw WHERE importId = :importId")
    suspend fun clearStagedLegacyValues(importId: String)

}

@Database(
    entities = [
        AzkarTopicEntity::class,
        DhikrItemEntity::class,
        WirdSectionEntity::class,
        WirdSectionItemEntity::class,
        WirdItemProgressEntity::class,
        TopicDhikrProgressEntity::class,
        DailyDhikrProgressEntity::class,
        DailySunnahProgressEntity::class,
        FavoriteDhikrEntity::class,
        LegacyImportRunEntity::class,
        LegacyImportRawEntity::class
    ],
    version = 1,
    exportSchema = true
)
abstract class AniasDatabase : RoomDatabase() {
    abstract fun nativeWirdDao(): NativeWirdDao

    companion object {
        @Volatile
        private var instance: AniasDatabase? = null

        fun get(context: Context): AniasDatabase = instance ?: synchronized(this) {
            instance ?: Room.databaseBuilder(
                context.applicationContext,
                AniasDatabase::class.java,
                "anyas-local.db"
            ).addCallback(object : RoomDatabase.Callback() {
                override fun onCreate(db: androidx.sqlite.db.SupportSQLiteDatabase) {
                    super.onCreate(db)
                    NativeAzkarSeeder.seed(context.applicationContext, db)
                }
            }).build().also { instance = it }
        }
    }
}

private object NativeAzkarSeeder {
    private data class SectionSeed(
        val id: String,
        val title: String,
        val topicNumber: Int,
        val sourceIndexes: List<Int>,
        val order: Int
    )

    private val sections = listOf(
        SectionSeed("morning", "أذكار الصباح", 27, (0..21).toList() + 23, 0),
        SectionSeed("evening", "أذكار المساء", 27, listOf(0, 1, 3, 4, 7, 8, 9, 10, 11, 12, 13, 16, 17, 21, 22, 23), 1),
        SectionSeed("afterPrayer", "أذكار بعد الصلاة", 25, (0..7).toList(), 2),
        SectionSeed("beforeSleep", "أذكار النوم", 28, (0..12).toList(), 3)
    )

    fun seed(context: Context, database: SupportSQLiteDatabase) {
        val source = runCatching {
            context.assets.open("azkar-topics.json").bufferedReader().use { it.readText() }
        }.getOrNull() ?: return
        val topicsJson = runCatching { JSONArray(source) }.getOrNull() ?: return
        val topics = mutableListOf<AzkarTopicEntity>()
        val items = mutableListOf<DhikrItemEntity>()
        val itemCounts = mutableMapOf<Int, Int>()

        for (topicIndex in 0 until topicsJson.length()) {
            val topic = topicsJson.optJSONObject(topicIndex) ?: continue
            val topicNumber = topic.optInt("number")
            if (topicNumber <= 0) continue
            topics += AzkarTopicEntity(
                topicNumber = topicNumber,
                title = topic.optString("title"),
                description = topic.optString("description")
            )
            val topicItems = topic.optJSONArray("items") ?: JSONArray()
            itemCounts[topicNumber] = topicItems.length()
            for (itemIndex in 0 until topicItems.length()) {
                val item = topicItems.optJSONObject(itemIndex) ?: continue
                items += DhikrItemEntity(
                    topicNumber = topicNumber,
                    itemIndex = itemIndex,
                    sourceId = item.optInt("id", itemIndex + 1),
                    text = item.optString("text"),
                    repeatCount = item.optInt("count", 1).coerceAtLeast(1)
                )
            }
        }

        val sectionEntities = sections.map { WirdSectionEntity(it.id, it.title, it.order) }
        val sectionItems = sections.flatMap { section ->
            section.sourceIndexes.mapIndexedNotNull { position, sourceIndex ->
                if (sourceIndex !in 0 until (itemCounts[section.topicNumber] ?: 0)) return@mapIndexedNotNull null
                WirdSectionItemEntity(section.id, position, section.topicNumber, sourceIndex)
            }
        }
        topics.forEach { topic ->
            database.execSQL(
                "INSERT OR IGNORE INTO azkar_topics (topicNumber, title, description) VALUES (?, ?, ?)",
                arrayOf(topic.topicNumber, topic.title, topic.description)
            )
        }
        items.forEach { item ->
            database.execSQL(
                "INSERT OR IGNORE INTO dhikr_items (topicNumber, itemIndex, sourceId, text, repeatCount) VALUES (?, ?, ?, ?, ?)",
                arrayOf(item.topicNumber, item.itemIndex, item.sourceId, item.text, item.repeatCount)
            )
        }
        sectionEntities.forEach { section ->
            database.execSQL(
                "INSERT OR IGNORE INTO wird_sections (sectionId, title, sortOrder) VALUES (?, ?, ?)",
                arrayOf(section.sectionId, section.title, section.sortOrder)
            )
        }
        sectionItems.forEach { item ->
            database.execSQL(
                "INSERT OR IGNORE INTO wird_section_items (sectionId, position, topicNumber, itemIndex) VALUES (?, ?, ?, ?)",
                arrayOf(item.sectionId, item.position, item.topicNumber, item.itemIndex)
            )
        }
    }
}
