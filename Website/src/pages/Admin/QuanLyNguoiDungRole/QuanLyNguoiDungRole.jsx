import React, { useState, useEffect } from "react";
import toast from 'react-hot-toast';
import ThongKeNguoiDung from "../../../components/Admin/ThongKeNguoiDung";
import SearchBarGroupAdmin from "../../../components/Admin/SearchBarGroupAdmin";
import BangNguoiDung from "../../../components/Admin/BangNguoiDung";
import ThanhPhanTrangAdmin from "../../../components/Admin/ThanhPhanTrangAdmin";
import userService from "../../../services/userService";
import { mapUserToTable } from "../../../utils/mappers";
import '../QuanLyNguoiDung/QuanLyNguoiDung.css';

const ROLE_LABEL = {
  Student: 'Sinh Viên',
  Lecturer: 'Giảng Viên',
  FacultyOfficer: 'Cán bộ NCKH Khoa',
  DepartmentOfficer: 'Cán bộ Phòng NCKH',
  FacultyDean: 'Trưởng Khoa',
  Admin: 'Admin',
};

// Trang quản lý người dùng lọc theo 1 vai trò cố định (Cán bộ Khoa / Phòng / Trưởng Khoa...)
const QuanLyNguoiDungRole = ({ role, label, tenLoai = 'người dùng' }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tuKhoa, setTuKhoa] = useState("");
  const [trangThai, setTrangThai] = useState("all");
  const [trangHienTai, setTrangHienTai] = useState(1);
  const soMucMoiTrang = 5;
  const roleLabel = label || ROLE_LABEL[role] || 'Người dùng';

  useEffect(() => {
    setLoading(true);
    userService.getUsers()
      .then(users => setData(users.map(mapUserToTable).filter(u => u.vaiTroRaw === role)))
      .catch(err => console.error('Loi tai nguoi dung:', err))
      .finally(() => setLoading(false));
  }, [role]);

  const filteredData = data.filter(item => {
    const matchSearch = item.ten.toLowerCase().includes(tuKhoa.toLowerCase()) ||
                        (item.email || '').toLowerCase().includes(tuKhoa.toLowerCase());
    let matchTrangThai = true;
    if (trangThai === "hoat_dong") matchTrangThai = item.trangThai === true;
    if (trangThai === "vo_hieu") matchTrangThai = item.trangThai === false;
    return matchSearch && matchTrangThai;
  });

  useEffect(() => { setTrangHienTai(1); }, [tuKhoa, trangThai]);

  const indexOfLastItem = trangHienTai * soMucMoiTrang;
  const currentItems = filteredData.slice(indexOfLastItem - soMucMoiTrang, indexOfLastItem);

  const handleToggle = async (id) => {
    const user = data.find(item => item.id === id);
    try {
      await userService.updateUser(id, { status: user.trangThai ? 'Inactive' : 'Active' });
      setData(prev => prev.map(item => item.id === id ? { ...item, trangThai: !item.trangThai } : item));
      toast.success(user.trangThai ? 'Đã vô hiệu hóa tài khoản' : 'Đã kích hoạt tài khoản');
    } catch (err) { console.error(err); toast.error('Cập nhật trạng thái thất bại'); }
  };

  const handleEditRole = async (id, newRole) => {
    try {
      await userService.updateUser(id, { role: newRole });
      // Đổi role khác → bỏ khỏi danh sách trang này; giữ lại nếu vẫn cùng role
      setData(prev => newRole === role
        ? prev.map(item => item.id === id ? { ...item, vaiTro: ROLE_LABEL[newRole], vaiTroRaw: newRole } : item)
        : prev.filter(item => item.id !== id));
      toast.success(`Đã cập nhật vai trò thành ${ROLE_LABEL[newRole] || newRole}`);
    } catch (err) { console.error(err); toast.error('Cập nhật vai trò thất bại'); }
  };

  const handleDelete = async (id) => {
    try {
      await userService.deleteUser(id);
      setData(prev => prev.filter(item => item.id !== id));
      toast.success('Đã xóa người dùng');
    } catch (err) { console.error(err); toast.error('Xóa người dùng thất bại'); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>;

  return (
    <div className="khung-quan-ly-nguoi-dung">
      <ThongKeNguoiDung tong={data.length} roleView={roleLabel} />
      <SearchBarGroupAdmin
        tuKhoa={tuKhoa} setTuKhoa={setTuKhoa}
        trangThai={trangThai} setTrangThai={setTrangThai}
        hideRole={true}
      />
      <div className="vung-chua-bang-chinh">
        <BangNguoiDung
          data={currentItems}
          handleToggle={handleToggle}
          handleEditRole={handleEditRole}
          handleDelete={handleDelete}
        />
        <ThanhPhanTrangAdmin
          tongSoMuc={filteredData.length}
          soMucMoiTrang={soMucMoiTrang}
          trangHienTai={trangHienTai}
          datTrangHienTai={setTrangHienTai}
          tenLoaiMuc={tenLoai}
        />
      </div>
    </div>
  );
};

export default QuanLyNguoiDungRole;
