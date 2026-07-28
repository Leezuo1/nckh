import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { ClipboardCheck, LogOut, FileText } from 'lucide-react';
import topicService from '../../services/topicService';
import authService from '../../services/authService';

const PROPOSAL_FIELDS = [
  { key: 'description', label: 'Mô tả đề tài' },
  { key: 'objective', label: 'Mục tiêu nghiên cứu' },
  { key: 'projectScope', label: 'Phạm vi / đối tượng' },
  { key: 'method', label: 'Phương pháp thực hiện' },
  { key: 'expectedProduct', label: 'Sản phẩm dự kiến' },
];

const ROLE_LABEL = {
  FacultyOfficer: 'Cán bộ NCKH Khoa',
  DepartmentOfficer: 'Cán bộ Phòng NCKH',
  Admin: 'Quản trị viên',
};

const btn = { padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 };

const CanBoDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const roleLabel = ROLE_LABEL[user?.role] || 'Cán bộ';

  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [proposal, setProposal] = useState({});
  const [comment, setComment] = useState('');

  const load = useCallback(async () => {
    try {
      const q = await topicService.getReviewQueue();
      setQueue(q || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openTopic = async (id) => {
    if (openId === id) { setOpenId(null); return; }
    setOpenId(id); setComment('');
    try {
      const versions = await topicService.getProposalVersions(id);
      setProposal(versions?.[0]?.content || {});
    } catch (e) { console.error(e); setProposal({}); }
  };

  const decide = async (id, decision) => {
    if (decision === 'Rejected' && !comment.trim()) {
      toast.error('Nhập nhận xét khi trả về chỉnh sửa');
      return;
    }
    try {
      await topicService.review(id, decision, comment.trim() || undefined);
      toast.success(decision === 'Approved' ? 'Đã duyệt Đạt' : 'Đã trả về chỉnh sửa');
      setOpenId(null); setComment('');
      await load();
    } catch (e) { toast.error(e.message || 'Duyệt thất bại'); }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9' }}>
      {/* Sidebar riêng của khu cán bộ */}
      <aside style={{ width: 250, background: '#0f172a', color: '#e2e8f0', padding: '24px 16px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ClipboardCheck size={22} color="#60a5fa" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Khu Cán bộ</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{roleLabel}</div>
          </div>
        </div>

        <button style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#1e293b', color: '#fff', border: 'none', padding: '10px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
          <FileText size={18} /> Đề tài chờ duyệt
        </button>

        <div style={{ marginTop: 'auto', borderTop: '1px solid #1e293b', paddingTop: 16 }}>
          <div style={{ fontSize: 13, marginBottom: 10 }}>{user?.fullName}</div>
          <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', color: '#f87171', border: 'none', cursor: 'pointer', fontSize: 13 }}>
            <LogOut size={16} /> Về trang người dùng
          </button>
        </div>
      </aside>

      {/* Nội dung */}
      <main style={{ flex: 1, padding: '28px 32px', maxWidth: 1000 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Đề tài chờ duyệt</h1>
        <p style={{ color: '#64748b', marginBottom: 24 }}>Danh sách đề tài đang chờ <b>{roleLabel}</b> duyệt (Đạt / Không đạt kèm nhận xét).</p>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Đang tải...</div>
        ) : queue.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 48, textAlign: 'center', color: '#94a3b8' }}>
            Không có đề tài nào chờ duyệt 🎉
          </div>
        ) : queue.map(tp => {
          const supervisor = (tp.topicParticipant || []).find(p => p.topicParticipantRole === 'Supervisor');
          const open = openId === tp.id;
          return (
            <div key={tp.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => openTopic(tp.id)}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{tp.topicName}</div>
                  <div style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>
                    {tp.topicId} · GVHD: {supervisor?.user?.fullName || '—'} · <span style={{ color: '#2563eb' }}>{t(`status.${tp.status}`, tp.status)}</span>
                  </div>
                </div>
                <span style={{ color: '#94a3b8' }}>{open ? '▲' : '▼'}</span>
              </div>

              {open && (
                <div style={{ marginTop: 14, borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                  {PROPOSAL_FIELDS.map(f => (
                    <div key={f.key} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{f.label}</div>
                      <div style={{ fontSize: 14, color: '#334155', whiteSpace: 'pre-wrap' }}>{proposal[f.key] || <em style={{ color: '#94a3b8' }}>(trống)</em>}</div>
                    </div>
                  ))}
                  <textarea
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14, minHeight: 60, boxSizing: 'border-box', marginBottom: 10 }}
                    placeholder="Nhận xét (bắt buộc khi trả về chỉnh sửa)"
                    value={comment} onChange={e => setComment(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button style={{ ...btn, background: '#16a34a', color: '#fff' }} onClick={() => decide(tp.id, 'Approved')}>Đạt</button>
                    <button style={{ ...btn, background: '#dc2626', color: '#fff' }} onClick={() => decide(tp.id, 'Rejected')}>Không đạt (trả về)</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </main>
    </div>
  );
};

export default CanBoDashboard;
