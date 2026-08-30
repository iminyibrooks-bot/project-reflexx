import { Router } from 'express';
import { createOrder, getOrders } from '../controllers/order.controller';

const router = Router();

router.post('/orders', createOrder);
router.get('/orders', getOrders);

export default router;
