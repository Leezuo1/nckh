import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import topicService from '../../../services/topicService';

const box = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, marginBottom: 12 };
const btn = { padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 };

const LoiMoi = () => {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);

  const userId = (() => {
    try { return JSON.parse(localStorage.getItem('user_info') || 'null')?.id; } catch { return null; }
  })();

  const load = useCallback(async () => {
    try {
      const all = await topicService.getMyTopics();
      // Đề tài mà mình đang được mời (participant role Invited)
      const mine = (all || []).filter(t =>
        (t.topicParticipant || []).some(p => p.userId === userId && p.topicParticipantRole === 'Invited')
      );
      setInvites(mine);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const respond = async (topicId, accept) => {
    try {
      await topicService.respondInvite(topicId, accept);
      toast.success(accept ? 'Đã tham gia nhóm' : 'Đã từ chối lời mời');
      await load();
    } catch (e) {
      toast.error(e.message || 'Thao tác thất bại');
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Lời mời tham gia nhóm</h1>
      <p style={{ color: '#6b7280', marginBottom: 20 }}>Các đề tài mà GVHD mời bạn tham gia.</p>

      {invites.length === 0 ? (
        <div style={{ ...box, textAlign: 'center', color: '#9ca3af', padding: 40 }}>Không có lời mời nào 🙌</div>
      ) : invites.map(t => {
        const supervisor = (t.topicParticipant || []).find(p => p.topicParticipantRole === 'Supervisor');
        return (
          <div key={t.id} style={box}>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{t.topicName}</div>
            <div style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 12px' }}>
              {t.topicId} · GVHD: {supervisor?.user?.fullName || '—'}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ ...btn, background: '#16a34a', color: '#fff' }} onClick={() => respond(t.id, true)}>Chấp nhận</button>
              <button style={{ ...btn, background: '#fee2e2', color: '#b91c1c' }} onClick={() => respond(t.id, false)}>Từ chối</button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LoiMoi;
