package com.anyas.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        ReminderScheduler.scheduleSaved(context)
        PrayerWidgetProvider.updateAll(context)
    }
}
