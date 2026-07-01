import React, { useState } from 'react';
import { X, Book, FileText, Calendar, GraduationCap, Users, Lightbulb } from 'lucide-react';
import './Formdsytuong.css';
import Formcanhbao from './Formcanhbao';

const Formdsytuong = ({ duLieu, onDong, onAssignSuccess }) => {
  const [hienCanhBao, setHienCanhBao] = useState(false);

  if (!duLieu) return null;

  // --- LOGIC HIỂN THỊ THÔNG TIN THEO VAI TRÒ ---
  const renderThongTinNguoiDang = () => {
    if (duLieu.vaiTro === "Giảng viên" || duLieu.vaiTro === "Giảng viên hướng dẫn") {
      return (
        <div className="vung-thong-tin-noi-bat">
          <div className="tieu-de-muc-dam">
            <GraduationCap size={18} /> <span>Giảng Viên Đề Xuất</span>
          </div>
          <div className="bang-thong-tin-con">
            <div className="cot-thong-tin">
              <label>Tên giảng viên</label>
              <span>{duLieu.nguoiDang}</span>
            </div>
            <div className="cot-thong-tin">
              <label>Mã số giảng viên</label>
              <span>{duLieu.maSo || "2291PCNTT"}</span>
            </div>
          </div>
        </div>
      );
    } 
    return (
      <div className="vung-thong-tin-noi-bat">
        <div className="tieu-de-muc-dam">
          <Users size={18} /> <span>Sinh Viên Đề Xuất</span>
        </div>
        <div className="bang-thong-tin-con">
          <div className="cot-thong-tin">
            <label>Tên sinh viên</label>
            <span>{duLieu.nguoiDang}</span>
          </div>
          <div className="cot-thong-tin">
            <label>Mã số sinh viên</label>
            <span>{duLieu.maSo || "2274881075867"}</span>
          </div>
          <div className="cot-thong-tin">
            <label>Khóa</label>
            <span>{duLieu.khoaHieu || "K28"}</span>
          </div>
        </div>
      </div>
    );
  };

  // --- HÀM XỬ LÝ KHI NHẤN XÁC NHẬN TRÊN POPUP CẢNH BÁO ---
  const handleXacNhanAssign = () => {
    // 1. Chạy hàm xử lý ở file Content (Hiện Toast xanh & xóa đề tài khỏi list)
    if (onAssignSuccess) {
        onAssignSuccess(duLieu.id); 
    }
    
    // 2. Tắt popup cảnh báo ngay lập tức
    setHienCanhBao(false);

    // 3. Tắt luôn form chi tiết ý tưởng (onDong là hàm setYtuongDuocChon(null) từ file Content)
    onDong(); 
  };

  return (
    <div className="nen-modal-form">
      {/* POPUP CẢNH BÁO */}
      {hienCanhBao && (
        <Formcanhbao 
          tieuDe="Xác nhận đăng ký"
          noiDung={`Bạn có chắc chắn muốn Assign ý tưởng "${duLieu.tieuDe}" này không?`}
          loai="thong-tin" 
          onDong={() => setHienCanhBao(false)}
          onXacNhan={handleXacNhanAssign}
        />
      )}

      <div className="khung-modal-chinh">
        <div className="dom-sang-chuyen-dong"></div>
        <div className="lop-hat-sieu-sang"></div>
        <button className="nut-dong-cheo" onClick={onDong}><X size={22} /></button>

        <div className="noi-dung-scroll-form">
          <div className="the-trang-thai-top badge-cho-assign">
            <span className="dot-status vang">•</span>
            <span className="text-vang">Chờ Assign</span>
          </div>
          <h2 className="tieu-de-lon-form">{duLieu.tieuDe}</h2>

          <div className="phan-muc-form-ytuong">
            <div className="tieu-de-muc">
              <Lightbulb size={16} /> <span>Ý tưởng đề tài</span>
            </div>
            <p className="gia-tri-muc">{duLieu.tieuDe}</p>
          </div>
          <hr className="duong-ke-mo" />

          <div className="phan-muc-form-ytuong">
            <div className="tieu-de-muc">
              <FileText size={16} /> <span>Mô tả chi tiết ý tưởng</span>
            </div>
            <p className="gia-tri-muc mo-ta-van-ban">{duLieu.moTa || "Mô tả sơ bộ về ý tưởng nghiên cứu khoa học..."}</p>
          </div>
          <hr className="duong-ke-mo" />

          <div className="hang-doi-nhau-can-trai">
            <div className="o-thong-tin-nho">
              <div className="tieu-de-muc"><Calendar size={16} /> <span>Năm học</span></div>
              <p className="gia-tri-muc">{duLieu.namHoc || "2024 - 2025"}</p>
            </div>
          </div>

          <hr className="duong-ke-mo" />
          {renderThongTinNguoiDang()}
        </div>

        <div className="chan-modal">
          <button className="nut-assign-chinh" onClick={() => setHienCanhBao(true)}>Assign</button>
        </div>
      </div>
    </div>
  );
};

export default Formdsytuong;