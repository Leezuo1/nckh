import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/responsive.css'
import './i18n'
import App from './App.jsx'
import ErrorBoundary from './components/Common/ErrorBoundary.jsx'
import { isMicrosoftConfigured, hasMsalAuthResponse, completeMicrosoftRedirect } from './services/msalService'
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

if (isMicrosoftConfigured && hasMsalAuthResponse()) {
  // Trang vừa quay lại từ Microsoft (đăng nhập bằng redirect).
  // Xử lý code → lấy access token → đổi lấy phiên đăng nhập ở backend → về trang chủ đã đăng nhập.
  const root = document.getElementById('root')
  if (root) root.innerHTML = '<div style="font-family:sans-serif;padding:48px;text-align:center;color:#555">Đang xử lý đăng nhập Microsoft…</div>'
  completeMicrosoftRedirect()
    .then(async (accessToken) => {
      if (!accessToken) { renderApp(); return }
      await authService.loginWithMicrosoft(accessToken)
      window.dispatchEvent(new Event('auth:login'))
      window.location.replace('/')
    })
    .catch((err) => {
      // Lỗi bước đổi token ở backend (hoặc MSAL) → quay lại login kèm thông báo
      try { sessionStorage.setItem('ms_login_error', err?.response?.data?.message || err?.message || 'Đăng nhập Microsoft thất bại') } catch { /* ignore */ }
      window.location.replace('/login')
    })
} else {
  renderApp()
}
