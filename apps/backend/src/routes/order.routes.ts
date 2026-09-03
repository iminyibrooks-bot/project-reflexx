import { Router } from 'express';
import { createOrder, getOrders, scanOrder } from '../controllers/order.controller';

const router = Router();

router.post('/orders', createOrder);
router.get('/orders', getOrders);
router.post('/orders/:order_id/scan', scanOrder);

export default router;
