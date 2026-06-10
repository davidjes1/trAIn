package com.davidjes.train.ui.components

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.davidjes.train.ui.theme.Kicker

/** The small mono uppercase section label used throughout. */
@Composable
fun KickerText(text: String, modifier: Modifier = Modifier) {
    Text(
        text = text.uppercase(),
        style = Kicker,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = modifier,
    )
}
