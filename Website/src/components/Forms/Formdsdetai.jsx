import React, { useMemo } from 'react';
import { X, Book, FileText, Calendar, Clock, GraduationCap, Users, Download, Upload } from 'lucide-react';
import './Formdsdetai.css';

// Import đúng 2 icon của ní
import iconpdf from '../../assets/Images/pdf.png';
import iconDoc from '../../assets/Images/word.png';

const Formdsdetai = ({ duLieu, onDong }) => {
  if (!duLieu) return null;

  // Logic sinh viên ngẫu nhiên (giữ nguyên của ní)
  const dsSVHienThi = useMemo(() => {
    if (duLieu.danhSachSV) return duLieu.danhSachSV;
    const soLuong = Math.floor(Math.random() * 5) + 1;
    const tenTeamNinh = ["Lê Quang Thương", "Nguyễn Việt Hải", "Nguyễn Đình Thuần", "Đậu Quang Minh", "Nguyễn Lê Duy Thịnh"];
    return Array.from({ length: soLuong }, (_, i) => ({
      ten: tenTeamNinh[i % tenTeamNinh.length],
      mssv: `227488107586${i + 1}`
    }));
  }, [duLieu.id]);

  return (
    <div className="nen-modal-form">
      <div className="khung-modal-chinh">
        <div className="dom-sang-chuyen-dong"></div>
        <div className="lop-hat-sieu-sang"></div>

        <button className="nut-dong-cheo" onClick={onDong}>
          <X size={22} />
        </button>

        <div className="noi-dung-scroll-form">
          <div className="the-trang-thai-top">
            <span className={`dot-status ${duLieu.trangThai === 'Hoàn Thành' ? 'xanh' : 'tim'}`}>•</span>
            <span className={duLieu.trangThai === 'Hoàn Thành' ? 'text-xanh' : 'text-tim'}>
              {duLieu.trangThai}
            </span>
          </div>

          <h2 className="tieu-de-lon-form">{duLieu.tieuDe}</h2>

          {/* PHẦN 1: TÊN ĐỀ TÀI */}
          <div className="phan-muc-form">
            <div className="tieu-de-muc">
              <Book size={16} /> <span>Tên đề tài</span>
            </div>
            <p className="gia-tri-muc">{duLieu.tieuDe}</p>
          </div>
          <hr className="duong-phan-cach" />

          {/* PHẦN 2: MÔ TẢ */}
          <div className="phan-muc-form">
            <div className="tieu-de-muc">
              <FileText size={16} /> <span>Mô tả sơ bộ đề tài</span>
            </div>
            <p className="gia-tri-muc mo-ta-chi-tiet">
              {duLieu.moTa || "Ứng dụng công nghệ hiện đại vào quản lý thực tiễn, tối ưu hóa quy trình nghiên cứu khoa học cho sinh viên Đại học Văn Lang..."}
            </p>
          </div>
          <hr className="duong-phan-cach" />

          {/* PHẦN 3: THỜI GIAN */}
          <div className="hang-doi-nhau">
            <div className="phan-muc-form no-border">
              <div className="tieu-de-muc">
                <Calendar size={16} /> <span>Năm</span>
              </div>
              <p className="gia-tri-muc">{duLieu.namHoc || "2025 - 2026"}</p>
            </div>
            <div className="phan-muc-form no-border">
              <div className="tieu-de-muc">
                <Clock size={16} /> <span>Thời gian thực hiện</span>
              </div>
              <p className="gia-tri-muc">{duLieu.thoiGianThucHien || "6 tháng"}</p>
            </div>
          </div>
          <hr className="duong-phan-cach" />

          {/* PHẦN 4: GIẢNG VIÊN */}
          <div className="vung-xam-thong-tin">
            <div className="tieu-de-muc-dam">
              <GraduationCap size={18} /> <span>Giảng Viên Hướng Dẫn</span>
            </div>
            <div className="bang-thong-tin-con">
              <div className="cot-thong-tin">
                <label>Tên giảng viên</label>
                <span>{duLieu.nguoiDang || "Ths. Nguyễn Minh Tân"}</span>
              </div>
              <div className="cot-thong-tin">
                <label>Mã số giảng viên</label>
                <span>{duLieu.maSoGV || "2839PCNTT"}</span>
              </div>
            </div>

            {/* PHẦN 5: SINH VIÊN */}
            <div className="tieu-de-muc-dam" style={{ marginTop: '25px' }}>
              <Users size={18} /> <span>Sinh Viên Thực Hiện</span>
            </div>
            {dsSVHienThi.map((sv, index) => (
              <div key={index} className="bang-thong-tin-con gach-duoi">
                <div className="cot-thong-tin">
                  <label>Sinh viên {index + 1}</label>
                  <span>{sv.ten}</span>
                </div>
                <div className="cot-thong-tin">
                  <label>Mã số sinh viên</label>
                  <span>{sv.mssv}</span>
                </div>
                <div className="cot-thong-tin">
                  <label>Năm</label>
                  <span>{duLieu.namHoc || "2025-2026"}</span>
                </div>
                <div className="cot-thong-tin">
                  <label>Khóa</label>
                  <span>{duLieu.khoaHieu || "K28"}</span>
                </div>
              </div>
            ))}
          </div>

          <hr className="duong-phan-cach" />

          {/* PHẦN 6: TÀI LIỆU */}
          <div className="vung-xam-thong-tin tai-lieu-box">
            <div className="tieu-de-muc-dam">
              <Upload size={16} /> <span>Tài Liệu Đính Kèm</span>
            </div>
            <div className="vung-danh-sach-file">
              <div className="item-file">
                <img src={iconpdf} alt="pdf" className="anh-icon-file" />
                <span className="ten-file">bao_cao_nckh.pdf</span>
              </div>
              <div className="item-file">
                <img src={iconDoc} alt="doc" className="anh-icon-file" />
                <span className="ten-file">phieu_dang_ky.docx</span>
              </div>
              <button className="nut-tai-len-icon" title="Tải xuống tất cả">
                <Download size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="chan-modal">
          <button className="nut-dong-form-chinh" onClick={onDong}>Đóng</button>
        </div>
      </div>
    </div>
  );
};

export default Formdsdetai;