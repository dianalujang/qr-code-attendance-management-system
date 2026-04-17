const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Statistics
router.get('/statistics', studentController.getStatistics);

// CRUD operations
router.get('/', studentController.getAllStudents);
router.get('/:id', studentController.getStudent);
router.post('/', authorize('admin', 'staff'), studentController.createStudent);
router.put('/:id', authorize('admin', 'staff'), studentController.updateStudent);
router.delete('/:id', authorize('admin'), studentController.deleteStudent);

module.exports = router;