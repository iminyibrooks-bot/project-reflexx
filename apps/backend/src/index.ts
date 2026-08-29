import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import orderRoutes from './routes/order.routes';
import dispatchRoutes from './routes/dispatch.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || /\.vercel\.app$/.test(origin) || /\.app\.github\.dev$/.test(origin) || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'bypass-tunnel-reminder'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api', orderRoutes);
app.use('/api', dispatchRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => console.log(`[Project Reflex Backend] Active on port ${PORT}`));
}

export default app;
