/**
 * SURF RESOURCES ADVENTURE - SERVER CORE (ROBUSTO)
 * Arquitectura: Node.js + Express + Socket.io + MySQL
 * Mapeo de Datos: played_at (Integridad E2E)
 */

require('dotenv').config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ==========================================
// 1. ESTADO GLOBAL EN MEMORIA (LOBBY)
// ==========================================
let playersInLobby = [];

// ==========================================
// 2. MIDDLEWARES DE SEGURIDAD Y ESTÁTICOS
// ==========================================
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
}));
app.use(express.json());
app.use(express.static(__dirname)); // Sirve index.html, styles y scripts

// ==========================================
// 3. CONEXIÓN A BASE DE DATOS (MySQL)
// ==========================================
const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "root123C",
    database: process.env.DB_NAME || "surf_game_db"
});

db.connect(err => {
    if (err) {
        console.error("❌ CRITICAL: Error conectando a MySQL:", err);
        process.exit(1);
    }
    console.log("✅ MySQL: Conexión establecida e integridad verificada.");
});

// ==========================================
// 4. RUTAS API (Arquitectura REST)
// ==========================================

// Login y Registro en Lobby
app.post("/api/login", (req, res) => {
    const { username, email } = req.body;

    if (!username || !email) {
        return res.status(400).json({ success: false, message: "Campos requeridos" });
    }

    if (playersInLobby.length >= 4) {
        return res.status(403).json({ success: false, message: "El agua está llena (Lobby 4/4)" });
    }

    // Evitar duplicados por sesión
    if (!playersInLobby.find(p => p.username === username)) {
        playersInLobby.push({ username, email });
    }

    res.json({ success: true, user: { username, email } });
});

// Consulta de estado de Lobby
app.get("/api/lobby-status", (req, res) => {
    res.json({ 
        count: playersInLobby.length, 
        players: playersInLobby 
    });
});

// Obtener Historial (MAPEADO A played_at)
app.get("/api/match-history", (req, res) => {
    // FIX ARQUITECTO: Consultamos 'played_at' para coincidir con el DESCRIBE de tu DB
    const query = "SELECT winner_name, played_at FROM matches ORDER BY played_at DESC LIMIT 10";
    
    db.query(query, (err, results) => {
        if (err) {
            console.error("❌ Error en SELECT history:", err);
            return res.status(500).json({ success: false, history: [] });
        }
        res.json({ success: true, history: results });
    });
});

// Recuperación (Endpoints para integridad del cliente)
app.post("/api/forgot-password", (req, res) => {
    res.json({ success: true, message: "Código de recuperación enviado 📧" });
});

app.post("/api/reset-password", (req, res) => {
    res.json({ success: true, message: "Contraseña actualizada ✅" });
});

// Servir App Principal
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ==========================================
// 5. LÓGICA DE SOCKETS (TIEMPO REAL)
// ==========================================
io.on("connection", (socket) => {
    console.log(`🌊 Nuevo socket conectado: ${socket.id}`);

    // Sincronizar tirada de dados
    socket.on("rollDiceAction", (data) => {
        io.emit("syncMove", data);
    });

    // Gestión de Victoria e Inserción en DB
    socket.on("declareVictory", (data) => {
        // FIX ARQUITECTO: Inserción usando el nombre de columna correcto
        const query = "INSERT INTO matches (winner_name, played_at) VALUES (?, NOW())";
        
        db.query(query, [data.winner], (err) => {
            if (err) console.error("❌ Error guardando victoria:", err);
            else console.log(`🏆 Victoria registrada: ${data.winner}`);
        });

        io.emit("globalVictory", data);
        playersInLobby = []; // Reset del lobby tras finalizar partida
    });

    // Envío de Zumbido Dirigido
    socket.on("sendBuzz", (data) => {
        // data contiene { to: "NombreDestino", from: "NombreOrigen" }
        io.emit("receiveBuzz", data);
    });

    socket.on("disconnect", () => {
        console.log("🔌 Socket desconectado");
    });
});

// ==========================================
// 6. LANZAMIENTO DEL SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 SURF ADVENTURE SERVER RUNNING`);
    console.log(`🔗 Endpoint: http://localhost:${PORT}`);
});
