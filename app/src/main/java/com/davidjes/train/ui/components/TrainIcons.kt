package com.davidjes.train.ui.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowForward
import androidx.compose.material.icons.automirrored.rounded.DirectionsRun
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowRight
import androidx.compose.material.icons.rounded.AcUnit
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.ArrowUpward
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.Battery5Bar
import androidx.compose.material.icons.rounded.Bedtime
import androidx.compose.material.icons.rounded.Bolt
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.DirectionsBike
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.EmojiEvents
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.FiberManualRecord
import androidx.compose.material.icons.rounded.FitnessCenter
import androidx.compose.material.icons.rounded.Flag
import androidx.compose.material.icons.rounded.KeyboardArrowDown
import androidx.compose.material.icons.rounded.KeyboardArrowLeft
import androidx.compose.material.icons.rounded.Link
import androidx.compose.material.icons.rounded.LocalFireDepartment
import androidx.compose.material.icons.rounded.Map
import androidx.compose.material.icons.rounded.MonitorHeart
import androidx.compose.material.icons.rounded.MoreHoriz
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Restaurant
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material.icons.rounded.Pool
import androidx.compose.material.icons.rounded.Timeline
import androidx.compose.material.icons.rounded.Today
import androidx.compose.material.icons.rounded.WbSunny
import androidx.compose.material.icons.rounded.Watch
import androidx.compose.material.icons.rounded.WaterDrop
import androidx.compose.material.icons.rounded.MonitorWeight
import androidx.compose.ui.graphics.vector.ImageVector

/**
 * Central icon set. Maps the prototype's line-icon names (MIcon) to the closest
 * Material Symbols (Rounded for the round-cap line feel). The handoff explicitly
 * permits mapping to Material Symbols. Swap any entry here to rebrand globally.
 */
object TrainIcons {
    // Navigation
    val today: ImageVector = Icons.Rounded.Today
    val insights: ImageVector = Icons.Rounded.AutoAwesome
    val plan: ImageVector = Icons.Rounded.CalendarMonth
    val body: ImageVector = Icons.Rounded.MonitorHeart
    val you: ImageVector = Icons.Rounded.Person

    // Actions / chrome
    val search: ImageVector = Icons.Rounded.Search
    val bell: ImageVector = Icons.Rounded.Notifications
    val plus: ImageVector = Icons.Rounded.Add
    val arrowUp: ImageVector = Icons.Rounded.ArrowUpward
    val arrowRight: ImageVector = Icons.AutoMirrored.Rounded.ArrowForward
    val chevDown: ImageVector = Icons.Rounded.KeyboardArrowDown
    val chevRight: ImageVector = Icons.AutoMirrored.Rounded.KeyboardArrowRight
    val chevLeft: ImageVector = Icons.Rounded.KeyboardArrowLeft
    val check: ImageVector = Icons.Rounded.Check
    val close: ImageVector = Icons.Rounded.Close
    val more: ImageVector = Icons.Rounded.MoreHoriz
    val edit: ImageVector = Icons.Rounded.Edit
    val settings: ImageVector = Icons.Rounded.Settings
    val play: ImageVector = Icons.Rounded.PlayArrow
    val refresh: ImageVector = Icons.Rounded.Refresh
    val link: ImageVector = Icons.Rounded.Link
    val dot: ImageVector = Icons.Rounded.FiberManualRecord

    // Health / metrics
    val heart: ImageVector = Icons.Rounded.Favorite
    val pulse: ImageVector = Icons.Rounded.MonitorHeart
    val bed: ImageVector = Icons.Rounded.Bedtime
    val battery: ImageVector = Icons.Rounded.Battery5Bar
    val drop: ImageVector = Icons.Rounded.WaterDrop
    val flame: ImageVector = Icons.Rounded.LocalFireDepartment
    val moon: ImageVector = Icons.Rounded.Bedtime
    val sun: ImageVector = Icons.Rounded.WbSunny
    val bolt: ImageVector = Icons.Rounded.Bolt
    val snow: ImageVector = Icons.Rounded.AcUnit
    val trend: ImageVector = Icons.Rounded.Timeline
    val weight: ImageVector = Icons.Rounded.MonitorWeight

    // Sports
    val run: ImageVector = Icons.AutoMirrored.Rounded.DirectionsRun
    val bike: ImageVector = Icons.Rounded.DirectionsBike
    val swim: ImageVector = Icons.Rounded.Pool
    val barbell: ImageVector = Icons.Rounded.FitnessCenter

    // Misc domain
    val map: ImageVector = Icons.Rounded.Map
    val flag: ImageVector = Icons.Rounded.Flag
    val spark: ImageVector = Icons.Rounded.AutoAwesome
    val watch: ImageVector = Icons.Rounded.Watch
    val food: ImageVector = Icons.Rounded.Restaurant
    val trophy: ImageVector = Icons.Rounded.EmojiEvents

    /** Resolve a stored icon-key string (used by habits, recovery factors). */
    fun byKey(key: String): ImageVector = when (key) {
        "pulse" -> pulse
        "heart" -> heart
        "bed", "moon" -> bed
        "battery" -> battery
        "drop" -> drop
        "flame" -> flame
        "barbell" -> barbell
        "food" -> food
        "run" -> run
        "bike" -> bike
        "swim" -> swim
        "weight" -> weight
        "bolt" -> bolt
        else -> dot
    }
}
