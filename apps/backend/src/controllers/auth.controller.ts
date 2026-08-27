import { Request, Response } from 'express';
import { query } from '../config/db';
import { generateToken } from '../utils/auth';

export const registerUser = async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Missing required fields: name, email, password, role' });
  }

  try {
    // Check if user exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Insert user (Note: add bcrypt hashing in production middleware)
    const result = await query(
      `INSERT INTO users (name, email, password_hash, role) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, name, email, role, created_at`,
      [name, email, password, role]
    );

    const user = result.rows[0];
    const token = generateToken({ userId: user.id, role: user.role });

    return res.status(201).json({ user, token });
  } catch (error) {
    console.error('[Auth Controller Error]:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Password verification logic
    if (user.password_hash !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken({ userId: user.id, role: user.role });

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error('[Auth Login Error]:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
