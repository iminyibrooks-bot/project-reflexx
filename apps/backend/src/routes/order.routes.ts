import { Router } from 'express';

const router = Router();

router.get('/orders', (req, res) => {
  res.json({ message: 'Order endpoint ready' });
});

export default router;
