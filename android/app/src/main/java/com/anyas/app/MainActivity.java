package com.anyas.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import org.json.JSONObject;

public class MainActivity extends Activity {
    static final String URL = "https://aibdo0.github.io/anyas-app/";
    static final String HOST = "aibdo0.github.io";
    WebView web;
    GeolocationPermissions.Callback geoCallback;
    String geoOrigin;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        setContentView(web);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setGeolocationEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.addJavascriptInterface(new NativeBridge(), "AnyasAndroid");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("https".equals(uri.getScheme()) && HOST.equals(uri.getHost())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) { }
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
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
        if (state == null) web.loadUrl(URL); else web.restoreState(state);
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) ReminderScheduler.scheduleSaved(this);
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode == 42 && geoCallback != null) {
            boolean allowed = false;
            for (int r : results) if (r == PackageManager.PERMISSION_GRANTED) allowed = true;
            geoCallback.invoke(geoOrigin, allowed, false); geoCallback = null; geoOrigin = null;
        }
        if (requestCode == 43 && results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) {
            ReminderScheduler.scheduleSaved(this);
        }
    }
    @Override protected void onSaveInstanceState(Bundle out) { web.saveState(out); super.onSaveInstanceState(out); }
    @Override public void onBackPressed() { if (web != null && web.canGoBack()) web.goBack(); else super.onBackPressed(); }

    public class NativeBridge {
        @JavascriptInterface public void syncSettings(String json) {
            runOnUiThread(() -> {
                getSharedPreferences(ReminderScheduler.PREFS, MODE_PRIVATE).edit().putString("settings", json).apply();
                boolean anyEnabled = false;
                try {
                    org.json.JSONObject root = new org.json.JSONObject(json);
                    org.json.JSONObject enabled = root.optJSONObject("enabled");
                    if (enabled != null) {
                        java.util.Iterator<String> keys = enabled.keys();
                        while (keys.hasNext()) if (enabled.optBoolean(keys.next())) anyEnabled = true;
                    }
                } catch (Exception ignored) { }
                if (anyEnabled && Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 43);
                } else ReminderScheduler.scheduleSaved(MainActivity.this);
            });
        }
    }
}
