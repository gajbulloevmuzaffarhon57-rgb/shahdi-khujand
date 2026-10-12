/* =========================================================
   Js главного сайта Гахди Хучанд
   Автор: Гайбуллоев М.М.
   ========================================================= */

"use strict";

const API = "/api";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/* ==========================================
   HEADER SCROLL SPY
   Активный пункт по текущему разделу страницы
   ========================================== */

(() => {
  function initScrollSpy() {
    const header = document.querySelector(".header");
    const nav = header?.querySelector(".nav");

    if (!header || !nav) return;

    const links = [...nav.querySelectorAll('a[href^="#"]')].filter((link) => {
      const id = link.getAttribute("href").slice(1);
      const section = document.getElementById(id);

      return (
        id &&
        !link.hasAttribute("data-open-order") &&
        !link.hasAttribute("data-open-booking") &&
        !link.hasAttribute("data-open-contact") &&
        section &&
        !section.classList.contains("modal")
      );
    });

    const sections = links
      .map((link) => ({
        link,
        section: document.getElementById(link.getAttribute("href").slice(1)),
      }))
      .filter((item) => item.section)
      .sort(
        (a, b) =>
          a.section.getBoundingClientRect().top -
          b.section.getBoundingClientRect().top,
      );

    if (!sections.length) return;

    function activate(link) {
      links.forEach((item) => {
        const active = item === link;
        item.classList.toggle("active", active);

        if (active) {
          item.setAttribute("aria-current", "location");
        } else {
          item.removeAttribute("aria-current");
        }
      });
    }

    function updateActiveSection() {
      const marker = header.getBoundingClientRect().height + 100;

      const pageBottom =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 3;

      if (pageBottom) {
        activate(sections[sections.length - 1].link);
        return;
      }

      let current = sections[0];

      for (const item of sections) {
        if (item.section.getBoundingClientRect().top <= marker) {
          current = item;
        } else {
          break;
        }
      }

      activate(current.link);
    }

    window.addEventListener("scroll", updateActiveSection, {
      passive: true,
    });

    window.addEventListener("resize", updateActiveSection);
    window.addEventListener("hashchange", updateActiveSection);

    links.forEach((link) => {
      link.addEventListener("click", () => activate(link));
    });

    updateActiveSection();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initScrollSpy, {
      once: true,
    });
  } else {
    initScrollSpy();
  }
})();

/* =========================================================
   УВЕДОМЛЕНИЯ
   ========================================================= */

function message(element, text, type = "success") {
  if (!element) return;
  element.textContent = text;
  element.className = `form-message ${type}`;
  element.setAttribute("role", type === "error" ? "alert" : "status");
}

/* =========================================================
   API
   ========================================================= */

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Ошибка сервера. Попробуйте ещё раз.");
  }

  return data;
}

/* =========================================================
   БЕЗОПАСНЫЙ ВЫВОД
   ========================================================= */

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>'"]/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[char],
  );
}

/* =========================================================
   МОДАЛЬНЫЕ ОКНА
   ========================================================= */

const bookingModal = $("#bookingModal");
const contactModal = $("#contactModal");
const orderModal = $("#orderModal");

const cakeModal = $("#cakeModal");

function openCake(event) {
  openModal(cakeModal, event);

  const dateInput = $('#cakeOrderForm [name="needed_date"]');

  if (dateInput) {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 86400000);

    const tomorrowString = new Date(
      tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000,
    )
      .toISOString()
      .slice(0, 10);

    dateInput.min = tomorrowString;

    if (!dateInput.value || dateInput.value < tomorrowString) {
      dateInput.value = tomorrowString;
    }
  }
}

function closeCake() {
  closeModal(cakeModal);
}

$$("[data-open-cake]").forEach((button) => {
  button.addEventListener("click", openCake);
});

$$("[data-close-cake]").forEach((button) => {
  button.addEventListener("click", closeCake);
});

