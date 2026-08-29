import { Router } from 'express';

const router = Router();

router.get('/dispatch', (req, res) => {
  res.json({ message: 'Dispatch endpoint ready' });
});

export default router;
