import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/responsive.css'
import './i18n'
import App from './App.jsx'
import ErrorBoundary from './components/Common/ErrorBoundary.jsx'
import { hasMsalAuthResponse, handleMsalRedirect } from './services/msalService'

if (hasMsalAuthResponse()) {
  // Trang đang nhận phản hồi đăng nhập Microsoft (thường là popup).
  // KHÔNG render app (tránh app xoá/đổi hash làm hỏng luồng) — chỉ để MSAL xử lý code,
  // sau đó popup tự đóng + trả token về cửa sổ chính.
  const root = document.getElementById('root')
  if (root) root.innerHTML = '<div style="font-family:sans-serif;padding:48px;text-align:center;color:#555">Đang xử lý đăng nhập Microsoft…</div>'
  handleMsalRedirect()
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  )
}
