const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Conexión a MySQL
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root123C",
  database: "surfgame" // <== asegúrate de que exista tu DB
});

db.connect(err => {
  if (err) throw err;
  console.log("✅ Conectado a MySQL");
});

// =======================
// Rutas API
// =======================

// Obtener jugadores
app.get("/players", (req, res) => {
  db.query("SELECT * FROM players", (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// Guardar nombre de jugador
app.post("/players/:id", (req, res) => {
  const id = req.params.id;
  const { name } = req.body;
  db.query("UPDATE players SET name = ? WHERE id = ?", [name, id], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json({ success: true });
  });
});

// Iniciar servidor
app.listen(3001, () => {
  console.log("🚀 Backend corriendo en http://localhost:3001");
});