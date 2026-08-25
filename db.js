const initDatabase = () => {
  const sql = `
    DROP TABLE IF EXISTS drivers CASCADE;
    DROP TABLE IF EXISTS users CASCADE;

    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(20) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      user_type VARCHAR(50) DEFAULT 'passenger',
      profile_picture VARCHAR(255),
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

    INSERT INTO users (name, email, phone, password, user_type) VALUES
    ('user1', 'user1@test.com', '0812345678', 'password123', 'passenger'),
    ('user2', 'user2@test.com', '0898765432', 'password123', 'driver'),
    ('user3', 'user3@test.com', '0865432109', 'password123', 'driver');

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
