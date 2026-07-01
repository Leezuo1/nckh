import './IdeaCard.css'

const IdeaCard = ({ title, dept, date, poster, role, status, bgImage, onClick }) => {
  return (
    <div className="idea-card" onClick={onClick}>
      {/* Nền navy hoặc ảnh nếu có */}
      <div
        className="card-header"
        style={bgImage ? {
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : {}}
      >
        <h3 className="card-title">{title}</h3>
      </div>

      {/* Phần dưới: Thông tin chi tiết */}
      <div className="card-info">
        <div className="row-dept-date">
          <span className="dept-name">Khoa: <strong>{dept}</strong></span>
          <span className="post-date">{date}</span>
        </div>

        <div className="row-poster">
          <div className="poster-info">
            <span>Người đăng: {poster}</span>
            <span>Vai trò: {role}</span>
          </div>
          {/* Badge trạng thái */}
          <span className={`status-badge ${getStatusClass(status)}`}>
            • {status}
          </span>
        </div>
      </div>
    </div>
  )
}

// Hàm xác định màu badge theo trạng thái
const getStatusClass = (status) => {
  switch (status) {
    case 'Chờ xét duyệt':  return 'pending'
    case 'Chờ bắt đầu':    return 'waiting'
    case 'Hủy':            return 'cancelled'
    case 'Đang Thực Hiện': return 'in-progress'
    case 'Trễ':            return 'late'
    case 'Báo Cáo':        return 'reporting'
    case 'Chỉnh Sửa':      return 'editing'
    case 'Nghiệm Thu':     return 'completed'
    case 'Hoàn Thành':     return 'completed'
    default:               return 'pending'
  }
}

export default IdeaCard