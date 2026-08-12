// Đăng nhập Microsoft 365 — luồng AUTHORIZATION CODE (confidential, xử lý ở backend).
// FE chỉ chuyển hướng người dùng tới Microsoft để lấy "code", rồi gửi code về backend;
// backend đổi code -> token bằng ClientSecret. Cách này chạy với redirect loại "Web"
// (không cần đăng ký SPA), nên tránh lỗi AADSTS9002326.
//
// Biến môi trường (Website/.env):
//   VITE_MSAL_CLIENT_ID    = Application (client) ID của app
//   VITE_MSAL_TENANT_ID    = Directory (tenant) ID
//   VITE_MSAL_REDIRECT_URI = (tuỳ chọn) URL redirect; để trống = origin hiện tại
const clientId = import.meta.env.VITE_MSAL_CLIENT_ID
const tenantId = import.meta.env.VITE_MSAL_TENANT_ID || 'organizations'
const redirectUri = import.meta.env.VITE_MSAL_REDIRECT_URI || window.location.origin

export const isMicrosoftConfigured = !!clientId

export function getRedirectUri() {
  return redirectUri
}

// Chuyển cả trang sang Microsoft để đăng nhập và lấy authorization code (trả về qua ?code=...).
export function loginMicrosoftRedirect() {
  if (!clientId) throw new Error('Chưa cấu hình Microsoft 365 (thiếu VITE_MSAL_CLIENT_ID)')
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    response_mode: 'query',
    scope: 'openid profile email User.Read',
    prompt: 'select_account',
    state: Math.random().toString(36).slice(2),
  })
  window.location.href = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`
}

// Đọc kết quả Microsoft trả về trên query (?code=... hoặc ?error=...).
export function getMicrosoftRedirectResult() {
  const p = new URLSearchParams(window.location.search)
  return {
    code: p.get('code'),
    error: p.get('error'),
    errorDescription: p.get('error_description'),
  }
}
