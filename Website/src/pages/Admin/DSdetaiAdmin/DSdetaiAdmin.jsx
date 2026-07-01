import React, { useState, useEffect, useRef } from 'react';
import './DSdetaiAdmin.css';
import PopupxoaAdmin from '../../../components/Admin/PopupxoaAdmin';
import TopicViewModal from '../../../components/TopicViewModal/TopicViewModal';
import topicService from '../../../services/topicService';
import { mapTopicStatus } from '../../../utils/mappers';
import { Search, Trash2, GraduationCap, User, ChevronLeft, ChevronRight, Inbox, CheckCircle, Undo2, ArrowRight, Clock, X, ChevronDown, Calendar } from 'lucide-react';

// ===== Helpers ngày tháng cho cột THỜI GIAN =====
// ISO → 'yyyy-mm-dd' (theo giờ địa phương) để đổ vào <input type="date">
const toInputDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};
// ISO → 'dd/mm/yyyy' để hiển thị
const fmtNgay = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('vi-VN');
};
// Số tháng ước lượng giữa 2 mốc (dùng cho dòng tóm tắt)
const soThangGiua = (start, end) => {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!(ms > 0)) return 0;
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24 * 30.44)));
};

// Màu badge theo trạng thái thực (rawStatus) + cờ Trễ
const badgeClass = (dt) => {
  if (dt.isLate) return 'do';
  switch (dt.rawStatus) {
    case 'WaitingToStart': return 'xam';
    case 'InProgress': return 'duong';
    case 'Reporting':
    case 'Editing': return 'vang';
    case 'Done': return 'xanh';
    case 'Cancelled': return 'do';
    case 'Pending': return 'cam';
    default: return 'xam';
  }
};

// Các trạng thái để lọc (trang đề tài = topic đã assign)
const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'WaitingToStart', label: 'Chờ bắt đầu' },
  { value: 'InProgress', label: 'Đang thực hiện' },
  { value: 'Late', label: 'Trễ' },
  { value: 'Reporting', label: 'Báo Cáo' },
  { value: 'Editing', label: 'Chỉnh Sửa' },
  { value: 'Done', label: 'Nghiệm Thu' },
  { value: 'Cancelled', label: 'Hủy' },
];

