const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { protect } = require('./middleware/auth');

// Load environment variables
dotenv.config();
const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploads static folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Payment screenshot storage (includes amount in filename)
const paymentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads/payments');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const clientName = req.user ? req.user.name.replace(/\s+/g, '_') : 'client';
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const timestamp = now.getTime();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const ext = path.extname(file.originalname);
    cb(null, `${clientName}_${dateStr}_${timestamp}_${randomSuffix}${ext}`);
  }
});
const uploadPayment = multer({ storage: paymentStorage });

// Chat image storage (uploads/chat/ folder)
const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads/chat');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const senderName = req.user ? req.user.name.replace(/\s+/g, '_') : 'user';
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const ts = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const ext = path.extname(file.originalname);
    cb(null, `chat_${senderName}_${ts}${ext}`);
  }
});
const uploadChat = multer({ 
  storage: chatStorage,
  limits: { fileSize: 3 * 1024 * 1024 }
});

// Payment screenshot upload endpoint
app.post('/api/uploads', protect, uploadPayment.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const fileUrl = `${backendUrl}/uploads/payments/${req.file.filename}`;
  return res.json({ url: fileUrl, filename: req.file.filename });
});

// Chat image upload endpoint with 3MB error handler
app.post('/api/uploads/chat', protect, (req, res) => {
  uploadChat.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size too large. Maximum size allowed is 3MB.' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(550).json({ error: err.message });
    }
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const fileUrl = `${backendUrl}/uploads/chat/${req.file.filename}`;
    return res.json({ url: fileUrl, filename: req.file.filename });
  });
});
// Profile photo storage (uploads/profiles/ folder)
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads/profiles');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const name = req.user ? req.user.name.replace(/\s+/g, '_') : 'user';
    const ext = path.extname(file.originalname);
    cb(null, `profile_${name}_${Date.now()}${ext}`);
  }
});
const uploadProfile = multer({ storage: profileStorage, limits: { fileSize: 5 * 1024 * 1024 } });

// Notes attachment storage (uploads/note/popupnote folder)
const notesStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads/note/popupnote');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const name = req.user ? req.user.name.replace(/\s+/g, '_') : 'user';
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '_');
    cb(null, `note_${base}_${Date.now()}${ext}`);
  }
});
const uploadNotes = multer({ storage: notesStorage, limits: { fileSize: 10 * 1024 * 1024 } });

// Profile photo upload endpoint
app.post('/api/uploads/profile', protect, (req, res) => {
  uploadProfile.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const fileUrl = `${backendUrl}/uploads/profiles/${req.file.filename}`;
    return res.json({ url: fileUrl, filename: req.file.filename });
  });
});

// Notes attachment upload endpoint
app.post('/api/uploads/notes', protect, (req, res) => {
  uploadNotes.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const fileUrl = `${backendUrl}/uploads/note/popupnote/${req.file.filename}`;
    return res.json({ url: fileUrl, filename: req.file.filename });
  });
});

// Logo image storage (uploads/admin/logo/ folder)
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads/admin/logo');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `brand_logo_${Date.now()}${ext}`);
  }
});
const uploadLogo = multer({ storage: logoStorage, limits: { fileSize: 5 * 1024 * 1024 } });

// Logo upload endpoint
app.post('/api/uploads/logo', protect, (req, res) => {
  uploadLogo.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const fileUrl = `/uploads/admin/logo/${req.file.filename}`;
    return res.json({ url: fileUrl, filename: req.file.filename });
  });
});

// Register API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/updates', require('./routes/updates'));
app.use('/api/credentials', require('./routes/credentials'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/schedules', require('./routes/schedules'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/home-cards', require('./routes/homeCards'));

// Default root route
app.get('/', (req, res) => {
  res.send('Strategic Brand Solutions API is running...');
});

// Port & Server configuration with WebSocket Support
const PORT = process.env.PORT || 5000;
const http = require('http');
const socketIo = require('socket.io');

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Map of online user IDs (socketId -> userId)
const onlineUsers = new Map();

io.on('connection', (socket) => {
  // Join registration room
  socket.on('register', (userId) => {
    socket.join(userId.toString());
    onlineUsers.set(socket.id, userId.toString());
    
    // Broadcast updated online status
    const activeUserIds = Array.from(new Set(onlineUsers.values()));
    io.emit('online_users', activeUserIds);
  });

  // Relay typing indicator
  socket.on('typing', ({ recipientId, isTyping }) => {
    socket.to(recipientId.toString()).emit('typing', {
      senderId: onlineUsers.get(socket.id),
      isTyping
    });
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.id);
    // Broadcast updated online status
    const activeUserIds = Array.from(new Set(onlineUsers.values()));
    io.emit('online_users', activeUserIds);
  });
});

app.set('socketio', io);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} with WebSocket support`);
});
