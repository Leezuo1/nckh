import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import AdminLayout from '../layouts/AdminLayout'
import ProtectedRoute from './ProtectedRoute'

// User pages
import Trangchu from '../pages/User/Trangchu/Trangchu'
import DanhSachDeTai from '../pages/User/DanhSachDeTai/DanhSachDeTai'
import GiaoDienDangNhap from '../pages/User/Login/GiaoDienDangNhap'
import MyTopicPage from '../pages/User/MyTopic/MyTopicPage'
import ProfilePage from '../pages/User/Profile/ProfilePage'
import RegisterIdeaPage from '../pages/User/RegisterIdea/RegisterIdeaPage'
import TopicDetailPage from '../pages/User/TopicDetail/TopicDetailPage'
import CanBoDashboard from '../pages/CanBo/CanBoDashboard'
import BaoCao from '../pages/CanBo/BaoCao'
import NotFound from '../pages/NotFound/NotFound'

// Admin pages
import QuanLyNguoiDung from '../pages/Admin/QuanLyNguoiDung/QuanLyNguoiDung'
import QuanLyNguoiDungSV from '../pages/Admin/QuanLyNguoiDungSV/QuanLyNguoiDungSV'
import QuanLyNguoiDungGV from '../pages/Admin/QuanLyNguoiDungGV/QuanLyNguoiDungGV'
import Setting from '../pages/Admin/Setting/Setting'

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>

        {/* ===== USER ROUTES - MainLayout ===== */}
        <Route path="/" element={
          <MainLayout><Trangchu /></MainLayout>
        } />

        <Route path="/login" element={
          <GiaoDienDangNhap />
        } />

        <Route path="/danh-sach-de-tai" element={
          <ProtectedRoute><MainLayout><DanhSachDeTai /></MainLayout></ProtectedRoute>
        } />

        {/* Lập nhóm nghiên cứu (GVHD/Admin) — thay cho "Đăng ký ý tưởng" cũ */}
        <Route path="/dang-ky-y-tuong" element={
          <ProtectedRoute requiredRole={["Lecturer", "Admin"]}><MainLayout><RegisterIdeaPage /></MainLayout></ProtectedRoute>
        } />

        <Route path="/de-tai-cua-toi" element={
          <ProtectedRoute><MainLayout><MyTopicPage /></MainLayout></ProtectedRoute>
        } />

        <Route path="/de-tai-cua-toi/:id" element={
          <ProtectedRoute><MainLayout><TopicDetailPage /></MainLayout></ProtectedRoute>
        } />

        <Route path="/ho-so" element={
          <ProtectedRoute><MainLayout><ProfilePage /></MainLayout></ProtectedRoute>
        } />

        {/* Khu cán bộ: dashboard riêng (không dùng MainLayout của user) */}
        <Route path="/can-bo" element={
          <ProtectedRoute requiredRole={["FacultyOfficer", "DepartmentOfficer", "Admin"]}><CanBoDashboard /></ProtectedRoute>
        } />

        {/* Báo cáo thống kê (Trưởng Khoa chỉ đọc + Khoa/Phòng/Admin) */}
        <Route path="/bao-cao" element={
          <ProtectedRoute requiredRole={["FacultyDean", "FacultyOfficer", "DepartmentOfficer", "Admin"]}><BaoCao /></ProtectedRoute>
        } />

        {/* ===== ADMIN ROUTES — chỉ quản trị tài khoản + hệ thống ===== */}
        <Route path="/admin/nguoi-dung" element={
          <ProtectedRoute requiredRole="Admin"><AdminLayout><QuanLyNguoiDung /></AdminLayout></ProtectedRoute>
        } />

        <Route path="/admin/sinh-vien" element={
          <ProtectedRoute requiredRole="Admin"><AdminLayout><QuanLyNguoiDungSV /></AdminLayout></ProtectedRoute>
        } />

        <Route path="/admin/giang-vien" element={
          <ProtectedRoute requiredRole="Admin"><AdminLayout><QuanLyNguoiDungGV /></AdminLayout></ProtectedRoute>
        } />

        <Route path="/admin/setting" element={
          <ProtectedRoute requiredRole="Admin"><AdminLayout><Setting /></AdminLayout></ProtectedRoute>
        } />

        {/* ===== 404 — URL không khớp route nào (luồng phụ) ===== */}
        <Route path="*" element={
          <MainLayout><NotFound /></MainLayout>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes