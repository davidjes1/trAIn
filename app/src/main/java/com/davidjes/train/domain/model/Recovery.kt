package com.davidjes.train.domain.model

import java.time.LocalDate

/**
 * Daily recovery snapshot. HRV (RMSSD ms), resting HR (bpm), body battery (0-100),
 * sleep (hours), and subjective check-ins (0-10). Sourced from Health Connect where
 * available; mood/energy/stress and bodyBattery are app/manual (Health Connect has
 * no body-battery concept) — see RecoveryRepository.
 */
data class RecoveryMetrics(
    val date: LocalDate,
    val hrvMs: Double? = null,
    val restingHr: Int? = null,
    val bodyBattery: Int? = null,
    val sleepHours: Double? = null,
    val sleepScore: Int? = null,
    val mood: Int? = null,        // 0..10
    val energy: Int? = null,      // 0..10
    val stress: Int? = null,      // 0..10
    val weightKg: Double? = null,
)

/** Acute/chronic load and resulting form. */
data class TrainingLoadState(
    val date: LocalDate,
    val ctl: Double, // 28-day chronic (fitness)
    val atl: Double, // 7-day acute (fatigue)
) {
    /** Training Stress Balance (form) = CTL - ATL. */
    val tsb: Double get() = ctl - atl

    enum class Form { PEAK, FRESH, NEUTRAL, FATIGUED, OVERREACHED }

    val form: Form get() = when {
        tsb > 15 -> Form.PEAK
        tsb in 5.0..15.0 -> Form.FRESH
        tsb in -10.0..5.0 -> Form.NEUTRAL
        tsb in -30.0..-10.0 -> Form.FATIGUED
        else -> Form.OVERREACHED
    }
}

data class Readiness(
    val score: Int,          // 0..100
    val drivers: List<String>, // human-readable contributing factors
) {
    enum class Level { VERY_READY, READY, CAUTION, RECOVER }
    val level: Level get() = when {
        score >= 80 -> Level.VERY_READY
        score >= 60 -> Level.READY
        score >= 40 -> Level.CAUTION
        else -> Level.RECOVER
    }
}
