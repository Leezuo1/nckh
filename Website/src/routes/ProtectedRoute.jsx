import { Navigate, useLocation } from 'react-router-dom'
import authService from '../services/authService'

const ProtectedRoute = ({ children, requiredRole }) => {
  const location = useLocation()
  const isLoggedIn = localStorage.getItem('is_logged_in') === 'true'
  // getCurrentUser tự bọc try/catch — user_info hỏng sẽ trả null thay vì throw
  const userInfo = authService.getCurrentUser()

  if (!isLoggedIn) {
    sessionStorage.setItem('redirect_after_login', location.pathname)
    sessionStorage.setItem('show_login_toast', 'true')
    return <Navigate to="/login" replace />
  }

  // Kiểm tra role nếu có yêu cầu (ví dụ: requiredRole="Admin")
  if (requiredRole && userInfo?.role !== requiredRole) {
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute
