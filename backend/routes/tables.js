const express = require("express");
const router = express.Router();
const { db } = require("../database");

// GET /tables
router.get("/", (req, res) => {
  const tables = db.prepare("SELECT * FROM tables ORDER BY tableId").all();
  console.log(`🪑 Fetched ${tables.length} tables`);
  res.json(tables);
});

// POST /tables
router.post("/", (req, res) => {
  const { capacity, label } = req.body;
  if (!capacity) {
    return res.status(400).json({ error: "Capacity is required." });
  }

  const tableLabel = label || `Table ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 9) + 1}`;

  const result = db
    .prepare("INSERT INTO tables (capacity, status, label) VALUES (?, 'Vacant', ?)")
    .run(capacity, tableLabel);

  const table = db.prepare("SELECT * FROM tables WHERE tableId = ?").get(result.lastInsertRowid);
  console.log(`✅ Table added: ${tableLabel} (cap: ${capacity})`);
  res.status(201).json(table);
});

// PUT /tables/:id
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { capacity, label, status } = req.body;

  const table = db.prepare("SELECT * FROM tables WHERE tableId = ?").get(id);
  if (!table) return res.status(404).json({ error: "Table not found." });

  const newCapacity = capacity || table.capacity;
  const newLabel = label || table.label;
  const newStatus = status || table.status;

  db.prepare("UPDATE tables SET capacity = ?, label = ?, status = ? WHERE tableId = ?").run(
    newCapacity, newLabel, newStatus, id
  );

  const updated = db.prepare("SELECT * FROM tables WHERE tableId = ?").get(id);
  console.log(`✅ Table ${id} updated`);
  res.json(updated);
});

// DELETE /tables/:id
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const table = db.prepare("SELECT * FROM tables WHERE tableId = ?").get(id);
  if (!table) return res.status(404).json({ error: "Table not found." });

  if (table.status !== "Vacant") {
    return res.status(400).json({ error: "Cannot delete a non-vacant table." });
  }

  db.prepare("DELETE FROM tables WHERE tableId = ?").run(id);
  console.log(`🗑️  Table ${id} deleted`);
  res.json({ success: true, message: "Table deleted." });
});

module.exports = router;
