import { Router } from 'express';
import { createDelivery, updateLocation } from '../controllers/delivery.controller';

const router = Router();

router.post('/create', createDelivery);
router.post('/location', updateLocation);

export default router;
