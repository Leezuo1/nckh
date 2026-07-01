import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './DanhSachYTuongContent.css';
import IdeaCard from '../../../components/IdeaCard/IdeaCard';
import IdeaDetailModal from '../../../components/IdeaDetailModal/IdeaDetailModal';
import topicService from '../../../services/topicService';
import { mapIdeaToCard } from '../../../utils/mappers';
import { Toaster } from 'react-hot-toast';

const DanhSachYTuongContent = ({ searchTerm, filterNam, filterKhoa, setTieuDeTrang }) => {
  const { t } = useTranslation();
  const [dataHienTai, setDataHienTai] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [trangHienTai, setTrangHienTai] = useState(1);
  const soItemMoiTrang = 6;

  useEffect(() => {
    if (setTieuDeTrang) setTieuDeTrang(t('ideaList.title'));
  }, [setTieuDeTrang, t]);

  const loadIdeas = () => {
    setLoading(true);
    topicService.getIdeas({ onlyUnassigned: true })
      .then(data => setDataHienTai(data.map(item => ({
        ...mapIdeaToCard(item),
        _raw: item,
        status: item.status === 'Pending' ? 'Chưa Assign' : mapIdeaToCard(item).status,
      }))))
      .catch(err => console.error('Loi tai y tuong:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadIdeas(); }, []);

  const dataSauKhiLoc = dataHienTai.filter(item => {
    const tuKhoa = (searchTerm || "").toLowerCase();
    const matchSearch =
      (item.title || '').toLowerCase().includes(tuKhoa) ||
      (item.poster || '').toLowerCase().includes(tuKhoa);
    const matchNam = !filterNam || filterNam === 'Năm' ||
      (item.date && filterNam.includes(item.date.split('/')[2]));
    const matchKhoa = !filterKhoa || filterKhoa === 'Khóa' || item.batch === filterKhoa;
    return matchSearch && matchNam && matchKhoa;
  });

  useEffect(() => { setTrangHienTai(1); }, [searchTerm, filterNam, filterKhoa]);

  const tongSoTrang = Math.ceil(dataSauKhiLoc.length / soItemMoiTrang);
  const dataHienThi = dataSauKhiLoc.slice((trangHienTai - 1) * soItemMoiTrang, trangHienTai * soItemMoiTrang);

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

  // Sau khi assign thành công → bỏ khỏi list + đóng modal
  const handleAssignSuccess = (id) => {
    setDataHienTai(prev => prev.filter(i => i.id !== id));
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>{t('common.loading')}</div>;

  return (
    <div className="vung-danh-sach-ngoai-2">
      <Toaster />

      <div className="khung-grid-the-2">
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
              onClick={() => setSelectedIdea(item._raw)}
            />
          ))
        ) : (
          <div className="thong_bao_trong-2">{t('ideaList.notFound')}</div>
        )}
      </div>

      {tongSoTrang > 1 && (
        <div className="thanh-phan-trang-2">
          <div className="cum-phan-trang-2">
            <button className="nut-chuyen-2" disabled={trangHienTai === 1} onClick={() => setTrangHienTai(prev => prev - 1)}>‹</button>
            {renderSoTrang().map((p, index) => (
              p === "..." ? <span key={index} className="dau-ba-cham-2">...</span> :
                <button key={p} className={trangHienTai === p ? "active-2" : ""} onClick={() => setTrangHienTai(p)}>{p}</button>
            ))}
            <button className="nut-chuyen-2" disabled={trangHienTai === tongSoTrang} onClick={() => setTrangHienTai(prev => prev + 1)}>›</button>
          </div>
        </div>
      )}

      {/* Modal chi tiết ý tưởng */}
      {selectedIdea && (
        <IdeaDetailModal
          idea={selectedIdea}
          onClose={() => setSelectedIdea(null)}
          onSuccess={handleAssignSuccess}
        />
      )}
    </div>
  );
};

export default DanhSachYTuongContent;
