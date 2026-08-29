import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, password, role')
      .eq('email', email.trim());

    if (error || !users || users.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = users[0];

    const isBcryptMatch = await bcrypt.compare(password, user.password);
    const isDevMatch = password === user.password;

    if (!isBcryptMatch && !isDevMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err: any) {
    console.error('[Auth Login Error]:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
