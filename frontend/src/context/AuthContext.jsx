import { createContext, useContext, useEffect, useState } from 'react'
import { authApi } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // ─── Charger utilisateur ───
  const loadUser = async () => {
    try {
      const res = await authApi.me()
      setUser(res.data)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) loadUser()
    else setLoading(false)
  }, [])

  // ─── LOGIN FIXED ───
  const login = async (email, password) => {
    const { data } = await authApi.loginVendeur({
      email,
      password,
    })

    // ✅ stocker tokens
    localStorage.setItem('access_token', data.access)
    localStorage.setItem('refresh_token', data.refresh)

    // ✅ charger user après login
    const userRes = await authApi.me()
    setUser(userRes.data)

    return userRes.data
  }

  // ─── LOGOUT ───
  const logout = async () => {
    try {
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        await authApi.logout(refresh)
      }
    } catch (e) {
      console.error(e)
    }

    localStorage.clear()
    setUser(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}