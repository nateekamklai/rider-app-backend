// Database Connection Pool
const { Pool } = require('pg');

// ใช้ DATABASE_URL จาก environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Error Handler
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Test Connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Database connected successfully');
  }
});

module.exports = pool;
