package com.anyas.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.Locale
import java.util.concurrent.Executor
import kotlin.coroutines.resume
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

private data class NearbyMosque(
    val name: String,
    val latitude: Double,
    val longitude: Double,
    val distanceMeters: Double
)

@Composable
internal fun NearbyMosquesSection() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var isSearching by remember { mutableStateOf(false) }
    var searched by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var mosques by remember { mutableStateOf<List<NearbyMosque>>(emptyList()) }

    fun startSearch() {
        if (isSearching) return
        isSearching = true
        searched = true
        errorMessage = null
        mosques = emptyList()
        scope.launch {
            try {
                val found = withContext(Dispatchers.IO) {
                    val location = getCurrentLocation(context)
                    MosqueDirectoryRepository.search(location.latitude, location.longitude)
                }
                mosques = found
                if (found.isEmpty()) errorMessage = "لم نعثر على مسجد مسجّل ضمن 5 كم. جرّب البحث على الخريطة."
            } catch (exception: SecurityException) {
                errorMessage = "لم نتمكن من الوصول إلى الموقع. تحقق من إذن الموقع في إعدادات التطبيق."
            } catch (exception: LocationUnavailableException) {
                errorMessage = exception.message ?: "تعذر تحديد موقعك. فعّل خدمة الموقع وحاول مجددًا."
            } catch (exception: Exception) {
                errorMessage = "تعذر تحميل المساجد الآن. تحقق من الاتصال بالإنترنت وحاول مجددًا."
            } finally {
                isSearching = false
            }
        }
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val granted = permissions.values.any { it } || hasAnyLocationPermission(context)
        if (granted) startSearch()
        else errorMessage = "يلزم إذن الموقع للبحث عن المساجد القريبة. يمكنك منح الإذن من إعدادات التطبيق."
    }

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text("مساجد قريبة", color = DeepGreen, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Text("اعثر على مسجد وافتح طريق المشي إليه", color = Muted, fontSize = 12.sp)
            }
            Text("⌖", color = Green, fontSize = 24.sp, fontWeight = FontWeight.Bold)
        }

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            shape = RoundedCornerShape(20.dp)
        ) {
            Column(
                modifier = Modifier.fillMaxWidth().padding(15.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(
                    "يُطلب موقعك عند بدء البحث فقط، وتُرسل إحداثياته إلى OpenStreetMap للعثور على المساجد القريبة دون حفظها داخل التطبيق. عند اختيار الاتجاهات، يفتح المسار في تطبيق الخرائط.",
                    color = Muted, fontSize = 12.sp, lineHeight = 18.sp
                )
                Button(
                    onClick = {
                        if (hasAnyLocationPermission(context)) {
                            startSearch()
                        } else {
                            permissionLauncher.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
                        }
                    },
                    enabled = !isSearching,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Green)
                ) {
                    Text(if (isSearching) "جارٍ البحث عن المساجد…" else if (searched) "إعادة البحث عن القريب" else "ابحث عن مساجد قريبة", fontWeight = FontWeight.SemiBold)
                }

                if (!errorMessage.isNullOrBlank()) {
                    Surface(color = SoftAmber, shape = RoundedCornerShape(12.dp)) {
                        Column(
                            modifier = Modifier.fillMaxWidth().padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(errorMessage.orEmpty(), color = DeepGreen, fontSize = 12.sp, lineHeight = 18.sp)
                            if (errorMessage.orEmpty().contains("الخريطة")) {
                                OutlinedButton(
                                    onClick = { openNearbyMosquesMap(context) },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp)
                                ) { Text("ابحث في الخرائط") }
                            } else if (errorMessage.orEmpty().contains("إعدادات التطبيق")) {
                                OutlinedButton(
                                    onClick = { openAppSettings(context) },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp)
                                ) { Text("فتح إعدادات التطبيق") }
                            }
                        }
                    }
                }

                mosques.forEachIndexed { index, mosque ->
                    MosqueResultCard(mosque = mosque, showDivider = index > 0) {
                        openWalkingDirections(context, mosque)
                    }
                }

                if (searched && mosques.isNotEmpty()) {
                    Text("© مساهمو OpenStreetMap · المسافة خط مستقيم ووقت المشي تقديري؛ المسار الفعلي في الخرائط", color = Muted, fontSize = 10.sp, lineHeight = 15.sp, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
                }
            }
        }
    }
}

