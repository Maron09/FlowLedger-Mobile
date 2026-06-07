import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const API_URL = 'https://flowledger-backend-bi3a.onrender.com'

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
})

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = await AsyncStorage.getItem('refreshToken')
      if (!refreshToken) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken'])
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken })
        await AsyncStorage.setItem('accessToken', data.accessToken)
        await AsyncStorage.setItem('refreshToken', data.refreshToken)
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
        return api(originalRequest)
      } catch {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken'])
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

export default api