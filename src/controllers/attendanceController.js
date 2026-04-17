const db = require('../config/database');

exports.markAttendance = async (req, res) => {
  try {
    const { qr_code_data, student_id } = req.body;

    if (!qr_code_data && !student_id) {
      return res.status(400).json({
        success: false,
        message: 'QR code data or Student ID is required'
      });
    }

    let query = 'SELECT * FROM students WHERE status = "active" AND ';
    let param;
    
    if (qr_code_data) {
      query += 'qr_code_data = ?';
      param = qr_code_data;
    } else {
      query += 'student_id = ?';
      param = student_id;
    }

    const [students] = await db.query(query, [param]);

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invalid QR code or student not found'
      });
    }

    const student = students[0];
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().split(' ')[0];

    const [existing] = await db.query(
      'SELECT * FROM attendance WHERE student_id = ? AND attendance_date = ?',
      [student.id, today]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for today'
      });
    }

    const isLate = currentTime > '08:30:00';
    const status = isLate ? 'late' : 'present';

    const [result] = await db.query(
      `INSERT INTO attendance 
      (student_id, attendance_date, check_in_time, method, status, marked_by) 
      VALUES (?, ?, ?, ?, ?, ?)`,
      [student.id, today, currentTime, qr_code_data ? 'qr_code' : 'manual', status, req.user ? req.user.id : null]
    );

    const [attendance] = await db.query(
      `SELECT a.*, s.student_id, s.full_name, s.department 
      FROM attendance a 
      JOIN students s ON a.student_id = s.id 
      WHERE a.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: `Attendance marked successfully - ${status}`,
      data: attendance[0]
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get all attendance records
exports.getAttendance = async (req, res) => {
  try {
    const [attendance] = await db.query(
      `SELECT a.*, s.student_id, s.full_name, s.department, s.year
      FROM attendance a 
      JOIN students s ON a.student_id = s.id 
      ORDER BY a.attendance_date DESC, a.check_in_time DESC`
    );

    res.json({
      success: true,
      data: attendance
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get today's attendance
exports.getTodayAttendance = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const [attendance] = await db.query(
      `SELECT a.*, s.student_id, s.full_name, s.department, s.year
      FROM attendance a 
      JOIN students s ON a.student_id = s.id 
      WHERE a.attendance_date = ?
      ORDER BY a.check_in_time DESC`,
      [today]
    );

    res.json({
      success: true,
      data: attendance
    });
  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get weekly stats
exports.getWeeklyStats = async (req, res) => {
  try {
    const [stats] = await db.query(
      `SELECT 
        DATE(attendance_date) as date,
        COUNT(*) as present_count,
        COUNT(CASE WHEN status = 'late' THEN 1 END) as late_count
      FROM attendance
      WHERE attendance_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(attendance_date)
      ORDER BY date DESC`
    );

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get weekly stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Mark attendance by student ID
exports.markAttendanceByStudentId = async (req, res) => {
  try {
    const { student_id } = req.body;

    if (!student_id) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required'
      });
    }

    const [students] = await db.query(
      'SELECT * FROM students WHERE student_id = ? AND status = "active"',
      [student_id]
    );

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const student = students[0];
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().split(' ')[0];

    const [existing] = await db.query(
      'SELECT * FROM attendance WHERE student_id = ? AND attendance_date = ?',
      [student.id, today]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for today'
      });
    }

    const isLate = currentTime > '08:30:00';
    const status = isLate ? 'late' : 'present';

    await db.query(
      `INSERT INTO attendance 
      (student_id, attendance_date, check_in_time, method, status, marked_by) 
      VALUES (?, ?, ?, ?, ?, ?)`,
      [student.id, today, currentTime, 'manual', status, req.user.id]
    );

    res.status(201).json({
      success: true,
      message: `Attendance marked successfully - ${status}`,
      data: {
        student_id: student.student_id,
        full_name: student.full_name,
        check_in_time: currentTime,
        status: status
      }
    });
  } catch (error) {
    console.error('Mark attendance by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};