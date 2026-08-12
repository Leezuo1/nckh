import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/responsive.css'
import './i18n'
import App from './App.jsx'
import ErrorBoundary from './components/Common/ErrorBoundary.jsx'
import { isMicrosoftConfigured, getMicrosoftRedirectResult, getRedirectUri } from './services/msalService'
import authService from './services/authService'

function renderApp() {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  )
}

function setMsError(msg) {
  try { sessionStorage.setItem('ms_login_error', msg) } catch { /* ignore */ }
}

const ms = isMicrosoftConfigured ? getMicrosoftRedirectResult() : {}

if (ms.error) {
  // Microsoft trả lỗi ngay ở bước authorize
  setMsError(ms.errorDescription || ms.error)
  window.location.replace('/login')
} else if (ms.code) {
  // Vừa quay lại từ Microsoft với authorization code → gửi backend đổi lấy phiên đăng nhập.
  const root = document.getElementById('root')
  if (root) root.innerHTML = '<div style="font-family:sans-serif;padding:48px;text-align:center;color:#555">Đang xử lý đăng nhập Microsoft…</div>'
  authService.loginWithMicrosoftCode(ms.code, getRedirectUri())
    .then(() => {
      window.dispatchEvent(new Event('auth:login'))
      window.location.replace('/')
    })
    .catch((err) => {
      setMsError(err?.response?.data?.message || err?.message || 'Đăng nhập Microsoft thất bại')
      window.location.replace('/login')
    })
} else {
  renderApp()
}
