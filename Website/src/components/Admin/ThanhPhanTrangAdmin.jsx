import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './ThanhPhanTrangAdmin.css';

const ThanhPhanTrangAdmin = ({ 
  tongSoMuc, 
  soMucMoiTrang, 
  trangHienTai, 
  datTrangHienTai,
  tenLoaiMuc = "mục" // Mặc định là "mục", có thể truyền "người dùng", "ý tưởng"...
}) => {
  
  // 1. Tính toán số trang
  const tongSoTrang = Math.ceil(tongSoMuc / soMucMoiTrang);
  const mucBatDau = (trangHienTai - 1) * soMucMoiTrang + 1;
  const mucKetThuc = Math.min(trangHienTai * soMucMoiTrang, tongSoMuc);

  // 2. Logic tạo dãy số trang có dấu ba chấm (Dựa trên code của ní)
  const layDaySoTrang = () => {
    const range = new Set();
    if (tongSoTrang <= 1) return [1];
    
    range.add(1);
    range.add(trangHienTai);
    if (trangHienTai > 1) range.add(trangHienTai - 1);
    if (trangHienTai < tongSoTrang) range.add(trangHienTai + 1);
    range.add(tongSoTrang);

    const rangeSapXep = Array.from(range).sort((a, b) => a - b);
    const rangeCoBaCham = [];

    rangeSapXep.forEach((page, index) => {
      if (index > 0) {
        if (page - rangeSapXep[index - 1] === 2) {
          rangeCoBaCham.push(rangeSapXep[index - 1] + 1);
        } else if (page - rangeSapXep[index - 1] > 2) {
          rangeCoBaCham.push('...');
        }
      }
      rangeCoBaCham.push(page);
    });
    return rangeCoBaCham;
  };

  if (tongSoMuc === 0) return null;

  return (
    <footer className="chan-trang-admin-tong">
      <div className="thong-tin-hien-thi">
        Hiển thị <strong>{mucBatDau}–{mucKetThuc}</strong> trong <strong>{tongSoMuc}</strong> {tenLoaiMuc}
      </div>

      <div className="cum-nut-phan-trang">
        {/* Nút lùi */}
        <button 
          className="nut-dieu-huong-admin" 
          onClick={() => datTrangHienTai(prev => Math.max(prev - 1, 1))}
          disabled={trangHienTai === 1}
        >
          <ChevronLeft size={18} />
        </button>

        {/* Dãy số trang */}
        {layDaySoTrang().map((p, i) => (
          p === '...' ? (
            <span key={`dots-${i}`} className="dau-ba-cham-admin">...</span>
          ) : (
            <button 
              key={`page-${p}`} 
              className={`nut-so-trang-admin ${trangHienTai === p ? 'kich-hoat' : ''}`} 
              onClick={() => datTrangHienTai(p)}
            >
              {p}
            </button>
          )
        ))}

        {/* Nút tiến */}
        <button 
          className="nut-dieu-huong-admin" 
          onClick={() => datTrangHienTai(prev => Math.min(prev + 1, tongSoTrang))}
          disabled={trangHienTai === tongSoTrang}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </footer>
  );
};

export default ThanhPhanTrangAdmin;