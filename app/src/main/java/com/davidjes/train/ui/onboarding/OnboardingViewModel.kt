package com.davidjes.train.ui.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.davidjes.train.data.health.HealthConnectManager
import com.davidjes.train.data.prefs.ProfileRepository
import com.davidjes.train.domain.model.Sex
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class OnboardingUiState(
    val hcAvailable: HealthConnectManager.Availability = HealthConnectManager.Availability.INSTALLED,
    val hcConnected: Boolean = false,
)

@HiltViewModel
class OnboardingViewModel @Inject constructor(
    private val profileRepository: ProfileRepository,
    private val healthConnect: HealthConnectManager,
) : ViewModel() {

    private val _state = MutableStateFlow(OnboardingUiState())
    val state = _state.asStateFlow()

    val healthConnectManager: HealthConnectManager get() = healthConnect

    init {
        viewModelScope.launch {
            _state.update { it.copy(hcAvailable = healthConnect.availability(), hcConnected = healthConnect.hasAllPermissions()) }
        }
    }

    fun onPermissionsResult(granted: Set<String>) {
        _state.update { it.copy(hcConnected = granted.containsAll(healthConnect.permissions)) }
    }

    fun complete(onDone: () -> Unit) {
        viewModelScope.launch {
            profileRepository.setOnboarded(true)
            onDone()
        }
    }

    /** Save the entered profile (personalizes TRIMP/zones/readiness), then finish. */
    fun completeWithProfile(name: String, age: Int, sex: Sex, restingHr: Int, maxHr: Int, onDone: () -> Unit) {
        viewModelScope.launch {
            val current = profileRepository.profile.first()
            profileRepository.update(
                current.copy(
                    displayName = name.trim(),
                    age = age.coerceIn(10, 100),
                    sex = sex,
                    restingHr = restingHr.coerceIn(30, 120),
                    maxHr = maxHr.coerceIn(120, 230),
                ),
            )
            profileRepository.setOnboarded(true)
            onDone()
        }
    }
}
