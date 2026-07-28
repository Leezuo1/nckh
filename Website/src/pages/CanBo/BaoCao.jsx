import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BarChart3, LogOut } from 'lucide-react';
import topicService from '../../services/topicService';
import authService from '../../services/authService';

const STATUS_ORDER = [
  'Draft', 'PendingFacultyReview', 'FacultyRevision', 'PendingDepartmentReview',
  'DepartmentRevision', 'PendingProposalCouncil', 'WaitingToStart', 'InProgress',
  'PendingReviewCouncil', 'Reporting', 'Editing', 'Done', 'Cancelled',
];

const card = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 };

const BaoCao = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    topicService.getReportStats()
      .then(setStats)
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const maxSup = stats?.bySupervisor?.[0]?.count || 1;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9' }}>
      <aside style={{ width: 250, background: '#0f172a', color: '#e2e8f0', padding: '24px 16px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart3 size={22} color="#34d399" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Báo cáo</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Thống kê đề tài</div>
          </div>
        </div>
        <div style={{ marginTop: 'auto', borderTop: '1px solid #1e293b', paddingTop: 16 }}>
          <div style={{ fontSize: 13, marginBottom: 10 }}>{user?.fullName}</div>
          <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', color: '#f87171', border: 'none', cursor: 'pointer', fontSize: 13 }}>
            <LogOut size={16} /> Về trang người dùng
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '28px 32px', maxWidth: 1000 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Báo cáo thống kê (chỉ đọc)</h1>
        <p style={{ color: '#64748b', marginBottom: 24 }}>Tổng quan đề tài nghiên cứu khoa học.</p>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Đang tải...</div>
        ) : !stats ? (
          <div style={{ ...card, textAlign: 'center', color: '#94a3b8' }}>Không tải được số liệu.</div>
        ) : (
          <>
            {/* Thẻ số */}
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
              {/* Theo trạng thái */}
              <div style={card}>
                <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Theo trạng thái</h3>
                {STATUS_ORDER.filter(s => stats.byStatus[s]).map(s => (
                  <div key={s} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: 14 }}>
                    <span>{t(`status.${s}`, s)}</span>
                    <b>{stats.byStatus[s]}</b>
                  </div>
                ))}
              </div>

              {/* Theo GVHD */}
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
        )}
      </main>
    </div>
  );
};

export default BaoCao;