@Composable
private fun MosqueResultCard(mosque: NearbyMosque, showDivider: Boolean, onDirections: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if (showDivider) Surface(modifier = Modifier.fillMaxWidth().height(1.dp), color = SoftCanvas, content = {})
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(color = SoftGreen, shape = RoundedCornerShape(13.dp)) {
                Text("م", color = Green, fontSize = 16.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 12.dp, vertical = 9.dp))
            }
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(mosque.name, color = Ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                Text("يبعد ${formatDistance(mosque.distanceMeters)} · مشيًا نحو ${formatWalkingTime(mosque.distanceMeters)}", color = Muted, fontSize = 11.sp)
            }
            OutlinedButton(onClick = onDirections, shape = RoundedCornerShape(12.dp)) {
                Text("الاتجاهات", color = Green, fontSize = 11.sp)
            }
        }
    }
}

private object MosqueDirectoryRepository {
    private const val RADIUS_METERS = 5_000
    private val endpoints = listOf(
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter"
    )

    fun search(latitude: Double, longitude: Double): List<NearbyMosque> {
        val query = "[out:json][timeout:25];(nwr[amenity=mosque](around:$RADIUS_METERS,$latitude,$longitude);nwr[amenity=place_of_worship][religion=muslim](around:$RADIUS_METERS,$latitude,$longitude);nwr[amenity=place_of_worship][religion=islam](around:$RADIUS_METERS,$latitude,$longitude);nwr[building=mosque](around:$RADIUS_METERS,$latitude,$longitude););out center tags;"
        var lastError: Exception? = null
        for (endpoint in endpoints) {
            try {
                val body = httpPost(endpoint, query)
                return parseMosques(body, latitude, longitude)
            } catch (exception: Exception) {
                lastError = exception
            }
        }
        throw lastError ?: IllegalStateException("Overpass endpoints unavailable")
    }

    private fun httpPost(endpoint: String, query: String): String {
        val connection = (URL(endpoint).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 10_000
            readTimeout = 30_000
            doOutput = true
            setRequestProperty("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
            setRequestProperty("User-Agent", "AnyasAndroid/1.1 (nearby mosque search)")
        }
        try {
            val encoded = "data=" + URLEncoder.encode(query, Charsets.UTF_8.name())
            OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { it.write(encoded) }
            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val response = stream?.use { input -> BufferedReader(InputStreamReader(input, Charsets.UTF_8)).readText() }.orEmpty()
            if (status !in 200..299) throw IllegalStateException("Overpass HTTP $status")
            return response
        } finally {
            connection.disconnect()
        }
    }

    private fun parseMosques(json: String, originLat: Double, originLon: Double): List<NearbyMosque> {
        val elements = JSONObject(json).optJSONArray("elements") ?: return emptyList()
        val seen = HashSet<String>()
        val result = ArrayList<NearbyMosque>()
        for (index in 0 until elements.length()) {
            val element = elements.optJSONObject(index) ?: continue
            val tags = element.optJSONObject("tags") ?: JSONObject()
            if (!isMosque(tags)) continue
            val center = element.optJSONObject("center")
            val latitude = if (element.has("lat")) element.optDouble("lat", Double.NaN) else center?.optDouble("lat", Double.NaN) ?: Double.NaN
            val longitude = if (element.has("lon")) element.optDouble("lon", Double.NaN) else center?.optDouble("lon", Double.NaN) ?: Double.NaN
            if (!latitude.isFinite() || !longitude.isFinite()) continue
            val id = "${element.optString("type", "place")}/${element.optLong("id", index.toLong())}"
            if (!seen.add(id)) continue
            val name = tags.optString("name:ar").takeIf { it.isNotBlank() }
                ?: tags.optString("name").takeIf { it.isNotBlank() }
                ?: "مسجد قريب"
            result += NearbyMosque(name, latitude, longitude, distanceMeters(originLat, originLon, latitude, longitude))
        }
        return result.sortedBy { it.distanceMeters }.take(12)
    }

    private fun isMosque(tags: JSONObject): Boolean {
        val amenity = tags.optString("amenity").lowercase()
        val building = tags.optString("building").lowercase()
        val religionTags = tags.optString("religion").lowercase().split(Regex("[;,]")).map { it.trim() }.filter { it.isNotEmpty() }
        val muslimReligion = religionTags.isNotEmpty() && religionTags.all { it == "muslim" || it == "islam" }
        if (religionTags.isNotEmpty() && !muslimReligion) return false
        return amenity == "mosque" || building == "mosque" || (amenity == "place_of_worship" && muslimReligion)
    }

    private fun distanceMeters(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val latDelta = Math.toRadians(lat2 - lat1)
        val lonDelta = Math.toRadians(lon2 - lon1)
        val a = sin(latDelta / 2).let { it * it } + cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) * sin(lonDelta / 2).let { it * it }
        val bounded = a.coerceIn(0.0, 1.0)
        return 6_371_000.0 * 2 * atan2(sqrt(bounded), sqrt(1 - bounded))
    }
}

