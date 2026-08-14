import api from './api';

const userService = {
  // Lấy tất cả user (có thể filter: ?role=Student)
  getUsers(role) {
    const params = role ? { role } : {};
    return api.get('/users', { params });
  },

  // Lấy danh sách sinh viên
  getStudents() {
    return api.get('/users/students');
  },

  // Lấy danh sách giảng viên
  getLecturers() {
    return api.get('/users/lecturers');
  },

  // Lấy chi tiết 1 user
  getUserById(id) {
    return api.get(`/users/${id}`);
  },

  // Thêm user mới
  // data: { fullName, userId, faculty, batch, gender, phone, outlook, role }
  createUser(data) {
    return api.post('/users', data);
  },

  // Cập nhật user
  updateUser(id, data) {
    return api.patch(`/users/${id}`, data);
  },

  // Vô hiệu hóa user (soft delete)
  deleteUser(id) {
    return api.delete(`/users/${id}`);
  },

  // Admin đặt lại mật khẩu cho 1 user
  setPassword(id, password) {
    return api.patch(`/users/${id}/password`, { password });
  },

  // User tự update profile của mình (không cần Admin)
  updateMyProfile(data) {
    return api.patch('/profile/me', data);
  },
};

export default userService;
