import { query, pool } from './db';

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // 1. Create Mock Users
    const retailerRes = await query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ('Nairobi Hub', 'retailer@reflex.com', 'password123', 'RETAILER')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
    `);

    await query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ('Central Dispatch', 'dispatcher@reflex.com', 'password123', 'DISPATCHER')
      ON CONFLICT (email) DO NOTHING;
    `);

    await query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES
        ('Rider Mike', 'mike@reflex.com', 'password123', 'RIDER'),
        ('Rider Sarah', 'sarah@reflex.com', 'password123', 'RIDER')
      ON CONFLICT (email) DO NOTHING;
    `);

    console.log('✅ Users seeded successfully!');

    const retailerId = retailerRes.rows[0]?.id;

    if (!retailerId) {
      throw new Error('Could not retrieve Retailer ID for delivery seeding.');
    }

    // 2. Create Mock Deliveries aligned with Cess's Spec
    await query(`
      INSERT INTO deliveries
        (tracking_number, retailer_id, customer_name, phone_number, pickup_address, dropoff_address, order_details, status)
      VALUES
        ('ORD-1001', $1, 'Jane Wanjiku', '+254712345678', 'Nairobi CBD', 'Kilimani, Nairobi', '2 blue shirts, size M', 'REQUESTED'),
        ('ORD-1002', $1, 'John Kamau', '+254722998877', 'Westlands', 'Kileleshwa', 'Laptop charger & cables', 'REQUESTED'),
        ('ORD-1003', $1, 'Amina Ali', '+254733112233', 'Industrial Area', 'Upper Hill', 'Box of documents', 'REQUESTED')
      ON CONFLICT (tracking_number) DO NOTHING;
    `, [retailerId]);

    console.log('✅ Deliveries seeded successfully!');
    console.log('🎉 Seeding complete!');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
};

seedDatabase();
