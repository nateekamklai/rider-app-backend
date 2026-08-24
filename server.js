const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { 
    origin: process.env.FRONTEND_URL || "http://localhost:3000", 
    methods: ["GET", "POST"] 
  }
});

app.use(cors());
app.use(express.json());

// Health Check
app.get('/', (req, res) => {
  res.json({ status: 'Server running!', message: 'Rider App Backend' });
});

io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
