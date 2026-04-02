/**
 * SURF RESOURCES ADVENTURE - SERVER FINAL PRO CLEAN
 */

require('dotenv').config();

const express = require("express");
const mysql = require("mysql2");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

// ==========================================
// INIT SERVER
// ==========================================
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ==========================================
// CONFIG
// ==========================================
const PORT = process.env.PORT || 3000;
const SALT_ROUNDS = 10;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ==========================================
// DB
// ==========================================
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

// ==========================================
// EMAIL
// ==========================================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ==========================================
// SOCKET
// ==========================================
let lobbyPlayers = [];

io.on("connection", (socket) => {
  socket.on("rollDiceAction", (data) => io.emit("syncMove", data));
  socket.on("declareVictory", (data) =>
    io.emit("globalVictory", { winner: data.winner })
  );
});

// ==========================================
// LOGIN / REGISTER
// ==========================================
app.post("/api/login", (req, res) => {
  const { username, password, email } = req.body;

  db.query("SELECT * FROM users WHERE username = ?", [username], async (err, results) => {
    if (err) return res.status(500).json({ success: false });

    const success = (user) => {
      const exists = lobbyPlayers.find(p => p.username === user.username);

      if (!exists && lobbyPlayers.length < 4) {
        lobbyPlayers.push({ id: user.id, username: user.username });
      }

      res.json({ success: true, user: { id: user.id, username: user.username } });
    };

    // LOGIN
    if (results.length > 0) {
      const user = results[0];
      const match = await bcrypt.compare(password, user.password);

      if (match) return success(user);

      return res.status(401).json({ success: false, message: "Contraseña incorrecta" });
    }

    // REGISTER
    if (!email) {
      return res.status(400).json({ success: false, message: "Debes ingresar email para registrarte" });
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    db.query(
      "INSERT INTO users (username, password, email) VALUES (?, ?, ?)",
      [username, hash, email],
      (err, result) => {
        if (err) return res.status(500).json({ success: false });
        success({ id: result.insertId, username });
      }
    );
  });
});

// ==========================================
// FORGOT PASSWORD
// ==========================================
app.post("/api/forgot-password", (req, res) => {
  const { email } = req.body;

  db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ message: "Email no encontrado" });
    }

    const token = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiry = new Date(Date.now() + 3600000);

    db.query(
      "UPDATE users SET reset_token=?, token_expiry=? WHERE email=?",
      [token, expiry, email],
      (err) => {
        if (err) return res.status(500).json({ success: false });

        transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: "🌊 Recuperación de contraseña",
          html: `<h3>Código: <b>${token}</b></h3>`
        }, (error) => {
          if (error) return res.status(500).json({ success: false });

          res.json({ success: true });
        });
      }
    );
  });
});

// ==========================================
// RESET PASSWORD
// ==========================================
app.post("/api/reset-password", async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ success: false, message: "Faltan datos" });
  }

  db.query(
    "SELECT id FROM users WHERE email=? AND reset_token=? AND token_expiry > NOW()",
    [email, code],
    async (err, results) => {

      if (err) return res.status(500).json({ success: false });

      if (results.length === 0) {
        return res.status(400).json({ success: false, message: "Código inválido" });
      }

      const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);

      db.query(
        "UPDATE users SET password=?, reset_token=NULL, token_expiry=NULL WHERE email=?",
        [hash, email],
        () => res.json({ success: true })
      );
    }
  );
});

// ==========================================
// LOBBY
// ==========================================
app.get("/api/lobby-status", (req, res) => {
  res.json({
    count: lobbyPlayers.length,
    players: lobbyPlayers
  });
});

app.post("/api/lobby-reset", (req, res) => {
  lobbyPlayers = [];
  res.json({ success: true });
});

// ==========================================
// HISTORIAL
// ==========================================
app.get("/api/match-history", (req, res) => {
  db.query(
    "SELECT winner_name, played_at as game_date FROM matches ORDER BY played_at DESC LIMIT 5",
    (err, results) => {
      if (err) return res.status(500).json([]);
      res.json(results);
    }
  );
});

// ==========================================
// SAVE GAME
// ==========================================
app.post("/api/save-game", (req, res) => {
  const { winner, items } = req.body;

  db.query(
    "INSERT INTO matches (winner_name, items_count) VALUES (?, ?)",
    [winner, items],
    () => {
      db.query(
        "UPDATE users SET total_wins = total_wins + 1 WHERE username=?",
        [winner]
      );

      res.json({ success: true });
    }
  );
});

// ==========================================
// START
// ==========================================
server.listen(PORT, () => {
  console.log(`🚀 SERVER RUNNING ON http://localhost:${PORT}`);
});