import { Request, Response } from 'express';
import { query } from '../config/db';

export const createDelivery = async (req: Request, res: Response) => {
  const { pickup_address, dropoff_address, retailer_id } = req.body;

  if (!pickup_address || !dropoff_address || !retailer_id) {
    return res.status(400).json({ error: 'pickup_address, dropoff_address, and retailer_id are required' });
  }

  const tracking_number = `RFX-${Math.floor(100000 + Math.random() * 900000)}`;

  try {
    const result = await query(
      `INSERT INTO deliveries (tracking_number, retailer_id, pickup_address, dropoff_address, status)
       VALUES ($1, $2, $3, $4, 'PENDING')
       RETURNING *`,
      [tracking_number, retailer_id, pickup_address, dropoff_address]
    );

    const delivery = result.rows[0];

    // Emit real-time broadcast to dispatchers
    const io = req.app.get('io');
    if (io) {
      io.to('dispatchers').emit('delivery_created', delivery);
    }

    return res.status(201).json(delivery);
  } catch (error) {
    console.error('[Delivery Controller Error]:', error);
    return res.status(500).json({ error: 'Failed to create delivery' });
  }
};

export const updateLocation = async (req: Request, res: Response) => {
  const { delivery_id, rider_id, latitude, longitude } = req.body;

  if (!delivery_id || !rider_id || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Missing location tracking parameters' });
  }

  try {
    await query(
      `INSERT INTO location_logs (delivery_id, rider_id, latitude, longitude)
       VALUES ($1, $2, $3, $4)`,
      [delivery_id, rider_id, latitude, longitude]
    );

    // Broadcast location update to active delivery room
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
