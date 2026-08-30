import { Router } from 'express';
import { createOrder, getOrders } from '../controllers/order.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/orders', authenticateToken, createOrder);
router.get('/orders', authenticateToken, getOrders);

export default router;