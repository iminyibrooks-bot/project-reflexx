import { Request, Response } from 'express';
import { query } from '../config/db';

export const createDelivery = async (req: Request, res: Response) => {
  const { customer_name, phone_number, pickup_address, delivery_address, order_details, retailer_id } = req.body;

  if (!customer_name || !phone_number || !pickup_address || !delivery_address || !order_details || !retailer_id) {
    return res.status(400).json({ 
      error: 'Missing required fields: customer_name, phone_number, pickup_address, delivery_address, order_details, retailer_id' 
    });
  }

  const tracking_number = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    const result = await query(
      `INSERT INTO deliveries 
        (tracking_number, retailer_id, customer_name, phone_number, pickup_address, dropoff_address, order_details, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'REQUESTED')
       RETURNING *`,
      [tracking_number, retailer_id, customer_name, phone_number, pickup_address, delivery_address, order_details]
    );

    const delivery = result.rows[0];

    const io = req.app.get('io');
    if (io) {
      io.to('dispatchers').emit('delivery_created', delivery);
    }

    return res.status(201).json(delivery);
  } catch (error) {
    console.error('[Delivery Controller Error]:', error);
    return res.status(500).json({ error: 'Failed to create order' });
  }
};

export const updateLocation = async (req: Request, res: Response) => {
  const { delivery_id, rider_id, latitude, longitude } = req.body;

  if (!delivery_id || !rider_id || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Missing location parameters' });
  }

  try {
    await query(
      `INSERT INTO location_logs (delivery_id, rider_id, latitude, longitude)
       VALUES ($1, $2, $3, $4)`,
      [delivery_id, rider_id, latitude, longitude]
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`delivery_${delivery_id}`).emit('location_update', {
        delivery_id,
        rider_id,
        latitude,
        longitude,
        timestamp: new Date(),
      });
    }

    return res.status(200).json({ status: 'Location updated' });
  } catch (error) {
    console.error('[Location Audit Error]:', error);
    return res.status(500).json({ error: 'Failed to log location' });
  }
};
