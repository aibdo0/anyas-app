package com.anyas.app

import android.Manifest
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.Bundle
import android.view.Surface
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import java.util.Calendar
import java.util.Date
import java.util.Locale

class NativeMainActivity : ComponentActivity(), SensorEventListener {
    private lateinit var sensorManager: SensorManager
    private var rotationVectorSensor: Sensor? = null
    private var accelerometerSensor: Sensor? = null
    private var magneticFieldSensor: Sensor? = null
    private val accelerometerValues = FloatArray(3)
    private val magneticFieldValues = FloatArray(3)
    private var hasAccelerometerReading = false
    private var hasMagneticFieldReading = false
    private val compassHeading = mutableFloatStateOf(Float.NaN)
    private val compassAccuracy = mutableIntStateOf(SensorManager.SENSOR_STATUS_UNRELIABLE)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        sensorManager = getSystemService(SENSOR_SERVICE) as SensorManager
        rotationVectorSensor = sensorManager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR)
            ?: sensorManager.getDefaultSensor(Sensor.TYPE_GEOMAGNETIC_ROTATION_VECTOR)
        accelerometerSensor = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        magneticFieldSensor = sensorManager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD)
        setContent {
            AnyasNativeApp(
                initialRoute = intent.getStringExtra("anyas_page"),
                magneticHeading = compassHeading.floatValue,
                sensorAccuracy = compassAccuracy.intValue,
                sensorAvailable = rotationVectorSensor != null || (accelerometerSensor != null && magneticFieldSensor != null)
            )
        }
    }

    override fun onResume() {
        super.onResume()
        val rotationSensor = rotationVectorSensor
        if (rotationSensor != null) {
            sensorManager.registerListener(this, rotationSensor, SensorManager.SENSOR_DELAY_UI)
        } else {
            accelerometerSensor?.let { sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_UI) }
            magneticFieldSensor?.let { sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_UI) }
        }
    }

    override fun onPause() {
        sensorManager.unregisterListener(this)
        super.onPause()
    }

    override fun onSensorChanged(event: SensorEvent) {
        when (event.sensor.type) {
            Sensor.TYPE_ROTATION_VECTOR, Sensor.TYPE_GEOMAGNETIC_ROTATION_VECTOR -> {
                val matrix = FloatArray(9)
                SensorManager.getRotationMatrixFromVector(matrix, event.values)
                updateCompassHeading(matrix)
            }
            Sensor.TYPE_ACCELEROMETER -> {
                event.values.copyInto(accelerometerValues)
                hasAccelerometerReading = true
                updateFallbackCompass()
            }
            Sensor.TYPE_MAGNETIC_FIELD -> {
                event.values.copyInto(magneticFieldValues)
                hasMagneticFieldReading = true
                updateFallbackCompass()
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        compassAccuracy.intValue = accuracy
    }

    private fun updateFallbackCompass() {
        if (!hasAccelerometerReading || !hasMagneticFieldReading) return
        val matrix = FloatArray(9)
        if (SensorManager.getRotationMatrix(matrix, null, accelerometerValues, magneticFieldValues)) {
            updateCompassHeading(matrix)
        }
    }

    @Suppress("DEPRECATION")
    private fun updateCompassHeading(matrix: FloatArray) {
        val (axisX, axisY) = when (windowManager.defaultDisplay.rotation) {
            Surface.ROTATION_90 -> SensorManager.AXIS_Y to SensorManager.AXIS_MINUS_X
            Surface.ROTATION_180 -> SensorManager.AXIS_MINUS_X to SensorManager.AXIS_MINUS_Y
            Surface.ROTATION_270 -> SensorManager.AXIS_MINUS_Y to SensorManager.AXIS_X
            else -> SensorManager.AXIS_X to SensorManager.AXIS_Y
        }
        val remapped = FloatArray(9)
        if (!SensorManager.remapCoordinateSystem(matrix, axisX, axisY, remapped)) return
        val orientation = FloatArray(3)
        SensorManager.getOrientation(remapped, orientation)
        val degrees = Math.toDegrees(orientation[0].toDouble()).toFloat()
        compassHeading.floatValue = ((degrees % 360f) + 360f) % 360f
    }
}

private enum class NativePage(val label: String, val symbol: String) {
    HOME("الرئيسية", "⌂"),
    PRAYERS("الصلاة", "◷"),
    QIBLA("القبلة", "◉"),
    AZKAR("الأذكار", "ذ"),
    TASBEEH("التسبيح", "●"),
    MORE("المزيد", "•••")
}

internal val Green = Color(0xFF176B58)
internal val DeepGreen = Color(0xFF104A3E)
private val Gold = Color(0xFFB78B43)
private val Canvas = Color(0xFFF7F6F1)
internal val Ink = Color(0xFF202A26)
internal val Muted = Color(0xFF68736D)

@Composable
private fun AnyasNativeApp(
    initialRoute: String?,
    magneticHeading: Float,
    sensorAccuracy: Int,
    sensorAvailable: Boolean
) {
    val context = LocalContext.current
    val preferences = remember { context.getSharedPreferences("anyas_native", android.content.Context.MODE_PRIVATE) }
    var page by remember {
        mutableStateOf(
            when (initialRoute) {
                "tasbeeh" -> NativePage.TASBEEH
                "azkar" -> NativePage.AZKAR
                "qibla" -> NativePage.QIBLA
                else -> NativePage.HOME
            }
        )
    }
    var city by remember { mutableStateOf(NativeCities.load(context)) }
    var method by remember {
        mutableStateOf(
            NativeCalculationMethod.entries.firstOrNull { it.name == preferences.getString("calculation_method", null) }
                ?: NativeCalculationMethod.EGYPTIAN
        )
    }
    var madhab by remember {
        mutableStateOf(
            NativeAsrMadhab.entries.firstOrNull { it.name == preferences.getString("asr_madhab", null) }
                ?: NativeAsrMadhab.SHAFI
        )
    }
    var showCityPicker by remember { mutableStateOf(false) }
    var selectedTopic by remember { mutableStateOf<NativeAzkarTopic?>(null) }
    var currentTime by remember { mutableLongStateOf(System.currentTimeMillis()) }
    var tasbeehCount by remember { mutableIntStateOf(preferences.getInt("tasbeeh_count", 0)) }
    var reminderSettings by remember { mutableStateOf(NativeReminderCatalog.load(context)) }
    var notificationsAllowed by remember {
        mutableStateOf(
            Build.VERSION.SDK_INT < 33 ||
                context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        )
    }
    val notificationPermissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {
        notificationsAllowed = it
    }
    val requestNotificationPermission = {
        if (Build.VERSION.SDK_INT >= 33 && !notificationsAllowed) {
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    LaunchedEffect(Unit) {
        while (true) {
            currentTime = System.currentTimeMillis()
            delay(30_000)
        }
    }

    val dayKey = remember(currentTime) {
        val calendar = Calendar.getInstance().apply { timeInMillis = currentTime }
        "${calendar.get(Calendar.YEAR)}-${calendar.get(Calendar.DAY_OF_YEAR)}"
    }
    val prayerTimes = remember(city, method, madhab, dayKey) {
        runCatching { NativePrayerCalculator.forDate(city, method, madhab, currentTime) }.getOrDefault(emptyList())
    }
    LaunchedEffect(city, prayerTimes, reminderSettings) {
        NativeReminderCatalog.saveAndSchedule(context, city, prayerTimes, reminderSettings)
    }

    androidx.compose.runtime.CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
        MaterialTheme(colorScheme = lightColorScheme(
            primary = Green,
            onPrimary = Color.White,
            secondary = Gold,
            background = Canvas,
            surface = Color.White,
            onSurface = Ink,
            onBackground = Ink
        )) {
            Scaffold(
                containerColor = Canvas,
                bottomBar = {
                    NavigationBar(containerColor = Color.White) {
                        NativePage.entries.forEach { item ->
                            NavigationBarItem(
                                selected = page == item,
                                onClick = { page = item; selectedTopic = null },
                                icon = { Text(item.symbol, fontSize = 19.sp, fontWeight = FontWeight.Bold) },
                                label = { Text(item.label, fontSize = 11.sp) }
                            )
                        }
                    }
                }
            ) { insets ->
                Column(
                    modifier = Modifier.fillMaxSize().padding(insets).background(Canvas)
                ) {
                    NativeHeader(city.name, onCityClick = { showCityPicker = true })
                    when (page) {
                        NativePage.HOME -> HomePage(
                            city = city,
                            method = method,
                            madhab = madhab,
                            prayerTimes = prayerTimes,
                            now = currentTime,
                            onOpenPrayers = { page = NativePage.PRAYERS },
                            onOpenAzkar = { page = NativePage.AZKAR },
                            onOpenTasbeeh = { page = NativePage.TASBEEH }
                        )
                        NativePage.PRAYERS -> PrayerPage(
                            city = city,
                            method = method,
                            madhab = madhab,
                            times = prayerTimes,
                            onChooseCity = { showCityPicker = true }
                        )
                        NativePage.QIBLA -> NativeQiblaPage(
                            city = city,
                            magneticHeading = magneticHeading,
                            sensorAccuracy = sensorAccuracy,
                            sensorAvailable = sensorAvailable
                        )
                        NativePage.AZKAR -> AzkarPage(
                            selectedTopic = selectedTopic,
                            onSelectTopic = { selectedTopic = it },
                            preferences = preferences
                        )
                        NativePage.TASBEEH -> TasbeehPage(
                            count = tasbeehCount,
                            onIncrement = {
                                tasbeehCount += 1
                                preferences.edit().putInt("tasbeeh_count", tasbeehCount).apply()
                            },
                            onReset = {
                                tasbeehCount = 0
                                preferences.edit().putInt("tasbeeh_count", 0).apply()
                            }
                        )
                        NativePage.MORE -> MorePage(
                            city = city,
                            method = method,
                            madhab = madhab,
                            prayerTimes = prayerTimes,
                            reminderSettings = reminderSettings,
                            notificationsAllowed = notificationsAllowed,
                            onMethodChange = { selected ->
                                method = selected
                                preferences.edit().putString("calculation_method", selected.name).apply()
                            },
                            onMadhabChange = { selected ->
                                madhab = selected
                                preferences.edit().putString("asr_madhab", selected.name).apply()
                            },
                            onReminderSettingsChange = { reminderSettings = it },
                            onRequestNotificationPermission = requestNotificationPermission
                        )
                    }
                }
            }
        }
    }

    if (showCityPicker) {
        CityPickerDialog(
            selectedCity = city,
            onDismiss = { showCityPicker = false },
            onChoose = { chosen ->
                city = chosen
                NativeCities.save(context, chosen)
                showCityPicker = false
            }
        )
    }
}

@Composable
private fun NativeHeader(city: String, onCityClick: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().background(Color.White).padding(horizontal = 20.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column {
            Text("أنياس", color = DeepGreen, fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Text("رفيقك اليومي", color = Muted, fontSize = 12.sp)
        }
        TextButton(onClick = onCityClick) {
            Text("⌖  $city", color = Green, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun HomePage(
    city: NativeCity,
    method: NativeCalculationMethod,
    madhab: NativeAsrMadhab,
    prayerTimes: List<NativePrayerTime>,
    now: Long,
    onOpenPrayers: () -> Unit,
    onOpenAzkar: () -> Unit,
    onOpenTasbeeh: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 18.dp, vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Text(NativePrayerCalculator.formattedArabicDate(now), color = Muted, fontSize = 13.sp)
        Text("السلام عليكم", color = DeepGreen, fontSize = 22.sp, fontWeight = FontWeight.Bold)

        val nextPrayer = prayerTimes.firstOrNull { it.epochMillis > now }
        val next = nextPrayer ?: runCatching {
            val tomorrow = Calendar.getInstance().apply { timeInMillis = now; add(Calendar.DAY_OF_YEAR, 1) }
            NativePrayerCalculator.forDate(city, method, madhab, tomorrow.timeInMillis).firstOrNull()
        }.getOrNull()
        Card(colors = CardDefaults.cardColors(containerColor = DeepGreen), shape = RoundedCornerShape(26.dp)) {
            Column(Modifier.fillMaxWidth().padding(22.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("الصلاة القادمة", color = Color.White.copy(alpha = 0.8f), fontSize = 14.sp)
                Spacer(Modifier.height(8.dp))
                Text(next?.name ?: "المواقيت غير متاحة", color = Color.White, fontSize = 28.sp, fontWeight = FontWeight.Bold)
                if (next != null) {
                    Text(NativePrayerCalculator.formatTime(next.epochMillis), color = Color(0xFFE7D5AE), fontSize = 38.sp, fontWeight = FontWeight.Bold)
                    Text(remainingText(next.epochMillis - now), color = Color.White.copy(alpha = 0.9f), fontSize = 15.sp)
                }
                Spacer(Modifier.height(12.dp))
                Text(city.name, color = Color.White.copy(alpha = 0.75f), fontSize = 13.sp)
            }
        }

        SectionTitle("مواقيت اليوم", action = "عرض الكل", onAction = onOpenPrayers)
        Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(22.dp)) {
            Column(Modifier.padding(horizontal = 16.dp, vertical = 6.dp)) {
                prayerTimes.forEachIndexed { index, item ->
                    PrayerTimeRow(item)
                    if (index < prayerTimes.lastIndex) Spacer(Modifier.height(1.dp))
                }
            }
        }

        SectionTitle("وردك اليومي", action = "افتح الأذكار", onAction = onOpenAzkar)
        Card(colors = CardDefaults.cardColors(containerColor = Color(0xFFF0EBDD)), shape = RoundedCornerShape(22.dp)) {
            Column(Modifier.padding(18.dp)) {
                Text("لحظة هادئة للذكر", color = DeepGreen, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(6.dp))
                Text("افتح حصن المسلم وتابع أذكارك من حيث وصلت.", color = Muted, fontSize = 14.sp)
                Spacer(Modifier.height(12.dp))
                Button(onClick = onOpenAzkar, colors = ButtonDefaults.buttonColors(containerColor = Green)) {
                    Text("تصفّح الأذكار")
                }
            }
        }
        OutlinedButton(onClick = onOpenTasbeeh, modifier = Modifier.fillMaxWidth()) {
            Text("افتح المسبحة الإلكترونية")
        }
    }
}

@Composable
private fun PrayerPage(
    city: NativeCity,
    method: NativeCalculationMethod,
    madhab: NativeAsrMadhab,
    times: List<NativePrayerTime>,
    onChooseCity: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Text("مواقيت الصلاة", color = DeepGreen, fontSize = 24.sp, fontWeight = FontWeight.Bold)
        Text(NativePrayerCalculator.formattedArabicDate(System.currentTimeMillis()), color = Muted)
        Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(22.dp)) {
            Column(Modifier.padding(16.dp)) {
                Text("${city.name}، ${city.country}", color = DeepGreen, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Text("طريقة الحساب: ${method.title} • المذهب: ${madhab.title}", color = Muted, fontSize = 12.sp)
                times.forEach { PrayerTimeRow(it) }
            }
        }
        Text("المواقيت تُحسب محليًا على الجهاز باستخدام الإحداثيات المحفوظة.", color = Muted, fontSize = 13.sp)
        OutlinedButton(onClick = onChooseCity, modifier = Modifier.fillMaxWidth()) { Text("تغيير المدينة") }
    }
}

@Composable
private fun PrayerTimeRow(item: NativePrayerTime) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(item.name, color = Ink, fontSize = 16.sp)
        Text(NativePrayerCalculator.formatTime(item.epochMillis), color = Green, fontSize = 17.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun AzkarPage(
    selectedTopic: NativeAzkarTopic?,
    onSelectTopic: (NativeAzkarTopic?) -> Unit,
    preferences: android.content.SharedPreferences
) {
    val context = LocalContext.current
    val topics = remember { NativeAzkarRepository.read(context) }
    if (selectedTopic == null) {
        Column(modifier = Modifier.fillMaxSize().padding(horizontal = 18.dp, vertical = 12.dp)) {
            Text("حصن المسلم", color = DeepGreen, fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Text("الأذكار من محتوى المشروع الأصلي", color = Muted, fontSize = 13.sp, modifier = Modifier.padding(top = 4.dp, bottom = 10.dp))
            if (topics.isEmpty()) {
                Text("تعذر تحميل محتوى الأذكار.", color = Muted)
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(9.dp), contentPadding = PaddingValues(bottom = 12.dp)) {
                    items(topics) { topic ->
                        Card(
                            modifier = Modifier.fillMaxWidth().clickable { onSelectTopic(topic) },
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            shape = RoundedCornerShape(18.dp)
                        ) {
                            Column(Modifier.padding(16.dp)) {
                                Text(topic.title, color = DeepGreen, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                Text(topic.description, color = Muted, fontSize = 12.sp, modifier = Modifier.padding(top = 5.dp))
                                Text("${topic.items.size} أذكار", color = Gold, fontSize = 12.sp, modifier = Modifier.padding(top = 7.dp))
                            }
                        }
                    }
                }
            }
        }
    } else {
        Column(modifier = Modifier.fillMaxSize().padding(horizontal = 18.dp, vertical = 12.dp)) {
            TextButton(onClick = { onSelectTopic(null) }) { Text("‹  كل الأبواب") }
            Text(selectedTopic.title, color = DeepGreen, fontSize = 21.sp, fontWeight = FontWeight.Bold)
            Text(selectedTopic.description, color = Muted, fontSize = 12.sp, modifier = Modifier.padding(top = 4.dp, bottom = 8.dp))
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp), contentPadding = PaddingValues(bottom = 16.dp)) {
                items(selectedTopic.items) { item ->
                    val key = "dhikr_${selectedTopic.number}_${item.id}"
                    var progress by remember(selectedTopic.number, item.id) { mutableIntStateOf(preferences.getInt(key, 0)) }
                    Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(18.dp)) {
                        Column(Modifier.fillMaxWidth().padding(16.dp)) {
                            Text(item.text, color = Ink, fontSize = 17.sp, lineHeight = 30.sp, textAlign = TextAlign.Start)
                            Spacer(Modifier.height(10.dp))
                            Row(horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                                Text("التكرار ${progress.coerceAtMost(item.count)} / ${item.count}", color = Muted, fontSize = 12.sp)
                                Button(
                                    onClick = {
                                        if (progress < item.count) {
                                            progress += 1
                                            preferences.edit().putInt(key, progress).apply()
                                        }
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = if (progress >= item.count) Gold else Green)
                                ) { Text(if (progress >= item.count) "اكتمل" else "تم الذكر") }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TasbeehPage(count: Int, onIncrement: () -> Unit, onReset: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(22.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text("المسبحة", color = DeepGreen, fontSize = 25.sp, fontWeight = FontWeight.Bold)
        Text("سبحان الله", color = Muted, fontSize = 16.sp, modifier = Modifier.padding(top = 8.dp))
        Spacer(Modifier.height(24.dp))
        Box(
            modifier = Modifier.size(210.dp).background(Color.White, CircleShape).clickable(onClick = onIncrement),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(count.toString(), color = Green, fontSize = 56.sp, fontWeight = FontWeight.Bold)
                Text("اضغط للتسبيح", color = Muted, fontSize = 13.sp)
            }
        }
        Spacer(Modifier.height(20.dp))
        Button(onClick = onIncrement, colors = ButtonDefaults.buttonColors(containerColor = Green), modifier = Modifier.fillMaxWidth()) { Text("سبحان الله") }
        TextButton(onClick = onReset) { Text("تصفير العداد", color = Muted) }
    }
}

@Composable
private fun MorePage(
    city: NativeCity,
    method: NativeCalculationMethod,
    madhab: NativeAsrMadhab,
    prayerTimes: List<NativePrayerTime>,
    reminderSettings: NativeReminderSettings,
    notificationsAllowed: Boolean,
    onMethodChange: (NativeCalculationMethod) -> Unit,
    onMadhabChange: (NativeAsrMadhab) -> Unit,
    onReminderSettingsChange: (NativeReminderSettings) -> Unit,
    onRequestNotificationPermission: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("الإعدادات والمزيد", color = DeepGreen, fontSize = 24.sp, fontWeight = FontWeight.Bold)
        Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(20.dp)) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("طريقة حساب الصلاة", color = DeepGreen, fontWeight = FontWeight.Bold)
                NativeCalculationMethod.entries.forEach { option ->
                    SelectionRow(option.title, method == option, onClick = { onMethodChange(option) })
                }
                Spacer(Modifier.height(4.dp))
                Text("مذهب صلاة العصر", color = DeepGreen, fontWeight = FontWeight.Bold)
                NativeAsrMadhab.entries.forEach { option ->
                    SelectionRow(option.title, madhab == option, onClick = { onMadhabChange(option) })
                }
            }
        }
        NativeReminderSettingsPanel(
            settings = reminderSettings,
            onSettingsChange = onReminderSettingsChange,
            onRequestNotificationPermission = onRequestNotificationPermission,
            notificationsAllowed = notificationsAllowed
        )
    }
}

@Composable
private fun SelectionRow(title: String, selected: Boolean, onClick: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick).padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(title, color = Ink)
        Text(if (selected) "✓" else "○", color = if (selected) Green else Muted, fontSize = 18.sp)
    }
}

@Composable
private fun SectionTitle(title: String, action: String, onAction: () -> Unit) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(title, color = DeepGreen, fontSize = 18.sp, fontWeight = FontWeight.Bold)
        TextButton(onClick = onAction) { Text(action, color = Green, fontSize = 12.sp) }
    }
}

@Composable
private fun CityPickerDialog(selectedCity: NativeCity, onDismiss: () -> Unit, onChoose: (NativeCity) -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("اختر المدينة", color = DeepGreen) },
        text = {
            LazyColumn(modifier = Modifier.height(380.dp)) {
                items(NativeCities.all) { city ->
                    Row(
                        modifier = Modifier.fillMaxWidth().clickable { onChoose(city) }.padding(vertical = 12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(city.name, color = Ink, fontWeight = FontWeight.SemiBold)
                            Text(city.country, color = Muted, fontSize = 12.sp)
                        }
                        if (city == selectedCity) Text("✓", color = Green, fontWeight = FontWeight.Bold)
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("إغلاق") } }
    )
}

private fun remainingText(milliseconds: Long): String {
    val safe = milliseconds.coerceAtLeast(0L) / 1000
    val hours = safe / 3600
    val minutes = (safe % 3600) / 60
    val seconds = safe % 60
    val number = { value: Long -> String.format(Locale("ar"), "%02d", value) }
    return "متبقي ${number(hours)}:${number(minutes)}:${number(seconds)}"
}
