import React from 'react';
import './ThongKeNguoiDung.css';

const ThongKeNguoiDung = ({ tong, sinhVien, giangVien, quanTri, isStudentView = false, isLecturerView = false }) => {
  // Biến kiểm tra xem có đang ở trang xem chi tiết (SV hoặc GV) hay không
  const isSpecificView = isStudentView || isLecturerView;

  // Xác định tiêu đề hiển thị
  const renderTitle = () => {
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