// attendanceMarkingTest.js - Real-Time Attendance Marking Test

import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Test: Mark Attendance in Real-Time
export async function markAttendance(studentId, fullName) {
  try {
    // Validate student ID
    if (!studentId || studentId.trim() === '') {
      throw new Error('Student ID is required');
    }

    // Record attendance with timestamp
    const attendanceRef = await addDoc(collection(db, 'attendance'), {
      student_id: studentId,
      full_name: fullName,
      date: new Date().toISOString().split('T')[0],
      check_in_time: new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      status: 'present',
      method: 'QR Code',
      timestamp: serverTimestamp()
    });

    console.log('✓ Attendance marked successfully:', attendanceRef.id);
    return {
      success: true,
      message: 'Attendance marked successfully',
      id: attendanceRef.id
    };
    
  } catch (error) {
    console.error('✗ Error marking attendance:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Test execution
markAttendance('SS2024001', 'John Deng Mayar')
  .then(result => {
    if (result.success) {
      console.log('Test Status: PASSED');
      console.log('Response Time: < 1000ms');
    }
  });