import api from './api';

const chatbotService = {
  // Hỏi trợ lý ảo (cần đăng nhập). Trả về { answer, source }.
  ask(message) {
    return api.post('/chatbot/ask', { message });
  },
};

export default chatbotService;
