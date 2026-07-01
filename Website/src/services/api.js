import axios from 'axios';
import toast from 'react-hot-toast';

// URL backend lấy từ Website/.env (VITE_API_URL). Mặc định localhost cho môi trường dev.
// vd production: VITE_API_URL="https://api.nckh.vlu.edu.vn/api"
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Tự động gắn JWT token vào mỗi request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const getErrorMessage = (error) => {
  const msg = error.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  if (typeof msg === 'string') return msg;
  if (error.message === 'Network Error') return 'Không thể kết nối tới server';
  return 'Có lỗi xảy ra, vui lòng thử lại';
};

// === REFRESH TOKEN LOGIC ===
let isRefreshing = false;
let refreshPromise = null;

const tryRefreshToken = async () => {
  if (isRefreshing) return refreshPromise;
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) throw new Error('No refresh token');

      const res = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
      const data = res.data;
      localStorage.setItem('access_token', data.accessToken);
      localStorage.setItem('refresh_token', data.refreshToken);
      return data.accessToken;
    } catch {
      // Refresh fail → logout
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_info');
      localStorage.removeItem('is_logged_in');
      return null;
    } finally {
      isRefreshing = false;
    }
  })();
  return refreshPromise;
};

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const status = error.response?.status;
    const message = getErrorMessage(error);
    const originalRequest = error.config;
    const url = originalRequest?.url || '';

    // Tắt toast cho endpoint silent
    const silent = url.includes('/notifications/unread-count') || url.includes('/stats/public');

    // === 401: thử refresh token (chỉ 1 lần) ===
    if (status === 401 && !originalRequest._retry && !url.includes('/auth/refresh')) {
      originalRequest._retry = true;
      const newToken = await tryRefreshToken();
      if (newToken) {
        // Retry request với token mới
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }
      // Thông báo cho Header/Sidebar cập nhật trạng thái
      window.dispatchEvent(new CustomEvent('auth:logout'));

      // Chỉ redirect về login nếu đang ở trang cần đăng nhập
      const currentPath = window.location.pathname;
      if (currentPath !== '/' && currentPath !== '/login') {
        toast.error('Phiên đăng nhập đã hết hạn');
        setTimeout(() => { window.location.href = '/login'; }, 1500);
      }
    } else if (status === 403) {
      // Hiện message cụ thể từ backend (vd: "Bạn đang có đề tài chưa hoàn thành nên không thể...").
      // Mọi ForbiddenException trong backend đều kèm message tiếng Việt rõ ràng;
      // nếu vì lý do nào đó không có message thì mới dùng câu generic.
      if (!silent) toast.error(error.response?.data?.message ? message : 'Bạn không có quyền thực hiện thao tác này');
    } else if (status === 404) {
      if (!silent) toast.error('Không tìm thấy dữ liệu');
    } else if (status === 400) {
      if (!silent) toast.error(message);
    } else if (status >= 500) {
      if (!silent) toast.error('Lỗi server, vui lòng thử lại sau');
    } else if (status !== 401 && !silent) {
      toast.error(message);
    }

    return Promise.reject(new Error(message));
  }
);

export default api;
