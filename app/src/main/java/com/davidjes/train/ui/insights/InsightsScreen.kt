package com.davidjes.train.ui.insights

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.davidjes.train.domain.model.ChatMessage
import com.davidjes.train.domain.model.ChatRole
import com.davidjes.train.domain.model.Insight
import com.davidjes.train.domain.model.InsightTone
import com.davidjes.train.ui.components.FilledEmphasisCard
import com.davidjes.train.ui.components.KickerText
import com.davidjes.train.ui.components.OutlinedContentCard
import com.davidjes.train.ui.components.SparkTone
import com.davidjes.train.ui.components.Sparkline
import com.davidjes.train.ui.components.TrainIcons
import com.davidjes.train.ui.components.TrainScreenScaffold
import com.davidjes.train.ui.navigation.TopDest
import com.davidjes.train.ui.theme.Spacing
import com.davidjes.train.ui.theme.trainColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InsightsScreen(onNavigate: (TopDest) -> Unit) {
    val vm: InsightsViewModel = hiltViewModel()
    val state by vm.state.collectAsStateWithLifecycle()
    var draft by remember { mutableStateOf("") }
    var expanded by remember { mutableStateOf(true) }

    TrainScreenScaffold(
        current = TopDest.INSIGHTS,
        onNavigate = onNavigate,
        topBar = {
            CenterAlignedTopAppBar(title = {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Ask Gemini", style = MaterialTheme.typography.titleLarge)
                    val subtitle = when {
                        state.preparing -> "Preparing on-device model…"
                        state.onDevice -> "On-device"
                        else -> "On-device · rule-based"
                    }
                    Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            })
        },
    ) { padding ->
        Column(Modifier.padding(padding).fillMaxWidth()) {
            LazyColumn(
                modifier = Modifier.weight(1f).fillMaxWidth(),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(start = Spacing.screen, end = Spacing.screen, top = Spacing.sm, bottom = Spacing.lg),
                verticalArrangement = Arrangement.spacedBy(Spacing.cardGap),
            ) {
                if (state.insights.isNotEmpty()) {
                    item { InsightGroup(state.insights, expanded) { expanded = !expanded } }
                }
                items(state.messages, key = { it.id }) { msg -> ChatBubble(msg) }
                if (state.sending) {
                    item {
                        val streaming = state.streamingText
                        if (streaming.isNullOrEmpty()) TypingIndicator()
                        else GeminiStreamingBubble(streaming)
                    }
                }
                if (state.messages.isEmpty()) {
                    item { KickerText("Suggested") }
                    items(state.suggestedPrompts) { prompt -> SuggestedPrompt(prompt) { vm.send(prompt) } }
                }
            }
            Composer(
                value = draft,
                onValueChange = { draft = it },
                onSend = { if (draft.isNotBlank()) { vm.send(draft); draft = "" } },
                enabled = !state.sending,
            )
        }
    }
}

