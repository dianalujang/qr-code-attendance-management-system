const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Mark attendance
router.post('/mark', attendanceController.markAttendance);

// Get attendance
router.get('/', attendanceController.getAttendance);
router.get('/today', attendanceController.getTodayAttendance);
router.get('/weekly-stats', attendanceController.getWeeklyStats);
router.post('/mark-by-id', attendanceController.markAttendanceByStudentId);

module.exports = router;