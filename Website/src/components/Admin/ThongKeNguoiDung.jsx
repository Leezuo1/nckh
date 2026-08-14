import React from 'react';
import './ThongKeNguoiDung.css';

const ThongKeNguoiDung = ({ tong, sinhVien, giangVien, quanTri, canBoKhoa = 0, canBoPhong = 0, truongKhoa = 0, isStudentView = false, isLecturerView = false, roleView = null }) => {
  // Biến kiểm tra xem có đang ở trang xem chi tiết (SV / GV / role riêng) hay không
  const isSpecificView = isStudentView || isLecturerView || !!roleView;

  // Xác định tiêu đề hiển thị
  const renderTitle = () => {
    if (roleView) return roleView;
    if (isStudentView) return "Sinh Viên";
    if (isLecturerView) return "Giảng Viên";
    return "Quản Lý Người Dùng";
  };

  return (
    <div className={`vung-thong-ke-nguoi-dung ${isSpecificView ? 'che-do-rut-gon' : ''}`}>
      {/* Tiêu đề chính */}
      <div className="tieu-de-trang">
        <h1>{renderTitle()}</h1>
        <p>{tong} người dùng trong hệ thống</p>
      </div>

      {/* Chỉ hiện dãy stats nếu KHÔNG PHẢI trang chi tiết SV/GV */}
      {!isSpecificView && (
        <div className="danh-sach-the-stats">
          <div className="the-stats-don">
            <span className="cham-tron xanh-dam"></span>
            <span className="nhan-stats">Tổng:</span>
            <span className="so-luong-stats">{tong}</span>
          </div>

          <div className="the-stats-don">
            <span className="cham-tron xanh-nhat"></span>
            <span className="nhan-stats">Sinh Viên:</span>
            <span className="so-luong-stats">{sinhVien}</span>
          </div>

          <div className="the-stats-don">
            <span className="cham-tron xanh-la"></span>
            <span className="nhan-stats">Giảng Viên:</span>
            <span className="so-luong-stats">{giangVien}</span>
          </div>

          <div className="the-stats-don">
            <span className="cham-tron" style={{ background: '#f59e0b' }}></span>
            <span className="nhan-stats">Cán bộ Khoa:</span>
            <span className="so-luong-stats">{canBoKhoa}</span>
          </div>

          <div className="the-stats-don">
            <span className="cham-tron" style={{ background: '#0891b2' }}></span>
            <span className="nhan-stats">Cán bộ Phòng:</span>
            <span className="so-luong-stats">{canBoPhong}</span>
          </div>

          <div className="the-stats-don">
            <span className="cham-tron" style={{ background: '#7c3aed' }}></span>
            <span className="nhan-stats">Trưởng Khoa:</span>
            <span className="so-luong-stats">{truongKhoa}</span>
          </div>

          <div className="the-stats-don">
            <span className="cham-tron do"></span>
            <span className="nhan-stats">Admin:</span>
            <span className="so-luong-stats">{quanTri}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThongKeNguoiDung;