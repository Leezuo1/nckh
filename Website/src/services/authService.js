import api from './api';

// Lưu phiên đăng nhập vào localStorage (dùng chung cho mọi cách đăng nhập)
const saveSession = (data) => {
  localStorage.setItem('access_token', data.accessToken);
  if (data.refreshToken) localStorage.setItem('refresh_token', data.refreshToken);
  localStorage.setItem('user_info', JSON.stringify(data.user));
  localStorage.setItem('is_logged_in', 'true');
};

const authService = {
  // Đăng nhập qua cổng đào tạo VLU (MSSV/MSGV + mật khẩu)
  async loginWithVlu(studentId, password) {
    const data = await api.post('/auth/vlu-login', { studentId, password });
    saveSession(data);
    return data;
  },

  // Đăng nhập bằng Microsoft access token (từ MSAL.js)
  // Đăng nhập Microsoft bằng authorization code (backend đổi code->token bằng ClientSecret)
  async loginWithMicrosoftCode(code, redirectUri) {
    const data = await api.post('/auth/microsoft/code', { code, redirectUri });
    saveSession(data);
    return data;
  },

  async loginWithMicrosoft(accessToken) {
    const data = await api.post('/auth/microsoft', { accessToken });
    saveSession(data);
    return data;
  },

  // Lấy thông tin user đang đăng nhập
  async getMe() {
    return api.get('/auth/me');
  },

  // Đăng xuất — gọi BE để xóa refresh token rồi xóa local
  async logout() {
    try {
      await api.post('/auth/logout');
    } catch { /* ignore */ }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_info');
    localStorage.removeItem('is_logged_in');
    window.location.href = '/login';
  },

  // Lấy thông tin user từ localStorage (không cần gọi API)
  getCurrentUser() {
    const userInfo = localStorage.getItem('user_info');
    if (!userInfo) return null;
    try {
      return JSON.parse(userInfo);
    } catch {
      // user_info hỏng (parse lỗi) → xoá để tránh crash lặp lại
      localStorage.removeItem('user_info');
      return null;
    }
  },

  isAdmin() { return this.getCurrentUser()?.role === 'Admin'; },
  isLecturer() { return this.getCurrentUser()?.role === 'Lecturer'; },
  isStudent() { return this.getCurrentUser()?.role === 'Student'; },
};

export default authService;
