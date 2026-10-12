/* =========================================================
   Js Парнель управление - admin (22012010)
   Автор: Гайбуллоев М.М.
   ========================================================= */

const API = "/api";

const $ = (selector) => document.querySelector(selector);

const state = {
  bookings: [],
  orders: [],
  reviews: [],
  contacts: [],
  busy: false,
  authorized: false,
  toastTimer: null,
};

const statusLabels = {
  new: "Новый",
  confirmed: "Подтверждён",
  completed: "Завершён",
  cancelled: "Отменён",
  preparing: "Готовится",
  ready: "Готов",
  pending: "На проверке",
  approved: "Одобрен",
  rejected: "Отклонён",
  read: "Прочитано",
  replied: "Отвечено",
  closed: "Закрыто",
};

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getToken() {
  return $("#token").value.trim();
}

function showMessage(text, type = "") {
  const msg = $("#msg");
  msg.textContent = text;
  msg.className = "message" + (type ? " " + type : "");
}

function toast(text, type = "") {
  const element = $("#toast");
  element.textContent = text;
  element.className = "toast" + (type ? " " + type : "");

  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => {
    element.className = "toast hidden";
  }, 3500);
}

async function api(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    Authorization: "Bearer " + getToken(),
  };

  const response = await fetch(API + url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Ошибка сервера: " + response.status);
  }

  return data;
}

function statusHTML(status) {
  const safeStatus = String(status || "new").toLowerCase();
  const label = statusLabels[safeStatus] || safeStatus || "Не указан";

  return (
    '<span class="status status-' +
    escapeHTML(safeStatus) +
    '">' +
    escapeHTML(label) +
    "</span>"
  );
}

function infoCell(label, value, full = false) {
  return (
    '<div class="info-cell' +
    (full ? " full" : "") +
    '">' +
    "<strong>" +
    escapeHTML(label) +
    "</strong>" +
    "<span>" +
    escapeHTML(value || "—") +
    "</span>" +
    "</div>"
  );
}

function formatDate(value) {
  if (!value) return "Дата не указана";

  const text = String(value);
  const date = new Date(text.includes("T") ? text : text.replace(" ", "T"));

  if (Number.isNaN(date.getTime())) return text;

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle:
      text.includes("T") || /\d{2}:\d{2}/.test(text) ? "short" : undefined,
  }).format(date);
}

function itemHeader(item, title) {
  return (
    '<div class="item-top">' +
    "<div>" +
    '<div class="item-title"><span class="item-id">#' +
    escapeHTML(item.id) +
    "</span>" +
    escapeHTML(title || "Без имени") +
    "</div>" +
    '<div class="item-date">Создано: ' +
    escapeHTML(formatDate(item.created_at)) +
    "</div>" +
    "</div>" +
    statusHTML(item.status) +
    "</div>"
  );
}

function actionButton(label, status, handler, style = "") {
  return (
    '<button type="button" class="btn btn-small ' +
    style +
    '" data-action="' +
    handler +
    '" data-id="' +
    Number(status.id) +
    '" data-status="' +
    escapeHTML(status.value) +
    '">' +
    label +
    "</button>"
  );
}

function actionsHTML(item, kind) {
  const id = Number(item.id);
  const current = item.status || "new";
  const buttons = [];

  function add(label, status, style = "") {
    if (current !== status) {
      buttons.push(
        '<button type="button" class="btn btn-small ' +
          style +
          '" data-action="' +
          kind +
          '" data-id="' +
          id +
          '" data-status="' +
          status +
          '">' +
          label +
          "</button>",
      );
    }
  }

  if (kind === "booking") {
    add("✓ Подтвердить", "confirmed", "btn-success");
    add("✓ Завершить", "completed");
    add("✕ Отменить", "cancelled", "btn-danger");
  }

  if (kind === "order") {
    add("✓ Принять", "confirmed", "btn-success");
    add("👨‍🍳 Готовится", "preparing");
    add("📦 Готов", "ready");
    add("✓ Завершить", "completed");
    add("✕ Отменить", "cancelled", "btn-danger");
  }

  if (kind === "review") {
    add("✓ Одобрить", "approved", "btn-success");
    add("✕ Отклонить", "rejected", "btn-danger");
  }

  if (kind === "contact") {
    add("👀 Прочитано", "read");
    add("💬 Отвечено", "replied", "btn-success");
    add("✓ Закрыть", "closed");
  }

  if (!buttons.length) {
    return '<div class="actions"><span class="item-date">Доступные действия отсутствуют для текущего статуса.</span></div>';
  }

  return '<div class="actions">' + buttons.join("") + "</div>";
}

