import { Request, Response } from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { io } from '../index';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export const createDelivery = async (req: Request, res: Response): Promise<void> => {
  try {
    const retailerId = (req as any).user?.id || req.body.retailer_id;

    if (!retailerId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: Retailer session not found',
      });
      return;
    }

    const { customer_name, phone_number, delivery_address, order_details, pickup_address } = req.body;

    if (!customer_name || !phone_number || !delivery_address || !order_details) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: customer_name, phone_number, delivery_address, or order_details',
      });
      return;
    }

    let finalPickupAddress = pickup_address;

    if (!finalPickupAddress) {
      const retailerQuery = await pool.query(
        `SELECT shop_address FROM users WHERE id = $1`,
        [retailerId]
      );
      finalPickupAddress = retailerQuery.rows[0]?.shop_address || 'Registered Shop Location';
    }

    const queryText = `
      INSERT INTO deliveries (
        retailer_id, 
        customer_name, 
        phone_number, 
        pickup_address, 
        delivery_address, 
        order_details, 
        status
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, 'Requested') 
      RETURNING *;
    `;

    const values = [
      retailerId,
      customer_name,
      phone_number,
      finalPickupAddress,
      delivery_address,
      order_details,
    ];

    const result = await pool.query(queryText, values);
    const newDelivery = result.rows[0];

    // Emit socket event automatically to all connected clients (Riders/Admins)
    io.emit('delivery:created', newDelivery);

    res.status(201).json({
      success: true,
      message: 'Delivery order created successfully',
      data: newDelivery,
    });
  } catch (error) {
    console.error('Error creating delivery:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while creating delivery order',
    });
  }
};
