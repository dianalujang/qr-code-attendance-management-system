const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const authRoutes = require('./src/routes/authRoutes');
const studentRoutes = require('./src/routes/studentRoutes');
const attendanceRoutes = require('./src/routes/attendanceRoutes');

const app = express();

// ── Security Headers ──────────────────────────────────────────────────────────
app.use(helmet());
app.disable('x-powered-by');

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin && process.env.NODE_ENV !== 'production') return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ── Body Parsing (size limit prevents payload attacks) ────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Rate Limiting ─────────────────────────────────────────────────────────────

// Strict limiter for auth endpoints (brute force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,                     // 10 login attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Try again after 15 minutes.' }
});

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down.' }
});

// Attendance scan limiter (prevent flooding)
const attendanceLimiter = rateLimit({
  windowMs: 10 * 1000,        // 10 seconds
  max: 5,                      // 5 scans per 10 seconds per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Scanning too fast. Please wait a moment.' }
});

app.use('/api/auth', authLimiter);
app.use('/api/attendance/mark', attendanceLimiter);
app.use('/api', apiLimiter);

// ── Reusable Input Validators (import in route files) ─────────────────────────
const validateStudent = [
  body('student_id').trim().notEmpty().matches(/^[A-Za-z0-9_-]{2,20}$/)
    .withMessage('Student ID must be 2-20 alphanumeric characters'),
  body('full_name').trim().notEmpty().isLength({ max: 100 }).escape()
    .withMessage('Full name is required (max 100 chars)'),
  body('email').optional().trim().isEmail().normalizeEmail()
    .withMessage('Invalid email format'),
  body('phone').optional().trim().matches(/^\+?[0-9\s\-]{6,20}$/)
    .withMessage('Invalid phone number'),
  body('department').trim().notEmpty()
    .isIn(['Computer Science', 'Engineering', 'Business', 'Medicine'])
    .withMessage('Invalid department'),
  body('year').trim().notEmpty()
    .isIn(['1st Year', '2nd Year', '3rd Year', '4th Year'])
    .withMessage('Invalid year')
];

const validateAttendance = [
  body('student_id').trim().notEmpty().matches(/^[A-Za-z0-9_-]{2,20}$/)
    .withMessage('Invalid student ID format')
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array()
    });
  }
  next();
};

app.locals.validators = { validateStudent, validateAttendance, handleValidationErrors };

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production';
  console.error(`[${new Date().toISOString()}] ERROR:`, err.message);
  if (err.message?.includes('CORS')) {
    return res.status(403).json({ success: false, message: 'Not allowed by CORS' });
  }
  if (err.name === 'UnauthorizedError' || err.status === 401) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
  res.status(err.status || 500).json({
    success: false,
    message: isDev ? err.message : 'Internal server error'
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});