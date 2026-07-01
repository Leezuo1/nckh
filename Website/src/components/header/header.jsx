import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import './header.css';
import logoVLU from '../../assets/Images/Logo Đại Học Văn Lang H - White.png';
import notificationService from '../../services/notificationService';
import topicService from '../../services/topicService';
import LanguageSwitcher from '../Common/LanguageSwitcher';

const Header = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('is_logged_in') === 'true');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [confirmAssign, setConfirmAssign] = useState(null); // { notif, topicId, requesterId, requesterName, topicName }
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  const searchRef = useRef(null);

  const userInfo = JSON.parse(localStorage.getItem('user_info') || 'null');
  const avatarText = userInfo?.fullName
    ? userInfo.fullName.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase()
    : 'NG';

  // Load notifications + unread count
  const loadNotifications = async () => {
    if (!isLoggedIn) return;
    try {
      const [notifs, count] = await Promise.all([
        notificationService.getMyNotifications(),
        notificationService.getUnreadCount(),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (err) {
      console.error('Loi tai thong bao:', err);
    }
  };

  useEffect(() => {
    const handleAuthLogout = () => setIsLoggedIn(false);
    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, []);

  useEffect(() => {
    loadNotifications();
    // Poll every 30s
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifDropdown(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global search — debounced
  useEffect(() => {
    if (!isLoggedIn || !searchText.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const [topics, ideas] = await Promise.all([
          topicService.getTopics({ search: searchText }).catch(() => []),
          topicService.getIdeas({ search: searchText }).catch(() => []),
        ]);
        setSearchResults([
          ...topics.slice(0, 5).map(t => ({ ...t, _type: 'topic' })),
          ...ideas.slice(0, 5).map(t => ({ ...t, _type: 'idea' })),
        ]);
        setShowSearchResults(true);
      } catch (err) {
        console.error('Search loi:', err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText, isLoggedIn]);

  const handleLogout = async () => {
    try { await import('../../services/authService').then(m => m.default.logout()); }
    catch {
      localStorage.removeItem('is_logged_in');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_info');
      window.location.href = '/login';
    }
  };

  const markRead = async (notif) => {
    if (notif.isRead) return;
    try {
      await notificationService.markAsRead(notif.id);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev =>
        prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n)
      );
    } catch (err) { console.error(err); }
  };

  const handleClickNotif = async (notif) => {
    // Type request_join → mở popup confirm (không navigate)
    if (notif.type === 'request_join' && notif.data) {
      setShowNotifDropdown(false);
      setConfirmAssign({
        notif,
        topicId: notif.data.topicId,
        requesterId: notif.data.requesterId,
        requesterName: notif.data.requesterName,
        topicName: notif.data.topicName,
      });
      return;
    }
    // Type khác → mark read + navigate
    await markRead(notif);
    setShowNotifDropdown(false);
    if (notif.link) navigate(notif.link);
  };

  // Xử lý duyệt assign từ popup
  const handleRespondFromNotif = async (accept) => {
    if (!confirmAssign) return;
    try {
      await topicService.respondAssign(confirmAssign.topicId, confirmAssign.requesterId, accept);
      await markRead(confirmAssign.notif);
      toast.success(accept ? 'Đã chấp nhận yêu cầu' : 'Đã từ chối yêu cầu');
      setConfirmAssign(null);
    } catch (err) { /* toast tự hiện */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return t('header.justNow');
    if (diff < 3600) return Math.floor(diff / 60) + ' ' + t('header.minutesAgo');
    if (diff < 86400) return Math.floor(diff / 3600) + ' ' + t('header.hoursAgo');
    return d.toLocaleDateString();
  };

  return (
    <header className="header">
      <div className="header-inner">
        <div className="logo-area">
          <img src={logoVLU} className="logo-img" alt="Logo Van Lang" />
        </div>
        <div className="controls" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <LanguageSwitcher />
          {!isLoggedIn ? (
            <button className="btn-login" onClick={() => navigate('/login')}>
              {t('auth.login')}
            </button>
          ) : (
            <>
              {/* Notification Bell */}
              <div ref={notifRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    position: 'relative',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={t('header.notifications')}
                >
                  <svg
                    width="22" height="22" viewBox="0 0 24 24"
                    fill="none" stroke="white" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  </svg>
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      background: '#be1e2d',
                      color: 'white',
                      borderRadius: '50%',
                      minWidth: 18,
                      height: 18,
                      fontSize: 11,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      padding: '0 4px',
                    }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 8,
                    width: 380,
                    maxHeight: 480,
                    background: 'white',
                    borderRadius: 8,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    overflow: 'hidden',
                    zIndex: 1000,
                    color: '#333',
                  }}>
                    <div style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #eee',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <strong>{t('header.notifications')}</strong>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          style={{ background: 'none', border: 'none', color: '#1e2d5a', cursor: 'pointer', fontSize: 12 }}
                        >
                          {t('header.markAllRead')}
                        </button>
                      )}
                    </div>
                    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: 30, textAlign: 'center', color: '#888', fontSize: 13 }}>
                          {t('header.noNotifications')}
                        </div>
                      ) : (
                        notifications.map(n => (
                          <div
                            key={n.id}
                            onClick={() => handleClickNotif(n)}
                            style={{
                              padding: '12px 16px',
                              borderBottom: '1px solid #f0f0f0',
                              cursor: 'pointer',
                              background: n.isRead ? 'white' : '#f0f7ff',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                            onMouseLeave={e => e.currentTarget.style.background = n.isRead ? 'white' : '#f0f7ff'}
                          >
                            <div style={{ fontWeight: n.isRead ? 500 : 700, fontSize: 13 }}>{n.title}</div>
                            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{n.message}</div>
                            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{formatTime(n.created)}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Avatar */}
              <div className="avatar-wrap" ref={dropdownRef}>
                <button className="btn-profile" onClick={() => setShowDropdown(!showDropdown)}>
                  <div className="avatar">{avatarText}</div>
                  <span className="profile-arrow">{showDropdown ? '▲' : '▼'}</span>
                </button>
                {showDropdown && (
                  <div className="dropdown-profile">
                    <div className="dropdown-item-profile" onClick={() => { setShowDropdown(false); navigate('/ho-so'); }}>
                      <span className="dp-icon">👤</span> {t('header.profile')}
                    </div>
                    <div className="dropdown-item-profile red" onClick={handleLogout}>
                      <span className="dp-icon">↪</span> {t('auth.logout')}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Popup confirm duyệt assign */}
      {confirmAssign && (
        <div
          onClick={() => setConfirmAssign(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: 12, padding: 28,
              maxWidth: 560, width: '100%', maxHeight: '85vh', overflowY: 'auto',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)', color: '#333',
            }}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: 18, color: '#1a1a2e' }}>
              Duyệt yêu cầu tham gia
            </h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: '#555', margin: '0 0 16px' }}>
              <b>{confirmAssign.requesterName}</b> muốn tham gia đề tài
              <b> "{confirmAssign.topicName}"</b>.
            </p>

            {/* Danh sách SV trong nhóm (nếu có) */}
            {confirmAssign.notif?.data?.students?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 14, color: '#1a1a2e' }}>
                  ⓘ Thông tin sinh viên trong nhóm
                </h4>
                <div style={{
                  background: '#f8f9fa', borderRadius: 8, padding: 12,
                  border: '1px solid #e2e8f0',
                }}>
                  {confirmAssign.notif.data.students.map((s, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '24px 1.5fr 1fr 60px 60px',
                        gap: 10, alignItems: 'center', padding: '8px 0',
                        borderBottom: idx < confirmAssign.notif.data.students.length - 1 ? '1px solid #eee' : 'none',
                        fontSize: 13,
                      }}
                    >
                      <span style={{ fontWeight: 700, color: '#1e2d5a' }}>{idx + 1}.</span>
                      <div>
                        <div style={{ fontSize: 11, color: '#888' }}>Họ tên</div>
                        <div style={{ fontWeight: 600 }}>{s.fullName || '—'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#888' }}>MSSV</div>
                        <div>{s.studentId || '—'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#888' }}>Năm</div>
                        <div>{s.year || '—'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#888' }}>Khóa</div>
                        <div>{s.batch || '—'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p style={{ fontSize: 14, color: '#555', margin: '0 0 20px', fontWeight: 600 }}>
              Bạn có đồng ý không?
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => handleRespondFromNotif(false)}
                style={{
                  padding: '10px 20px', background: '#dc3545', color: 'white',
                  border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Hủy
              </button>
              <button
                onClick={() => handleRespondFromNotif(true)}
                style={{
                  padding: '10px 20px', background: '#28a745', color: 'white',
                  border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
