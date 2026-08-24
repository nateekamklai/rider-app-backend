const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ตรวจสอบการเชื่อมต่อ
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ CRITICAL: Database connection failed!', err);
    console.error('DATABASE_URL:', process.env.DATABASE_URL);
    process.exit(1);
  }
  console.log('✅ Database connected successfully');
  release();
});

module.exports = pool;
