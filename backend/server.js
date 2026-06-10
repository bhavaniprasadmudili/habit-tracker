const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const { initRealtime } = require('./realtime');
const authRoutes = require('./auth/auth.routes');
const habitRoutes = require('./habits/habit.routes');
const analyticsRoutes = require('./analytics/analytics.routes');
const dashboardRoutes = require('./analytics/dashboard.routes');
const adminRoutes = require('./auth/admin.routes');
const { initAdmin } = require('./utils/initAdmin');

console.log('Loaded env:', { EMAIL_USER: !!process.env.EMAIL_USER, EMAIL_PASS: !!process.env.EMAIL_PASS });




const app = express();
const server = http.createServer(app);
const io = initRealtime(server);

const PORT = process.env.PORT || 5000;

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);

const staticOptions = {
  etag: false,
  maxAge: 0,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    }
  },
};

app.use(express.static(path.join(__dirname, '..', 'frontend'), staticOptions));
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

async function start() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI is required in .env');
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
    await initAdmin();

    server.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
}

start();
