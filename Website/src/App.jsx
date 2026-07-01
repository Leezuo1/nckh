import { useEffect } from 'react'
import AppRoutes from './routes/AppRoutes'

const applySettings = () => {
  let identity = null;
  try {
    const saved = localStorage.getItem('setting_identity');
    identity = saved ? JSON.parse(saved) : null;
  } catch {
    // setting_identity hỏng → bỏ qua, dùng giá trị mặc định
    identity = null;
  }

  // Cập nhật title tab
  document.title = identity?.title || 'NCKH VLU';

  // Cập nhật favicon
  const favicon = document.querySelector("link[rel='icon']");
  if (favicon) {
    if (identity?.logo) {
      favicon.href = identity.logo;
      favicon.type = 'image/png';
    } else {
      favicon.href = '/favicon.svg';
      favicon.type = 'image/svg+xml';
    }
  }
};

function App() {
  useEffect(() => {
    // Apply ngay khi load
    applySettings();

    // Lắng nghe khi admin lưu setting
    window.addEventListener('settings_updated', applySettings);
    return () => window.removeEventListener('settings_updated', applySettings);
  }, []);

  return <AppRoutes />
}

export default App
