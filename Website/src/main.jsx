import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/responsive.css'
import './i18n'
import App from './App.jsx'
import ErrorBoundary from './components/Common/ErrorBoundary.jsx'
import { hasMsalAuthResponse } from './services/msalService'

if (hasMsalAuthResponse()) {
  // Popup đăng nhập Microsoft: KHÔNG render app và KHÔNG tự xử lý hash.
  // Giữ nguyên #code trên URL để CỬA SỔ CHÍNH (opener) đọc, xử lý token rồi tự đóng popup.
  const root = document.getElementById('root')
  if (root) root.innerHTML = '<div style="font-family:sans-serif;padding:48px;text-align:center;color:#555">Đang xử lý đăng nhập Microsoft…</div>'
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  )
}