function openModal(modal, event) {
  event?.preventDefault();
  if (!modal) return;

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal(modal) {
  if (!modal) return;

  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

function openBooking(event) {
  openModal(bookingModal, event);

  const dateInput = $('#bookingForm [name="date"]');

  if (dateInput) {
    const now = new Date();
    const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);

    dateInput.min = today;
    if (!dateInput.value) dateInput.value = today;
  }
}

function openContact(event) {
  openModal(contactModal, event);
}

function openOrder(event) {
  openModal(orderModal, event);
  renderCart();
}

function closeBooking() {
  closeModal(bookingModal);
}

function closeContact() {
  closeModal(contactModal);
}

function closeOrder() {
  closeModal(orderModal);
}

$$("[data-open-booking]").forEach((button) =>
  button.addEventListener("click", openBooking),
);

$$("[data-close-booking]").forEach((button) =>
  button.addEventListener("click", closeBooking),
);

$$("[data-open-contact]").forEach((button) =>
  button.addEventListener("click", openContact),
);

$$("[data-close-contact]").forEach((button) =>
  button.addEventListener("click", closeContact),
);

$$("[data-open-order]").forEach((button) =>
  button.addEventListener("click", openOrder),
);

$$("[data-close-order]").forEach((button) =>
  button.addEventListener("click", closeOrder),
);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeBooking();
    closeContact();
    closeOrder();
    closeCake();
  }
});

[bookingModal, contactModal, orderModal, cakeModal].forEach((modal) => {
  if (!modal) return;

  modal.addEventListener("click", (event) => {
    if (
      event.target === modal ||
      event.target.classList.contains("modal-backdrop")
    ) {
      closeModal(modal);
    }
  });
});

/* =========================================================
   БРОНИРОВАНИЕ
   ========================================================= */

$("#bookingForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const status = $("[data-booking-message]", form);
  const button = $('button[type="submit"]', form);

  if (!form.reportValidity()) return;

  if (button) button.disabled = true;
  message(status, "Отправляем заявку...", "info");

  try {
    const data = Object.fromEntries(new FormData(form));
    data.guests = Number(data.guests);

    await api("/bookings", {
      method: "POST",
      body: JSON.stringify(data),
    });

    form.reset();
    message(status, "Бронь принята! Мы свяжемся с вами для подтверждения.");
  } catch (error) {
    message(status, error.message, "error");
  } finally {
    if (button) button.disabled = false;
  }
});

/* =========================================================
   ОТЗЫВЫ
   ========================================================= */

const reviewForm = $("#reviewForm");

reviewForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const nameInput = $("#reviewerName", form) || $('[name="name"]', form);
  const ratingInput = $("#reviewerRating", form) || $('[name="rating"]', form);
  const textInput = $("#reviewerMessage", form) || $('[name="message"]', form);
  const status = $(".form-message", form) || $("[data-review-message]");
  const button = $('button[type="submit"]', form);

  if (!nameInput || !ratingInput || !textInput) return;
  if (!form.reportValidity()) return;

  const review = {
    id: Date.now(),
    name: nameInput.value.trim(),
    rating: Number(ratingInput.value),
    text: textInput.value.trim(),
    status: "pending",
    date: new Date().toLocaleDateString(),
  };

  if (button) button.disabled = true;

  try {
    await api("/reviews", {
      method: "POST",
      body: JSON.stringify(review),
    });

    message(status, "Спасибо! Ваш отзыв отправлен на модерацию.");
    form.reset();
  } catch (error) {
    message(status, error.message, "error");
  } finally {
    if (button) button.disabled = false;
  }
});

async function loadReviews() {
  const container = $("#reviewsGrid") || $("#liveReviews");
  if (!container) return;

  try {
    const data = await api("/reviews");
    if (!Array.isArray(data.items)) return;

    const reviews = data.items
      .filter((review) => review.status === "approved")
      .slice(0, 6);

    if (!reviews.length) return;

    container.innerHTML = reviews
      .map((review) => {
        const rating = Math.max(
          0,
          Math.min(5, Math.floor(Number(review.rating) || 0)),
        );

        return `
        <article class="review-card">
          <div class="stars" aria-label="Оценка: ${rating} из 5">
            ${"★".repeat(rating)}${"☆".repeat(5 - rating)}
          </div>
          <p>«${escapeHtml(review.text)}»</p>
          <div class="review-author">
            <strong>${escapeHtml(review.name)}</strong>
            <span>Гость кофейни</span>
          </div>
        </article>
      `;
      })
      .join("");
  } catch (error) {
    console.warn("Не удалось загрузить отзывы:", error.message);
  }
}

/* =========================================================
   ОБРАТНАЯ СВЯЗЬ
   ========================================================= */

$("#contactForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const status = $("[data-contact-message]");
  const button = $('button[type="submit"]', form);

  if (!form.reportValidity()) return;

  if (button) button.disabled = true;
  message(status, "Отправляем сообщение...", "info");

  try {
    const data = Object.fromEntries(new FormData(form));

    await api("/contacts", {
      method: "POST",
      body: JSON.stringify(data),
    });

    form.reset();
    message(status, "Сообщение отправлено! Спасибо, мы скоро ответим.");
  } catch (error) {
    message(status, error.message, "error");
  } finally {
    if (button) button.disabled = false;
  }
});

