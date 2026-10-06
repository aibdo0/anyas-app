package com.anyas.app;

import android.Manifest;
import android.app.Activity;
import android.app.NotificationManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.provider.Settings;
import android.view.View;
import android.widget.TextView;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.webkit.WebViewAssetLoader;
import com.google.firebase.messaging.FirebaseMessaging;
import org.json.JSONObject;
import java.util.Calendar;

public class MainActivity extends Activity {
    static final String HOST = "appassets.androidplatform.net";
    WebView web;
    WebViewAssetLoader assetLoader;
    GeolocationPermissions.Callback geoCallback;
    String geoOrigin;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        View splash = getLayoutInflater().inflate(R.layout.activity_splash, null);
        View splashTint = splash.findViewById(R.id.splashTint);
        TextView splashQuote = splash.findViewById(R.id.splashQuote);
        int hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY);
        if (hour >= 5 && hour < 12) {
            splashQuote.setText("وَاذْكُر رَّبَّكَ إِذَا نَسِيتَ");
            splashTint.setBackgroundColor(0x120B4F3F);
        } else if (hour >= 12 && hour < 18) {
            splashQuote.setText("ألا بذكر الله تطمئن القلوب");
            splashTint.setBackgroundColor(0x08B18A43);
        } else {
            splashQuote.setText("رفيقك اليومي للصلاة والأذكار");
            splashTint.setBackgroundColor(0x300D1B18);
            splashQuote.setTextColor(Color.WHITE);
        }
        splash.setAlpha(0f);
        splash.setScaleX(0.985f);
        splash.setScaleY(0.985f);
        setContentView(splash);
        splash.animate().alpha(1f).scaleX(1f).scaleY(1f).setDuration(420).start();
        splashQuote.setAlpha(0f);
        splashQuote.animate().alpha(1f).setStartDelay(220).setDuration(520).start();
        Handler mainHandler = new Handler(Looper.getMainLooper());
        final boolean[] appShown = { false };
        Runnable showApp = () -> {
            if (appShown[0]) return;
            appShown[0] = true;
            splash.animate().alpha(0f).setDuration(220).withEndAction(() -> setContentView(web)).start();
        };
        assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setGeolocationEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setSupportMultipleWindows(true);
        web.addJavascriptInterface(new NativeBridge(), "AnyasAndroid");
        FirebaseMessaging.getInstance().getToken().addOnSuccessListener(token ->
                getSharedPreferences("anyas_firebase", MODE_PRIVATE).edit().putString("fcm_token", token).apply());
        web.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView view, String url) {
                mainHandler.postDelayed(showApp, 650);
            }
            @Override public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("https".equals(uri.getScheme()) && HOST.equals(uri.getHost()) && uri.getPath().startsWith("/assets/")) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) { }
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                WebView popup = new WebView(MainActivity.this);
                popup.setWebViewClient(new WebViewClient() {
                    @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) {
                        Uri uri = request.getUrl();
                        if ("https".equals(uri.getScheme()) && HOST.equals(uri.getHost()) && uri.getPath().startsWith("/assets/")) web.loadUrl(uri.toString());
                        else try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) { }
                        v.destroy();
                        return true;
                    }
                });
                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(popup);
                resultMsg.sendToTarget();
                return true;
            }
            @Override public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (!origin.startsWith("https://" + HOST)) { callback.invoke(origin, false, false); return; }
                if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                    callback.invoke(origin, true, false);
                } else {
                    geoOrigin = origin; geoCallback = callback;
                    requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, 42);
                }
            }
        });
        if (state == null) web.loadUrl("https://" + HOST + "/assets/index.html"); else {
            web.restoreState(state);
            mainHandler.postDelayed(showApp, 650);
        }
        mainHandler.postDelayed(showApp, 2200);
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode == 42 && geoCallback != null) {
            boolean allowed = false;
            for (int r : results) if (r == PackageManager.PERMISSION_GRANTED) allowed = true;
            geoCallback.invoke(geoOrigin, allowed, false); geoCallback = null; geoOrigin = null;
        }
        if (requestCode == 43) {
            boolean granted = aboutPermissionGranted("notifications");
            if (granted) ReminderScheduler.scheduleSaved(this);
            reportAboutPermission("notifications", granted);
        }
        if (requestCode == 44) reportAboutPermission("location", aboutPermissionGranted("location"));
    }
    @Override protected void onSaveInstanceState(Bundle out) { web.saveState(out); super.onSaveInstanceState(out); }
    @Override protected void onResume() {
        super.onResume();
        if (web != null) web.post(() -> web.evaluateJavascript("if (window.anyasNotificationInboxRefresh) window.anyasNotificationInboxRefresh();", null));
    }
    @Override public void onBackPressed() { if (web != null && web.canGoBack()) web.goBack(); else super.onBackPressed(); }

    private boolean aboutPermissionGranted(String kind) {
        if ("location".equals(kind)) {
            return checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                    || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        }
        if ("notifications".equals(kind)) {
            if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return false;
            if (Build.VERSION.SDK_INT >= 24) {
                NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
                return manager != null && manager.areNotificationsEnabled();
            }
            return true;
        }
        return false;
    }

    private void reportAboutPermission(String kind, boolean granted) {
        if (web == null) return;
        String script = "if (window.anyasAboutPermissionResult) { window.anyasAboutPermissionResult('" + kind + "', " + granted + "); }";
        web.post(() -> web.evaluateJavascript(script, null));
    }

    public class NativeBridge {
        @JavascriptInterface public String getFirebaseToken() {
            return getSharedPreferences("anyas_firebase", MODE_PRIVATE).getString("fcm_token", "");
        }
        @JavascriptInterface public boolean isFirebaseConnected() { return !getFirebaseToken().isEmpty(); }
        @JavascriptInterface public boolean areFirebaseUpdatesEnabled() { return getSharedPreferences("anyas_firebase", MODE_PRIVATE).getBoolean("updates_enabled", true); }
        @JavascriptInterface public void setFirebaseUpdatesEnabled(boolean enabled) { getSharedPreferences("anyas_firebase", MODE_PRIVATE).edit().putBoolean("updates_enabled", enabled).apply(); }
        @JavascriptInterface public String getAppVersionName() { try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionName; } catch (Exception ignored) { return "unknown"; } }
        @JavascriptInterface public void rescheduleRemindersNow() { ReminderScheduler.scheduleSaved(MainActivity.this); }
        @JavascriptInterface public String getNotificationHistory() {
            return NotificationHistory.getJson(MainActivity.this);
        }
        @JavascriptInterface public void markNotificationHistoryRead() {
            NotificationHistory.markAllRead(MainActivity.this);
        }
        @JavascriptInterface public void recordNotification(String tag, String title, String body) {
            NotificationHistory.record(MainActivity.this, tag, title, body);
        }
        @JavascriptInterface public boolean hasAboutPermission(String kind) {
            return aboutPermissionGranted(kind);
        }
        @JavascriptInterface public void requestAboutPermission(String kind) {
            runOnUiThread(() -> {
                if ("location".equals(kind)) {
                    if (aboutPermissionGranted(kind)) reportAboutPermission(kind, true);
                    else requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, 44);
                } else if ("notifications".equals(kind)) {
                    if (aboutPermissionGranted(kind)) reportAboutPermission(kind, true);
                    else if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                        requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 43);
                    } else reportAboutPermission(kind, false);
                }
            });
        }
        @JavascriptInterface public void openAboutPermissionSettings() {
            runOnUiThread(() -> {
                Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.fromParts("package", getPackageName(), null));
                startActivity(intent);
            });
        }
        @JavascriptInterface public String testNotificationAndSound(String soundFile, double volume) {
            if (!aboutPermissionGranted("notifications")) return "permission_required";
            if (volume <= 0d) return "volume_muted";
            String safeSound;
            if ("adhkar-morning-ahmed-al-nafis.mp3".equals(soundFile)) safeSound = soundFile;
            else if ("adhkar-morning-mishary-alafasy.mp3".equals(soundFile)) safeSound = soundFile;
            else return "invalid_audio";

            ReminderScheduler.createChannels(MainActivity.this);
            if (Build.VERSION.SDK_INT >= 26) {
                NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
                android.app.NotificationChannel channel = manager == null ? null : manager.getNotificationChannel("reminders");
                if (channel == null || channel.getImportance() == NotificationManager.IMPORTANCE_NONE) return "channel_disabled";
            }

            String id = "test-audio-" + System.currentTimeMillis();
            ReminderReceiver.showTestNotification(MainActivity.this, id, "اختبار أنياس", "إذا ظهر هذا التنبيه وسمعت الصوت فالإعدادات تعمل.");
            Intent player = new Intent(MainActivity.this, ReminderPlayerService.class)
                    .putExtra("soundFile", safeSound)
                    .putExtra("title", "اختبار صوت الأذكار")
                    .putExtra("volume", (float) Math.max(0d, Math.min(1d, volume)))
                    .putExtra("testDurationMs", 3000);
            try {
                if (Build.VERSION.SDK_INT >= 26) startForegroundService(player);
                else startService(player);
                return "started";
            } catch (Exception error) {
                return "notification_only";
            }
        }
        @JavascriptInterface public void syncSettings(String json) {
            runOnUiThread(() -> {
                getSharedPreferences(ReminderScheduler.PREFS, MODE_PRIVATE).edit().putString("settings", json).apply();
                boolean anyEnabled = false;
                try {
                    JSONObject root = new JSONObject(json), enabled = root.optJSONObject("enabled");
                    if (enabled != null) { java.util.Iterator<String> keys = enabled.keys(); while (keys.hasNext()) if (enabled.optBoolean(keys.next())) anyEnabled = true; }
                } catch (Exception ignored) { }
                if (anyEnabled && Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 43);
                } else ReminderScheduler.scheduleSaved(MainActivity.this);
            });
        }
    }
}
