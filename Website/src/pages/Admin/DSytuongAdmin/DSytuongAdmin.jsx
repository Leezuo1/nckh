import React, { useState, useEffect } from 'react';
import './DSytuongAdmin.css';
import PopupxoaAdmin from '../../../components/Admin/PopupxoaAdmin';
import IdeaDetailModal from '../../../components/IdeaDetailModal/IdeaDetailModal';
import topicService from '../../../services/topicService';
import toast, { Toaster } from 'react-hot-toast';
import {
  Search,
  Trash2,
  User,
  ChevronLeft,
  ChevronRight,
  Inbox,
  CheckCircle,
} from 'lucide-react';

const DSytuongAdmin = () => {
  const [danhSachYTuong, setDanhSachYTuong] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("Tất cả");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;
  const [popupData, setPopupData] = useState({ hienThi: false, id: null, tenDeTai: "" });
  const [hienThongBao, setHienThongBao] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);

  const loadData = () => {
    setLoading(true);
    topicService.getIdeas({ onlyApproved: true })
      .then(data => {
        setDanhSachYTuong(data.map(t => {
          const pendingMembers = t.topicParticipant?.filter(p => p.topicParticipantRole === 'PendingMember') || [];
          const requester = pendingMembers[0];
          return {
            id: t.id,
            trangThai: pendingMembers.length > 0 ? 'Chờ Assign' : 'Chưa Assign',
            tieuDe: t.topicName,
            nguoiDang: t.submitter?.fullName || 'Người dùng',
            pendingMembers,
            requesterId: requester?.userId,
            requesterName: requester?.user?.fullName,
            _raw: t,
          };
        }));
      })
      .catch(err => console.error('Loi tai y tuong:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const filteredYTuong = danhSachYTuong.filter((dt) => {
    const matchSearch = dt.tieuDe.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFilter =
      selectedFilter === "Tất cả" ||
      (selectedFilter === "Chờ Assign" && dt.trangThai === "Chờ Assign") ||
      (selectedFilter === "Chưa Assign" && dt.trangThai === "Chưa Assign");
    return matchSearch && matchFilter;
  });

  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedFilter]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredYTuong.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredYTuong.length / itemsPerPage);

  const moPopupXoa = (id, tieuDe) => {
    setPopupData({ hienThi: true, id, tenDeTai: tieuDe });
  };

  const xacNhanXoa = async () => {
    try {
      await topicService.deleteTopic(popupData.id);
      setDanhSachYTuong(prev => prev.filter(item => item.id !== popupData.id));
      setPopupData({ ...popupData, hienThi: false });
      setHienThongBao(true);
      setTimeout(() => setHienThongBao(false), 3000);
    } catch (err) {
      console.error('Loi xoa:', err);
      setPopupData({ ...popupData, hienThi: false });
    }
  };

  const handleRespond = async (dt, accept) => {
    if (!dt.requesterId) return;
    try {
      await topicService.respondAssign(dt.id, dt.requesterId, accept);
      toast.success(accept ? 'Đã duyệt assign' : 'Đã từ chối assign');
      loadData();
    } catch (err) { /* toast tự hiện */ }
  };

  const getPaginationRange = () => {
    const range = new Set();
    if (totalPages <= 1) return [1];
    range.add(1);
    range.add(currentPage);
    if (currentPage + 1 < totalPages) range.add(currentPage + 1);
    range.add(totalPages);
    const sortedRange = Array.from(range).sort((a, b) => a - b);
    const rangeWithDots = [];
    sortedRange.forEach((page, index) => {
      if (index > 0) {
        if (page - sortedRange[index - 1] === 2) rangeWithDots.push(sortedRange[index - 1] + 1);
        else if (page - sortedRange[index - 1] > 2) rangeWithDots.push('...');
      }
      rangeWithDots.push(page);
    });
    return rangeWithDots;
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>;

  return (
    <div className="khung-quan-ly-ytuong">
      <Toaster position="top-right" />
      <div className={`thong-bao-thanh-cong ${hienThongBao ? 'hien-ra' : ''}`}>
        <div className="noi-dung-toast">
          <CheckCircle size={18} className="icon-check" />
          <span>Xóa thành công!</span>
        </div>
      </div>

      <header className="dau-trang-ytuong">
        <div className="tieu-de-trai">
          <h1>Danh Sách Ý Tưởng Đề Tài</h1>
          <p>{filteredYTuong.length} ý tưởng đã duyệt</p>
        </div>
        <div className="thanh-cong-cu-phai">
          <div className="o-tim-kiem-ytuong">
            <Search size={16} className="icon-search" />
            <input
              type="text"
              placeholder="Tìm kiếm ý tưởng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="nhom-nut-loc">
            {["Tất cả", "Chưa Assign", "Chờ Assign"].map(filter => (
              <button
                key={filter}
                className={`nut-loc ${selectedFilter === filter ? 'kich-hoat' : ''}`}
                onClick={() => setSelectedFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="thong-ke-ytuong">
        <span><span className="dot xanh-duong"></span> Tổng: <strong>{danhSachYTuong.length}</strong></span>
        <span><span className="dot xam"></span> Chưa Assign: <strong>{danhSachYTuong.filter(i => i.trangThai === "Chưa Assign").length}</strong></span>
        <span><span className="dot do"></span> Chờ Assign: <strong>{danhSachYTuong.filter(i => i.trangThai === "Chờ Assign").length}</strong></span>
      </div>

      <div className="luoi-danh-sach-ytuong">
        {currentItems.length > 0 ? (
          currentItems.map((dt, index) => (
            <div
              className="the-y-tuong hieu-ung-roi-ytuong"
              key={`${dt.id}-${currentPage}`}
              style={{ animationDelay: `${index * 0.05}s`, cursor: 'pointer' }}
              onClick={() => setSelectedTopic(dt._raw)}
            >
              <div className="dong-dau-the">
                <span className={`badge-ytuong ${dt.trangThai === 'Chờ Assign' ? 'do' : 'xam'}`}>
                  ● {dt.trangThai}
                </span>
                <button
                  className="nut-xoa-rac-ytuong"
                  onClick={(e) => { e.stopPropagation(); moPopupXoa(dt.id, dt.tieuDe); }}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <h3 className="tieu-de-y-tuong">{dt.tieuDe}</h3>

              <div className="thong-tin-nguoi-dang">
                <p className="label-nguoi-dang">Người đăng</p>
                <div className="dong-user"><User size={14} /> <span>{dt.nguoiDang}</span></div>
              </div>

              {dt.trangThai === 'Chờ Assign' && (
                <div
                  style={{ marginTop: 10, padding: 10, background: '#fff3cd', borderRadius: 8 }}
                  onClick={e => e.stopPropagation()}
                >
                  <p style={{ fontSize: 12, margin: '0 0 8px', color: '#856404' }}>
                    <b>{dt.requesterName}</b> xin assign ({dt.pendingMembers.length} thành viên)
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRespond(dt, true); }}
                      style={{ flex: 1, padding: '6px', background: '#28a745', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Duyệt
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRespond(dt, false); }}
                      style={{ flex: 1, padding: '6px', background: '#dc3545', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Từ chối
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="thong-bao-trong"><Inbox size={40} /><p>Không có ý tưởng nào...</p></div>
        )}
      </div>

      <footer className="chan-trang-ds">
        <p>Hiển thị {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredYTuong.length)} trong {filteredYTuong.length}</p>
        <div className="phan-trang">
          <button className="nut-chuyen-trang" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
            <ChevronLeft size={18} />
          </button>
          {getPaginationRange().map((p, i) => (
            p === '...'
              ? <span key={i} className="dau-ba-cham">...</span>
              : <button key={i} className={`nut-so-trang ${currentPage === p ? 'active' : ''}`} onClick={() => setCurrentPage(p)}>{p}</button>
          ))}
          <button className="nut-chuyen-trang" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>
            <ChevronRight size={18} />
          </button>
        </div>
      </footer>

      {/* Modal xem chi tiết */}
     {selectedTopic && (
  <IdeaDetailModal
    idea={selectedTopic}
    onClose={() => setSelectedTopic(null)}
  />
)}

      <PopupxoaAdmin
        hienThi={popupData.hienThi}
        tenMucXoa={popupData.tenDeTai}
        onDong={() => setPopupData({ ...popupData, hienThi: false })}
        onXacNhan={xacNhanXoa}
      />
    </div>
  );
};

export default DSytuongAdmin;