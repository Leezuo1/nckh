import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './Sidebar.css';

import iconHome from '../../assets/Images/Home.png';
import iconOverview from '../../assets/Images/Overview.png';
import iconList from '../../assets/Images/List.png';
import iconIdea from '../../assets/Images/Idea.png';
import iconRegister from '../../assets/Images/Plus.png';
import iconMyTopic from '../../assets/Images/Folder.png';
import iconProfile from '../../assets/Images/Person.png';
import iconLogout from '../../assets/Images/Leave.png';

const Sidebar = ({ isOpen, onClose }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const [isLoggedIn, setIsLoggedIn] = useState(
    () => localStorage.getItem('is_logged_in') === 'true'
  );

  const readRole = () => {
    try { return JSON.parse(localStorage.getItem('user_info') || 'null')?.role || null; } catch { return null; }
  };
  const [role, setRole] = useState(readRole);
  const isAdmin = role === 'Admin';
  const isLecturer = role === 'Lecturer';
  const isOfficer = role === 'FacultyOfficer' || role === 'DepartmentOfficer';
  const isStudent = role === 'Student';

  useEffect(() => {
    const syncAuth = () => {
      const loggedIn = localStorage.getItem('is_logged_in') === 'true';
      setIsLoggedIn(loggedIn);
      setRole(readRole());
    };

    window.addEventListener('auth:login', syncAuth);
    window.addEventListener('auth:logout', syncAuth);
    return () => {
      window.removeEventListener('auth:login', syncAuth);
      window.removeEventListener('auth:logout', syncAuth);
    };
  }, []);

  //  requireAuth: nếu chưa đăng nhập → redirect login
  const go = (path, requireAuth = false) => {
    if (requireAuth && !isLoggedIn) {
      navigate('/login');
      if (window.innerWidth <= 768) onClose && onClose();
      return;
    }
    navigate(path);
    if (window.innerWidth <= 768) onClose && onClose();
  };

  const handleLogout = () => {
    localStorage.removeItem('is_logged_in');
    localStorage.removeItem('user_info');
    window.dispatchEvent(new Event('auth:logout'));
    window.location.href = '/login';
  };

  const getActiveClass = (path) => location.pathname === path ? 'active' : '';

  return (
    <aside className={`sidebar ${!isOpen ? 'collapsed' : ''}`}>
      <div className="sidebar-close-area">
        <span className="btn-close" onClick={onClose}>✕</span>
      </div>

      <nav className="nav-menu">
        <button className={`menu-btn ${getActiveClass('/')}`} onClick={() => go('/')}>
          <div className="icon-wrap"><img src={iconHome} className="icon" alt="home" /></div>
          <span className="btn-label">{t('sidebar.home').toUpperCase()}</span>
        </button>

        <button className="menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          <div className="icon-wrap"><img src={iconOverview} className="icon" alt="overview" /></div>
          <span className="btn-label">{t('sidebar.overview').toUpperCase()}</span>
          <span className={`arrow ${isMenuOpen ? 'rotated' : ''}`}>▼</span>
        </button>

        {/*  Luôn hiện submenu, khi click mới check auth */}
        {isMenuOpen && (
          <div className="submenu">
            <button className={`menu-btn sub ${getActiveClass('/danh-sach-de-tai')}`} onClick={() => go('/danh-sach-de-tai', true)}>
              <div className="icon-wrap"><img src={iconList} className="icon" alt="list" /></div>
              <span className="btn-label">{t('sidebar.topicList')}</span>
            </button>
            <button className={`menu-btn sub ${getActiveClass('/danh-sach-y-tuong')}`} onClick={() => go('/danh-sach-y-tuong', true)}>
              <div className="icon-wrap"><img src={iconIdea} className="icon" alt="idea" /></div>
              <span className="btn-label">{t('sidebar.ideaList')}</span>
            </button>
            <button className={`menu-btn sub ${getActiveClass('/dang-ky-y-tuong')}`} onClick={() => go('/dang-ky-y-tuong', true)}>
              <div className="icon-wrap"><img src={iconRegister} className="icon" alt="register" /></div>
              <span className="btn-label">{t('sidebar.registerIdea')}</span>
            </button>
            <button className={`menu-btn sub ${getActiveClass('/de-tai-cua-toi')}`} onClick={() => go('/de-tai-cua-toi', true)}>
              <div className="icon-wrap"><img src={iconMyTopic} className="icon" alt="folder" /></div>
              <span className="btn-label">{t('sidebar.myTopics')}</span>
            </button>

            {/* ===== Điều hướng theo vai trò (luồng SRS) ===== */}
            {isStudent && (
              <button className={`menu-btn sub ${getActiveClass('/loi-moi')}`} onClick={() => go('/loi-moi', true)}>
                <div className="icon-wrap"><img src={iconRegister} className="icon" alt="invite" /></div>
                <span className="btn-label">Lời mời tham gia</span>
              </button>
            )}
            {(isLecturer || isAdmin) && (
              <button className={`menu-btn sub ${getActiveClass('/gvhd/nhom')}`} onClick={() => go('/gvhd/nhom', true)}>
                <div className="icon-wrap"><img src={iconMyTopic} className="icon" alt="group" /></div>
                <span className="btn-label">Nhóm nghiên cứu</span>
              </button>
            )}
            {(isOfficer || isAdmin) && (
              <button className={`menu-btn sub ${getActiveClass('/duyet')}`} onClick={() => go('/duyet', true)}>
                <div className="icon-wrap"><img src={iconList} className="icon" alt="review" /></div>
                <span className="btn-label">Hàng chờ duyệt</span>
              </button>
            )}
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        {isAdmin && (
          <button className={`menu-btn ${getActiveClass('/admin/de-tai')}`} onClick={() => go('/admin/de-tai', true)}>
            <div className="icon-wrap"><img src={iconProfile} className="icon" alt="admin" /></div>
            <span className="btn-label">{t('sidebar.adminPortal')}</span>
          </button>
        )}
        {!isLoggedIn ? (
          <button className={`menu-btn ${getActiveClass('/login')}`} onClick={() => go('/login')}>
            <div className="icon-wrap"><img src={iconLogout} className="icon" alt="login" /></div>
            <span className="btn-label">{t('sidebar.login')}</span>
          </button>
        ) : (
          <button className="menu-btn" onClick={handleLogout}>
            <div className="icon-wrap"><img src={iconLogout} className="icon" alt="logout" /></div>
            <span className="btn-label">{t('sidebar.logout')}</span>
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;