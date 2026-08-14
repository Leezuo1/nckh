import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./SidebarAdmin.css";
import hinhLogoVLU from "../../assets/Images/IconVLU.png";
import authService from "../../services/authService";
import {
  BookOpen,
  Smartphone,
  ClipboardList,
  UserCircle,
  Users,
  GraduationCap,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  Building2,
  Briefcase,
  Award
} from "lucide-react";

const SidebarAdmin = ({ activeMenu, onMenuChange }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = authService.getCurrentUser();
  const avatarText = user?.fullName
    ? user.fullName.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase()
    : 'AD';
  const displayName = user?.fullName?.split(' ').pop() || t('sidebarAdmin.admin');
  // Admin chỉ quản trị tài khoản + hệ thống. Quản lý đề tài/duyệt đã chuyển sang Khu cán bộ.
  const menuItems = [
    { id: "nguoi_dung", label: t('sidebarAdmin.users'), icon: UserCircle },
    { id: "sinh_vien", label: t('sidebarAdmin.students'), icon: Users },
    { id: "giang_vien", label: t('sidebarAdmin.lecturers'), icon: GraduationCap },
    { id: "can_bo_khoa", label: "Cán bộ Khoa", icon: Building2 },
    { id: "can_bo_phong", label: "Cán bộ Phòng", icon: Briefcase },
    { id: "truong_khoa", label: "Trưởng Khoa", icon: Award },
  ];

  return (
    <aside className="khung-sidebar-admin">
      {/* Logo & Title */}
      <div className="vung-dau-sidebar">
        <div className="hop-logo">
          <img src={hinhLogoVLU} alt="VLU Logo" className="anh-logo-vlu-sidebar" />
        </div>
        <div className="chu-logo">
          <p className="tieu-de-chinh">{t('sidebarAdmin.admin')}</p>
          <p className="tieu-de-phu">{t('sidebarAdmin.adminPortal')}</p>
        </div>
      </div>

      <p className="tieu-de-nhom">{t('sidebarAdmin.management')}</p>

      {/* Menu chính */}
      <nav className="vung-menu-chinh">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeMenu === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onMenuChange(item.id)}
              className={`nut-menu-don ${isActive ? "dang-chon" : ""}`}
            >
              <div className="hop-bieu-tuong-menu">
                <Icon size={18} className="bieu-tuong-menu" />
              </div>
              <span className="nhan-menu">{item.label}</span>
              {isActive && <ChevronRight size={14} className="mui-ten-active" />}
            </button>
          );
        })}
      </nav>

      <div className="duong-ke-ngan-cach"></div>

      {/* Footer: Cài Đặt + Profile */}
      <div className="vung-chan-sidebar">
        {/* Nút Cài Đặt - chỉ có ở đây, không trong menu */}
        <button
          className={`the-cai-dat ${activeMenu === 'setting' ? 'dang-chon' : ''}`}
          onClick={() => onMenuChange('setting')}
        >
          <div className="hop-bieu-tuong-cai-dat">
            <Settings size={18} />
          </div>
          <span className="chu-cai-dat">{t('sidebarAdmin.settings')}</span>
          <ChevronRight size={16} className="mui-ten-phu" />
        </button>

        {/* Profile Admin */}
        <div className="the-ca-nhan">
          <div className="hop-anh-dai-dien">{avatarText}</div>
          <div className="thong-tin-ca-nhan">
            <p className="ten-admin">{displayName}</p>
          </div>
          <LogOut
            size={16}
            className="nut-dang-xuat"
            onClick={() => navigate('/')}
            style={{ cursor: 'pointer' }}
            title={t('sidebarAdmin.backToUser')}
          />
        </div>
      </div>
    </aside>
  );
};

export default SidebarAdmin;