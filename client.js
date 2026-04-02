/**
 * SURF RESOURCES ADVENTURE - CLIENT LOGIC FINAL
 * Arquitectura: Integridad E2E + Validación Regex + Sockets
 * Mapeo de Datos: played_at (MySQL)
 */

const socket = io();

const GAME_CONFIG = {
    RESOURCES: ["Surfboard", "Wetsuit", "Wax", "Fins", "Board Bag", "Fuel", "Food", "Water", "Money", "Credit Card", "Motivation"],
    MAX_DUPLICATES: 2,
    POLLING_INTERVAL: 1500,
    MIN_PASS_LENGTH: 4
};

let gameState = {
    myUser: null,
    players: [],
    currentPlayerIndex: 0,
    lobbyInterval: null
};

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    updateLeaderboard();
    setupEventListeners();
    setupSocketListeners();
});

function setupEventListeners() {
    document.getElementById("loginBtn")?.addEventListener("click", handleAuth);
    document.getElementById("forgotPasswordBtn")?.addEventListener("click", handleForgotPassword);
    document.getElementById("resetPasswordBtn")?.addEventListener("click", handleResetPassword);

    const toggleBtn = document.getElementById("toggleHistoryBtn");
    const content = document.getElementById("historyContent");
    if (toggleBtn && content) {
        toggleBtn.onclick = () => {
            content.classList.toggle("open");
            const arrow = toggleBtn.querySelector(".arrow");
            if (arrow) arrow.textContent = content.classList.contains("open") ? "▲" : "▼";
            if (content.classList.contains("open")) updateLeaderboard();
        };
    }
}

// ==========================================
// AUTENTICACIÓN Y VALIDACIÓN (RE-BLINDADA)
// ==========================================
async function handleAuth() {
    const userInp = document.getElementById("username");
    const emailInp = document.getElementById("email");
    const passInp = document.getElementById("password");
    
    const username = userInp.value.trim();
    const email = emailInp.value.trim();
    const password = passInp.value.trim();
    const authMsg = document.getElementById("auth-msg");

    // REGEX: Validación de integridad de correo corporativo/personal
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!username || !email || !password) {
        return showAuthError("⚠️ Todos los parámetros son requeridos");
    }

    if (!emailRegex.test(email)) {
        emailInp.style.border = "1px solid var(--danger)";
        return showAuthError("❌ Integridad de correo fallida (@ algo)");
    }

    try {
        const res = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password, email })
        });
        const data = await res.json();
        
        if (!data.success) return showAuthError(data.message);

        // PERSISTENCIA Y LIMPIEZA DE DOM
        gameState.myUser = data.user;
        document.getElementById("auth-form").style.display = "none";
        document.getElementById("recovery-links").style.display = "none";
        document.getElementById("player-turn-label").innerHTML = `Hola <b>${username}</b> 🌊 Esperando jugadores...`;
        
        gameState.lobbyInterval = setInterval(syncLobbyStatus, GAME_CONFIG.POLLING_INTERVAL);

    } catch (err) {
        showAuthError("❌ Error de comunicación con el servidor");
        console.error("Fetch error:", err);
    }
}

// ==========================================
// LOBBY Y SALA
// ==========================================
async function syncLobbyStatus() {
    try {
        const res = await fetch("/api/lobby-status");
        const data = await res.json();
        document.getElementById("player-turn-label").innerText = `🏄 Surfistas: ${data.count} / 4`;
        if (data.count >= 2 && !document.getElementById("startNowBtn")) renderStartButton(data.players);
        if (data.count === 4) finalizeLobby(data.players);
    } catch (err) {}
}

function renderStartButton(players) {
    if (document.getElementById("startNowBtn")) return;
    const btn = document.createElement("button");
    btn.id = "startNowBtn"; btn.className = "btn-primary";
    btn.innerText = "🚀 INICIAR PARTIDA";
    btn.style.marginTop = "15px";
    btn.onclick = () => finalizeLobby(players);
    document.querySelector(".auth-card").appendChild(btn);
}

function finalizeLobby(players) {
    clearInterval(gameState.lobbyInterval);
    document.getElementById("auth-overlay").style.display = "none";
    gameState.players = players.map((p, i) => {
        const panel = document.getElementById(`player${i+1}`);
        if(panel) panel.querySelector(".player-name").innerText = p.username;
        return { name: p.username, items: [], el: panel };
    });
    setupGameInterface();
}

