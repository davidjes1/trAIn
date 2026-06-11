package com.davidjes.train.data.repository

import com.davidjes.train.data.local.HabitDao
import com.davidjes.train.data.local.HabitEntity
import com.davidjes.train.data.local.HabitLogEntity
import com.davidjes.train.domain.model.Habit
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import java.time.LocalDate
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class HabitRepository @Inject constructor(
    private val habitDao: HabitDao,
) {
    /** Habits with today's done flag. Streaks are computed on demand via [streakFor]. */
    fun habitsForDay(date: LocalDate): Flow<List<Habit>> =
        combine(habitDao.observeHabits(), habitDao.observeLogsForDay(date.toEpochDay())) { habits, doneIds ->
            habits.map { h ->
                Habit(id = h.id, label = h.label, iconKey = h.iconKey, doneToday = h.id in doneIds)
            }
        }

    suspend fun toggle(habitId: String, date: LocalDate, done: Boolean) {
        if (done) habitDao.log(HabitLogEntity(habitId, date.toEpochDay()))
        else habitDao.unlog(habitId, date.toEpochDay())
    }

    /** Consecutive-day streak ending at [upTo] (inclusive). */
    suspend fun streakFor(habitId: String, upTo: LocalDate): Int {
        val days = habitDao.logDays(habitId).toHashSet()
        var streak = 0
        var d = upTo
        while (days.contains(d.toEpochDay())) {
            streak++
            d = d.minusDays(1)
        }
        return streak
    }

    suspend fun addHabit(habit: HabitEntity) = habitDao.upsertHabit(habit)
    suspend fun removeHabit(id: String) = habitDao.deleteHabit(id)

    /** Create a custom habit, appended after the existing ones. */
    suspend fun addHabit(label: String, iconKey: String) {
        val order = habitDao.observeHabits().first().size
        habitDao.upsertHabit(HabitEntity(id = UUID.randomUUID().toString(), label = label.trim(), iconKey = iconKey, orderIndex = order))
    }

    /** Seed a sensible default habit set on first run. */
    suspend fun seedDefaultsIfEmpty(current: List<Habit>) {
        if (current.isNotEmpty()) return
        val defaults = listOf(
            Triple("hydrate", "Hydrate", "drop"),
            Triple("mobility", "Mobility 10 min", "barbell"),
            Triple("sleep", "Sleep 8h", "moon"),
            Triple("protein", "Protein target", "food"),
        )
        defaults.forEachIndexed { i, (id, label, icon) ->
            habitDao.upsertHabit(HabitEntity(id = id, label = label, iconKey = icon, orderIndex = i))
        }
    }
}