// Dropdown lọc tự code (adapt từ OrderManagement, viết lại bằng JSX)
const LocDropdown = ({ value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);
  const selected = options.find(o => o.value === value) || options[0];
  return (
    <div className="ds-dropdown" ref={ref}>
      <div className={`ds-dropdown-trigger ${open ? 'active' : ''}`} onClick={() => setOpen(!open)}>
        <span>{selected.label}</span>
        <ChevronDown size={16} className={`ds-dropdown-arrow ${open ? 'open' : ''}`} />
      </div>
      {open && (
        <div className="ds-dropdown-options">
          {options.map(o => (
            <div
              key={o.value}
              className={`ds-dropdown-option ${value === o.value ? 'selected' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false); }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const DSdetaiAdmin = () => {
  const [danhSachGoc, setDanhSachGoc] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;
  const [popupData, setPopupData] = useState({ hienThi: false, id: null, tenDeTai: "" });
  const [hienThongBao, setHienThongBao] = useState(false);
  const [toastMsg, setToastMsg] = useState("Xóa thành công!");

  // ===== Chọn nhiều + Proceed/Undo =====
  const [selectedIds, setSelectedIds] = useState([]);
  const [dangXuLy, setDangXuLy] = useState(false);
  const [editModal, setEditModal] = useState({ open: false, reportingIds: [], proceedableIds: [] });
  const [editDeadline, setEditDeadline] = useState("");
  const [selectedTopic, setSelectedTopic] = useState(null);
  // Modal chỉnh khoảng thời gian thực hiện (từ ngày → đến ngày)
  const [timeModal, setTimeModal] = useState({ open: false, id: null, tieuDe: "", start: "", end: "" });
  // Modal đặt lịch bắt đầu HÀNG LOẠT (cho đề tài "Chờ bắt đầu")
  const [startModal, setStartModal] = useState({ open: false, ids: [] });
  const [startRange, setStartRange] = useState({ start: "", end: "" });

  const taiDanhSach = () => {
    return topicService.getTopics()
      .then(data => {
        setDanhSachGoc(data.map(t => {
          const supervisor = t.topicParticipant?.find(p => p.topicParticipantRole === 'Supervisor');
          const leader = t.topicParticipant?.find(p => p.topicParticipantRole === 'Leader');
          return {
            id: t.id,
            rawStatus: t.status,
            isLate: !!t.isLate,
            trangThai: t.isLate ? mapTopicStatus('Late') : mapTopicStatus(t.status),
            deadline: t.deadline,
            startDate: t.startDate || null,
            tieuDe: t.topicName,
            giangVien: supervisor?.user?.fullName || 'Chưa phân công',
            sinhVien: leader?.user?.fullName || t.submitter?.fullName || '',
            noiBat: t.progress > 50,
            _raw: t,
          };
        }));
      });
  };

  useEffect(() => {
    taiDanhSach()
      .catch(err => console.error('Loi tai de tai:', err))
      .finally(() => setLoading(false));
  }, []);

  const hienToast = (msg) => {
    setToastMsg(msg);
    setHienThongBao(true);
    setTimeout(() => setHienThongBao(false), 3000);
  };

  const filteredDeTai = danhSachGoc.filter((dt) => {
    const matchSearch = dt.tieuDe.toLowerCase().includes(searchTerm.toLowerCase());

    // Lọc trạng thái: "Late" = đang Trễ; còn lại so theo rawStatus (loại Trễ ra khỏi "Đang thực hiện")
    let matchStatus = true;
    if (selectedStatus === 'Late') matchStatus = dt.isLate;
    else if (selectedStatus !== 'all') matchStatus = dt.rawStatus === selectedStatus && !dt.isLate;

    // Lọc theo khoảng deadline
    let matchDate = true;
    if (fromDate && dt.deadline) matchDate = new Date(dt.deadline) >= new Date(fromDate);
    if (toDate && dt.deadline) {
      const end = new Date(toDate); end.setHours(23, 59, 59, 999);
      matchDate = matchDate && new Date(dt.deadline) <= end;
    }
    if ((fromDate || toDate) && !dt.deadline) matchDate = false;

    return matchSearch && matchStatus && matchDate;
  });

  const coLoc = selectedStatus !== 'all' || fromDate || toDate;
  const xoaLoc = () => { setSelectedStatus('all'); setFromDate(''); setToDate(''); };

  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedStatus, fromDate, toDate]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredDeTai.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredDeTai.length / itemsPerPage);

  // ===== Chọn nhiều =====
  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  // Đề tài đã hủy (Cancelled) không cho chọn → loại khỏi "chọn tất cả" và các thao tác hàng loạt
  const pageIds = currentItems.filter(i => i.rawStatus !== 'Cancelled').map(i => i.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id));
  const toggleSelectAll = () => {
    setSelectedIds(allPageSelected
      ? selectedIds.filter(id => !pageIds.includes(id))
      : [...new Set([...selectedIds, ...pageIds])]);
  };

  // ===== Proceed / Undo =====
  const runProceed = async (ids) => {
    setDangXuLy(true);
    try {
      await topicService.proceedTopics(ids);
      await taiDanhSach();
      setSelectedIds([]);
      hienToast("Đã đẩy trạng thái!");
    } catch (err) {
      console.error('Loi proceed:', err);
    } finally { setDangXuLy(false); }
  };

  const handleProceed = () => {
    if (!selectedIds.length || dangXuLy) return;
    const selected = danhSachGoc.filter(d => selectedIds.includes(d.id));
    const reportingIds = selected.filter(d => d.rawStatus === 'Reporting').map(d => d.id);
    const proceedableIds = selected.filter(d => ['WaitingToStart', 'InProgress'].includes(d.rawStatus)).map(d => d.id);
    // Có đề tài đang Báo Cáo → mở modal set thời gian Chỉnh Sửa
    if (reportingIds.length) {
      setEditModal({ open: true, reportingIds, proceedableIds });
      return;
    }
    if (!proceedableIds.length) {
      hienToast("Không có đề tài nào có thể đẩy!");
      return;
    }
    runProceed(proceedableIds);
  };

  const confirmEditing = async () => {
    if (!editDeadline) return;
    setDangXuLy(true);
    try {
      await topicService.startEditing(editModal.reportingIds, new Date(editDeadline).toISOString());
      if (editModal.proceedableIds.length) {
        await topicService.proceedTopics(editModal.proceedableIds);
      }
      await taiDanhSach();
      setSelectedIds([]);
      setEditModal({ open: false, reportingIds: [], proceedableIds: [] });
      setEditDeadline("");
      hienToast("Đã mở chỉnh sửa!");
    } catch (err) {
      console.error('Loi start-editing:', err);
    } finally { setDangXuLy(false); }
  };

  // ===== Đặt lịch bắt đầu hàng loạt =====
  const handleOpenScheduleStart = () => {
    if (!selectedIds.length || dangXuLy) return;
    const ids = danhSachGoc
      .filter(d => selectedIds.includes(d.id) && d.rawStatus === 'WaitingToStart')
      .map(d => d.id);
    if (!ids.length) {
      hienToast('Chỉ áp dụng cho đề tài đang "Chờ bắt đầu"!');
      return;
    }
    setStartRange({ start: "", end: "" });
    setStartModal({ open: true, ids });
  };

  const confirmScheduleStart = async () => {
    if (!startRange.start) { hienToast("Vui lòng chọn ngày bắt đầu"); return; }
    if (startRange.end && new Date(startRange.end) <= new Date(startRange.start)) {
      hienToast("Ngày kết thúc phải sau ngày bắt đầu"); return;
    }
    setDangXuLy(true);
    try {
      const startISO = new Date(`${startRange.start}T00:00:00`).toISOString();
      const endISO = startRange.end ? new Date(`${startRange.end}T23:59:59`).toISOString() : undefined;
      await topicService.scheduleStart(startModal.ids, startISO, endISO);
      await taiDanhSach();
      setSelectedIds([]);
      setStartModal({ open: false, ids: [] });
      hienToast("Đã đặt lịch bắt đầu!");
    } catch (err) {
      console.error('Loi schedule-start:', err);
    } finally { setDangXuLy(false); }
  };

  const handleUndo = async () => {
    if (!selectedIds.length || dangXuLy) return;
    setDangXuLy(true);
    try {
      await topicService.undoTopics(selectedIds);
      await taiDanhSach();
      setSelectedIds([]);
      hienToast("Đã hoàn tác!");
    } catch (err) {
      console.error('Loi undo:', err);
    } finally { setDangXuLy(false); }
  };

  // Admin chỉnh khoảng thời gian thực hiện (từ ngày → đến ngày)
  const openTimeModal = (dt) => {
    setTimeModal({
      open: true,
      id: dt.id,
      tieuDe: dt.tieuDe,
      start: toInputDate(dt.startDate),
      end: toInputDate(dt.deadline),
    });
  };
  const closeTimeModal = () => setTimeModal({ open: false, id: null, tieuDe: "", start: "", end: "" });

  const saveTimeRange = async () => {
    const { id, start, end } = timeModal;
    if (!end) { hienToast("Vui lòng chọn ngày kết thúc"); return; }
    if (start && new Date(end) < new Date(start)) {
      hienToast("Ngày kết thúc phải sau ngày bắt đầu"); return;
    }
    setDangXuLy(true);
    try {
      const payload = { deadline: new Date(`${end}T23:59:59`).toISOString() };
      if (start) payload.startDate = new Date(`${start}T00:00:00`).toISOString();
      await topicService.updateTopic(id, payload);
      await taiDanhSach();
      closeTimeModal();
      hienToast("Đã cập nhật thời gian!");
    } catch (err) {
      console.error('Loi cap nhat thoi gian:', err);
      // Toast lỗi tự hiện qua axios interceptor
    } finally { setDangXuLy(false); }
  };

  const moPopupXoa = (id, tieuDe) => {
    setPopupData({ hienThi: true, id, tenDeTai: tieuDe });
  };

  const xacNhanXoa = async () => {
    try {
      await topicService.deleteTopic(popupData.id);
      setDanhSachGoc(prev => prev.filter(item => item.id !== popupData.id));
      setSelectedIds(prev => prev.filter(id => id !== popupData.id));
      setPopupData({ ...popupData, hienThi: false });
      hienToast("Xóa thành công!");
    } catch (err) {
      console.error('Loi xoa:', err);
      setPopupData({ ...popupData, hienThi: false });
      // Toast tự hiện qua axios interceptor
    }
  };

  const getPaginationRange = () => {
    const range = new Set();
    if (totalPages <= 1) return [1];
    range.add(1); range.add(currentPage);
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
    <div className="khung-quan-ly-detai">
      <div className={`thong-bao-thanh-cong ${hienThongBao ? 'hien-ra' : ''}`}>
        <div className="noi-dung-toast">
          <CheckCircle size={18} className="icon-check" />
          <span>{toastMsg}</span>
        </div>
      </div>

      <header className="dau-trang-ds">
        <div className="tieu-de-trai">
          <h1>Danh Sách Đề Tài</h1>
          <p>{filteredDeTai.length} đề tài phù hợp</p>
        </div>
        <div className="thanh-cong-cu-phai">
          <div className="o-tim-kiem">
            <Search size={16} className="icon-search" />
            <input type="text" placeholder="Tìm kiếm..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <LocDropdown value={selectedStatus} options={STATUS_OPTIONS} onChange={setSelectedStatus} />

          <input
            type="date"
            className="o-loc-ngay"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            title="Từ ngày (hạn)"
          />
          <span className="gach-ngay">–</span>
          <input
            type="date"
            className="o-loc-ngay"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            title="Đến ngày (hạn)"
          />

          {coLoc && (
            <button className="nut-xoa-loc" onClick={xoaLoc}>Xoá lọc</button>
          )}
        </div>
      </header>

      <div className="thanh-tien-trinh">
        <div className="thong-ke-nhanh">
          <span>● Tổng hệ thống: <strong>{danhSachGoc.length}</strong></span>
          <span>● Kết quả hiển thị: <strong>{filteredDeTai.length}</strong></span>
        </div>
        <div className="nhom-nut-tien-trinh">
          {selectedIds.length > 0 && <span className="so-da-chon">Đã chọn {selectedIds.length}</span>}
          <button className="nut-undo" onClick={handleOpenScheduleStart} disabled={!selectedIds.length || dangXuLy}>
            <Calendar size={16} /> Đặt lịch bắt đầu
          </button>
          <button className="nut-undo" onClick={handleUndo} disabled={!selectedIds.length || dangXuLy}>
            <Undo2 size={16} /> Undo
          </button>
          <button className="nut-proceed" onClick={handleProceed} disabled={!selectedIds.length || dangXuLy}>
            Proceed <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <div className="vung-chua-bang-detai">
        <div className="khung-bang-du-lieu">
          <table className="bang-nguoi-dung bang-de-tai">
            <thead>
              <tr>
                <th className="cot-chon">
                  <input
                    type="checkbox"
                    className="chon-de-tai"
                    checked={allPageSelected}
                    onChange={toggleSelectAll}
                    title="Chọn tất cả"
                  />
                </th>
                <th>TÊN ĐỀ TÀI</th>
                <th>GIẢNG VIÊN</th>
                <th>CHỦ NHIỆM ĐỀ TÀI</th>
                <th>TRẠNG THÁI</th>
                <th>THỜI GIAN</th>
                <th>NỔI BẬT</th>
                <th className="cot-hanh-dong-head">HÀNH ĐỘNG</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length > 0 ? (
                currentItems.map((dt) => (
                  <tr
                    key={`${dt.id}-${currentPage}`}
                    className={`dong-co-the-click ${selectedIds.includes(dt.id) ? 'dong-da-chon' : ''}`}
                    onClick={() => setSelectedTopic(dt._raw)}
                  >
                    <td className="cot-chon" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="chon-de-tai"
                        checked={selectedIds.includes(dt.id)}
                        onChange={() => toggleSelect(dt.id)}
                        disabled={dt.rawStatus === 'Cancelled'}
                      />
                    </td>
                    <td className="cot-ten-de-tai">{dt.tieuDe}</td>
                    <td className="cot-nhan-su">
                      <GraduationCap size={14} /> <span>{dt.giangVien}</span>
                    </td>
                    <td className="cot-nhan-su">
                      <User size={14} /> <span>{dt.sinhVien || '—'}</span>
                    </td>
                    <td>
                      <span className={`badge-trang-thai ${badgeClass(dt)}`}>
                        {dt.trangThai}
                      </span>
                    </td>
                    <td className="cot-thoi-gian" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="o-thoi-gian-box"
                        onClick={() => openTimeModal(dt)}
                        disabled={dt.rawStatus === 'Cancelled'}
                        title={dt.rawStatus === 'Cancelled' ? 'Đề tài đã hủy' : 'Chỉnh thời gian thực hiện (từ ngày → đến ngày)'}
                      >
                        <Calendar size={13} />
                        {dt.deadline ? (
                          <span className="tg-text">
                            {dt.startDate ? `${fmtNgay(dt.startDate)} → ${fmtNgay(dt.deadline)}` : fmtNgay(dt.deadline)}
                          </span>
                        ) : (
                          <span className="tg-chua-dat">Đặt thời gian</span>
                        )}
                      </button>
                    </td>
                    <td className="cot-noi-bat" onClick={(e) => e.stopPropagation()}>
                      {dt.rawStatus !== 'Cancelled' ? (
                        <label className="nut-gat-noi-bat">
                          <input type="checkbox" defaultChecked={dt.noiBat} />
                          <span className="thanh-truot"></span>
                        </label>
                      ) : (
                        <span className="gach-ngang">—</span>
                      )}
                    </td>
                    <td className="cot-hanh-dong" onClick={(e) => e.stopPropagation()}>
                      <button className="nut-xoa" onClick={() => moPopupXoa(dt.id, dt.tieuDe)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8}>
                    <div className="thong-bao-trong"><Inbox size={40} /><p>Trống trơn...</p></div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="chan-trang-ds">
        <p>Hiển thị {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredDeTai.length)} trong {filteredDeTai.length}</p>
        <div className="phan-trang">
          <button className="nut-chuyen-trang" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}><ChevronLeft size={18} /></button>
          {getPaginationRange().map((p, i) => (
            p === '...' ? <span key={i} className="dau-ba-cham">...</span> :
            <button key={i} className={`nut-so-trang ${currentPage === p ? 'active' : ''}`} onClick={() => setCurrentPage(p)}>{p}</button>
          ))}
          <button className="nut-chuyen-trang" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}><ChevronRight size={18} /></button>
        </div>
      </footer>

      {/* Modal set thời gian Chỉnh Sửa (khi Proceed từ Báo Cáo) */}
      {editModal.open && (
        <div className="lop-phu-modal" onClick={() => setEditModal({ open: false, reportingIds: [], proceedableIds: [] })}>
          <div className="hop-modal-chinh-sua" onClick={(e) => e.stopPropagation()}>
            <div className="dau-modal">
              <h3><Clock size={18} /> Mở Chỉnh Sửa</h3>
              <button className="nut-dong-modal" onClick={() => setEditModal({ open: false, reportingIds: [], proceedableIds: [] })}><X size={18} /></button>
            </div>
            <p className="mo-ta-modal">Các đề tài sẽ được mở để chỉnh sửa đến hết thời gian dưới đây, sau đó tự động chuyển sang <strong>Nghiệm Thu</strong>:</p>
            <ul className="ds-de-tai-modal">
              {danhSachGoc.filter(d => editModal.reportingIds.includes(d.id)).map(d => (
                <li key={d.id}>{d.tieuDe}</li>
              ))}
            </ul>
            <label className="nhan-thoi-gian">Thời gian cho phép chỉnh sửa đến:</label>
            <input
              type="datetime-local"
              className="o-nhap-thoi-gian"
              value={editDeadline}
              onChange={(e) => setEditDeadline(e.target.value)}
            />
            <div className="nhom-nut-modal">
              <button className="nut-huy-modal" onClick={() => setEditModal({ open: false, reportingIds: [], proceedableIds: [] })}>Hủy</button>
              <button className="nut-xac-nhan-modal" onClick={confirmEditing} disabled={!editDeadline || dangXuLy}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal chỉnh khoảng thời gian thực hiện (từ ngày → đến ngày) */}
      {timeModal.open && (
        <div className="lop-phu-modal" onClick={closeTimeModal}>
          <div className="hop-modal-chinh-sua" onClick={(e) => e.stopPropagation()}>
            <div className="dau-modal">
              <h3><Calendar size={18} /> Thời gian thực hiện</h3>
              <button className="nut-dong-modal" onClick={closeTimeModal}><X size={18} /></button>
            </div>
            <p className="mo-ta-modal">
              Chọn ngày bắt đầu và ngày kết thúc cho đề tài <strong>{timeModal.tieuDe}</strong>.
            </p>
            <div className="hang-2-ngay">
              <div>
                <label className="nhan-thoi-gian">Từ ngày (bắt đầu)</label>
                <input
                  type="date"
                  className="o-nhap-thoi-gian"
                  value={timeModal.start}
                  max={timeModal.end || undefined}
                  onChange={(e) => setTimeModal(p => ({ ...p, start: e.target.value }))}
                />
              </div>
              <div>
                <label className="nhan-thoi-gian">Đến ngày (kết thúc)</label>
                <input
                  type="date"
                  className="o-nhap-thoi-gian"
                  value={timeModal.end}
                  min={timeModal.start || undefined}
                  onChange={(e) => setTimeModal(p => ({ ...p, end: e.target.value }))}
                />
              </div>
            </div>
            {timeModal.start && timeModal.end && soThangGiua(timeModal.start, timeModal.end) > 0 && (
              <p className="tg-tom-tat">Thời lượng: ~{soThangGiua(timeModal.start, timeModal.end)} tháng</p>
            )}
            <div className="nhom-nut-modal">
              <button className="nut-huy-modal" onClick={closeTimeModal}>Hủy</button>
              <button className="nut-xac-nhan-modal" onClick={saveTimeRange} disabled={!timeModal.end || dangXuLy}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal đặt lịch bắt đầu hàng loạt (cho đề tài "Chờ bắt đầu") */}
      {startModal.open && (
        <div className="lop-phu-modal" onClick={() => setStartModal({ open: false, ids: [] })}>
          <div className="hop-modal-chinh-sua" onClick={(e) => e.stopPropagation()}>
            <div className="dau-modal">
              <h3><Calendar size={18} /> Đặt lịch bắt đầu hàng loạt</h3>
              <button className="nut-dong-modal" onClick={() => setStartModal({ open: false, ids: [] })}><X size={18} /></button>
            </div>
            <p className="mo-ta-modal">
              Áp dụng cho <strong>{startModal.ids.length}</strong> đề tài đang "Chờ bắt đầu". Khi tới ngày bắt đầu, đề tài sẽ tự chuyển sang <strong>Đang thực hiện</strong>.
            </p>
            <ul className="ds-de-tai-modal">
              {danhSachGoc.filter(d => startModal.ids.includes(d.id)).map(d => (
                <li key={d.id}>{d.tieuDe}</li>
              ))}
            </ul>
            <div className="hang-2-ngay">
              <div>
                <label className="nhan-thoi-gian">Ngày bắt đầu</label>
                <input
                  type="date"
                  className="o-nhap-thoi-gian"
                  value={startRange.start}
                  max={startRange.end || undefined}
                  onChange={(e) => setStartRange(p => ({ ...p, start: e.target.value }))}
                />
              </div>
              <div>
                <label className="nhan-thoi-gian">Ngày kết thúc (tuỳ chọn)</label>
                <input
                  type="date"
                  className="o-nhap-thoi-gian"
                  value={startRange.end}
                  min={startRange.start || undefined}
                  onChange={(e) => setStartRange(p => ({ ...p, end: e.target.value }))}
                />
              </div>
            </div>
            <p className="tg-tom-tat">Bỏ trống ngày kết thúc → hệ thống tự tính theo thời lượng của từng đề tài.</p>
            <div className="nhom-nut-modal">
              <button className="nut-huy-modal" onClick={() => setStartModal({ open: false, ids: [] })}>Hủy</button>
              <button className="nut-xac-nhan-modal" onClick={confirmScheduleStart} disabled={!startRange.start || dangXuLy}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      <PopupxoaAdmin
        hienThi={popupData.hienThi}
        tenMucXoa={popupData.tenDeTai}
        onDong={() => setPopupData({ ...popupData, hienThi: false })}
        onXacNhan={xacNhanXoa}
      />

      {/* Modal xem chi tiết đề tài (read-only) — giống trang User */}
      {selectedTopic && (
        <TopicViewModal
          topic={selectedTopic}
          onClose={() => setSelectedTopic(null)}
        />
      )}
    </div>
  );
};

export default DSdetaiAdmin;
