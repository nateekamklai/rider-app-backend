const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const pool = require('./db');  // ต้องมี proper error handling
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] }
});

// Middleware
app.use(cors());
app.use(express.json());

// Environment Variables
const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';
const SECRET_KEY = process.env.SECRET_KEY || 'your-secret-key-change-this';

console.log(`Starting server in ${NODE_ENV} mode on port ${PORT}`);
console.log(`DATABASE_URL exists: ${!!process.env.DATABASE_URL}`);

// ==================== API Routes ====================
// (เหมือนเดิม...)

// ==================== Socket.IO Events ====================
// (เหมือนเดิม...)

// ==================== Start Server ====================
pool.query('SELECT NOW()', (err, result) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('Ensure DATABASE_URL is set correctly');
    process.exit(1);
  }
  
  console.log('✅ Database connection verified');
  
  server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
});
