package com.anyas.app;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class ReminderReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c, Intent i) {
        String id=i.getStringExtra("id"), title=i.getStringExtra("title"), body=i.getStringExtra("body"), time=i.getStringExtra("time");
        if(id==null)return;
        ReminderScheduler.createChannels(c);
        Intent open=new Intent(c,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi=PendingIntent.getActivity(c,id.hashCode()&0x7fffffff,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        String channel=i.getBooleanExtra("sound",true)?"reminders_sound":"reminders_silent";
        Notification.Builder b=Build.VERSION.SDK_INT>=26?new Notification.Builder(c,channel):new Notification.Builder(c).setDefaults(i.getBooleanExtra("sound",true)?Notification.DEFAULT_SOUND|Notification.DEFAULT_VIBRATE:0);
        b.setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle(title==null?"أنياس":title).setContentText(body==null?"حان وقت وردك اليومي":body).setAutoCancel(true).setContentIntent(pi);
        ((NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE)).notify(id.hashCode(),b.build());
        if(time!=null) ReminderScheduler.scheduleOne(c,(android.app.AlarmManager)c.getSystemService(Context.ALARM_SERVICE),new ReminderScheduler.Reminder(id,title,time,body),i.getBooleanExtra("sound",true));
    }
}
