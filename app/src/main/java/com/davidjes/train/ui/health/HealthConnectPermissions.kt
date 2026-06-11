package com.davidjes.train.ui.health

import androidx.activity.compose.ManagedActivityResultLauncher
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.health.connect.client.PermissionController
import com.davidjes.train.data.health.HealthConnectManager

/**
 * Remembers a launcher for the Health Connect permission flow. Invoke
 * `launcher.launch(manager.permissions)` to prompt; [onResult] receives the set
 * of granted permissions.
 */
@Composable
fun rememberHealthConnectPermissionLauncher(
    onResult: (granted: Set<String>) -> Unit,
): ManagedActivityResultLauncher<Set<String>, Set<String>> {
    val contract = remember { PermissionController.createRequestPermissionResultContract() }
    return rememberLauncherForActivityResult(contract) { granted -> onResult(granted) }
}

fun HealthConnectManager.allGranted(granted: Set<String>): Boolean = granted.containsAll(permissions)