/* =========================================================
   ЗАКАЗ ТОРТА (Гарантированное сохранение)
   ========================================================= */

$("#cakeOrderForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const status = $("[data-cake-message]");
  const button = $('button[type="submit"]', form);

  if (!form.reportValidity()) return;

  if (button) button.disabled = true;
  message(status, "Отправляем заявку кондитеру...", "info");

  try {
    const formData = Object.fromEntries(new FormData(form));

    const eventTypes = {
      birthday: "День рождения",
      wedding: "Свадьба / Хафта",
      home_party: "Домашняя вечеринка",
      corporate: "Корпоратив",
      other: "Другой праздник",
    };

    const flavorNames = {
      medovik: "Медовик классический",
      chocolate: "Шоколадный трюфель",
      pistachio: "Фисташковый с ягодами",
      red_velvet: "Красный бархат",
      custom: "Индивидуальная начинка",
    };

    const orderData = {
      name: formData.name || "",
      phone: formData.phone || "",
      event_type:
        eventTypes[formData.event_type] || formData.event_type || "Праздник",
      flavor: flavorNames[formData.flavor] || formData.flavor || "—",
      weight: formData.weight || "—",
      needed_date: formData.needed_date || "—",
      delivery_type:
        formData.delivery_type === "delivery" ? "delivery" : "pickup",
      photo_link: formData.photo_link || "",
      comment: formData.comment || "",
    };

    await api("/cake-orders", {
      method: "POST",
      body: JSON.stringify(orderData),
    });

    form.reset();
    message(
      status,
      "Заявка на торт принята! Шеф-кондитер скоро свяжется с вами.",
    );
  } catch (error) {
    message(status, error.message, "error");
  } finally {
    if (button) button.disabled = false;
  }
});

/* =========================================================
   КОРЗИНА
   ========================================================= */

const cart = [];

function formatPrice(price) {
  return `${Number(price.toFixed(2))} сомони`;
}

function addToCart(name, price) {
  name = String(name || "").trim();
  price = Number(price);

  if (!name || !Number.isFinite(price) || price <= 0) {
    console.warn("У товара отсутствует корректная цена:", name, price);
    alert("У этого товара пока не указана цена.");
    return;
  }

  const existing = cart.find((item) => item.name === name);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ name, price, qty: 1 });
  }

  renderCart();
  openOrder();
}

function changeQty(index, difference) {
  const item = cart[index];
  if (!item) return;

  item.qty += difference;

  if (item.qty <= 0) {
    cart.splice(index, 1);
  }

  renderCart();
}

window.changeQty = changeQty;

function renderCart() {
  const list = $("#cartItems");
  const countElement = $("#cartCount");
  const totalElement = $("#cartTotal");

  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  if (countElement) countElement.textContent = String(count);
  if (totalElement) totalElement.textContent = formatPrice(total);

  if (!list) return;

  if (!cart.length) {
    list.innerHTML =
      '<p class="empty-state">Корзина пока пуста. Выберите что-нибудь из меню!</p>';
    return;
  }

  list.innerHTML = cart
    .map(
      (item, index) => `
    <div class="cart-item">
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <small>${formatPrice(item.price)} × ${item.qty}</small>
      </div>
      <div class="cart-controls">
        <button
          type="button"
          data-cart-index="${index}"
          data-cart-delta="-1"
          aria-label="Уменьшить количество"
        >−</button>
        <span>${item.qty}</span>
        <button
          type="button"
          data-cart-index="${index}"
          data-cart-delta="1"
          aria-label="Увеличить количество"
        >+</button>
      </div>
    </div>
  `,
    )
    .join("");
}

$("#cartItems")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-cart-index]");
  if (!button) return;

  changeQty(Number(button.dataset.cartIndex), Number(button.dataset.cartDelta));
});

/* =========================================================
   ДОБАВЛЕНИЕ ТОВАРОВ ИЗ МЕНЮ
   ========================================================= */

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add-cart], .add-btn");
  if (!button) return;

  const card = button.closest(".product-card");
  if (!card) return;

  event.preventDefault();

  const name = button.dataset.name || $("h3", card)?.textContent?.trim();

  const price = Number(
    button.dataset.price ||
      card.dataset.price ||
      $(".price", card)
        ?.textContent?.replace(/[^\d.,]/g, "")
        .replace(",", "."),
  );

  addToCart(name, price);
});

