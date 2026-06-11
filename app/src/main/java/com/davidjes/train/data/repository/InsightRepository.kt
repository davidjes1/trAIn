package com.davidjes.train.data.repository

import com.davidjes.train.data.local.InsightDao
import com.davidjes.train.data.local.InsightEntity
import com.davidjes.train.domain.model.Insight
import com.davidjes.train.domain.model.InsightKind
import com.davidjes.train.domain.model.InsightTone
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.time.Instant
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class InsightRepository @Inject constructor(
    private val insightDao: InsightDao,
) {
    fun recent(limit: Int = 20): Flow<List<Insight>> =
        insightDao.observeRecent(limit).map { list -> list.map { it.toDomain() } }

    suspend fun save(insight: Insight) = insightDao.upsert(insight.toEntity())

    suspend fun saveAll(insights: List<Insight>) = insights.forEach { save(it) }

    private fun InsightEntity.toDomain() = Insight(
        id = id,
        kind = runCatching { InsightKind.valueOf(kind) }.getOrDefault(InsightKind.REVIEW),
        tone = runCatching { InsightTone.valueOf(tone) }.getOrDefault(InsightTone.INFO),
        title = title,
        body = body,
        createdAt = Instant.ofEpochMilli(createdAtMillis),
        series = seriesCsv.split(",").mapNotNull { it.trim().toFloatOrNull() },
    )

    private fun Insight.toEntity() = InsightEntity(
        id = id,
        kind = kind.name,
        tone = tone.name,
        title = title,
        body = body,
        createdAtMillis = createdAt.toEpochMilli(),
        seriesCsv = series.joinToString(","),
    )
}
