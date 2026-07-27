import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import topicService from '../../services/topicService';

// Các trạng thái thuộc luồng duyệt SRS (Nháp → ... → Chờ Hội đồng đề cương)
const SRS_FLOW = [
  'Draft', 'PendingFacultyReview', 'FacultyRevision',
  'PendingDepartmentReview', 'DepartmentRevision', 'PendingProposalCouncil',
];
// Trạng thái mà nhóm được phép nộp lên cấp trên
const SUBMITTABLE = ['Draft', 'FacultyRevision', 'DepartmentRevision'];

const PROPOSAL_FIELDS = [
  { key: 'description', label: 'Mô tả đề tài' },
  { key: 'objective', label: 'Mục tiêu nghiên cứu' },
  { key: 'projectScope', label: 'Phạm vi / đối tượng' },
  { key: 'method', label: 'Phương pháp thực hiện' },
  { key: 'expectedProduct', label: 'Sản phẩm dự kiến' },
];

const box = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, marginBottom: 16 };
const inp = { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' };
const btn = { padding: '8px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 };

const NhomNghienCuu = () => {
  const { t } = useTranslation();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  // form tạo nhóm
  const [form, setForm] = useState({ topicId: '', topicName: '', year: String(new Date().getFullYear()), deadline: '' });
  // form mời SV
  const [mssv, setMssv] = useState('');
  // nội dung thuyết minh
  const [proposal, setProposal] = useState({});
  const [approvals, setApprovals] = useState([]);

  const load = useCallback(async () => {
    try {
      const all = await topicService.getMyTopics();
      const mine = (all || []).filter(t => SRS_FLOW.includes(t.status));
      setGroups(mine);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selected = groups.find(g => g.id === selectedId) || null;

  // Khi chọn 1 nhóm: nạp thuyết minh mới nhất + lịch sử duyệt
  useEffect(() => {
    if (!selectedId) return;
    (async () => {
      try {
        const versions = await topicService.getProposalVersions(selectedId);
        const latest = versions?.[0]?.content || {};
        setProposal(latest);
        const ap = await topicService.getApprovals(selectedId);
        setApprovals(ap || []);
      } catch (e) { console.error(e); }
    })();
  }, [selectedId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.topicName || !form.topicId || !form.deadline) {
      toast.error('Nhập mã, tên đề tài và hạn nộp');
      return;
    }
    try {
      await topicService.createGroup({
        ...form,
        deadline: new Date(form.deadline).toISOString(),
      });
      toast.success('Đã tạo nhóm nghiên cứu');
      setForm({ topicId: '', topicName: '', year: String(new Date().getFullYear()), deadline: '' });
      await load();
    } catch (e) {
      toast.error(e.message || 'Tạo nhóm thất bại');
    }
  };

  const handleInvite = async () => {
    if (!mssv.trim()) return;
    try {
      await topicService.inviteStudent(selectedId, mssv.trim());
      toast.success('Đã gửi lời mời');
      setMssv('');
      await load();
    } catch (e) {
      toast.error(e.message || 'Mời thất bại');
    }
  };

  const handleRemove = async (userId) => {
    try {
      await topicService.removeInvite(selectedId, userId);
      toast.success('Đã gỡ khỏi nhóm');
      await load();
    } catch (e) {
      toast.error(e.message || 'Gỡ thất bại');
    }
  };

  const handleSaveProposal = async () => {
    try {
      await topicService.saveProposal(selectedId, proposal);
      toast.success('Đã lưu thuyết minh (tạo phiên bản mới)');
      await load();
    } catch (e) {
      toast.error(e.message || 'Lưu thất bại');
    }
  };

  const handleSubmit = async () => {
    try {
      await topicService.submitForReview(selectedId);
      toast.success('Đã nộp hồ sơ lên cấp duyệt');
      await load();
    } catch (e) {
      toast.error(e.message || 'Nộp thất bại');
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Nhóm nghiên cứu (GVHD)</h1>
      <p style={{ color: '#6b7280', marginBottom: 20 }}>Tạo nhóm, mời sinh viên, soạn thuyết minh và nộp lên quy trình duyệt.</p>

      {/* Form tạo nhóm */}
      <form style={box} onSubmit={handleCreate}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>+ Tạo nhóm mới</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 12 }}>
          <input style={inp} placeholder="Mã đề tài (vd NCKH01)" value={form.topicId} onChange={e => setForm({ ...form, topicId: e.target.value })} />
          <input style={inp} placeholder="Tên đề tài" value={form.topicName} onChange={e => setForm({ ...form, topicName: e.target.value })} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'center' }}>
          <input style={inp} placeholder="Năm" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} />
          <input style={inp} type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
          <button style={{ ...btn, background: '#2563eb', color: '#fff' }} type="submit">Tạo nhóm</button>
        </div>
      </form>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
        {/* Danh sách nhóm */}
        <div>
          <h3 style={{ fontSize: 15, marginBottom: 8 }}>Nhóm của tôi ({groups.length})</h3>
          {groups.length === 0 && <p style={{ color: '#9ca3af' }}>Chưa có nhóm nào.</p>}
          {groups.map(g => (
            <div key={g.id} onClick={() => setSelectedId(g.id)}
              style={{ ...box, marginBottom: 10, padding: 12, cursor: 'pointer', borderColor: selectedId === g.id ? '#2563eb' : '#e5e7eb' }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{g.topicName}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{g.topicId} · <span style={{ color: '#2563eb' }}>{t(`status.${g.status}`, g.status)}</span></div>
            </div>
          ))}
        </div>

        {/* Chi tiết nhóm chọn */}
        <div>
          {!selected ? (
            <div style={{ ...box, color: '#9ca3af', textAlign: 'center', padding: 40 }}>Chọn 1 nhóm để quản lý</div>
          ) : (
            <>
              <div style={box}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: 17 }}>{selected.topicName}</h3>
                  <span style={{ background: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                    {t(`status.${selected.status}`, selected.status)}
                  </span>
                </div>
              </div>

              {/* Thành viên + mời */}
              <div style={box}>
                <h4 style={{ margin: '0 0 10px', fontSize: 15 }}>Thành viên nhóm</h4>
                {(selected.topicParticipant || []).map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ fontSize: 14 }}>
                      {p.user?.fullName || 'SV'} <span style={{ color: '#9ca3af', fontSize: 12 }}>({p.user?.userId})</span>
                    </span>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <em style={{ fontSize: 12, color: '#6b7280' }}>
                        {p.topicParticipantRole === 'Supervisor' ? 'GVHD' :
                          p.topicParticipantRole === 'Leader' ? 'Chủ nhiệm' :
                          p.topicParticipantRole === 'Invited' ? 'Đã mời (chờ)' : 'Thành viên'}
                      </em>
                      {['Invited', 'Member'].includes(p.topicParticipantRole) && p.userId && (
                        <button style={{ ...btn, background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', fontSize: 12 }} onClick={() => handleRemove(p.userId)}>Gỡ</button>
                      )}
                    </span>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <input style={inp} placeholder="Nhập MSSV để mời" value={mssv} onChange={e => setMssv(e.target.value)} />
                  <button style={{ ...btn, background: '#2563eb', color: '#fff', whiteSpace: 'nowrap' }} onClick={handleInvite}>Mời SV</button>
                </div>
              </div>

              {/* Thuyết minh */}
              <div style={box}>
                <h4 style={{ margin: '0 0 10px', fontSize: 15 }}>Thuyết minh đề tài</h4>
                {PROPOSAL_FIELDS.map(f => (
                  <div key={f.key} style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>{f.label}</label>
                    <textarea style={{ ...inp, minHeight: 60, resize: 'vertical' }} value={proposal[f.key] || ''}
                      onChange={e => setProposal({ ...proposal, [f.key]: e.target.value })} />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={{ ...btn, background: '#e5e7eb', color: '#111' }} onClick={handleSaveProposal}>Lưu thuyết minh</button>
                  {SUBMITTABLE.includes(selected.status) && (
                    <button style={{ ...btn, background: '#16a34a', color: '#fff' }} onClick={handleSubmit}>
                      {selected.status === 'Draft' ? 'Duyệt sơ bộ & trình Khoa' : 'Nộp lại'}
                    </button>
                  )}
                </div>
              </div>

              {/* Lịch sử duyệt */}
              <div style={box}>
                <h4 style={{ margin: '0 0 10px', fontSize: 15 }}>Lịch sử duyệt</h4>
                {approvals.length === 0 ? <p style={{ color: '#9ca3af', fontSize: 13 }}>Chưa có.</p> :
                  approvals.map(a => (
                    <div key={a.id} style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                      <b style={{ color: a.decision === 'Approved' ? '#16a34a' : '#dc2626' }}>
                        {a.level === 'Supervisor' ? 'GVHD' : a.level === 'Faculty' ? 'Cán bộ Khoa' : 'Cán bộ Phòng'} · {a.decision === 'Approved' ? 'Đạt' : 'Không đạt'}
                      </b>
                      {a.comment && <div style={{ color: '#4b5563', marginTop: 2 }}>{a.comment}</div>}
                      <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 2 }}>
                        {a.reviewer?.fullName || 'Hệ thống'} · {new Date(a.created).toLocaleString('vi-VN')}
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NhomNghienCuu;
