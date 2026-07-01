import api from './api';

const topicService = {
  // ===== ĐỀ TÀI =====

  // Lấy danh sách đề tài (có filter)
  // filters: { status, year, search }
  getTopics(filters = {}) {
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.year) params.year = filters.year;
    if (filters.search) params.search = filters.search;
    return api.get('/topics', { params });
  },

  // Lấy đề tài của tôi
  getMyTopics() {
    return api.get('/topics/mine');
  },

  // Lấy chi tiết 1 đề tài
  getTopicById(id) {
    return api.get(`/topics/${id}`);
  },

  // Cập nhật đề tài
  updateTopic(id, data) {
    return api.patch(`/topics/${id}`, data);
  },

  // Xóa đề tài (Admin only)
  deleteTopic(id) {
    return api.delete(`/topics/${id}`);
  },

  // ===== Ý TƯỞNG =====

  // Lấy danh sách ý tưởng (có filter)
  // filters: { year, search }
  getIdeas(filters = {}) {
    const params = {};
    if (filters.year) params.year = filters.year;
    if (filters.search) params.search = filters.search;
    if (filters.onlyUnassigned) params.onlyUnassigned = 'true';
    if (filters.onlyPendingApproval) params.onlyPendingApproval = 'true';
    if (filters.onlyApproved) params.onlyApproved = 'true';
    return api.get('/ideas', { params });
  },

  // Đăng ký ý tưởng mới
  // data: { topicId, topicName, description, objective, projectScope, expectedProduct, year, deadline }
  createIdea(data) {
    return api.post('/ideas', data);
  },

  // Admin: duyệt ý tưởng → chuyển thành đề tài
  assignIdea(id) {
    return api.patch(`/ideas/${id}/assign`);
  },

  // Xin tham gia đề tài (role PendingMember) — TH2: SV xin GV's idea
  // students: optional array của members điền trong form
  requestAssign(topicId, students) {
    return api.patch(`/topics/${topicId}/request-assign`, { students });
  },

  // GV tự assign vào ý tưởng SV — TH1: không cần duyệt (GV có thể set durationMonths)
  lecturerAssign(topicId, durationMonths) {
    return api.patch(`/topics/${topicId}/lecturer-assign`, { durationMonths });
  },

  // Ghi nhận lượt truy cập đề tài
  recordAccess(topicId) {
    return api.post(`/topics/${topicId}/access`);
  },

  // Lấy thống kê truy cập theo tháng
  getAccessStats(topicId) {
    return api.get(`/topics/${topicId}/access-stats`);
  },

  // Cập nhật tiến độ (chỉ GV/Leader)
  updateProgress(topicId, progress) {
    return api.patch(`/topics/${topicId}/progress`, { progress });
  },

  // Leader chấp nhận / từ chối yêu cầu tham gia
  respondAssign(topicId, userId, accept) {
    return api.patch(`/topics/${topicId}/respond-assign`, { userId, accept });
  },

  // ===== STATE MACHINE (Admin) =====

  // Đẩy các đề tài sang trạng thái kế tiếp
  proceedTopics(ids) {
    return api.patch('/topics/proceed', { ids });
  },

  // Hoàn tác các đề tài về trạng thái liền trước
  undoTopics(ids) {
    return api.patch('/topics/undo', { ids });
  },

  // Mở Chỉnh Sửa (Báo Cáo → Chỉnh Sửa) với hạn chỉnh sửa (ISO string)
  startEditing(ids, editDeadline) {
    return api.patch('/topics/start-editing', { ids, editDeadline });
  },

  // Đặt lịch bắt đầu hàng loạt cho các đề tài "Chờ bắt đầu" (ISO string).
  // Tới ngày bắt đầu, đề tài tự nhảy sang "Đang thực hiện".
  scheduleStart(ids, startDate, endDate) {
    return api.patch('/topics/schedule-start', { ids, startDate, endDate });
  },
};

export default topicService;
