import api, { API_BASE } from './api';

const documentService = {
  // Upload file lên 1 topic
  upload(topicId, file, note = '') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('topicId', topicId);
    if (note) formData.append('note', note);
    return api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Lấy documents của 1 topic
  getByTopic(topicId) {
    return api.get(`/documents/topic/${topicId}`);
  },

  // Tổng hợp toàn bộ tài liệu (cán bộ/khoa/phòng/admin)
  getAll() {
    return api.get('/documents/all');
  },

  // Xóa document
  delete(id) {
    return api.delete(`/documents/${id}`);
  },

  // Tải file về (fetch với token, trigger download blob)
  async download(id, fileName) {
    const token = localStorage.getItem('access_token');
    const res = await fetch(`${API_BASE}/documents/${id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      // Đọc message lỗi từ backend
      let msg = `Lỗi ${res.status}`;
      try {
        const data = await res.json();
        msg = data.message || msg;
      } catch { /* ignore */ }
      throw new Error(msg);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'tai-lieu';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};

export default documentService;
