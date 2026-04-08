const express = require("express");
const router = express.Router();
const { db } = require("../database");

// POST /payments/:reservationId
router.post("/:reservationId", (req, res) => {
  const { reservationId } = req.params;
  const reservation = db.prepare("SELECT * FROM reservations WHERE id = ?").get(reservationId);

  if (!reservation) {
    return res.status(404).json({ error: "Reservation not found." });
  }
  if (reservation.status !== "Checked-In") {
    return res.status(400).json({ error: "Can only pay for Checked-In reservations." });
  }

  // Simulate bill: base $25 per guest + table fee
  const amount = parseFloat((reservation.guests * 25 + 10).toFixed(2));

  // Check if payment already exists
  const existing = db.prepare("SELECT * FROM payments WHERE reservationId = ?").get(reservationId);
  if (existing) {
    return res.status(400).json({ error: "Payment already processed." });
  }

  db.prepare(
    "INSERT INTO payments (reservationId, amount, status, paid_at) VALUES (?, ?, 'Paid', CURRENT_TIMESTAMP)"
  ).run(reservationId, amount);

  // Mark reservation as completed
  db.prepare("UPDATE reservations SET status = 'Completed' WHERE id = ?").run(reservationId);

  // Free the table
  if (reservation.tableId) {
    db.prepare("UPDATE tables SET status = 'Vacant' WHERE tableId = ?").run(reservation.tableId);
  }

  console.log(`💰 Payment of $${amount} processed for reservation ${reservationId}`);
  res.json({ success: true, amount, message: `Payment of $${amount} processed successfully.` });
});

// GET /payments
router.get("/", (req, res) => {
  const payments = db.prepare(`
    SELECT p.*, r.customerName, r.date, r.time, r.guests
    FROM payments p
    JOIN reservations r ON p.reservationId = r.id
    ORDER BY p.paid_at DESC
  `).all();
  res.json(payments);
});

module.exports = router;
