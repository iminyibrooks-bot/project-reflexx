import { Router } from 'express';
import { createDelivery, updateDeliveryStatus } from '../controllers/delivery.controller';

const router = Router();

// POST /api/deliveries/create
router.post('/create', createDelivery);

// PATCH /api/deliveries/:id/status
router.patch('/:id/status', updateDeliveryStatus);

export default router;
