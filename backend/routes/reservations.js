const express = require("express");
const router = express.Router();
const { db } = require("../database");

// GET /reservations
router.get("/", (req, res) => {
  const { userId } = req.query;
  let query = `
    SELECT r.*, t.label as tableLabel, t.capacity as tableCapacity
    FROM reservations r
    LEFT JOIN tables t ON r.tableId = t.tableId
    WHERE r.status != 'Cancelled'
    ORDER BY r.date DESC, r.time DESC
  `;
  let rows;
  if (userId) {
    query = `
      SELECT r.*, t.label as tableLabel, t.capacity as tableCapacity
      FROM reservations r
      LEFT JOIN tables t ON r.tableId = t.tableId
      WHERE r.userId = ? AND r.status != 'Cancelled'
      ORDER BY r.date DESC, r.time DESC
    `;
    rows = db.prepare(query).all(userId);
  } else {
    rows = db.prepare(query).all();
  }
  console.log(`📋 Fetched ${rows.length} reservations`);
  res.json(rows);
});

// POST /reservations
router.post("/", (req, res) => {
  const { userId, customerName, date, time, guests } = req.body;
  if (!customerName || !date || !time || !guests) {
    return res.status(400).json({ error: "All fields are required." });
  }

  // Find an available table that fits the party size
  const table = db
    .prepare(
      "SELECT * FROM tables WHERE status = 'Vacant' AND capacity >= ? ORDER BY capacity ASC LIMIT 1"
    )
    .get(guests);

  const tableId = table ? table.tableId : null;

  const result = db
    .prepare(
      "INSERT INTO reservations (userId, customerName, date, time, guests, tableId, status) VALUES (?, ?, ?, ?, ?, ?, 'Reserved')"
    )
    .run(userId || null, customerName, date, time, guests, tableId);

  // Mark table as reserved if assigned
  if (tableId) {
    db.prepare("UPDATE tables SET status = 'Reserved' WHERE tableId = ?").run(tableId);
  }

  const reservation = db
    .prepare(`
      SELECT r.*, t.label as tableLabel
      FROM reservations r
      LEFT JOIN tables t ON r.tableId = t.tableId
      WHERE r.id = ?
    `)
    .get(result.lastInsertRowid);

  console.log(`✅ Reservation created: ID ${result.lastInsertRowid} for ${customerName}`);
  res.status(201).json(reservation);
});

// DELETE /reservations/:id
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const reservation = db.prepare("SELECT * FROM reservations WHERE id = ?").get(id);

  if (!reservation) {
    return res.status(404).json({ error: "Reservation not found." });
  }

  // Free the table
  if (reservation.tableId) {
    db.prepare("UPDATE tables SET status = 'Vacant' WHERE tableId = ?").run(
      reservation.tableId
    );
  }

  db.prepare("UPDATE reservations SET status = 'Cancelled' WHERE id = ?").run(id);
  console.log(`🗑️  Reservation ${id} cancelled`);
  res.json({ success: true, message: "Reservation cancelled." });
});

// PUT /reservations/checkin/:id
router.put("/checkin/:id", (req, res) => {
  const { id } = req.params;
  const reservation = db.prepare("SELECT * FROM reservations WHERE id = ?").get(id);

  if (!reservation) {
    return res.status(404).json({ error: "Reservation not found." });
  }
  if (reservation.status !== "Reserved") {
    return res.status(400).json({ error: "Only Reserved reservations can be checked in." });
  }

  db.prepare("UPDATE reservations SET status = 'Checked-In' WHERE id = ?").run(id);

  // Mark table as Occupied
  if (reservation.tableId) {
    db.prepare("UPDATE tables SET status = 'Occupied' WHERE tableId = ?").run(
      reservation.tableId
    );
  }

  console.log(`✅ Reservation ${id} checked in`);
  res.json({ success: true, message: "Checked in successfully." });
});

// PUT /reservations/complete/:id
router.put("/complete/:id", (req, res) => {
  const { id } = req.params;
  const reservation = db.prepare("SELECT * FROM reservations WHERE id = ?").get(id);

  if (!reservation) {
    return res.status(404).json({ error: "Reservation not found." });
  }
  if (reservation.status !== "Checked-In") {
    return res.status(400).json({ error: "Only Checked-In reservations can be completed." });
  }

  db.prepare("UPDATE reservations SET status = 'Completed' WHERE id = ?").run(id);

  // Free the table
  if (reservation.tableId) {
    db.prepare("UPDATE tables SET status = 'Vacant' WHERE tableId = ?").run(
      reservation.tableId
    );
  }

  console.log(`✅ Reservation ${id} completed`);
  res.json({ success: true, message: "Reservation completed." });
});

// GET /reservations/analytics
router.get("/analytics/summary", (req, res) => {
  const total = db.prepare("SELECT COUNT(*) as c FROM reservations WHERE status != 'Cancelled'").get().c;
  const reserved = db.prepare("SELECT COUNT(*) as c FROM reservations WHERE status = 'Reserved'").get().c;
  const checkedIn = db.prepare("SELECT COUNT(*) as c FROM reservations WHERE status = 'Checked-In'").get().c;
  const completed = db.prepare("SELECT COUNT(*) as c FROM reservations WHERE status = 'Completed'").get().c;
  const cancelled = db.prepare("SELECT COUNT(*) as c FROM reservations WHERE status = 'Cancelled'").get().c;

  // Reservations per day (last 7 days)
  const perDay = db.prepare(`
    SELECT date, COUNT(*) as count
    FROM reservations
    WHERE date >= date('now', '-7 days') AND status != 'Cancelled'
    GROUP BY date
    ORDER BY date ASC
  `).all();

  res.json({ total, reserved, checkedIn, completed, cancelled, perDay });
});

module.exports = router;
