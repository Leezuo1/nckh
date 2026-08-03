import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';

const NAVY = '#1e2d5a';
const RED = '#be1e2d';

// Bỏ dấu tiếng Việt để khớp từ khóa linh hoạt
const normalize = (s) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // bỏ dấu tổ hợp
    .replace(/[đ]/g, 'd');       // đ → d

// ===== Cơ sở tri thức (FAQ về quy trình NCKH) =====
const FAQ = [
  {
    q: 'Làm sao đăng ký đề tài?',
    keys: ['dang ky', 'dang ki', 'tao de tai', 'nop de tai', 'y tuong', 'de xuat'],
    a: 'Để đăng ký, bạn vào menu "Đăng ký ý tưởng", điền tên đề tài, mô tả, khoa, và BẮT BUỘC đính kèm file thuyết minh (.doc/.docx/.pdf). Sau đó bấm Xác nhận — đề tài sẽ chuyển sang "Chờ Khoa duyệt".',
  },
  {
    q: 'File thuyết minh là gì?',
    keys: ['thuyet minh', 'file', 'tai lieu dinh kem', 'bat buoc file'],
    a: 'File thuyết minh là tài liệu mô tả chi tiết đề tài (.doc/.docx/.pdf) — BẮT BUỘC nộp khi đăng ký. Cán bộ Khoa/Phòng sẽ tải file này để xét duyệt.',
  },
  {
    q: 'Đề tài được duyệt thế nào?',
    keys: ['duyet', 'xet duyet', 'ai duyet', 'quy trinh duyet'],
    a: 'Đề tài duyệt 2 cấp: (1) Cán bộ NCKH Khoa xem thuyết minh → Đạt/Không đạt; (2) nếu Đạt, chuyển lên Cán bộ Phòng NCKH duyệt tiếp. Nếu bị "Không đạt", bạn nhận nhận xét, sửa lại rồi nộp lại.',
  },
  {
    q: 'Các trạng thái đề tài?',
    keys: ['trang thai', 'status', 'cac buoc', 'giai doan'],
    a: 'Các trạng thái: Chờ Khoa duyệt → Chờ Phòng duyệt → (Chờ phân công nếu thiếu người) → Chờ bắt đầu → Đang thực hiện → Báo cáo → Chỉnh sửa → Nghiệm thu. Xem trạng thái đề tài của bạn ở mục "Đề tài của tôi".',
  },
  {
    q: 'Bị trả về chỉnh sửa thì làm sao?',
    keys: ['tra ve', 'chinh sua', 'khong dat', 'yeu cau sua', 'sua lai'],
    a: 'Khi Khoa/Phòng "Không đạt", bạn xem nhận xét trong chi tiết đề tài, chỉnh sửa theo góp ý rồi bấm "Nộp lại" để gửi duyệt lại.',
  },
  {
    q: 'Chưa có giảng viên hướng dẫn?',
    keys: ['giang vien', 'gvhd', 'huong dan', 'chua co gv', 'phan cong'],
    a: 'Nếu đề tài của bạn được duyệt nhưng chưa có GVHD, nó vào trạng thái "Chờ phân công" và hiện ở "Danh sách ý tưởng". Cán bộ Khoa sẽ cấp GVHD cho bạn, hoặc một GVHD sẽ nhận hướng dẫn.',
  },
  {
    q: 'Tham gia nhóm thế nào?',
    keys: ['tham gia', 'moi', 'loi moi', 'nhom', 'thanh vien'],
    a: 'Nếu GVHD mời bạn vào nhóm, bạn vào "Đề tài của tôi" → mở đề tài → bấm "Chấp nhận" lời mời. SV đầu tiên chấp nhận sẽ là chủ nhiệm đề tài.',
  },
  {
    q: 'Làm sao báo cáo đề tài?',
    keys: ['bao cao', 'xin bao cao', 'nop bao cao'],
    a: 'Khi đề tài "Đang thực hiện", GVHD hoặc chủ nhiệm mở chi tiết đề tài và bấm "📢 Xin báo cáo". Yêu cầu sẽ được Cán bộ Khoa rồi Cán bộ Phòng duyệt; sau đó Cán bộ Khoa lập hội đồng để bạn báo cáo.',
  },
  {
    q: 'Hội đồng là gì?',
    keys: ['hoi dong', 'cham diem hoi dong', 'thanh vien hoi dong'],
    a: 'Hội đồng gồm các giảng viên do Cán bộ Khoa phân công để nghe bạn báo cáo. Khi lập hội đồng, đề tài chuyển sang "Báo cáo" và bị khoá chỉnh sửa. Hội đồng chấm điểm, Cán bộ Khoa nhập điểm vào hệ thống.',
  },
  {
    q: 'Xem điểm ở đâu?',
    keys: ['diem', 'ket qua', 'cham diem', 'score'],
    a: 'Sau khi hội đồng chấm và Cán bộ Khoa nhập điểm, điểm sẽ hiển thị ngay trong trang chi tiết đề tài của bạn (huy hiệu 🎓 Điểm).',
  },
  {
    q: 'Khi nào nghiệm thu?',
    keys: ['nghiem thu', 'hoan thanh', 'ket thuc', 'xong'],
    a: 'Sau khi có điểm, Cán bộ Khoa mở giai đoạn "Chỉnh sửa" với đồng hồ đếm ngược. Hết thời gian chỉnh sửa, đề tài TỰ ĐỘNG chuyển sang "Nghiệm thu" (hoàn tất).',
  },
  {
    q: 'Cập nhật tiến độ / tải tài liệu?',
    keys: ['tien do', 'tai lieu', 'upload', 'file bao cao', 'phan tram'],
    a: 'Trong chi tiết đề tài, GVHD/chủ nhiệm có thể cập nhật % tiến độ và tải tài liệu lên (khi đề tài không bị khoá). Ở giai đoạn "Báo cáo" đề tài bị khoá, chỉ xem/tải.',
  },
  {
    q: 'Đăng nhập thế nào?',
    keys: ['dang nhap', 'login', 'mat khau', 'tai khoan'],
    a: 'Bạn đăng nhập bằng Mã số sinh viên (MSSV) và mật khẩu. Nếu quên hoặc lỗi tài khoản, liên hệ Cán bộ NCKH Khoa hoặc Admin để được hỗ trợ.',
  },
];

