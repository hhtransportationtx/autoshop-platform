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
// 🚨 app.listen MUST BE LAST
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`API Core running on port ${PORT}`);
});
