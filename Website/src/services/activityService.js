import api from './api';

const activityService = {
  // Tất cả activity (admin) — hỗ trợ phân trang/sort/lọc 24h cho lazy loading
  // params: { skip, take, order: 'desc'|'asc', within24h: boolean }
  getAll(params = {}) {
    return api.get('/activities', { params });
  },

  // Activity của 1 topic
  getByTopic(topicId) {
    return api.get(`/activities/topic/${topicId}`);
  },

  // Activity của user hiện tại
  getMine() {
    return api.get('/activities/me');
  },
};

export default activityService;
