import { useState } from 'react';
import { X } from 'lucide-react';
import Formcanhbao from '../../../components/Forms/Formcanhbao';
import './QuanLyYTuong.css';

const QuanLyYTuongModal = ({ item, onClose, onApprove, onReject, onRestore }) => {
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  if (!item) return null;

  return (
    <div className="qlyt-modal-overlay" onClick={onClose}>
      <div className="qlyt-modal" onClick={e => e.stopPropagation()}>

        {showApproveConfirm && (
          <Formcanhbao
            tieuDe="Xác nhận duyệt"
            noiDung={`Bạn có chắc chắn muốn duyệt đề tài "${item.title}" này không?`}
            loai="thong-tin"
            onDong={() => setShowApproveConfirm(false)}
            onXacNhan={() => { setShowApproveConfirm(false); onApprove(item.id); }}
          />
        )}

        {showRejectConfirm && (
          <Formcanhbao
            tieuDe="Xác nhận hủy đề tài"
            noiDung={`Bạn có chắc chắn muốn hủy đề tài "${item.title}" này không?`}
            loai="nguy-hiem"
            onDong={() => setShowRejectConfirm(false)}
            onXacNhan={() => { setShowRejectConfirm(false); onReject(item.id); }}
          />
        )}

        {showRestoreConfirm && (
          <Formcanhbao
            tieuDe="Xác nhận khôi phục"
            noiDung={`Bạn có chắc chắn muốn khôi phục đề tài "${item.title}" về trạng thái chờ duyệt không?`}
            loai="thong-tin"
            onDong={() => setShowRestoreConfirm(false)}
            onXacNhan={() => { setShowRestoreConfirm(false); onRestore(item.id); }}
          />
        )}

        <button className="qlyt-modal-close" onClick={onClose}><X size={20} /></button>

        <span className={`qlyt-badge ${item.status === 'Hủy' ? 'red' : 'orange'}`}
          style={{ marginBottom: 12, display: 'inline-flex' }}>
          • {item.status}
        </span>

        <h2 className="qlyt-modal-title">{item.title}</h2>
        <hr className="qlyt-divider" />

        <div className="qlyt-modal-section">
          <h4 className="qlyt-modal-label">📁 Tên đề tài</h4>
          <p className="qlyt-modal-value">{item.title}</p>
        </div>
        <hr className="qlyt-divider" />

        <div className="qlyt-modal-section">
          <h4 className="qlyt-modal-label">📖 Mô tả sơ bộ đề tài</h4>
          <p className="qlyt-modal-value">{item.description || 'Chưa có mô tả'}</p>
        </div>
        <hr className="qlyt-divider" />

        <div className="qlyt-modal-meta">
          <div>
            <h4 className="qlyt-modal-label">📅 Năm</h4>
            <p className="qlyt-modal-value">{item.year}</p>
          </div>
          {/*  Chỉ hiện thời gian nếu GV đề xuất */}
          {item.submitterRole === 'Lecturer' && (
            <div>
              <h4 className="qlyt-modal-label">🕐 Thời gian thực hiện</h4>
              <p className="qlyt-modal-value">{item.duration}</p>
            </div>
          )}
        </div>
        <hr className="qlyt-divider" />

        {/*  Nếu GV đề xuất → hiện GV đề xuất */}
        {item.submitterRole === 'Lecturer' ? (
          <div className="qlyt-modal-info-box">
            <h4 className="qlyt-modal-label">🎓 Giảng Viên Đề Xuất</h4>
            <div className="qlyt-modal-info-row">
              <div>
                <span className="qlyt-info-label">Tên giảng viên</span>
                <span className="qlyt-info-value">{item.lecturer}</span>
              </div>
              <div>
                <span className="qlyt-info-label">Mã số giảng viên</span>
                <span className="qlyt-info-value">{item.lecturerCode || '—'}</span>
              </div>
            </div>
          </div>
        ) : (
          //  Nếu SV đề xuất → hiện SV đề xuất + GV hướng dẫn (nếu có)
          <>
            <div className="qlyt-modal-info-box">
              <h4 className="qlyt-modal-label">👤 Sinh Viên Đề Xuất</h4>
              <div className="qlyt-modal-info-row">
                <div>
                  <span className="qlyt-info-label">Tên sinh viên</span>
                  <span className="qlyt-info-value">{item.student || '—'}</span>
                </div>
              </div>
            </div>

            <div className="qlyt-modal-info-box" style={{ marginTop: 12 }}>
              <h4 className="qlyt-modal-label">🎓 Giảng Viên Hướng Dẫn</h4>
              <div className="qlyt-modal-info-row">
                <div>
                  <span className="qlyt-info-label">Tên giảng viên</span>
                  <span className="qlyt-info-value">{item.lecturer}</span>
                </div>
                <div>
                  <span className="qlyt-info-label">Mã số giảng viên</span>
                  <span className="qlyt-info-value">{item.lecturerCode || '—'}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Nút khôi phục khi đã hủy */}
        {item.status === 'Hủy' && (
          <div className="qlyt-modal-footer">
            <button className="qlyt-restore-btn" onClick={() => setShowRestoreConfirm(true)}>
              🔄 Khôi phục
            </button>
          </div>
        )}

        {/* Nút duyệt/hủy khi chưa hủy */}
        {item.status !== 'Hủy' && (
          <div className="qlyt-modal-footer">
            <button className="qlyt-reject-btn" onClick={() => setShowRejectConfirm(true)}>Hủy</button>
            <button className="qlyt-approve-btn" onClick={() => setShowApproveConfirm(true)}>Duyệt</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuanLyYTuongModal;