import { useState } from 'react'
import toast from 'react-hot-toast'
import { X, FileText, Calendar, Clock, GraduationCap, Users } from 'lucide-react'
import topicService from '../../services/topicService'
import authService from '../../services/authService'
import ConfirmDialog from '../Common/ConfirmDialog'
import './IdeaDetailModal.css'

const emptyStudent = { fullName: '', studentId: '', year: '', batch: '' }

const IdeaDetailModal = ({ idea, onClose, onSuccess }) => {
  const currentUser = authService.getCurrentUser()
  const [showStudentForm, setShowStudentForm] = useState(false)
  const [students, setStudents] = useState([{ ...emptyStudent }])
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false) // popup xác nhận xin hướng dẫn (TH1)

  if (!idea) return null

  const submitterRole = idea.submitter?.role
  const myRole = currentUser?.role
  const isOwner = idea.submitterId === currentUser?.id

  // TH1: GV/Admin xem ý tưởng của SV → xin làm GV hướng dẫn (cần SV duyệt)
  const isCase1_LecturerOnStudentIdea = (myRole === 'Lecturer' || myRole === 'Admin') && !isOwner
  // TH2: SV xem ý tưởng của GV → xin tham gia (cần GV duyệt)
  const isCase2_StudentOnLecturerIdea = myRole === 'Student' && !isOwner
  const canShowAssignButton = isCase1_LecturerOnStudentIdea || isCase2_StudentOnLecturerIdea

  // TH1 — GV gửi yêu cầu hướng dẫn (cần SV submitter duyệt). Chạy sau khi xác nhận ở popup.
  const handleLecturerAssign = async () => {
    setLoading(true)
    try {
      await topicService.requestAssign(idea.id)
      toast.success('Đã gửi yêu cầu! Chờ sinh viên duyệt.')
      onSuccess && onSuccess(idea.id)
      onClose()
    } catch {
      /* toast tự hiện */
      setShowConfirm(false)
    } finally {
      setLoading(false)
    }
  }

  // TH2 — SV submit form xin assign
  const handleStudentAssign = async () => {
    // Validate form
    const errs = []
    students.forEach((s, i) => {
      if (!s.fullName.trim() || !s.studentId.trim()) {
        errs.push(`Sinh viên ${i + 1} chưa điền đủ thông tin`)
      }
    })
    if (errs.length > 0) {
      toast.error(errs[0])
      return
    }
    setLoading(true)
    try {
      // Gửi kèm danh sách SV (form data)
      await topicService.requestAssign(idea.id, students)
      toast.success('Đã gửi yêu cầu! Chờ giảng viên duyệt.')
      onSuccess && onSuccess(idea.id)
      onClose()
    } catch {
      /* toast tự hiện */
    } finally {
      setLoading(false)
    }
  }

  // Thao tác trên form SV (TH2)
  const handleAddStudent = () => {
    if (students.length >= 5) return
    setStudents([...students, { ...emptyStudent }])
  }
  const handleStudentChange = (idx, field, val) => {
    const updated = [...students]
    updated[idx][field] = val
    setStudents(updated)
  }

  return (
    <div className="idea-modal-overlay" onClick={onClose}>
      <div className="idea-modal-container" onClick={e => e.stopPropagation()}>
        <button className="idea-modal-close" onClick={onClose}>
          <X size={22} />
        </button>

        <span className="idea-modal-badge">● Chưa Assign</span>

        <h2 className="idea-modal-title">{idea.topicName}</h2>

        <div className="idea-modal-divider" />

        {/* Tên đề tài */}
        <div className="idea-modal-section">
          <h4 className="idea-modal-label"><FileText size={16} /> Tên đề tài</h4>
          <p className="idea-modal-value">{idea.topicName}</p>
        </div>

        <div className="idea-modal-divider" />

        {/* Mô tả */}
        <div className="idea-modal-section">
          <h4 className="idea-modal-label"><FileText size={16} /> Mô tả sơ bộ đề tài</h4>
          <p className="idea-modal-value">{idea.description || 'Chưa có mô tả'}</p>
        </div>

        <div className="idea-modal-divider" />

        {/* Năm + Thời gian */}
        <div className="idea-modal-meta">
          <div>
            <div className="idea-modal-label"><Calendar size={16} /> Năm</div>
            <p className="idea-modal-value">{idea.year}</p>
          </div>
          <div>
            <div className="idea-modal-label"><Clock size={16} /> Thời gian thực hiện</div>
            <p className="idea-modal-value">
              {idea.deadline ? new Date(idea.deadline).toLocaleDateString() : '—'}
            </p>
          </div>
        </div>

        <div className="idea-modal-divider" />

        {/* Thông tin người đăng */}
        {submitterRole === 'Lecturer' ? (
          <div className="idea-modal-info-box">
            <div className="idea-modal-label"><GraduationCap size={16} /> Giảng Viên Đề Xuất</div>
            <div className="idea-modal-info-row">
              <div>
                <label>Tên giảng viên</label>
                <span>{idea.submitter?.fullName || '—'}</span>
              </div>
              <div>
                <label>Mã số giảng viên</label>
                <span>{idea.submitter?.userId || '—'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="idea-modal-info-box">
            <div className="idea-modal-label"><Users size={16} /> Sinh Viên Đề Xuất</div>
            <div className="idea-modal-info-row">
              <div>
                <label>Tên sinh viên</label>
                <span>{idea.submitter?.fullName || '—'}</span>
              </div>
              <div>
                <label>Mã số sinh viên</label>
                <span>{idea.submitter?.userId || '—'}</span>
              </div>
              <div>
                <label>Khóa</label>
                <span>{idea.submitter?.batch || '—'}</span>
              </div>
            </div>
          </div>
        )}

        {/* TH2: Form thông tin SV xin assign */}
        {showStudentForm && isCase2_StudentOnLecturerIdea && (
          <>
            <div className="idea-modal-divider" />
            <div className="idea-modal-section">
              <h4 className="idea-modal-label">ⓘ Thông tin sinh viên (Tối đa 5)</h4>
              {students.map((student, idx) => (
                <div key={idx} className="student-row-idea">
                  <span className="student-label-idea">Sinh viên {idx + 1}</span>
                  <div className="student-fields-idea">
                    <input
                      placeholder="Họ và tên"
                      value={student.fullName}
                      onChange={e => handleStudentChange(idx, 'fullName', e.target.value)}
                    />
                    <input
                      placeholder="Mã số sinh viên"
                      value={student.studentId}
                      onChange={e => handleStudentChange(idx, 'studentId', e.target.value)}
                    />
                    <select
                      value={student.year}
                      onChange={e => handleStudentChange(idx, 'year', e.target.value)}
                    >
                      <option value="">Năm</option>
                      <option value="1">Năm 1</option>
                      <option value="2">Năm 2</option>
                      <option value="3">Năm 3</option>
                      <option value="4">Năm 4</option>
                    </select>
                    <select
                      value={student.batch}
                      onChange={e => handleStudentChange(idx, 'batch', e.target.value)}
                    >
                      <option value="">Khóa</option>
                      <option value="K25">K25</option>
                      <option value="K26">K26</option>
                      <option value="K27">K27</option>
                      <option value="K28">K28</option>
                    </select>
                  </div>
                </div>
              ))}
              {students.length < 5 && (
                <button className="btn-add-student-idea" onClick={handleAddStudent}>
                  ⊕ Thêm Sinh Viên
                </button>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="idea-modal-footer">
          {isCase1_LecturerOnStudentIdea && (
            <button
              className="idea-modal-btn-primary"
              onClick={() => setShowConfirm(true)}
              disabled={loading}
            >
              {loading ? 'Đang gửi...' : 'Xin hướng dẫn'}
            </button>
          )}

          {isCase2_StudentOnLecturerIdea && !showStudentForm && (
            <button
              className="idea-modal-btn-primary"
              onClick={() => setShowStudentForm(true)}
            >
              Assign
            </button>
          )}

          {isCase2_StudentOnLecturerIdea && showStudentForm && (
            <>
              <button
                className="idea-modal-btn-secondary"
                onClick={() => setShowStudentForm(false)}
                disabled={loading}
              >
                Hủy
              </button>
              <button
                className="idea-modal-btn-primary"
                onClick={handleStudentAssign}
                disabled={loading}
              >
                {loading ? 'Đang gửi...' : 'Xác nhận xin Assign'}
              </button>
            </>
          )}

          {!canShowAssignButton && (
            <p style={{ color: '#888', fontSize: 13, fontStyle: 'italic' }}>
              {isOwner
                ? 'Đây là ý tưởng của bạn'
                : 'Bạn không thể assign vào ý tưởng này'}
            </p>
          )}
        </div>
      </div>

      {/* Popup xác nhận xin hướng dẫn (thay cho window.confirm) */}
      {showConfirm && (
        <ConfirmDialog
          title="Xin hướng dẫn ý tưởng"
          message={`Gửi yêu cầu hướng dẫn ý tưởng "${idea.topicName}"? Sinh viên tạo đề tài sẽ duyệt yêu cầu của bạn.`}
          confirmText="Gửi yêu cầu"
          isLoading={loading}
          onCancel={() => setShowConfirm(false)}
          onConfirm={handleLecturerAssign}
        />
      )}
    </div>
  )
}

export default IdeaDetailModal
