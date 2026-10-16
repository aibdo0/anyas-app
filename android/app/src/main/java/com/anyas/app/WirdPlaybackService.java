package com.anyas.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.media.AudioManager;
import android.media.AudioAttributes;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.Locale;
import java.util.UUID;

public final class WirdPlaybackService extends Service {
    static final String ACTION_PLAY = "com.anyas.app.action.WIRD_PLAY";
    static final String ACTION_PAUSE = "com.anyas.app.action.WIRD_PAUSE";
    static final String ACTION_RESUME = "com.anyas.app.action.WIRD_RESUME";
    static final String ACTION_NEXT = "com.anyas.app.action.WIRD_NEXT";
    static final String ACTION_STOP = "com.anyas.app.action.WIRD_STOP";
    static final String ACTION_SETTINGS = "com.anyas.app.action.WIRD_SETTINGS";
    private static final String CHANNEL_ID = "wird_playback";
    private static final int NOTIFICATION_ID = 4032;
    private static final int NOTIFICATION_OPEN_ID = 4033;
    private static final long MAX_WAKE_LOCK_MS = 15L * 60L * 1000L;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private AudioManager audioManager;
    private final AudioManager.OnAudioFocusChangeListener audioFocusListener = change -> mainHandler.post(() -> handleAudioFocusChange(change));
    private TextToSpeech textToSpeech;
    private MediaSession mediaSession;
    private PowerManager.WakeLock wakeLock;
    private JSONArray queue = new JSONArray();
    private boolean ttsReady;
    private boolean paused;
    private boolean hasRequest;
    private boolean foregroundStarted;
    private boolean pausedForFocus;
    private boolean replayCurrent;
    private String sessionToken = "";
    private String currentText = "";
    private String sessionTitle = "جلسة الأذكار";
    private String utteranceId;
    private int itemIndex;
    private int replayReturnIndex;
    private int repeatNumber = 1;
    private int repeatTotal = 1;
    private int ttsRetryCount;
    private float volume = 1f;
    private float speechRate = 1f;

