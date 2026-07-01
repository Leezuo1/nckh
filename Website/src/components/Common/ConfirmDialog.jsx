import './ConfirmDialog.css'
import { PiWarningCircleFill } from 'react-icons/pi'

const ConfirmDialog = ({
  onCancel,
  onConfirm,
  isLoading,
  title = 'Xác nhận đăng ký đề tài',
  message = 'Bạn có chắc muốn đăng ký đề tài này?',
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
}) => {
  return (
    <>
      <div className="confirm-overlay" />
      <div className="confirm-box">
        {/* Icon cảnh báo */}
        <div className="confirm-icon">
            <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M25.0001 18.7499V27.0833M25.0001 35.4166H25.0209M21.4376 8.04161L3.79177 37.4999C3.42795 38.13 3.23545 38.8443 3.23341 39.5719C3.23138 40.2994 3.41988 41.0148 3.78016 41.6469C4.14044 42.2789 4.65995 42.8057 5.287 43.1746C5.91404 43.5436 6.62677 43.7419 7.35427 43.7499H42.6459C43.3734 43.7419 44.0862 43.5436 44.7132 43.1746C45.3403 42.8057 45.8598 42.2789 46.22 41.6469C46.5803 41.0148 46.7688 40.2994 46.7668 39.5719C46.7648 38.8443 46.5723 38.13 46.2084 37.4999L28.5626 8.04161C28.1912 7.42933 27.6683 6.9231 27.0443 6.57178C26.4202 6.22046 25.7162 6.03589 25.0001 6.03589C24.284 6.03589 23.58 6.22046 22.9559 6.57178C22.3319 6.9231 21.809 7.42933 21.4376 8.04161Z" stroke="#1E1E1E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>

        </div>

        <h3 className="confirm-title">{title}</h3>
        <p className="confirm-desc">{message}</p>

        <div className="confirm-actions">
          <button className="btn-cancel" onClick={onCancel}>{cancelText}</button>
          <button className="btn-process" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? '↻ Đang xử lý' : confirmText}
          </button>
        </div>
      </div>
    </>
  )
}

export default ConfirmDialog