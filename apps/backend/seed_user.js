const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function seed() {
  try {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const query = `
      INSERT INTO users (name, email, password, role, shop_address)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE 
      SET password = EXCLUDED.password
      RETURNING id, email, role;
    `;
    const values = [
      'Test Retailer',
      'retailer@test.com',
      hashedPassword,
      'retailer',
      'Moi Avenue, Nairobi CBD'
    ];

    const res = await pool.query(query, values);
    console.log('✅ Retailer Account Ready:', res.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seed();
