import api from './api';

const timelineService = {
  getByTopic(topicId) {
    return api.get(`/timelines/topic/${topicId}`);
  },

  create(topicId, timelineName, deadline) {
    return api.post('/timelines', { topicId, timelineName, deadline });
  },

  update(id, data) {
    return api.patch(`/timelines/${id}`, data);
  },

  toggleComplete(id) {
    return api.patch(`/timelines/${id}/toggle`);
  },

  delete(id) {
    return api.delete(`/timelines/${id}`);
  },
};

export default timelineService;
