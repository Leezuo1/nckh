import { useState, useEffect } from 'react';
import { Search, Trash2, User, GraduationCap, ChevronLeft, ChevronRight, Inbox, CheckCircle } from 'lucide-react';
import PopupxoaAdmin from '../../../components/Admin/PopupxoaAdmin';
import QuanLyYTuongModal from './QuanLyYTuongModal';
import topicService from '../../../services/topicService';
import { mapTopicStatus } from '../../../utils/mappers';
import './QuanLyYTuong.css';

const ITEMS_PER_PAGE = 9;

const QuanLyYTuong = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('Tất cả');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState(null);
  const [popupData, setPopupData] = useState({ show: false, id: null, title: '' });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    topicService.getIdeas()
      .then(ideas => {
        setData(ideas.map(t => {
          const supervisorParticipant = t.topicParticipant?.find(p => p.topicParticipantRole === 'Supervisor');
          const isLecturerSubmitter = t.submitter?.role === 'Lecturer';

          //  Nếu GV đề xuất → dùng submitter làm lecturer
          const lecturerName = supervisorParticipant?.user?.fullName
            || (isLecturerSubmitter ? t.submitter?.fullName : 'Chưa có');
          const lecturerCode = supervisorParticipant?.user?.userId
            || (isLecturerSubmitter ? t.submitter?.userId : '');

          return {
            id: t.id,
            title: t.topicName,
            status: mapTopicStatus(t.status),
            lecturer: lecturerName,
            lecturerCode: lecturerCode,
            //  Chỉ hiện SV nếu người đề xuất là SV
            student: !isLecturerSubmitter ? t.submitter?.fullName || '' : '',
            description: t.description || '',
            year: String(t.year),
            //  Lấy durationMonths thật
            duration: `${t.durationMonths || 6} tháng`,
            submitterRole: t.submitter?.role,
            _raw: t,
          };
        }));
      })
      .catch(err => console.error('Loi tai y tuong:', err))
      .finally(() => setLoading(false));
  }, []);

  const filteredData = data.filter(item => {
    const matchSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFilter = selectedFilter === 'Tất cả' || item.status === selectedFilter;
    return matchSearch && matchFilter;
  });

  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedFilter]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const currentItems = filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const showToastMessage = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleDelete = (id, title) => setPopupData({ show: true, id, title });

  const confirmDelete = async () => {
    try {
      await topicService.deleteTopic(popupData.id);
      setData(prev => prev.filter(item => item.id !== popupData.id));
      showToastMessage('Xóa thành công!');
    } catch (err) {
      showToastMessage('Lỗi: ' + err.message);
    }
    setPopupData({ show: false, id: null, title: '' });
  };

  const handleApprove = async (id) => {
    try {
      await topicService.assignIdea(id);
      setData(prev => prev.filter(item => item.id !== id));
      setSelectedItem(null);
      showToastMessage('Duyệt thành công!');
    } catch (err) {
      showToastMessage('Lỗi: ' + err.message);
    }
  };

  const handleReject = async (id) => {
    try {
      await topicService.updateTopic(id, { status: 'Cancelled' });
      setData(prev => prev.map(item =>
        item.id === id ? { ...item, status: 'Hủy' } : item
      ));
      setSelectedItem(prev => prev?.id === id ? { ...prev, status: 'Hủy' } : prev);
      showToastMessage('Đã hủy ý tưởng!');
    } catch (err) {
      showToastMessage('Lỗi: ' + err.message);
    }
  };

  const handleRestore = async (id) => {
    try {
      await topicService.updateTopic(id, { status: 'Pending' });
      setData(prev => prev.map(item =>
        item.id === id ? { ...item, status: 'Chờ xét duyệt' } : item
      ));
      setSelectedItem(prev => prev?.id === id ? { ...prev, status: 'Chờ xét duyệt' } : prev);
      showToastMessage('Đã khôi phục ý tưởng!');
    } catch (err) {
      showToastMessage('Lỗi: ' + err.message);
    }
  };

  const getPaginationRange = () => {
    const range = new Set();
    if (totalPages <= 1) return [1];
    range.add(1); range.add(currentPage);
    if (currentPage + 1 < totalPages) range.add(currentPage + 1);
    range.add(totalPages);
    const sorted = Array.from(range).sort((a, b) => a - b);
    const result = [];
    sorted.forEach((page, index) => {
      if (index > 0) {
        if (page - sorted[index - 1] === 2) result.push(sorted[index - 1] + 1);
        else if (page - sorted[index - 1] > 2) result.push('...');
      }
      result.push(page);
    });
    return result;
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>;

  return (
    <div className="qlyt-container">
      <div className={`qlyt-toast ${showToast ? 'show' : ''}`}>
        <CheckCircle size={18} />
        <span>{toastMessage}</span>
      </div>

      <div className="qlyt-header">
        <div className="qlyt-header-left">
          <h1 className="qlyt-title">Quản Lý Ý Tưởng</h1>
          <p className="qlyt-subtitle">{filteredData.length} ý tưởng trong hệ thống</p>
        </div>
        <div className="qlyt-header-right">
          <div className="qlyt-search-wrap">
            <Search size={15} className="qlyt-search-icon" />
            <input
              className="qlyt-search-input"
              placeholder="Tìm kiếm..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="qlyt-filter-group">
            {['Tất cả', 'Chờ xét duyệt', 'Hủy'].map(filter => (
              <button
                key={filter}
                className={`qlyt-filter-btn ${selectedFilter === filter ? 'active' : ''}`}
                onClick={() => setSelectedFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="qlyt-stats">
        <span><span className="qlyt-dot blue" />Tổng: <strong>{data.length}</strong></span>
        <span><span className="qlyt-dot orange" />Chờ xét duyệt: <strong>{data.filter(i => i.status === 'Chờ xét duyệt').length}</strong></span>
        <span><span className="qlyt-dot red" />Hủy: <strong>{data.filter(i => i.status === 'Hủy').length}</strong></span>
      </div>

      <div className="qlyt-grid">
        {currentItems.length > 0 ? currentItems.map(item => (
          <div key={item.id} className="qlyt-card" onClick={() => setSelectedItem(item)}>
            <div className="qlyt-card-top">
              <span className={`qlyt-badge ${item.status === 'Hủy' ? 'red' : 'orange'}`}>
                • {item.status}
              </span>
              <button
                className="qlyt-delete-btn"
                onClick={e => { e.stopPropagation(); handleDelete(item.id, item.title); }}
              >
                <Trash2 size={14} />
              </button>
            </div>
            <h3 className="qlyt-card-title">{item.title}</h3>
            {/*  Hiện đúng GV/SV theo người đề xuất */}
            <div className="qlyt-card-info">
              {item.submitterRole === 'Lecturer' ? (
                <>
                  <div className="qlyt-info-row"><GraduationCap size={14} /><span>{item.lecturer}</span></div>
                  <div className="qlyt-info-row"><User size={14} /><span>—</span></div>
                </>
              ) : (
                <>
                  <div className="qlyt-info-row"><GraduationCap size={14} /><span>{item.lecturer}</span></div>
                  <div className="qlyt-info-row"><User size={14} /><span>{item.student}</span></div>
                </>
              )}
            </div>
          </div>
        )) : (
          <div className="qlyt-empty"><Inbox size={40} /><p>Không có dữ liệu</p></div>
        )}
      </div>

      <div className="qlyt-footer">
        <span>
          Hiển thị {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredData.length)}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} trong {filteredData.length}
        </span>
        <div className="qlyt-pagination">
          <button className="qlyt-page-btn" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>
            <ChevronLeft size={16} />
          </button>
          {getPaginationRange().map((p, i) => (
            p === '...'
              ? <span key={i} className="qlyt-ellipsis">...</span>
              : <button key={i} className={`qlyt-page-btn ${currentPage === p ? 'active' : ''}`} onClick={() => setCurrentPage(p)}>{p}</button>
          ))}
          <button className="qlyt-page-btn" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {selectedItem && (
        <QuanLyYTuongModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onRestore={handleRestore}
        />
      )}

      <PopupxoaAdmin
        hienThi={popupData.show}
        tenMucXoa={popupData.title}
        onDong={() => setPopupData({ show: false, id: null, title: '' })}
        onXacNhan={confirmDelete}
      />
    </div>
  );
};

export default QuanLyYTuong;