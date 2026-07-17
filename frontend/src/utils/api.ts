import axios from 'axios'

// In development: Point directly to localhost:3001 to avoid Vite proxy conflicts
// In production:  set VITE_API_URL=https://your-backend-domain.com in the env
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // On 401 from a protected route (not an auth endpoint), clear session and redirect
    const isAuthRoute = error.config?.url?.includes('/auth/')
    if (error.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      // Use assign rather than href to preserve browser history
      window.location.assign('/login')
    }
    return Promise.reject(error)
  }
)

export default api
