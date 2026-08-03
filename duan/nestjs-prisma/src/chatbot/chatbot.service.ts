import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Nhãn tiếng Việt cho trạng thái (để đưa vào ngữ cảnh cho dễ hiểu)
const STATUS_VI: Record<string, string> = {
  Pending: 'Chờ xét duyệt',
  PendingFacultyReview: 'Chờ Khoa duyệt',
  FacultyRevision: 'Khoa yêu cầu chỉnh sửa',
  PendingDepartmentReview: 'Chờ Phòng duyệt',
  DepartmentRevision: 'Phòng yêu cầu chỉnh sửa',
  PendingAssign: 'Chờ phân công GVHD',
  WaitingToStart: 'Chờ bắt đầu',
  InProgress: 'Đang thực hiện',
  ReportPendingFaculty: 'Chờ Khoa duyệt báo cáo',
  ReportPendingDepartment: 'Chờ Phòng duyệt báo cáo',
  ReportApproved: 'Chờ lập hội đồng',
  Reporting: 'Báo cáo (khoá)',
  Editing: 'Chỉnh sửa',
  Done: 'Nghiệm thu',
  Cancelled: 'Đã huỷ',
  Draft: 'Nháp',
};

// Kho tri thức quy trình (RAG — nguồn cho câu hỏi về quy trình/biểu mẫu)
const KNOWLEDGE = `
QUY TRÌNH ĐỀ TÀI NCKH SINH VIÊN (ĐH Văn Lang):
- Đăng ký: Sinh viên (hoặc GVHD) vào "Đăng ký ý tưởng", điền thông tin và BẮT BUỘC đính kèm file thuyết minh (.doc/.docx/.pdf).
- Duyệt 2 cấp: Cán bộ NCKH Khoa xem thuyết minh → Đạt/Không đạt; nếu Đạt chuyển Cán bộ Phòng NCKH duyệt tiếp. Không đạt sẽ trả về kèm nhận xét, nhóm sửa rồi nộp lại.
- Phân công: Nếu ý tưởng chưa có GVHD, sau khi duyệt sẽ ở trạng thái "Chờ phân công" và hiện ở "Danh sách ý tưởng"; Cán bộ Khoa cấp GVHD hoặc GVHD nhận hướng dẫn.
- Thực hiện: Cán bộ Khoa đặt thời gian để đề tài chuyển "Đang thực hiện". Nhóm cập nhật tiến độ, tải tài liệu.
- Báo cáo: GVHD/chủ nhiệm bấm "Xin báo cáo" → duyệt Khoa → Phòng → Cán bộ Khoa lập hội đồng (các GVHD) → đề tài vào "Báo cáo" (khoá).
- Chấm điểm: Hội đồng chấm, Cán bộ Khoa nhập điểm; điểm hiển thị ở chi tiết đề tài.
- Nghiệm thu: Sau giai đoạn "Chỉnh sửa" (đếm ngược), đề tài tự chuyển "Nghiệm thu".
- Đăng nhập bằng MSSV + mật khẩu.
`.trim();

@Injectable()
export class ChatbotService {
  constructor(private prisma: PrismaService) {}

