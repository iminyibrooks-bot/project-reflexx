import { Router } from 'express';
import { createDelivery } from '../controllers/delivery.controller';

const router = Router();

// POST /api/deliveries/create
router.post('/create', createDelivery);

export default router;
