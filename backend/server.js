const express = require("express");
const cors = require("cors");
const path = require("path");
const { initializeDatabase } = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
initializeDatabase();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, "../frontend")));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use("/login", require("./routes/users"));
app.use("/users", require("./routes/users"));
app.use("/reservations", require("./routes/reservations"));
app.use("/tables", require("./routes/tables"));
app.use("/payments", require("./routes/payments"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Catch-all: serve login.html for unknown routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/login.html"));
});

// Error handler
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.stack);
  res.status(500).json({ error: "Internal server error." });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════
║   🍽️ Restaurant Reservation System           
║   Server running on http://localhost:${PORT}
╚══════════════════════════════════════════════

Default credentials:
  Admin:    Krishnna / Krishnna123
  Staff:    staff1 / staff123
  Customer: Shaurya / Shaurya123
`);
});

module.exports = app;
