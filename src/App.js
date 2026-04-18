import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Users, Clock, UserCheck, Settings, LogOut, Home, FileText, UserPlus, Fingerprint, Calendar, Download, Search, Filter, TrendingUp, QrCode } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { authAPI, studentAPI, attendanceAPI } from './services/api';
import * as XLSX from 'xlsx';
import { db, auth } from './firebase';
import { collection, query, getDocs, getDoc, doc } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

const BiometricAttendanceSystem = () => {
  const [currentPage, setCurrentPage] = useState('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  
  const [students, setStudents] = useState([
    { id: 1, student_id: 'STU2001', full_name: 'John Deng Mayar', email: 'john.deng@university.edu', department: 'Computer Science', year: '3rd Year', enrolled: true, qr_code: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=SS2024001' },
    { id: 2, student_id: 'STU2002', full_name: 'Mary Akech Dut', email: 'mary.akech@university.edu', department: 'Engineering', year: '2nd Year', enrolled: true, qr_code: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=SS2024002' },
    { id: 3, student_id: 'STU2003', full_name: 'Peter Garang Bol', email: 'peter.garang@university.edu', department: 'Business', year: '4th Year', enrolled: true, qr_code: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=SS2024003' },
    { id: 4, student_id: 'STU2004', full_name: 'Sarah Nyandeng Mabior', email: 'sarah.nyandeng@university.edu', department: 'Medicine', year: '1st Year', enrolled: false, qr_code: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=SS2024004' },
    { id: 5, student_id: 'STU2005', full_name: 'James Kuol Manyang', email: 'james.kuol@university.edu', department: 'Computer Science', year: '2nd Year', enrolled: true, qr_code: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=SS2024005' },
    { id: 6, student_id: 'STU2006', full_name: 'Rebecca Achol Deng', email: 'rebecca.achol@university.edu', department: 'Engineering', year: '3rd Year', enrolled: true, qr_code: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=SS2024006' },
    { id: 7, student_id: 'STU2007', full_name: 'David Makuei Lueth', email: 'david.makuei@university.edu', department: 'Business', year: '1st Year', enrolled: true, qr_code: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=SS2024007' },
    { id: 8, student_id: 'STU2008', full_name: 'Grace Abuk Atem', email: 'grace.abuk@university.edu', department: 'Medicine', year: '4th Year', enrolled: false, qr_code: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=SS2024008' }
  ]);
  
  const [attendanceRecords, setAttendanceRecords] = useState([
    { id: 1, student_id: 'STU2001', full_name: 'John Deng Mayar', check_in_time: '08:15 AM', status: 'present', method: 'QR Code' },
    { id: 2, student_id: 'STU2002', full_name: 'Mary Akech Dut', check_in_time: '08:20 AM', status: 'present', method: 'QR Code' },
    { id: 3, student_id: 'STU2005', full_name: 'James Kuol Manyang', check_in_time: '08:45 AM', status: 'late', method: 'QR Code' },
    { id: 4, student_id: 'STU2006', full_name: 'Rebecca Achol Deng', check_in_time: '08:10 AM', status: 'present', method: 'QR Code' },
    { id: 5, student_id: 'STU2007', full_name: 'David Makuei Lueth', check_in_time: '08:30 AM', status: 'present', method: 'QR Code' }
  ]);

  const [stats, setStats] = useState({
    totalStudents: 8,
    presentToday: 5,
    absentToday: 3,
    enrolledQR: 6
  });

  const weeklyAttendance = [
    { day: 'Mon', present: 3, absent: 1 },
    { day: 'Tue', present: 4, absent: 0 },
    { day: 'Wed', present: 3, absent: 1 },
    { day: 'Thu', present: 4, absent: 0 },
    { day: 'Fri', present: 2, absent: 2 },
  ];

  const departmentData = [
    { name: 'Computer Science', value: 1 },
    { name: 'Engineering', value: 1 },
    { name: 'Business', value: 1 },
    { name: 'Medicine', value: 1 },
  ];

  const COLORS = ['#475569', '#10b981', '#f59e0b', '#3b82f6'];

  useEffect(() => {
  // Listen for auth state changes
  const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      // User is signed in
      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        full_name: firebaseUser.displayName || 'Admin'
      };
      setUser(userData);
      setIsLoggedIn(true);
      setCurrentPage('dashboard');
      console.log('User authenticated:', userData);
    } else {
      // User is signed out
      setUser(null);
      setIsLoggedIn(false);
      setCurrentPage('login');
    }
  });

  // Cleanup subscription
  return () => unsubscribe();
}, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchStudents();
      fetchStatistics();
      fetchTodayAttendance();
    }
  }, [isLoggedIn]);

  const fetchStudents = async () => {
    try {
      const response = await studentAPI.getAll();
      setStudents(response.data.data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await studentAPI.getStatistics();
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const response = await attendanceAPI.getToday();
      setAttendanceRecords(response.data.data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setAttendanceRecords([]);
    }
  };

  const handleLogin = async () => {
  if (!email || !password) {
    setError('Please enter email and password');
    return;
  }

  setLoading(true);
  setError('');

  try {
    // Sign in with Firebase Authentication
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    console.log('Logged in user:', firebaseUser);
    
    // Fetch user role from Firestore
    const userDoc = await getDocs(query(collection(db, 'users')));
    const userRole = userDoc.docs.find(doc => doc.id === firebaseUser.uid);
    
    if (!userRole) {
      setError('User role not found. Contact administrator.');
      await signOut(auth);
      setLoading(false);
      return;
    }
    
    const roleData = userRole.data();
    
    // Save user info with role
    const userData = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      full_name: roleData.full_name || firebaseUser.displayName || 'User',
      role: roleData.role,  // 'admin' or 'faculty'
      department: roleData.department || ''
    };
    
    localStorage.setItem('user', JSON.stringify(userData));
    
    setUser(userData);
    setIsLoggedIn(true);
    setCurrentPage('dashboard');
    setEmail('');
    setPassword('');
  } catch (error) {
    console.error('Login error:', error);
    
    if (error.code === 'auth/user-not-found') {
      setError('No account found with this email');
    } else if (error.code === 'auth/wrong-password') {
      setError('Incorrect password');
    } else if (error.code === 'auth/invalid-email') {
      setError('Invalid email format');
    } else if (error.code === 'auth/invalid-credential') {
      setError('Invalid email or password');
    } else {
      setError(error.message || 'Login failed. Please try again.');
    }
  } finally {
    setLoading(false);
  }
};

  const handleLogout = useCallback(async () => {
  try {
    await signOut(auth);
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setCurrentPage('login');
    setEmail('');
    setPassword('');
    setUser(null);
    setStudents([]);
    setAttendanceRecords([]);
  } catch (error) {
    console.error('Logout error:', error);
  }
}, []);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  }, [email, password]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-10 relative z-10">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-br from-slate-700 to-slate-900 p-5 rounded-2xl shadow-lg">
                <QrCode className="w-14 h-14 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">QR Code Attendance</h1>
            <p className="text-slate-500 font-medium">South Sudan Universities System</p>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition outline-none disabled:bg-slate-100"
                placeholder="admin@university.edu"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition outline-none disabled:bg-slate-100"
                placeholder="••••••••"
              />
            </div>
            
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-gradient-to-r from-slate-700 to-slate-900 text-white py-3.5 rounded-xl font-semibold hover:from-slate-800 hover:to-slate-950 transition duration-300 shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              Account: <span className="font-semibold">admin@university.edu</span> / <span className="font-semibold">admin123</span>
            </p>
            <p className="text-sm text-slate-600">
    <span className="font-semibold">Faculty:</span> lecturer@university.edu / lecturer123
  </p>
          </div>
        </div>
      </div>
    );
  }

  const DashboardPage = () => {
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showQRCodes, setShowQRCodes] = useState(false);

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Dashboard Overview</h2>
            <p className="text-slate-500 mt-1">Welcome back, monitor your attendance system</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowQRCodes(!showQRCodes)}
              className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 py-2 rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition shadow-lg font-semibold flex items-center gap-2"
            >
              <QrCode className="w-5 h-5" />
              {showQRCodes ? 'Hide QR Codes' : 'Show QR Codes'}
            </button>
            <div className="text-sm text-slate-500">
              <Calendar className="w-4 h-4 inline mr-1" />
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl shadow-md p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-semibold">Total Students</p>
                <p className="text-4xl font-bold text-slate-800 mt-2">{stats.totalStudents}</p>
                <p className="text-xs text-slate-500 mt-2 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Active enrollment
                </p>
              </div>
              <div className="bg-slate-700 p-4 rounded-xl">
                <Users className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl shadow-md p-6 border border-emerald-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-700 text-sm font-semibold">Present Today</p>
                <p className="text-4xl font-bold text-emerald-900 mt-2">{stats.presentToday}</p>
                <p className="text-xs text-emerald-600 mt-2 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {stats.totalStudents > 0 ? ((stats.presentToday / stats.totalStudents) * 100).toFixed(0) : 0}% attendance rate
                </p>
              </div>
              <div className="bg-emerald-600 p-4 rounded-xl">
                <UserCheck className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-md p-6 border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-700 text-sm font-semibold">Absent Today</p>
                <p className="text-4xl font-bold text-red-900 mt-2">{stats.absentToday}</p>
                <p className="text-xs text-red-600 mt-2 flex items-center">
                  Needs attention
                </p>
              </div>
              <div className="bg-red-600 p-4 rounded-xl">
                <Clock className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl shadow-md p-6 border border-indigo-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-700 text-sm font-semibold">QR Enrolled</p>
                <p className="text-4xl font-bold text-indigo-900 mt-2">{stats.enrolledQR}</p>
                <p className="text-xs text-indigo-600 mt-2 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {stats.totalStudents > 0 ? ((stats.enrolledQR / stats.totalStudents) * 100).toFixed(0) : 0}% enrolled
                </p>
              </div>
              <div className="bg-indigo-600 p-4 rounded-xl">
      <QrCode className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>

        {showQRCodes && (
          <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Student QR Codes - Click to View Full Size</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {students.filter(s => s.qr_code).map((student) => (
                <div 
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200 hover:border-indigo-500 cursor-pointer transition text-center"
                >
                  <img 
                    src={student.qr_code} 
                    alt={`QR Code for ${student.student_id}`}
                    className="w-full h-auto mb-2"
                  />
                  <p className="font-semibold text-slate-800 text-sm">{student.full_name}</p>
                  <p className="text-xs text-slate-600">{student.student_id}</p>
                  <p className="text-xs text-slate-500 mt-1">{student.department}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedStudent && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedStudent(null)}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <h3 className="text-2xl font-bold text-slate-800 mb-2">{selectedStudent.full_name}</h3>
                <p className="text-slate-600 mb-1">ID: {selectedStudent.student_id}</p>
                <p className="text-slate-500 text-sm mb-4">{selectedStudent.department} - {selectedStudent.year}</p>
                
                <div className="bg-slate-50 p-6 rounded-xl inline-block mb-4">
                  <img 
                    src={selectedStudent.qr_code} 
                    alt={`QR Code for ${selectedStudent.student_id}`}
                    className="w-64 h-64"
                  />
                </div>

                <p className="text-sm text-slate-600 mb-4">
                  Scan this QR code with your phone or use the "Scan Attendance" page
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = selectedStudent.qr_code;
                      link.download = `${selectedStudent.student_id}_QRCode.png`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-3 rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition shadow-lg font-semibold flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download
                  </button>
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="flex-1 bg-slate-200 text-slate-700 px-6 py-3 rounded-xl hover:bg-slate-300 transition font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Weekly Attendance Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyAttendance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                />
                <Legend />
                <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} name="Present" />
                <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} name="Absent" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Department Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={departmentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {departmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
          <h3 className="text-xl font-bold text-slate-800 mb-4">Recent Attendance Activity</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-slate-700 font-semibold">Student ID</th>
                  <th className="text-left py-3 px-4 text-slate-700 font-semibold">Name</th>
                  <th className="text-left py-3 px-4 text-slate-700 font-semibold">Time</th>
                  <th className="text-left py-3 px-4 text-slate-700 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.slice(0, 5).map((record) => (
                  <tr key={record.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td className="py-4 px-4 text-slate-600">{record.student_id}</td>
                    <td className="py-4 px-4 font-medium text-slate-800">{record.full_name}</td>
                    <td className="py-4 px-4 text-slate-600">{record.check_in_time || '-'}</td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                        record.status === 'present' || record.status === 'late'
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : 'Unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };
  const FacultyDashboardPage = () => {
  const [myClasses, setMyClasses] = useState([
    { id: 1, name: 'Computer Science 101', time: 'Mon, Wed 9:00 AM', students: 45 },
    { id: 2, name: 'Data Structures', time: 'Tue, Thu 2:00 PM', students: 38 }
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-800">Faculty Dashboard</h2>
        <p className="text-slate-500 mt-1">Welcome back, {user?.full_name}</p>
        <p className="text-sm text-slate-400">Department: {user?.department}</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-md p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-700 text-sm font-semibold">My Classes</p>
              <p className="text-4xl font-bold text-blue-900 mt-2">{myClasses.length}</p>
            </div>
            <div className="bg-blue-600 p-4 rounded-xl">
              <FileText className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl shadow-md p-6 border border-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-700 text-sm font-semibold">Total Students</p>
              <p className="text-4xl font-bold text-emerald-900 mt-2">
                {myClasses.reduce((sum, cls) => sum + cls.students, 0)}
              </p>
            </div>
            <div className="bg-emerald-600 p-4 rounded-xl">
              <Users className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-md p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-700 text-sm font-semibold">Today's Classes</p>
              <p className="text-4xl font-bold text-purple-900 mt-2">2</p>
            </div>
            <div className="bg-purple-600 p-4 rounded-xl">
              <Calendar className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* My Classes */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
        <h3 className="text-xl font-bold text-slate-800 mb-4">My Classes</h3>
        <div className="space-y-4">
          {myClasses.map((cls) => (
            <div key={cls.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 transition">
              <div>
                <h4 className="font-bold text-slate-800">{cls.name}</h4>
                <p className="text-sm text-slate-600">{cls.time}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Students</p>
                <p className="text-2xl font-bold text-slate-800">{cls.students}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
        <h3 className="text-xl font-bold text-slate-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => setCurrentPage('scan')}
            className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-4 rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition shadow-lg font-semibold flex items-center justify-center gap-2"
          >
            <QrCode className="w-5 h-5" />
            Take Attendance
          </button>
          <button 
            onClick={() => setCurrentPage('attendance')}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-xl hover:from-blue-700 hover:to-blue-800 transition shadow-lg font-semibold flex items-center justify-center gap-2"
          >
            <FileText className="w-5 h-5" />
            View Reports
          </button>
          <button className="bg-gradient-to-r from-slate-600 to-slate-700 text-white p-4 rounded-xl hover:from-slate-700 hover:to-slate-800 transition shadow-lg font-semibold flex items-center justify-center gap-2">
            <UserPlus className="w-5 h-5" />
            Manage Students
          </button>
        </div>
      </div>
    </div>
  );
};

  const StudentsPage = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudent, setNewStudent] = useState({
    student_id: '',
    full_name: '',    
    email: '',
    phone: '',
    department: '',
    year: ''
  });
    const [addLoading, setAddLoading] = useState(false);
    const [addError, setAddError] = useState('');

    const handleAddStudent = async () => {
      if (!newStudent.student_id || !newStudent.full_name || !newStudent.department || !newStudent.year) {
        setAddError('Please fill all required fields');
        return;
      }

      setAddLoading(true);
      setAddError('');

      try {
        await studentAPI.create(newStudent);
        await fetchStudents();
        
        setShowAddModal(false);
        setNewStudent({
          student_id: '',
          full_name: '',
          email: '',
          phone: '',
          department: '',
          year: ''
        });
        alert('Student added successfully with QR code!');
      } catch (error) {
        setAddError(error.response?.data?.message || 'Failed to add student');
      } finally {
        setAddLoading(false);
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Student Management</h2>
            <p className="text-slate-500 mt-1">Manage student records and enrollment</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-slate-700 to-slate-900 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:from-slate-800 hover:to-slate-950 transition shadow-lg font-semibold">
            <UserPlus className="w-5 h-5" />
            Add Student
          </button>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search students by name or ID..."
                className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition"
              />
            </div>
            <button className="px-5 py-3 border-2 border-slate-200 rounded-xl flex items-center gap-2 hover:bg-slate-50 transition font-medium text-slate-700">
              <Filter className="w-5 h-5" />
              Filter
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-slate-700 font-semibold">Student ID</th>
                  <th className="text-left py-3 px-4 text-slate-700 font-semibold">Full Name</th>
                  <th className="text-left py-3 px-4 text-slate-700 font-semibold">Department</th>
                  <th className="text-left py-3 px-4 text-slate-700 font-semibold">Year</th>
                  <th className="text-left py-3 px-4 text-slate-700 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 text-slate-700 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students && students.length > 0 ? (
                  students.map((student) => (
                    <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                      <td className="py-4 px-4 text-slate-600 font-medium">{student.student_id}</td>
                      <td className="py-4 px-4 font-semibold text-slate-800">{student.full_name}</td>
                      <td className="py-4 px-4 text-slate-600">{student.department}</td>
                      <td className="py-4 px-4 text-slate-600">{student.year}</td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                          student.enrolled 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {student.enrolled ? 'Enrolled' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <button className="text-slate-600 hover:text-slate-900 mr-4 font-medium">Edit</button>
                        <button className="text-red-600 hover:text-red-800 font-medium">Delete</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-500">
                      No students found. Add your first student!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
              <h3 className="text-2xl font-bold text-slate-800 mb-6">Add New Student</h3>
              
              {addError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                  {addError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Student ID *</label>
                  <input
                    type="text"
                    value={newStudent.student_id}
                    onChange={(e) => setNewStudent({...newStudent, student_id: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition"
                    placeholder="STU000"
                  />
                </div>
                <div>
  <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name *</label>
  <input
    type="text"
    value={newStudent.full_name || ''}
    onChange={(e) => setNewStudent({...newStudent, full_name: e.target.value})}
    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition"
    placeholder="John Doe"
  />
</div>
                  <div>
    <label className="block text-sm font-semibold text-slate-700 mb-2">Phone</label>
    <input
      type="tel"
      value={newStudent.phone}
      onChange={(e) => setNewStudent({...newStudent, phone: e.target.value})}
      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition"
      placeholder="+211123456789"
    />
  </div>
  <div>
    <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
    <input
      type="email"
      value={newStudent.email}
      onChange={(e) => setNewStudent({...newStudent, email: e.target.value})}
      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition"
      placeholder="john@university.edu"
    />
  </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Department *</label>
                  <select
                    value={newStudent.department}
                    onChange={(e) => setNewStudent({...newStudent, department: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition"
                  >
                    <option value="">Select department</option>
                    <option>Computer Science</option>
                    <option>Engineering</option>
                    <option>Business</option>
                    <option>Medicine</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Year *</label>
                  <select
                    value={newStudent.year}
                    onChange={(e) => setNewStudent({...newStudent, year: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition"
                  >
                    <option value="">Select year</option>
                    <option>1st Year</option>
                    <option>2nd Year</option>
                    <option>3rd Year</option>
                    <option>4th Year</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleAddStudent}
                  disabled={addLoading}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-3 rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition shadow-lg font-semibold disabled:opacity-50"
                >
                  {addLoading ? 'Adding...' : 'Add Student'}
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setAddError('');
                  }}
                  className="flex-1 bg-slate-200 text-slate-700 px-6 py-3 rounded-xl hover:bg-slate-300 transition font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const ScanAttendancePage = () => {
    const [studentId, setStudentId] = useState('');
    const [scanning, setScanning] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [recentScans, setRecentScans] = useState([]);
    const [mode, setMode] = useState('manual'); // 'manual' | 'camera'
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const scannerRef = useRef(null);
    const html5QrRef = useRef(null);

    const handleMarkAttendance = async (id) => {
      const idToMark = (id || studentId).trim();
      if (!idToMark) {
        setMessage('Please enter a student ID');
        setMessageType('error');
        return;
      }
      if (!/^[A-Za-z0-9_:-]{2,50}$/.test(idToMark)) {
        setMessage('Invalid student ID format');
        setMessageType('error');
        return;
      }

      setScanning(true);
      setMessage('');

      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const token = await currentUser.getIdToken(true);
          localStorage.setItem('authToken', token);
        }
        const response = await attendanceAPI.markAttendance({ student_id: idToMark });
        const data = response.data.data;
        setMessage(`✓ Attendance marked for ${data.full_name}`);
        setMessageType('success');
        setStudentId('');
        setRecentScans(prev => [data, ...prev.slice(0, 4)]);
        await fetchTodayAttendance();
        await fetchStatistics();
      } catch (error) {
        if (error.response?.status === 401) setMessage('Session expired. Please log in again.');
        else if (error.response?.status === 404) setMessage(`Student ID "${idToMark}" not found.`);
        else if (error.response?.status === 409) setMessage('Attendance already recorded for this student today.');
        else setMessage(error.response?.data?.message || 'Failed to mark attendance.');
        setMessageType('error');
      } finally {
        setScanning(false);
      }
    };

    const handleKeyPress = (e) => {
      if (e.key === 'Enter') handleMarkAttendance();
    };

    // Extract student ID from QR data: format is "STUDENT:STU001:timestamp"
    const parseQRData = (qrData) => {
      if (qrData.startsWith('STUDENT:')) {
        const parts = qrData.split(':');
        return parts[1] || qrData;
      }
      return qrData.trim();
    };

    const startCamera = async () => {
      setCameraError('');
      setCameraActive(true);

      // Dynamically load html5-qrcode
      if (!window.Html5Qrcode) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js';
        script.onload = () => initScanner();
        script.onerror = () => setCameraError('Failed to load camera library. Check your internet connection.');
        document.head.appendChild(script);
      } else {
        initScanner();
      }
    };

    const initScanner = () => {
      setTimeout(() => {
        if (!document.getElementById('qr-reader')) return;
        try {
          html5QrRef.current = new window.Html5Qrcode('qr-reader');
          html5QrRef.current.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
              const studentIdFromQR = parseQRData(decodedText);
              stopCamera();
              setMode('manual');
              setMessage('');
              handleMarkAttendance(studentIdFromQR);
            },
            () => {} // ignore scan errors (frame not ready etc.)
          ).catch((err) => {
            setCameraError('Could not access camera. Please allow camera permission and try again.');
            setCameraActive(false);
          });
        } catch (err) {
          setCameraError('Camera initialisation failed: ' + err.message);
          setCameraActive(false);
        }
      }, 300);
    };

    const stopCamera = () => {
      if (html5QrRef.current) {
        html5QrRef.current.stop().catch(() => {});
        html5QrRef.current = null;
      }
      setCameraActive(false);
    };

    // Stop camera when leaving page
    useEffect(() => {
      return () => { if (html5QrRef.current) html5QrRef.current.stop().catch(() => {}); };
    }, []);

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Scan Attendance</h2>
          <p className="text-slate-500 mt-1">Scan student QR codes or enter ID manually</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-3">
          <button
            onClick={() => { stopCamera(); setMode('manual'); setMessage(''); }}
            className={`px-6 py-2.5 rounded-xl font-semibold transition ${
              mode === 'manual'
                ? 'bg-slate-800 text-white shadow-lg'
                : 'bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            ✏️ Manual Entry
          </button>
          <button
            onClick={() => { setMode('camera'); setMessage(''); startCamera(); }}
            className={`px-6 py-2.5 rounded-xl font-semibold transition ${
              mode === 'camera'
                ? 'bg-slate-800 text-white shadow-lg'
                : 'bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            📷 Camera Scan
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-md p-8 border border-slate-200">

            {/* Feedback message */}
            {message && (
              <div className={`mb-4 p-4 rounded-xl ${
                messageType === 'success'
                  ? 'bg-emerald-100 border border-emerald-400 text-emerald-700'
                  : 'bg-red-100 border border-red-400 text-red-700'
              }`}>
                {message}
              </div>
            )}

            {/* Manual Entry */}
            {mode === 'manual' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-800 mb-2">Manual Entry</h3>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Student ID</label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter student ID"
                    className="w-full px-4 py-4 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition text-lg"
                    autoFocus
                  />
                </div>
                <button
                  onClick={() => handleMarkAttendance()}
                  disabled={scanning || !studentId}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-4 rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition shadow-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {scanning ? 'Marking...' : 'Mark Attendance'}
                </button>
                <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-600">
                  <p className="font-semibold mb-1">Instructions:</p>
                  <p>• Type the student ID and press Enter or click Mark Attendance</p>
                </div>
              </div>
            )}

            {/* Camera Scanner */}
            {mode === 'camera' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-800 mb-2">Camera Scanner</h3>

                {cameraError && (
                  <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-xl text-sm">
                    {cameraError}
                  </div>
                )}

                {/* QR scanner viewport */}
                <div className="relative">
                  <div
                    id="qr-reader"
                    ref={scannerRef}
                    className="w-full rounded-xl overflow-hidden border-2 border-slate-200"
                    style={{ minHeight: '300px' }}
                  />
                  {!cameraActive && !cameraError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-100 rounded-xl">
                      <div className="text-center">
                        <div className="text-5xl mb-3">📷</div>
                        <p className="text-slate-500 font-medium">Starting camera...</p>
                      </div>
                    </div>
                  )}
                </div>

                {cameraActive && (
                  <button
                    onClick={() => { stopCamera(); setMode('manual'); }}
                    className="w-full bg-red-100 text-red-700 px-6 py-3 rounded-xl hover:bg-red-200 transition font-semibold border border-red-300"
                  >
                    ✕ Stop Camera
                  </button>
                )}

                {cameraError && (
                  <button
                    onClick={() => { setCameraError(''); startCamera(); }}
                    className="w-full bg-slate-800 text-white px-6 py-3 rounded-xl hover:bg-slate-900 transition font-semibold"
                  >
                    Try Again
                  </button>
                )}

                <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-600">
                  <p className="font-semibold mb-1">Instructions:</p>
                  <p>• Point the camera at the student's QR code</p>
                  <p>• Hold steady — attendance marks automatically</p>
                  <p>• Allow camera permission if prompted</p>
                </div>
              </div>
            )}
          </div>

          {/* Recent Scans */}
          <div className="bg-white rounded-xl shadow-md p-8 border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Recent Scans</h3>
            {recentScans.length > 0 ? (
              <div className="space-y-3">
                {recentScans.map((scan, index) => (
                  <div key={index} className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-800">{scan.full_name}</p>
                        <p className="text-sm text-slate-600">{scan.student_id}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-emerald-700">{scan.status?.toUpperCase()}</p>
                        <p className="text-xs text-slate-500">{scan.check_in_time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="bg-slate-100 p-6 rounded-full mb-4">
                  <UserCheck className="w-12 h-12 text-slate-400" />
                </div>
                <p className="text-slate-500 font-medium">No recent scans</p>
                <p className="text-sm text-slate-400 mt-2">Scanned attendance will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

const AttendancePage = () => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');

  // Test Firebase connection on component load
  useEffect(() => {
    console.log('Firebase initialized:', db);
    console.log('Firebase is working:', db ? '✅ Yes' : '❌ No');

    const fetchAttendance = async () => {
  try {
    const q = query(collection(db, 'attendance'));
    const querySnapshot = await getDocs(q);
    const records = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log('Fetched records from Firebase:', records);
    
    // If no records in Firebase, use sample data
    if (records.length === 0) {
      const sampleData = [
        { 
          id: 1, 
          student_id: 'SS2024001', 
          full_name: 'John Deng Mayar', 
          date: new Date().toISOString().split('T')[0], 
          check_in_time: '08:15 AM', 
          status: 'present', 
          method: 'QR Code', 
          department: 'Computer Science' 
        },
        { 
          id: 2, 
          student_id: 'SS2024002', 
          full_name: 'Mary Akech Dut', 
          date: new Date().toISOString().split('T')[0], 
          check_in_time: '08:20 AM', 
          status: 'present', 
          method: 'QR Code', 
          department: 'Engineering' 
        },
        { 
          id: 3, 
          student_id: 'SS2024005', 
          full_name: 'James Kuol Manyang', 
          date: new Date().toISOString().split('T')[0], 
          check_in_time: '08:45 AM', 
          status: 'late', 
          method: 'QR Code', 
          department: 'Computer Science' 
        },
        { 
          id: 4, 
          student_id: 'SS2024006', 
          full_name: 'Rebecca Achol Deng', 
          date: new Date().toISOString().split('T')[0], 
          check_in_time: '08:10 AM', 
          status: 'present', 
          method: 'QR Code', 
          department: 'Engineering' 
        }
      ];
      setAttendanceRecords(sampleData);
      console.log('Using sample data (Firebase empty)');
    } else {
      setAttendanceRecords(records);
    }
  } catch (error) {
    console.error('Error fetching attendance:', error);
    setAttendanceRecords([]);
  }
};

  fetchAttendance();
}, []);

  // Filter records when filters change
  useEffect(() => {
    let filtered = [...attendanceRecords];

    if (dateFilter) {
      filtered = filtered.filter(record => record.date === dateFilter);
    }

    if (departmentFilter !== 'All Departments') {
      filtered = filtered.filter(record => record.department === departmentFilter);
    }

    setFilteredRecords(filtered);
  }, [dateFilter, departmentFilter, attendanceRecords]);

  // Excel export function
  const handleExportToExcel = () => {
    const exportData = (filteredRecords.length > 0 ? filteredRecords : attendanceRecords).map(record => ({
      'Student ID': record.student_id,
      'Name': record.full_name,
      'Date': record.date || new Date().toLocaleDateString(),
      'Time': record.check_in_time || '-',
      'Status': record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : 'Unknown',
      'Method': record.method || 'QR Code'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    worksheet['!cols'] = [
      { wch: 12 },
      { wch: 20 },
      { wch: 12 },
      { wch: 15 },
      { wch: 10 },
      { wch: 12 }
    ];
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Records');
    
    const today = new Date().toISOString().split('T')[0];
    const filename = `Attendance_Report_${today}.xlsx`;
    
    XLSX.writeFile(workbook, filename);
  };

  const displayRecords = filteredRecords.length > 0 || dateFilter || departmentFilter !== 'All Departments' 
    ? filteredRecords 
    : attendanceRecords;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Attendance Records</h2>
          <p className="text-slate-500 mt-1">View and export attendance reports</p>
        </div>
        <button 
          onClick={handleExportToExcel}
          className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:from-emerald-700 hover:to-emerald-800 transition shadow-lg font-semibold"
        >
          <Download className="w-5 h-5" />
          Export Report
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
        <div className="flex gap-4 mb-6">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition font-medium"
          />
          <select 
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition font-medium text-slate-700"
          >
            <option>All Departments</option>
            <option>Computer Science</option>
            <option>Engineering</option>
            <option>Business</option>
            <option>Medicine</option>
          </select>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-slate-700 font-semibold">Student ID</th>
                <th className="text-left py-3 px-4 text-slate-700 font-semibold">Name</th>
                <th className="text-left py-3 px-4 text-slate-700 font-semibold">Date</th>
                <th className="text-left py-3 px-4 text-slate-700 font-semibold">Time</th>
                <th className="text-left py-3 px-4 text-slate-700 font-semibold">Status</th>
                <th className="text-left py-3 px-4 text-slate-700 font-semibold">Method</th>
              </tr>
            </thead>
            <tbody>
              {displayRecords && displayRecords.length > 0 ? (
                displayRecords.map((record) => (
                  <tr key={record.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td className="py-4 px-4 text-slate-600">{record.student_id}</td>
                    <td className="py-4 px-4 font-medium text-slate-800">{record.full_name}</td>
                    <td className="py-4 px-4 text-slate-600">{record.date || new Date().toLocaleDateString()}</td>
                    <td className="py-4 px-4 text-slate-600">{record.check_in_time || '-'}</td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                        record.status === 'present' || record.status === 'late'
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : 'Unknown'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-100 text-indigo-700">
                        {record.method || 'QR Code'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    No attendance records found. Check console (F12) for Firebase status.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

  const BiometricPage = () => {
    const [formData, setFormData] = useState({
      student_id: '',
      full_name: '',
      email: '',
      phone: '',
      department: '',
      year: ''
    });
    const [generatedQR, setGeneratedQR] = useState(null);
    const [qrLoading, setQrLoading] = useState(false);
    const [qrError, setQrError] = useState('');
    const [qrSuccess, setQrSuccess] = useState('');

    const handleGenerateQR = async () => {
      if (!formData.student_id || !formData.full_name || !formData.department || !formData.year) {
        setQrError('Please fill all required fields');
        return;
      }

      setQrLoading(true);
      setQrError('');
      setQrSuccess('');

      try {
        const response = await studentAPI.create(formData);
        setGeneratedQR(response.data.data.qr_code);
        setQrSuccess('Student registered and QR code generated successfully!');
        await fetchStudents();
        await fetchStatistics();
      } catch (err) {
        setQrError(err.response?.data?.message || 'Failed to generate QR code');
      } finally {
        setQrLoading(false);
      }
    };

    const handleSave = () => {
      setFormData({
        student_id: '',
        full_name: '',
        email: '',
        phone: '',
        department: '',
        year: ''
      });
      setGeneratedQR(null);
      setQrSuccess('');
      setQrError('');
      alert('Student saved successfully!');
    };

    const handleDownloadQR = () => {
      if (generatedQR) {
        const link = document.createElement('a');
        link.href = generatedQR;
        link.download = `${formData.student_id}_QRCode.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    };

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">QR Code Enrollment</h2>
          <p className="text-slate-500 mt-1">Register new students with QR code for attendance tracking</p>
        </div>

        {qrError && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-xl">
            {qrError}
          </div>
        )}

        {qrSuccess && (
          <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded-xl">
            {qrSuccess}
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Student Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Student ID *</label>
                <input
                  type="text"
                  value={formData.student_id}
                  onChange={(e) => setFormData({...formData, student_id: e.target.value})}
                  placeholder="Enter student ID"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  placeholder="Enter full name"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="student@university.edu"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+211123456789"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Department *</label>
                <select 
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition text-slate-700">
                  <option value="">Select department</option>
                  <option>Computer Science</option>
                  <option>Engineering</option>
                  <option>Business</option>
                  <option>Medicine</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Year *</label>
                <select 
                  value={formData.year}
                  onChange={(e) => setFormData({...formData, year: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition text-slate-700">
                  <option value="">Select year</option>
                  <option>1st Year</option>
                  <option>2nd Year</option>
                  <option>3rd Year</option>
                  <option>4th Year</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-4">QR Code Generation</h3>
            
            {!generatedQR ? (
              <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50">
                <div className="bg-gradient-to-br from-slate-700 to-slate-900 p-6 rounded-2xl mb-4">
                  <QrCode className="w-20 h-20 text-white" />
                </div>
                <p className="text-slate-600 mb-4 font-medium">Generate unique QR code</p>
                <button 
                  onClick={handleGenerateQR}
                  disabled={qrLoading}
                  className="bg-gradient-to-r from-slate-700 to-slate-900 text-white px-8 py-3 rounded-xl hover:from-slate-800 hover:to-slate-950 transition shadow-lg font-semibold disabled:opacity-50">
                  {qrLoading ? 'Generating...' : 'Generate QR Code'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <div className="bg-slate-50 p-6 rounded-xl mb-4">
                  <img src={generatedQR} alt="Generated QR Code" className="w-64 h-64" />
                </div>
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={handleDownloadQR}
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition shadow-lg font-semibold flex items-center justify-center gap-2">
                    <Download className="w-5 h-5" />
                    Download
                  </button>
                  <button 
                    onClick={() => setGeneratedQR(null)}
                    className="flex-1 bg-slate-200 text-slate-700 px-6 py-3 rounded-xl hover:bg-slate-300 transition font-semibold">
                    Generate New
                  </button>
                </div>
              </div>
            )}
            
            <div className="mt-4 text-center text-sm">
              <p className="text-slate-600">Status: <span className="font-bold text-slate-800">
                {generatedQR ? 'QR Code Generated' : 'Ready to Generate'}
              </span></p>
            </div>
          </div>
        </div>
        
        {generatedQR && (
          <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
            <button 
              onClick={handleSave}
              className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-8 py-4 rounded-xl w-full font-bold hover:from-emerald-700 hover:to-emerald-800 transition shadow-lg text-lg">
              Save Student & QR Code
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
  <div className="min-h-screen bg-slate-50">
    <nav className="bg-white shadow-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="bg-gradient-to-br from-slate-700 to-slate-900 p-2 rounded-lg mr-3">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-800">QR Code Attendance</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-700 font-medium">{user?.full_name || 'Admin'}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-slate-600 hover:text-red-600 transition font-medium"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
    
    <div className="flex">
      <aside className="w-64 bg-white shadow-sm border-r border-slate-200 min-h-screen">
        <nav className="p-4 space-y-2">
          <button
            onClick={() => setCurrentPage('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${
              currentPage === 'dashboard' 
                ? 'bg-slate-800 text-white shadow-lg' 
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Home className="w-5 h-5" />
            Dashboard
          </button>
          
          {/* Admin Only - Students Management */}
          {user?.role === 'admin' && (
            <button
              onClick={() => setCurrentPage('students')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${
                currentPage === 'students' 
                  ? 'bg-slate-800 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Users className="w-5 h-5" />
              Students
            </button>
          )}
          
          <button
            onClick={() => setCurrentPage('attendance')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${
              currentPage === 'attendance' 
                ? 'bg-slate-800 text-white shadow-lg' 
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-5 h-5" />
            Attendance
          </button>
          
          <button
            onClick={() => setCurrentPage('scan')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${
              currentPage === 'scan' 
                ? 'bg-slate-800 text-white shadow-lg' 
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <UserCheck className="w-5 h-5" />
            Scan Attendance
          </button>
          
          {/* Admin Only - QR Code Enrollment */}
          {user?.role === 'admin' && (
            <button
              onClick={() => setCurrentPage('biometric')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${
                currentPage === 'biometric' 
                  ? 'bg-slate-800 text-white shadow-lg' 
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <QrCode className="w-5 h-5" />
              QR Code
            </button>
          )}
          
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 hover:bg-slate-100 transition font-medium">
            <Settings className="w-5 h-5" />
            Settings
          </button>
        </nav>
      </aside>
      
      <main className="flex-1 p-8">
        {currentPage === 'dashboard' && (
          user?.role === 'admin' ? <DashboardPage /> : <FacultyDashboardPage />
        )}
        {currentPage === 'students' && user?.role === 'admin' && <StudentsPage />}
        {currentPage === 'attendance' && <AttendancePage />}
        {currentPage === 'scan' && <ScanAttendancePage />}
        {currentPage === 'biometric' && user?.role === 'admin' && <BiometricPage />}
      </main>
    </div>
  </div>
);
};

export default BiometricAttendanceSystem;