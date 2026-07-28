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

  const isDept = user?.role === 'DepartmentOfficer' || user?.role === 'Admin';
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [proposal, setProposal] = useState({});
  const [comment, setComment] = useState('');
  const [outcome, setOutcome] = useState('Extend'); // Gia hạn/Làm lại/Huỷ khi nghiệm thu Không đạt
  const [batches, setBatches] = useState([]);
  const [batchForm, setBatchForm] = useState({ name: '', year: String(new Date().getFullYear()), deadline: '', description: '' });

  const load = useCallback(async () => {
    try {
      const q = await topicService.getReviewQueue();
      setQueue(q || []);
      if (isDept) {
        const b = await topicService.getBatches().catch(() => []);
        setBatches(b || []);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [isDept]);

  const handleCreateBatch = async () => {
    if (!batchForm.name.trim() || !batchForm.deadline) { toast.error('Nhập tên đợt và hạn nộp'); return; }
    try {
      await topicService.createBatch({ ...batchForm, deadline: new Date(batchForm.deadline).toISOString() });
      toast.success('Đã tạo đợt đề tài + thông báo GVHD');
      setBatchForm({ name: '', year: String(new Date().getFullYear()), deadline: '', description: '' });
      await load();
    } catch (e) { toast.error(e.message || 'Tạo đợt thất bại'); }
  };
  const handleToggleBatch = async (id) => {
    try { await topicService.toggleBatch(id); await load(); } catch (e) { toast.error(e.message || 'Thất bại'); }
  };

  useEffect(() => { load(); }, [load]);

  const openTopic = async (id) => {
    if (openId === id) { setOpenId(null); return; }
    setOpenId(id); setComment('');
    try {
      const versions = await topicService.getProposalVersions(id);
      setProposal(versions?.[0]?.content || {});
    } catch (e) { console.error(e); setProposal({}); }
  };

  const after = async (msg) => { toast.success(msg); setOpenId(null); setComment(''); await load(); };

  // Duyệt hồ sơ nhiều cấp (Khoa/Phòng)
  const doReview = async (id, decision) => {
    if (decision === 'Rejected' && !comment.trim()) { toast.error('Nhập nhận xét khi trả về chỉnh sửa'); return; }
    try {
      await topicService.review(id, decision, comment.trim() || undefined);
      await after(decision === 'Approved' ? 'Đã duyệt Đạt' : 'Đã trả về chỉnh sửa');
    } catch (e) { toast.error(e.message || 'Duyệt thất bại'); }
  };

  // Hội đồng đề cương: Đạt → giao đề tài; Không đạt → làm lại
  const doProposalCouncil = async (id, decision) => {
    if (decision === 'Rejected' && !comment.trim()) { toast.error('Nhập nhận xét khi không đạt'); return; }
    try {
      await topicService.councilProposal(id, decision, comment.trim() || undefined);
      await after(decision === 'Approved' ? 'Đạt — đã giao đề tài' : 'Không đạt — làm lại đề cương');
    } catch (e) { toast.error(e.message || 'Thao tác thất bại'); }
  };

  // Hội đồng phản biện/nghiệm thu
  const doReviewCouncil = async (id, decision) => {
    if (decision === 'Rejected' && !comment.trim()) { toast.error('Nhập nhận xét khi không đạt'); return; }
    try {
      await topicService.councilReview(id, decision, decision === 'Rejected' ? outcome : undefined, comment.trim() || undefined);
      const label = decision === 'Approved' ? 'Đã nghiệm thu'
        : outcome === 'Extend' ? 'Đã gia hạn' : outcome === 'Redo' ? 'Cho làm lại đề cương' : 'Đã huỷ đề tài';
      await after(label);
    } catch (e) { toast.error(e.message || 'Thao tác thất bại'); }
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
        {/* Quản lý đợt đề tài — chỉ Cán bộ Phòng / Admin */}
        {isDept && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px' }}>🗓 Đợt đề tài</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <input placeholder="Tên đợt (vd Đợt 1 - 2026)" value={batchForm.name} onChange={e => setBatchForm({ ...batchForm, name: e.target.value })} style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }} />
              <input placeholder="Năm" value={batchForm.year} onChange={e => setBatchForm({ ...batchForm, year: e.target.value })} style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }} />
              <input type="date" value={batchForm.deadline} onChange={e => setBatchForm({ ...batchForm, deadline: e.target.value })} style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }} />
              <button style={{ ...btn, background: '#2563eb', color: '#fff' }} onClick={handleCreateBatch}>Mở đợt</button>
            </div>
            {batches.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>Chưa có đợt nào.</p>
            ) : batches.map(b => (
              <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid #f1f5f9', fontSize: 14 }}>
                <span>{b.name} <span style={{ color: '#94a3b8', fontSize: 12 }}>({b.year}) · hạn {new Date(b.deadline).toLocaleDateString('vi-VN')}</span></span>
                <button onClick={() => handleToggleBatch(b.id)} style={{ ...btn, fontSize: 12, padding: '4px 10px', background: b.isOpen ? '#dcfce7' : '#fee2e2', color: b.isOpen ? '#166534' : '#b91c1c' }}>
                  {b.isOpen ? 'Đang mở — bấm để đóng' : 'Đã đóng — bấm để mở'}
                </button>
              </div>
            ))}
          </div>
        )}

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
                  {/* Duyệt hồ sơ (Khoa/Phòng) */}
                  {['PendingFacultyReview', 'PendingDepartmentReview'].includes(tp.status) && (
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button style={{ ...btn, background: '#16a34a', color: '#fff' }} onClick={() => doReview(tp.id, 'Approved')}>Đạt</button>
                      <button style={{ ...btn, background: '#dc2626', color: '#fff' }} onClick={() => doReview(tp.id, 'Rejected')}>Không đạt (trả về)</button>
                    </div>
                  )}
                  {/* Hội đồng đề cương */}
                  {tp.status === 'PendingProposalCouncil' && (
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button style={{ ...btn, background: '#16a34a', color: '#fff' }} onClick={() => doProposalCouncil(tp.id, 'Approved')}>Đạt — giao đề tài</button>
                      <button style={{ ...btn, background: '#dc2626', color: '#fff' }} onClick={() => doProposalCouncil(tp.id, 'Rejected')}>Không đạt — làm lại</button>
                    </div>
                  )}
                  {/* Hội đồng phản biện / nghiệm thu */}
                  {['InProgress', 'Reporting', 'Editing', 'PendingReviewCouncil'].includes(tp.status) && (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Hội đồng phản biện / nghiệm thu:</div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <button style={{ ...btn, background: '#16a34a', color: '#fff' }} onClick={() => doReviewCouncil(tp.id, 'Approved')}>Nghiệm thu (Đạt)</button>
                        <select value={outcome} onChange={e => setOutcome(e.target.value)} style={{ padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                          <option value="Extend">Gia hạn</option>
                          <option value="Redo">Làm lại đề cương</option>
                          <option value="Cancel">Huỷ đề tài</option>
                        </select>
                        <button style={{ ...btn, background: '#dc2626', color: '#fff' }} onClick={() => doReviewCouncil(tp.id, 'Rejected')}>Không đạt</button>
                      </div>
                    </div>
                  )}
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
