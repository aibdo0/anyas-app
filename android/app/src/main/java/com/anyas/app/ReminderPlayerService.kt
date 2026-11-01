package com.anyas.app

import android.app.Service
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import java.util.Locale

class ReminderPlayerService : Service() {
    private var player: MediaPlayer? = null
    private val handler = Handler(Looper.getMainLooper())
    private var testStop: Runnable? = null
    private var activeStartId = 0
    private var notificationKey: String? = null
    private var notificationTitle: String? = null
    private var notificationBody: String? = null
    private var notificationRestored = false

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_DISMISS) {
            dismissReminder(intent.getStringExtra("notificationKey"), startId)
            return START_NOT_STICKY
        }
        ReminderScheduler.createChannels(this)
        val file = intent?.getStringExtra("soundFile") ?: ""
        val title = intent?.getStringExtra("title") ?: "صوت التذكير"
        val body = intent?.getStringExtra("body")
        val key = intent?.getStringExtra("notificationKey")
        val volume = (intent?.getFloatExtra("volume", 1f) ?: 1f).coerceIn(0f, 1f)
        val testDurationMs = intent?.getIntExtra("testDurationMs", 0) ?: 0
        activeStartId = startId
        notificationKey = key?.takeIf { it.isNotBlank() } ?: "audio-playback"
        notificationTitle = title.takeIf { it.isNotBlank() } ?: "صوت التذكير"
        notificationBody = body?.takeIf { it.isNotBlank() } ?: "حان وقت تذكيرك. افتح أنياس للتفاصيل."
        notificationRestored = false
        startForeground(
            ReminderScheduler.requestCode(notificationKey!!),
            ReminderReceiver.buildNotification(this, notificationKey!!, notificationTitle!!, notificationBody!!, true)
        )
        releasePlayer()
        val resource = resources.getIdentifier(rawName(file), "raw", packageName)
        if (resource == 0) {
            finishPlayback(startId)
            return START_NOT_STICKY
        }
        val audioAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        val created = MediaPlayer.create(this, resource, audioAttributes, 0)
        if (created == null) {
            finishPlayback(startId)
            return START_NOT_STICKY
        }
        player = created
        created.setVolume(volume, volume)
        created.setOnCompletionListener { finishPlayback(startId) }
        created.setOnErrorListener { _, _, _ ->
            finishPlayback(startId)
            true
        }
        created.start()
        if (testDurationMs > 0) {
            val boundedDuration = testDurationMs.coerceIn(1000, 10000)
            testStop = Runnable { finishPlayback(startId) }
            handler.postDelayed(testStop!!, boundedDuration.toLong())
        }
        return START_NOT_STICKY
    }

    private fun dismissReminder(key: String?, startId: Int) {
        if (key.isNullOrBlank()) {
            stopSelfResult(startId)
            return
        }
        val manager = getSystemService(NOTIFICATION_SERVICE) as? android.app.NotificationManager
        manager?.cancel(ReminderScheduler.requestCode(key))
        if (key == notificationKey) {
            releasePlayer()
            notificationRestored = true
            stopForeground(true)
        }
        stopSelfResult(startId)
    }

    private fun finishPlayback(startId: Int) {
        if (startId != activeStartId) {
            stopSelfResult(startId)
            return
        }
        releasePlayer()
        stopForeground(true)
        val key = notificationKey
        val title = notificationTitle
        val body = notificationBody
        if (key != null && title != null && body != null && !notificationRestored) {
            ReminderReceiver.restoreReminderNotification(this, key, title, body)
            notificationRestored = true
        }
        stopSelfResult(startId)
    }

    private fun rawName(file: String?): String {
        if (file == null) return ""
        return file.lowercase(Locale.US).replace(Regex("\\.[^.]+$"), "").replace(Regex("[^a-z0-9_]"), "_")
    }

    private fun releasePlayer() {
        testStop?.let(handler::removeCallbacks)
        testStop = null
        player?.let { activePlayer ->
            try {
                if (activePlayer.isPlaying) activePlayer.stop()
            } catch (_: Exception) {
            }
            activePlayer.release()
        }
        player = null
    }

    override fun onDestroy() {
        releasePlayer()
        val key = notificationKey
        val title = notificationTitle
        val body = notificationBody
        if (key != null && title != null && body != null && !notificationRestored) {
            ReminderReceiver.restoreReminderNotification(this, key, title, body)
            notificationRestored = true
        }
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        const val ACTION_DISMISS = "com.anyas.app.action.DISMISS_REMINDER"
    }
}
