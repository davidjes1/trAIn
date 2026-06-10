package com.davidjes.train.ui.body

import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.davidjes.train.ui.components.DeltaTone
import com.davidjes.train.ui.components.KickerText
import com.davidjes.train.ui.components.OutlinedContentCard
import com.davidjes.train.ui.components.SparkTone
import com.davidjes.train.ui.components.Sparkline
import com.davidjes.train.ui.components.SubFactor
import com.davidjes.train.ui.components.TrainIcons
import com.davidjes.train.ui.components.TrainScreenScaffold
import com.davidjes.train.ui.navigation.TopDest
import com.davidjes.train.ui.theme.Spacing
import com.davidjes.train.ui.theme.displayNumber
import com.davidjes.train.ui.theme.trainColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BodyScreen(onNavigate: (TopDest) -> Unit) {
    val vm: BodyViewModel = hiltViewModel()
    val state by vm.state.collectAsStateWithLifecycle()

    TrainScreenScaffold(
        current = TopDest.BODY,
        onNavigate = onNavigate,
        topBar = { CenterAlignedTopAppBar(title = { Text("Body") }) },
    ) { padding ->
        Column(
            Modifier.padding(padding).verticalScroll(rememberScrollState())
                .padding(start = Spacing.screen, end = Spacing.screen, top = Spacing.sm, bottom = 110.dp),
            verticalArrangement = Arrangement.spacedBy(Spacing.cardGap),
        ) {
            // Metric selector chips
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                BodyMetric.entries.forEach { metric ->
                    FilterChip(
                        selected = state.selected == metric,
                        onClick = { vm.selectMetric(metric) },
                        label = { Text(metric.label) },
                    )
                }
            }

            val sel = state.summaries[state.selected]
            OutlinedContentCard {
                KickerText(state.selected.label)
                Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 4.dp)) {
                    Text(sel?.current ?: "—", style = displayNumber(32))
                    Text(state.selected.unit, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    sel?.delta?.let {
                        Text(
                            it,
                            style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold),
                            color = if (sel.improving) MaterialTheme.trainColors.green.base else MaterialTheme.trainColors.amber.base,
                        )
                    }
                }
                Sparkline(
                    data = sel?.series ?: listOf(0f, 0f),
                    modifier = Modifier.fillMaxWidth().padding(vertical = Spacing.md),
                    height = 150.dp,
                    tone = if (state.selected == BodyMetric.WEIGHT) SparkTone.PRIMARY else if (sel?.improving == true) SparkTone.GREEN else SparkTone.AMBER,
                )
                SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                    BodyTimeframe.entries.forEachIndexed { i, tf ->
                        SegmentedButton(
                            selected = state.timeframe == tf,
                            onClick = { vm.selectTimeframe(tf) },
                            shape = SegmentedButtonDefaults.itemShape(i, BodyTimeframe.entries.size),
                        ) { Text(tf.label) }
                    }
                }
            }

            state.anomaly?.let { anomaly ->
                Column(
                    Modifier.fillMaxWidth()
                        .border(1.dp, MaterialTheme.trainColors.amber.container, RoundedCornerShape(16.dp))
                        .padding(Spacing.cardPadding),
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Icon(TrainIcons.flag, contentDescription = null, tint = MaterialTheme.trainColors.amber.base, modifier = Modifier.size(14.dp))
                        Text("Anomaly", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.trainColors.amber.base)
                    }
                    Text(anomaly, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = Spacing.sm))
                }
            }

            OutlinedContentCard {
                Text("All metrics · ${state.timeframe.label}", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(bottom = Spacing.md))
                state.summaries.values.chunked(2).forEach { row ->
                    Row(Modifier.fillMaxWidth().padding(bottom = Spacing.lg), horizontalArrangement = Arrangement.spacedBy(Spacing.lg)) {
                        row.forEach { s ->
                            SubFactor(
                                label = s.metric.label.uppercase(),
                                value = s.current,
                                unit = s.metric.unit,
                                spark = s.series,
                                delta = s.delta,
                                deltaTone = if (s.improving) DeltaTone.GOOD else DeltaTone.BAD,
                                sparkTone = if (s.improving) SparkTone.GREEN else SparkTone.AMBER,
                                sub = "${state.timeframe.label} trend",
                                large = true,
                                modifier = Modifier.weight(1f),
                            )
                        }
                        if (row.size == 1) androidx.compose.foundation.layout.Spacer(Modifier.weight(1f))
                    }
                }
            }
        }
    }
}
