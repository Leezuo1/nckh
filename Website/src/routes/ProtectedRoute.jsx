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

  // Kiểm tra role nếu có yêu cầu. Chấp nhận 1 chuỗi (requiredRole="Admin")
  // hoặc mảng nhiều vai trò (requiredRole={["FacultyOfficer","DepartmentOfficer"]}).
  if (requiredRole) {
    const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    if (!allowed.includes(userInfo?.role)) {
      return <Navigate to="/" replace />
    }
  }

  return children
}

export default ProtectedRoute
