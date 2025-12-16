const express = require("express");
const { Pool } = require("pg");
const app = express();
app.get("/", (req, res) => {
  res.status(200).send("API Core is running ✅");
});
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.get("/db/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "db ok" });
  } catch (err) {
    res.status(500).json({
      status: "db error",
      error: err.message
    });
  }
});
app.get("/ai/health", async (req, res) => {
  try {
    const aiUrl = process.env.AI_SERVICE_URL || "https://ai-service-ydst.onrender.com";
    const response = await fetch(`${aiUrl}/health`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "AI service unreachable",
      error: err.message
    });
  }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Core running on port ${PORT}`);
});
