import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { ClipboardCheck, LogOut, FileText, BarChart3, Settings2, CalendarDays } from 'lucide-react';
import topicService from '../../services/topicService';
import authService from '../../services/authService';
import documentService from '../../services/documentService';
import ReportContent from './ReportContent';

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

// Tab "Duyệt & Phân công": duyệt hồ sơ, cấp GVHD, duyệt yêu cầu báo cáo
const DUYET_STATUSES = ['PendingFacultyReview', 'PendingDepartmentReview', 'PendingAssign', 'ReportPendingFaculty', 'ReportPendingDepartment'];
// Tab "Điều hành đề tài": set thời gian, lập hội đồng, nhập điểm, lùi bước
const DIEUHANH_STATUSES = ['WaitingToStart', 'InProgress', 'ReportApproved', 'Reporting', 'Editing', 'Done'];

const CanBoDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const roleLabel = ROLE_LABEL[user?.role] || 'Cán bộ';
  const avatarText = user?.fullName
    ? user.fullName.trim().split(' ').slice(-2).map(w => w[0]).join('').toUpperCase()
    : 'CB';

  const isDept = user?.role === 'DepartmentOfficer' || user?.role === 'Admin';
  const isKhoa = user?.role === 'FacultyOfficer' || user?.role === 'Admin';
  const canReview = ['FacultyOfficer', 'DepartmentOfficer', 'Admin'].includes(user?.role);
  const isDean = user?.role === 'FacultyDean';
  const [view, setView] = useState(canReview ? 'duyet' : 'baocao'); // 'duyet' | 'baocao'
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [proposal, setProposal] = useState({});
  const [docs, setDocs] = useState([]);
  const [comment, setComment] = useState('');
  const [outcome, setOutcome] = useState('Extend'); // Gia hạn/Làm lại/Huỷ khi nghiệm thu Không đạt
  const [batches, setBatches] = useState([]);
  const [batchForm, setBatchForm] = useState({ name: '', year: String(new Date().getFullYear()), deadline: '', description: '' });
  const [lecturers, setLecturers] = useState([]);
  const [pickLec, setPickLec] = useState('');        // cấp GVHD
  const [councilLecs, setCouncilLecs] = useState([]); // hội đồng
  const [councilTime, setCouncilTime] = useState('');
  const [score, setScore] = useState('');
  const [dateTime, setDateTime] = useState('');       // giờ bắt đầu / hạn chỉnh sửa

  const load = useCallback(async () => {
    try {
      if (canReview) {
        const q = await topicService.getReviewQueue();
        setQueue(q || []);
        if (isDept) {
          const b = await topicService.getBatches().catch(() => []);
          setBatches(b || []);
        }
        const lec = await topicService.getLecturersList().catch(() => []);
        setLecturers(lec || []);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [isDept, canReview]);

  // Handlers luồng mới
  const doAssignSup = async (id) => {
    if (!pickLec) { toast.error('Chọn GVHD'); return; }
    try { await topicService.assignSupervisor(id, pickLec); await after('Đã cấp GVHD → Chờ bắt đầu'); setPickLec(''); }
    catch (e) { toast.error(e.message || 'Thất bại'); }
  };
  const doStart = async (id, now) => {
    try {
      if (now) await topicService.proceedTopics([id]);
      else { if (!dateTime) { toast.error('Chọn ngày bắt đầu'); return; } await topicService.scheduleStart([id], new Date(dateTime).toISOString()); }
      await after(now ? 'Đã bắt đầu thực hiện' : 'Đã đặt lịch bắt đầu'); setDateTime('');
    } catch (e) { toast.error(e.message || 'Thất bại'); }
  };
  const doReviewReport = async (id, decision) => {
    try { await topicService.reviewReport(id, decision); await after(decision === 'Approved' ? 'Đã duyệt yêu cầu báo cáo' : 'Đã từ chối'); }
    catch (e) { toast.error(e.message || 'Thất bại'); }
  };
  const doCreateCouncil = async (id) => {
    if (!councilLecs.length) { toast.error('Chọn ít nhất 1 GVHD vào hội đồng'); return; }
    try { await topicService.createReportCouncil(id, councilLecs, councilTime ? new Date(councilTime).toISOString() : undefined); await after('Đã lập hội đồng → Báo cáo'); setCouncilLecs([]); setCouncilTime(''); }
    catch (e) { toast.error(e.message || 'Thất bại'); }
  };
  const doEnterScore = async (id) => {
    if (score === '' || !dateTime) { toast.error('Nhập điểm + hạn chỉnh sửa'); return; }
    try { await topicService.enterScore(id, Number(score), new Date(dateTime).toISOString()); await after('Đã nhập điểm + mở chỉnh sửa'); setScore(''); setDateTime(''); }
    catch (e) { toast.error(e.message || 'Thất bại'); }
  };
  // Lùi trạng thái 1 bước (sửa sai) — dùng lại state machine vòng đời
  const doUndo = async (id) => {
    if (!window.confirm('Lùi đề tài về trạng thái liền trước?')) return;
    try { await topicService.undoTopics([id]); await after('Đã lùi 1 bước'); }
    catch (e) { toast.error(e.message || 'Không lùi được ở trạng thái này'); }
  };

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
    try {
      const d = await documentService.getByTopic(id);
      setDocs(d || []);
    } catch (e) { console.error(e); setDocs([]); }
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

  const isListView = view === 'duyet' || view === 'dieuhanh';
  const shownTopics = queue.filter(tp => (view === 'duyet' ? DUYET_STATUSES : DIEUHANH_STATUSES).includes(tp.status));

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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            canReview && { id: 'duyet', label: 'Duyệt & Phân công', icon: FileText },
            isKhoa && { id: 'dieuhanh', label: 'Điều hành đề tài', icon: Settings2 },
            isDept && { id: 'dot', label: 'Đợt đề tài', icon: CalendarDays },
            { id: 'baocao', label: 'Báo cáo thống kê', icon: BarChart3 },
          ].filter(Boolean).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setView(id)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: view === id ? '#1e293b' : 'transparent', color: view === id ? '#fff' : '#cbd5e1', border: 'none', padding: '10px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, textAlign: 'left' }}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 'auto', borderTop: '1px solid #1e293b', paddingTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
              {avatarText}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.fullName}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{roleLabel}</div>
            </div>
          </div>
          <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', background: '#1e293b', color: '#f87171', border: 'none', borderRadius: 8, padding: '9px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            <LogOut size={16} /> Về trang người dùng
          </button>
        </div>
      </aside>

      {/* Nội dung */}
      <main style={{ flex: 1, padding: '28px 32px', maxWidth: 1000 }}>
        {/* Tab Đợt đề tài (Cán bộ Phòng / Admin) */}
        {view === 'dot' && (
          <>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Đợt đề tài</h1>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
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
          </>
        )}

        {isListView && (<>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{view === 'duyet' ? 'Duyệt & Phân công' : 'Điều hành đề tài'}</h1>
        <p style={{ color: '#64748b', marginBottom: 24 }}>
          {view === 'duyet' ? 'Duyệt hồ sơ (Đạt/Không đạt), cấp GVHD, duyệt yêu cầu báo cáo.' : 'Đặt thời gian, lập hội đồng, nhập điểm, lùi trạng thái.'}
        </p>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Đang tải...</div>
        ) : shownTopics.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 48, textAlign: 'center', color: '#94a3b8' }}>
            Không có đề tài nào trong mục này 🎉
          </div>
        ) : shownTopics.map(tp => {
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} onClick={(e) => e.stopPropagation()}>
                  {['InProgress', 'Reporting', 'Editing', 'Done'].includes(tp.status) && (
                    <button onClick={() => doUndo(tp.id)} title="Lùi trạng thái 1 bước"
                      style={{ ...btn, fontSize: 12, padding: '4px 10px', background: '#f1f5f9', color: '#475569' }}>↩ Lùi bước</button>
                  )}
                  <span style={{ color: '#94a3b8', cursor: 'pointer' }} onClick={() => openTopic(tp.id)}>{open ? '▲' : '▼'}</span>
                </div>
              </div>

              {open && (
                <div style={{ marginTop: 14, borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                  {docs.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>📎 Tài liệu đề tài</div>
                      {docs.map(d => (
                        <button key={d.id} onClick={() => documentService.download(d.id, d.fileName).catch(err => toast.error(err.message || 'Không tải được'))}
                          style={{ display: 'block', background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 13, padding: '2px 0', textAlign: 'left' }}>
                          ⬇ {d.fileName} {d.note ? `(${d.note})` : ''}
                        </button>
                      ))}
                    </div>
                  )}
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
                  {/* Cán bộ Khoa: cấp GVHD cho ý tưởng thiếu người */}
                  {tp.status === 'PendingAssign' && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <select value={pickLec} onChange={e => setPickLec(e.target.value)} style={{ padding: 8, borderRadius: 6, border: '1px solid #cbd5e1' }}>
                        <option value="">— Chọn GVHD —</option>
                        {lecturers.map(l => <option key={l.id} value={l.id}>{l.fullName} ({l.userId})</option>)}
                      </select>
                      <button style={{ ...btn, background: '#2563eb', color: '#fff' }} onClick={() => doAssignSup(tp.id)}>Cấp GVHD</button>
                    </div>
                  )}
                  {/* Cán bộ Khoa: set thời gian bắt đầu */}
                  {tp.status === 'WaitingToStart' && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input type="date" value={dateTime} onChange={e => setDateTime(e.target.value)} style={{ padding: 8, borderRadius: 6, border: '1px solid #cbd5e1' }} />
                      <button style={{ ...btn, background: '#0891b2', color: '#fff' }} onClick={() => doStart(tp.id, false)}>Đặt lịch bắt đầu</button>
                      <button style={{ ...btn, background: '#16a34a', color: '#fff' }} onClick={() => doStart(tp.id, true)}>Bắt đầu ngay</button>
                    </div>
                  )}
                  {/* Duyệt yêu cầu báo cáo (Khoa/Phòng) */}
                  {['ReportPendingFaculty', 'ReportPendingDepartment'].includes(tp.status) && (
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button style={{ ...btn, background: '#16a34a', color: '#fff' }} onClick={() => doReviewReport(tp.id, 'Approved')}>Đồng ý báo cáo</button>
                      <button style={{ ...btn, background: '#dc2626', color: '#fff' }} onClick={() => doReviewReport(tp.id, 'Rejected')}>Từ chối</button>
                    </div>
                  )}
                  {/* Cán bộ Khoa: lập hội đồng báo cáo */}
                  {tp.status === 'ReportApproved' && (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Chọn GVHD vào hội đồng:</div>
                      <div style={{ maxHeight: 130, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6, padding: 8, marginBottom: 8 }}>
                        {lecturers.map(l => (
                          <label key={l.id} style={{ display: 'block', fontSize: 13, padding: '2px 0', cursor: 'pointer' }}>
                            <input type="checkbox" checked={councilLecs.includes(l.id)}
                              onChange={e => setCouncilLecs(e.target.checked ? [...councilLecs, l.id] : councilLecs.filter(x => x !== l.id))} /> {l.fullName} ({l.userId})
                          </label>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <input type="datetime-local" value={councilTime} onChange={e => setCouncilTime(e.target.value)} style={{ padding: 8, borderRadius: 6, border: '1px solid #cbd5e1' }} />
                        <button style={{ ...btn, background: '#7c3aed', color: '#fff' }} onClick={() => doCreateCouncil(tp.id)}>Lập hội đồng → Báo cáo</button>
                      </div>
                    </div>
                  )}
                  {/* Cán bộ Khoa: nhập điểm + mở chỉnh sửa */}
                  {tp.status === 'Reporting' && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input type="number" step="0.1" min="0" max="10" placeholder="Điểm" value={score} onChange={e => setScore(e.target.value)} style={{ width: 90, padding: 8, borderRadius: 6, border: '1px solid #cbd5e1' }} />
                      <span style={{ fontSize: 13, color: '#64748b' }}>Hạn chỉnh sửa:</span>
                      <input type="datetime-local" value={dateTime} onChange={e => setDateTime(e.target.value)} style={{ padding: 8, borderRadius: 6, border: '1px solid #cbd5e1' }} />
                      <button style={{ ...btn, background: '#16a34a', color: '#fff' }} onClick={() => doEnterScore(tp.id)}>Nhập điểm & mở chỉnh sửa</button>
                    </div>
                  )}
                  {['InProgress', 'Editing'].includes(tp.status) && (
                    <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
                      {tp.status === 'InProgress' ? 'Đang thực hiện — chờ nhóm gửi yêu cầu báo cáo.' : 'Đang chỉnh sửa — hết giờ tự Nghiệm thu.'}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
        </>)}

        {view === 'baocao' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Báo cáo thống kê</h1>
            <p style={{ color: '#64748b', marginBottom: 24 }}>Tổng quan đề tài nghiên cứu khoa học (chỉ đọc).</p>
            <ReportContent />
          </>
        )}
      </main>
    </div>
  );
};

export default CanBoDashboard;
