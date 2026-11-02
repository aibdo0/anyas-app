package com.anyas.app

import android.graphics.Paint
import android.hardware.GeomagneticField
import android.hardware.SensorManager
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.batoulapps.adhan.Coordinates
import com.batoulapps.adhan.Qibla
import java.util.Locale
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.sin

@Composable
internal fun NativeQiblaPage(
    city: NativeCity,
    magneticHeading: Float,
    sensorAccuracy: Int,
    sensorAvailable: Boolean
) {
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 18.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text("بوصلة القبلة", color = DeepGreen, fontSize = 25.sp, fontWeight = FontWeight.Bold)
            Text("اتبع المؤشر الذهبي لمعرفة اتجاه القبلة مباشرة.", color = Muted, fontSize = 13.sp)
        }
        NativeQiblaCompass(city, magneticHeading, sensorAccuracy, sensorAvailable)
        NearbyMosquesSection()
    }
}

@Composable
internal fun NativeQiblaCompass(
    city: NativeCity,
    magneticHeading: Float,
    sensorAccuracy: Int,
    sensorAvailable: Boolean
) {
    val qiblaBearing = remember(city) {
        runCatching { Qibla(Coordinates(city.latitude, city.longitude)).direction.toFloat() }
            .getOrDefault(Float.NaN)
    }
    val declination = remember(city) {
        runCatching {
            GeomagneticField(
                city.latitude.toFloat(), city.longitude.toFloat(), 0f, System.currentTimeMillis()
            ).declination
        }.getOrDefault(0f)
    }
    val trueHeading = if (magneticHeading.isFinite()) normalizeCompassDegrees(magneticHeading + declination) else Float.NaN
    val relativeQibla = if (trueHeading.isFinite() && qiblaBearing.isFinite()) {
        normalizeCompassDegrees(qiblaBearing - trueHeading)
    } else Float.NaN
    val distanceToAlignment = if (relativeQibla.isFinite()) min(relativeQibla, 360f - relativeQibla) else Float.NaN
    val aligned = distanceToAlignment.isFinite() && distanceToAlignment <= 5f
    val accuracyLabel = when (sensorAccuracy) {
        SensorManager.SENSOR_STATUS_ACCURACY_HIGH -> "دقة عالية"
        SensorManager.SENSOR_STATUS_ACCURACY_MEDIUM -> "دقة متوسطة"
        SensorManager.SENSOR_STATUS_ACCURACY_LOW -> "دقة منخفضة"
        else -> "تحتاج معايرة"
    }
    val accuracyColor = if (sensorAccuracy >= SensorManager.SENSOR_STATUS_ACCURACY_MEDIUM) Green else WarningAmber
    val accuracyBackground = if (sensorAccuracy >= SensorManager.SENSOR_STATUS_ACCURACY_MEDIUM) SoftGreen else SoftAmber

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = DeepGreen,
            shape = RoundedCornerShape(22.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("الوجهة المختارة", color = Color.White.copy(alpha = 0.72f), fontSize = 12.sp)
                    Text(city.name, color = Color.White, fontSize = 21.sp, fontWeight = FontWeight.Bold)
                    Text("${formatCompassDegrees(qiblaBearing)} من الشمال الحقيقي", color = Color.White.copy(alpha = 0.9f), fontSize = 13.sp)
                }
                Surface(color = Color.White.copy(alpha = 0.12f), shape = CircleShape) {
                    Box(modifier = Modifier.size(54.dp), contentAlignment = Alignment.Center) {
                        Text("قبلة", color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            shape = RoundedCornerShape(22.dp)
        ) {
            Column(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 17.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text("المؤشر المباشر", color = DeepGreen, fontSize = 17.sp, fontWeight = FontWeight.Bold)
                        Text("حرّك الهاتف لمطابقة المؤشر مع العلامة العلوية", color = Muted, fontSize = 11.sp)
                    }
                    if (sensorAvailable) {
                        Surface(color = accuracyBackground, shape = RoundedCornerShape(50)) {
                            Text(
                                "●  $accuracyLabel",
                                color = accuracyColor,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 7.dp)
                            )
                        }
                    }
                }

                when {
                    !sensorAvailable -> NoCompassSensor(qiblaBearing)
                    !trueHeading.isFinite() -> CompassWaiting()
                    else -> {
                        CompassDial(
                            trueHeading = trueHeading,
                            qiblaRelative = relativeQibla,
                            description = "بوصلة القبلة. اتجاه الهاتف ${formatCompassDegrees(trueHeading)}، والمؤشر الذهبي عند ${formatCompassDegrees(relativeQibla)} من أعلى الهاتف."
                        )
                        Surface(
                            color = if (aligned) SoftGreen else SoftAmber,
                            shape = RoundedCornerShape(50)
                        ) {
                            Text(
                                if (aligned) "أنت تواجه القبلة تقريبًا" else "لفّ الهاتف حتى يتجه السهم إلى الأعلى",
                                color = if (aligned) Green else DeepGreen,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)
                            )
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            CompassMetric("اتجاه الهاتف", trueHeading, Modifier.weight(1f))
                            CompassMetric("زاوية القبلة", qiblaBearing, Modifier.weight(1f))
                            CompassMetric("المتبقي", distanceToAlignment, Modifier.weight(1f))
                        }
                    }
                }
            }
        }

        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = if (sensorAvailable && sensorAccuracy < SensorManager.SENSOR_STATUS_ACCURACY_MEDIUM) SoftAmber else SoftGreen,
            shape = RoundedCornerShape(18.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(15.dp),
                horizontalArrangement = Arrangement.spacedBy(11.dp),
                verticalAlignment = Alignment.Top
            ) {
                Text(if (sensorAvailable && sensorAccuracy < SensorManager.SENSOR_STATUS_ACCURACY_MEDIUM) "↻" else "✓", color = if (sensorAvailable && sensorAccuracy < SensorManager.SENSOR_STATUS_ACCURACY_MEDIUM) WarningAmber else Green, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                    Text(
                        if (sensorAvailable && sensorAccuracy < SensorManager.SENSOR_STATUS_ACCURACY_MEDIUM) "تحسين دقة البوصلة" else "كيف تقرأ المؤشر",
                        color = DeepGreen, fontSize = 14.sp, fontWeight = FontWeight.Bold
                    )
                    Text(
                        when {
                            !sensorAvailable -> "يعرض التطبيق زاوية القبلة المحسوبة للمدينة، لكن هذا الهاتف لا يوفّر حساسًا مناسبًا لاتجاه حي."
                            sensorAccuracy < SensorManager.SENSOR_STATUS_ACCURACY_MEDIUM -> "أبعد الهاتف عن المعادن والمغناطيس، ثم حرّكه على شكل رقم 8 حتى تتحسن قراءة الحساس."
                            else -> "عندما يشير السهم الذهبي إلى العلامة أعلى الدائرة، يكون أعلى الهاتف متجهًا إلى القبلة. اختر مدينتك الصحيحة لتحصل على زاوية أدق."
                        },
                        color = Muted, fontSize = 12.sp, lineHeight = 18.sp
                    )
                }
            }
        }
    }
}

