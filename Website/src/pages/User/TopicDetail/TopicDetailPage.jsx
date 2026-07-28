import { useNavigate, useParams } from 'react-router-dom'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useRef, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import topicService from '../../../services/topicService'
import documentService from '../../../services/documentService'
import timelineService from '../../../services/timelineService'
import authService from '../../../services/authService'
import { mapTopicStatus, mapUserRole } from '../../../utils/mappers'
import './TopicDetailPage.css'

const getStatusClass = (status) => {
  switch (status) {
    case 'Chờ xét duyệt':  return 'pending'
    case 'Chờ bắt đầu':    return 'waiting'
    case 'Hủy':            return 'cancelled'
    case 'Nghiệm Thu':     return 'completed'
    case 'Hoàn Thành':     return 'completed'
    case 'Đang Thực Hiện': return 'in-progress'
    case 'Trễ':            return 'late'
    case 'Báo Cáo':        return 'reporting'
    case 'Chỉnh Sửa':      return 'editing'
    default:               return 'pending'
  }
}

// Trạng thái khoá: chỉ tải tài liệu, không upload/sửa
const LOCKED_STATUSES = ['Reporting', 'Done', 'Cancelled']

// ===== Luồng duyệt SRS =====
const SRS_STATUSES = ['Draft', 'PendingFacultyReview', 'FacultyRevision', 'PendingDepartmentReview', 'DepartmentRevision', 'PendingProposalCouncil']
const SUBMITTABLE = ['Draft', 'FacultyRevision', 'DepartmentRevision']
const PROPOSAL_FIELDS = [
  { key: 'description', label: 'Mô tả đề tài' },
  { key: 'objective', label: 'Mục tiêu nghiên cứu' },
  { key: 'projectScope', label: 'Phạm vi / đối tượng' },
  { key: 'method', label: 'Phương pháp thực hiện' },
  { key: 'expectedProduct', label: 'Sản phẩm dự kiến' },
]

const TopicDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const fileInputRef = useRef(null)
  const imageInputRef = useRef(null)
  const [topic, setTopic] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [uploadedImage, setUploadedImage] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [timelines, setTimelines] = useState([])
  const [showAddTimeline, setShowAddTimeline] = useState(false)
  const [newTl, setNewTl] = useState({ name: '', deadline: '' })
  const [accessData, setAccessData] = useState([])
  const [progressInput, setProgressInput] = useState(0)
  const [savingProgress, setSavingProgress] = useState(false)
  const [srsProposal, setSrsProposal] = useState({})
  const [inviteMssv, setInviteMssv] = useState('')

  const currentUser = authService.getCurrentUser()
  const isLeader = topic?.submitterId === currentUser?.id
  // Đã là participant chưa?
  const myParticipation = topic?.topicParticipant?.find(p => p.userId === currentUser?.id)
  const alreadyRequested = !!myParticipation
  // Show nút "Xin tham gia" khi: là idea (isAssigned=false), không phải submitter, chưa xin
  const canRequestJoin = topic && !topic.isAssigned && !isLeader && !alreadyRequested

  // Quyền chỉnh tiến độ: Supervisor / Leader / Admin
  const myRole = myParticipation?.topicParticipantRole
  const canEditProgress =
    (topic?.status === 'InProgress' || topic?.status === 'Editing') &&
    (myRole === 'Supervisor' || myRole === 'Leader' || currentUser?.role === 'Admin')

  // ===== Cờ luồng SRS =====
  const isSrsFlow = topic && SRS_STATUSES.includes(topic.status)
  const iAmSupervisor = myRole === 'Supervisor'
  const iAmInvited = myRole === 'Invited'
  const iAmGroupMember = ['Supervisor', 'Leader', 'Member'].includes(myRole)
  const canSubmitProposal =
    (iAmSupervisor || myRole === 'Leader' || currentUser?.role === 'Admin') &&
    SUBMITTABLE.includes(topic?.status)

  // Dữ liệu biểu đồ tiến độ từ progressHistory
  const progressData = (() => {
    const hist = Array.isArray(topic?.progressHistory) ? topic.progressHistory : []
    if (hist.length === 0) {
      // Chưa có lịch sử → hiện 1 điểm hiện tại
      return [{ month: 'Bắt đầu', value: 0 }, { month: 'Hiện tại', value: topic?.progress || 0 }]
    }
    return hist.map((h, i) => ({
      month: new Date(h.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      value: h.value,
    }))
  })()

  // Xin tham gia ý tưởng
  const handleRequestJoin = async () => {
    try {
      await topicService.requestAssign(id)
      toast.success(t('ideaList.joinSent') + ' "' + topic.topicName + '"')
      // Reload topic để cập nhật participant
      const updated = await topicService.getTopicById(id)
      setTopic(updated)
    } catch (err) { /* toast tự hiện */ }
  }

  // ===== Handlers luồng SRS =====
  const reloadTopic = async () => {
    const updated = await topicService.getTopicById(id)
    setTopic(updated)
    setSrsProposal(updated.proposalVersions?.[0]?.content || {})
  }
  const handleInviteStudent = async () => {
    if (!inviteMssv.trim()) return
    try {
      await topicService.inviteStudent(id, inviteMssv.trim())
      toast.success('Đã gửi lời mời')
      setInviteMssv('')
      await reloadTopic()
    } catch (err) { /* toast tự hiện */ }
  }
  const handleRemoveMember = async (userId) => {
    try {
      await topicService.removeInvite(id, userId)
      toast.success('Đã gỡ khỏi nhóm')
      await reloadTopic()
    } catch (err) { /* toast tự hiện */ }
  }
  const handleSaveProposal = async () => {
    try {
      await topicService.saveProposal(id, srsProposal)
      toast.success('Đã lưu thuyết minh (tạo phiên bản mới)')
      await reloadTopic()
    } catch (err) { /* toast tự hiện */ }
  }
  const handleSubmitProposal = async () => {
    try {
      await topicService.submitForReview(id)
      toast.success('Đã nộp hồ sơ lên cấp duyệt')
      await reloadTopic()
    } catch (err) { /* toast tự hiện */ }
  }
  const handleRespondInvite = async (accept) => {
    try {
      await topicService.respondInvite(id, accept)
      toast.success(accept ? 'Đã tham gia nhóm' : 'Đã từ chối lời mời')
      await reloadTopic()
    } catch (err) { /* toast tự hiện */ }
  }

  useEffect(() => {
    const fetchTopic = async () => {
      try {
        setLoading(true)
        const [topicData, docs, tls, stats] = await Promise.all([
          topicService.getTopicById(id),
          documentService.getByTopic(id).catch(() => []),
          timelineService.getByTopic(id).catch(() => []),
          topicService.getAccessStats(id).catch(() => []),
        ])
        setTopic(topicData)
        setUploadedImage(topicData.bgImage || null)
        setUploadedFiles(docs)
        setTimelines(tls)
        setAccessData(stats)
        setProgressInput(topicData.progress || 0)
        setSrsProposal(topicData.proposalVersions?.[0]?.content || {})

        // Ghi nhận lượt truy cập (chỉ tính nếu là participant)
        topicService.recordAccess(id).catch(() => {})
      } catch (err) {
        console.error('Lỗi tải đề tài:', err)
        navigate('/de-tai-cua-toi')
      } finally {
        setLoading(false)
      }
    }
    fetchTopic()
  }, [id])

  // Cập nhật tiến độ
  const handleUpdateProgress = async () => {
    setSavingProgress(true)
    try {
      const updated = await topicService.updateProgress(id, Number(progressInput))
      setTopic(prev => ({ ...prev, ...updated }))
      toast.success('Đã cập nhật tiến độ')
    } catch (err) { /* toast tự hiện */ }
    finally { setSavingProgress(false) }
  }

  // === TIMELINE HANDLERS ===
  const handleAddTimeline = async () => {
    if (!newTl.name.trim() || !newTl.deadline) {
      toast.error(t('topicDetail.milestoneName'))
      return
    }
    try {
      const tl = await timelineService.create(id, newTl.name, newTl.deadline)
      setTimelines(prev => [...prev, tl].sort((a, b) => new Date(a.deadline) - new Date(b.deadline)))
      setNewTl({ name: '', deadline: '' })
      setShowAddTimeline(false)
      toast.success(t('topicDetail.addedMilestone'))
    } catch (err) { /* toast tự hiện */ }
  }

  const handleToggleTimeline = async (tlId) => {
    try {
      const updated = await timelineService.toggleComplete(tlId)
      setTimelines(prev => prev.map(t => t.id === tlId ? updated : t))
    } catch (err) { /* toast tự hiện */ }
  }

  const handleDeleteTimeline = async (tlId) => {
    if (!confirm(t('topicDetail.confirmDeleteTimeline'))) return
    try {
      await timelineService.delete(tlId)
      setTimelines(prev => prev.filter(tm => tm.id !== tlId))
      toast.success(t('topicDetail.deletedItem'))
    } catch (err) { /* toast tự hiện */ }
  }

  const statusVi = mapTopicStatus(topic?.isLate ? 'Late' : topic?.status)
  // Khoá khi Báo Cáo / Nghiệm Thu / Hủy. Chỉnh Sửa thì mở lại (trong hạn).
  const isEditable = !!topic && !LOCKED_STATUSES.includes(topic.status)

  // Lấy danh sách sinh viên từ topicParticipant
  const students = topic?.topicParticipant
    ?.filter(p => p.topicParticipantRole !== 'Supervisor')
    ?.map(p => ({
      fullName: p.user?.fullName,
      studentId: p.user?.userId,
      role: mapUserRole(p.topicParticipantRole),
    })) || []

  // Xử lý upload tài liệu — gọi API thật
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    setUploading(true)
    try {
      for (const file of files) {
        const doc = await documentService.upload(id, file)
        setUploadedFiles(prev => [doc, ...prev])
      }
    } catch (err) {
      // Toast tự hiện qua axios interceptor
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Xóa document
  const handleDeleteFile = async (docId) => {
    if (!confirm(t('topicDetail.confirmDelete'))) return
    try {
      await documentService.delete(docId)
      setUploadedFiles(prev => prev.filter(f => f.id !== docId))
    } catch (err) {
      // Toast tự hiện qua axios interceptor
    }
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => setUploadedImage(reader.result)
    reader.readAsDataURL(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => setUploadedImage(reader.result)
    reader.readAsDataURL(file)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>{t('common.loading')}</div>
  if (!topic) return null

  return (
    <div className="detail-page">
      {/* Nút đóng */}
      <button className="btn-close-detail" onClick={() => navigate('/de-tai-cua-toi')}>✕</button>

      {/* Badge trạng thái */}
      <span className={`detail-badge ${getStatusClass(statusVi)}`}>
        • {statusVi}
      </span>

      {/* Tiêu đề */}
      <h1 className="detail-title">{topic.topicName}</h1>

      {/* Nút Xin tham gia — nếu là ý tưởng chưa assign và không phải của mình */}
      {canRequestJoin && (
        <button
          onClick={handleRequestJoin}
          style={{
            padding: '10px 24px', background: '#1e2d5a', color: 'white',
            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
            cursor: 'pointer', marginTop: 12,
          }}
          onMouseEnter={e => e.target.style.background = '#be1e2d'}
          onMouseLeave={e => e.target.style.background = '#1e2d5a'}
        >
          ⊕ {t('ideaList.btnJoin')}
        </button>
      )}
      {alreadyRequested && !topic.isAssigned && myParticipation?.topicParticipantRole === 'PendingMember' && (
        <div style={{
          padding: '8px 16px', background: '#fff3cd', color: '#856404',
          borderRadius: 8, fontSize: 13, marginTop: 12, display: 'inline-block',
        }}>
          ⏳ Đang chờ chủ ý tưởng duyệt yêu cầu của bạn
        </div>
      )}

      {/* ===== PANEL LUỒNG DUYỆT SRS (Nháp → Khoa → Phòng) ===== */}
      {isSrsFlow && (
        <div style={{ marginTop: 16 }}>
          {/* SV được mời: chấp nhận / từ chối */}
          {iAmInvited && (
            <div style={{ padding: 14, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, marginBottom: 14 }}>
              <b>GVHD mời bạn tham gia nhóm nghiên cứu này.</b>
              <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
                <button onClick={() => handleRespondInvite(true)} style={{ padding: '8px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, background: '#16a34a', color: '#fff' }}>Chấp nhận</button>
                <button onClick={() => handleRespondInvite(false)} style={{ padding: '8px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, background: '#fee2e2', color: '#b91c1c' }}>Từ chối</button>
              </div>
            </div>
          )}

          {/* GVHD: mời sinh viên */}
          {iAmSupervisor && (
            <div style={{ padding: 14, background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10, marginBottom: 14 }}>
              <h3 className="section-label" style={{ marginTop: 0 }}>👥 Mời sinh viên vào nhóm</h3>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input value={inviteMssv} onChange={e => setInviteMssv(e.target.value)} placeholder="Nhập MSSV để mời"
                  style={{ flex: 1, padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }} />
                <button onClick={handleInviteStudent} style={{ padding: '8px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, background: '#2563eb', color: '#fff', whiteSpace: 'nowrap' }}>Mời SV</button>
              </div>
              {topic.topicParticipant?.filter(p => ['Invited', 'Member'].includes(p.topicParticipantRole)).map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: '1px solid #f1f5f9', fontSize: 14 }}>
                  <span>{p.user?.fullName} <span style={{ color: '#9ca3af', fontSize: 12 }}>({p.user?.userId})</span> — {p.topicParticipantRole === 'Invited' ? 'Đã mời (chờ)' : 'Thành viên'}</span>
                  {p.userId && <button onClick={() => handleRemoveMember(p.userId)} style={{ padding: '2px 8px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, background: '#fee2e2', color: '#b91c1c' }}>Gỡ</button>}
                </div>
              ))}
            </div>
          )}

          {/* Nhóm: soạn thuyết minh + nộp */}
          {iAmGroupMember && (
            <div style={{ padding: 14, background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10, marginBottom: 14 }}>
              <h3 className="section-label" style={{ marginTop: 0 }}>📝 Thuyết minh đề tài</h3>
              {PROPOSAL_FIELDS.map(f => (
                <div key={f.key} style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>{f.label}</label>
                  <textarea value={srsProposal[f.key] || ''} onChange={e => setSrsProposal({ ...srsProposal, [f.key]: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, minHeight: 56, resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleSaveProposal} style={{ padding: '8px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, background: '#e5e7eb', color: '#111' }}>Lưu thuyết minh</button>
                {canSubmitProposal && (
                  <button onClick={handleSubmitProposal} style={{ padding: '8px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, background: '#16a34a', color: '#fff' }}>
                    {topic.status === 'Draft' ? 'Duyệt sơ bộ & trình Khoa' : 'Nộp lại'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Lịch sử duyệt (mọi thành viên nhóm) */}
          {iAmGroupMember && (
            <div style={{ padding: 14, background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10 }}>
              <h3 className="section-label" style={{ marginTop: 0 }}>🗂 Lịch sử duyệt</h3>
              {(!topic.approvalRecords || topic.approvalRecords.length === 0) ? (
                <p style={{ color: '#9ca3af', fontSize: 13, margin: 0 }}>Chưa có lượt duyệt nào.</p>
              ) : topic.approvalRecords.map(a => (
                <div key={a.id} style={{ padding: '8px 0', borderTop: '1px solid #f1f5f9', fontSize: 13 }}>
                  <b style={{ color: a.decision === 'Approved' ? '#16a34a' : '#dc2626' }}>
                    {a.level === 'Supervisor' ? 'GVHD' : a.level === 'Faculty' ? 'Cán bộ Khoa' : 'Cán bộ Phòng'} · {a.decision === 'Approved' ? 'Đạt' : 'Không đạt'}
                  </b>
                  {a.comment && <div style={{ color: '#4b5563', marginTop: 2 }}>{a.comment}</div>}
                  <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 2 }}>{a.reviewer?.fullName || 'Hệ thống'} · {new Date(a.created).toLocaleString('vi-VN')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="detail-divider" />

      {/* Tên đề tài */}
      <div className="detail-section">
        <h3 className="section-label">📁 {t('topicDetail.topicName')}</h3>
        <p className="section-value">{topic.topicName}</p>
      </div>

      <div className="detail-divider" />

      {/* Mô tả */}
      <div className="detail-section">
        <h3 className="section-label">📖 {t('topicDetail.briefDescription')}</h3>
        <p className="section-value">{topic.description || t('topicDetail.noDescription')}</p>
      </div>

      <div className="detail-divider" />

      {/* Năm / Deadline / Tình trạng */}
      <div className="detail-meta">
        <div className="meta-item">
          <span className="meta-label">📅 {t('topic.year')}</span>
          <span className="meta-value">{topic.year}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">⏰ {t('topic.deadline')}</span>
          <span className="meta-value">{new Date(topic.deadline).toLocaleDateString()}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">② {t('topic.status')}</span>
          <span className="meta-value">{statusVi}</span>
        </div>
      </div>

      <div className="detail-divider" />

      {/* Biểu đồ */}
      <div className="chart-row">
        {/* Biểu đồ cột - Tần suất truy cập */}
        <div className="chart-box">
          <h3 className="chart-title">📊 {t('topicDetail.accessChart')}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={accessData}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#1e2d5a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Biểu đồ đường - Tiến độ hoàn thành */}
        <div className="chart-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="chart-title">{t('topicDetail.progressChart')}</h3>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#1e2d5a' }}>
              {topic.progress || 0}%
            </span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={progressData}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#1e2d5a"
                strokeWidth={2}
                dot={{ r: 3, fill: '#1e2d5a' }}
                activeDot={{ r: 6, fill: '#be1e2d' }}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Editor tiến độ - chỉ Supervisor/Leader/Admin */}
          {canEditProgress && (
            <div style={{ marginTop: 12, padding: 12, background: '#f8f9fa', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={progressInput}
                  onChange={e => setProgressInput(e.target.value)}
                  style={{ flex: 1 }}
                />
                <span style={{ fontWeight: 700, minWidth: 44, textAlign: 'right' }}>{progressInput}%</span>
                <button
                  onClick={handleUpdateProgress}
                  disabled={savingProgress || Number(progressInput) === (topic.progress || 0)}
                  style={{
                    padding: '6px 14px', background: '#28a745', color: 'white',
                    border: 'none', borderRadius: 6, fontWeight: 600,
                    cursor: savingProgress ? 'wait' : 'pointer',
                    opacity: Number(progressInput) === (topic.progress || 0) ? 0.5 : 1,
                  }}
                >
                  {savingProgress ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
              <p style={{ fontSize: 11, color: '#888', margin: '6px 0 0' }}>
                Chỉ GV hướng dẫn / chủ nhiệm đề tài mới chỉnh được. Đạt 100% sẽ tự chuyển "Hoàn thành".
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="detail-divider" />

      {/* Thông tin thành viên */}
      <div className="detail-section">
        <table className="student-table">
          <thead>
            <tr>
              <th>{t('topic.memberName')}</th>
              <th>{t('topic.memberId')}</th>
              <th>{t('topic.memberRole')}</th>
            </tr>
          </thead>
          <tbody>
            {topic.topicParticipant?.map((p, index) => (
              <tr key={`real-${index}`}>
                <td><strong>{p.user?.fullName}</strong></td>
                <td>{p.user?.userId}</td>
                <td>{mapUserRole(p.topicParticipantRole)}</td>
              </tr>
            ))}
            {/* Thành viên ngoài hệ thống (do SV điền lúc xin assign nhưng MSSV không khớp) */}
            {topic.teamMembersInfo?.filter(s => {
              if (!s.studentId) return false;
              // Loại bỏ SV đã có trong topicParticipant (tránh trùng)
              return !topic.topicParticipant?.some(p => p.user?.userId === s.studentId);
            }).map((s, idx) => (
              <tr key={`info-${idx}`} style={{ background: '#fffbe6' }}>
                <td><strong>{s.fullName || '—'}</strong></td>
                <td>{s.studentId}</td>
                <td style={{ color: '#888', fontStyle: 'italic' }}>Thành viên (chưa có tài khoản)</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="detail-divider" />

      {/* === TIMELINE === */}
      <div className="detail-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 className="section-label" style={{ margin: 0 }}>📅 {t('topic.timeline')}</h3>
          {isLeader && isEditable && (
            <button
              onClick={() => setShowAddTimeline(!showAddTimeline)}
              style={{
                padding: '6px 14px', background: '#1e2d5a', color: 'white',
                border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {showAddTimeline ? '✕ ' + t('common.cancel') : '⊕ ' + t('topic.addTimeline')}
            </button>
          )}
        </div>

        {showAddTimeline && (
          <div style={{ padding: 12, background: '#f8f9fa', borderRadius: 8, marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder={t('topicDetail.milestoneName')}
              value={newTl.name}
              onChange={e => setNewTl({ ...newTl, name: e.target.value })}
              style={{ flex: '2 1 200px', padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
            />
            <input
              type="date"
              value={newTl.deadline}
              onChange={e => setNewTl({ ...newTl, deadline: e.target.value })}
              style={{ flex: '1 1 140px', padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
            />
            <button
              onClick={handleAddTimeline}
              style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}
            >
              {t('common.add')}
            </button>
          </div>
        )}

        {timelines.length === 0 ? (
          <p style={{ color: '#999', fontSize: 13, fontStyle: 'italic' }}>
            {t('topicDetail.noTimeline')}{isLeader && isEditable ? ' — ' + t('topicDetail.addMilestone') : ''}.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {timelines.map(tl => {
              const isOverdue = !tl.isCompleted && new Date(tl.deadline) < new Date()
              return (
                <div
                  key={tl.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                    background: tl.isCompleted ? '#e8f5e9' : isOverdue ? '#ffebee' : '#f8f9fa',
                    borderRadius: 8, border: `1px solid ${tl.isCompleted ? '#c8e6c9' : isOverdue ? '#ffcdd2' : '#e0e0e0'}`,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={tl.isCompleted}
                    onChange={() => handleToggleTimeline(tl.id)}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: 600, fontSize: 14,
                      textDecoration: tl.isCompleted ? 'line-through' : 'none',
                      color: tl.isCompleted ? '#666' : '#333',
                    }}>
                      {tl.timelineName}
                    </div>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                      📅 {t('topicDetail.deadlineDate')}: {new Date(tl.deadline).toLocaleDateString()}
                      {tl.isCompleted && tl.completed && (
                        <span style={{ marginLeft: 12, color: '#28a745' }}>
                          ✓ {t('topicDetail.completedAt')}: {new Date(tl.completed).toLocaleDateString()}
                        </span>
                      )}
                      {isOverdue && (
                        <span style={{ marginLeft: 12, color: '#dc3545', fontWeight: 600 }}>⚠ {t('topic.overdue')}</span>
                      )}
                    </div>
                  </div>
                  {isLeader && (
                    <button
                      onClick={() => handleDeleteTimeline(tl.id)}
                      style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: 18 }}
                      title={t('common.delete')}
                    >
                      🗑
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Tài liệu: luôn xem/tải được; chỉ khoá upload/sửa khi Báo Cáo / Nghiệm Thu */}
      <div className="detail-divider" />

      {/* Danh sách & upload tài liệu */}
      <div className="detail-section">
        <h3 className="section-label">📄 {t('topic.uploadDocs')}</h3>
        <div className="file-list">
              {uploadedFiles.map((file) => (
                <div key={file.id || file.name} className="file-item" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="file-icon">📄</span>
                  <div style={{ flex: 1 }}>
                    <div className="file-name">{file.fileName || file.name}</div>
                    {file.uploader?.fullName && (
                      <div style={{ fontSize: 11, color: '#888' }}>
                        {t('topicDetail.uploadedBy')} {file.uploader.fullName} • {(file.size / 1024).toFixed(1)} KB
                      </div>
                    )}
                  </div>
                  {file.id && (
                    <button
                      onClick={() => documentService.download(file.id, file.fileName).catch(() => toast.error('Không tải được file'))}
                      style={{ background: 'none', border: 'none', color: '#1e2d5a', cursor: 'pointer', fontSize: 16 }}
                      title="Tải về"
                    >
                      ⬇
                    </button>
                  )}
                  {file.id && isEditable && (
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: 16 }}
                      title={t('common.delete')}
                    >
                      🗑
                    </button>
                  )}
                </div>
              ))}
              {isEditable && (
                <>
                  <button
                    className="btn-upload"
                    onClick={() => fileInputRef.current.click()}
                    disabled={uploading}
                  >
                    {uploading ? '⏳' : '⬆'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                </>
              )}
              {!isEditable && uploadedFiles.length === 0 && (
                <p style={{ fontSize: 13, color: '#888', margin: 0 }}>Chưa có tài liệu.</p>
              )}
            </div>
          </div>

          {isEditable && (
          <>
          <div className="detail-divider" />

          {/* Drag & drop ảnh đề tài */}
          <div className="detail-section">
            <h3 className="section-label">✏️ {t('topicDetail.changeImage')}</h3>
            <div
              className={`drop-zone ${isDragging ? 'dragging' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => imageInputRef.current.click()}
            >
              {uploadedImage ? (
                <img src={uploadedImage} alt="preview" className="preview-img" />
              ) : (
                <>
                  <span className="drop-icon">⬇</span>
                  <p>{t('topicDetail.dragDrop')}</p>
                </>
              )}
            </div>
            {/* Input riêng cho ảnh */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageChange}
            />
          </div>
        </>
      )}
    </div>
  )
}

export default TopicDetailPage