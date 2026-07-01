import { Component } from 'react'

/**
 * Bắt mọi lỗi render trong cây component con và hiển thị màn hình lỗi thân
 * thiện thay vì để React unmount toàn bộ app (màn hình trắng).
 * Error boundary BẮT BUỘC là class component (React chưa có hook tương đương).
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // Log để debug; production có thể đẩy lên dịch vụ giám sát ở đây
    console.error('Lỗi render giao diện:', error, info)
  }

  handleReload = () => {
    this.setState({ hasError: false })
    window.location.reload()
  }

  handleHome = () => {
    window.location.href = '/'
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
          textAlign: 'center',
          fontFamily: 'inherit',
          color: '#333',
        }}
      >
        <div style={{ fontSize: 56 }}>⚠️</div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Đã xảy ra lỗi</h1>
        <p style={{ margin: 0, color: '#666', maxWidth: 420 }}>
          Giao diện gặp sự cố không mong muốn. Bạn hãy thử tải lại trang;
          nếu vẫn lỗi vui lòng liên hệ quản trị viên.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button
            onClick={this.handleReload}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              background: '#c0392b',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Tải lại trang
          </button>
          <button
            onClick={this.handleHome}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: '1px solid #ccc',
              background: '#fff',
              color: '#333',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Về trang chủ
          </button>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