function renderEmpty(message, icon = "☕") {
  return (
    '<div class="empty"><div class="empty-icon">' +
    icon +
    "</div><strong>Пока здесь пусто</strong>" +
    escapeHTML(message) +
    "</div>"
  );
}

function filterItems(items, searchId, filterId) {
  const search = $("#" + searchId)
    .value.trim()
    .toLowerCase();
  const status = $("#" + filterId).value;

  return items.filter((item) => {
    const text = [
      item.id,
      item.name,
      item.phone,
      item.text,
      item.message,
      item.comment,
      item.items,
      item.date,
      item.status,
    ]
      .map((value) => String(value ?? ""))
      .join(" ")
      .toLowerCase();

    return (
      (!search || text.includes(search)) && (!status || item.status === status)
    );
  });
}

function renderBookings() {
  const items = filterItems(state.bookings, "searchBookings", "filterBookings");

  $("#bookingsList").innerHTML = items.length
    ? items
        .map(
          (item) =>
            '<article class="item">' +
            itemHeader(item, item.name) +
            '<div class="info">' +
            infoCell("Телефон", item.phone) +
            infoCell(
              "Дата и время",
              [item.date, item.time].filter(Boolean).join(" · "),
            ) +
            infoCell("Количество гостей", item.guests) +
            infoCell("Комментарий", item.comment || "Без комментария", true) +
            "</div>" +
            actionsHTML(item, "booking") +
            "</article>",
        )
        .join("")
    : renderEmpty(
        state.bookings.length
          ? "По этому запросу ничего не найдено."
          : "Новые бронирования появятся здесь.",
        "📅",
      );
}

function readableOrderItems(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;

        const name = item.name || item.title || "Товар";
        const qty = item.quantity || item.qty || 1;
        return name + " × " + qty;
      })
      .join(", ");
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return readableOrderItems(parsed);
    } catch (_) {
      // В старых заказах items может храниться обычным текстом.
    }

    return value || "Состав не указан";
  }

  return value ? String(value) : "Состав не указан";
}

function renderOrders() {
  const items = filterItems(state.orders, "searchOrders", "filterOrders");

  $("#ordersList").innerHTML = items.length
    ? items
        .map(
          (item) =>
            '<article class="item">' +
            itemHeader(item, item.name) +
            '<div class="info">' +
            infoCell("Телефон", item.phone) +
            infoCell(
              "Сумма заказа",
              item.total != null ? item.total + " сомони" : "Не указана",
            ) +
            infoCell("Состав заказа", readableOrderItems(item.items), true) +
            "</div>" +
            actionsHTML(item, "order") +
            "</article>",
        )
        .join("")
    : renderEmpty(
        state.orders.length
          ? "По этому запросу ничего не найдено."
          : "Новые заказы появятся здесь.",
        "🛍",
      );
}

function renderReviews() {
  const items = filterItems(state.reviews, "searchReviews", "filterReviews");

  $("#reviewsList").innerHTML = items.length
    ? items
        .map(
          (item) =>
            '<article class="item">' +
            itemHeader(item, item.name) +
            '<div class="info">' +
            infoCell(
              "Оценка",
              item.rating != null ? "★ " + item.rating + " / 5" : "Не указана",
            ) +
            infoCell("Отзыв", item.text || "Без текста", true) +
            "</div>" +
            actionsHTML(item, "review") +
            "</article>",
        )
        .join("")
    : renderEmpty(
        state.reviews.length
          ? "По этому запросу ничего не найдено."
          : "Отзывы клиентов появятся здесь.",
        "⭐",
      );
}

function renderContacts() {
  const items = filterItems(state.contacts, "searchContacts", "filterContacts");

  $("#contactsList").innerHTML = items.length
    ? items
        .map(
          (item) =>
            '<article class="item">' +
            itemHeader(item, item.name) +
            '<div class="info">' +
            infoCell("Телефон", item.phone || "Не указан") +
            infoCell("Сообщение", item.message || "Без текста", true) +
            "</div>" +
            actionsHTML(item, "contact") +
            "</article>",
        )
        .join("")
    : renderEmpty(
        state.contacts.length
          ? "По этому запросу ничего не найдено."
          : "Сообщения клиентов появятся здесь.",
        "✉️",
      );
}