    @Override public void onCreate() {
        super.onCreate();
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        createChannel();
        mediaSession = new MediaSession(this, "AniasWirdPlayback");
        mediaSession.setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS | MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS);
        mediaSession.setCallback(new MediaSession.Callback() {
            @Override public void onPlay() { resumePlayback(); }
            @Override public void onPause() { pausePlayback(); }
            @Override public void onSkipToNext() { requestNext(); }
            @Override public void onStop() { stopPlayback(true, false); }
        });
        mediaSession.setActive(true);
        textToSpeech = new TextToSpeech(getApplicationContext(), status -> {
            if (status != TextToSpeech.SUCCESS) {
                report("window.anyasAndroidWirdFailed");
                stopPlayback(false, false);
                return;
            }
            ttsReady = true;
            textToSpeech.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build());
            int language = textToSpeech.setLanguage(Locale.forLanguageTag("ar-SA"));
            if (language == TextToSpeech.LANG_MISSING_DATA || language == TextToSpeech.LANG_NOT_SUPPORTED) {
                report("window.anyasAndroidWirdFailed");
                stopPlayback(false, false);
                return;
            }
            textToSpeech.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override public void onStart(String id) { }
                @Override public void onDone(String id) { mainHandler.post(() -> completeUtterance(id)); }
                @Override public void onError(String id) { mainHandler.post(() -> handleTtsError(id)); }
                @Override public void onError(String id, int errorCode) { mainHandler.post(() -> handleTtsError(id)); }
            });
            if (hasRequest && !paused) startIfFocused();
        });
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? ACTION_STOP : intent.getAction();
        if (ACTION_STOP.equals(action)) {
            if (!isCurrentSession(intent)) { if (!hasRequest) stopSelf(startId); return START_NOT_STICKY; }
            stopPlayback(true, false);
            return START_NOT_STICKY;
        }
        if (ACTION_SETTINGS.equals(action)) {
            if (!isCurrentSession(intent)) { if (!hasRequest) stopSelf(startId); return START_NOT_STICKY; }
            volume = clamp(intent.getFloatExtra("volume", volume), 0f, 1f);
            speechRate = clamp(intent.getFloatExtra("rate", speechRate), 0.75f, 1.25f);
            return START_NOT_STICKY;
        }
        if (ACTION_NEXT.equals(action)) {
            if (!isCurrentSession(intent)) { if (!hasRequest) stopSelf(startId); return START_NOT_STICKY; }
            requestNext();
            return START_NOT_STICKY;
        }
        if (ACTION_PAUSE.equals(action)) {
            if (!isCurrentSession(intent)) { if (!hasRequest) stopSelf(startId); return START_NOT_STICKY; }
            pausePlayback();
            return START_NOT_STICKY;
        }
        if (ACTION_RESUME.equals(action)) {
            if (!isCurrentSession(intent)) { if (!hasRequest) stopSelf(startId); return START_NOT_STICKY; }
            resumePlayback();
            return START_NOT_STICKY;
        }

        String queueJson = intent == null ? null : intent.getStringExtra("queue");
        if (queueJson != null) {
            try {
                JSONArray requested = new JSONArray(queueJson);
                int requestedIndex = intent.getIntExtra("startIndex", 0);
                if (requested.length() == 0 || requested.length() > 200 || requestedIndex < 0 || requestedIndex >= requested.length()) {
                    stopPlayback(false, false);
                    return START_NOT_STICKY;
                }
                queue = requested;
                itemIndex = requestedIndex;
                replayCurrent = intent.getBooleanExtra("replayCurrent", false);
                replayReturnIndex = intent.getIntExtra("returnIndex", requestedIndex);
                volume = clamp(intent.getFloatExtra("volume", 1f), 0f, 1f);
                speechRate = clamp(intent.getFloatExtra("rate", 1f), 0.75f, 1.25f);
                sessionTitle = safe(intent.getStringExtra("title"), "جلسة الأذكار");
                sessionToken = safe(intent.getStringExtra("sessionToken"), "");
                hasRequest = true;
                paused = false;
                pausedForFocus = false;
                ttsRetryCount = 0;
                setCurrentMetadata();
            } catch (Exception error) {
                report("window.anyasAndroidWirdFailed");
                stopPlayback(false, false);
                return START_NOT_STICKY;
            }
        }
        if (!hasRequest) return START_NOT_STICKY;
        if (!foregroundStarted) {
            startForeground(NOTIFICATION_ID, buildNotification());
            foregroundStarted = true;
        } else updateNotification();
        if (ttsReady && !paused) startIfFocused();
        return START_NOT_STICKY;
    }

    private void speakCurrent() {
        if (!ttsReady || textToSpeech == null || paused || !hasRequest) return;
        JSONObject entry = queue.optJSONObject(itemIndex);
        if (entry == null) { stopPlayback(true, true); return; }
        currentText = entry.optString("text", "").trim();
        int count = Math.max(1, entry.optInt("count", 1));
        int completed = Math.min(Math.max(0, entry.optInt("completed", 0)), count);
        if (replayCurrent) {
            repeatNumber = 1;
            repeatTotal = 1;
        } else {
            if (completed >= count) {
                advanceToNextItem();
                return;
            }
            repeatNumber = completed + 1;
            repeatTotal = count;
        }
        if (currentText.isEmpty()) { advanceToNextItem(); return; }
        acquireWakeLock();
        utteranceId = "wird-" + UUID.randomUUID();
        textToSpeech.stop();
        textToSpeech.setSpeechRate(speechRate);
        textToSpeech.setPitch(1f);
        android.os.Bundle params = new android.os.Bundle();
        params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, volume);
        int result = textToSpeech.speak(currentText, TextToSpeech.QUEUE_FLUSH, params, utteranceId);
        if (result == TextToSpeech.ERROR) { retryOrStopTts(); return; }
        updateMediaState(PlaybackState.STATE_PLAYING);
        updateNotification();
    }

    private void completeUtterance(String completedId) {
        if (paused || !hasRequest || completedId == null || !completedId.equals(utteranceId)) return;
        ttsRetryCount = 0;
        JSONObject entry = queue.optJSONObject(itemIndex);
        if (entry == null) { stopPlayback(true, true); return; }
        int count = Math.max(1, entry.optInt("count", 1));
        int completed = Math.min(Math.max(0, entry.optInt("completed", 0)), count);
        int completedIndex = itemIndex;
        int nextIndex;
        boolean wasReplay = replayCurrent;
        if (wasReplay) {
            replayCurrent = false;
            nextIndex = replayReturnIndex;
        } else {
            completed = Math.min(count, completed + 1);
            try { entry.put("completed", completed); } catch (Exception ignored) { }
            if (completed >= count) {
                nextIndex = itemIndex + 1 < queue.length() ? itemIndex + 1 : -1;
            } else nextIndex = itemIndex;
        }
        MainActivity.dispatchWirdPlaybackProgress(completedIndex, completed, nextIndex, sessionToken);
        if (nextIndex < 0 || nextIndex >= queue.length()) {
            releaseWakeLock();
            stopPlayback(false, true);
            return;
        }
        itemIndex = nextIndex;
        repeatTotal = 1;
        setCurrentMetadata();
        updateNotification();
        speakCurrent();
    }

    private void handleTtsError(String failedId) {
        if (paused || !hasRequest || failedId == null || !failedId.equals(utteranceId)) return;
        retryOrStopTts();
    }

    private void retryOrStopTts() {
        if (!hasRequest) return;
        if (ttsRetryCount < 1) {
            ttsRetryCount++;
            mainHandler.postDelayed(() -> { if (hasRequest && !paused) speakCurrent(); }, 350);
            return;
        }
        report("window.anyasAndroidWirdFailed");
        stopPlayback(false, false);
    }

    private boolean requestAudioFocus() {
        if (audioManager == null) return false;
        return audioManager.requestAudioFocus(audioFocusListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
    }

    private void startIfFocused() {
        if (!hasRequest || paused) return;
        if (requestAudioFocus()) speakCurrent();
        else { paused = true; pausedForFocus = true; updateMediaState(PlaybackState.STATE_PAUSED); updateNotification(); report("window.anyasAndroidWirdPaused"); }
    }

    private void handleAudioFocusChange(int change) {
        if (!hasRequest) return;
        if (change == AudioManager.AUDIOFOCUS_GAIN) {
            if (pausedForFocus) { pausedForFocus = false; resumePlayback(); }
            return;
        }
        if (change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT || change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK) {
            if (!paused) { pausedForFocus = true; pausePlaybackInternal(); }
            return;
        }
        if (change == AudioManager.AUDIOFOCUS_LOSS) {
            pausedForFocus = false;
            if (!paused) pausePlaybackInternal();
            abandonAudioFocus();
        }
    }

    private void pausePlayback() {
        pausedForFocus = false;
        abandonAudioFocus();
        pausePlaybackInternal();
    }

    private void pausePlaybackInternal() {
        if (!hasRequest || paused) return;
        paused = true;
        if (textToSpeech != null) textToSpeech.stop();
        releaseWakeLock();
        updateMediaState(PlaybackState.STATE_PAUSED);
        updateNotification();
        report("window.anyasAndroidWirdPaused");
    }

    private void resumePlayback() {
        if (!hasRequest) return;
        if (!requestAudioFocus()) { paused = true; pausedForFocus = true; updateMediaState(PlaybackState.STATE_PAUSED); updateNotification(); return; }
        paused = false;
        pausedForFocus = false;
        speakCurrent();
        report("window.anyasAndroidWirdResumed");
    }

    private void requestNext() {
        if (!hasRequest) return;
        int nextIndex = replayCurrent ? replayReturnIndex : Math.min(itemIndex + 1, queue.length() - 1);
        replayCurrent = false;
        if (nextIndex == itemIndex && itemIndex == queue.length() - 1) {
            stopPlayback(true, false);
            return;
        }
        itemIndex = nextIndex;
        MainActivity.dispatchWirdPlaybackPosition(itemIndex, sessionToken);
        setCurrentMetadata();
        if (!paused) speakCurrent();
        updateNotification();
    }

    private void advanceToNextItem() {
        if (itemIndex + 1 >= queue.length()) {
            report("window.anyasAndroidWirdCompleted");
            stopPlayback(false, true);
            return;
        }
        itemIndex++;
        MainActivity.dispatchWirdPlaybackPosition(itemIndex, sessionToken);
        setCurrentMetadata();
        speakCurrent();
    }

    private void stopPlayback(boolean notifyWeb, boolean completed) {
        paused = false;
        pausedForFocus = false;
        hasRequest = false;
        utteranceId = null;
        currentText = "";
        releaseWakeLock();
        abandonAudioFocus();
        if (textToSpeech != null) textToSpeech.stop();
        if (mediaSession != null) updateMediaState(PlaybackState.STATE_STOPPED);
        if (foregroundStarted) {
            stopForeground(true);
            foregroundStarted = false;
        }
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (manager != null) manager.cancel(NOTIFICATION_ID);
        if (notifyWeb) report("window.anyasAndroidWirdStopped");
        if (completed) report("window.anyasAndroidWirdCompleted");
        stopSelf();
    }

    private void setCurrentMetadata() {
        JSONObject entry = queue.optJSONObject(itemIndex);
        if (entry == null) return;
        int count = Math.max(1, entry.optInt("count", 1));
        int completed = Math.max(0, entry.optInt("completed", 0));
        repeatNumber = replayCurrent ? 1 : Math.min(count, completed + 1);
        repeatTotal = replayCurrent ? 1 : count;
    }

    private void report(String javascriptCall) {
        MainActivity.dispatchWirdPlaybackEvent(javascriptCall, sessionToken);
    }

    private boolean isCurrentSession(Intent intent) {
        return intent != null && sessionToken.equals(intent.getStringExtra("sessionToken"));
    }

    private void acquireWakeLock() {
        if (wakeLock == null) {
            PowerManager manager = (PowerManager) getSystemService(POWER_SERVICE);
            if (manager == null) return;
            wakeLock = manager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Anias:WirdPlayback");
            wakeLock.setReferenceCounted(false);
        }
        if (!wakeLock.isHeld()) wakeLock.acquire(MAX_WAKE_LOCK_MS);
        else {
            wakeLock.release();
            wakeLock.acquire(MAX_WAKE_LOCK_MS);
        }
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
    }

    private void abandonAudioFocus() {
        if (audioManager != null) audioManager.abandonAudioFocus(audioFocusListener);
    }

    private void updateMediaState(int state) {
        if (mediaSession == null) return;
        long actions = PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE
                | PlaybackState.ACTION_PLAY_PAUSE | PlaybackState.ACTION_SKIP_TO_NEXT | PlaybackState.ACTION_STOP;
        mediaSession.setMetadata(new MediaMetadata.Builder()
                .putString(MediaMetadata.METADATA_KEY_TITLE, sessionTitle)
                .putString(MediaMetadata.METADATA_KEY_ARTIST, "أنياس")
                .putLong(MediaMetadata.METADATA_KEY_TRACK_NUMBER, repeatNumber)
                .putLong(MediaMetadata.METADATA_KEY_NUM_TRACKS, repeatTotal)
                .build());
        mediaSession.setPlaybackState(new PlaybackState.Builder()
                .setActions(actions)
                .setState(state, PlaybackState.PLAYBACK_POSITION_UNKNOWN, state == PlaybackState.STATE_PLAYING ? 1f : 0f)
                .build());
    }

    private Notification buildNotification() {
        Intent open = new Intent(this, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP)
                .putExtra("anyas_page", "azkar");
        PendingIntent content = PendingIntent.getActivity(this, NOTIFICATION_OPEN_ID, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(this, CHANNEL_ID)
                : new Notification.Builder(this).setPriority(Notification.PRIORITY_LOW);
        builder.setSmallIcon(R.drawable.ic_notification)
                .setColor(Color.rgb(196, 154, 85))
                .setContentTitle(sessionTitle)
                .setContentText("الذكر " + repeatNumber + " من " + repeatTotal)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setCategory(Notification.CATEGORY_TRANSPORT)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setContentIntent(content)
                .addAction(paused ? android.R.drawable.ic_media_play : android.R.drawable.ic_media_pause,
                        paused ? "استئناف" : "إيقاف مؤقت", actionPending(paused ? ACTION_RESUME : ACTION_PAUSE, 4034))
                .addAction(android.R.drawable.ic_media_next, "التالي", actionPending(ACTION_NEXT, 4035))
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "إنهاء", actionPending(ACTION_STOP, 4036));
        if (mediaSession != null) {
            builder.setStyle(new Notification.MediaStyle()
                    .setMediaSession(mediaSession.getSessionToken())
                    .setShowActionsInCompactView(0, 1, 2));
        }
        return builder.build();
    }

    private PendingIntent actionPending(String action, int requestCode) {
        Intent intent = new Intent(this, WirdPlaybackService.class).setAction(action).putExtra("sessionToken", sessionToken);
        return PendingIntent.getService(this, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private void updateNotification() {
        if (!foregroundStarted) return;
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) manager.notify(NOTIFICATION_ID, buildNotification());
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "جلسات الأذكار الصوتية", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("التحكم في جلسة الورد أثناء تشغيلها في الخلفية");
        channel.setShowBadge(false);
        manager.createNotificationChannel(channel);
    }

    private static String safe(String value, String fallback) {
        return value == null || value.trim().isEmpty() ? fallback : value.trim();
    }

    private static float clamp(float value, float min, float max) {
        return Math.max(min, Math.min(max, value));
    }

    @Override public void onDestroy() {
        releaseWakeLock();
        abandonAudioFocus();
        if (textToSpeech != null) {
            textToSpeech.stop();
            textToSpeech.shutdown();
            textToSpeech = null;
        }
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent) { return null; }
}
