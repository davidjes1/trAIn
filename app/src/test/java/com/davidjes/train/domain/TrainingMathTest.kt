package com.davidjes.train.domain

import com.davidjes.train.domain.model.RecoveryMetrics
import com.davidjes.train.domain.model.Sex
import com.davidjes.train.domain.training.ReadinessCalculator
import com.davidjes.train.domain.training.TrainingLoadCalculator
import com.davidjes.train.domain.training.TrimpCalculator
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

class TrainingMathTest {

    @Test
    fun trimp_isHigherForHigherIntensity() {
        val easy = TrimpCalculator.trimp(60.0, avgHr = 130, sex = Sex.MALE, restingHr = 50, maxHr = 190)
        val hard = TrimpCalculator.trimp(60.0, avgHr = 170, sex = Sex.MALE, restingHr = 50, maxHr = 190)
        assertTrue("hard ($hard) should exceed easy ($easy)", hard > easy)
    }

    @Test
    fun trimp_femaleCoefficientLowerThanMale() {
        val male = TrimpCalculator.trimp(60.0, 160, Sex.MALE, 50, 190)
        val female = TrimpCalculator.trimp(60.0, 160, Sex.FEMALE, 50, 190)
        assertTrue(male > female)
    }

    @Test
    fun trainingLoad_tsbNegativeAfterLoadSpike() {
        val base = LocalDate.of(2026, 1, 1)
        // 40 days of steady load then a hard week → ATL above CTL → negative TSB.
        val daily = buildMap {
            for (i in 0 until 40) put(base.plusDays(i.toLong()), 50.0)
            for (i in 40 until 47) put(base.plusDays(i.toLong()), 150.0)
        }
        val state = TrainingLoadCalculator.current(daily, base.plusDays(46))!!
        assertTrue("TSB should be negative after a load spike: ${state.tsb}", state.tsb < 0)
        assertTrue(state.atl > state.ctl)
    }

    @Test
    fun readiness_dropsWhenHrvBelowBaseline() {
        val today = LocalDate.of(2026, 1, 10)
        val low = ReadinessCalculator.compute(
            today = RecoveryMetrics(date = today, hrvMs = 40.0, restingHr = 58, sleepHours = 6.0),
            hrvBaseline = 60.0, restingHrBaseline = 52.0, tsb = -15.0,
        )
        val high = ReadinessCalculator.compute(
            today = RecoveryMetrics(date = today, hrvMs = 70.0, restingHr = 48, sleepHours = 8.5),
            hrvBaseline = 60.0, restingHrBaseline = 52.0, tsb = 8.0,
        )
        assertTrue("low readiness (${low.score}) should be < high (${high.score})", low.score < high.score)
        assertEquals(Readiness_levelOf(high.score), high.level)
    }

    private fun Readiness_levelOf(score: Int) = when {
        score >= 80 -> com.davidjes.train.domain.model.Readiness.Level.VERY_READY
        score >= 60 -> com.davidjes.train.domain.model.Readiness.Level.READY
        score >= 40 -> com.davidjes.train.domain.model.Readiness.Level.CAUTION
        else -> com.davidjes.train.domain.model.Readiness.Level.RECOVER
    }
}
