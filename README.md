# 🏄‍♂️ Surf Resources Adventure - Pro Edition (2026)

> **Juego multijugador en tiempo real** diseñado con una arquitectura robusta, enfocado en la integridad de datos y la sincronización asíncrona.

---

## 📈 Evolución Arquitectónica (2022 - 2026)
Este sistema representa la **maduración técnica** de una lógica original concebida en 2022:
- **Fase 1 (2022):** Prototipo funcional desarrollado originalmente en **Python (CLI)**.
- **Fase 2 (2026):** Refactorización integral hacia una arquitectura **Full-Stack Robusta** utilizando Node.js, MySQL y comunicación bidireccional con Socket.io. 
*Se priorizó la migración de un motor lineal a una plataforma escalable y persistente.*

---

## 🖼️ Galería del Sistema (Arquitectura Visual)

### 1. Infraestructura y Backend
Verificación de integridad de base de datos y levantamiento de variables de entorno seguro.
![Terminal](./assets/server-terminal.png)

### 2. Capa de Integridad de Entrada
Validación mediante **Regex** para asegurar datos estructurados y bloqueo de basura en el registro.
![Autenticación](./assets/auth-layer.png)

### 3. Sincronización en Tiempo Real (Lobby)
Gestión de quórum para inicio de partida y eventos asíncronos.
![Lobby](./assets/lobby-sync.png)

### 4. Gameplay e Interacción
Experiencia de usuario y eventos cruzados ("Zumbidos") durante la partida.
![Interacción](./assets/gameplay-interaction.png)

### 5. Persistencia E2E (Leaderboard)
Mapeo de datos relacionales en MySQL utilizando la columna `played_at` para el ranking histórico.
![Leaderboard](./assets/leaderboard-final.png)

---

## 🛡️ Seguridad e Integridad
- **Prevención de SQL Injection:** Consultas preparadas con la librería `mysql2`.
- **Saneamiento E2E:** Validación de tipos y formatos de correo en cliente y servidor.
- **Variables de Entorno:** Gestión de credenciales críticas mediante archivo `.env`.

## 🗄️ Arquitectura de Datos y Esquema Relacional (MySQL)
Para garantizar la persistencia de métricas competitivas, el sistema interactúa con un motor relacional local cuyo esquema exacto está documentado en el archivo `database.sql`. El diseño modular se compone de cuatro entidades principales:

- **`users` (Autenticación y Control):** Gestión segura de credenciales de acceso, marcas temporales de auditoría (`created_at`), control histórico de victorias (`total_wins`) y persistencia de tokens de expiración estricta para la recuperación asíncrona de contraseñas.
- **`players` (Registro de Competidores):** Catálogo de perfiles y mapeo de identidades únicas de los surfistas dentro del sistema.
- **`player_points` (Métricas de Alta Frecuencia):** Tabla transaccional dedicada a documentar de forma granular cada recurso recolectado (`resource_name`) junto con su respectiva estampa de tiempo (`timestamp`), ideal para analíticas de rendimiento.
- **`matches` (Historial E2E y Leaderboard):** Repositorio consolidado de partidas que registra los nombres de los ganadores (`winner_name`) y el conteo de ítems recolectados (`items_count`), optimizado mediante índices para renderizar las clasificaciones en tiempo real.

---


## 🛠️ Tecnologías Utilizadas
- **Backend:** Node.js & Express.
- **Tiempo Real:** Socket.io.
- **Base de Datos:** MySQL (Relacional).
- **Frontend:** HTML5, CSS3 (Glassmorphism), JS Vanilla.

## 🚀 Instalación
1. `npm install`
2. Configurar `.env` (ver `.env.example`).
3. `node server.js`
