import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './RegisterModal.css'
import ConfirmDialog from '../Common/ConfirmDialog'
import topicService from '../../services/topicService'
import authService from '../../services/authService'

const DRAFT_KEY = 'register_idea_draft'

const deptOptions = [
  'Công Nghệ Thông Tin',
  'IoT và Hệ Thống Nhúng',
  'Thiết Kế Vi Mạch',
  'Kỹ Thuật Điện',
  'Cơ Khí',
]

const emptyStudent = { fullName: '', studentId: '', year: '', batch: '' }
const emptyLecturer = { fullName: '', lecturerId: '' }

const RegisterModal = ({ onClose, onSuccess }) => {
  const { t } = useTranslation()
  const currentUser = authService.getCurrentUser()
  const isStudent = currentUser?.role === 'Student'

  //  Load draft từ localStorage khi mở modal
  const loadDraft = () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  }

  const draft = loadDraft()

  const [title, setTitle] = useState(draft?.title || '')
  const [description, setDescription] = useState(draft?.description || '')
  const [dept, setDept] = useState(draft?.dept || '')
  const [duration, setDuration] = useState(draft?.duration || 6)
  const [showDeptDropdown, setShowDeptDropdown] = useState(false)
  const [students, setStudents] = useState(draft?.students || [{ ...emptyStudent }])
  const [lecturer, setLecturer] = useState(draft?.lecturer || { ...emptyLecturer })
  const [errors, setErrors] = useState({})
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false) //  Hiện thông báo đã lưu

  //  Hàm lưu nháp
  const handleSaveDraft = () => {
    const draftData = { title, description, dept, duration, students, lecturer }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData))
    setDraftSaved(true)
    setTimeout(() => setDraftSaved(false), 2000)
  }

  const handleAddStudent = () => {
    if (students.length >= 5) return
    setStudents([...students, { ...emptyStudent }])
  }

  const handleStudentChange = (index, field, value) => {
    const updated = [...students]
    updated[index][field] = value
    setStudents(updated)
    setErrors(prev => ({ ...prev, [`${field}_${index}`]: false }))
  }

  const handleSubmit = () => {
    const newErrors = {}
    if (!title.trim()) newErrors.title = t('register.errTitle')
    if (!description.trim()) newErrors.description = t('register.errDesc')
    if (!dept) newErrors.dept = t('register.errDept')
    if (isStudent) {
      students.forEach((student, index) => {
        if (!student.fullName.trim()) newErrors[`fullName_${index}`] = true
        if (!student.studentId.trim()) newErrors[`studentId_${index}`] = true
        if (!student.year) newErrors[`year_${index}`] = true
        if (!student.batch) newErrors[`batch_${index}`] = true
      })
    } else {
      if (!lecturer.fullName.trim()) newErrors['lec_fullName'] = true
      if (!lecturer.lecturerId.trim()) newErrors['lec_id'] = true
    }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    setShowConfirm(true)
  }

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      const currentYear = new Date().getFullYear()
      const effectiveDuration = isStudent ? 6 : Number(duration)
      const deadline = new Date()
      deadline.setMonth(deadline.getMonth() + effectiveDuration)

      const payload = {
        topicId: `IDEA-${Date.now()}`,
        topicName: title,
        description,
        objective: '',
        projectScope: dept,
        year: String(currentYear),
        deadline: deadline.toISOString(),
        ...(!isStudent && { durationMonths: Number(duration) }),
      }

      const newIdea = await topicService.createIdea(payload)

      //  Xóa draft sau khi submit thành công
      localStorage.removeItem(DRAFT_KEY)

      setIsLoading(false)
      setShowConfirm(false)
      onClose()
      onSuccess({
        id: newIdea.id,
        title: newIdea.topicName,
        description: newIdea.description,
        dept,
        date: new Date().toLocaleDateString('vi-VN'),
        poster: currentUser?.fullName || '',
        role: t('profile.role.Student'),
        status: t('status.Pending'),
        batch: students[0]?.batch || '',
      })
    } catch (err) {
      setIsLoading(false)
      setShowConfirm(false)
    }
  }

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-container">
        <div className="modal-header">
          <h2 className="modal-title">{t('register.modalTitle')}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-divider" />

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">📁 {t('topicDetail.topicName')}</label>
            <input
              className={`form-input ${errors.title ? 'input-error' : ''}`}
              placeholder={t('topicDetail.topicNamePlaceholder')}
              value={title}
              onChange={(e) => { setTitle(e.target.value); setErrors(prev => ({ ...prev, title: '' })) }}
            />
            {errors.title && <span className="error-msg">{errors.title}</span>}
          </div>

          <div className="modal-divider" />

          <div className="form-group">
            <label className="form-label">📖 {t('topicDetail.briefDescription')}</label>
            <textarea
              className={`form-textarea ${errors.description ? 'input-error' : ''}`}
              placeholder={t('topicDetail.briefDescPlaceholder')}
              value={description}
              onChange={(e) => { setDescription(e.target.value); setErrors(prev => ({ ...prev, description: '' })) }}
            />
            {errors.description && <span className="error-msg">{errors.description}</span>}
          </div>

          <div className="modal-divider" />

          <div className="form-group">
            <label className="form-label">☰ {t('topic.department')}</label>
            <div className="select-wrap">
              <button
                className={`form-select ${errors.dept ? 'input-error' : ''}`}
                onClick={() => { setShowDeptDropdown(!showDeptDropdown); setErrors(prev => ({ ...prev, dept: '' })) }}
              >
                <span className={dept ? '' : 'placeholder'}>{dept || t('register.selectDept')}</span>
                <span>▲</span>
              </button>
              {showDeptDropdown && (
                <div className="select-dropdown">
                  {deptOptions.map(option => (
                    <div
                      key={option}
                      className={`select-item ${dept === option ? 'selected' : ''}`}
                      onClick={() => { setDept(option); setShowDeptDropdown(false) }}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {errors.dept && <span className="error-msg">{errors.dept}</span>}
          </div>

          <div className="modal-divider" />

          {!isStudent && (
            <>
              <div className="form-group">
                <label className="form-label">⏱ Thời gian thực hiện (tối đa 12 tháng)</label>
                <select
                  className="form-input"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{m} tháng</option>
                  ))}
                </select>
                <span style={{ fontSize: 12, color: '#888', marginTop: 4, display: 'block' }}>
                  Hạn chót sẽ được tính từ ngày đề tài được duyệt + {duration} tháng
                </span>
              </div>
              <div className="modal-divider" />
            </>
          )}

          {isStudent ? (
            <div className="form-group">
              <label className="form-label">ⓘ {t('register.studentInfo')}</label>
              {students.map((student, index) => (
                <div key={index} className="student-row">
                  <span className="student-label">{t('register.studentNum')} {index + 1}</span>
                  <div className="student-fields">
                    <input
                      className={`form-input ${errors[`fullName_${index}`] ? 'input-error' : ''}`}
                      placeholder={t('register.fullName')}
                      value={student.fullName}
                      onChange={(e) => handleStudentChange(index, 'fullName', e.target.value)}
                    />
                    <input
                      className={`form-input ${errors[`studentId_${index}`] ? 'input-error' : ''}`}
                      placeholder={t('register.studentId')}
                      value={student.studentId}
                      onChange={(e) => handleStudentChange(index, 'studentId', e.target.value)}
                    />
                    <select
                      className={`form-select-small ${errors[`year_${index}`] ? 'input-error' : ''}`}
                      value={student.year}
                      onChange={(e) => handleStudentChange(index, 'year', e.target.value)}
                    >
                      <option value="">{t('register.year')}</option>
                      <option value="1">{t('register.year')} 1</option>
                      <option value="2">{t('register.year')} 2</option>
                      <option value="3">{t('register.year')} 3</option>
                      <option value="4">{t('register.year')} 4</option>
                    </select>
                    <select
                      className={`form-select-small ${errors[`batch_${index}`] ? 'input-error' : ''}`}
                      value={student.batch}
                      onChange={(e) => handleStudentChange(index, 'batch', e.target.value)}
                    >
                      <option value="">{t('register.batch')}</option>
                      <option value="Khóa 25">K25</option>
                      <option value="Khóa 26">K26</option>
                      <option value="Khóa 27">K27</option>
                      <option value="Khóa 28">K28</option>
                    </select>
                  </div>
                </div>
              ))}
              {students.length < 5 && (
                <button className="btn-add-student" onClick={handleAddStudent}>
                  ⊕ {t('register.addStudent')}
                </button>
              )}
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">ⓘ {t('register.lecturerInfo')}</label>
              <div className="student-row">
                <span className="student-label">{t('register.lecturer')}</span>
                <div className="student-fields">
                  <input
                    className={`form-input ${errors['lec_fullName'] ? 'input-error' : ''}`}
                    placeholder={t('register.fullName')}
                    value={lecturer.fullName}
                    onChange={(e) => { setLecturer(prev => ({ ...prev, fullName: e.target.value })); setErrors(prev => ({ ...prev, lec_fullName: false })) }}
                  />
                  <input
                    className={`form-input ${errors['lec_id'] ? 'input-error' : ''}`}
                    placeholder={t('register.lecturerId')}
                    value={lecturer.lecturerId}
                    onChange={(e) => { setLecturer(prev => ({ ...prev, lecturerId: e.target.value })); setErrors(prev => ({ ...prev, lec_id: false })) }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-divider" />

        <div className="modal-footer">
          {/*  Nút lưu nháp có feedback */}
          <button className="btn-save-draft" onClick={handleSaveDraft}>
            {draftSaved ? '✓ Đã lưu!' : t('common.saveDraft')}
          </button>
          <button className="btn-confirm" onClick={handleSubmit}>
            {t('common.confirm')}
          </button>
        </div>
      </div>

      {showConfirm && (
        <ConfirmDialog
          onCancel={() => setShowConfirm(false)}
          onConfirm={handleConfirm}
          isLoading={isLoading}
        />
      )}
    </>
  )
}

export default RegisterModal