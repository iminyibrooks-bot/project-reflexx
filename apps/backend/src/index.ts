import express from 'express';
import cors from 'cors';
import orderRoutes from './routes/order.routes';

const app = express();

app.use(cors({ origin: '*' }));
app.options('*', cors({ origin: '*' }));
app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).json({ status: 'Live', message: 'Project Reflex API Root' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'Live', message: 'API connected' });
});

app.use('/api', orderRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;
