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
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
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
// ✅ WORK ORDERS WITH CUSTOMER + VEHICLE
app.get("/api/work-orders", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        wo.id,
        c.name AS customer_name,
        v.make,
        v.model,
        v.year,
        wo.status,
        wo.notes,
        wo.labor_total,
        wo.parts_total,
        wo.tax_total,
        wo.grand_total,
        wo.created_at
      FROM work_orders wo
      JOIN customers c ON c.id = wo.customer_id
      JOIN vehicles v ON v.id = wo.vehicle_id
      ORDER BY wo.created_at DESC
    `);

    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
// ➕ CREATE WORK ORDER
app.post("/api/work-orders", async (req, res) => {
  try {
    const {
      customer_id,
      vehicle_id,
      notes,
      labor_total = 0,
      parts_total = 0,
      tax_total = 0
    } = req.body;

    const grand_total =
      Number(labor_total) + Number(parts_total) + Number(tax_total);

    const { rows } = await pool.query(
      `
      INSERT INTO work_orders
        (customer_id, vehicle_id, notes, labor_total, parts_total, tax_total, grand_total)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        customer_id,
        vehicle_id,
        notes,
        labor_total,
        parts_total,
        tax_total,
        grand_total
      ]
    );

    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});
// // ✅ UPDATE WORK ORDER
app.put("/api/work-orders/:id", async (req, res) => {
  const { id } = req.params;
  const {
    status,
    notes,
    labor_total,
    parts_total,
    tax_total
  } = req.body;

  const grand_total =
    Number(labor_total || 0) +
    Number(parts_total || 0) +
    Number(tax_total || 0);

  try {
    const { rows } = await pool.query(
      `
      UPDATE work_orders
      SET
        status = COALESCE($1, status),
        notes = COALESCE($2, notes),
        labor_total = COALESCE($3, labor_total),
        parts_total = COALESCE($4, parts_total),
        tax_total = COALESCE($5, tax_total),
        grand_total = $6
      WHERE id = $7
      RETURNING *
      `,
      [
        status,
        notes,
        labor_total,
        parts_total,
        tax_total,
        grand_total,
        id
      ]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Work order not found" });
    }

    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
]);
//🚨 app.listen MUST BE LAST
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`API CORE running on port ${PORT}`);
});
