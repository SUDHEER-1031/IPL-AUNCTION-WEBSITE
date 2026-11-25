import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { config } from './config.js';
import { getDb } from './db.js';
import { roomsRouter } from './routes/rooms.js';
import { registerSocketHandlers } from './socketHandlers.js';
import { roomManager } from './roomManager.js';

getDb();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDistPath = path.resolve(__dirname, '../../client/dist');

const app = express();
const allowedOrigins = config.corsOrigin.split(',').map((o) => o.trim());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'ipl-auction-arena-server', time: Date.now() });
});

app.use('/api/rooms', roomsRouter);

// Serve built React frontend from the same Express server (unified single-app deployment)
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((req, res, next) => {
    if (
      req.method === 'GET' &&
      !req.path.startsWith('/api') &&
      !req.path.startsWith('/socket.io')
    ) {
      res.sendFile(path.join(clientDistPath, 'index.html'));
      return;
    }
    next();
  });
}

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

roomManager.attachIo(io);
registerSocketHandlers(io);

httpServer.listen(config.port, () => {
  console.log(`IPL Auction Arena (Frontend + Backend) running at http://localhost:${config.port}`);
});
