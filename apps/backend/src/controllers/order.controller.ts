import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { supabase } from '../config/db';

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  const { item_name, quantity, delivery_address } = req.body;
  const retailer_id = req.user?.id;

  if (!item_name || !quantity || !delivery_address) {
    res.status(400).json({ error: 'item_name, quantity, and delivery_address are required' });
    return;
  }

  try {
    const { data: newOrder, error } = await supabase
      .from('orders')
      .insert([
        {
          retailer_id,
          item_name,
          quantity,
          delivery_address,
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('[Supabase Order Error]:', error);
      res.status(500).json({ error: 'Failed to create order' });
      return;
    }

    res.status(201).json({
      message: 'Order created successfully',
      order: newOrder
    });
  } catch (err) {
    console.error('[Create Order Exception]:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: 'Failed to fetch orders' });
      return;
    }

    res.status(200).json({ orders });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
