import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import './SearchBarGroupAdmin.css';

const SearchBarGroupAdmin = ({ 
  tuKhoa, 
  setTuKhoa, 
  vaiTro, 
  setVaiTro, 
  trangThai, 
  setTrangThai,
  isStudentView = false, // Mặc định là false
  hideRole = false // ẩn dropdown lọc vai trò (dùng cho trang 1 role cố định)
}) => {
  const [moVaiTro, setMoVaiTro] = useState(false);
  const [moTrangThai, setMoTrangThai] = useState(false);
  
  const refVaiTro = useRef(null);
  const refTrangThai = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (refVaiTro.current && !refVaiTro.current.contains(event.target)) setMoVaiTro(false);
      if (refTrangThai.current && !refTrangThai.current.contains(event.target)) setMoTrangThai(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getLabelVaiTro = (val) => {
    if (val === "sinh_vien") return "Sinh Viên";
    if (val === "giang_vien") return "Giảng Viên";
    if (val === "can_bo_khoa") return "Cán bộ NCKH Khoa";
    if (val === "can_bo_phong") return "Cán bộ Phòng NCKH";
    if (val === "truong_khoa") return "Trưởng Khoa";
    if (val === "admin") return "Admin";
    return "Tất cả vai trò";
  };

  const getLabelTrangThai = (val) => {
    if (val === "hoat_dong") return "Hoạt động";
    if (val === "vo_hieu") return "Vô hiệu";
    return "Tất cả";
  };

  return (
    <div className="vung-thanh-cong-cu-admin">
      {/* 1. Ô tìm kiếm bên trái */}
      <div className="o-tim-kiem-lon">
        <Search size={18} className="icon-search-xam" />
        <input 
          type="text" 
          placeholder="Tìm theo tên hoặc email..." 
          value={tuKhoa}
          onChange={(e) => setTuKhoa(e.target.value)}
        />
      </div>

      {/* 2. Nhóm bộ lọc bên phải */}
      <div className="nhom-bo-loc-phai">
        
        {/* CHỈ HIỆN VAI TRÒ NẾU KHÔNG PHẢI LÀ TRANG SINH VIÊN */}
        {!isStudentView && !hideRole && (
          <div className="o-chon-tuy-chinh" ref={refVaiTro}>
            <div className={`nut-chon-gia-select ${moVaiTro ? 'active' : ''}`} onClick={() => setMoVaiTro(!moVaiTro)}>
              <span>{getLabelVaiTro(vaiTro)}</span>
              <ChevronDown size={16} className={`mui-ten ${moVaiTro ? 'xoay' : ''}`} />
            </div>
            
            {moVaiTro && (
              <ul className="danh-sach-menu-tha">
                <li className={vaiTro === "all" ? "selected" : ""} onClick={() => { setVaiTro("all"); setMoVaiTro(false); }}>Tất cả vai trò</li>
                <li className={vaiTro === "sinh_vien" ? "selected" : ""} onClick={() => { setVaiTro("sinh_vien"); setMoVaiTro(false); }}>Sinh Viên</li>
                <li className={vaiTro === "giang_vien" ? "selected" : ""} onClick={() => { setVaiTro("giang_vien"); setMoVaiTro(false); }}>Giảng Viên</li>
                <li className={vaiTro === "can_bo_khoa" ? "selected" : ""} onClick={() => { setVaiTro("can_bo_khoa"); setMoVaiTro(false); }}>Cán bộ NCKH Khoa</li>
                <li className={vaiTro === "can_bo_phong" ? "selected" : ""} onClick={() => { setVaiTro("can_bo_phong"); setMoVaiTro(false); }}>Cán bộ Phòng NCKH</li>
                <li className={vaiTro === "truong_khoa" ? "selected" : ""} onClick={() => { setVaiTro("truong_khoa"); setMoVaiTro(false); }}>Trưởng Khoa</li>
                <li className={vaiTro === "admin" ? "selected" : ""} onClick={() => { setVaiTro("admin"); setMoVaiTro(false); }}>Admin</li>
              </ul>
            )}
          </div>
        )}

        {/* CUSTOM DROP TRẠNG THÁI (Lúc nào cũng hiện) */}
        <div className="o-chon-tuy-chinh" ref={refTrangThai}>
          <div className={`nut-chon-gia-select ${moTrangThai ? 'active' : ''}`} onClick={() => setMoTrangThai(!moTrangThai)}>
            <span>{getLabelTrangThai(trangThai)}</span>
            <ChevronDown size={16} className={`mui-ten ${moTrangThai ? 'xoay' : ''}`} />
          </div>
          
          {moTrangThai && (
            <ul className="danh-sach-menu-tha">
              <li className={trangThai === "all" ? "selected" : ""} onClick={() => { setTrangThai("all"); setMoTrangThai(false); }}>Tất cả</li>
              <li className={trangThai === "hoat_dong" ? "selected" : ""} onClick={() => { setTrangThai("hoat_dong"); setMoTrangThai(false); }}>Hoạt động</li>
              <li className={trangThai === "vo_hieu" ? "selected" : ""} onClick={() => { setTrangThai("vo_hieu"); setMoTrangThai(false); }}>Vô hiệu</li>
            </ul>
          )}
        </div>

      </div>
    </div>
  );
};

export default SearchBarGroupAdmin;