import React, { useState } from "react";
import { 
  X, GraduationCap, User, Calendar, Hash, 
  Layers, Paperclip, FileText, ChevronDown 
} from "lucide-react";
import "./FormDS.css";

const LUA_CHON_TRANG_THAI = ["Đang thực hiện", "Hoàn thành", "Hủy"];

const cau_hinh_trang_thai = {
  "Đang thực hiện": { nen: "rgba(245,158,11,0.12)", cham: "#f59e0b", chu: "#b45309" },
  "Hoàn thành": { nen: "rgba(16,185,129,0.12)", cham: "#10b981", chu: "#047857" },
  "Hủy": { nen: "rgba(239,68,68,0.12)", cham: "#ef4444", chu: "#b91c1c" },
};

const FormDS = ({ duLieu, onDong }) => {
  const [trangThaiChon, setTrangThaiChon] = useState(duLieu?.trangThai || "Đang thực hiện");
  const [dangMoMenu, setDangMoMenu] = useState(false);

  if (!duLieu) return null;

  const sc = cau_hinh_trang_thai[trangThaiChon] || cau_hinh_trang_thai["Đang thực hiện"];

  return (
    <div
      className="nen-mo-fixed"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDong();
        setDangMoMenu(false);
      }}
    >
      <div
        className="khung-modal-chinh"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Vung noi dung co the cuon */}
        <div className="vung-cuon-modal">
          
          {/* Phan dau modal */}
          <div className="dem-le-ngang dem-le-tren">
            <div className="hang-giua-biet-lap mb-16">
              <span
                className="the-trang-thai-mini"
                style={{ backgroundColor: sc.nen, color: sc.chu }}
              >
                <span className="cham-tron-nho" style={{ backgroundColor: sc.cham }} />
                Đã Assign
              </span>
              <button
                className="nut-dong-modal-x"
                onClick={onDong}
              >
                <X size={16} />
              </button>
            </div>

            <h2 className="tieu-de-chinh-de-tai">{duLieu.tieuDe}</h2>

            <p className="mo-ta-chi-tiet-van-ban">
              {duLieu.moTa || "Ứng dụng deep learning để phân tích hành vi học tập trực tuyến của sinh viên và đưa ra các khuyến nghị học tập cá nhân hóa."}
            </p>

            <div className="duong-phan-cach-ngang" />
          </div>

          {/* Phan than modal */}
          <div className="dem-le-ngang dem-le-duoi khoang-cach-doc-5">
            <div className="luoi-hai-cot khoang-cach-le-5">
              {/* Cot Nam */}
              <div className="nhom-nhap-lieu">
                <div className="nhan-kem-icon">
                  <Calendar size={14} style={{ color: "#6b7280" }} />
                  <span className="chu-nhan-nho">Năm</span>
                </div>
                <p className="gia-tri-chu-dam">
                  {duLieu.namHoc || "2024 - 2025"}
                </p>
              </div>

              {/* Cot Tinh Trang */}
              <div className="nhom-nhap-lieu">
                <div className="nhan-kem-icon">
                  <Layers size={14} style={{ color: "#6b7280" }} />
                  <span className="chu-nhan-nho">Tình Trạng</span>
                </div>
                <div className="vung-chua-dropdown">
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

            {/* The Giang Vien */}
            <div className="the-thong-tin-xam o-dem-4 nen-xam-nhat">
              <div className="hang-canh-giua khoang-cach-le-2 mb-12">
                <div className="hop-icon-xanh-duong">
                  <GraduationCap size={13} style={{ color: "#3b82f6" }} />
                </div>
                <span className="chu-nhan-the-uppercase">Giảng Viên Hướng Dẫn</span>
              </div>
              <div className="nhom-du-lieu-don">
                <p className="nhan-phu-nho">Tên giảng viên</p>
                <p className="gia-tri-chinh-dam">{duLieu.giangVien || "PGS.TS. Nguyễn Văn Minh"}</p>
              </div>
            </div>

            {/* The Sinh Vien */}
            <div className="the-thong-tin-xam o-dem-4 nen-xam-nhat">
              <div className="hang-canh-giua khoang-cach-le-2 mb-12">
                <div className="hop-icon-xanh-la">
                  <User size={13} style={{ color: "#10b981" }} />
                </div>
                <span className="chu-nhan-the-uppercase">SINH VIÊN</span>
              </div>
              <div className="luoi-hai-cot khoang-cach-le-3">
                <div className="nhom-du-lieu-don">
                  <p className="nhan-phu-nho">Tên sinh viên</p>
                  <p className="gia-tri-chinh-dam">{duLieu.sinhVien || "PGS.TS. Nguyễn Văn Minh"}</p>
                </div>
                <div className="nhom-du-lieu-don">
                  <p className="nhan-phu-nho">Mã sinh viên</p>
                  <p className="gia-tri-chinh-dam">{duLieu.maSV || "GV001"}</p>
                </div>
              </div>
            </div>

            {/* The Tai Lieu */}
            <div className="the-thong-tin-xam o-dem-4 nen-xam-nhat">
              <div className="hang-canh-giua khoang-cach-le-2 mb-12">
                <div className="hop-icon-tim">
                  <Paperclip size={13} style={{ color: "#6366f1" }} />
                </div>
                <span className="chu-nhan-the-uppercase">Tài Liệu Đính Kèm</span>
              </div>
              <div className="khoang-cach-doc-2">
                <div className="thanh-tep-dinh-kem">
                  <div className="icon-tep-xanh-mem"><FileText size={14} style={{ color: "#3b82f6" }} /></div>
                  <span className="ten-tep-van-ban">Báo_cao.docx</span>
                </div>
                <div className="thanh-tep-dinh-kem">
                  <div className="icon-tep-do-mem"><FileText size={14} style={{ color: "#ef4444" }} /></div>
                  <span className="ten-tep-van-ban">Báo_cáo_Quản_Lý_DE_Tài.pdf</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Phan chan Footer */}
        <div className="phan-chan-modal">
          <button className="nut-dong-footer" onClick={onDong}>Đóng</button>
          <button className="nut-luu-footer">Lưu</button>
        </div>
      </div>
    </div>
  );
};

export default FormDS;