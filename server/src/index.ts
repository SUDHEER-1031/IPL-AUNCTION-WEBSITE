import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { config } from './config.js';
import { getDb } from './db.js';
import { roomsRouter } from './routes/rooms.js';
import { registerSocketHandlers } from './socketHandlers.js';
import { roomManager } from './roomManager.js';

getDb();

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
  console.log(`IPL Auction Arena server listening on http://localhost:${config.port}`);
});
