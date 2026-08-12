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

function msError(err) {
  try { sessionStorage.setItem('ms_login_error', err?.response?.data?.message || err?.message || 'Đăng nhập Microsoft thất bại') } catch { /* ignore */ }
}

async function boot() {
  if (!isMicrosoftConfigured) { renderApp(); return }

  const returning = hasMsalAuthResponse()
  if (returning) {
    const root = document.getElementById('root')
    if (root) root.innerHTML = '<div style="font-family:sans-serif;padding:48px;text-align:center;color:#555">Đang xử lý đăng nhập Microsoft…</div>'
  }

  // LUÔN gọi handleRedirectPromise mỗi lần load: vừa xử lý phản hồi redirect (nếu có),
  // vừa DỌN cờ interaction_in_progress bị kẹt từ lần trước.
  let accessToken = null
  try {
    accessToken = await completeMicrosoftRedirect()
  } catch (err) {
    if (returning) { msError(err); window.location.replace('/login'); return }
    // Load bình thường: bỏ qua lỗi MSAL (đã dọn cờ), cứ render app
  }

  if (accessToken) {
    try {
      await authService.loginWithMicrosoft(accessToken)
      window.dispatchEvent(new Event('auth:login'))
      window.location.replace('/')
      return
    } catch (err) {
      msError(err)
      window.location.replace('/login')
      return
    }
  }

  renderApp()
}

boot()