function renderAll() {
  $("#sb").textContent = state.bookings.length;
  $("#so").textContent = state.orders.length;
  $("#sr").textContent = state.reviews.length;
  $("#sc").textContent = state.contacts.length;

  $("#navBookings").textContent = state.bookings.length;
  $("#navOrders").textContent = state.orders.length;
  $("#navReviews").textContent = state.reviews.length;
  $("#navContacts").textContent = state.contacts.length;

  renderBookings();
  renderOrders();
  renderReviews();
  renderContacts();
}

async function loadData() {
  if (state.busy) return;

  if (!getToken()) {
    showMessage("Сначала введи токен администратора.", "error");
    $("#token").focus();
    return;
  }

  state.busy = true;
  $("#refreshButton").disabled = true;
  $("#loginButton").disabled = true;
  showMessage("Подключаемся к серверу и загружаем данные...");

  try {
    const [bookings, reviews, orders, contacts] = await Promise.all([
      api("/admin/bookings"),
      api("/admin/reviews"),
      api("/admin/orders"),
      api("/admin/contacts"),
    ]);

    state.bookings = Array.isArray(bookings.items) ? bookings.items : [];
    state.reviews = Array.isArray(reviews.items) ? reviews.items : [];
    state.orders = Array.isArray(orders.items) ? orders.items : [];
    state.contacts = Array.isArray(contacts.items) ? contacts.items : [];

    state.authorized = true;

    renderAll();
    loadCakeOrders();

    showMessage("Подключение успешно. Данные обновлены.", "success");
    toast("Данные панели обновлены.", "success");
  } catch (error) {
    state.authorized = false;
    console.error(error);

    showMessage("Не удалось загрузить данные: " + error.message, "error");
    toast("Ошибка подключения. Проверь токен и сервер.", "error");

    loadCakeOrders();
  } finally {
    state.busy = false;
    $("#refreshButton").disabled = false;
    $("#loginButton").disabled = false;
  }
}

/// Надежный обработчик для плавающей кнопки обновления в админке
const refreshBtn = document.getElementById("adminRefreshBtn");
if (refreshBtn) {
  refreshBtn.addEventListener("click", () => {
    const token = getToken();
    if (!token) {
      toast("Сначала введите токен администратора!", "error");
      document.getElementById("token")?.focus();
      return;
    }

    // Принудительно разрешаем авторизацию при клике на кнопку обновления
    state.authorized = true;
    loadData();

    // Анимация вращения при клике
    refreshBtn.style.transform = "rotate(360deg)";
    setTimeout(() => {
      refreshBtn.style.transform = "none";
    }, 300);
  });
}

// Автоматическое обновление данных в админ-панели каждые 10 секунд
setInterval(() => {
  if (state.authorized && getToken()) {
    loadData();
  }
}, 30000);

async function updateStatus(kind, id, status) {
  const routes = {
    booking: "/admin/bookings/",
    order: "/admin/orders/",
    review: "/admin/reviews/",
    contact: "/admin/contacts/",
  };

  const route = routes[kind];

  if (!route) return;

  const button = document.querySelector(
    '[data-action="' +
      kind +
      '"][data-id="' +
      id +
      '"][data-status="' +
      status +
      '"]',
  );

  if (button) button.disabled = true;

  try {
    await api(route + id, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });

    const collection = {
      booking: "bookings",
      order: "orders",
      review: "reviews",
      contact: "contacts",
    }[kind];

    const item = state[collection].find(
      (entry) => Number(entry.id) === Number(id),
    );
    if (item) item.status = status;

    renderAll();
    showMessage(
      "Статус записи #" +
        id +
        " изменён: " +
        (statusLabels[status] || status) +
        ".",
      "success",
    );
    toast("Статус успешно обновлён.", "success");
  } catch (error) {
    console.error(error);
    showMessage("Не удалось изменить статус: " + error.message, "error");
    toast("Не удалось обновить статус.", "error");
    if (button) button.disabled = false;
  }
}

$("#loginForm").addEventListener("submit", (event) => {
  event.preventDefault();
  loadData();
});