@Composable
private fun CompassMetric(label: String, value: Float, modifier: Modifier = Modifier) {
    Surface(modifier = modifier, color = SoftCanvas, shape = RoundedCornerShape(15.dp)) {
        Column(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 10.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(3.dp)
        ) {
            Text(label, color = Muted, fontSize = 10.sp, textAlign = TextAlign.Center, maxLines = 1)
            Text(formatCompassDegrees(value), color = DeepGreen, fontSize = 16.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
        }
    }
}

@Composable
private fun NoCompassSensor(qiblaBearing: Float) {
    Surface(modifier = Modifier.fillMaxWidth(), color = SoftCanvas, shape = RoundedCornerShape(18.dp)) {
        Column(
            modifier = Modifier.padding(18.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(7.dp)
        ) {
            Text("⌖", color = Green, fontSize = 38.sp)
            Text("البوصلة غير متاحة على هذا الهاتف", color = DeepGreen, fontSize = 15.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
            Text("زاوية القبلة المحسوبة: ${formatCompassDegrees(qiblaBearing)}", color = Green, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun CompassWaiting() {
    Surface(modifier = Modifier.fillMaxWidth(), color = SoftCanvas, shape = RoundedCornerShape(18.dp)) {
        Column(
            modifier = Modifier.padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text("◉", color = Green, fontSize = 36.sp)
            Text("جارٍ قراءة الحساس…", color = DeepGreen, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
            Text("أمسك الهاتف بشكل مسطح لثوانٍ قليلة.", color = Muted, fontSize = 12.sp, textAlign = TextAlign.Center)
        }
    }
}

@Composable
private fun CompassDial(trueHeading: Float, qiblaRelative: Float, description: String) {
    Canvas(
        modifier = Modifier.size(264.dp).semantics { contentDescription = description }
    ) {
        val center = Offset(size.width / 2f, size.height / 2f)
        val radius = size.minDimension * 0.455f
        drawCircle(color = Color(0xFFFAFAF6), radius = radius, center = center)
        drawCircle(color = SoftGreen, radius = radius, center = center, style = Stroke(width = 8.dp.toPx()))
        drawCircle(color = Green.copy(alpha = 0.28f), radius = radius, center = center, style = Stroke(width = 1.dp.toPx()))

        for (bearing in 0 until 360 step 10) {
            val angle = Math.toRadians((bearing - trueHeading).toDouble())
            val direction = Offset(sin(angle).toFloat(), -cos(angle).toFloat())
            val tickLength = when {
                bearing % 90 == 0 -> 16.dp.toPx()
                bearing % 30 == 0 -> 11.dp.toPx()
                else -> 6.dp.toPx()
            }
            val outer = center + Offset(direction.x * radius * 0.88f, direction.y * radius * 0.88f)
            val inner = center + Offset(direction.x * (radius * 0.88f - tickLength), direction.y * (radius * 0.88f - tickLength))
            drawLine(
                color = if (bearing % 90 == 0) DeepGreen else Muted.copy(alpha = 0.65f),
                start = inner,
                end = outer,
                strokeWidth = if (bearing % 30 == 0) 2.dp.toPx() else 1.dp.toPx(),
                cap = StrokeCap.Round
            )
        }

        drawIntoCanvas { canvas ->
            val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = android.graphics.Color.rgb(16, 74, 62)
                textSize = 13.dp.toPx()
                textAlign = Paint.Align.CENTER
                typeface = android.graphics.Typeface.create(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD)
            }
            for (bearing in listOf(0, 90, 180, 270)) {
                val angle = Math.toRadians((bearing - trueHeading).toDouble())
                val point = center + Offset(sin(angle).toFloat() * radius * 0.66f, -cos(angle).toFloat() * radius * 0.66f)
                val label = when (bearing) { 0 -> "N"; 90 -> "E"; 180 -> "S"; else -> "W" }
                canvas.nativeCanvas.drawText(label, point.x, point.y + paint.textSize * 0.35f, paint)
            }
        }

        val angle = Math.toRadians(qiblaRelative.toDouble())
        val direction = Offset(sin(angle).toFloat(), -cos(angle).toFloat())
        val perpendicular = Offset(-direction.y, direction.x)
        val tip = center + Offset(direction.x * radius * 0.53f, direction.y * radius * 0.53f)
        val tail = center - Offset(direction.x * radius * 0.24f, direction.y * radius * 0.24f)
        drawLine(color = GoldCompass, start = tail, end = tip, strokeWidth = 6.dp.toPx(), cap = StrokeCap.Round)
        val arrowBase = tip - Offset(direction.x * 20.dp.toPx(), direction.y * 20.dp.toPx())
        val wing = Offset(perpendicular.x * 9.dp.toPx(), perpendicular.y * 9.dp.toPx())
        drawLine(color = GoldCompass, start = tip, end = arrowBase + wing, strokeWidth = 4.dp.toPx(), cap = StrokeCap.Round)
        drawLine(color = GoldCompass, start = tip, end = arrowBase - wing, strokeWidth = 4.dp.toPx(), cap = StrokeCap.Round)
        drawCircle(color = Color.White, radius = 7.dp.toPx(), center = center)
        drawCircle(color = DeepGreen, radius = 4.dp.toPx(), center = center)

        val markerBase = center.y - radius * 0.96f
        val marker = Path().apply {
            moveTo(center.x, markerBase + 16.dp.toPx())
            lineTo(center.x - 7.dp.toPx(), markerBase)
            lineTo(center.x + 7.dp.toPx(), markerBase)
            close()
        }
        drawPath(marker, color = Green)
    }
}

private val GoldCompass = Color(0xFFB78B43)
private val SoftGreen = Color(0xFFE7F1EC)
private val SoftAmber = Color(0xFFFFF2D9)
private val WarningAmber = Color(0xFF9A6500)
private val SoftCanvas = Color(0xFFF5F7F4)

private fun normalizeCompassDegrees(value: Float): Float = ((value % 360f) + 360f) % 360f

private fun formatCompassDegrees(value: Float): String =
    if (value.isFinite()) String.format(Locale("ar"), "%.0f°", value) else "—"
