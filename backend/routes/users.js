const express = require("express");
const router = express.Router();
const { db } = require("../database");

// ❌ BLOCK GET /users/login (VERY IMPORTANT FIX)
router.get("/login", (req, res) => {
  return res.status(405).json({
    error: "Use POST method for login"
  });
});

// ✅ LOGIN (POST)
router.post("/login", (req, res) => {
  const { username, password, role } = req.body;

  console.log(`🔐 Login attempt: ${username} as ${role}`);

  if (!username || !password || !role) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const user = db
  .prepare(`
    SELECT id, username, role 
    FROM users 
    WHERE username = ? 
      AND password = ? 
      AND LOWER(role) = LOWER(?)
  `)
  .get(username, password, role);

  if (!user) {
    return res.status(401).json({
      error: "Invalid credentials or role mismatch."
    });
  }

  console.log(`✅ Login success: ${username} (${role})`);

  res.json({
    success: true,
    user
  });
});

// ✅ GET ALL USERS (ADMIN)
router.get("/", (req, res) => {
  const users = db
    .prepare(`
      SELECT id, username, role, created_at 
      FROM users 
      ORDER BY id
    `)
    .all();

  res.json(users);
});

module.exports = router;