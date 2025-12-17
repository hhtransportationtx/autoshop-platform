const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// --- DB ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// --- Helpers ---
function signToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET missing");
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    secret,
    { expiresIn: "7d" }
  );
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function roleRequired(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (req.user.role !== role) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

// --- Basic routes ---
app.get("/", (req, res) => {
  res.status(200).send("API Core is running ✅");
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/db/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "db ok" });
  } catch (err) {
    res.status(500).json({ status: "db error", error: err.message });
  }
});

app.get("/ai/health", async (req, res) => {
  try {
    const aiUrl = process.env.AI_SERVICE_URL;
    const response = await fetch(`${aiUrl}/health`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "AI service unreachable",
      error: err.message,
    });
  }
});

// --- AUTH ---
app.post("/auth/register", authRequired, roleRequired("owner"), async (req, res) => {
  try {
    const { email, password, role = "manager" } = req.body;
    if (!email || !password) return res.status(400).json({ error: "email + password required" });

    const exists = await pool.query("SELECT id FROM users WHERE email=$1", [email]);
    if (exists.rows.length) return res.status(409).json({ error: "Email already exists" });

    const hash = await bcrypt.hash(password, 10);
    const created = await pool.query(
      "INSERT INTO users(email, password_hash, role) VALUES($1,$2,$3) RETURNING id, email, role",
      [email, hash, role]
    );

    res.json({ user: created.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "email + password required" });

    const q = await pool.query("SELECT id,email,password_hash,role FROM users WHERE email=$1", [email]);
    if (!q.rows.length) return res.status(401).json({ error: "Invalid login" });

    const user = q.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid login" });

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/me", authRequired, async (req, res) => {
  res.json({ me: req.user });
});

app.listen(PORT, () => console.log(`API Core running on port ${PORT}`));
// ---- Customers API ----
app.get("/customers", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, phone, email, notes FROM customers ORDER BY id"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch customers",
      details: err.message,
    });
  }
});
