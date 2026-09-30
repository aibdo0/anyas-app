package com.anyas.app;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import org.json.JSONObject;
import java.util.Calendar;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

final class ReminderScheduler {
    static final String PREFS = "anyas_reminders";
    private static final String[] KEYS = {"notifyWardAwakening", "notifyWardMorning", "notifyWardGeneral", "notifyWardEvening", "notifyWardSleep", "notifyWardSahar"};
    private static final String[] TITLES = {"أذكار الاستيقاظ", "أذكار الصباح", "ورد اليوم", "أذكار المساء", "أذكار النوم", "استغفار السحر"};
    private static final String[] TIMES = {"04:30", "05:30", "12:00", "15:30", "20:00", "02:00"};
    static void scheduleSaved(Context c) {
        try {
            String raw = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("settings", "{}");
            JSONObject data = new JSONObject(raw), enabled = data.optJSONObject("enabled"), prayers = data.optJSONObject("prayers");
            boolean sound = data.optBoolean("sound", true);
            List<Reminder> reminders = new ArrayList<>();
            for (int i=0;i<KEYS.length;i++) if (enabled != null && enabled.optBoolean(KEYS[i], false)) reminders.add(new Reminder(KEYS[i], TITLES[i], TIMES[i], "تذكيرك اليومي بوردك من الأذكار"));
            if (enabled != null && enabled.optBoolean("notifyPrayerSoon", false) && prayers != null) {
                String[][] prayerNames={{"Fajr","الفجر"},{"Dhuhr","الظهر"},{"Asr","العصر"},{"Maghrib","المغرب"},{"Isha","العشاء"}};
                for (String[] p:prayerNames) { String time=prayers.optString(p[0], ""); if (time.matches("\\d{1,2}:\\d{2}(:\\d{2})?")) reminders.add(new Reminder("prayer_"+p[0], "اقترب موعد صلاة "+p[1], minusMinutes(time, 10), "باقي نحو عشر دقائق على الصلاة")); }
            }
            AlarmManager am=(AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
            for (String key:KEYS) cancel(c, am, key);
            String[] prayerIds={"prayer_Fajr","prayer_Dhuhr","prayer_Asr","prayer_Maghrib","prayer_Isha"}; for(String id:prayerIds) cancel(c,am,id);
            for(Reminder r:reminders) scheduleOne(c,am,r,sound);
        } catch(Exception ignored) { }
    }
    static void scheduleOne(Context c, AlarmManager am, Reminder r, boolean sound) {
        try {
            String[] parts=r.time.split(":");
            Calendar target=Calendar.getInstance();
            target.set(Calendar.HOUR_OF_DAY,Integer.parseInt(parts[0]));
            target.set(Calendar.MINUTE,Integer.parseInt(parts[1]));
            target.set(Calendar.SECOND,0); target.set(Calendar.MILLISECOND,0);
            if(target.getTimeInMillis()<=System.currentTimeMillis()) target.add(Calendar.DAY_OF_YEAR,1);
            Intent intent=new Intent(c, ReminderReceiver.class).putExtra("id",r.id).putExtra("title",r.title).putExtra("body",r.body).putExtra("sound",sound).putExtra("time",r.time);
            int request=r.id.hashCode() & 0x7fffffff;
            PendingIntent pi=PendingIntent.getBroadcast(c,request,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,target.getTimeInMillis(),pi);
        } catch(Exception ignored) { }
    }
    static void cancel(Context c, AlarmManager am, String id) {
        Intent i=new Intent(c,ReminderReceiver.class); int req=id.hashCode()&0x7fffffff;
        PendingIntent pi=PendingIntent.getBroadcast(c,req,i,PendingIntent.FLAG_NO_CREATE|PendingIntent.FLAG_IMMUTABLE);
        if(pi!=null) am.cancel(pi);
    }
    static String minusMinutes(String time,int n){try{String[] p=time.split(":");int total=Integer.parseInt(p[0])*60+Integer.parseInt(p[1])-n;total=(total+1440)%1440;return String.format(java.util.Locale.US,"%02d:%02d",total/60,total%60);}catch(Exception e){return time;}}
    static class Reminder {String id,title,time,body; Reminder(String i,String t,String tm,String b){id=i;title=t;time=tm;body=b;}}
    static void createChannels(Context c) {
        if(Build.VERSION.SDK_INT<26)return;
        NotificationManager nm=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
        nm.createNotificationChannel(new NotificationChannel("reminders_sound","تذكيرات أنياس",NotificationManager.IMPORTANCE_DEFAULT));
        NotificationChannel silent=new NotificationChannel("reminders_silent","تذكيرات أنياس (صامتة)",NotificationManager.IMPORTANCE_DEFAULT); silent.setSound(null,null); silent.enableVibration(false); nm.createNotificationChannel(silent);
    }
}