/* =========================================================
   ПОДГОТОВКА КНОПОК МЕНЮ
   ========================================================= */

function setupMenu() {
  $$(".product-card").forEach((card) => {
    const title = $("h3", card)?.textContent?.trim();

    const priceElement = $(".price", card);
    const priceText =
      card.dataset.price ||
      priceElement?.dataset.price ||
      priceElement?.textContent ||
      "";

    const price = Number(
      String(priceText)
        .replace(/[^\d.,]/g, "")
        .replace(",", "."),
    );

    const button = $("[data-add-cart]", card) || $(".add-btn", card);

    if (!button) return;

    button.type = "button";

    if (!title || !Number.isFinite(price) || price <= 0) {
      button.disabled = true;
      button.title = "Цена товара пока не указана";
      return;
    }

    button.disabled = false;
    button.dataset.addCart = "";
    button.dataset.name = title;
    button.dataset.price = String(price);
  });
}

/* =========================================================
   ОЧИСТКА КОРЗИНЫ
   ========================================================= */

function clearCart() {
  cart.splice(0, cart.length); // Очищаем массив товаров
  renderCart(); // Перерисовываем корзину
}

// Слушатель клика по кнопке очистки
document.addEventListener("click", (event) => {
  if (event.target && event.target.id === "clearCartBtn") {
    clearCart();
  }
});

/* =========================================================
   ОФОРМЛЕНИЕ ЗАКАЗА
   ========================================================= */

$("#orderForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const status = $("[data-order-message]");
  const button = $('button[type="submit"]', form);

  if (!form.reportValidity()) return;

  if (!cart.length) {
    message(status, "Сначала добавьте хотя бы одну позицию.", "error");
    return;
  }

  if (button) button.disabled = true;
  message(status, "Оформляем заказ...", "info");

  try {
    const data = Object.fromEntries(new FormData(form));

    data.items = cart.map((item) => ({
      name: item.name,
      price: item.price,
      qty: item.qty,
    }));

    data.total = Number(
      cart.reduce((sum, item) => sum + item.price * item.qty, 0).toFixed(2),
    );

    await api("/orders", {
      method: "POST",
      body: JSON.stringify(data),
    });

    cart.splice(0, cart.length);
    renderCart();
    form.reset();

    message(status, "Заказ принят! Мы свяжемся с вами для подтверждения.");
  } catch (error) {
    message(status, error.message, "error");
  } finally {
    if (button) button.disabled = false;
  }
});

/* =========================================================
   КАРТА И МАРШРУТ
   ========================================================= */

function setupMap() {
  const url =
    "https://www.google.com/maps/search/?api=1&query=Shahdi+Khujand+Tajikistan";

  $$("[data-route]").forEach((link) => {
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });
}

/* =========================================================
   МЕНЮ ИЗ BACKEND
   ========================================================= */

async function loadMenu() {
  try {
    const data = await api("/menu");

    if (Array.isArray(data.items)) {
      console.info(`Меню API доступно. Позиций: ${data.items.length}`);
    }

    return data;
  } catch (error) {
    console.warn("Не удалось загрузить меню из базы данных:", error.message);
    return null;
  }
}

/* =========================================================
   ФИЛЬТРАЦИЯ КАТЕГОРИЙ
   ========================================================= */

function setupCategoryFilters() {
  const filterButtons = $$(".menu-categories .category-btn");
  const productCards = $$("#menuGrid .product-card");

  function applyFilter(filter) {
    productCards.forEach((card) => {
      const category = card.getAttribute("data-category");
      card.style.display =
        filter === "all" || category === filter ? "flex" : "none";
    });
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      applyFilter(button.getAttribute("data-filter") || "all");
    });
  });

  const activeButton = $(".menu-categories .category-btn.active");
  applyFilter(activeButton?.getAttribute("data-filter") || "coffee");
}

// Плавный скролл и появление кнопки «Наверх»
const scrollTopBtn = document.getElementById("scrollTopBtn");

window.addEventListener("scroll", () => {
  if (window.scrollY > 300) {
    scrollTopBtn.style.opacity = "1";
    scrollTopBtn.style.pointerEvents = "auto";
  } else {
    scrollTopBtn.style.opacity = "0";
    scrollTopBtn.style.pointerEvents = "none";
  }
});

scrollTopBtn.addEventListener("click", (e) => {
  e.preventDefault();
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
});

/* =========================================================
   ЗАПУСК
   ========================================================= */

function init() {
  setupMenu();
  setupMap();
  setupCategoryFilters();
  renderCart();
  loadReviews();
  loadMenu();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
