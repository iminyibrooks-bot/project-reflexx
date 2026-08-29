import express from 'express';
import cors from 'cors';

const app = express();

// CORS middleware — registered before routes
app.use(cors({ origin: '*' }));

// Explicit preflight handling
app.options('*', cors({ origin: '*' }));

app.use(express.json());

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'Live', message: 'API connected' });
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(5000, () => console.log('Server running on port 5000'));
}

export default app;
