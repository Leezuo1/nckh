import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import './ProfilePage.css'
import { BsPerson, BsHash, BsBookmark, BsBuilding, BsGenderAmbiguous, BsClock, BsEnvelope, BsPencil, BsTelephone } from 'react-icons/bs'
import authService from '../../../services/authService'
import topicService from '../../../services/topicService'
import userService from '../../../services/userService'

const formatDateTime = (date) => {
  return new Date(date).toLocaleString('vi-VN', {
    weekday: 'long', day: 'numeric', month: 'long',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

const getLoginActivity = () => {
  const now = new Date().toISOString()
  const firstLogin = localStorage.getItem('first_login')
  if (!firstLogin) localStorage.setItem('first_login', now)
  localStorage.setItem('last_login', now)
  return {
    firstLogin: formatDateTime(localStorage.getItem('first_login')),
    lastLogin: formatDateTime(localStorage.getItem('last_login')),
  }
}

const ProfilePage = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const loginActivity = getLoginActivity()

  const [user, setUser] = useState(authService.getCurrentUser())
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editData, setEditData] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    gender: user?.gender || 'Male',
    batch: user?.batch || '',
  })

  const avatarText = user?.fullName
    ? user.fullName.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase()
    : 'NG'

  const [myTopics, setMyTopics] = useState([])

  useEffect(() => {
    topicService.getMyTopics()
      .then(setMyTopics)
      .catch(err => console.error('Loi tai de tai:', err))
  }, [])

  // "Đang thực hiện" gồm mọi trạng thái hoạt động (kể cả trạng thái mới); "Hoàn thành" = Nghiệm Thu (Done)
  const ACTIVE_STATUSES = ['Pending', 'WaitingToStart', 'InProgress', 'Reporting', 'Editing']
  const inProgressTopics = myTopics.filter(t => ACTIVE_STATUSES.includes(t.status))
  const completedTopics = myTopics.filter(t => t.status === 'Done')

  // Bắt đầu edit
  const handleStartEdit = () => {
    setEditData({
      fullName: user?.fullName || '',
      phone: user?.phone || '',
      gender: user?.gender || 'Male',
      batch: user?.batch || '',
    })
    setIsEditing(true)
  }

  // Lưu profile
  const handleSave = async () => {
    if (!editData.fullName.trim()) {
      toast.error(t('profile.nameRequired'))
      return
    }
    setSaving(true)
    try {
      const updated = await userService.updateMyProfile(editData)
      // Update localStorage
      const newUser = { ...user, ...updated }
      localStorage.setItem('user_info', JSON.stringify(newUser))
      setUser(newUser)
      setIsEditing(false)
      toast.success(t('profile.updateSuccess'))
    } catch (err) {
      // Toast tự hiện qua interceptor
    } finally {
      setSaving(false)
    }
  }

  const profileInfo = [
    { icon: <BsPerson />, label: t('profile.fullName').toUpperCase(), value: user?.fullName || '' },
    { icon: <BsHash />, label: t('profile.userId').toUpperCase(), value: user?.userId || '' },
    { icon: <BsBookmark />, label: t('profile.batch').toUpperCase(), value: user?.batch || '—' },
    { icon: <BsBuilding />, label: t('profile.faculty').toUpperCase(), value: user?.faculty || '' },
    { icon: <BsGenderAmbiguous />, label: t('profile.gender').toUpperCase(), value: user?.gender === 'Male' ? t('profile.male') : t('profile.female') },
    { icon: <BsTelephone />, label: t('profile.phone').toUpperCase(), value: user?.phone || '—' },
    { icon: <BsClock />, label: t('profile.timezone').toUpperCase(), value: 'Asia / Ho_Chi_Minh' },
    { icon: <BsEnvelope />, label: t('profile.email').toUpperCase(), value: user?.outlook || '' },
  ]

  return (
    <div className="profile-page">
      {/* Cot trai - Thong tin ca nhan */}
      <div className="profile-left white-box">
        <div className="avatar-section">
          <div className="avatar-circle">{avatarText}</div>
          <h2 className="profile-name">{user?.fullName || ''}</h2>
          <span className="role-badge">
            {t(`profile.role.${user?.role || 'Admin'}`)}
          </span>
          {!isEditing && (
            <button
              onClick={handleStartEdit}
              style={{
                marginTop: 12, padding: '6px 16px', background: '#1e2d5a',
                color: 'white', border: 'none', borderRadius: 8, fontSize: 12,
                fontWeight: 600, cursor: 'pointer', display: 'inline-flex',
                alignItems: 'center', gap: 6,
              }}
              onMouseEnter={e => e.target.style.background = '#be1e2d'}
              onMouseLeave={e => e.target.style.background = '#1e2d5a'}
            >
              <BsPencil size={12} /> {t('profile.edit')}
            </button>
          )}
        </div>

        {isEditing ? (
          // === Form edit ===
          <div className="info-list" style={{ gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: '#666', fontWeight: 600 }}>{t('profile.fullName').toUpperCase()}</label>
              <input
                type="text"
                value={editData.fullName}
                onChange={e => setEditData({ ...editData, fullName: e.target.value })}
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd', marginTop: 4 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#666', fontWeight: 600 }}>{t('profile.phone').toUpperCase()}</label>
              <input
                type="text"
                value={editData.phone}
                onChange={e => setEditData({ ...editData, phone: e.target.value })}
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd', marginTop: 4 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#666', fontWeight: 600 }}>{t('profile.gender').toUpperCase()}</label>
              <select
                value={editData.gender}
                onChange={e => setEditData({ ...editData, gender: e.target.value })}
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd', marginTop: 4 }}
              >
                <option value="Male">{t('profile.male')}</option>
                <option value="Female">{t('profile.female')}</option>
              </select>
            </div>
            {user?.role === 'Student' && (
              <div>
                <label style={{ fontSize: 11, color: '#666', fontWeight: 600 }}>{t('profile.batch').toUpperCase()}</label>
                <input
                  type="text"
                  placeholder="VD: K28"
                  value={editData.batch}
                  onChange={e => setEditData({ ...editData, batch: e.target.value })}
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd', marginTop: 4 }}
                />
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1, padding: 8, background: '#28a745',
                  color: 'white', border: 'none', borderRadius: 6,
                  fontWeight: 600, cursor: saving ? 'wait' : 'pointer',
                }}
              >
                {saving ? t('profile.saving') : t('common.save')}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                disabled={saving}
                style={{
                  flex: 1, padding: 8, background: '#6c757d',
                  color: 'white', border: 'none', borderRadius: 6,
                  fontWeight: 600, cursor: 'pointer',
                }}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        ) : (
          // === View mode ===
          <div className="info-list">
            {profileInfo.map((item, index) => (
              <div key={index} className="info-item">
                <div className="info-icon">{item.icon}</div>
                <div className="info-content">
                  <span className="info-label">{item.label}</span>
                  <span className="info-value">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cot phai */}
      <div className="profile-right">
        {/* Hoat dong dang nhap */}
        <div className="white-box">
          <div className="section-header">
            <div className="section-icon">🕐</div>
            <h3 className="section-title">{t('profile.loginActivity')}</h3>
          </div>
          <div className="divider" />
          <div className="login-activity">
            <div className="login-item">
              <span className="login-label">{t('profile.firstLogin')}</span>
              <span className="login-value">{loginActivity.firstLogin}</span>
            </div>
            <div className="divider" />
            <div className="login-item">
              <span className="login-label">{t('profile.lastLogin')}</span>
              <span className="login-value">{loginActivity.lastLogin}</span>
            </div>
          </div>
        </div>

        {/* De tai da tham gia */}
        <div className="white-box">
          <div className="section-header">
            <div className="section-icon">📋</div>
            <h3 className="section-title">{t('profile.myTopicsTitle')}</h3>
          </div>
          <div className="divider" />

          <div className="topic-group">
            <h4 className="topic-group-title">{t('profile.activeTopics')}</h4>
            {inProgressTopics.length > 0 ? inProgressTopics.map(top => (
              <p key={top.id} className="topic-link" onClick={() => navigate(`/de-tai-cua-toi/${top.id}`)}>
                {top.topicName}
              </p>
            )) : <p style={{ color: '#999', fontSize: '13px' }}>{t('profile.noTopic')}</p>}
          </div>

          <div className="divider" />

          <div className="topic-group">
            <h4 className="topic-group-title">{t('profile.completedTopics')}</h4>
            {completedTopics.length > 0 ? completedTopics.map(top => (
              <p key={top.id} className="topic-link" onClick={() => navigate(`/de-tai-cua-toi/${top.id}`)}>
                {top.topicName}
              </p>
            )) : <p style={{ color: '#999', fontSize: '13px' }}>{t('profile.noTopic')}</p>}
          </div>
        </div>

        {/* Admin portal */}
        {user?.role === 'Admin' && (
          <div className="white-box">
            <div className="section-header">
              <div className="section-icon">⚙️</div>
              <h3 className="section-title">{t('profile.adminSection')}</h3>
            </div>
            <div className="divider" />
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
              {t('profile.adminDesc')}
            </p>
            <button
              onClick={() => navigate('/admin/nguoi-dung')}
              style={{ width: '100%', padding: '10px', background: '#1e2d5a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
              onMouseEnter={e => e.target.style.background = '#be1e2d'}
              onMouseLeave={e => e.target.style.background = '#1e2d5a'}
            >
              {t('sidebar.adminPortal')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProfilePage
