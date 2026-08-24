// ไรเดอร์แอป - Backend (Node.js + Express)
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const pool = require('./db');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] }
});

// Middleware
app.use(cors());
app.use(express.json());

// ==================== Environment Variables ====================
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const SECRET_KEY = process.env.SECRET_KEY || 'your-secret-key-change-this';

console.log(`Starting server in ${NODE_ENV} mode on port ${PORT}`);
console.log(`Using SECRET_KEY from environment: ${SECRET_KEY.substring(0, 10)}...`);

// ==================== API Routes ====================

// 1. ลงทะเบียน
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, phone, email, password, userType } = req.body; // userType: 'driver' or 'passenger'
    
    const result = await pool.query(
      'INSERT INTO users (name, phone, email, password, user_type) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email',
      [name, phone, email, password, userType]
    );
    
    const token = jwt.sign({ userId: result.rows[0].id }, SECRET_KEY, { expiresIn: '7d' });
    res.json({ user: result.rows[0], token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. ล็อกอิน
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await pool.query(
      'SELECT id, name, email, user_type FROM users WHERE email = $1 AND password = $2',
      [email, password]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: result.rows[0].id }, SECRET_KEY, { expiresIn: '7d' });
    res.json({ user: result.rows[0], token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. ค้นหาไรเดอร์ใกล้เคียง (Nearby Drivers)
app.get('/api/drivers/nearby', async (req, res) => {
  try {
    const { latitude, longitude, radius } = req.query; // radius in km
    
    const result = await pool.query(
      `SELECT id, name, phone, latitude, longitude, rating,
              (6371 * acos(cos(radians($2)) * cos(radians(latitude)) * 
               cos(radians(longitude) - radians($1)) + sin(radians($2)) * 
               sin(radians(latitude)))) AS distance
       FROM drivers 
       WHERE is_available = true
       HAVING distance < $3
       ORDER BY distance
       LIMIT 10`,
      [longitude, latitude, radius || 5]
    );
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. อัปเดตตำแหน่งไรเดอร์
app.put('/api/drivers/:id/location', async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, is_available } = req.body;
    
    const result = await pool.query(
      'UPDATE drivers SET latitude = $1, longitude = $2, is_available = $3 WHERE id = $4 RETURNING *',
      [latitude, longitude, is_available, id]
    );
    
    // ส่งข้อมูลไปยัง socket clients
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
    
    const result = await pool.query(
      `INSERT INTO rides (passenger_id, pickup_latitude, pickup_longitude, 
                         dropoff_latitude, dropoff_longitude, estimated_fare, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *`,
      [passenger_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, estimated_fare]
    );
    
    // ส่งสัญญาณให้ไรเดอร์ทุกคน
    io.emit('new-ride-request', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. ยอมรับการขอโดยสาร
app.put('/api/rides/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;
    const { driver_id } = req.body;
    
    const result = await pool.query(
      'UPDATE rides SET driver_id = $1, status = $2 WHERE id = $3 RETURNING *',
      [driver_id, 'accepted', id]
    );
    
    io.emit('ride-accepted', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Socket.IO Events ====================

io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);
  
  // ผู้โดยสารค้นหาไรเดอร์
  socket.on('find-driver', (data) => {
    console.log('Passenger searching for driver:', data);
    socket.broadcast.emit('driver-needed', data);
  });
  
  // ไรเดอร์อัปเดตตำแหน่ง
  socket.on('driver-location', (data) => {
    io.emit('driver-location-updated', data);
  });
  
  // ปิดการเชื่อมต่อ
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start Server
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT} in ${NODE_ENV} mode`);
});
