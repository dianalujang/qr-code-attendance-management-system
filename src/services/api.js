// src/services/api.js
// Frontend-only file. No Express/Node imports here.

import axios from 'axios';
import { auth } from '../firebase';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

// ── Request Interceptor: attach fresh Firebase ID token to every request ──────
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('Could not get auth token:', err.message);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: auto-retry once on 401 with a refreshed token ───────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const freshToken = await currentUser.getIdToken(true);
          originalRequest.headers.Authorization = `Bearer ${freshToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError.message);
      }
    }

    return Promise.reject(error);
  }
);

// ── Auth API ──────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  logout: () => apiClient.post('/auth/logout'),
  getProfile: () => apiClient.get('/auth/profile')
};

// ── Student API ───────────────────────────────────────────────────────────────
export const studentAPI = {
  getAll: () => apiClient.get('/students'),
  getById: (id) => apiClient.get(`/students/${id}`),
  create: (studentData) => apiClient.post('/students', studentData),
  update: (id, studentData) => apiClient.put(`/students/${id}`, studentData),
  delete: (id) => apiClient.delete(`/students/${id}`),
  getStatistics: () => apiClient.get('/students/statistics')
};

// ── Attendance API ────────────────────────────────────────────────────────────
export const attendanceAPI = {
  getAll: () => apiClient.get('/attendance'),
  getToday: () => apiClient.get('/attendance/today'),
  getByDate: (date) => apiClient.get(`/attendance?date=${date}`),
  markAttendance: (data) => apiClient.post('/attendance/mark', data),
  getReport: (startDate, endDate) =>
    apiClient.get(`/attendance/report?start=${startDate}&end=${endDate}`)
};

export default apiClient;
