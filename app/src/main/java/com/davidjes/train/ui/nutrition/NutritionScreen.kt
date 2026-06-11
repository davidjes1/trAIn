package com.davidjes.train.ui.nutrition

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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Button
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.davidjes.train.domain.model.NutritionDay
import com.davidjes.train.ui.components.FilledEmphasisCard
import com.davidjes.train.ui.components.KickerText
import com.davidjes.train.ui.components.MacroRing
import com.davidjes.train.ui.components.OutlinedContentCard
import com.davidjes.train.ui.components.TrainIcons
import com.davidjes.train.ui.components.TrainScreenScaffold
import com.davidjes.train.ui.theme.MonoNumber
import com.davidjes.train.ui.theme.Spacing
import com.davidjes.train.ui.theme.displayNumber
import com.davidjes.train.ui.theme.trainColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NutritionScreen(onBack: () -> Unit) {
    val vm: NutritionViewModel = hiltViewModel()
    val state by vm.state.collectAsStateWithLifecycle()
    var showSheet by rememberSaveable { mutableStateOf(false) }
    var showTargets by rememberSaveable { mutableStateOf(false) }

    TrainScreenScaffold(
        current = null,
        topBar = {
            TopAppBar(
                title = { Text("Nutrition") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(TrainIcons.chevLeft, contentDescription = "Back") } },
                actions = { IconButton(onClick = { showTargets = true }) { Icon(TrainIcons.edit, contentDescription = "Edit targets") } },
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { showSheet = true },
                icon = { Icon(TrainIcons.plus, contentDescription = null) },
                text = { Text("Meal") },
                containerColor = MaterialTheme.colorScheme.primaryContainer,
                contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
            )
        },
    ) { padding ->
        val day = state.day
        Column(
            Modifier.padding(padding).verticalScroll(rememberScrollState())
                .padding(start = Spacing.screen, end = Spacing.screen, top = Spacing.sm, bottom = 110.dp),
            verticalArrangement = Arrangement.spacedBy(Spacing.cardGap),
        ) {
            if (day != null) {
                FilledEmphasisCard {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.lg)) {
                        MacroRing(
                            kcal = day.eatenKcal, target = day.targetKcal,
                            proteinFrac = frac(day.proteinG, day.targetProteinG),
                            carbsFrac = frac(day.carbsG, day.targetCarbsG),
                            size = 120.dp, thickness = 8.dp,
                        )
                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
                            MacroBar("Protein", day.proteinG, day.targetProteinG, MaterialTheme.trainColors.blue.base)
                            MacroBar("Carbs", day.carbsG, day.targetCarbsG, MaterialTheme.trainColors.amber.base)
                            MacroBar("Fat", day.fatG, day.targetFatG, MaterialTheme.trainColors.green.base)
                        }
                    }
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.cardGap)) {
                    StatTile("EATEN", day.eatenKcal.toString(), Modifier.weight(1f))
                    StatTile("REMAINING", (day.targetKcal - day.eatenKcal).coerceAtLeast(0).toString(), Modifier.weight(1f))
                    StatTile("BURNED", "+${state.burnedKcal}", Modifier.weight(1f))
                }
                OutlinedContentCard {
                    Text("Today's meals", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(bottom = Spacing.sm))
                    if (day.meals.isEmpty()) {
                        Text("No meals logged yet.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    day.meals.forEachIndexed { i, meal ->
                        if (i > 0) HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                        Row(
                            Modifier.fillMaxWidth().padding(vertical = Spacing.md),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(Spacing.md),
                        ) {
                            Box(
                                Modifier.size(40.dp).clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surfaceContainerHigh),
                                contentAlignment = Alignment.Center,
                            ) { Icon(TrainIcons.food, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp)) }
                            Column(Modifier.weight(1f)) {
                                Text(meal.name, style = MaterialTheme.typography.titleSmall)
                                Text("P${meal.proteinG} · C${meal.carbsG} · F${meal.fatG}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Text("${meal.kcal} kcal", style = MonoNumber, color = MaterialTheme.colorScheme.onSurface)
                        }
                    }
                }
            }
        }
    }

    if (showSheet) {
        AddMealSheet(
            onDismiss = { showSheet = false },
            onSave = { name, kcal, p, c, f -> vm.addMeal(name, kcal, p, c, f); showSheet = false },
        )
    }
    if (showTargets) {
        EditTargetsDialog(
            initial = state.targets,
            onDismiss = { showTargets = false },
            onSave = { t -> vm.saveTargets(t); showTargets = false },
        )
    }
}

