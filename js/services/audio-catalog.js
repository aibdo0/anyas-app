(() => {
  "use strict";

  const entries = {
    "adhan.default": "audio/adhan/adhan.mp3",
    "adhan.fajr": "audio/adhan/fajr.mp3",
    "adhan.ahmedAlNafis": "audio/adhan/ahmed-al-nafis-normal.mp3",
    "adhan.ahmedAlNafisOld": "audio/adhan/ahmed-al-nafis-old-normal.mp3",
    "quran.ayatKursi.mishary": "audio/quran/ayat-al-kursi-mishary-alafasy.mp3",
    "quran.ayatKursi.abdulBasit": "audio/quran/ayat-al-kursi-abdul-basit-abdus-samad.mp3",
    "quran.ayatKursi.minshawi": "audio/quran/ayat-al-kursi-muhammad-siddiq-al-minshawi.mp3",
    "quran.ayatKursi.hussary": "audio/quran/ayat-al-kursi-mahmoud-khalil-al-hussary.mp3",
    "quran.ayatKursi.ahmedAlNafis": "audio/quran/ayat-al-kursi-ahmed-al-nafis.mp3",
    "adhkar.morning.mishary": "audio/adhkar/adhkar-morning-mishary-alafasy.mp3",
    "adhkar.morning.ahmedAlNafis": "audio/adhkar/adhkar-morning-ahmed-al-nafis.mp3",
    "adhkar.evening.mishary": "audio/adhkar/adhkar-evening-mishary-alafasy.mp3",
    "adhkar.evening.ahmedAlNafis": "audio/adhkar/adhkar-evening-ahmed-al-nafis.mp3",
    "adhkar.wakeup.mishary": "audio/adhkar/adhkar-wakeup-mishary-alafasy.mp3",
    "adhkar.sleep.mishary": "audio/adhkar/adhkar-sleep-mishary-alafasy.mp3"
  };

  const path = id => entries[id] || "";
  window.AnyasAudioCatalog = Object.freeze({ entries: Object.freeze(entries), path });
})();
