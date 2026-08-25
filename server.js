const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const pool = require('./db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // ต้อง npm install bcryptjs

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
    DROP TABLE IF EXISTS users CASCADE;
    DROP TABLE IF EXISTS drivers CASCADE;

    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      phone VARCHAR(20) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
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

    INSERT INTO users (phone, password, name) VALUES
    ('0812345678', '${bcrypt.hashSync('password123', 10)}', 'สมชาย ทดสอบ'),
    ('0898765432', '${bcrypt.hashSync('password123', 10)}', 'ปรเมศ ผู้ขับ'),
    ('0865432109', '${bcrypt.hashSync('password123', 10)}', 'นายขับ ไรเดอร์');

    INSERT INTO drivers (name, phone, latitude, longitude, is_available, rating) VALUES
    ('ประสิทธิ เมืองทอง', '0812345678', 13.7563, 100.5018, true, 4.8),
    ('สมชาย รถแท็กซี่', '0898765432', 13.7480, 100.5060, true, 4.5),
    ('นายขับ ไรเดอร์', '0865432109', 13.7620, 100.4950, true, 4.9);
  `;

  pool.query(sql, (err, result) => {
    if (err) {
      console.error('❌ Database initialization failed:', err.message);
    } else {
      console.log('✅ Database initialized successfully');
      console.log('📝 Test users created:');
      console.log('   Phone: 0812345678, Password: password123');
      console.log('   Phone: 0898765432, Password: password123');
      console.log('   Phone: 0865432109, Password: password123');
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
    const { phone, password, name } = req.body;

    // Validate input
    if (!phone || !password || !name) {
      return res.status(400).json({ error: 'Missing required fields: phone, password, name' });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Insert to database
    const result = await new Promise((resolve, reject) => {
      pool.query(
        'INSERT INTO users (phone, password, name) VALUES ($1, $2, $3) RETURNING id, phone, name',
        [phone, hashedPassword, name],
        (err, result) => {
          if (err) reject(err);
          else resolve(result);
        }
      );
    });

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, phone: user.phone }, SECRET_KEY, { expiresIn: '7d' });

    res.json({
      message: 'Registration successful',
      token,
      user: { id: user.id, phone: user.phone, name: user.name }
    });
  } catch (error) {
    if (error.message.includes('duplicate key')) {
      res.status(400).json({ error: 'Phone number already registered' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// 2. ล็อกอิน
app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Validate input
    if (!phone || !password) {
      return res.status(400).json({ error: 'Missing phone or password' });
    }

    // Find user in database
    const result = await new Promise((resolve, reject) => {
      pool.query(
        'SELECT id, phone, password, name FROM users WHERE phone = $1',
        [phone],
        (err, result) => {
          if (err) reject(err);
          else resolve(result);
        }
      );
    });

    // Check if user exists
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Phone or password is incorrect' });
    }

    const user = result.rows[0];

    // Verify password
    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Phone or password is incorrect' });
    }

    // Generate token
    const token = jwt.sign({ id: user.id, phone: user.phone }, SECRET_KEY, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, phone: user.phone, name: user.name }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. ค้นหาไรเดอร์ใกล้เคียง
app.get('/api/drivers/nearby', async (req, res) => {
  try {
    const { latitude, longitude, radius } = req.query;
    const radiusKm = parseFloat(radius) || 5;

    const result = await new Promise((resolve, reject) => {
      pool.query(
        `SELECT * FROM (
          SELECT id, name, phone, latitude, longitude, rating,
                  (6371 * acos(cos(radians($2)) * cos(radians(latitude)) * 
                   cos(radians(longitude) - radians($1)) + sin(radians($2)) * 
                   sin(radians(latitude)))) AS distance
          FROM drivers 
          WHERE is_available = true
        ) AS nearby
        WHERE distance < $3
        ORDER BY distance
        LIMIT 10`,
        [longitude, latitude, radiusKm],
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