$("#logoutButton").addEventListener("click", () => {
  $("#token").value = "";
  state.authorized = false;
  state.bookings = [];
  state.orders = [];
  state.reviews = [];
  state.contacts = [];

  renderAll();
  showMessage("Ты вышел из панели. Для повторного входа введи токен.");
  $("#bookingsList").innerHTML = renderEmpty(
    "Войди в систему, чтобы загрузить бронирования.",
    "📅",
  );
  $("#ordersList").innerHTML = renderEmpty(
    "Войди в систему, чтобы загрузить заказы.",
    "🛍",
  );
  $("#reviewsList").innerHTML = renderEmpty(
    "Войди в систему, чтобы загрузить отзывы.",
    "⭐",
  );
  $("#contactsList").innerHTML = renderEmpty(
    "Войди в систему, чтобы загрузить сообщения.",
    "✉️",
  );
  $("#token").focus();
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;

  const id = Number(button.dataset.id);
  const status = button.dataset.status;
  const kind = button.dataset.action;

  if (!Number.isInteger(id) || id < 1 || !status) return;

  updateStatus(kind, id, status);
});

[
  ["searchBookings", renderBookings],
  ["filterBookings", renderBookings],
  ["searchOrders", renderOrders],
  ["filterOrders", renderOrders],
  ["searchReviews", renderReviews],
  ["filterReviews", renderReviews],
  ["searchContacts", renderContacts],
  ["filterContacts", renderContacts],
].forEach(([id, renderFunction]) => {
  $("#" + id).addEventListener("input", renderFunction);
  $("#" + id).addEventListener("change", renderFunction);
});

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach((item) => {
      item.classList.remove("active");
    });
    link.classList.add("active");
  });
});

$("#today").textContent = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
}).format(new Date());

// Токен не записывается в localStorage или sessionStorage.
// При обновлении страницы его потребуется ввести снова.

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

async function loadCakeOrders() {
  const tableBody = document.getElementById("cakeOrdersTableBody");
  const badge = document.getElementById("cakeOrdersBadge");

  if (!tableBody) return;

  if (!state.authorized || !getToken()) {
    if (badge) badge.textContent = "0";
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; color:#888; padding:20px;">
          Войди в систему, чтобы просмотреть заказы тортов.
        </td>
      </tr>
    `;
    return;
  }

  try {
    const data = await api("/admin/cake-orders");
    const cakeOrders = Array.isArray(data.items) ? data.items : [];

    if (badge) {
      badge.textContent = String(cakeOrders.length);
    }

    if (cakeOrders.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; color:#888; padding:20px;">
            Заказов на торты пока нет.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = cakeOrders
      .map((order) => {
        const phone = String(order.phone || "");

        return `
        <tr style="border-bottom:1px solid #f0ece1;">
          <td style="padding:10px;">
            <strong>${escapeHTML(order.name || "Гость")}</strong>
          </td>
          <td style="padding:10px;">
            ${phone ? `<a href="tel:${escapeHTML(phone)}">${escapeHTML(phone)}</a>` : "—"}
          </td>
          <td style="padding:10px;">
            ${escapeHTML(order.event_type || "Праздник")}
          </td>
          <td style="padding:10px;">
            ${escapeHTML(order.flavor || "—")} / ${escapeHTML(order.weight || "—")}
          </td>
          <td style="padding:10px;">
            ${escapeHTML(order.needed_date || "—")}
          </td>
          <td style="padding:10px;">
            ${order.delivery_type === "delivery" ? "🚗 Доставка" : "🏪 Самовывоз"}
          </td>
          <td style="padding:10px;">
            ${
              order.photo_link
                ? `<a href="${escapeHTML(order.photo_link)}" target="_blank" rel="noopener noreferrer" style="color:#b8860b;">Фото примера</a><br>`
                : ""
            }
            <small style="color:#666;">${escapeHTML(order.comment || "")}</small>
          </td>
        </tr>
      `;
      })
      .join("");
  } catch (error) {
    console.error("Ошибка загрузки заказов тортов с сервера:", error);
  }
}

// Запускаем при загрузке и по клику на "Обновить"
const refreshCakesBtn = document.getElementById("refreshCakesBtn");

if (refreshCakesBtn) {
  refreshCakesBtn.addEventListener("click", () => {
    if (!state.authorized) {
      toast("Сначала войди в панель администратора.", "error");
      return;
    }

    loadCakeOrders();
  });
}
