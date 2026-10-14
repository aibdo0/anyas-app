(() => {
  const DEFAULT_START = "22:00";
  const DEFAULT_END = "06:00";
  const storageKeys = {
    enabled: "anyas_quietHoursEnabled",
    start: "anyas_quietHoursStart",
    end: "anyas_quietHoursEnd"
  };

  const validClock = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ""));
  const readSettings = () => {
    try {
      const start = localStorage.getItem(storageKeys.start);
      const end = localStorage.getItem(storageKeys.end);
      return {
        enabled: localStorage.getItem(storageKeys.enabled) === "true",
        start: validClock(start) ? start : DEFAULT_START,
        end: validClock(end) ? end : DEFAULT_END
      };
    } catch (error) {
      return { enabled: false, start: DEFAULT_START, end: DEFAULT_END };
    }
  };

  const toMinutes = value => {
    if (!validClock(value)) return null;
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const isQuietHours = (now = new Date(), settings = readSettings()) => {
    if (!settings.enabled) return false;
    const start = toMinutes(settings.start);
    const end = toMinutes(settings.end);
    if (start === null || end === null || start === end) return false;
    const current = now.getHours() * 60 + now.getMinutes();
    return start < end ? current >= start && current < end : current >= start || current < end;
  };

  const setup = () => {
    const toggle = document.getElementById("quietHoursEnabled");
    const startInput = document.getElementById("quietHoursStart");
    const endInput = document.getElementById("quietHoursEnd");
    if (!toggle || !startInput || !endInput) return;

    const settings = readSettings();
    toggle.checked = settings.enabled;
    startInput.value = settings.start;
    endInput.value = settings.end;

    const persist = () => {
      const start = validClock(startInput.value) ? startInput.value : DEFAULT_START;
      const end = validClock(endInput.value) ? endInput.value : DEFAULT_END;
      try {
        localStorage.setItem(storageKeys.enabled, String(toggle.checked));
        localStorage.setItem(storageKeys.start, start);
        localStorage.setItem(storageKeys.end, end);
      } catch (error) { /* preferences remain available for this session */ }
      if (typeof window.syncAndroidNotificationSettings === "function") window.syncAndroidNotificationSettings();
    };

    toggle.addEventListener("change", persist);
    startInput.addEventListener("change", persist);
    endInput.addEventListener("change", persist);
  };

  window.anyasGetQuietHoursSettings = readSettings;
  window.anyasIsQuietHours = isQuietHours;
  window.setupAnyasQuietHours = setup;
})();