private class LocationUnavailableException(message: String) : Exception(message)

private fun hasAnyLocationPermission(context: Context): Boolean =
    context.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
        context.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED

@SuppressLint("MissingPermission")
private suspend fun getCurrentLocation(context: Context): Location {
    val manager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    val fineGranted = context.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
    val coarseGranted = context.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
    if (!fineGranted && !coarseGranted) throw SecurityException("Location permission is not granted")

    val providers = buildList {
        if (coarseGranted && manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) add(LocationManager.NETWORK_PROVIDER)
        if (fineGranted && manager.isProviderEnabled(LocationManager.GPS_PROVIDER)) add(LocationManager.GPS_PROVIDER)
    }.distinct()
    if (providers.isEmpty()) throw LocationUnavailableException("فعّل خدمة الموقع في الهاتف ثم حاول مجددًا.")

    val recentCutoff = System.currentTimeMillis() - 2 * 60 * 1000
    val cached = providers.mapNotNull { provider -> runCatching { manager.getLastKnownLocation(provider) }.getOrNull() }
        .filter { it.time >= recentCutoff }
        .maxByOrNull { it.time }
    if (cached != null) return cached

    for (provider in providers) {
        val location = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            withTimeoutOrNull(12_000) { requestCurrentLocation(manager, provider) }
        } else {
            withTimeoutOrNull(12_000) { requestSingleLocation(manager, provider) }
        }
        if (location != null) return location
    }
    throw LocationUnavailableException("تعذر تحديد موقعك الآن. تأكد من تشغيل الموقع وحاول مجددًا.")
}

@SuppressLint("MissingPermission")
private suspend fun requestCurrentLocation(manager: LocationManager, provider: String): Location? =
    suspendCancellableCoroutine { continuation ->
        val executor = Executor { command -> Handler(Looper.getMainLooper()).post(command) }
        try {
            manager.getCurrentLocation(provider, null, executor) { location ->
                if (continuation.isActive) continuation.resume(location)
            }
        } catch (exception: SecurityException) {
            if (continuation.isActive) continuation.resume(null)
        }
    }

@Suppress("DEPRECATION", "MissingPermission")
private suspend fun requestSingleLocation(manager: LocationManager, provider: String): Location? =
    suspendCancellableCoroutine { continuation ->
        val listener = object : LocationListener {
            override fun onLocationChanged(location: Location) {
                if (continuation.isActive) continuation.resume(location)
                runCatching { manager.removeUpdates(this) }
            }
            override fun onProviderEnabled(provider: String) = Unit
            override fun onProviderDisabled(provider: String) = Unit
            @Deprecated("Deprecated in Android")
            override fun onStatusChanged(provider: String?, status: Int, extras: android.os.Bundle?) = Unit
        }
        continuation.invokeOnCancellation { runCatching { manager.removeUpdates(listener) } }
        try {
            manager.requestSingleUpdate(provider, listener, Looper.getMainLooper())
        } catch (exception: SecurityException) {
            if (continuation.isActive) continuation.resume(null)
        }
    }

private fun openWalkingDirections(context: Context, mosque: NearbyMosque) {
    val url = "https://www.google.com/maps/dir/?api=1&destination=${mosque.latitude},${mosque.longitude}&travelmode=walking"
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    try {
        context.startActivity(intent)
    } catch (exception: ActivityNotFoundException) {
        openNearbyMosquesMap(context)
    }
}

private fun openNearbyMosquesMap(context: Context) {
    val uri = Uri.parse("https://www.google.com/maps/search/?api=1&query=mosque+near+me")
    runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
}

private fun openAppSettings(context: Context) {
    val uri = Uri.fromParts("package", context.packageName, null)
    runCatching {
        context.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
}

private fun formatDistance(meters: Double): String =
    if (meters < 1000) "${maxOf(10, (meters / 10).toInt() * 10)} م" else String.format(Locale("ar"), "%.1f كم", meters / 1000)

private fun formatWalkingTime(meters: Double): String {
    val minutes = maxOf(1, (meters / 80).toInt())
    return if (minutes < 60) "$minutes د" else "${minutes / 60} س ${minutes % 60} د"
}

private val SoftCanvas = Color(0xFFF5F7F4)
private val SoftGreen = Color(0xFFE7F1EC)
private val SoftAmber = Color(0xFFFFF2D9)
