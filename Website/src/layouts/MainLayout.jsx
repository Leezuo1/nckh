import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import Sidebar from '../components/sidebar/sidebar'
import Header from '../components/header/header'
import Footer from '../components/Footer/Footer'
import ChatBot from '../components/ChatBot/ChatBot'
import './MainLayout.css'
import { RiMenuLine } from 'react-icons/ri'

const MainLayout = ({ children }) => {
  // Default: mobile thì đóng, desktop thì mở
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      // Tự đóng sidebar khi resize xuống mobile
      if (mobile) setSidebarOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div className="main-layout">

      {/* Toast global */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: { fontSize: 14, borderRadius: 10 },
          error: { iconTheme: { primary: '#dc3545', secondary: 'white' } },
          success: { iconTheme: { primary: '#28a745', secondary: 'white' } },
        }}
      />

      {/* Header */}
      <Header />

      {/* Below */}
      <div className="below-area">
        {/* Nút mở sidebar */}
        {!sidebarOpen && (
          <button
            className="btn-open-sidebar"
            onClick={() => setSidebarOpen(true)}
          >
            <RiMenuLine />
          </button>
        )}

        {/* Overlay đen mờ — chỉ hiện trên mobile khi sidebar mở */}
        {isMobile && sidebarOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="page-content">
          {children}
          <Footer />
        </div>

      </div>

      {/* Trợ lý chatbot (nổi góc phải) */}
      <ChatBot />
    </div>
  )
}

export default MainLayout
