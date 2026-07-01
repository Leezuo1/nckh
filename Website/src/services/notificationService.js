import api from './api';

const notificationService = {
  getMyNotifications() {
    return api.get('/notifications');
  },

  async getUnreadCount() {
    const data = await api.get('/notifications/unread-count');
    return data.count;
  },

  markAsRead(id) {
    return api.patch(`/notifications/${id}/read`);
  },

  markAllAsRead() {
    return api.patch('/notifications/read-all');
  },
};

export default notificationService;
