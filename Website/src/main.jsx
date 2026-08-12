import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/responsive.css'
import './i18n'
import App from './App.jsx'
import ErrorBoundary from './components/Common/ErrorBoundary.jsx'
import { isMsalRedirectPopup, handleMsalRedirect } from './services/msalService'

if (isMsalRedirectPopup()) {
  // Đang ở trong popup đăng nhập Microsoft: KHÔNG render app (tránh app can thiệp),
  // để MSAL xử lý code và tự đóng popup + trả token về cửa sổ chính.
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
