import { Request, Response } from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { io } from '../index';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const VALID_STATUSES = ['REQUESTED', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];

// Statuses a delivery must currently be in for a transition to the given target to be allowed.
const ALLOWED_FROM_STATUSES: Record<string, string[]> = {
  ASSIGNED: ['REQUESTED'],
  PICKED_UP: ['ASSIGNED'],
  IN_TRANSIT: ['PICKED_UP'],
  DELIVERED: ['IN_TRANSIT'],
  CANCELLED: ['REQUESTED', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'],
};

const generateTrackingNumber = (): string => `ORD-${Date.now().toString(36).toUpperCase()}`;

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

    const cleanPhoneNumber = String(phone_number).replace(/[\s\-\(\)]/g, '');

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
        tracking_number,
        retailer_id,
        customer_name,
        phone_number,
        pickup_address,
        dropoff_address,
        order_details,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'REQUESTED')
      RETURNING *;
    `;

    const values = [
      generateTrackingNumber(),
      retailerId,
      customer_name,
      cleanPhoneNumber,
      finalPickupAddress,
      delivery_address,
      order_details,
    ];

    const result = await pool.query(queryText, values);
    const newDelivery = result.rows[0];

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

export const updateDeliveryStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, rider_id } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      });
      return;
    }

    const fromStatuses = ALLOWED_FROM_STATUSES[status];

    if (status === 'ASSIGNED' && !rider_id) {
      res.status(400).json({
        success: false,
        message: 'rider_id is required to assign a delivery',
      });
      return;
    }

    // Single conditional UPDATE: the WHERE clause only matches if the delivery is still
    // in a status this transition is allowed from, so two concurrent requests can't both
    // succeed against the same delivery (Postgres's row lock makes the check-and-set atomic).
    const result = await pool.query(
      `UPDATE deliveries
       SET status = $1,
           rider_id = COALESCE($2, rider_id),
           updated_at = NOW()
       WHERE id = $3 AND status = ANY($4::delivery_status[])
       RETURNING *;`,
      [status, rider_id || null, id, fromStatuses]
    );

    if (result.rowCount === 0) {
      res.status(409).json({
        success: false,
        message: 'Delivery not found, or it is no longer in a status that allows this transition',
      });
      return;
    }

    const updatedDelivery = result.rows[0];

    io.to(`delivery_${id}`).emit('delivery:status_updated', updatedDelivery);

    res.status(200).json({
      success: true,
      message: 'Delivery status updated successfully',
      data: updatedDelivery,
    });
  } catch (error) {
    console.error('Error updating delivery status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating delivery status',
    });
  }
};
