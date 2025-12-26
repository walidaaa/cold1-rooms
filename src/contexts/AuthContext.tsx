"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { authApi, type User, clearTokens, getAccessToken } from "@/lib/api"

const DATA_CACHE_KEY = "cold-room-data-cache"

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    const token = getAccessToken()
    const storedUser = authApi.getCurrentUser()

    if (token && storedUser) {
      setUser(storedUser)
    }
    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      try {
        sessionStorage.removeItem(DATA_CACHE_KEY)
      } catch {
        // Ignore storage errors
      }

      const response = await authApi.login(username, password)
      setUser(response.user)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message || "Login failed" }
    }
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch {
      // Continue with logout even if API fails
    } finally {
      setUser(null)
      clearTokens()
      try {
        sessionStorage.removeItem(DATA_CACHE_KEY)
        localStorage.removeItem("cold-room-user")
      } catch {
        // Ignore storage errors
      }
    }
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
