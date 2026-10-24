// إدارة مفضلة الأذكار على الجهاز فقط.
(() => {
  const STORAGE_KEY = "anyas_azkar_favorites_v1";

  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(value) ? value.filter(item => Number.isInteger(Number(item.topicNumber)) && Number.isInteger(Number(item.itemIndex))) : [];
    } catch (error) {
      return [];
    }
  }

  function write(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.warn("تعذر حفظ المفضلة على هذا الجهاز:", error);
    }
  }

  function has(topicNumber, itemIndex) {
    return read().some(item => Number(item.topicNumber) === Number(topicNumber) && Number(item.itemIndex) === Number(itemIndex));
  }

  function paintButton(button, active) {
    button.textContent = active ? "★" : "☆";
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("aria-label", active ? "إزالة من المفضلة" : "أضف إلى المفضلة");
    button.title = active ? "إزالة من المفضلة" : "أضف إلى المفضلة";
  }

  function bindButton(button, topicNumber, itemIndex) {
    if (!button || button.dataset.favoriteBound === "true") return;
    button.dataset.favoriteBound = "true";
    paintButton(button, has(topicNumber, itemIndex));
    button.addEventListener("click", () => {
      const existing = read();
      const active = existing.some(item => Number(item.topicNumber) === Number(topicNumber) && Number(item.itemIndex) === Number(itemIndex));
      const next = active
        ? existing.filter(item => !(Number(item.topicNumber) === Number(topicNumber) && Number(item.itemIndex) === Number(itemIndex)))
        : [...existing, { topicNumber: Number(topicNumber), itemIndex: Number(itemIndex) }];
      write(next);
      paintButton(button, !active);
      render();
    });
  }

  function render() {
    const container = document.getElementById("azkarFavorites");
    const countElement = document.getElementById("favoritesCount");
    if (!container) return;

    const topics = window.azkarTopics || [];
    const favorites = read().filter(favorite => {
      const topic = topics.find(item => Number(item.number) === Number(favorite.topicNumber));
      return topic && Array.isArray(topic.items) && topic.items[Number(favorite.itemIndex)]?.text;
    });
    container.replaceChildren();
    if (countElement) countElement.textContent = String(favorites.length);

    if (!favorites.length) {
      const empty = document.createElement("p");
      empty.className = "azkar-favorites-empty";
      empty.textContent = "اضغط ☆ بجوار أي ذكر لتجده هنا.";
      container.appendChild(empty);
      return;
    }

    favorites.forEach(favorite => {
      const topic = topics.find(item => Number(item.number) === Number(favorite.topicNumber));
      const item = topic.items[Number(favorite.itemIndex)];
      const card = document.createElement("article");
      card.className = "azkar-favorite-card";

      const openButton = document.createElement("button");
      openButton.type = "button";
      openButton.className = "azkar-favorite-open";
      const title = document.createElement("span");
      title.className = "azkar-favorite-title";
      title.textContent = topic.title || "ذكر مفضل";
      const text = document.createElement("span");
      text.className = "azkar-favorite-text";
      const content = String(item.text).replace(/\s+/g, " ").trim();
      text.textContent = content.length > 180 ? `${content.slice(0, 180)}…` : content;
      openButton.append(title, text);
      openButton.addEventListener("click", () => openAzkarTopic(topic.number, Number(favorite.itemIndex)));

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "azkar-favorite-remove";
      removeButton.textContent = "★";
      removeButton.setAttribute("aria-label", "إزالة الذكر من المفضلة");
      removeButton.addEventListener("click", () => {
        write(read().filter(entry => !(Number(entry.topicNumber) === Number(favorite.topicNumber) && Number(entry.itemIndex) === Number(favorite.itemIndex))));
        render();
        if (Number(window.currentAzkarTopic) === Number(favorite.topicNumber) && typeof renderAzkarTopic === "function") {
          renderAzkarTopic(favorite.topicNumber);
        }
      });

      card.append(openButton, removeButton);
      container.appendChild(card);
    });
  }

  window.azkarFavorites = { has, bindButton, render };
})();
