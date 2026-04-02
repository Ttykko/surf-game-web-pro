/**
 * SURF RESOURCES ADVENTURE - FULL INTEGRATED LOGIC
 */

// ==========================================
// SOCKET & CONFIG
// ==========================================
const socket = io();

const GAME_CONFIG = {
    RESOURCES: [
        "Surfboard", "Wetsuit", "Wax", "Fins", "Board Bag",
        "Fuel", "Food", "Water", "Money", "Credit Card", "Motivation"
    ],
    MAX_DUPLICATES: 2,
    POLLING_INTERVAL: 1500
};

let gameState = {
    myUser: null,
    players: [],
    currentPlayerIndex: 0,
    lobbyInterval: null
};

// ==========================================
// INIT
// ==========================================
document.addEventListener("DOMContentLoaded", initApp);

function initApp() {
    updateLeaderboard();
    setupEventListeners();
    setupSocketListeners();
}

function setupEventListeners() {
    const loginBtn = document.getElementById("loginBtn");
    if(loginBtn) loginBtn.onclick = handleAuth;
    
    const forgotBtn = document.getElementById("forgotPasswordBtn");
    if(forgotBtn) forgotBtn.onclick = handleForgotPassword;
    
    const resetBtn = document.getElementById("resetPasswordBtn");
    if(resetBtn) resetBtn.onclick = handleResetPassword;
}

// ==========================================
// AUTH & LOBBY
// ==========================================
async function handleAuth() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const email = document.getElementById("email").value.trim();

    if (!username || !password) {
        return showAuthError("⚠️ Completa los campos");
    }

    try {
        const res = await fetch("/api/login", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ username, password, email })
        });

        const data = await res.json();

        if (data.success) {
            gameState.myUser = data.user;
            document.getElementById("loginBtn").style.display = "none";
            document.getElementById("player-turn-label").innerHTML =
                `Hola <b>${username}</b> 🌊 esperando jugadores...`;

            // Iniciar sincronización del lobby
            gameState.lobbyInterval = setInterval(syncLobbyStatus, GAME_CONFIG.POLLING_INTERVAL);
        } else {
            showAuthError(data.message);
        }
    } catch (err) {
        console.error(err);
        showAuthError("Error servidor ❌");
    }
}

async function syncLobbyStatus() {
    try {
        const res = await fetch("/api/lobby-status");
        const data = await res.json();

        document.getElementById("player-turn-label").innerText =
            `🏄 Jugadores: ${data.count} / 4`;

        if (data.count >= 2 && !document.getElementById("startNowBtn")) {
            renderStartButton(data.players);
        }

        if (data.count === 4) {
            finalizeLobby(data.players);
        }
    } catch (err) {
        console.error("Lobby error:", err);
    }
}

function renderStartButton(players) {
    if (document.getElementById("startNowBtn")) return;
    const btn = document.createElement("button");
    btn.id = "startNowBtn";
    btn.className = "btn-primary";
    btn.innerText = "🚀 INICIAR PARTIDA";
    btn.style.marginTop = "15px";
    btn.onclick = () => finalizeLobby(players);
    document.querySelector(".auth-card").appendChild(btn);
}

function finalizeLobby(players) {
    clearInterval(gameState.lobbyInterval);
    document.getElementById("auth-overlay").style.display = "none";

    gameState.players = players.map((p, i) => ({
        name: p.username,
        items: [],
        el: document.getElementById(`player${i+1}`)
    }));

    setupGameInterface();
}

// ==========================================
// GAME CORE LOGIC
// ==========================================
function setupGameInterface() {
    const rollBtn = document.getElementById("rollBtn");
    rollBtn.hidden = false;
    rollBtn.onclick = rollDice;

    updateStatus(`Turno: ${gameState.players[0].name}`);
    syncRollButton();
}

