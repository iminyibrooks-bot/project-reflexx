import { Request, Response } from 'express';
import { supabase } from '../config/db'; // adjust path if db.ts lives elsewhere

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

  const { data, error } = await supabase
    .from('deliveries')
    .insert([
      {
        order_id,
        customer_name,
        phone_number,
        delivery_address,
        order_details,
        status: 'REQUESTED',
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('createOrder error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create order' });
  }

  return res.status(201).json({ success: true, data });
}

export async function getOrders(req: Request, res: Response) {
  const { data, error } = await supabase
    .from('deliveries')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getOrders error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }

  return res.status(200).json({ success: true, data });
      }

export async function scanOrder(req: Request, res: Response) {
  const { order_id } = req.params;
  const { rider_id, action } = req.body;

  if (!rider_id || !rider_id.trim()) {
    return res.status(400).json({ success: false, message: 'rider_id is required' });
  }

  const validActions = ['PICKED_UP', 'DELIVERED'];
  if (!action || !validActions.includes(action)) {
    return res.status(400).json({ success: false, message: 'action must be PICKED_UP or DELIVERED' });
  }

  const { data: existing, error: fetchError } = await supabase
    .from('deliveries')
    .select('*')
    .eq('order_id', order_id)
    .single();

  if (fetchError || !existing) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  const updateFields: Record<string, any> = { status: action };
  if (action === 'PICKED_UP') {
    updateFields.assigned_rider_id = rider_id;
  }

  const { data, error } = await supabase
    .from('deliveries')
    .update(updateFields)
    .eq('order_id', order_id)
    .select()
    .single();

  if (error) {
    console.error('scanOrder error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update order' });
  }

  return res.status(200).json({ success: true, data });
}