  async ask(userId: string, message: string) {
    if (!message || !message.trim()) throw new BadRequestException('Thiếu nội dung câu hỏi');

    // ===== RAG: truy xuất dữ liệu CỦA CHÍNH người hỏi (đúng phân quyền) =====
    const user = await this.prisma.user.findUnique({
      where: { id: userId }, select: { fullName: true, role: true },
    });
    const topics = await this.prisma.topic.findMany({
      where: { OR: [{ topicParticipant: { some: { userId } } }, { submitterId: userId }] },
      select: { id: true, topicName: true, status: true, deadline: true, score: true, editDeadline: true },
      orderBy: { id: 'desc' }, take: 10,
    });
    const topicIds = topics.map((t) => t.id);
    const approvals = topicIds.length
      ? await this.prisma.approvalRecord.findMany({
          where: { topicId: { in: topicIds }, comment: { not: null } },
          orderBy: { created: 'desc' }, take: 8,
        })
      : [];

    const personal = topics.length
      ? topics.map((t) => {
          const cmt = approvals.filter((a) => a.topicId === t.id).map((a) => a.comment).slice(0, 2).join(' | ');
          return `- "${t.topicName}": trạng thái ${STATUS_VI[t.status] || t.status}` +
            (t.deadline ? `, hạn ${new Date(t.deadline).toLocaleDateString('vi-VN')}` : '') +
            (t.score != null ? `, điểm ${t.score}` : '') +
            (cmt ? `. Nhận xét: ${cmt}` : '');
        }).join('\n')
      : '(Sinh viên chưa có đề tài nào)';

    const apiKey = process.env.GEMINI_API_KEY;
    // Ghi nhật ký hội thoại (nhẹ)
    // (không chặn nếu lỗi)
    if (!apiKey) {
      return { answer: this.faqFallback(message), source: 'faq' };
    }

    try {
      const answer = await this.callGemini(apiKey, user, personal, message);
      return { answer, source: 'ai' };
    } catch {
      return { answer: this.faqFallback(message), source: 'faq' };
    }
  }

  private async callGemini(apiKey: string, user: any, personal: string, message: string) {
    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const system =
      `Bạn là "Trợ lý NCKH" — trợ lý ảo hỗ trợ sinh viên về hệ thống quản lý đề tài nghiên cứu khoa học của ĐH Văn Lang. ` +
      `Trả lời NGẮN GỌN, thân thiện, bằng tiếng Việt. CHỈ dựa trên NGỮ CẢNH được cung cấp bên dưới. ` +
      `Nếu câu hỏi nằm ngoài phạm vi hoặc không có dữ liệu, hãy lịch sự nói không có thông tin và hướng dẫn liên hệ Cán bộ NCKH Khoa. TUYỆT ĐỐI không bịa thông tin.`;

    const context =
      `NGƯỜI HỎI: ${user?.fullName || 'Sinh viên'} (vai trò: ${user?.role || 'Student'}).\n\n` +
      `=== KHO TRI THỨC QUY TRÌNH ===\n${KNOWLEDGE}\n\n` +
      `=== DỮ LIỆU ĐỀ TÀI CỦA NGƯỜI HỎI (chỉ của họ) ===\n${personal}\n\n` +
      `=== CÂU HỎI ===\n${message}`;

    const body = {
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: context }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 600 },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Gemini API error ' + res.status);
    const data: any = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';
    if (!text.trim()) throw new Error('Gemini empty');
    return text.trim();
  }

  // Dự phòng khi chưa cắm key: khớp từ khóa với kho tri thức
  private faqFallback(message: string): string {
    const n = message.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đ]/g, 'd');
    const rules: { k: string[]; a: string }[] = [
      { k: ['dang ky', 'y tuong', 'nop de tai'], a: 'Bạn vào menu "Đăng ký ý tưởng", điền thông tin và đính kèm file thuyết minh (bắt buộc), rồi gửi.' },
      { k: ['duyet', 'xet duyet'], a: 'Đề tài được duyệt 2 cấp: Cán bộ Khoa → Cán bộ Phòng, dựa trên file thuyết minh.' },
      { k: ['trang thai', 'status'], a: 'Xem trạng thái đề tài của bạn trong mục "Đề tài của tôi".' },
      { k: ['bao cao'], a: 'Khi đang thực hiện, GVHD/chủ nhiệm bấm "Xin báo cáo" trong chi tiết đề tài.' },
      { k: ['diem', 'ket qua'], a: 'Điểm hiển thị ở trang chi tiết đề tài sau khi Cán bộ Khoa nhập.' },
      { k: ['nghiem thu'], a: 'Hết giai đoạn Chỉnh sửa (đếm ngược), đề tài tự chuyển Nghiệm thu.' },
    ];
    for (const r of rules) if (r.k.some((k) => n.includes(k))) return r.a;
    return 'Xin lỗi, mình chưa có câu trả lời cho câu này. Bạn thử hỏi về đăng ký, duyệt, trạng thái, báo cáo, điểm, nghiệm thu — hoặc liên hệ Cán bộ NCKH Khoa nhé.';
  }
}
