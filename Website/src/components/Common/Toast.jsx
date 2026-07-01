import { useEffect } from 'react'
import './Toast.css'

const Toast = ({ message, onClose }) => {
  // Tự động đóng sau 3 giây
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="toast">
       {message}
    </div>
  )
}

export default Toast