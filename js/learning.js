// عرض الدروس القصيرة وحفظ متابعة التعلّم على الجهاز.
(() => {
  const STORAGE_KEY = "anyas_learning_completed_v1";

  function readCompleted() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return new Set(Array.isArray(value) ? value : []);
    } catch (error) {
      return new Set();
    }
  }

  let completed = readCompleted();

  function saveCompleted() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...completed]));
    } catch (error) {
      console.warn("تعذر حفظ تقدم الدروس:", error);
    }
  }

  function updateProgress() {
    const badge = document.getElementById("learningProgressBadge");
    const lessons = Array.isArray(window.learningLessons) ? window.learningLessons : [];
    const done = lessons.filter(lesson => completed.has(lesson.id)).length;
    if (badge) badge.textContent = `${done} / ${lessons.length}`;

    document.querySelectorAll("[data-learning-status]").forEach(status => {
      status.textContent = completed.has(status.dataset.learningStatus) ? "مكتمل" : "درس قصير";
    });

    document.querySelectorAll("[data-learning-complete]").forEach(button => {
      const isComplete = completed.has(button.dataset.learningComplete);
      button.setAttribute("aria-pressed", String(isComplete));
      button.textContent = isComplete ? "أتممت الدرس ✓" : "تحديد الدرس كمكتمل";
    });
  }

  function renderLesson(lesson, index) {
    const article = document.createElement("article");
    article.className = "learning-module";

    const toggle = document.createElement("button");
    toggle.className = "learning-module-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", `learning-body-${lesson.id}`);

    const number = document.createElement("span");
    number.className = "learning-module-number";
    number.textContent = String(index + 1).padStart(2, "0");

    const copy = document.createElement("span");
    copy.className = "learning-module-copy";
    const title = document.createElement("strong");
    title.textContent = lesson.title;
    const summary = document.createElement("small");
    summary.textContent = lesson.summary;
    copy.append(title, summary);

    const status = document.createElement("span");
    status.className = "learning-module-status";
    status.dataset.learningStatus = lesson.id;

    const chevron = document.createElement("span");
    chevron.className = "learning-module-chevron";
    chevron.setAttribute("aria-hidden", "true");
    chevron.textContent = "›";
    toggle.append(number, copy, status, chevron);

    const body = document.createElement("div");
    body.className = "learning-module-body";
    body.id = `learning-body-${lesson.id}`;
    body.hidden = true;

    const list = document.createElement("ol");
    list.className = "learning-points";
    (lesson.steps || []).forEach(step => {
      const item = document.createElement("li");
      item.textContent = step;
      list.appendChild(item);
    });
    body.appendChild(list);

    if (lesson.notes && lesson.notes.length) {
      const note = document.createElement("p");
      note.className = "learning-module-note";
      note.textContent = lesson.notes.join(" ");
      body.appendChild(note);
    }

    if (lesson.references && lesson.references.length) {
      const references = document.createElement("ul");
      references.className = "learning-reference-list";
      lesson.references.forEach(reference => {
        const item = document.createElement("li");
        item.textContent = typeof reference === "string" ? reference : reference.label;
        references.appendChild(item);
      });
      body.appendChild(references);
    }

    const complete = document.createElement("button");
    complete.type = "button";
    complete.className = "learning-complete-button";
    complete.dataset.learningComplete = lesson.id;
    complete.setAttribute("aria-pressed", "false");
    complete.addEventListener("click", () => {
      if (completed.has(lesson.id)) completed.delete(lesson.id);
      else completed.add(lesson.id);
      saveCompleted();
      updateProgress();
    });
    body.appendChild(complete);

    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      document.querySelectorAll(".learning-module-toggle").forEach(other => {
        other.setAttribute("aria-expanded", "false");
        const otherBody = document.getElementById(other.getAttribute("aria-controls"));
        if (otherBody) otherBody.hidden = true;
      });
      toggle.setAttribute("aria-expanded", String(open));
      body.hidden = !open;
    });

    article.append(toggle, body);
    return article;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("learningList");
    const lessons = Array.isArray(window.learningLessons) ? window.learningLessons : [];
    if (!container || !lessons.length) return;
    container.replaceChildren(...lessons.map(renderLesson));
    updateProgress();
  });
})();
