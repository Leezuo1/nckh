import { useNavigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import SidebarAdmin from '../components/SidebarAdmin/SidebarAdmin'

const AdminLayout = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()

  // Map pathname sang id menu
  const handleMenuChange = (id) => {
    switch (id) {
      case 'de_tai': navigate('/admin/de-tai'); break
      case 'y_tuong': navigate('/admin/y-tuong'); break
      case 'quan_ly_y_tuong': navigate('/admin/quan-ly-y-tuong'); break
      case 'nguoi_dung': navigate('/admin/nguoi-dung'); break
      case 'sinh_vien': navigate('/admin/sinh-vien'); break
      case 'giang_vien': navigate('/admin/giang-vien'); break
      case 'can_bo_khoa': navigate('/admin/can-bo-khoa'); break
      case 'can_bo_phong': navigate('/admin/can-bo-phong'); break
      case 'truong_khoa': navigate('/admin/truong-khoa'); break
      case 'setting': navigate('/admin/setting'); break
      default: break
    }
  }

  const getActiveMenu = () => {
    const path = location.pathname
    if (path === '/admin/de-tai') return 'de_tai'
    if (path === '/admin/y-tuong') return 'y_tuong'
    if (path === '/admin/quan-ly-y-tuong') return 'quan_ly_y_tuong'
    if (path === '/admin/nguoi-dung') return 'nguoi_dung'
    if (path === '/admin/sinh-vien') return 'sinh_vien'
    if (path === '/admin/giang-vien') return 'giang_vien'
    if (path === '/admin/can-bo-khoa') return 'can_bo_khoa'
    if (path === '/admin/can-bo-phong') return 'can_bo_phong'
    if (path === '/admin/truong-khoa') return 'truong_khoa'
    if (path === '/admin/setting') return 'setting'
    return ''
  }

  return (
    <div className="admin-layout">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: { fontSize: 14, borderRadius: 10 },
          error: { iconTheme: { primary: '#dc3545', secondary: 'white' } },
          success: { iconTheme: { primary: '#28a745', secondary: 'white' } },
        }}
      />
      <SidebarAdmin
        activeMenu={getActiveMenu()}
        onMenuChange={handleMenuChange}
      />
      <div className="admin-main-content">
        {children}
      </div>
    </div>
  )
}

export default AdminLayout