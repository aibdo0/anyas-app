package com.anyas.app

import android.graphics.Paint
import android.hardware.GeomagneticField
import android.hardware.SensorManager
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.graphics.nativeCanvas
import com.batoulapps.adhan.Coordinates
import com.batoulapps.adhan.Qibla
import java.util.Locale
import kotlin.math.cos
import kotlin.math.sin

@Composable
internal fun NativeQiblaPage(
    city: NativeCity,
    magneticHeading: Float,
    sensorAccuracy: Int,
    sensorAvailable: Boolean
) {
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("اتجاه القبلة", color = DeepGreen, fontSize = 24.sp, fontWeight = FontWeight.Bold)
        Text("اختر مدينتك من أعلى الشاشة لتكون زاوية القبلة أدق.", color = Muted, fontSize = 13.sp)
        NativeQiblaCompass(city, magneticHeading, sensorAccuracy, sensorAvailable)
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

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(20.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text("القبلة الحيّة", color = DeepGreen, fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Text(
                "${city.name} · ${formatCompassDegrees(qiblaBearing)} من الشمال الحقيقي",
                color = Muted,
                fontSize = 13.sp,
                textAlign = TextAlign.Center
            )

            when {
                !sensorAvailable -> {
                    Text(
                        "لا يتوفر في هذا الهاتف حساس اتجاه مناسب. يمكنك استخدام زاوية القبلة المحسوبة أعلاه.",
                        color = Muted, fontSize = 13.sp, textAlign = TextAlign.Center,
                        modifier = Modifier.padding(vertical = 16.dp)
                    )
                }
                !trueHeading.isFinite() -> {
                    Text(
                        "جارٍ تحديد اتجاه الهاتف…",
                        color = Muted, fontSize = 13.sp, textAlign = TextAlign.Center,
                        modifier = Modifier.padding(vertical = 16.dp)
                    )
                }
                else -> {
                    CompassDial(trueHeading = trueHeading, qiblaRelative = relativeQibla)
                    Text(
                        "وجّه السهم إلى القبلة، ثم حرّك الهاتف حتى يستقر المؤشر.",
                        color = Green, fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp, textAlign = TextAlign.Center
                    )
                    Text(
                        "اتجاه الهاتف ${formatCompassDegrees(trueHeading)} · زاوية القبلة ${formatCompassDegrees(qiblaBearing)}",
                        color = Muted, fontSize = 12.sp, textAlign = TextAlign.Center
                    )
                    val accuracyMessage = when (sensorAccuracy) {
                        SensorManager.SENSOR_STATUS_ACCURACY_HIGH -> "دقة الحساس عالية"
                        SensorManager.SENSOR_STATUS_ACCURACY_MEDIUM -> "دقة الحساس متوسطة"
                        SensorManager.SENSOR_STATUS_ACCURACY_LOW -> "دقة الحساس منخفضة"
                        else -> "دقة الحساس غير مستقرة"
                    }
                    Text(accuracyMessage, color = if (sensorAccuracy >= SensorManager.SENSOR_STATUS_ACCURACY_MEDIUM) Green else GoldCompass, fontSize = 12.sp)
                    if (sensorAccuracy < SensorManager.SENSOR_STATUS_ACCURACY_MEDIUM) {
                        Text(
                            "للمعايرة، أبعد الهاتف عن المعادن والمغناطيس وحرّكه على شكل رقم 8.",
                            color = Muted, fontSize = 12.sp, textAlign = TextAlign.Center
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun CompassDial(trueHeading: Float, qiblaRelative: Float) {
    Canvas(modifier = Modifier.size(250.dp).padding(4.dp)) {
        val center = Offset(size.width / 2f, size.height / 2f)
        val radius = size.minDimension * 0.47f
        drawCircle(color = Color(0xFFF8F6EF), radius = radius, center = center)
        drawCircle(color = Green, radius = radius, center = center, style = Stroke(width = 2.dp.toPx()))

        for (bearing in 0 until 360 step 15) {
            val angle = Math.toRadians((bearing - trueHeading).toDouble())
            val direction = Offset(sin(angle).toFloat(), -cos(angle).toFloat())
            val innerRadius = radius * if (bearing % 45 == 0) 0.78f else 0.87f
            val outer = center + Offset(direction.x * radius * 0.94f, direction.y * radius * 0.94f)
            val inner = center + Offset(direction.x * innerRadius, direction.y * innerRadius)
            drawLine(
                color = if (bearing % 90 == 0) DeepGreen else Muted.copy(alpha = 0.65f),
                start = inner,
                end = outer,
                strokeWidth = if (bearing % 45 == 0) 2.dp.toPx() else 1.dp.toPx(),
                cap = StrokeCap.Round
            )
            if (bearing % 90 == 0) {
                val labelPoint = center + Offset(direction.x * radius * 0.63f, direction.y * radius * 0.63f)
                val label = when (bearing) { 0 -> "N"; 90 -> "E"; 180 -> "S"; else -> "W" }
                drawIntoCanvas { canvas ->
                    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        color = android.graphics.Color.rgb(16, 74, 62)
                        textSize = 13.dp.toPx()
                        textAlign = Paint.Align.CENTER
                        typeface = android.graphics.Typeface.create(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD)
                    }
                    canvas.nativeCanvas.drawText(label, labelPoint.x, labelPoint.y + paint.textSize * 0.35f, paint)
                }
            }
        }

        val arrowAngle = Math.toRadians(qiblaRelative.toDouble())
        val direction = Offset(sin(arrowAngle).toFloat(), -cos(arrowAngle).toFloat())
        val perpendicular = Offset(-direction.y, direction.x)
        val tip = center + Offset(direction.x * radius * 0.55f, direction.y * radius * 0.55f)
        val tail = center - Offset(direction.x * radius * 0.22f, direction.y * radius * 0.22f)
        drawLine(color = GoldCompass, start = tail, end = tip, strokeWidth = 5.dp.toPx(), cap = StrokeCap.Round)
        val arrowBase = tip - Offset(direction.x * 20.dp.toPx(), direction.y * 20.dp.toPx())
        val wing = Offset(perpendicular.x * 9.dp.toPx(), perpendicular.y * 9.dp.toPx())
        drawLine(color = GoldCompass, start = tip, end = arrowBase + wing, strokeWidth = 4.dp.toPx(), cap = StrokeCap.Round)
        drawLine(color = GoldCompass, start = tip, end = arrowBase - wing, strokeWidth = 4.dp.toPx(), cap = StrokeCap.Round)
        drawCircle(color = DeepGreen, radius = 5.dp.toPx(), center = center)
    }
}

private val GoldCompass = Color(0xFFB78B43)

private fun normalizeCompassDegrees(value: Float): Float = ((value % 360f) + 360f) % 360f

private fun formatCompassDegrees(value: Float): String =
    if (value.isFinite()) String.format(Locale("ar"), "%.0f°", value) else "—"
