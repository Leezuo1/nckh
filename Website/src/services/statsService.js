import api from './api';

const statsService = {
  getPublicStats() {
    return api.get('/stats/public');
  },
};

export default statsService;
