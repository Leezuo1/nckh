import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Trash2, X } from 'lucide-react';
import PopupxoaAdmin from './PopupxoaAdmin';
import userService from '../../services/userService';
import './BangNguoiDung.css';

const ROLES = [
  { value: 'Student', label: 'Sinh Viên' },
  { value: 'Lecturer', label: 'Giảng Viên' },
  { value: 'FacultyOfficer', label: 'Cán bộ NCKH Khoa' },
  { value: 'DepartmentOfficer', label: 'Cán bộ Phòng NCKH' },
  { value: 'FacultyDean', label: 'Trưởng Khoa' },
  { value: 'Admin', label: 'Admin' },
];

const BangNguoiDung = ({
  data = [],
  handleToggle,
  handleEditRole,
  handleDelete,
  isStudentView = false,
  isLecturerView = false,
}) => {
  const [editingUser, setEditingUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [deletePopup, setDeletePopup] = useState({ hienThi: false, id: null, ten: '' });

  const openEdit = (item) => {
    setEditingUser(item);
    setSelectedRole(item.vaiTroRaw || 'Student');
    setNewPassword('');
  };

  const closeEdit = () => {
    setEditingUser(null);
    setSelectedRole('');
    setNewPassword('');
  };

  const handleSave = async () => {
    if (handleEditRole) await handleEditRole(editingUser.id, selectedRole);
    closeEdit();
  };

  // Admin đặt lại mật khẩu cho user
  const handleResetPassword = async () => {
    if (newPassword.length < 6) { toast.error('Mật khẩu phải có ít nhất 6 ký tự'); return; }
    setSavingPw(true);
    try {
      await userService.setPassword(editingUser.id, newPassword);
      toast.success(`Đã đặt lại mật khẩu cho ${editingUser.ten}`);
      setNewPassword('');
    } catch { /* lỗi đã được interceptor axios báo toast, không toast lại tránh trùng */ }
    finally { setSavingPw(false); }
  };

  const openDelete = (item) => {
    setDeletePopup({ hienThi: true, id: item.id, ten: item.ten });
  };

  const confirmDelete = async () => {
    if (handleDelete) await handleDelete(deletePopup.id);
    setDeletePopup({ hienThi: false, id: null, ten: '' });
  };

  const renderAvatar = (name) => {
    if (!name) return "NA";
    try {
      const parts = name.trim().split(' ');
      return parts[parts.length - 1].substring(0, 2).toUpperCase();
    } catch (e) { return "NA"; }
  };

  if (!data || data.length === 0) {
    return <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Đang tải dữ liệu...</div>;
  }

  return (
    <>
      <div className="khung-bang-du-lieu">
        <table className="bang-nguoi-dung">
          <thead>
            <tr>
              <th className="cot-stt">STT</th>
              <th>HỌ TÊN</th>
              <th>EMAIL</th>
              {isStudentView && <th className="cot-ma-sv">MÃ SV</th>}
              {isLecturerView && <th className="cot-ma-gv">MÃ GV</th>}
              {!isStudentView && !isLecturerView && <th>VAI TRÒ</th>}
              <th>TRẠNG THÁI</th>
              <th>NGÀY TẠO</th>
              <th>HÀNH ĐỘNG</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={item.id || index}>
                <td className="cot-stt">{index + 1}</td>
                <td className="cot-ho-ten">
                  <div className="avatar-xanh">{renderAvatar(item.ten)}</div>
                  <span className="ten-nguoi-dung">{item.ten || "Chưa có tên"}</span>
                </td>
                <td className="cot-email">
                  {isStudentView ? `an.${item.maSV || 'xxxx'}@vanlanguni.vn` :
                   isLecturerView ? `an.${item.maGV || 'xxxx'}@vanlanguni.vn` :
                   (item.email || "N/A")}
                </td>
                {isStudentView && <td className="cot-ma-sv">{item.maSV || "N/A"}</td>}
                {isLecturerView && <td className="cot-ma-gv">{item.maGV || "N/A"}</td>}
                {!isStudentView && !isLecturerView && (
                  <td className="cot-vai-tro">
                    <span className={`badge-vai-tro ${(item.vaiTro || "").toLowerCase().replace(' ', '-')}`}>
                      {item.vaiTro || "Chưa định rõ"}
                    </span>
                  </td>
                )}
                <td className="cot-trang-thai">
                  <div className="cum-trang-thai">
                    <label className="nut-gat-switch">
                      <input
                        type="checkbox"
                        checked={item.trangThai || false}
                        onChange={() => handleToggle && handleToggle(item.id)}
                      />
                      <span className="thanh-truot"></span>
                    </label>
                    <span className={`chu-trang-thai ${item.trangThai ? "" : "vo-hieu"}`}>
                      {item.trangThai ? "Hoạt động" : "Vô hiệu"}
                    </span>
                  </div>
                </td>
                <td className="cot-ngay-tao">{item.ngayTao || "2024-01-01"}</td>
                <td className="cot-hanh-dong">
                  <button className="nut-sua" onClick={() => openEdit(item)}><Pencil size={18} /></button>
                  <button className="nut-xoa" onClick={() => openDelete(item)}><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* POPUP EDIT ROLE */}
      {editingUser && (
        <div className="popup-overlay" onClick={closeEdit}>
          <div className="popup-box" onClick={e => e.stopPropagation()}>
            <div className="popup-header">
              <h3>Chỉnh sửa người dùng</h3>
              <button className="popup-close" onClick={closeEdit}><X size={18} /></button>
            </div>
            <div className="popup-body">
              <p className="popup-name">{editingUser.ten}</p>
              <p className="popup-email">{editingUser.email}</p>
              <div className="popup-role-list">
                {ROLES.map(r => (
                  <label key={r.value} className={`popup-role-option ${selectedRole === r.value ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={selectedRole === r.value}
                      onChange={() => setSelectedRole(r.value)}
                    />
                    {r.label}
                  </label>
                ))}
              </div>

              {/* Đặt lại mật khẩu (Admin) */}
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>🔑 Đặt lại mật khẩu</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Mật khẩu mới (≥ 6 ký tự)"
                    style={{ flex: 1, padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
                  />
                  <button onClick={handleResetPassword} disabled={savingPw || newPassword.length < 6}
                    style={{ padding: '8px 14px', border: 'none', borderRadius: 6, fontWeight: 600, whiteSpace: 'nowrap', cursor: (savingPw || newPassword.length < 6) ? 'not-allowed' : 'pointer', background: (newPassword.length < 6) ? '#e5e7eb' : '#2563eb', color: (newPassword.length < 6) ? '#94a3b8' : '#fff' }}>
                    {savingPw ? 'Đang lưu...' : 'Đặt lại'}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Áp dụng cho đăng nhập bằng mật khẩu (MSSV/MSGV). Tài khoản Microsoft không dùng mật khẩu này.</div>
              </div>
            </div>
            <div className="popup-footer">
              <button className="popup-btn-cancel" onClick={closeEdit}>Hủy</button>
              <button className="popup-btn-save" onClick={handleSave}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP XÓA */}
      <PopupxoaAdmin
        hienThi={deletePopup.hienThi}
        tenMucXoa={deletePopup.ten}
        onDong={() => setDeletePopup({ hienThi: false, id: null, ten: '' })}
        onXacNhan={confirmDelete}
      />
    </>
  );
};

export default BangNguoiDung;