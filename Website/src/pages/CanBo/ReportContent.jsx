import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import topicService from '../../services/topicService';
import documentService from '../../services/documentService';

const fmtSize = (n) => n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

const STATUS_ORDER = [
  'Draft', 'PendingFacultyReview', 'FacultyRevision', 'PendingDepartmentReview',
  'DepartmentRevision', 'PendingProposalCouncil', 'WaitingToStart', 'InProgress',
  'PendingReviewCouncil', 'Reporting', 'Editing', 'Done', 'Cancelled',
];

const card = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 };

// Nội dung báo cáo thống kê (chỉ đọc) — dùng trong Khu cán bộ.
const ReportContent = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState([]);
  const [docQuery, setDocQuery] = useState('');

  useEffect(() => {
    topicService.getReportStats()
      .then(setStats)
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
    documentService.getAll()
      .then(d => setDocs(d || []))
      .catch(e => console.error(e));
  }, []);

  const q = docQuery.trim().toLowerCase();
  const shownDocs = q
    ? docs.filter(d =>
        (d.fileName || '').toLowerCase().includes(q) ||
        (d.topic?.topicName || '').toLowerCase().includes(q) ||
        (d.uploader?.fullName || '').toLowerCase().includes(q) ||
        (d.note || '').toLowerCase().includes(q))
    : docs;

  const maxSup = stats?.bySupervisor?.[0]?.count || 1;

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Đang tải...</div>;
  if (!stats) return <div style={{ ...card, textAlign: 'center', color: '#94a3b8' }}>Không tải được số liệu.</div>;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Tổng đề tài', value: stats.total, color: '#2563eb' },
          { label: 'Đang thực hiện', value: stats.inProgress, color: '#0891b2' },
          { label: 'Đã nghiệm thu', value: stats.done, color: '#16a34a' },
          { label: 'Tỷ lệ đạt', value: `${stats.passRate}%`, color: '#7c3aed' },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: 16 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={card}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Theo trạng thái</h3>
          {STATUS_ORDER.filter(s => stats.byStatus[s]).map(s => (
            <div key={s} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: 14 }}>
              <span>{t(`status.${s}`, s)}</span>
              <b>{stats.byStatus[s]}</b>
            </div>
          ))}
        </div>

        <div style={card}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Theo GVHD</h3>
          {stats.bySupervisor.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: 13 }}>Chưa có.</p>
          ) : stats.bySupervisor.map(s => (
            <div key={s.name} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                <span>{s.name}</span><b>{s.count}</b>
              </div>
              <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4 }}>
                <div style={{ height: 8, width: `${(s.count / maxSup) * 100}%`, background: '#2563eb', borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tổng hợp tài liệu toàn bộ đề tài */}
      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>📎 Tổng hợp tài liệu <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 13 }}>({shownDocs.length})</span></h3>
          <input value={docQuery} onChange={e => setDocQuery(e.target.value)} placeholder="Tìm theo tên file / đề tài / người nộp / loại"
            style={{ padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, minWidth: 260 }} />
        </div>
        {docs.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>Chưa có tài liệu nào được nộp.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#64748b', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '8px 6px' }}>Đề tài</th>
                  <th style={{ padding: '8px 6px' }}>Loại</th>
                  <th style={{ padding: '8px 6px' }}>Tên file</th>
                  <th style={{ padding: '8px 6px' }}>Người nộp</th>
                  <th style={{ padding: '8px 6px' }}>Ngày</th>
                  <th style={{ padding: '8px 6px' }}>Cỡ</th>
                  <th style={{ padding: '8px 6px' }}></th>
                </tr>
              </thead>
              <tbody>
                {shownDocs.map(d => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 6px' }}>
                      <div style={{ fontWeight: 600 }}>{d.topic?.topicName || '—'}</div>
                      <div style={{ color: '#94a3b8', fontSize: 12 }}>{d.topic?.topicId} · {t(`status.${d.topic?.status}`, d.topic?.status)}</div>
                    </td>
                    <td style={{ padding: '8px 6px' }}>{d.note ? <span style={{ background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 20, fontSize: 12 }}>{d.note}</span> : '—'}</td>
                    <td style={{ padding: '8px 6px', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.fileName}>{d.fileName}</td>
                    <td style={{ padding: '8px 6px' }}>{d.uploader?.fullName || '—'}</td>
                    <td style={{ padding: '8px 6px', color: '#64748b' }}>{new Date(d.uploaded).toLocaleDateString('vi-VN')}</td>
                    <td style={{ padding: '8px 6px', color: '#64748b' }}>{fmtSize(d.size)}</td>
                    <td style={{ padding: '8px 6px' }}>
                      <button onClick={() => documentService.download(d.id, d.fileName).catch(err => toast.error(err.message || 'Không tải được'))}
                        style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>⬇ Tải</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default ReportContent;
