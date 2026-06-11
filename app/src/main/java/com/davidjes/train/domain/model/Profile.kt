package com.davidjes.train.domain.model

enum class Sex { MALE, FEMALE, OTHER }

/** A single HR zone as a fraction-of-reserve (or %max) band. */
data class HrZone(
    val name: String,   // Z1..Z5
    val minFrac: Double, // 0.50
    val maxFrac: Double, // 0.60
)

data class UserProfile(
    val displayName: String = "",
    val age: Int = 30,
    val sex: Sex = Sex.MALE,
    val restingHr: Int = 55,
    val maxHr: Int = 190,
    val zones: List<HrZone> = DEFAULT_ZONES,
    val ftpWatts: Int? = null,
    val thresholdPaceSecPerKm: Int? = null,
) {
    companion object {
        val DEFAULT_ZONES = listOf(
            HrZone("Z1", 0.50, 0.60),
            HrZone("Z2", 0.60, 0.70),
            HrZone("Z3", 0.70, 0.80),
            HrZone("Z4", 0.80, 0.90),
            HrZone("Z5", 0.90, 1.00),
        )
    }
}
