import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { BarChart2, Globe, BookOpen, CheckCircle, Upload, Activity } from 'lucide-react';
import activityService from '../../../services/activityService';
import './Setting.css';

const Setting = () => {
  // Đọc stats từ localStorage khi khởi tạo
  const [stats, setStats] = useState(() => {
    const saved = localStorage.getItem('setting_stats');
    return saved ? JSON.parse(saved) : {
      topics: 'N+',
      lecturers: 'N+',
      students: 'N+',
    };
  });

  // Đọc identity từ localStorage khi khởi tạo
  const [identity, setIdentity] = useState(() => {
    const saved = localStorage.getItem('setting_identity');
    return saved ? JSON.parse(saved) : {
      title: 'NCKH Research Management System',
      description: 'Nền tảng quản lý nghiên cứu khoa học dành cho sinh viên và giảng viên — từ ý tưởng đến đề tài hoàn chỉnh.',
      logo: null,
    };
  });

  // Đọc navDesc từ localStorage khi khởi tạo
  const [navDesc, setNavDesc] = useState(() => {
    const saved = localStorage.getItem('setting_nav');
    return saved ? JSON.parse(saved) : {
      topicList: 'Xem toàn bộ đề tài nghiên cứu khoa học đang triển khai, theo dõi tiến độ và kết quả từng nhóm.',
      ideaList: 'Tổng hợp các ý tưởng nghiên cứu được đề xuất, đánh giá và bình chọn từ cộng đồng sinh viên.',
      register: 'Chia sẻ ý tưởng nghiên cứu của bạn, nhận phản hồi từ giảng viên và bắt đầu hành trình NCKH.',
    };
  });

  // ===== Lịch sử hoạt động (lazy-loading, cửa sổ trượt tối đa 100) =====
  const PAGE_SIZE = 20;
  const MAX_WINDOW = 100;
  const SCROLL_GAP = 8; // = gap (px) giữa các item, dùng để bù scroll khi cắt bớt
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  // 'recent24' (mặc định): chỉ 24h, mới→cũ · 'newest': tất cả, mới→cũ · 'oldest': tất cả, cũ→mới
  const [sortMode, setSortMode] = useState('recent24');
  // Khoảng ngày tuỳ chọn (yyyy-mm-dd). Khi có → bỏ lọc 24h, lọc đúng khoảng này.
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const fetchedRef = useRef(0);        // tổng item đã fetch = offset cho lần fetch kế
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const scrollBoxRef = useRef(null);
  const trimAdjustRef = useRef(0);     // px cần bù scrollTop sau khi cắt item ở đầu cửa sổ

  const buildParams = useCallback((skip) => {
    const params = {
      skip,
      take: PAGE_SIZE,
      order: sortMode === 'oldest' ? 'asc' : 'desc',
    };
    if (dateFrom || dateTo) {
      // Có khoảng ngày tường minh → ưu tiên, bỏ lọc 24h
      if (dateFrom) params.from = new Date(`${dateFrom}T00:00:00`).toISOString();
      if (dateTo) params.to = new Date(`${dateTo}T23:59:59`).toISOString();
    } else if (sortMode === 'recent24') {
      params.within24h = true;
    }
    return params;
  }, [sortMode, dateFrom, dateTo]);

  // Tải trang đầu — chạy lúc mount & mỗi khi đổi sort/khoảng ngày
  useEffect(() => {
    let alive = true;
    fetchedRef.current = 0;
    activityService.getAll(buildParams(0))
      .then(data => {
        if (!alive) return;
        setActivities(data);
        fetchedRef.current = data.length;
        const more = data.length === PAGE_SIZE;
        setHasMore(more);
        hasMoreRef.current = more;
      })
      .catch(err => console.error('Loi tai activities:', err))
      .finally(() => { if (alive) setLoadingActivities(false); });
    return () => { alive = false; };
  }, [buildParams]);

  // Nạp thêm khi scroll gần đáy — cửa sổ trượt: thêm 20 mới, cắt bớt ở đầu nếu vượt 100
  const loadMore = useCallback(() => {
    if (loadingMoreRef.current || !hasMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    activityService.getAll(buildParams(fetchedRef.current))
      .then(data => {
        fetchedRef.current += data.length;
        const more = data.length === PAGE_SIZE;
        setHasMore(more);
        hasMoreRef.current = more;
        setActivities(prev => {
          let next = [...prev, ...data];
          const overflow = next.length - MAX_WINDOW;
          if (overflow > 0) {
            // đo chiều cao các item sắp bị cắt để bù scrollTop (tránh nhảy màn hình)
            const box = scrollBoxRef.current;
            if (box) {
              let h = 0;
              for (let i = 0; i < overflow && i < box.children.length; i++) {
                h += box.children[i].getBoundingClientRect().height + SCROLL_GAP;
              }
              trimAdjustRef.current = h;
            }
            next = next.slice(overflow);
          }
          return next;
        });
      })
      .catch(err => console.error('Loi tai them activities:', err))
      .finally(() => { loadingMoreRef.current = false; setLoadingMore(false); });
  }, [buildParams]);

  // Bù scrollTop sau khi cửa sổ bị cắt bớt ở đầu
  useLayoutEffect(() => {
    if (trimAdjustRef.current && scrollBoxRef.current) {
      scrollBoxRef.current.scrollTop = Math.max(0, scrollBoxRef.current.scrollTop - trimAdjustRef.current);
      trimAdjustRef.current = 0;
    }
  }, [activities]);

  const handleActivityScroll = (e) => {
    const el = e.currentTarget;
    // chạm ~80% chiều cuộn (tương ứng item thứ ~80/100) → nạp thêm
    if (el.scrollTop + el.clientHeight >= el.scrollHeight * 0.8) loadMore();
  };

  // Toast
  const [toast, setToast] = useState({ show: false, message: '' });

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  // Lưu stats vào localStorage + dispatch event
  const handleSaveStats = () => {
    localStorage.setItem('setting_stats', JSON.stringify(stats));
    window.dispatchEvent(new Event('settings_updated'));
    showToast('Thống Kê Trang Chủ đã được cập nhật.');
  };

  // Lưu identity vào localStorage + dispatch event
  const handleSaveIdentity = () => {
    localStorage.setItem('setting_identity', JSON.stringify(identity));
    window.dispatchEvent(new Event('settings_updated'));
    showToast('Nhận Diện Hệ Thống đã được cập nhật.');
  };

  // Lưu navDesc vào localStorage + dispatch event
  const handleSaveNavDesc = () => {
    localStorage.setItem('setting_nav', JSON.stringify(navDesc));
    window.dispatchEvent(new Event('settings_updated'));
    showToast('Mô Tả Công Cụ Điều Hướng đã được cập nhật.');
  };

  // Xử lý upload logo
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setIdentity(prev => ({ ...prev, logo: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleLogoDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setIdentity(prev => ({ ...prev, logo: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="setting-container">

      {/* Toast thông báo */}
      {toast.show && (
        <div className="setting-toast">
          <CheckCircle size={20} color="#22c55e" />
          <div>
            <p className="setting-toast-title">Đã Lưu Thay Đổi</p>
            <p className="setting-toast-desc">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="setting-header">
        <h1 className="setting-title">Cài Đặt</h1>
        <p className="setting-subtitle">Quản lý nội dung động, thương hiệu và mô tả module của hệ thống.</p>
      </div>

      {/* Section 1: Thống Kê Trang Chủ */}
      <div className="setting-section">
        <div className="setting-section-header">
          <div className="setting-section-icon blue">
            <BarChart2 size={18} />
          </div>
          <h2 className="setting-section-title">Thống Kê Trang Chủ</h2>
        </div>

        <div className="setting-stats-grid">
          <div className="setting-field">
            <label className="setting-label">Đề tài</label>
            <input
              className="setting-input"
              value={stats.topics}
              onChange={e => setStats(prev => ({ ...prev, topics: e.target.value }))}
              placeholder="VD: 100+"
            />
            <span className="setting-hint">Thay đổi số lượng đề tài</span>
          </div>
          <div className="setting-field">
            <label className="setting-label">Giảng viên</label>
            <input
              className="setting-input"
              value={stats.lecturers}
              onChange={e => setStats(prev => ({ ...prev, lecturers: e.target.value }))}
              placeholder="VD: 50+"
            />
            <span className="setting-hint">Thay đổi số lượng Giảng viên</span>
          </div>
          <div className="setting-field">
            <label className="setting-label">Sinh viên</label>
            <input
              className="setting-input"
              value={stats.students}
              onChange={e => setStats(prev => ({ ...prev, students: e.target.value }))}
              placeholder="VD: 500+"
            />
            <span className="setting-hint">Thay đổi số lượng Sinh viên</span>
          </div>
        </div>

        <div className="setting-save-row">
          <button className="setting-save-btn" onClick={handleSaveStats}>
            <CheckCircle size={16} /> Lưu thay đổi
          </button>
        </div>
      </div>

      {/* Section 2: Nhận Diện Hệ Thống */}
      <div className="setting-section">
        <div className="setting-section-header">
          <div className="setting-section-icon red">
            <Globe size={18} />
          </div>
          <h2 className="setting-section-title">Nhận Diện Hệ Thống</h2>
        </div>

        <div className="setting-field">
          <label className="setting-label">Tiêu đề website</label>
          <input
            className="setting-input"
            value={identity.title}
            onChange={e => setIdentity(prev => ({ ...prev, title: e.target.value }))}
          />
        </div>

        <div className="setting-field">
          <label className="setting-label">Mô tả meta</label>
          <textarea
            className="setting-textarea"
            value={identity.description}
            onChange={e => setIdentity(prev => ({ ...prev, description: e.target.value }))}
            maxLength={200}
          />
          <span className="setting-count">{identity.description.length}/200</span>
        </div>

        <div className="setting-field">
          <label className="setting-label">Logo</label>
          <div
            className="setting-upload-zone"
            onDragOver={e => e.preventDefault()}
            onDrop={handleLogoDrop}
            onClick={() => !identity.logo && document.getElementById('logo-input').click()}
            style={{ cursor: identity.logo ? 'default' : 'pointer' }}
          >
            {identity.logo ? (
              <div className="setting-logo-wrap">
                <img src={identity.logo} alt="logo preview" className="setting-logo-preview" />
                <button
                  className="setting-logo-delete"
                  onClick={e => {
                    e.stopPropagation();
                    setIdentity(prev => ({ ...prev, logo: null }));
                  }}
                >
                  Xóa
                </button>
              </div>
            ) : (
              <>
                <Upload size={24} color="#94a3b8" />
                <p className="setting-upload-text">
                  Kéo thả hoặc <span className="setting-upload-link">chọn file</span>
                </p>
                <p className="setting-upload-hint">png, svg, jpg</p>
              </>
            )}
          </div>
          <input
            id="logo-input"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleLogoUpload}
          />
        </div>

        <div className="setting-save-row">
          <button className="setting-save-btn" onClick={handleSaveIdentity}>
            <CheckCircle size={16} /> Lưu thay đổi
          </button>
        </div>
      </div>

      {/* Section: Activity Log */}
      <div className="setting-section">
        <div className="setting-section-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="setting-section-icon" style={{ background: '#e8eaf6', color: '#3949ab' }}>
              <Activity size={18} />
            </div>
            <h2 className="setting-section-title">Lịch sử hoạt động</h2>
          </div>
          <div className="setting-activity-controls">
            <input
              type="date"
              className="setting-activity-date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={e => { setLoadingActivities(true); setDateFrom(e.target.value); }}
              title="Từ ngày"
            />
            <span className="setting-activity-dash">→</span>
            <input
              type="date"
              className="setting-activity-date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={e => { setLoadingActivities(true); setDateTo(e.target.value); }}
              title="Đến ngày"
            />
            {(dateFrom || dateTo) && (
              <button
                className="setting-activity-clear"
                onClick={() => { setLoadingActivities(true); setDateFrom(''); setDateTo(''); }}
                title="Xoá lọc ngày"
              >✕</button>
            )}
            <select
              className="setting-activity-sort"
              value={sortMode}
              onChange={e => { setLoadingActivities(true); setSortMode(e.target.value); }}
              title="Sắp xếp theo thời gian"
            >
              <option value="recent24">24 giờ qua</option>
              <option value="newest">Mới nhất trước</option>
              <option value="oldest">Cũ nhất trước</option>
            </select>
          </div>
        </div>
        {loadingActivities ? (
          <p style={{ padding: 20, textAlign: 'center', color: '#999' }}>Đang tải...</p>
        ) : activities.length === 0 ? (
          <p style={{ padding: 20, textAlign: 'center', color: '#999' }}>
            {(dateFrom || dateTo)
              ? 'Không có hoạt động nào trong khoảng ngày đã chọn'
              : sortMode === 'recent24'
                ? 'Không có hoạt động nào trong 24 giờ qua'
                : 'Chưa có hoạt động nào'}
          </p>
        ) : (
          <div
            ref={scrollBoxRef}
            onScroll={handleActivityScroll}
            style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {activities.map(a => (
              <div key={a.id} style={{
                padding: 12, background: '#f8f9fa', borderRadius: 8,
                borderLeft: '3px solid #3949ab', display: 'flex', justifyContent: 'space-between', gap: 12,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    <span style={{ color: '#3949ab' }}>{a.user?.fullName || 'Hệ thống'}</span>
                    {' '}
                    <span style={{ color: '#666', fontWeight: 400 }}>· {a.action}</span>
                  </div>
                  {a.detail && (
                    <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{a.detail}</div>
                  )}
                  {a.topic?.topicName && (
                    <div style={{ fontSize: 11, color: '#888', marginTop: 4, fontStyle: 'italic' }}>
                      📋 {a.topic.topicName}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#999', whiteSpace: 'nowrap' }}>
                  {new Date(a.created).toLocaleString('vi-VN')}
                </div>
              </div>
            ))}
            {loadingMore && (
              <p style={{ textAlign: 'center', color: '#999', fontSize: 12, padding: 8 }}>Đang tải thêm...</p>
            )}
            {!hasMore && (
              <p style={{ textAlign: 'center', color: '#bbb', fontSize: 11, padding: 8 }}>— Hết —</p>
            )}
          </div>
        )}
      </div>

      {/* Section 3: Mô Tả Công Cụ Điều Hướng */}
      <div className="setting-section">
        <div className="setting-section-header">
          <div className="setting-section-icon orange">
            <BookOpen size={18} />
          </div>
          <h2 className="setting-section-title">Mô Tả Công Cụ Điều Hướng</h2>
        </div>

        <div className="setting-field">
          <label className="setting-label">Danh sách đề tài</label>
          <textarea
            className="setting-textarea"
            value={navDesc.topicList}
            onChange={e => setNavDesc(prev => ({ ...prev, topicList: e.target.value }))}
            maxLength={300}
          />
          <span className="setting-count">{navDesc.topicList.length}/300</span>
        </div>

        <div className="setting-field">
          <label className="setting-label">Danh sách ý tưởng</label>
          <textarea
            className="setting-textarea"
            value={navDesc.ideaList}
            onChange={e => setNavDesc(prev => ({ ...prev, ideaList: e.target.value }))}
            maxLength={300}
          />
          <span className="setting-count">{navDesc.ideaList.length}/300</span>
        </div>

        <div className="setting-field">
          <label className="setting-label">Đăng ký ý tưởng</label>
          <textarea
            className="setting-textarea"
            value={navDesc.register}
            onChange={e => setNavDesc(prev => ({ ...prev, register: e.target.value }))}
            maxLength={300}
          />
          <span className="setting-count">{navDesc.register.length}/300</span>
        </div>

        <div className="setting-save-row">
          <button className="setting-save-btn" onClick={handleSaveNavDesc}>
            <CheckCircle size={16} /> Lưu thay đổi
          </button>
        </div>
      </div>

    </div>
  );
};

export default Setting;