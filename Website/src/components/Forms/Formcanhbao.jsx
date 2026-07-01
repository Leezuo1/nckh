import React from 'react';
import { AlertTriangle, X, Info } from 'lucide-react';
import './Formcanhbao.css';

const Formcanhbao = ({ tieuDe, noiDung, loai, onDong, onXacNhan }) => {
  if (!tieuDe) return null;

  return (
    <div className="nen-modal-canh-bao">
      <div className={`khung-canh-bao-chinh ${loai === 'nguy-hiem' ? 'vien-do' : 'vien-vang'}`}>
        <div className="lop-phu-canh-bao"></div>

        <button className="nut-dong-canh-bao" onClick={onDong}>
          <X size={20} />
        </button>

        <div className="noi-dung-canh-bao">
          <div className={`biu-tuong-canh-bao ${loai === 'nguy-hiem' ? 'bg-do' : 'bg-vang'}`}>
            {loai === 'nguy-hiem' ? <AlertTriangle size={32} /> : <Info size={32} />}
          </div>

          <h2 className="tieu-de-canh-bao">{tieuDe || "Thông báo hệ thống"}</h2>
          <p className="mo-ta-canh-bao">
            {noiDung || "Bạn có chắc chắn muốn thực hiện hành động này không?"}
          </p>

          <div className="nhom-nut-thao-tac">
            <button className="nut-huy-bo" onClick={onDong}>
              Hủy bỏ
            </button>
            <button 
              className={`nut-xac-nhan-chinh ${loai === 'nguy-hiem' ? 'btn-do' : 'btn-vang'}`}
              onClick={onXacNhan}
            >
              Xác nhận
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Formcanhbao;