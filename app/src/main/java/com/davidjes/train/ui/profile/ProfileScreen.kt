package com.davidjes.train.ui.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.davidjes.train.ui.components.FilledEmphasisCard
import com.davidjes.train.ui.components.KickerText
import com.davidjes.train.ui.components.OutlinedContentCard
import com.davidjes.train.ui.components.TrainIcons
import com.davidjes.train.ui.components.TrainScreenScaffold
import com.davidjes.train.ui.components.ZoneStack
import com.davidjes.train.ui.navigation.TopDest
import com.davidjes.train.ui.theme.MonoNumber
import com.davidjes.train.ui.theme.Spacing
import com.davidjes.train.ui.theme.trainColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    onNavigate: (TopDest) -> Unit,
    onOpenNutrition: () -> Unit,
) {
    val vm: ProfileViewModel = hiltViewModel()
    val state by vm.state.collectAsStateWithLifecycle()
    val profile = state.profile

    TrainScreenScaffold(
        current = TopDest.YOU,
        onNavigate = onNavigate,
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("You") },
                actions = { IconButton(onClick = { }) { Icon(TrainIcons.settings, contentDescription = "Settings") } },
            )
        },
    ) { padding ->
        Column(
            Modifier.padding(padding).verticalScroll(rememberScrollState())
                .padding(start = Spacing.screen, end = Spacing.screen, top = Spacing.sm, bottom = 110.dp),
            verticalArrangement = Arrangement.spacedBy(Spacing.cardGap),
        ) {
            // Identity
            OutlinedContentCard {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
                    Box(
                        Modifier.size(56.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            profile.displayName.trim().firstOrNull()?.uppercase() ?: "A",
                            style = MaterialTheme.typography.titleLarge,
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                        )
                    }
                    Column(Modifier.weight(1f)) {
                        Text(profile.displayName.ifBlank { "Athlete" }, style = MaterialTheme.typography.titleLarge)
                        Text("${profile.sex.name.lowercase().replaceFirstChar { it.uppercase() }} · ${profile.age}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    IconButton(onClick = { }) { Icon(TrainIcons.edit, contentDescription = "Edit") }
                }
            }

            // Next race
            state.nextRace?.let { race ->
                FilledEmphasisCard {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        KickerText("Next race")
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            Icon(TrainIcons.flag, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(14.dp))
                            Text("${race.daysAway} days", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                        }
                    }
                    Text(race.name, style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(top = Spacing.sm))
                    Text(race.date.toString(), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            // HR zones
            OutlinedContentCard {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("HR zones", style = MaterialTheme.typography.titleSmall)
                    Text("max ${profile.maxHr} · rest ${profile.restingHr}", style = MonoNumber, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Box(Modifier.padding(top = Spacing.md)) {
                    ZoneStack(
                        values = List(5) { 1f },
                        durations = state.zones.map { it.label },
                    )
                }
            }

            // Connections
            OutlinedContentCard {
                Text("Connections", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(bottom = Spacing.sm))
                ConnectionRow(TrainIcons.watch, "Health Connect", if (state.hcConnected) "Connected" else if (state.hcAvailable) "Not authorized" else "Unavailable", state.hcConnected, enabled = false)
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                ConnectionRow(TrainIcons.spark, "Gemini (on-device)", "Narrative & insights", true, enabled = false)
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                ConnectionRow(TrainIcons.sun, "Dynamic color", "Match wallpaper (Android 12+)", state.dynamicColor, enabled = true, onToggle = vm::setDynamicColor)
            }
        }
    }
}

@Composable
private fun ConnectionRow(
    icon: ImageVector,
    name: String,
    meta: String,
    on: Boolean,
    enabled: Boolean,
    onToggle: (Boolean) -> Unit = {},
) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = Spacing.md),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.md),
    ) {
        Box(
            Modifier.size(40.dp).clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surfaceContainerHigh),
            contentAlignment = Alignment.Center,
        ) { Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp)) }
        Column(Modifier.weight(1f)) {
            Text(name, style = MaterialTheme.typography.titleSmall)
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                Box(Modifier.size(6.dp).clip(CircleShape).background(if (on) MaterialTheme.trainColors.green.base else MaterialTheme.colorScheme.outline))
                Text(meta, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Switch(checked = on, onCheckedChange = if (enabled) onToggle else null)
    }
}
