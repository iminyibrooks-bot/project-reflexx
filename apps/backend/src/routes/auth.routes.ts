import { Router } from 'express';
const router = Router();
router.post('/login', (req, res) => { res.json({ token: 'mock-token', user: { email: req.body.email } }); });
export default router;
