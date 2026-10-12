/* =========================================================
   Js server
   Автор: Гайбуллоев М.М.
   ========================================================= */

const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");
const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "22012010";

const db = new Database(path.join(__dirname, "data", "shahdi_khujand.db"));

db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS menu (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    price REAL NOT NULL,
    category TEXT DEFAULT 'other',
    image TEXT DEFAULT '',
    active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    guests INTEGER NOT NULL,
    comment TEXT DEFAULT '',
    status TEXT DEFAULT 'new',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    rating INTEGER NOT NULL,
    text TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    items TEXT NOT NULL,
    total REAL NOT NULL,
    status TEXT DEFAULT 'new',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    message TEXT NOT NULL,
    status TEXT DEFAULT 'new',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cake_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    event_type TEXT DEFAULT 'Праздник',
    flavor TEXT DEFAULT '',
    weight TEXT DEFAULT '',
    needed_date TEXT DEFAULT '',
    delivery_type TEXT DEFAULT 'pickup',
    photo_link TEXT DEFAULT '',
    comment TEXT DEFAULT '',
    status TEXT DEFAULT 'new',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

function clean(value, max = 1000) {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

function admin(req, res, next) {
  const authorization = req.headers.authorization;

  if (authorization !== `Bearer ${ADMIN_TOKEN}`) {
    return res.status(401).json({
      message: "Нужна авторизация администратора",
    });
  }

  next();
}

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, "..", "frontend")));

/* =========================
   HEALTH
========================= */

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "Shahdi Khujand API",
  });
});

/* =========================
   MENU
========================= */

app.get("/api/menu", (req, res) => {
  const items = db
    .prepare(
      `
            SELECT *
            FROM menu
            WHERE active = 1
            ORDER BY id
        `,
    )
    .all();

  res.json({
    items,
  });
});

/* =========================
   BOOKINGS
========================= */

app.post("/api/bookings", (req, res) => {
  try {
    const name = clean(req.body.name, 100);
    const phone = clean(req.body.phone, 50);
    const date = clean(req.body.date, 20);
    const time = clean(req.body.time, 10);
    const comment = clean(req.body.comment, 500);
    const guests = Number(req.body.guests);

    if (!name || !phone || !date || !time) {
      return res.status(400).json({
        message: "Заполните все обязательные поля",
      });
    }

    if (!Number.isInteger(guests) || guests < 1) {
      return res.status(400).json({
        message: "Неверное количество гостей",
      });
    }

    const result = db
      .prepare(
        `
            INSERT INTO bookings
            (name, phone, date, time, guests, comment)
            VALUES (?, ?, ?, ?, ?, ?)
        `,
      )
      .run(name, phone, date, time, guests, comment);

    res.json({
      ok: true,
      message: "Бронирование успешно отправлено",
      id: result.lastInsertRowid,
    });
  } catch (error) {
    console.error("BOOKING ERROR:", error);

    res.status(500).json({
      message: "Ошибка при создании бронирования",
    });
  }
});

/* =========================
   REVIEWS
========================= */

app.get("/api/reviews", (req, res) => {
  const items = db
    .prepare(
      `
        SELECT *
        FROM reviews
        WHERE status = 'approved'
        ORDER BY id DESC
    `,
    )
    .all();

  res.json({
    items,
  });
});

app.post("/api/reviews", (req, res) => {
  try {
    const name = clean(req.body.name, 100);
    const text = clean(req.body.text, 1000);
    const rating = Number(req.body.rating);

    if (!name || !text) {
      return res.status(400).json({
        message: "Введите имя и текст отзыва",
      });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        message: "Оценка должна быть от 1 до 5",
      });
    }

    const result = db
      .prepare(
        `
            INSERT INTO reviews
            (name, rating, text, status)
            VALUES (?, ?, ?, 'pending')
        `,
      )
      .run(name, rating, text);

    res.json({
      ok: true,
      message: "Спасибо! Ваш отзыв отправлен на проверку.",
      id: result.lastInsertRowid,
    });
  } catch (error) {
    console.error("REVIEW ERROR:", error);

    res.status(500).json({
      message: "Ошибка при отправке отзыва",
    });
  }
});

/* =========================
   CONTACTS
========================= */

