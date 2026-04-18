import http from 'k6/http';
import { check, sleep } from 'k6';

// Robustness Test Configuration
export const options = {
  stages: [
    { duration: '30s', target: 50 },   
    { duration: '1m', target: 100 },   
    { duration: '30s', target: 0 },    
  ],
  thresholds: {
    http_req_duration: ['p(99)<3000'], 
    http_req_failed: ['rate<0.05'],    
  },
};

const BASE_URL = 'http://localhost:5000/api'; 

// Test 1: System handles invalid requests gracefully
export function testErrorHandling() {
  const invalidStudent = http.post(`${BASE_URL}/students`, JSON.stringify({
    student_id: '',  
    full_name: '',   
  }), {
    headers: { 'Content-Type': 'application/json' }
  });

  check(invalidStudent, {
    'Returns error status 400': (r) => r.status === 400,
    'Returns error message': (r) => r.json('message') !== undefined,
    'System still operational': (r) => r.status !== 500, 
  });
}

// Test 2: Concurrent QR generation (system stability)
export function testConcurrentQRGeneration() {
  const promises = [];
  
  // Generate 50 QR codes simultaneously
  for (let i = 0; i < 50; i++) {
    const response = http.post(`${BASE_URL}/students`, JSON.stringify({
      student_id: `SS${Date.now()}${i}`,
      full_name: `Test Student ${i}`,
      department: 'Computer Science',
      year: '1st Year'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

    check(response, {
      'QR generated under load': (r) => r.status === 200 || r.status === 201,
      'System doesn\'t crash': (r) => r.status !== 503,
    });
  }
}

// Test 3: Database connection resilience
export function testDatabaseResilience() {
  let successCount = 0;
  let failCount = 0;

  // Rapid-fire requests to test connection pool
  for (let i = 0; i < 20; i++) {
    const response = http.get(`${BASE_URL}/students/statistics`);
    
    if (response.status === 200) {
      successCount++;
    } else {
      failCount++;
    }
    
    sleep(0.1); // 100ms between requests
  }

  console.log(`Database Resilience: ${successCount}/20 successful`);
  
  // System should maintain >95% success rate
  const successRate = (successCount / 20) * 100;
  check(null, {
    'Database maintains availability': () => successRate >= 95,
  });
}

// Test 4: System recovery after errors
export function testSystemRecovery() {
  // 1. Cause an error
  const errorResponse = http.post(`${BASE_URL}/students`, '{}', {
    headers: { 'Content-Type': 'application/json' }
  });

  // 2. Verify error is handled
  check(errorResponse, {
    'Error handled gracefully': (r) => r.status === 400 || r.status === 422,
  });

  sleep(1);

  // 3. Verify system still works after error
  const recoveryResponse = http.get(`${BASE_URL}/students`);
  
  check(recoveryResponse, {
    'System recovered after error': (r) => r.status === 200,
    'System functional': (r) => r.body.length > 0,
  });
}

// Test 5: Attendance marking under concurrent load
export function testAttendanceRobustness() {
  const studentId = 'SS2024001';
  
  // Simulate multiple simultaneous scans of same student
  const responses = [];
  for (let i = 0; i < 5; i++) {
    responses.push(
      http.post(`${BASE_URL}/attendance`, JSON.stringify({
        student_id: studentId
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    );
  }

  // System should handle duplicate scans gracefully
  responses.forEach((r, i) => {
    check(r, {
      [`Duplicate scan ${i+1} handled`]: (r) => r.status === 200 || r.status === 400,
      'No system crash': (r) => r.status !== 500,
    });
  });
}

// Main test execution
export default function () {
  testErrorHandling();
  sleep(1);
  
  testConcurrentQRGeneration();
  sleep(1);
  
  testDatabaseResilience();
  sleep(1);
  
  testSystemRecovery();
  sleep(1);
  
  testAttendanceRobustness();
  sleep(2);
}

// Summary showing robustness metrics
export function handleSummary(data) {
  const failRate = (data.metrics.http_req_failed.values.rate * 100).toFixed(2);
  const avgDuration = data.metrics.http_req_duration.values.avg.toFixed(2);
  const maxDuration = data.metrics.http_req_duration.values.max.toFixed(2);
  
  console.log('\n========================================');
  console.log('  ROBUSTNESS & AVAILABILITY TEST RESULTS');
  console.log('========================================');
  console.log(`System Availability: ${(100 - failRate).toFixed(2)}%`);
  console.log(`Error Handling: ${failRate < 5 ? 'PASSED' : 'FAILED'}`);
  console.log(`Under Stress Performance: ${avgDuration}ms avg, ${maxDuration}ms max`);
  console.log(`System Stability: ${data.metrics.http_reqs.values.count} requests handled`);
  console.log('========================================\n');
  
  return {
    'stdout': JSON.stringify(data, null, 2),
  };
}