const FALLBACK =
  'Xin lỗi, mình chưa có câu trả lời cho câu này 😅. Bạn thử hỏi về: đăng ký đề tài, file thuyết minh, cách duyệt, trạng thái đề tài, báo cáo, hội đồng, điểm, nghiệm thu... hoặc bấm một gợi ý bên dưới nhé.';

// Chọn câu trả lời khớp nhất theo số từ khóa trùng
const findAnswer = (text) => {
  const n = normalize(text);
  let best = null;
  let bestScore = 0;
  for (const item of FAQ) {
    const score = item.keys.reduce((s, k) => (n.includes(k) ? s + 1 : s), 0);
    if (score > bestScore) { bestScore = score; best = item; }
  }
  return bestScore > 0 ? best.a : FALLBACK;
};

const SUGGESTIONS = [
  'Làm sao đăng ký đề tài?',
  'Các trạng thái đề tài?',
  'Làm sao báo cáo đề tài?',
  'Xem điểm ở đâu?',
];

const ChatBot = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Xin chào 👋 Mình là trợ lý NCKH. Bạn cần giải đáp gì về đăng ký, duyệt, báo cáo hay nghiệm thu đề tài?' },
  ]);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, open]);

  const ask = (text) => {
    const q = (text ?? input).trim();
    if (!q) return;
    setMessages((prev) => [...prev, { from: 'user', text: q }]);
    setInput('');
    setTimeout(() => {
      setMessages((prev) => [...prev, { from: 'bot', text: findAnswer(q) }]);
    }, 350);
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
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform .15s',
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
            width: 'min(360px, calc(100vw - 32px))', height: 'min(540px, calc(100vh - 140px))',
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
              <div style={{ fontSize: 12, opacity: 0.8 }}>Giải đáp thắc mắc sinh viên</div>
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
                    maxWidth: '82%', padding: '9px 13px', borderRadius: 14, fontSize: 14, lineHeight: 1.5,
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

            {/* Gợi ý câu hỏi */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  style={{ fontSize: 12.5, padding: '6px 10px', borderRadius: 999, border: `1px solid ${NAVY}33`, background: '#fff', color: NAVY, cursor: 'pointer' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div style={{ padding: 10, borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8, background: '#fff' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ask()}
              placeholder="Nhập câu hỏi..."
              style={{ flex: 1, padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 14, outline: 'none' }}
            />
            <button
              onClick={() => ask()}
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