app.post("/api/contacts", (req, res) => {
  try {
    const name = clean(req.body.name, 100);
    const phone = clean(req.body.phone, 50);
    const message = clean(req.body.message, 1000);

    if (!name || !message) {
      return res.status(400).json({
        message: "Заполните имя и сообщение",
      });
    }

    const result = db
      .prepare(
        `
            INSERT INTO contacts
            (name, phone, message)
            VALUES (?, ?, ?)
        `,
      )
      .run(name, phone, message);

    res.json({
      ok: true,
      message: "Сообщение отправлено",
      id: result.lastInsertRowid,
    });
  } catch (error) {
    console.error("CONTACT ERROR:", error);

    res.status(500).json({
      message: "Ошибка при отправке сообщения",
    });
  }
});

/* =========================
   ORDERS
========================= */

app.post("/api/orders", (req, res) => {
  try {
    const name = clean(req.body.name, 100);
    const phone = clean(req.body.phone, 50);

    let items = req.body.items;

    const total = Number(req.body.total);

    if (!name || !phone) {
      return res.status(400).json({
        message: "Введите имя и телефон",
      });
    }

    if (!Array.isArray(items)) {
      if (typeof items === "string") {
        try {
          items = JSON.parse(items);
        } catch {
          items = [
            {
              name: items,
              quantity: 1,
            },
          ];
        }
      } else {
        return res.status(400).json({
          message: "Неверный формат заказа",
        });
      }
    }

    if (items.length === 0) {
      return res.status(400).json({
        message: "Корзина пуста",
      });
    }

    if (!Number.isFinite(total) || total < 0) {
      return res.status(400).json({
        message: "Неверная сумма заказа",
      });
    }

    const itemsJSON = JSON.stringify(items);

    const result = db
      .prepare(
        `
            INSERT INTO orders
            (name, phone, items, total, status)
            VALUES (?, ?, ?, ?, 'new')
        `,
      )
      .run(name, phone, itemsJSON, total);

    res.json({
      ok: true,
      message: "Заказ успешно отправлен",
      id: result.lastInsertRowid,
    });
  } catch (error) {
    console.error("ORDER ERROR:", error);

    res.status(500).json({
      message: "Ошибка при создании заказа",
    });
  }
});

/* =========================
   CAKE ORDERS
========================= */

app.get("/api/cake-orders", (req, res) => {
  const items = db
    .prepare(
      `
        SELECT *
        FROM cake_orders
        ORDER BY id DESC
    `,
    )
    .all();

  res.json({ items });
});

app.post("/api/cake-orders", (req, res) => {
  try {
    const name = clean(req.body.name, 100);
    const phone = clean(req.body.phone, 50);
    const event_type = clean(req.body.event_type, 100);
    const flavor = clean(req.body.flavor, 100);
    const weight = clean(req.body.weight, 50);
    const needed_date = clean(req.body.needed_date, 50);
    const delivery_type = clean(req.body.delivery_type, 50);
    const photo_link = clean(req.body.photo_link, 500);
    const comment = clean(req.body.comment, 500);

    if (!name || !phone) {
      return res.status(400).json({
        message: "Введите имя и телефон",
      });
    }

    const result = db
      .prepare(
        `
            INSERT INTO cake_orders
            (name, phone, event_type, flavor, weight, needed_date, delivery_type, photo_link, comment, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')
        `,
      )
      .run(
        name,
        phone,
        event_type,
        flavor,
        weight,
        needed_date,
        delivery_type,
        photo_link,
        comment,
      );

    res.json({
      ok: true,
      message: "Заказ торта успешно отправлен",
      id: result.lastInsertRowid,
    });
  } catch (error) {
    console.error("CAKE ORDER ERROR:", error);
    res.status(500).json({
      message: "Ошибка при оформлении заказа торта",
    });
  }
});

/* ADMIN CAKE ORDERS */

app.get("/api/admin/cake-orders", admin, (req, res) => {
  const items = db
    .prepare(
      `
        SELECT *
        FROM cake_orders
        ORDER BY id DESC
    `,
    )
    .all();

  res.json({ items });
});

app.patch("/api/admin/cake-orders/:id", admin, (req, res) => {
  const id = Number(req.params.id);
  const status = clean(req.body.status, 30);

  const allowed = [
    "new",
    "confirmed",
    "preparing",
    "ready",
    "completed",
    "cancelled",
  ];

  if (!allowed.includes(status)) {
    return res.status(400).json({
      message: "Неверный статус",
    });
  }

  const result = db
    .prepare(
      `
        UPDATE cake_orders
        SET status = ?
        WHERE id = ?
    `,
    )
    .run(status, id);

  if (!result.changes) {
    return res.status(404).json({
      message: "Заказ торта не найден",
    });
  }

  res.json({ ok: true });
});

