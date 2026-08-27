import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Core Middlewares
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// Initialize Realtime Socket.io Hub
const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST', 'PATCH'],
  },
});

// Real-Time Socket Connection Logic
io.on('connection', (socket) => {
  console.log(`[Socket Connected]: ${socket.id}`);

  // Room subscriptions based on user role/ID
  socket.on('join_room', (room: string) => {
    socket.join(room);
    console.log(`[Socket ${socket.id}] joined room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket Disconnected]: ${socket.id}`);
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', system: 'Reflex Backend API', timestamp: new Date() });
});

// Make io accessible globally in express routes
app.set('io', io);

server.listen(PORT, () => {
  console.log(`🚀 Reflex Backend Engine running on http://localhost:${PORT}`);
});
