const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const pool = require('./db');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Middleware
app.use(cors());
app.use(express.json());

// Environment Variables
const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';
const SECRET_KEY = process.env.SECRET_KEY || 'your-secret-key-change-this';

console.log(`Starting server in ${NODE_ENV} mode on port ${PORT}`);

// ==================== Initialize Database ====================
const initDatabase = () => {
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

    INSERT INTO drivers (name, phone, latitude, longitude, is_available, rating) 
    SELECT 'ประสิทธิ เมืองทอง', '0812345678', 13.7563, 100.5018, true, 4.8
    WHERE NOT EXISTS (SELECT 1 FROM drivers WHERE name = 'ประสิทธิ เมืองทอง');

    INSERT INTO drivers (name, phone, latitude, longitude, is_available, rating) 
    SELECT 'สมชาย รถแท็กซี่', '0898765432', 13.7480, 100.5060, true, 4.5
    WHERE NOT EXISTS (SELECT 1 FROM drivers WHERE name = 'สมชาย รถแท็กซี่');

    INSERT INTO drivers (name, phone, latitude, longitude, is_available, rating) 
    SELECT 'นายขับ ไรเดอร์', '0865432109', 13.7620, 100.4950, true, 4.9
    WHERE NOT EXISTS (SELECT 1 FROM drivers WHERE name = 'นายขับ ไรเดอร์');
  `;

  pool.query(sql, (err, result) => {
    if (err) {
      console.error('❌ Database initialization failed:', err.message);
    } else {
      console.log('✅ Database initialized');
    }
  });
};

// ==================== API Routes ====================

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Rider App Backend is running ✅', version: '1.0.0' });
});

// 1. ลงทะเบียน
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, phone, email, password, userType } = req.body;
    
    res.json({ 
      message: 'Registration successful',
      user: { name, email, userType }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. ล็อกอิน
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: '7d' });
    res.json({ message: 'Login successful', token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. ค้นหาไรเดอร์ใกล้เคียง
app.get('/api/drivers/nearby', async (req, res) => {
  try {
    const { latitude, longitude, radius } = req.query;
    
    const result = await new Promise((resolve, reject) => {
      pool.query(
        `SELECT id, name, phone, latitude, longitude, rating,
                (6371 * acos(cos(radians($2)) * cos(radians(latitude)) * 
                 cos(radians(longitude) - radians($1)) + sin(radians($2)) * 
                 sin(radians(latitude)))) AS distance
         FROM drivers 
         WHERE is_available = true
         HAVING distance < $3
         ORDER BY distance
         LIMIT 10`,
        [longitude, latitude, radius || 5],
        (err, result) => {
          if (err) reject(err);
          else resolve(result);
        }
      );
    });
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error in /api/drivers/nearby:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 4. อัปเดตตำแหน่งไรเดอร์
app.put('/api/drivers/:id/location', async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, is_available } = req.body;
    
    const result = await new Promise((resolve, reject) => {
      pool.query(
        'UPDATE drivers SET latitude = $1, longitude = $2, is_available = $3 WHERE id = $4 RETURNING *',
        [latitude, longitude, is_available, id],
        (err, result) => {
          if (err) reject(err);
          else resolve(result);
        }
      );
    });
    
    io.emit('driver-location-updated', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. สร้างการขอโดยสาร
app.post('/api/rides', async (req, res) => {
  try {
    const { passenger_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, estimated_fare } = req.body;
    
    res.json({ 
      message: 'Ride request created',
      ride: { passenger_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, estimated_fare }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Socket.IO Events ====================
io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);
  
  socket.on('find-driver', (data) => {
    console.log('Passenger searching for driver:', data);
    socket.broadcast.emit('driver-needed', data);
  });
  
  socket.on('driver-location', (data) => {
    io.emit('driver-location-updated', data);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// ==================== Start Server ====================
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  initDatabase();
});

// Test database connection
pool.query('SELECT NOW()', (err, result) => {
  if (err) {
    console.error('❌ Database connection test failed:', err.message);
  } else {
    console.log('✅ Database connection verified');
  }
});
