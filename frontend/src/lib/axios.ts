import axios from "axios"
import { getToken } from "./auth"

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
})

// Add auth token to every request
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("bluemoon_token")
      localStorage.removeItem("bluemoon_user")
      window.location.href = "/login"
    }
    return Promise.reject(error)
  }
)