/* =========================
   ADMIN BOOKINGS
========================= */

app.get("/api/admin/bookings", admin, (req, res) => {
  const items = db
    .prepare(
      `
            SELECT *
            FROM bookings
            ORDER BY id DESC
        `,
    )
    .all();

  res.json({
    items,
  });
});

app.patch("/api/admin/bookings/:id", admin, (req, res) => {
  const id = Number(req.params.id);
  const status = clean(req.body.status, 30);

  const allowed = ["new", "confirmed", "completed", "cancelled"];

  if (!allowed.includes(status)) {
    return res.status(400).json({
      message: "Неверный статус",
    });
  }

  const result = db
    .prepare(
      `
            UPDATE bookings
            SET status = ?
            WHERE id = ?
        `,
    )
    .run(status, id);

  if (!result.changes) {
    return res.status(404).json({
      message: "Бронирование не найдено",
    });
  }

  res.json({
    ok: true,
  });
});

/* =========================
   ADMIN REVIEWS
========================= */

app.get("/api/admin/reviews", admin, (req, res) => {
  const items = db
    .prepare(
      `
            SELECT *
            FROM reviews
            ORDER BY id DESC
        `,
    )
    .all();

  res.json({
    items,
  });
});

app.patch("/api/admin/reviews/:id", admin, (req, res) => {
  const id = Number(req.params.id);
  const status = clean(req.body.status, 30);

  const allowed = ["pending", "approved", "rejected"];

  if (!allowed.includes(status)) {
    return res.status(400).json({
      message: "Неверный статус",
    });
  }

  const result = db
    .prepare(
      `
            UPDATE reviews
            SET status = ?
            WHERE id = ?
        `,
    )
    .run(status, id);

  if (!result.changes) {
    return res.status(404).json({
      message: "Отзыв не найден",
    });
  }

  res.json({
    ok: true,
  });
});

/* =========================
   ADMIN ORDERS
========================= */

app.get("/api/admin/orders", admin, (req, res) => {
  const items = db
    .prepare(
      `
            SELECT *
            FROM orders
            ORDER BY id DESC
        `,
    )
    .all();

  res.json({
    items,
  });
});

app.patch("/api/admin/orders/:id", admin, (req, res) => {
  const id = Number(req.params.id);
  const status = clean(req.body.status, 30);

  const allowed = [
    "new",
    "confirmed",
    "preparing",
    "ready",
    "completed",
    "cancelled",
  ];

  if (!allowed.includes(status)) {
    return res.status(400).json({
      message: "Неверный статус",
    });
  }

  const result = db
    .prepare(
      `
            UPDATE orders
            SET status = ?
            WHERE id = ?
        `,
    )
    .run(status, id);

  if (!result.changes) {
    return res.status(404).json({
      message: "Заказ не найден",
    });
  }

  res.json({
    ok: true,
  });
});

/* =========================
   ADMIN CONTACTS
========================= */

app.get("/api/admin/contacts", admin, (req, res) => {
  const items = db
    .prepare(
      `
            SELECT *
            FROM contacts
            ORDER BY id DESC
        `,
    )
    .all();

  res.json({
    items,
  });
});

app.patch("/api/admin/contacts/:id", admin, (req, res) => {
  const id = Number(req.params.id);
  const status = clean(req.body.status, 30);

  const allowed = ["new", "read", "replied", "closed"];

  if (!allowed.includes(status)) {
    return res.status(400).json({
      message: "Неверный статус",
    });
  }

  const result = db
    .prepare(
      `
            UPDATE contacts
            SET status = ?
            WHERE id = ?
        `,
    )
    .run(status, id);

  if (!result.changes) {
    return res.status(404).json({
      message: "Сообщение не найдено",
    });
  }

  res.json({
    ok: true,
  });
});

/* =========================
   ADMIN PAGE
========================= */

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "admin.html"));
});

/* =========================
   OTHER PAGES
========================= */

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

/* =========================
   START SERVER
========================= */

app.listen(PORT, () => {
  console.log(`Shahdi Khujand server: http://localhost:${PORT}`);
});
