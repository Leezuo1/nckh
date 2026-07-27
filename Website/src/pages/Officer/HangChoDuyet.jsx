import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import topicService from '../../services/topicService';

const box = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, marginBottom: 14 };
const btn = { padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 };

const PROPOSAL_FIELDS = [
  { key: 'description', label: 'Mô tả đề tài' },
  { key: 'objective', label: 'Mục tiêu nghiên cứu' },
  { key: 'projectScope', label: 'Phạm vi / đối tượng' },
  { key: 'method', label: 'Phương pháp thực hiện' },
  { key: 'expectedProduct', label: 'Sản phẩm dự kiến' },
];

const HangChoDuyet = () => {
  const { t } = useTranslation();
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
    setOpenId(id);
    setComment('');
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
      setOpenId(null);
      setComment('');
      await load();
    } catch (e) {
      toast.error(e.message || 'Duyệt thất bại');
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Hàng chờ duyệt</h1>
      <p style={{ color: '#6b7280', marginBottom: 20 }}>Các đề tài đang chờ bạn duyệt (Đạt / Không đạt kèm nhận xét).</p>

      {queue.length === 0 ? (
        <div style={{ ...box, textAlign: 'center', color: '#9ca3af', padding: 40 }}>Không có đề tài nào chờ duyệt 🎉</div>
      ) : queue.map(tp => {
        const supervisor = (tp.topicParticipant || []).find(p => p.topicParticipantRole === 'Supervisor');
        const open = openId === tp.id;
        return (
          <div key={tp.id} style={box}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => openTopic(tp.id)}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{tp.topicName}</div>
                <div style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>
                  {tp.topicId} · GVHD: {supervisor?.user?.fullName || '—'} · <span style={{ color: '#2563eb' }}>{t(`status.${tp.status}`, tp.status)}</span>
                </div>
              </div>
              <span style={{ color: '#9ca3af' }}>{open ? '▲' : '▼'}</span>
            </div>

            {open && (
              <div style={{ marginTop: 14, borderTop: '1px solid #f3f4f6', paddingTop: 14 }}>
                {PROPOSAL_FIELDS.map(f => (
                  <div key={f.key} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{f.label}</div>
                    <div style={{ fontSize: 14, color: '#374151', whiteSpace: 'pre-wrap' }}>{proposal[f.key] || <em style={{ color: '#9ca3af' }}>(trống)</em>}</div>
                  </div>
                ))}
                <textarea
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, minHeight: 60, boxSizing: 'border-box', marginBottom: 10 }}
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
    </div>
  );
};

export default HangChoDuyet;
