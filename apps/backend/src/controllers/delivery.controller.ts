import { Request, Response } from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

/**
 * @desc    Create a new delivery order for a retailer
 * @route   POST /api/deliveries/create
 * @access  Private (Retailer authenticated via JWT)
 */
export const createDelivery = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Extract retailer ID from authenticated JWT request user context
    const retailerId = (req as any).user?.id || req.body.retailer_id;

    if (!retailerId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: Retailer session not found',
      });
      return;
    }

    const { customer_name, phone_number, delivery_address, order_details, pickup_address } = req.body;

    // Validate mandatory frontend fields
    if (!customer_name || !phone_number || !delivery_address || !order_details) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: customer_name, phone_number, delivery_address, or order_details',
      });
      return;
    }

    // 2. Resolve pickup_address: Use provided value OR fallback to retailer's registered shop address
    let finalPickupAddress = pickup_address;

    if (!finalPickupAddress) {
      const retailerQuery = await pool.query(
        `SELECT shop_address FROM users WHERE id = $1`,
        [retailerId]
      );

      finalPickupAddress = retailerQuery.rows[0]?.shop_address || 'Registered Shop Location';
    }

    // 3. Insert new delivery record into database
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

    // 4. Return complete delivery object for UI rendering
    res.status(201).json({
      success: true,
      message: 'Delivery order created successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating delivery:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while creating delivery order',
    });
  }
};
