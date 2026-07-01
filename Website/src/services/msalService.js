import { PublicClientApplication } from '@azure/msal-browser'

// Cấu hình lấy từ biến môi trường Vite (Website/.env):
//   VITE_MSAL_CLIENT_ID   = Application (client) ID của app đăng ký trên Azure/Entra
//   VITE_MSAL_TENANT_ID   = Directory (tenant) ID của trường (mặc định 'organizations')
//   VITE_MSAL_REDIRECT_URI= URL redirect (mặc định = origin hiện tại, vd http://localhost:5173)
const clientId = import.meta.env.VITE_MSAL_CLIENT_ID
const tenantId = import.meta.env.VITE_MSAL_TENANT_ID || 'organizations'
const redirectUri = import.meta.env.VITE_MSAL_REDIRECT_URI || window.location.origin

// Chưa cấu hình clientId thì không khởi tạo (tránh crash); nút MS sẽ báo lỗi cấu hình.
export const isMicrosoftConfigured = !!clientId

const msalInstance = clientId
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

// Mở popup đăng nhập Microsoft 365, trả về access token (scope User.Read cho Microsoft Graph).
// Backend dùng token này gọi Graph /me để lấy email → xác thực.
export async function loginMicrosoftPopup() {
  if (!msalInstance) {
    throw new Error('Chưa cấu hình Microsoft 365 (thiếu VITE_MSAL_CLIENT_ID trong Website/.env)')
  }
  if (!initialized) {
    await msalInstance.initialize() // MSAL v3 bắt buộc initialize trước khi login
    initialized = true
  }
  const result = await msalInstance.loginPopup({
    scopes: ['User.Read'],
    prompt: 'select_account',
  })
  return result.accessToken
}
