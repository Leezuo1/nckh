import React, { useState, useEffect } from "react";
import toast from 'react-hot-toast';
import ThongKeNguoiDung from "../../../components/Admin/ThongKeNguoiDung";
import SearchBarGroupAdmin from "../../../components/Admin/SearchBarGroupAdmin";
import BangNguoiDung from "../../../components/Admin/BangNguoiDung";
import ThanhPhanTrangAdmin from "../../../components/Admin/ThanhPhanTrangAdmin";
import userService from "../../../services/userService";
import { mapUserToTable } from "../../../utils/mappers";
import './QuanLyNguoiDung.css';

const QuanLyNguoiDung = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tuKhoa, setTuKhoa] = useState("");
  const [vaiTro, setVaiTro] = useState("all");
  const [trangThai, setTrangThai] = useState("all");
  const [trangHienTai, setTrangHienTai] = useState(1);
  const soMucMoiTrang = 5;

  useEffect(() => {
    userService.getUsers()
      .then(users => setData(users.map(mapUserToTable)))
      .catch(err => console.error('Loi tai nguoi dung:', err))
      .finally(() => setLoading(false));
  }, []);

  const filteredData = data.filter(item => {
    const matchSearch = item.ten.toLowerCase().includes(tuKhoa.toLowerCase()) ||
                        item.email.toLowerCase().includes(tuKhoa.toLowerCase());
    const roleKeyMap = {
      sinh_vien: 'Student',
      giang_vien: 'Lecturer',
      can_bo_khoa: 'FacultyOfficer',
      can_bo_phong: 'DepartmentOfficer',
      truong_khoa: 'FacultyDean',
      admin: 'Admin',
    };
    const matchVaiTro = vaiTro === "all" || item.vaiTroRaw === roleKeyMap[vaiTro];
    let matchTrangThai = true;
    if (trangThai === "hoat_dong") matchTrangThai = item.trangThai === true;
    if (trangThai === "vo_hieu") matchTrangThai = item.trangThai === false;
    return matchSearch && matchVaiTro && matchTrangThai;
  });

  useEffect(() => { setTrangHienTai(1); }, [tuKhoa, vaiTro, trangThai]);

  const indexOfLastItem = trangHienTai * soMucMoiTrang;
  const indexOfFirstItem = indexOfLastItem - soMucMoiTrang;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  const handleToggle = async (id) => {
    const user = data.find(item => item.id === id);
    try {
      await userService.updateUser(id, { status: user.trangThai ? 'Inactive' : 'Active' });
      setData(prev => prev.map(item =>
        item.id === id ? { ...item, trangThai: !item.trangThai } : item
      ));
      toast.success(user.trangThai ? 'Đã vô hiệu hóa tài khoản' : 'Đã kích hoạt tài khoản');
    } catch (err) {
      console.error('Loi cap nhat trang thai:', err);
      toast.error('Cập nhật trạng thái thất bại');
    }
  };

  const handleEditRole = async (id, newRole) => {
    try {
      await userService.updateUser(id, { role: newRole });
      const roleMap = {
        Student: 'Sinh Viên',
        Lecturer: 'Giảng Viên',
        FacultyOfficer: 'Cán bộ NCKH Khoa',
        DepartmentOfficer: 'Cán bộ Phòng NCKH',
        FacultyDean: 'Trưởng Khoa',
        Admin: 'Admin',
      };
      setData(prev => prev.map(item =>
        item.id === id ? { ...item, vaiTro: roleMap[newRole], vaiTroRaw: newRole } : item
      ));
      toast.success(`Đã cập nhật vai trò thành ${roleMap[newRole]}`);
    } catch (err) {
      console.error('Loi doi vai tro:', err);
      toast.error('Cập nhật vai trò thất bại');
    }
  };

  const handleDelete = async (id) => {
    try {
      await userService.deleteUser(id);
      setData(prev => prev.filter(item => item.id !== id));
      toast.success('Đã xóa người dùng');
    } catch (err) {
      console.error('Loi xoa nguoi dung:', err);
      toast.error('Xóa người dùng thất bại');
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>;

  return (
    <div className="khung-quan-ly-nguoi-dung">
      <ThongKeNguoiDung
        tong={data.length}
        sinhVien={data.filter(i => i.vaiTro === "Sinh Viên").length}
        giangVien={data.filter(i => i.vaiTro === "Giảng Viên").length}
        quanTri={data.filter(i => i.vaiTro === "Admin").length}
      />
      <SearchBarGroupAdmin
        tuKhoa={tuKhoa} setTuKhoa={setTuKhoa}
        vaiTro={vaiTro} setVaiTro={setVaiTro}
        trangThai={trangThai} setTrangThai={setTrangThai}
        isStudentView={false}
      />
      <div className="vung-chua-bang-chinh">
        <BangNguoiDung
          data={currentItems}
          handleToggle={handleToggle}
          handleEditRole={handleEditRole}
          handleDelete={handleDelete}
          isStudentView={false}
        />
        <ThanhPhanTrangAdmin
          tongSoMuc={filteredData.length}
          soMucMoiTrang={soMucMoiTrang}
          trangHienTai={trangHienTai}
          datTrangHienTai={setTrangHienTai}
          tenLoaiMuc="người dùng"
        />
      </div>
    </div>
  );
};

export default QuanLyNguoiDung;