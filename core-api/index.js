const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// IMPORTANT: set DATABASE_URL in Render Environment Variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

app.get("/", (req, res) => res.json({ status: "ok" }));

// -------- VEHICLES --------
app.get("/vehicles", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, make, model, year FROM vehicles ORDER BY id ASC"
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/vehicles", async (req, res) => {
  const { make, model, year } = req.body;
  try {
    const { rows } = await pool.query(
      "INSERT INTO vehicles (make, model, year) VALUES ($1,$2,$3) RETURNING *",
      [make, model, year]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -------- WORK ORDERS --------
app.get("/work-orders", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, customer_id, vehicle_id, status, notes, parts_total, tax_total, grand_total, labor_total, created_at
       FROM work_orders
       ORDER BY id DESC`
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/work-orders", async (req, res) => {
  const { customer_id, vehicle_id, status, notes } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO work_orders (customer_id, vehicle_id, status, notes)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [customer_id || null, vehicle_id, status || "open", notes || ""]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch("/work-orders/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const { rows } = await pool.query(
      "UPDATE work_orders SET status=$1 WHERE id=$2 RETURNING *",
      [status, id]
    );
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("API Core running on port", PORT));
// GET all vehicles
app.get("/vehicles", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, make, model, year FROM vehicles ORDER BY id"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch vehicles" });
  }
});
