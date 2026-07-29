import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import topicService from '../../services/topicService';

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

  useEffect(() => {
    topicService.getReportStats()
      .then(setStats)
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

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
    </>
  );
};

export default ReportContent;
