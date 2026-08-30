import { Request, Response } from 'express';
import { pool } from '../config/db'; // adjust path if your pool lives elsewhere

const KENYAN_PHONE_REGEX = /^(?:\+254|0)7\d{8}$/;
const NAME_REGEX = /^[A-Za-z\s.'-]+$/;

function generateOrderId(): string {
  const rand = Math.floor(100 + Math.random() * 900);
  return `ORD-${rand}`;
}

export async function createOrder(req: Request, res: Response) {
  const { customer_name, phone_number, delivery_address, order_details } = req.body;

  if (!customer_name || !customer_name.trim() || !NAME_REGEX.test(customer_name)) {
    return res.status(400).json({ success: false, message: 'Invalid customer name' });
  }
  if (!phone_number || !KENYAN_PHONE_REGEX.test(phone_number)) {
    return res.status(400).json({ success: false, message: 'Invalid Kenyan phone number' });
  }
  if (!delivery_address || !delivery_address.trim()) {
    return res.status(400).json({ success: false, message: 'Delivery address is required' });
  }
  if (!order_details || !order_details.trim()) {
    return res.status(400).json({ success: false, message: 'Order details are required' });
  }

  const order_id = generateOrderId();
  const status = 'REQUESTED';

  try {
    const result = await pool.query(
      `INSERT INTO deliveries (order_id, customer_name, phone_number, delivery_address, order_details, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [order_id, customer_name, phone_number, delivery_address, order_details, status]
    );
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('createOrder error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create order' });
  }
}

export async function getOrders(req: Request, res: Response) {
  try {
    const result = await pool.query(`SELECT * FROM deliveries ORDER BY created_at DESC`);
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('getOrders error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
    }