@Composable
private fun EditTargetsDialog(
    initial: com.davidjes.train.domain.model.NutritionTargets,
    onDismiss: () -> Unit,
    onSave: (com.davidjes.train.domain.model.NutritionTargets) -> Unit,
) {
    var kcal by remember { mutableStateOf(initial.kcal.toString()) }
    var protein by remember { mutableStateOf(initial.proteinG.toString()) }
    var carbs by remember { mutableStateOf(initial.carbsG.toString()) }
    var fat by remember { mutableStateOf(initial.fatG.toString()) }

    androidx.compose.material3.AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Daily targets") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
                OutlinedTextField(
                    value = kcal, onValueChange = { kcal = it.filter(Char::isDigit) },
                    label = { Text("Calories") }, suffix = { Text("kcal") }, singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.fillMaxWidth(),
                )
                Row(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                    NumField("Protein", protein, { protein = it }, Modifier.weight(1f))
                    NumField("Carbs", carbs, { carbs = it }, Modifier.weight(1f))
                    NumField("Fat", fat, { fat = it }, Modifier.weight(1f))
                }
            }
        },
        confirmButton = {
            Button(onClick = {
                onSave(
                    com.davidjes.train.domain.model.NutritionTargets(
                        kcal = kcal.toIntOrNull() ?: initial.kcal,
                        proteinG = protein.toIntOrNull() ?: initial.proteinG,
                        carbsG = carbs.toIntOrNull() ?: initial.carbsG,
                        fatG = fat.toIntOrNull() ?: initial.fatG,
                    ),
                )
            }) { Text("Save") }
        },
        dismissButton = { FilledTonalButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
private fun MacroBar(label: String, value: Int, target: Int, color: Color) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(Modifier.size(8.dp).clip(RoundedCornerShape(4.dp)).background(color))
                Text(label, style = MaterialTheme.typography.bodyMedium)
            }
            Text("$value/${target}g", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Box(Modifier.fillMaxWidth().height(4.dp).clip(RoundedCornerShape(2.dp)).background(MaterialTheme.colorScheme.surfaceContainerHighest)) {
            Box(Modifier.fillMaxWidth(frac(value, target)).height(4.dp).clip(RoundedCornerShape(2.dp)).background(color))
        }
    }
}

@Composable
private fun StatTile(label: String, value: String, modifier: Modifier = Modifier) {
    OutlinedContentCard(modifier = modifier, padding = androidx.compose.foundation.layout.PaddingValues(14.dp)) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = displayNumber(20), modifier = Modifier.padding(top = 4.dp))
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddMealSheet(onDismiss: () -> Unit, onSave: (String, Int, Int, Int, Int) -> Unit) {
    var name by remember { mutableStateOf("") }
    var kcal by remember { mutableStateOf("") }
    var protein by remember { mutableStateOf("") }
    var carbs by remember { mutableStateOf("") }
    var fat by remember { mutableStateOf("") }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.fillMaxWidth().padding(horizontal = Spacing.xl, vertical = Spacing.md), verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
            KickerText("Add meal")
            OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Meal name") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(
                value = kcal, onValueChange = { kcal = it.filter(Char::isDigit) },
                label = { Text("Calories") }, suffix = { Text("kcal") }, singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.fillMaxWidth(),
            )
            Row(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                NumField("Protein", protein, { protein = it }, Modifier.weight(1f))
                NumField("Carbs", carbs, { carbs = it }, Modifier.weight(1f))
                NumField("Fat", fat, { fat = it }, Modifier.weight(1f))
            }
            Row(Modifier.fillMaxWidth().padding(top = Spacing.xs), horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                FilledTonalButton(onClick = onDismiss, modifier = Modifier.weight(1f)) { Text("Cancel") }
                Button(
                    onClick = { onSave(name, kcal.toIntOrNull() ?: 0, protein.toIntOrNull() ?: 0, carbs.toIntOrNull() ?: 0, fat.toIntOrNull() ?: 0) },
                    modifier = Modifier.weight(1f),
                ) { Text("Save meal") }
            }
        }
    }
}

@Composable
private fun NumField(label: String, value: String, onChange: (String) -> Unit, modifier: Modifier) {
    OutlinedTextField(
        value = value, onValueChange = { onChange(it.filter(Char::isDigit)) },
        label = { Text(label) }, suffix = { Text("g") }, singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = modifier,
    )
}

private fun frac(value: Int, target: Int): Float = if (target > 0) (value.toFloat() / target).coerceIn(0f, 1f) else 0f
