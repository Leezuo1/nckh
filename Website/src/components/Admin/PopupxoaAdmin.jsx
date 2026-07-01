import React from 'react';
import { Trash2, X, AlertOctagon } from 'lucide-react';
import './PopupxoaAdmin.css';

const PopupxoaAdmin = ({ hienThi, onDong, onXacNhan, tenMucXoa }) => {
  // Nếu không yêu cầu hiển thị thì không render gì cả
  if (!hienThi) return null;

  return (
    <div className="nen-popup-xoa-admin">
      <div className="khung-popup-xoa-chinh">
        {/* Nút X đóng nhanh */}
        <button className="nut-dong-popup-xoa" onClick={onDong}>
          <X size={20} />
        </button>

        <div className="noi-dung-popup-xoa">
          {/* Biểu tượng thùng rác đang rung động cảnh báo */}
          <div className="bieu-tuong-canh-bao-xoa">
            <AlertOctagon size={36} />
          </div>

          <h2 className="tieu-de-popup-xoa">Xác nhận xóa?</h2>
          <p className="mo-ta-popup-xoa">
            Có chắc chắn muốn xóa mục: <br />
            <strong>"{tenMucXoa || "Đề tài này"}"</strong>? <br />
            <span>Hành động này không thể hoàn tác!</span>
          </p>

          <div className="nhom-nut-bam-xoa">
            <button className="nut-huy-xoa" onClick={onDong}>
              Hủy bỏ
            </button>
            <button className="nut-xac-nhan-xoa-han" onClick={onXacNhan}>
              <Trash2 size={16} /> Xác nhận xóa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PopupxoaAdmin;