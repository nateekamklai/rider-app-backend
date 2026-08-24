-- ฐานข้อมูลสำหรับแอปไรเดอร์
-- ใช้กับ PostgreSQL + PostGIS

CREATE EXTENSION IF NOT EXISTS postgis;

-- ตาราผู้ใช้งาน
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  password VARCHAR(255) NOT NULL,
  user_type VARCHAR(20) CHECK (user_type IN ('driver', 'passenger')),
  profile_picture VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ตารางไรเดอร์ (ขับขี่)
CREATE TABLE drivers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  vehicle_type VARCHAR(50), -- motorcycle, car, etc.
  license_plate VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_available BOOLEAN DEFAULT false,
  rating DECIMAL(3, 2) DEFAULT 5.0,
  total_rides INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ตารางผู้โดยสาร
CREATE TABLE passengers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  home_latitude DECIMAL(10, 8),
  home_longitude DECIMAL(11, 8),
  work_latitude DECIMAL(10, 8),
  work_longitude DECIMAL(11, 8),
  rating DECIMAL(3, 2) DEFAULT 5.0,
  total_rides INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ตารางการขอโดยสาร
CREATE TABLE rides (
  id SERIAL PRIMARY KEY,
  passenger_id INTEGER NOT NULL REFERENCES passengers(id),
  driver_id INTEGER REFERENCES drivers(id),
  pickup_latitude DECIMAL(10, 8) NOT NULL,
  pickup_longitude DECIMAL(11, 8) NOT NULL,
  dropoff_latitude DECIMAL(10, 8) NOT NULL,
  dropoff_longitude DECIMAL(11, 8) NOT NULL,
  status VARCHAR(50) CHECK (status IN ('pending', 'accepted', 'in-progress', 'completed', 'cancelled')),
  estimated_fare DECIMAL(10, 2),
  actual_fare DECIMAL(10, 2),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ตารางการให้คะแนนและรีวิว
CREATE TABLE ratings (
  id SERIAL PRIMARY KEY,
  ride_id INTEGER NOT NULL REFERENCES rides(id),
  rater_id INTEGER NOT NULL REFERENCES users(id),
  ratee_id INTEGER NOT NULL REFERENCES users(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ตารางการชำระเงิน
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  ride_id INTEGER NOT NULL REFERENCES rides(id),
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50), -- cash, card, mobile_payment
  status VARCHAR(50) CHECK (status IN ('pending', 'completed', 'failed')),
  transaction_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index สำหรับการค้นหาเร็ว
CREATE INDEX idx_drivers_available ON drivers(is_available);
CREATE INDEX idx_drivers_location ON drivers(latitude, longitude);
CREATE INDEX idx_rides_status ON rides(status);
CREATE INDEX idx_rides_driver ON rides(driver_id);
CREATE INDEX idx_rides_passenger ON rides(passenger_id);