@Composable
private fun InsightGroup(insights: List<Insight>, expanded: Boolean, onToggle: () -> Unit) {
    OutlinedContentCard(padding = androidx.compose.foundation.layout.PaddingValues(0.dp)) {
        Row(
            Modifier.fillMaxWidth().clickable(onClick = onToggle).padding(horizontal = Spacing.cardPadding, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                Icon(if (expanded) TrainIcons.chevDown else TrainIcons.chevRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("Insights · ${insights.size}", style = MaterialTheme.typography.titleSmall)
            }
            if (!expanded) {
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    insights.forEach { Box(Modifier.size(7.dp).clip(RoundedCornerShape(4.dp)).background(toneColor(it.tone))) }
                }
            } else {
                Text("hide", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Column(Modifier.animateContentSize()) {
            if (expanded) {
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                Column(Modifier.padding(Spacing.md), verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                    insights.forEach { InsightCard(it) }
                }
            }
        }
    }
}

@Composable
private fun InsightCard(insight: Insight) {
    val tone = toneColor(insight.tone)
    val borderColor = when (insight.tone) {
        InsightTone.FLAG -> MaterialTheme.trainColors.red.container
        InsightTone.POSITIVE -> MaterialTheme.trainColors.green.container
        else -> Color.Transparent
    }
    FilledEmphasisCard(
        modifier = if (borderColor != Color.Transparent) Modifier.border(1.dp, borderColor, MaterialTheme.shapes.large) else Modifier,
        padding = androidx.compose.foundation.layout.PaddingValues(14.dp),
    ) {
        Text(insight.kind.name.lowercase().replaceFirstChar { it.uppercase() }, style = MaterialTheme.typography.labelMedium, color = tone)
        Text(insight.title, style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(top = 6.dp))
        Text(insight.body, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 2.dp))
        if (insight.series.size >= 2) {
            Sparkline(
                data = insight.series,
                modifier = Modifier.fillMaxWidth().padding(top = Spacing.sm),
                height = 44.dp,
                tone = when (insight.tone) {
                    InsightTone.FLAG -> SparkTone.RED
                    InsightTone.POSITIVE -> SparkTone.GREEN
                    InsightTone.CAUTION -> SparkTone.AMBER
                    InsightTone.INFO -> SparkTone.PRIMARY
                },
                showDot = false,
            )
        }
    }
}

@Composable
private fun ChatBubble(msg: ChatMessage) {
    if (msg.role == ChatRole.USER) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
            Box(
                Modifier.widthIn(max = 300.dp)
                    .clip(RoundedCornerShape(18.dp, 18.dp, 4.dp, 18.dp))
                    .background(MaterialTheme.colorScheme.primary)
                    .padding(horizontal = 14.dp, vertical = 10.dp),
            ) {
                Text(msg.text, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium), color = MaterialTheme.colorScheme.onPrimary)
            }
        }
    } else {
        Column(Modifier.fillMaxWidth()) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                Box(
                    Modifier.size(22.dp).clip(RoundedCornerShape(7.dp)).background(MaterialTheme.colorScheme.tertiaryContainer),
                    contentAlignment = Alignment.Center,
                ) { Icon(TrainIcons.spark, contentDescription = null, tint = MaterialTheme.colorScheme.onTertiaryContainer, modifier = Modifier.size(12.dp)) }
                KickerText("Gemini")
            }
            Text(msg.text, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.padding(top = Spacing.sm))
        }
    }
}

@Composable
private fun GeminiStreamingBubble(text: String) {
    Column(Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            Box(
                Modifier.size(22.dp).clip(RoundedCornerShape(7.dp)).background(MaterialTheme.colorScheme.tertiaryContainer),
                contentAlignment = Alignment.Center,
            ) { Icon(TrainIcons.spark, contentDescription = null, tint = MaterialTheme.colorScheme.onTertiaryContainer, modifier = Modifier.size(12.dp)) }
            KickerText("Gemini")
        }
        Text(
            text = "$text▍",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.padding(top = Spacing.sm),
        )
    }
}

@Composable
private fun TypingIndicator() {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        Icon(TrainIcons.spark, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
        Text("Thinking…", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun SuggestedPrompt(prompt: String, onClick: () -> Unit) {
    OutlinedContentCard(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        padding = androidx.compose.foundation.layout.PaddingValues(horizontal = 14.dp, vertical = 12.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            Icon(TrainIcons.arrowRight, contentDescription = null, tint = MaterialTheme.colorScheme.outline, modifier = Modifier.size(16.dp))
            Text(prompt, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun Composer(value: String, onValueChange: (String) -> Unit, onSend: () -> Unit, enabled: Boolean) {
    Row(
        Modifier.fillMaxWidth().padding(start = Spacing.md, end = Spacing.md, bottom = Spacing.md, top = Spacing.sm),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
    ) {
        Row(
            Modifier.weight(1f).clip(RoundedCornerShape(28.dp)).background(MaterialTheme.colorScheme.surfaceContainerHigh),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(TrainIcons.spark, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(start = 14.dp).size(20.dp))
            TextField(
                value = value,
                onValueChange = onValueChange,
                placeholder = { Text("Ask Gemini…") },
                modifier = Modifier.weight(1f),
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = Color.Transparent,
                    unfocusedContainerColor = Color.Transparent,
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent,
                ),
                maxLines = 4,
            )
        }
        FilledIconButton(
            onClick = onSend,
            enabled = enabled && value.isNotBlank(),
            colors = IconButtonDefaults.filledIconButtonColors(containerColor = MaterialTheme.colorScheme.primary, contentColor = MaterialTheme.colorScheme.onPrimary),
        ) { Icon(TrainIcons.arrowUp, contentDescription = "Send") }
    }
}

@Composable
private fun toneColor(tone: InsightTone): Color = when (tone) {
    InsightTone.FLAG -> MaterialTheme.trainColors.red.base
    InsightTone.POSITIVE -> MaterialTheme.trainColors.green.base
    InsightTone.CAUTION -> MaterialTheme.trainColors.amber.base
    InsightTone.INFO -> MaterialTheme.colorScheme.onSurfaceVariant
}
