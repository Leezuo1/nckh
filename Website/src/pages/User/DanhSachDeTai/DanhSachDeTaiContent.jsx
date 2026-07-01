import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './DanhSachDeTaiContent.css';
import IdeaCard from '../../../components/IdeaCard/IdeaCard';
import TopicViewModal from '../../../components/TopicViewModal/TopicViewModal';
import topicService from '../../../services/topicService';
import { mapTopicToCard } from '../../../utils/mappers';

const DanhSachDeTaiContent = ({ searchTerm, filterNam, filterKhoa, setTieuDeTrang }) => {
  const { t } = useTranslation();
  const [danhSachGoc, setDanhSachGoc] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [trangHienTai, setTrangHienTai] = useState(1);
  const soItemMoiTrang = 6;

  useEffect(() => {
    if (setTieuDeTrang) setTieuDeTrang("Danh sách đề tài");
  }, [setTieuDeTrang]);

  // Load đề tài từ API
  useEffect(() => {
    topicService.getTopics()
      .then(data => {
        // Hiện mọi đề tài đã assign đang hoạt động (gồm cả trạng thái mới:
        // Chờ bắt đầu, Báo Cáo, Chỉnh Sửa, Nghiệm Thu) — chỉ ẩn đề tài đã Hủy.
        const filtered = data.filter(t => t.status !== 'Cancelled');
        setDanhSachGoc(filtered.map(mapTopicToCard));
      })
      .catch(err => console.error('Loi tai de tai:', err))
      .finally(() => setLoading(false));
  }, []);

  // --- LỌC DỮ LIỆU ---
  const dataSauKhiLoc = danhSachGoc.filter(item => {
    const tuKhoa = (searchTerm || "").toLowerCase();
    const matchSearch =
      (item.title || '').toLowerCase().includes(tuKhoa) ||
      (item.poster || '').toLowerCase().includes(tuKhoa);
    // filterNam dạng "2025-2026" → check theo năm trong batch hoặc deadline
    const matchNam = !filterNam || filterNam === 'Năm' ||
      (item.date && filterNam.includes(item.date.split('/')[2]));
    const matchKhoa = !filterKhoa || filterKhoa === 'Khóa' || item.batch === filterKhoa;
    return matchSearch && matchNam && matchKhoa;
  });

  useEffect(() => { setTrangHienTai(1); }, [searchTerm, filterNam, filterKhoa]);

  const tongSoTrang = Math.ceil(dataSauKhiLoc.length / soItemMoiTrang);
  const indexCuoi = trangHienTai * soItemMoiTrang;
  const indexDau = indexCuoi - soItemMoiTrang;
  const dataHienThi = dataSauKhiLoc.slice(indexDau, indexCuoi);

  const renderSoTrang = () => {
    const pages = [];
    if (tongSoTrang <= 1) return [];
    if (tongSoTrang <= 5) {
      for (let i = 1; i <= tongSoTrang; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, trangHienTai - 1);
      let end = Math.min(tongSoTrang - 1, trangHienTai + 1);
      if (trangHienTai <= 3) end = Math.min(tongSoTrang - 1, 4);
      if (trangHienTai >= tongSoTrang - 2) start = Math.max(2, tongSoTrang - 3);
      if (start > 2) pages.push("...");
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < tongSoTrang - 1) pages.push("...");
      pages.push(tongSoTrang);
    }
    return pages;
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>{t('common.loading')}</div>;

  return (
    <div className="vung-danh-sach-ngoai">
      <div className="khung-grid-the">
        {dataHienThi.length > 0 ? (
          dataHienThi.map((item) => (
            <IdeaCard
              key={item.id}
              title={item.title}
              dept={item.dept}
              date={item.date}
              poster={item.poster}
              role={item.role}
              status={item.status}
              onClick={() => setSelectedTopic(item._raw)}
            />
          ))
        ) : (
          <div className="khong-co-du-lieu" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '50px', color: '#666' }}>
            {t('topicList.notFound')}
          </div>
        )}
      </div>

      {tongSoTrang > 1 && (
        <div className="thanh-phan-trang">
          <div className="cum-phan-trang">
            <button disabled={trangHienTai === 1} onClick={() => setTrangHienTai(prev => prev - 1)}>‹</button>
            {renderSoTrang().map((p, index) => (
              p === "..." ? <span key={index} className="dau-ba-cham">...</span> :
                <button key={p} className={trangHienTai === p ? "active" : ""} onClick={() => setTrangHienTai(p)}>{p}</button>
            ))}
            <button disabled={trangHienTai === tongSoTrang} onClick={() => setTrangHienTai(prev => prev + 1)}>›</button>
          </div>
        </div>
      )}

      {/* Popup xem chi tiết đề tài (read-only) */}
      {selectedTopic && (
        <TopicViewModal
          topic={selectedTopic}
          onClose={() => setSelectedTopic(null)}
        />
      )}
    </div>
  );
};

export default DanhSachDeTaiContent;
