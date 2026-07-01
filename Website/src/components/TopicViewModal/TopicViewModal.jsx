import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { X, FileText, Calendar, Clock, GraduationCap, Users, FileIcon, Download } from 'lucide-react'
import { mapTopicStatus } from '../../utils/mappers'
import documentService from '../../services/documentService'
import '../IdeaDetailModal/IdeaDetailModal.css'

const getStatusBadgeStyle = (status) => {
  switch (status) {
    case 'WaitingToStart': return { bg: '#f1f5f9', color: '#64748b' }
    case 'InProgress': return { bg: '#e8eaf6', color: '#3949ab' }
    case 'Late': return { bg: '#fee2e2', color: '#dc2626' }
    case 'Reporting':
    case 'Editing': return { bg: '#fefce8', color: '#ca8a04' }
    case 'Done': return { bg: '#e8f5e9', color: '#2e7d32' }
    case 'Cancelled': return { bg: '#ffebee', color: '#c62828' }
    default: return { bg: '#fff3e0', color: '#e65100' }
  }
}

const TopicViewModal = ({ topic, onClose }) => {
  const [documents, setDocuments] = useState([])

  useEffect(() => {
    if (!topic?.id) return
    documentService.getByTopic(topic.id)
      .then(setDocuments)
      .catch(() => setDocuments([]))
  }, [topic?.id])

  const handleDownload = async (doc) => {
    try {
      await documentService.download(doc.id, doc.fileName)
    } catch (err) {
      toast.error('Không tải được file: ' + err.message)
    }
  }

  if (!topic) return null

  const supervisor = topic.topicParticipant?.find(p => p.topicParticipantRole === 'Supervisor')
  const leader = topic.topicParticipant?.find(p => p.topicParticipantRole === 'Leader')
  const members = topic.topicParticipant?.filter(p =>
    p.topicParticipantRole === 'Member' || p.topicParticipantRole === 'Leader'
  ) || []

  // Thành viên từ form (teamMembersInfo) - hiển thị nếu có
  const teamInfo = Array.isArray(topic.teamMembersInfo) ? topic.teamMembersInfo : []

  const statusKey = topic.isLate ? 'Late' : topic.status
  const statusVi = mapTopicStatus(statusKey)
  const badge = getStatusBadgeStyle(statusKey)

  return (
    <div className="idea-modal-overlay" onClick={onClose}>
      <div className="idea-modal-container" onClick={e => e.stopPropagation()}>
        <button className="idea-modal-close" onClick={onClose}>
          <X size={22} />
        </button>

        <span
          className="idea-modal-badge"
          style={{ background: badge.bg, color: badge.color }}
        >
          ● {statusVi}
        </span>

        <h2 className="idea-modal-title">{topic.topicName}</h2>

        <div className="idea-modal-divider" />

        <div className="idea-modal-section">
          <h4 className="idea-modal-label"><FileText size={16} /> Tên đề tài</h4>
          <p className="idea-modal-value">{topic.topicName}</p>
        </div>

        <div className="idea-modal-divider" />

        <div className="idea-modal-section">
          <h4 className="idea-modal-label"><FileText size={16} /> Mô tả sơ bộ đề tài</h4>
          <p className="idea-modal-value">{topic.description || 'Chưa có mô tả'}</p>
        </div>

        <div className="idea-modal-divider" />

        <div className="idea-modal-meta">
          <div>
            <div className="idea-modal-label"><Calendar size={16} /> Năm</div>
            <p className="idea-modal-value">{topic.year}</p>
          </div>
          <div>
            <div className="idea-modal-label"><Clock size={16} /> Thời gian thực hiện</div>
            <p className="idea-modal-value">{topic.durationMonths || 6} tháng</p>
          </div>
        </div>

        <div className="idea-modal-divider" />

        {/* Giảng viên hướng dẫn */}
        <div className="idea-modal-info-box">
          <div className="idea-modal-label"><GraduationCap size={16} /> Giảng Viên Hướng Dẫn</div>
          <div className="idea-modal-info-row">
            <div>
              <label>Tên giảng viên</label>
              <span>{supervisor?.user?.fullName || '—'}</span>
            </div>
            <div>
              <label>Mã số giảng viên</label>
              <span>{supervisor?.user?.userId || '—'}</span>
            </div>
          </div>
        </div>

        {/* Sinh viên trong nhóm */}
        <div className="idea-modal-info-box" style={{ marginTop: 12 }}>
          <div className="idea-modal-label"><Users size={16} /> Sinh Viên</div>
          {members.length > 0 ? (
            members.map((m, idx) => (
              <div key={idx} className="idea-modal-info-row" style={{ marginTop: idx > 0 ? 10 : 8 }}>
                <div>
                  <label>Tên sinh viên {idx + 1}</label>
                  <span>{m.user?.fullName || '—'}</span>
                </div>
                <div>
                  <label>Mã số sinh viên</label>
                  <span>{m.user?.userId || '—'}</span>
                </div>
                <div>
                  <label>Vai trò</label>
                  <span>{m.topicParticipantRole === 'Leader' ? 'Chủ nhiệm' : 'Thành viên'}</span>
                </div>
              </div>
            ))
          ) : teamInfo.length > 0 ? (
            teamInfo.map((s, idx) => (
              <div key={idx} className="idea-modal-info-row" style={{ marginTop: idx > 0 ? 10 : 8 }}>
                <div>
                  <label>Tên sinh viên {idx + 1}</label>
                  <span>{s.fullName || '—'}</span>
                </div>
                <div>
                  <label>Mã số sinh viên</label>
                  <span>{s.studentId || '—'}</span>
                </div>
                <div>
                  <label>Khóa</label>
                  <span>{s.batch || '—'}</span>
                </div>
              </div>
            ))
          ) : (
            <p style={{ fontSize: 13, color: '#888', marginTop: 8 }}>Chưa có sinh viên</p>
          )}
        </div>

        {/* Tài liệu đề tài */}
        <div className="idea-modal-info-box" style={{ marginTop: 12 }}>
          <div className="idea-modal-label"><FileText size={16} /> Tài liệu đề tài</div>
          {documents.length > 0 ? (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', background: 'white',
                    borderRadius: 6, border: '1px solid #e2e8f0',
                  }}
                >
                  <FileIcon size={18} color="#1e2d5a" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{doc.fileName}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>
                      {doc.uploader?.fullName ? `Tải lên bởi ${doc.uploader.fullName} • ` : ''}
                      {(doc.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(doc)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '6px 12px', background: '#1e2d5a', color: 'white',
                      border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    title="Tải về"
                  >
                    <Download size={14} /> Tải
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: '#888', marginTop: 8 }}>Chưa có tài liệu nào</p>
          )}
        </div>

        <div className="idea-modal-footer">
          <button className="idea-modal-btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

export default TopicViewModal
