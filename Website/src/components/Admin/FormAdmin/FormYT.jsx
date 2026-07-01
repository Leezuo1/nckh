import React, { useState } from "react";
import { 
  X, User, Calendar, Hash, 
  Layers, Paperclip, FileText, ChevronDown 
} from "lucide-react";
import "./FormYT.css";

// Khớp với các trạng thái bên DSytuongAdmin
const LUA_CHON_TRANG_THAI = ["Chờ Duyệt", "Hủy"];

const cau_hinh_trang_thai = {
  "Chờ Duyệt": { nen: "rgba(59,130,246,0.12)", cham: "#3b82f6", chu: "#1d4ed8" },
  "Chưa Assgin": { nen: "rgba(107,114,128,0.12)", cham: "#6b7280", chu: "#374151" },
  "Hủy": { nen: "rgba(239,68,68,0.12)", cham: "#ef4444", chu: "#b91c1c" },
};

const FormYT = ({ duLieu, onDong }) => {
  // Đồng bộ trạng thái từ dữ liệu gốc
  const [trangThaiChon, setTrangThaiChon] = useState(duLieu?.trangThai || "Chờ Duyệt");
  const [dangMoMenu, setDangMoMenu] = useState(false);

  if (!duLieu) return null;

  const sc = cau_hinh_trang_thai[trangThaiChon] || cau_hinh_trang_thai["Chưa Assgin"];

  return (
    <div
      className="nen-mo-fixed"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDong();
        setDangMoMenu(false);
      }}
    >
      <div className="khung-modal-chinh" onClick={(e) => e.stopPropagation()}>
        
        {/* Vùng nội dung có thể cuộn */}
        <div className="vung-cuon-modal">
          
          {/* Phần đầu modal */}
          <div className="dem-le-ngang dem-le-tren">
            <div className="hang-giua-biet-lap mb-16">
              <span className="the-trang-thai-mini" style={{ backgroundColor: sc.nen, color: sc.chu }}>
                <span className="cham-tron-nho" style={{ backgroundColor: sc.cham }} />
                Ý Tưởng Đề Tài
              </span>
              <button className="nut-dong-modal-x" onClick={onDong}>
                <X size={16} />
              </button>
            </div>

            <h2 className="tieu-de-chinh-de-tai">{duLieu.tieuDe}</h2>

            <p className="mo-ta-chi-tiet-van-ban">
              Ý tưởng nghiên cứu được đăng tải bởi sinh viên/giảng viên VLU. Đang chờ quản trị viên phê duyệt hoặc gán giảng viên hướng dẫn.
            </p>

            <div className="duong-phan-cach-ngang" />
          </div>

          {/* Phần thân modal */}
          <div className="dem-le-ngang dem-le-duoi">
            
            {/* Hàng Năm & Tình Trạng (Đã fix nằm ngang) */}
            <div className="hang-ngang-nam-tinh-trang">
              {/* Cột Năm */}
              <div className="khoi-nam-trai">
                <div className="nhan-kem-icon">
                  <Calendar size={14} style={{ color: "#6b7280" }} />
                  <span className="chu-nhan-nho">Năm</span>
                </div>
                <p className="gia-tri-nam-duoi">2024 - 2025</p>
              </div>

              {/* Cột Tình Trạng */}
              <div className="khoi-tinh-trang-phai">
                <div className="nhan-kem-icon">
                  <Layers size={14} style={{ color: "#6b7280" }} />
                  <span className="chu-nhan-nho">Tình Trạng</span>
                </div>
                <div className="vung-chua-select-rieng">
                  <button
                    className={`nut-bam-mo-menu ${dangMoMenu ? "dang-kich-hoat" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDangMoMenu(!dangMoMenu);
                    }}
                  >
                    <span>{trangThaiChon}</span>
                    <ChevronDown size={14} style={{ color: "#9ca3af" }} className={dangMoMenu ? "xoay-mui-ten" : ""} />
                  </button>
                  
                  {dangMoMenu && (
                    <div className="menu-tha-xuong-tuy-chon">
                      {LUA_CHON_TRANG_THAI.map((opt) => (
                        <button
                          key={opt}
                          className={`item-trong-menu ${trangThaiChon === opt ? "dang-chon-item" : ""}`}
                          onClick={() => {
                            setTrangThaiChon(opt);
                            setDangMoMenu(false);
                          }}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="duong-phan-cach-ngang" />

            {/* Thẻ Người Đăng Ý Tưởng (Đã fix căn trái) */}
            <div className="the-thong-tin-xam o-dem-4 nen-xam-nhat">
              <div className="hang-canh-giua khoang-cach-le-2 mb-12">
                <div className="hop-icon-xanh-duong">
                  <User size={13} style={{ color: "#3b82f6" }} />
                </div>
                <span className="chu-nhan-the-uppercase">Thông Tin Người Đăng</span>
              </div>
              <div className="nhom-du-lieu-can-trai">
                <p className="nhan-phu-nho">Họ và tên</p>
                <p className="gia-tri-chinh-dam">{duLieu.nguoiDang || "Chưa xác định"}</p>
              </div>
            </div>

            {/* Thẻ Tài Liệu */}
            <div className="the-thong-tin-xam o-dem-4 nen-xam-nhat">
              <div className="hang-canh-giua khoang-cach-le-2 mb-12">
                <div className="hop-icon-tim">
                  <Paperclip size={13} style={{ color: "#6366f1" }} />
                </div>
                <span className="chu-nhan-the-uppercase">Tài Liệu Đính Kèm</span>
              </div>
              <div className="khoang-cach-doc-file">
                <div className="thanh-tep-dinh-kem">
                  <div className="icon-tep-xanh-mem"><FileText size={14} style={{ color: "#3b82f6" }} /></div>
                  <span className="ten-tep-van-ban">Bản_thảo_ý_tưởng.docx</span>
                </div>
                <div className="thanh-tep-dinh-kem">
                  <div className="icon-tep-do-mem"><FileText size={14} style={{ color: "#ef4444" }} /></div>
                  <span className="ten-tep-van-ban">Sơ_đồ_giải_pháp.pdf</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Phần chân Footer */}
        <div className="phan-chan-modal">
          <button className="nut-dong-footer" onClick={onDong}>Đóng</button>
          <button className="nut-luu-footer">Lưu</button>
        </div>
      </div>
    </div>
  );
};

export default FormYT;