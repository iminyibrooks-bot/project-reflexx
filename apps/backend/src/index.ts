import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { checkDbConnection } from './config/db';
import authRoutes from './routes/auth.routes';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);

const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST', 'PATCH'],
  },
});

io.on('connection', (socket) => {
  console.log(`[Socket Connected]: ${socket.id}`);

  socket.on('join_room', (room: string) => {
    socket.join(room);
    console.log(`[Socket ${socket.id}] joined room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket Disconnected]: ${socket.id}`);
  });
});

app.set('io', io);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', system: 'Reflex Backend API', timestamp: new Date() });
});

const startServer = async () => {
  await checkDbConnection();
  server.listen(PORT, () => {
    console.log(`🚀 Reflex Backend Engine running on http://localhost:${PORT}`);
  });
};

startServer();
