const db = require('../config/database');
const QRCode = require('qrcode');

exports.getAllStudents = async (req, res) => {
  try {
    const { department, year, status, search } = req.query;
    let query = 'SELECT * FROM students WHERE 1=1';
    const params = [];
    if (department) { query += ' AND department = ?'; params.push(department); }
    if (year) { query += ' AND year = ?'; params.push(year); }
    if (status) { query += ' AND status = ?'; params.push(status); }
    if (search) {
      query += ' AND (full_name LIKE ? OR student_id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    query += ' ORDER BY created_at DESC';
    const [students] = await db.query(query, params);
    res.json({ success: true, count: students.length, data: students });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getStudent = async (req, res) => {
  try {
    const [students] = await db.query('SELECT * FROM students WHERE id = ?', [req.params.id]);
    if (students.length === 0) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, data: students[0] });
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createStudent = async (req, res) => {
  try {
    const { student_id, full_name, email, phone, department, year } = req.body;

    if (!student_id || !full_name || !department || !year) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    const [existing] = await db.query('SELECT id FROM students WHERE student_id = ?', [student_id]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Student ID already exists' });
    }

    const qrData = `STUDENT:${student_id}:${Date.now()}`;
    const qrCodeImage = await QRCode.toDataURL(qrData);

    const [result] = await db.query(
      `INSERT INTO students 
      (student_id, full_name, email, phone, department, year, qr_code, qr_code_data, status, enrolled) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', true)`,
      [student_id, full_name, email || null, phone || null, department, year, qrCodeImage, qrData]
    );

    const [newStudent] = await db.query('SELECT * FROM students WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Student created successfully', data: newStudent[0] });
  } catch (error) {
    console.error('Create student error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const { full_name, email, phone, department, year, status } = req.body;
    const [existing] = await db.query('SELECT * FROM students WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Student not found' });
    await db.query(
      `UPDATE students SET full_name=?, email=?, phone=?, department=?, year=?, status=? WHERE id=?`,
      [
        full_name || existing[0].full_name,
        email || existing[0].email,
        phone || existing[0].phone,
        department || existing[0].department,
        year || existing[0].year,
        status || existing[0].status,
        req.params.id
      ]
    );
    const [updated] = await db.query('SELECT * FROM students WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Student updated successfully', data: updated[0] });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const [existing] = await db.query('SELECT id FROM students WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Student not found' });
    await db.query('DELETE FROM students WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getStatistics = async (req, res) => {
  try {
    const [totalStudents] = await db.query('SELECT COUNT(*) as total FROM students WHERE status = "active"');
    const [enrolledStudents] = await db.query('SELECT COUNT(*) as enrolled FROM students WHERE enrolled = true');
    const [departmentStats] = await db.query('SELECT department, COUNT(*) as count FROM students GROUP BY department');
    const [todayAttendance] = await db.query(
      `SELECT COUNT(*) as present FROM attendance WHERE attendance_date = CURDATE() AND status IN ('present', 'late')`
    );
    const totalCount = totalStudents[0].total;
    const presentCount = todayAttendance[0].present;
    res.json({
      success: true,
      data: {
        totalStudents: totalCount,
        enrolledQR: enrolledStudents[0].enrolled,
        presentToday: presentCount,
        absentToday: totalCount - presentCount,
        departmentDistribution: departmentStats
      }
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
