const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:PASSWORD@sakura.proxy.rlwy.net:46865/railway'
});

const sql = `
CREATE TABLE IF NOT EXISTS drivers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_available BOOLEAN DEFAULT false,
  rating DECIMAL(3, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO drivers (name, phone, latitude, longitude, is_available, rating) VALUES
('ประสิทธิ เมืองทอง', '0812345678', 13.7563, 100.5018, true, 4.8),
('สมชาย รถแท็กซี่', '0898765432', 13.7480, 100.5060, true, 4.5),
('นายขับ ไรเดอร์', '0865432109', 13.7620, 100.4950, true, 4.9);
`;

pool.query(sql, (err, result) => {
  if (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
  console.log('✅ Tables created and data inserted successfully');
  pool.end();
});
