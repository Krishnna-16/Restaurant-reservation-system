const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "rrs.db");
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function initializeDatabase() {
  console.log("🗄️  Initializing database...");

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('customer','staff','admin')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tables table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tables (
      tableId INTEGER PRIMARY KEY AUTOINCREMENT,
      capacity INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'Vacant' CHECK(status IN ('Vacant','Reserved','Occupied')),
      label TEXT
    )
  `);

  // Reservations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      customerName TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      guests INTEGER NOT NULL,
      tableId INTEGER,
      status TEXT NOT NULL DEFAULT 'Reserved' CHECK(status IN ('Reserved','Checked-In','Completed','Cancelled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(tableId) REFERENCES tables(tableId)
    )
  `);

  // Payments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reservationId INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','Paid')),
      paid_at DATETIME,
      FOREIGN KEY(reservationId) REFERENCES reservations(id)
    )
  `);

  seedData();
  console.log("✅ Database initialized.");
}

function seedData() {
  // Seed users if none exist
  const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
  if (userCount === 0) {
    const insertUser = db.prepare(
      "INSERT INTO users (username, password, role) VALUES (?, ?, ?)"
    );
    insertUser.run("Krishnna", "Krishnna123", "admin");
    insertUser.run("staff1", "staff123", "staff");
    insertUser.run("staff2", "staff123", "staff");
    insertUser.run("Simran", "Simran123", "customer");
    insertUser.run("Divya", "Divya123", "customer");
    insertUser.run("Shaurya", "Shaurya123", "customer");
    console.log("👥 Seeded default users.");
  }

  // Seed tables if none exist
  const tableCount = db.prepare("SELECT COUNT(*) as c FROM tables").get().c;
  if (tableCount === 0) {
    const insertTable = db.prepare(
      "INSERT INTO tables (capacity, status, label) VALUES (?, ?, ?)"
    );
    insertTable.run(2, "Vacant", "Table A1");
    insertTable.run(2, "Vacant", "Table A2");
    insertTable.run(4, "Vacant", "Table B1");
    insertTable.run(4, "Vacant", "Table B2");
    insertTable.run(4, "Vacant", "Table B3");
    insertTable.run(6, "Vacant", "Table C1");
    insertTable.run(6, "Vacant", "Table C2");
    insertTable.run(8, "Vacant", "Table D1");
    console.log("🪑 Seeded default tables.");
  }

  // Seed sample reservations if none exist
  const resCount = db.prepare("SELECT COUNT(*) as c FROM reservations").get().c;
  if (resCount === 0) {
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    const insertRes = db.prepare(
      "INSERT INTO reservations (userId, customerName, date, time, guests, tableId, status) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    insertRes.run(4, "Divya", today, "18:00", 2, 1, "Checked-In");
    insertRes.run(5, "Simran", today, "19:00", 4, 3, "Reserved");
    insertRes.run(6, "Shaurya", tomorrow, "20:00", 6, 6, "Reserved");
    console.log("📋 Seeded sample reservations.");
  }
}

module.exports = { db, initializeDatabase };
