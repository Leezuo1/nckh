import { PublicClientApplication } from '@azure/msal-browser'

// Cấu hình lấy từ biến môi trường Vite (Website/.env):
//   VITE_MSAL_CLIENT_ID   = Application (client) ID của app đăng ký trên Azure/Entra
//   VITE_MSAL_TENANT_ID   = Directory (tenant) ID của trường (mặc định 'organizations')
//   VITE_MSAL_REDIRECT_URI= URL redirect (mặc định = origin hiện tại)
const clientId = import.meta.env.VITE_MSAL_CLIENT_ID
const tenantId = import.meta.env.VITE_MSAL_TENANT_ID || 'organizations'
const redirectUri = import.meta.env.VITE_MSAL_REDIRECT_URI || window.location.origin

// Chưa cấu hình clientId thì không khởi tạo (tránh crash); nút MS sẽ báo lỗi cấu hình.
export const isMicrosoftConfigured = !!clientId

export const msalInstance = clientId
  ? new PublicClientApplication({
      auth: {
        clientId,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        redirectUri,
      },
      cache: { cacheLocation: 'localStorage' },
    })
  : null

let initialized = false
async function ensureInit() {
  if (msalInstance && !initialized) {
    await msalInstance.initialize() // MSAL v3 bắt buộc initialize trước khi dùng
    initialized = true
  }
}

// Bắt đầu đăng nhập bằng REDIRECT: chuyển CẢ TRANG sang Microsoft rồi quay lại app.
// Dùng redirect (không popup) để tránh lỗi trình duyệt cắt liên kết opener (COOP) khiến popup treo.
export async function loginMicrosoftRedirect() {
  if (!msalInstance) {
    throw new Error('Chưa cấu hình Microsoft 365 (thiếu VITE_MSAL_CLIENT_ID)')
  }
  await ensureInit()
  await msalInstance.loginRedirect({ scopes: ['User.Read'], prompt: 'select_account' })
}

// URL hiện tại có phải là phản hồi đăng nhập Microsoft không? (MSAL trả code/token/error trên hash)
// App dùng BrowserRouter (route theo path) nên hash không bao giờ chứa 'code='/'token=' khi dùng bình thường.
export function hasMsalAuthResponse() {
  const h = window.location.hash || ''
  return h.includes('code=') || h.includes('error=') || h.includes('access_token=') || h.includes('id_token=')
}

// Xử lý phản hồi redirect khi app load lại, trả về access token (scope User.Read) nếu có.
export async function completeMicrosoftRedirect() {
  if (!msalInstance) return null
  await ensureInit()
  const result = await msalInstance.handleRedirectPromise()
  return result?.accessToken || null
}