// 🧪 OPCIÓN PRO: EVITAR DUPLICADOS Y EMITIR
function rollDice() {
    const player = gameState.players[gameState.currentPlayerIndex];
    const dice = Math.floor(Math.random() * 6) + 1;
    const item = GAME_CONFIG.RESOURCES[Math.floor(Math.random() * GAME_CONFIG.RESOURCES.length)];

    // Emitimos la acción al servidor
    socket.emit("rollDiceAction", {
        playerIndex: gameState.currentPlayerIndex,
        dice,
        item,
        playerName: player.name
    });
}

function setupSocketListeners() {
    socket.on("syncMove", (data) => {
        const player = gameState.players[data.playerIndex];
        const count = player.items.filter(i => i === data.item).length;

        // Validación de duplicados antes de agregar al inventario
        if (count < GAME_CONFIG.MAX_DUPLICATES) {
            player.items.push(data.item);
            updateStatus(`🎲 ${data.playerName} obtuvo ${data.item}`);
        } else {
            updateStatus(`♻️ ${data.playerName} sacó ${data.item} (Duplicado)`);
        }

        renderInventory(player);
        if (checkVictory(player)) return;

        changeTurn();
        syncRollButton();
    });

    socket.on("globalVictory", (data) => {
        updateStatus(`🏆 GANADOR: ${data.winner}`);
        if(typeof confetti === 'function') {
            confetti({ particleCount: 200, spread: 100 });
        }
    });
}

function syncRollButton() {
    if (!gameState.players.length || !gameState.myUser) return;
    
    const btn = document.getElementById("rollBtn");
    const current = gameState.players[gameState.currentPlayerIndex];

    if (gameState.myUser.username === current.name) {
        btn.disabled = false;
        btn.innerText = "🎲 TIRAR DADO";
    } else {
        btn.disabled = true;
        btn.innerText = `Esperando a ${current.name}`;
    }
}

function changeTurn() {
    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
}

function checkVictory(player) {
    // Victoria si tiene al menos una unidad de CADA recurso único
    const uniqueItems = new Set(player.items);
    if (uniqueItems.size === GAME_CONFIG.RESOURCES.length) {
        socket.emit("declareVictory", { winner: player.name });
        return true;
    }
    return false;
}

// ==========================================
// UI UPDATES
// ==========================================
function renderInventory(player) {
    if(!player.el) return;
    const ul = player.el.querySelector(".items");
    if(ul) {
        ul.innerHTML = player.items.map(i => `<li>✨ ${i}</li>`).join("");
    }
}

function updateStatus(msg) {
    const statusEl = document.getElementById("status");
    if(statusEl) statusEl.innerText = msg;
}

function showAuthError(msg) {
    const errEl = document.getElementById("auth-msg");
    if(errEl) errEl.innerText = msg;
}

// ==========================================
// PASSWORD RECOVERY
// ==========================================
async function handleForgotPassword(e) {
    e.preventDefault();
    const email = prompt("📧 Ingresa tu correo:");
    if (!email) return;

    try {
        const res = await fetch("/api/forgot-password", {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (data.success) {
            alert("Código enviado 📧");
            document.getElementById("reset-password-section").style.display = "block";
        } else {
            alert(data.message);
        }
    } catch {
        alert("Error servidor");
    }
}

async function handleResetPassword() {
    const email = prompt("📧 Confirma tu correo:");
    const code = document.getElementById("recoveryCodeInp").value.trim();
    const newPassword = document.getElementById("newPasswordInp").value.trim();

    if (!email || !code || !newPassword) return alert("Completa todo ⚠️");

    try {
        const res = await fetch("/api/reset-password", {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({ email, code, newPassword })
        });
        const data = await res.json();
        if (data.success) {
            alert("Contraseña actualizada ✅");
            document.getElementById("reset-password-section").style.display = "none";
        } else {
            alert(data.message);
        }
    } catch {
        alert("Error conexión");
    }
}

async function updateLeaderboard() {
    try {
        const res = await fetch("/api/match-history");
        const data = await res.json();
        const list = document.getElementById("winnersList");
        if (!list) return;
        list.innerHTML = data.map(h => `<li>🏆 ${h.winner_name}</li>`).join("");
    } catch {
        console.log("Error leaderboard");
    }
}
