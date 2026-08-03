import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';

const NAVY = '#1e2d5a';
const RED = '#be1e2d';

// Trả lời tạm thời — sẽ thay bằng logic thật khi có mô tả chatbot.
const placeholderReply = () =>
  'Mình là trợ lý NCKH 🤖 (đang được cấu hình). Bạn cứ nhập câu hỏi, phần trả lời sẽ sớm được hoàn thiện nhé!';

const ChatBot = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Xin chào 👋 Mình là trợ lý NCKH. Bạn cần hỗ trợ gì về đề tài nghiên cứu khoa học?' },
  ]);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, open]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { from: 'user', text }]);
    setInput('');
    // TODO: gọi API chatbot thật ở đây. Tạm thời trả lời mẫu.
    setTimeout(() => {
      setMessages((prev) => [...prev, { from: 'bot', text: placeholderReply() }]);
    }, 500);
  };

  return (
    <>
      {/* Nút nổi */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Mở trợ lý NCKH"
        style={{
          position: 'fixed', right: 24, bottom: 24, zIndex: 1000,
          width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: RED, color: '#fff', boxShadow: '0 6px 20px rgba(0,0,0,.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform .15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.06)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {open ? <X size={24} /> : <MessageCircle size={26} />}
      </button>

      {/* Khung chat */}
      {open && (
        <div
          style={{
            position: 'fixed', right: 24, bottom: 92, zIndex: 1000,
            width: 'min(360px, calc(100vw - 32px))', height: 'min(520px, calc(100vh - 140px))',
            background: '#fff', borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 12px 40px rgba(0,0,0,.28)', display: 'flex', flexDirection: 'column',
            border: '1px solid #e5e7eb',
          }}
        >
          {/* Header */}
          <div style={{ background: NAVY, color: '#fff', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>Trợ lý NCKH</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Hỗ trợ trực tuyến</div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} aria-label="Đóng">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div ref={bodyRef} style={{ flex: 1, overflowY: 'auto', padding: 14, background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start' }}>
                <div
                  style={{
                    maxWidth: '80%', padding: '9px 13px', borderRadius: 14, fontSize: 14, lineHeight: 1.45,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    background: m.from === 'user' ? NAVY : '#fff',
                    color: m.from === 'user' ? '#fff' : '#1f2937',
                    border: m.from === 'user' ? 'none' : '1px solid #e5e7eb',
                    borderBottomRightRadius: m.from === 'user' ? 4 : 14,
                    borderBottomLeftRadius: m.from === 'user' ? 14 : 4,
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: 10, borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8, background: '#fff' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Nhập câu hỏi..."
              style={{ flex: 1, padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 14, outline: 'none' }}
            />
            <button
              onClick={send}
              aria-label="Gửi"
              style={{ width: 42, borderRadius: 10, border: 'none', background: RED, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
