package com.davidjes.train.data.prefs

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.davidjes.train.domain.model.NutritionTargets
import com.davidjes.train.domain.model.Sex
import com.davidjes.train.domain.model.UserProfile
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "train_prefs")

/** User profile + app prefs persisted in DataStore. */
@Singleton
class ProfileRepository @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private object Keys {
        val name = stringPreferencesKey("name")
        val age = intPreferencesKey("age")
        val sex = stringPreferencesKey("sex")
        val restingHr = intPreferencesKey("resting_hr")
        val maxHr = intPreferencesKey("max_hr")
        val ftp = intPreferencesKey("ftp")
        val onboarded = booleanPreferencesKey("onboarded")
        val dynamicColor = booleanPreferencesKey("dynamic_color")
        val targetKcal = intPreferencesKey("target_kcal")
        val targetProtein = intPreferencesKey("target_protein")
        val targetCarbs = intPreferencesKey("target_carbs")
        val targetFat = intPreferencesKey("target_fat")
    }

    val profile: Flow<UserProfile> = context.dataStore.data.map { p ->
        UserProfile(
            displayName = p[Keys.name] ?: "",
            age = p[Keys.age] ?: 30,
            sex = p[Keys.sex]?.let { runCatching { Sex.valueOf(it) }.getOrNull() } ?: Sex.MALE,
            restingHr = p[Keys.restingHr] ?: 55,
            maxHr = p[Keys.maxHr] ?: 190,
            ftpWatts = p[Keys.ftp],
        )
    }

    val onboarded: Flow<Boolean> = context.dataStore.data.map { it[Keys.onboarded] ?: false }
    val dynamicColor: Flow<Boolean> = context.dataStore.data.map { it[Keys.dynamicColor] ?: true }

    val nutritionTargets: Flow<NutritionTargets> = context.dataStore.data.map { p ->
        val d = NutritionTargets()
        NutritionTargets(
            kcal = p[Keys.targetKcal] ?: d.kcal,
            proteinG = p[Keys.targetProtein] ?: d.proteinG,
            carbsG = p[Keys.targetCarbs] ?: d.carbsG,
            fatG = p[Keys.targetFat] ?: d.fatG,
        )
    }

    suspend fun update(profile: UserProfile) {
        context.dataStore.edit { p ->
            p[Keys.name] = profile.displayName
            p[Keys.age] = profile.age
            p[Keys.sex] = profile.sex.name
            p[Keys.restingHr] = profile.restingHr
            p[Keys.maxHr] = profile.maxHr
            profile.ftpWatts?.let { p[Keys.ftp] = it }
        }
    }

    suspend fun setOnboarded(value: Boolean) {
        context.dataStore.edit { it[Keys.onboarded] = value }
    }

    suspend fun setDynamicColor(value: Boolean) {
        context.dataStore.edit { it[Keys.dynamicColor] = value }
    }

    suspend fun setNutritionTargets(t: NutritionTargets) {
        context.dataStore.edit { p ->
            p[Keys.targetKcal] = t.kcal
            p[Keys.targetProtein] = t.proteinG
            p[Keys.targetCarbs] = t.carbsG
            p[Keys.targetFat] = t.fatG
        }
    }
}