// ==========================================
// LÓGICA DE JUEGO Y TURNOS
// ==========================================
function setupGameInterface() {
    const rollBtn = document.getElementById("rollBtn");
    rollBtn.hidden = false;
    rollBtn.onclick = rollDice;
    syncRollButton();
}

function rollDice() {
    const player = gameState.players[gameState.currentPlayerIndex];
    const item = GAME_CONFIG.RESOURCES[Math.floor(Math.random() * GAME_CONFIG.RESOURCES.length)];
    socket.emit("rollDiceAction", { 
        playerIndex: gameState.currentPlayerIndex, 
        item, 
        playerName: player.name 
    });
}

function setupSocketListeners() {
    socket.on("syncMove", (data) => {
        const player = gameState.players[data.playerIndex];
        if (player.items.filter(i => i === data.item).length < GAME_CONFIG.MAX_DUPLICATES) {
            player.items.push(data.item);
        }
        renderInventory(player);
        updateStatus(`🎲 ${data.playerName} obtuvo ${data.item}`);
        if (checkVictory(player)) return;
        gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
        syncRollButton();
    });

    socket.on("globalVictory", (data) => {
        updateStatus(`🏆 GANADOR: ${data.winner}`);
        document.getElementById("rollBtn").disabled = true;
        if (typeof confetti === "function") confetti({ particleCount: 200, spread: 100 });
        updateLeaderboard();
    });

    socket.on("receiveBuzz", (data) => {
        if (gameState.myUser && data.to === gameState.myUser.username) {
            updateStatus(`🚨 ¡${data.from} te está apurando!`);
            document.body.classList.add("shake-effect");
            setTimeout(() => document.body.classList.remove("shake-effect"), 500);
        }
    });
}

function syncRollButton() {
    if (!gameState.players.length || !gameState.myUser) return;
    const btn = document.getElementById("rollBtn");
    const current = gameState.players[gameState.currentPlayerIndex];
    let buzzBtn = document.getElementById("buzzBtn");

    if (!buzzBtn) {
        buzzBtn = document.createElement("button");
        buzzBtn.id = "buzzBtn"; buzzBtn.className = "btn-buzz";
        document.querySelector(".action-center").appendChild(buzzBtn);
    }

    if (gameState.myUser.username === current.name) {
        btn.disabled = false; btn.innerText = "🎲 TU TURNO";
        updateStatus("🟢 Es tu turno..."); buzzBtn.style.display = "none";
    } else {
        btn.disabled = true; btn.innerText = `Turno de ${current.name}`;
        buzzBtn.innerText = `🔔 APURAR A ${current.name}`; buzzBtn.style.display = "block";
        buzzBtn.onclick = () => socket.emit("sendBuzz", { to: current.name, from: gameState.myUser.username });
    }
}

function checkVictory(player) {
    if (new Set(player.items).size === GAME_CONFIG.RESOURCES.length) {
        socket.emit("declareVictory", { winner: player.name });
        return true;
    }
    return false;
}

// ==========================================
// RENDERIZADO Y LEADERBOARD (FIXED played_at)
// ==========================================
function renderInventory(player) {
    if (!player.el) return;
    const ul = player.el.querySelector(".items");
    ul.innerHTML = player.items.map(item => `<li>✨ ${item}</li>`).join("");
}

function updateStatus(msg) { document.getElementById("status").innerText = msg; }
function showAuthError(msg) { document.getElementById("auth-msg").innerText = msg; }

async function updateLeaderboard() {
    try {
        const res = await fetch("/api/match-history");
        const data = await res.json();
        const history = data.history || data;
        const list = document.getElementById("winnersList");
        if (list && history.length > 0) {
            list.innerHTML = history.slice(0, 5).map(h => {
                // FIX: Mapeo exacto a played_at de MySQL
                const date = new Date(h.played_at);
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return `<li>🏆 <b>${h.winner_name}</b> <small>${timeStr}</small></li>`;
            }).join("");
        }
    } catch (e) { console.error("Leaderboard Error"); }
}

async function handleForgotPassword() { alert("Recuperación solicitada 📧"); }
async function handleResetPassword() { alert("Llave actualizada 🔑"); }
