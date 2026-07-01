// ===== MAPPING API → UI =====
import i18n from '../i18n';

// Map trạng thái từ API sang ngôn ngữ hiện tại
export const mapTopicStatus = (status) => {
  if (!status) return ''
  return i18n.t(`status.${status}`, { defaultValue: status })
}

// Map trạng thái UI → API
export const mapStatusToApi = (status) => {
  const map = {
    'Chờ xét duyệt': 'Pending',
    'Đang Thực Hiện': 'InProgress',
    'Hoàn Thành': 'Done',
    'Hủy': 'Cancelled',
    'Pending review': 'Pending',
    'In progress': 'InProgress',
    'Done': 'Done',
    'Cancelled': 'Cancelled',
  }
  return map[status] || status
}

// Map role từ API sang ngôn ngữ hiện tại
export const mapUserRole = (role) => {
  if (!role) return ''
  // Có cả role User (Student/Lecturer/Admin) và TopicParticipantRole (Supervisor/Leader/Member/PendingMember)
  const supervisorRoles = {
    Supervisor: { vi: 'Giảng viên hướng dẫn', en: 'Supervisor' },
    Leader: { vi: 'Chủ nhiệm đề tài', en: 'Leader' },
    Member: { vi: 'Thành viên', en: 'Member' },
    PendingMember: { vi: 'Chờ duyệt', en: 'Pending member' },
  }
  if (supervisorRoles[role]) {
    return supervisorRoles[role][i18n.language === 'en' ? 'en' : 'vi']
  }
  // Role user (Student/Lecturer/Admin)
  return i18n.t(`profile.role.${role}`, { defaultValue: role })
}

// Format ngày từ ISO → dd/mm/yyyy hoặc mm/dd/yyyy theo locale
export const formatDate = (isoDate) => {
  if (!isoDate) return ''
  return new Date(isoDate).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'vi-VN')
}

export const mapTopicToCard = (topic) => {
  const supervisor = topic.topicParticipant?.find(p => p.topicParticipantRole === 'Supervisor')
  const leader = topic.topicParticipant?.find(p => p.topicParticipantRole === 'Leader')
  const mainPerson = supervisor || leader
  const isLate = !!topic.isLate

  return {
    id: topic.id,
    title: topic.topicName,
    // Khoa: ưu tiên của người đăng; nếu trống (vd Admin/GV đăng) → lấy của GV hướng dẫn/chủ nhiệm
    dept: topic.submitter?.faculty || mainPerson?.user?.faculty || '',
    date: formatDate(topic.deadline),
    poster: mainPerson?.user?.fullName || topic.submitter?.fullName || '',
    role: mapUserRole(mainPerson?.topicParticipantRole || ''),
    // Nếu đang Trễ thì badge hiển thị "Trễ"
    status: mapTopicStatus(isLate ? 'Late' : topic.status),
    statusKey: isLate ? 'Late' : topic.status,
    isLate,
    batch: `K${topic.year}`,
    _raw: topic,
  }
}

export const mapIdeaToCard = (idea) => ({
  id: idea.id,
  title: idea.topicName,
  dept: idea.submitter?.faculty || '',
  date: formatDate(idea.deadline),
  poster: idea.submitter?.fullName || '',
  role: i18n.t('profile.role.Student'),
  status: mapTopicStatus(idea.status),
  batch: `K${idea.year}`,
  _raw: idea,
})

export const mapUserToTable = (user) => ({
  id: user.id,
  ten: user.fullName,
  email: user.outlook,
  vaiTro: mapUserRole(user.role),
  vaiTroRaw: user.role, // role gốc (Student/Lecturer/Admin) để lọc không lệ thuộc ngôn ngữ
  maSV: user.userId,
  maGV: user.userId,
  trangThai: user.status === 'Active',
  ngayTao: user.created?.split('T')[0] || '',
})
