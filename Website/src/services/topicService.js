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

  // ===== LUỒNG SRS: NHÓM (GVHD) → HỒ SƠ → DUYỆT NHIỀU CẤP =====

  // GVHD tạo nhóm nghiên cứu (đề tài Nháp)
  createGroup(data) {
    return api.post('/topics/group', data);
  },

  // GVHD mời SV theo MSSV
  inviteStudent(topicId, mssv) {
    return api.post(`/topics/${topicId}/invite`, { mssv });
  },

  // GVHD gỡ SV khỏi nhóm
  removeInvite(topicId, userId) {
    return api.delete(`/topics/${topicId}/invite/${userId}`);
  },

  // SV chấp nhận/từ chối lời mời
  respondInvite(topicId, accept) {
    return api.patch(`/topics/${topicId}/respond-invite`, { accept });
  },

  // Lưu/nộp 1 phiên bản thuyết minh (content: object các mục biểu mẫu)
  saveProposal(topicId, content, note) {
    return api.patch(`/topics/${topicId}/proposal`, { content, note });
  },

  // Lịch sử phiên bản thuyết minh
  getProposalVersions(topicId) {
    return api.get(`/topics/${topicId}/proposal/versions`);
  },

  // Nhóm nộp hồ sơ lên cấp duyệt kế tiếp
  submitForReview(topicId) {
    return api.patch(`/topics/${topicId}/submit`);
  },

  // Cán bộ Khoa/Phòng duyệt Đạt/Không đạt (decision: 'Approved' | 'Rejected')
  review(topicId, decision, comment) {
    return api.patch(`/topics/${topicId}/review`, { decision, comment });
  },

  // Lịch sử duyệt của đề tài
  getApprovals(topicId) {
    return api.get(`/topics/${topicId}/approvals`);
  },

  // Hàng chờ duyệt theo vai trò (Khoa/Phòng/Admin)
  getReviewQueue() {
    return api.get('/review-queue');
  },

  // Cán bộ Phòng: nhập kết quả Hội đồng đề cương (decision: 'Approved'|'Rejected')
  councilProposal(topicId, decision, note) {
    return api.patch(`/topics/${topicId}/council/proposal`, { decision, note });
  },

  // Cán bộ Phòng: nhập kết quả Hội đồng phản biện/nghiệm thu
  // outcome (khi Rejected): 'Extend' | 'Redo' | 'Cancel'
  councilReview(topicId, decision, outcome, note) {
    return api.patch(`/topics/${topicId}/council/review`, { decision, outcome, note });
  },

  // Lịch sử hội đồng
  getCouncils(topicId) {
    return api.get(`/topics/${topicId}/councils`);
  },

  // ===== ĐỢT ĐỀ TÀI =====
  getBatches() {
    return api.get('/batches');
  },
  createBatch(data) {
    return api.post('/batches', data);
  },
  toggleBatch(id) {
    return api.patch(`/batches/${id}/toggle`);
  },

  // Báo cáo thống kê (Khoa/Phòng/Trưởng Khoa/Admin)
  getReportStats() {
    return api.get('/report-stats');
  },

  // ===== Luồng mới: cấp GVHD, báo cáo, hội đồng, điểm =====
  getLecturersList() {
    return api.get('/lecturers-list');
  },
  assignSupervisor(topicId, lecturerId) {
    return api.patch(`/topics/${topicId}/assign-supervisor`, { lecturerId });
  },
  requestReport(topicId) {
    return api.patch(`/topics/${topicId}/request-report`);
  },
  reviewReport(topicId, decision) {
    return api.patch(`/topics/${topicId}/review-report`, { decision });
  },
  createReportCouncil(topicId, lecturerIds, scheduledAt, location) {
    return api.patch(`/topics/${topicId}/report-council`, { lecturerIds, scheduledAt, location });
  },
  enterScore(topicId, score, editDeadline) {
    return api.patch(`/topics/${topicId}/score`, { score, editDeadline });
  },
};

export default topicService;
