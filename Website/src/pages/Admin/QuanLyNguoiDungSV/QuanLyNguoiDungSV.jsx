import React, { useState, useEffect } from "react";
import toast from 'react-hot-toast';
import ThongKeNguoiDung from "../../../components/Admin/ThongKeNguoiDung";
import SearchBarGroupAdmin from "../../../components/Admin/SearchBarGroupAdmin";
import BangNguoiDung from "../../../components/Admin/BangNguoiDung";
import ThanhPhanTrangAdmin from "../../../components/Admin/ThanhPhanTrangAdmin";
import userService from "../../../services/userService";
import { mapUserToTable } from "../../../utils/mappers";
import './QuanLyNguoiDungSV.css';

const QuanLyNguoiDungSV = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tuKhoa, setTuKhoa] = useState("");
  const [trangThai, setTrangThai] = useState("all");
  const [trangHienTai, setTrangHienTai] = useState(1);
  const soMucMoiTrang = 5;

  useEffect(() => {
    userService.getStudents()
      .then(users => setData(users.map(mapUserToTable)))
      .catch(err => console.error('Loi tai sinh vien:', err))
      .finally(() => setLoading(false));
  }, []);

  const filteredData = data.filter(item => {
    const matchSearch = item.ten.toLowerCase().includes(tuKhoa.toLowerCase()) ||
                        item.maSV.includes(tuKhoa);
    let matchTrangThai = true;
    if (trangThai === "hoat_dong") matchTrangThai = item.trangThai === true;
    if (trangThai === "vo_hieu") matchTrangThai = item.trangThai === false;
    return matchSearch && matchTrangThai;
  });

  useEffect(() => { setTrangHienTai(1); }, [tuKhoa, trangThai]);

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
      const roleMap = { Student: 'Sinh Viên', Lecturer: 'Giảng Viên', Admin: 'Admin' };
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
      toast.success('Đã xóa sinh viên');
    } catch (err) {
      console.error('Loi xoa sinh vien:', err);
      toast.error('Xóa sinh viên thất bại');
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>;

  return (
    <div className="khung-quan-ly-sv-tong">
      <ThongKeNguoiDung tong={data.length} isStudentView={true} />
      <SearchBarGroupAdmin
        tuKhoa={tuKhoa} setTuKhoa={setTuKhoa}
        trangThai={trangThai} setTrangThai={setTrangThai}
        isStudentView={true}
      />
      <div className="vung-chua-bang-sv-trang">
        <BangNguoiDung
          data={currentItems}
          handleToggle={handleToggle}
          handleEditRole={handleEditRole}
          handleDelete={handleDelete}
          isStudentView={true}
        />
        <ThanhPhanTrangAdmin
          tongSoMuc={filteredData.length}
          soMucMoiTrang={soMucMoiTrang}
          trangHienTai={trangHienTai}
          datTrangHienTai={setTrangHienTai}
          tenLoaiMuc="sinh viên"
        />
      </div>
    </div>
  );
};

export default QuanLyNguoiDungSV;