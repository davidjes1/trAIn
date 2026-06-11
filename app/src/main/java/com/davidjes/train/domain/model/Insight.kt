package com.davidjes.train.domain.model

import java.time.Instant
import java.time.LocalDate

enum class InsightKind { REVIEW, ANOMALY, TREND }
enum class InsightTone { POSITIVE, CAUTION, FLAG, INFO }

data class Insight(
    val id: String,
    val kind: InsightKind,
    val tone: InsightTone,
    val title: String,
    /** Clinical voice: "HRV is down 12%; consider Z2." */
    val body: String,
    val createdAt: Instant,
    /** Optional sparkline series backing the insight. */
    val series: List<Float> = emptyList(),
)

enum class ChatRole { USER, GEMINI }

data class ChatMessage(
    val id: String,
    val role: ChatRole,
    val text: String,
    val createdAt: Instant,
)

// ─── Nutrition ───────────────────────────────────────────────────────────────

data class Meal(
    val id: String,
    val name: String,
    val kcal: Int,
    val proteinG: Int,
    val carbsG: Int,
    val fatG: Int,
    val loggedAt: Instant,
)

data class NutritionDay(
    val date: LocalDate,
    val targetKcal: Int,
    val targetProteinG: Int,
    val targetCarbsG: Int,
    val targetFatG: Int,
    val meals: List<Meal>,
) {
    val eatenKcal: Int get() = meals.sumOf { it.kcal }
    val proteinG: Int get() = meals.sumOf { it.proteinG }
    val carbsG: Int get() = meals.sumOf { it.carbsG }
    val fatG: Int get() = meals.sumOf { it.fatG }
}

// ─── Habits ──────────────────────────────────────────────────────────────────

data class Habit(
    val id: String,
    val label: String,
    val iconKey: String,
    val streak: Int = 0,
    val doneToday: Boolean = false,
)
