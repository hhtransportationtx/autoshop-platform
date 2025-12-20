// imports
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// health check
app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

// ✅ VEHICLES ROUTE — MUST BE ABOVE app.listen
app.get("/api/vehicles", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, make, model, year FROM vehicles ORDER BY id ASC"
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 🚨 app.listen MUST BE LAST
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`API Core running on port ${PORT}`);
});
