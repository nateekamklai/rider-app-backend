const initDatabase = () => {
  const sql = `
    DROP TABLE IF EXISTS drivers CASCADE;
    DROP TABLE IF EXISTS users CASCADE;

    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      phone VARCHAR(20) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      user_type VARCHAR(50) DEFAULT 'passenger',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE drivers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      latitude DECIMAL(10, 8),
      longitude DECIMAL(11, 8),
      is_available BOOLEAN DEFAULT false,
      rating DECIMAL(3, 2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    INSERT INTO users (phone, password, name, user_type) VALUES
    ('0812345678', 'password123', 'user1', 'passenger'),
    ('0898765432', 'password123', 'user2', 'driver'),
    ('0865432109', 'password123', 'user3', 'driver');

    INSERT INTO drivers (name, phone, latitude, longitude, is_available, rating) VALUES
    ('user2', '0898765432', 13.7480, 100.5060, true, 4.5),
    ('user3', '0865432109', 13.7620, 100.4950, true, 4.9);
  `;

  pool.query(sql, (err, result) => {
    if (err) {
      console.error('❌ Database initialization failed:', err.message);
    } else {
      console.log('✅ Database initialized successfully');
    }
  });
};
