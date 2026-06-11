package com.davidjes.train.ui.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.davidjes.train.data.health.HealthConnectManager
import com.davidjes.train.data.prefs.ProfileRepository
import com.davidjes.train.data.repository.PlanRepository
import com.davidjes.train.domain.model.Sex
import com.davidjes.train.domain.model.UserProfile
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

data class ZoneRange(val name: String, val label: String)

data class NextRace(val name: String, val date: LocalDate, val daysAway: Int)

data class ProfileUiState(
    val profile: UserProfile = UserProfile(),
    val zones: List<ZoneRange> = emptyList(),
    val nextRace: NextRace? = null,
    val planName: String? = null,
    val hcConnected: Boolean = false,
    val hcAvailable: Boolean = false,
    val dynamicColor: Boolean = true,
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val profileRepository: ProfileRepository,
    private val planRepository: PlanRepository,
    private val healthConnect: HealthConnectManager,
) : ViewModel() {

    private val _state = MutableStateFlow(ProfileUiState())
    val state = _state.asStateFlow()

    init {
        // Profile + zones update reactively whenever saved.
        profileRepository.profile
            .onEach { profile -> _state.update { it.copy(profile = profile, zones = buildZones(profile)) } }
            .launchIn(viewModelScope)

        viewModelScope.launch {
            val dyn = profileRepository.dynamicColor.first()
            val plan = planRepository.activePlan().first()
            val today = LocalDate.now()
            val race = plan?.eventEpochDay?.let { LocalDate.ofEpochDay(it) }?.let {
                NextRace(plan.name, it, (it.toEpochDay() - today.toEpochDay()).toInt())
            }
            _state.update {
                it.copy(
                    nextRace = race,
                    planName = plan?.name,
                    hcAvailable = healthConnect.availability() == HealthConnectManager.Availability.INSTALLED,
                    hcConnected = healthConnect.hasAllPermissions(),
                    dynamicColor = dyn,
                )
            }
        }
    }

    fun saveProfile(name: String, age: Int, sex: Sex, restingHr: Int, maxHr: Int) {
        viewModelScope.launch {
            val current = _state.value.profile
            profileRepository.update(
                current.copy(
                    displayName = name.trim(),
                    age = age.coerceIn(10, 100),
                    sex = sex,
                    restingHr = restingHr.coerceIn(30, 120),
                    maxHr = maxHr.coerceIn(120, 230),
                ),
            )
        }
    }

    fun setDynamicColor(value: Boolean) {
        viewModelScope.launch {
            profileRepository.setDynamicColor(value)
            _state.update { it.copy(dynamicColor = value) }
        }
    }

    private fun buildZones(p: UserProfile): List<ZoneRange> {
        val reserve = (p.maxHr - p.restingHr).coerceAtLeast(1)
        fun bpm(frac: Double) = (p.restingHr + frac * reserve).toInt()
        return p.zones.map { z ->
            ZoneRange(z.name, "${bpm(z.minFrac)}–${bpm(z.maxFrac)}")
        }
    }
}
