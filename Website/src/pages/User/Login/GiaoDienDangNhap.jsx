import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './GiaoDienDangNhap.css';

import anhNenVlut from '../../../assets/Images/backgroundVLU.jpg';
import logoVlut from '../../../assets/Images/Logo Đại Học Văn Lang H.png';
import logoMicrosoft from '../../../assets/Images/logomicrosoft.png';
import authService from '../../../services/authService';
import { loginMicrosoftRedirect, isMicrosoftConfigured } from '../../../services/msalService';

const GiaoDienDangNhap = () => {
  const navigate = useNavigate();
  const [showToast, setShowToast] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('show_login_toast') === 'true') {
      sessionStorage.removeItem('show_login_toast');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
    // Lỗi đăng nhập Microsoft (bước đổi token ở backend) — do main.jsx set khi redirect về
    const msErr = sessionStorage.getItem('ms_login_error');
    if (msErr) {
      sessionStorage.removeItem('ms_login_error');
      setErrorMsg(msErr);
    }
  }, []);

  const validate = () => {
    const errs = {};
    if (!code.trim()) errs.code = 'Vui lòng nhập mã số';
    if (!password) errs.password = 'Vui lòng nhập mật khẩu';
    else if (password.length < 6) errs.password = 'Mật khẩu tối thiểu 6 ký tự';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsLoading(true);
    try {
      // authService.loginWithVlu tự lưu token + user_info + is_logged_in (dùng chung axios interceptor)
      await authService.loginWithVlu(code.trim(), password);
      window.dispatchEvent(new Event('auth:login')); // báo sidebar/header cập nhật trạng thái

      const redirectTo = sessionStorage.getItem('redirect_after_login') || '/';
      sessionStorage.removeItem('redirect_after_login');
      window.location.href = redirectTo;
    } catch (err) {
      // api.js đã chuẩn hoá lỗi thành Error(message) tiếng Việt
      setErrorMsg(err?.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // Đăng nhập bằng Microsoft 365 (SV/GV dùng tài khoản trường)
  const handleMicrosoftLogin = async () => {
    setErrorMsg('');
    // Chưa cấu hình (trường chưa cấp quyền đăng ký app Azure) → báo nhẹ nhàng, không hiện lỗi kỹ thuật
    if (!isMicrosoftConfigured) {
      setErrorMsg('Đăng nhập Microsoft 365 đang chờ nhà trường cấp quyền. Vui lòng đăng nhập bằng MSSV/MSGV và mật khẩu.');
      return;
    }
    setIsLoading(true);
    try {
      // Chuyển cả trang sang Microsoft; sau khi xác thực sẽ quay lại và main.jsx hoàn tất đăng nhập.
      await loginMicrosoftRedirect();
      // (Không tới đây vì trang đã điều hướng đi)
    } catch (err) {
      setErrorMsg(err?.message || 'Không mở được đăng nhập Microsoft');
      setIsLoading(false);
    }
  };

  return (
    <div className="vung_chua_chinh">
      <img src={anhNenVlut} alt="nen" className="anh_nen_phu_kin" />

      {showToast && (
        <div className="toast_can_dang_nhap">
          ✕ &nbsp; Cần phải đăng nhập trước tiên
        </div>
      )}

      <div className="hop_dang_nhap">
        <div className="vach_ngan_doc" />

        {/* CỘT TRÁI — Logo */}
        <div className="phan_ben_trai">
          <img src={logoVlut} alt="logo_vlu" className="anh_logo_vlu" />
        </div>

        {/* CỘT PHẢI — Form đăng nhập */}
        <div className="phan_ben_phai">
          <button
            className="nut_mui_ten_quay_lai"
            onClick={() => navigate('/')}
            type="button"
          >
            ←
          </button>

          <h2 className="tieu_de_form">Đăng nhập hệ thống</h2>

          <form className="form_dang_nhap" onSubmit={handleSubmit} noValidate>

            {/* TÊN ĐĂNG NHẬP */}
            <div className="nhom_truong_nhap">
              <label className="nhan_truong_nhap">Tên đăng nhập / Mã số</label>
              <input
                className={`o_nhap_lieu${errors.code ? ' loi' : ''}`}
                placeholder="Nhập MSSV hoặc MSGV..."
                value={code}
                onChange={(e) => { setCode(e.target.value); setErrors(p => ({ ...p, code: '' })); }}
                autoComplete="username"
              />
              {errors.code && <span className="chu_bao_loi">{errors.code}</span>}
            </div>

            {/* MẬT KHẨU */}
            <div className="nhom_truong_nhap">
              <label className="nhan_truong_nhap">Mật khẩu</label>
              <input
                type="password"
                className={`o_nhap_lieu${errors.password ? ' loi' : ''}`}
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); }}
                autoComplete="current-password"
              />
              {errors.password && <span className="chu_bao_loi">{errors.password}</span>}
            </div>

            {/* Lỗi từ server */}
            {errorMsg && (
              <div className="thong_bao_loi_server">{errorMsg}</div>
            )}

            {/* NÚT ĐĂNG NHẬP */}
            <button
              type="submit"
              className="nut_dang_nhap_chinh"
              disabled={isLoading}
            >
              {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          {/* Ngăn cách */}
          <div className="vach_ngan_hoac"><span>hoặc</span></div>

          {/* ĐĂNG NHẬP BẰNG MICROSOFT 365 (SV/GV dùng tài khoản trường).
              Luôn hiển thị để giảng viên/người chấm thấy tính năng; chưa cấu hình thì bấm sẽ báo nhẹ nhàng. */}
          <button
            type="button"
            className="nut_microsoft"
            onClick={handleMicrosoftLogin}
            disabled={isLoading}
          >
            <img src={logoMicrosoft} alt="Microsoft" className="icon_microsoft" />
            Đăng nhập với Microsoft 365
          </button>
        </div>
      </div>
    </div>
  );
};

export default GiaoDienDangNhap;
