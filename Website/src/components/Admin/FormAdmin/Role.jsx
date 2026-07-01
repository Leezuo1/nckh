import React, { useState } from "react";
import { X } from "lucide-react";
import "./Role.css";

const danh_sach_vai_tro = [
  { id: "sinh_vien", tieuDe: "Sinh Viên", moTa: "Tài khoản sinh viên" },
  { id: "giang_vien", tieuDe: "Giảng Viên", moTa: "Tài khoản giảng viên" },
  { id: "admin", tieuDe: "Quản Trị Viên", moTa: "Tài khoản quản trị hệ thống" },
];

const Role = ({ user, onDong, onLuu }) => {
  const [vaiTroChon, setVaiTroChon] = useState(user?.vaiTroId || "sinh_vien");

  if (!user) return null;

  return (
    <div className="nen-mo-role" onClick={(e) => e.target === e.currentTarget && onDong()}>
      <div className="khung-modal-role" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="dau-modal-role">
          <h2 className="tieu-de-chinh-role">Chỉnh Sửa Vai Trò</h2>
          <button className="nut-dong-role" onClick={onDong}>
            <X size={20} />
          </button>
        </div>

        {/* Profile Card (Phần màu xám nhạt) */}
        <div className="vung-user-hien-tai">
          <div className="avatar-tron-role">
            {user.ten ? user.ten.split(' ').pop().substring(0, 2).toUpperCase() : "NA"}
          </div>
          <div className="thong-tin-chu-role">
            <p className="ten-user-dam">{user.ten || "Nguyễn Văn An"}</p>
            <p className="email-user-nhat">{user.email || "an.nguyen@student.edu.vn"}</p>
          </div>
        </div>

        {/* Thân Modal */}
        <div className="than-modal-role">
          <p className="nhan-chon-vai-tro">CHỌN VAI TRÒ MỚI</p>
          
          <div className="danh-sach-the-vai-tro">
            {danh_sach_vai_tro.map((item) => (
              <label 
                key={item.id} 
                className={`the-chon-vai-tro ${vaiTroChon === item.id ? "dang-kich-hoat" : ""}`}
              >
                <div className="cum-radio-custom">
                  <div className={`vong-tron-ngoai ${vaiTroChon === item.id ? "checked" : ""}`}>
                    <div className="cham-tron-trong" />
                  </div>
                </div>
                <div className="cum-van-ban-vai-tro">
                  <span className="ten-vai-tro-moi">{item.tieuDe}</span>
                  <span className="mo-ta-vai-tro-moi">{item.moTa}</span>
                </div>
                <input 
                  type="radio" 
                  name="role" 
                  value={item.id} 
                  checked={vaiTroChon === item.id}
                  onChange={() => setVaiTroChon(item.id)}
                  style={{ display: 'none' }}
                />
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="phan-chan-role">
          <button className="nut-huy-bo-role" onClick={onDong}>Hủy</button>
          <button className="nut-luu-thay-doi-role" onClick={() => onLuu(vaiTroChon)}>
            Lưu Thay Đổi
          </button>
        </div>
      </div>
    </div>
  );
};

export default Role;