(() => {
  "use strict";
  document.querySelectorAll(".settings-group-toggle").forEach(toggle => {
    const key = `anyas_settings_group_${toggle.dataset.settingsGroup}`;
    const siblings = [];
    let next = toggle.nextElementSibling;
    while (next && !next.classList.contains("settings-subtitle")) {
      siblings.push(next);
      next = next.nextElementSibling;
    }
    const apply = expanded => {
      toggle.setAttribute("aria-expanded", String(expanded));
      toggle.classList.toggle("is-collapsed", !expanded);
      siblings.forEach(element => { element.hidden = !expanded; });
    };
    let expanded = true;
    try { expanded = localStorage.getItem(key) !== "false"; } catch (error) { }
    apply(expanded);
    toggle.addEventListener("click", () => {
      expanded = toggle.getAttribute("aria-expanded") !== "true";
      apply(expanded);
      try { localStorage.setItem(key, String(expanded)); } catch (error) { }
    });
  });
})();
