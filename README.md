# IPL Auction Arena

A real-time multiplayer IPL-style player auction web app built with **React + Vite + TypeScript + Tailwind CSS + Framer Motion** on the frontend and **Node.js + Express + Socket.IO + SQLite** on the backend.

---

## Features

- **Password-Protected Rooms**: 6-character room codes, bcrypt-hashed passwords, wrong-password attempt rate limiting, and JWT session reconnection.
- **10 IPL Franchises**: CSK, MI, RCB, KKR, SRH, DC, RR, PBKS, LSG, GT with custom crests and team colors. Minimum 2 claimed teams to start.
- **Authoritative Server Engine**:
  - ₹150 Cr starting purse per team, max 11 players, max 4 overseas players.
  - Tiered bid increments (+₹5 L under ₹1 Cr, +₹10 L from ₹1 Cr to ₹5 Cr, +₹25 L at ₹5 Cr+).
  - Server-controlled 5 / 10 / 15 second countdown timer synced across all clients.
  - Double-click & simultaneous-bid protection via arrival-order processing + expected price verification.
- **120-Player Seed Pool**: Real IPL legends & current stars across 20 balanced, randomized sets of 6 players, plus an **Accelerated Round** for unsold players.
- **Extras**:
  - Auto-generated **Team Rating**, leaderboard, and **Best XI** summary.
  - **Power Card** (1 per team): *Reset Timer* or *Veto Jump (+₹5 L increment cap)*.
  - **Player Watchlist** with instant "on the block" notifications.
  - **Live Chat & Emoji Reactions**, **Host Pause/Resume/Skip/Kick**, **Spectator Mode**, **Synthesized Web Audio SFX + Gavel Overlay + Commentary Ticker**, **CSV/PDF Export**, and **Dark/Light Mode**.

---

## Replacing Player Photos

Player image paths in `server/data/players.json` point to `/players/<slug>.jpg` (served from `client/public/players/`).
If a local photo file is missing, the UI automatically renders a styled initials avatar.

To use official or licensed player images:
1. Place `.jpg` or `.png` files inside `client/public/players/` matching the filenames in `server/data/players.json` (e.g., `client/public/players/virat-kohli.jpg`), **or**
2. Update the `"photo"` URLs in `server/data/players.json`.

---

## Run Locally

Requires **Node.js 22+** (uses built-in `node:sqlite`).

### 1. Backend (`server/`)
```bash
cd server
cp .env.example .env
npm install
npm test
npm run dev
```
Backend runs at `http://localhost:4000`.

### 2. Frontend (`client/`)
```bash
cd client
cp .env.example .env
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`.

---

## Deploy

### Backend (Render / Railway)
1. Create a new Web Service pointing to `server/`.
2. Set Build Command: `npm install && npm run build`
3. Set Start Command: `npm start`
4. Configure environment variables:
   - `NODE_ENV=production`
   - `PORT=4000` (or platform-assigned)
   - `JWT_SECRET=<long-random-secret>`
   - `CORS_ORIGIN=https://your-vercel-app.vercel.app`
   - `DB_PATH=./data/auction.db` (attach a persistent disk on Render/Railway so SQLite persists across restarts)

### Frontend (Vercel)
1. Import the repo in Vercel and set **Root Directory** to `client`.
2. Framework Preset: `Vite` (`client/vercel.json` is included).
3. Configure environment variables:
   - `VITE_API_URL=https://your-backend-service.onrender.com`
   - `VITE_SOCKET_URL=https://your-backend-service.onrender.com`
4. Deploy!
