// API Configuration
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    console.log("[v0] Using VITE_API_BASE_URL:", import.meta.env.VITE_API_BASE_URL)
    return import.meta.env.VITE_API_BASE_URL
  }

  const hostname = window.location.hostname

  // If accessed via domain, default to local network IP (port 3000 not publicly forwarded)
  if (hostname === "192.168.1.110") {
    const fallbackUrl = "http://192.168.1.110:3000/api"
    console.log("[v0] Domain detected, using local network IP:", fallbackUrl)
    return fallbackUrl
  }

  // For local access (localhost or local IPs), use same hostname
  const autoUrl = `http://${hostname}:3000/api`
  console.log("[v0] Auto-detected API URL:", autoUrl)
  return autoUrl
}

const API_BASE_URL = getApiBaseUrl()
console.log("[v0] Final API_BASE_URL:", API_BASE_URL)

// Token management
export const getAccessToken = () => localStorage.getItem("cold-room-token")
export const getRefreshToken = () => localStorage.getItem("cold-room-refresh")
export const setTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem("cold-room-token", accessToken)
  localStorage.setItem("cold-room-refresh", refreshToken)
}
export const clearTokens = () => {
  localStorage.removeItem("cold-room-token")
  localStorage.removeItem("cold-room-refresh")
  localStorage.removeItem("cold-room-user")
}

// Types matching backend API
export type Role = "SUPER_ADMIN" | "ADMIN" | "USER"
export type AlertType = "TEMPERATURE" | "HUMIDITY" | "DOOR" | "POWER" | "SENSOR"
export type AlertStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED"
export type RoomStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE"
export type SmsStatus = "SENT" | "DELIVERED" | "FAILED" | "PENDING"

export interface User {
  id: number
  name: string
  username: string
  role: Role
  smsEnabled: boolean
  assignedRoomIds?: number[]
  phones?: UserPhone[]
  createdAt: string
  updatedAt?: string
}

export interface UserPhone {
  id?: number
  phone_number: string
  is_primary: boolean
  assigned_rooms?: number[]
}

export interface Room {
  id: number
  name: string
  hardwareId?: string
  status: RoomStatus
  temperature?: number
  humidity?: number
  tempMin: number
  tempMax: number
  humidityMin: number
  humidityMax: number
  lastReading?: string
  isOnline?: boolean // Add isOnline field
  location?: string
  activeAlerts?: number
  acInput1?: number // Hardware value (0 or 1)
  acInput2?: number // Hardware value (0 or 1)
  acInput1Alert?: number // Alert activation (0 = no alerts, 1 = activate alerts)
  acInput2Alert?: number // Alert activation (0 = no alerts, 1 = activate alerts)
  acInput1Name?: string // Added custom AC input names
  acInput2Name?: string
  gpsLatitude?: number
  gpsLongitude?: number
  createdAt?: string
  updatedAt?: string
}

export interface Alert {
  id: number
  roomId: number
  type: AlertType
  status: AlertStatus
  message: string
  value?: number
  threshold?: number
  createdAt: string
  acknowledgedAt?: string
  resolvedAt?: string
  acknowledgedBy?: number
  resolvedBy?: number
  acknowledgedByName?: string
  resolvedByName?: string
  room?: { id: number; name: string }
}

export interface SmsLog {
  id: number
  alertId?: number
  userId: number
  phoneNumber: string
  message: string
  status: SmsStatus
  sentAt: string
  deliveredAt?: string
  errorMessage?: string
  room?: { id: number; name: string }
  user?: { id: number; username: string }
}

export interface AlertHistory {
  id: number
  alertId: number
  previousStatus: string
  newStatus: string
  changedBy: number
  changedByName: string
  changeReason: string
  createdAt: string
  roomId?: number
  roomName?: string
  alertType?: string
  alertMessage?: string
}

export interface DashboardStats {
  totalRooms: number
  activeRooms: number
  criticalRooms: number
  activeAlerts: number
  roomsInAlert: number
  totalUsers: number
  smsSentToday: number
  averageTemperature?: number
  systemStatus: "operational" | "degraded" | "down"
}

export interface RoomOverview {
  id: number
  name: string
  status: RoomStatus
  temperature?: number
  humidity?: number
  activeAlerts: number
  isOnline?: boolean // Added isOnline field for device status
  lastReading?: string // Added lastReading timestamp
  tempMin?: number // Added threshold fields to RoomOverview interface
  tempMax?: number
  humidityMin?: number
  humidityMax?: number
  acInput1?: number
  acInput2?: number
  gpsLatitude?: number // Added GPS coordinates to RoomOverview
  gpsLongitude?: number // Added GPS coordinates to RoomOverview
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: User
  expiresIn: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface Reading {
  id: number
  roomId: number
  temperature: number
  humidity: number
  recordedAt: string
}

// API Error class
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isNetworkError = false,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

// Helper function to transform user data from backend (snake_case) to frontend (camelCase)
function transformUser(user: any): User {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    smsEnabled: user.sms_enabled ?? user.smsEnabled ?? false,
    assignedRoomIds: user.assigned_rooms ?? user.assignedRoomIds ?? [],
    phones: user.phones?.map((phone: any) => ({
      id: phone.id,
      phone_number: phone.phone_number,
      is_primary: phone.is_primary,
      assigned_rooms: phone.assigned_rooms,
    })),
    createdAt: user.created_at ?? user.createdAt,
    updatedAt: user.updated_at ?? user.updatedAt,
  }
}

function transformUsers(response: any): PaginatedResponse<User> {
  return {
    ...response,
    data: response.data.map(transformUser),
  }
}

let isRateLimited = false
let rateLimitResetTime = 0

let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 500 // 500ms minimum between ANY requests

const responseCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5000 // 5 second cache

function getCachedResponse<T>(key: string): T | null {
  const cached = responseCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T
  }
  responseCache.delete(key)
  return null
}

function setCachedResponse(key: string, data: any) {
  responseCache.set(key, { data, timestamp: Date.now() })
}

async function waitForRateLimit(): Promise<void> {
  if (isRateLimited) {
    const waitTime = rateLimitResetTime - Date.now()
    if (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }
    isRateLimited = false
  }

  // Enforce minimum interval between requests
  const timeSinceLastRequest = Date.now() - lastRequestTime
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest))
  }
  lastRequestTime = Date.now()
}

let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback)
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((callback) => callback(token))
  refreshSubscribers = []
}

async function fetchOnce(url: string, options: RequestInit, timeout = 15000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (response.status === 429) {
      isRateLimited = true
      rateLimitResetTime = Date.now() + 30000 // Wait 30 seconds
      throw new ApiError(429, "Rate limited - please wait", false)
    }

    return response
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === "AbortError") {
      throw new ApiError(0, "Request timeout", true)
    }
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(0, "Network error - unable to connect", true)
  }
}

// Fetch wrapper with auth
async function fetchWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  await waitForRateLimit()

  const token = getAccessToken()

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  }

  if (token) {
    ;(headers as Record<string, string>)["Authorization"] = `Bearer ${token}`
  }

  const response = await fetchOnce(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  // Handle token refresh on 401
  if (response.status === 401 && getRefreshToken()) {
    if (isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        subscribeTokenRefresh(async (newToken) => {
          ;(headers as Record<string, string>)["Authorization"] = `Bearer ${newToken}`
          try {
            await waitForRateLimit()
            const retryResponse = await fetchOnce(`${API_BASE_URL}${endpoint}`, {
              ...options,
              headers,
            })
            if (!retryResponse.ok) {
              const error = await retryResponse.json().catch(() => ({ message: "Request failed" }))
              reject(new ApiError(retryResponse.status, error.message || error.error))
            } else {
              resolve(retryResponse.json())
            }
          } catch (err) {
            reject(err)
          }
        })
      })
    }

    isRefreshing = true
    const refreshed = await refreshAccessToken()
    isRefreshing = false

    if (refreshed) {
      const newToken = getAccessToken()!
      onTokenRefreshed(newToken)
      ;(headers as Record<string, string>)["Authorization"] = `Bearer ${newToken}`
      await waitForRateLimit()
      const retryResponse = await fetchOnce(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      })
      if (!retryResponse.ok) {
        const error = await retryResponse.json().catch(() => ({ message: "Request failed" }))
        throw new ApiError(retryResponse.status, error.message || error.error)
      }
      return retryResponse.json()
    }
    clearTokens()
    window.location.href = "/login"
    throw new ApiError(401, "Session expired")
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }))
    throw new ApiError(response.status, error.message || error.error)
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T
  }

  return response.json()
}

// Refresh token
async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false

  try {
    await waitForRateLimit()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      const data = await response.json()
      localStorage.setItem("cold-room-token", data.accessToken)
      return true
    }
  } catch {
    // Refresh failed
  }
  return false
}

// Auth API
export const authApi = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Login failed")
      }

      const data: LoginResponse = await response.json()
      setTokens(data.accessToken, data.refreshToken)
      localStorage.removeItem("cold-room-user")
      localStorage.setItem("cold-room-user", JSON.stringify(data.user))
      return data
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === "AbortError") {
        throw new ApiError(0, "Login timeout - backend may be unavailable", true)
      }
      throw error
    }
  },

  logout: async (): Promise<void> => {
    try {
      await fetchWithAuth("/auth/logout", { method: "POST" })
    } finally {
      clearTokens()
      localStorage.removeItem("cold-room-user")
    }
  },

  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem("cold-room-user")
    return userStr ? JSON.parse(userStr) : null
  },
}

// Users API
export const usersApi = {
  getAll: async (page = 1, limit = 100) => {
    console.log("[v0] usersApi.getAll - Fetching users")
    const response = await fetchWithAuth<any>(`/users?page=${page}&limit=${limit}`)
    console.log("[v0] usersApi.getAll - Raw response:", response)
    const transformed = transformUsers(response)
    console.log("[v0] usersApi.getAll - Transformed:", transformed)
    return transformed
  },

  getById: async (id: number) => {
    const response = await fetchWithAuth<any>(`/users/${id}`)
    return transformUser(response)
  },

  create: async (data: {
    name: string
    username: string
    password: string
    role: Role
    smsEnabled: boolean
    assignedRoomIds?: number[]
    phones?: Array<{ phone_number: string; is_primary?: boolean; assigned_rooms?: number[] }>
  }) => {
    const response = await fetchWithAuth<any>("/users", {
      method: "POST",
      body: JSON.stringify({
        name: data.name,
        username: data.username,
        password: data.password,
        role: data.role,
        smsEnabled: data.smsEnabled,
        assignedRoomIds: data.assignedRoomIds || [],
        phones: data.phones?.map((phone) => ({
          phone_number: phone.phone_number,
          is_primary: phone.is_primary,
          assigned_rooms: phone.assigned_rooms,
        })),
      }),
    })
    return transformUser(response)
  },

  update: async (id: number, data: Partial<User> & { assignedRoomIds?: number[]; phones?: UserPhone[] }) => {
    const response = await fetchWithAuth<any>(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: data.name,
        username: data.username,
        role: data.role,
        smsEnabled: data.smsEnabled,
        assignedRoomIds: data.assignedRoomIds,
        phones: data.phones?.map((phone) => ({
          phone_number: phone.phone_number,
          is_primary: phone.is_primary,
          assigned_rooms: phone.assigned_rooms,
        })),
      }),
    })
    return transformUser(response)
  },

  delete: async (id: number) => {
    await waitForRateLimit()

    const token = getAccessToken()
    const headers: HeadersInit = {}

    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    const response = await fetchOnce(`${API_BASE_URL}/users/${id}`, {
      method: "DELETE",
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to delete user" }))
      throw new ApiError(response.status, error.message || error.error || "Cannot delete user - may have dependencies")
    }

    // Clear cache
    responseCache.clear()
  },

  getPhones: (userId: number) => fetchWithAuth<UserPhone[]>(`/users/${userId}/phones`),

  addPhone: (userId: number, data: { phone_number: string; is_primary?: boolean }) =>
    fetchWithAuth<UserPhone>(`/users/${userId}/phones`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updatePhone: (userId: number, phoneId: number, data: Partial<UserPhone>) =>
    fetchWithAuth<UserPhone>(`/users/${userId}/phones/${phoneId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deletePhone: (userId: number, phoneId: number) =>
    fetchWithAuth<void>(`/users/${userId}/phones/${phoneId}`, { method: "DELETE" }),
}

// SMS API
export const smsApi = {
  getAll: (params?: {
    status?: SmsStatus
    userId?: number
    alertId?: number
    page?: number
    limit?: number
    from?: string
    to?: string
  }) => {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.append("status", params.status)
    if (params?.userId) searchParams.append("userId", params.userId.toString())
    if (params?.alertId) searchParams.append("alertId", params.alertId.toString())
    if (params?.page) searchParams.append("page", params.page.toString())
    if (params?.limit) searchParams.append("limit", params.limit.toString())
    if (params?.from) searchParams.append("from", params.from)
    if (params?.to) searchParams.append("to", params.to)
    return fetchWithAuth<PaginatedResponse<SmsLog>>(`/sms?${searchParams.toString()}`)
  },

  getById: (id: number) => fetchWithAuth<SmsLog>(`/sms/${id}`),

  sendTest: (phoneNumber: string, message: string) =>
    fetchWithAuth<SmsLog>("/sms", {
      method: "POST",
      body: JSON.stringify({ phoneNumber, message }),
    }),
}

export const healthApi = {
  check: async () => {
    if (isRateLimited && Date.now() < rateLimitResetTime) {
      throw new ApiError(429, "Rate limited", false)
    }

    await waitForRateLimit()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      const response = await fetch(`${API_BASE_URL.replace("/api", "")}/health`, {
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      return response.json()
    } catch (error: any) {
      clearTimeout(timeoutId)
      throw new ApiError(0, "Health check failed", true)
    }
  },
}

export const isApiRateLimited = () => isRateLimited && Date.now() < rateLimitResetTime

// Dashboard API with caching
export const dashboardApi = {
  getStats: async () => {
    const cacheKey = "dashboard-stats"
    const cached = getCachedResponse<DashboardStats>(cacheKey)
    if (cached) return cached

    const result = await fetchWithAuth<DashboardStats>("/dashboard/stats")
    setCachedResponse(cacheKey, result)
    return result
  },
  getRoomsOverview: async () => {
    const cacheKey = "dashboard-rooms"
    const cached = getCachedResponse<{ rooms: RoomOverview[] }>(cacheKey)
    if (cached) return cached

    const result = await fetchWithAuth<{ rooms: RoomOverview[] }>("/dashboard/rooms-overview")
    setCachedResponse(cacheKey, result)
    return result
  },
}

// Rooms API with caching
export const roomsApi = {
  getAll: async (page = 1, limit = 100) => {
    const cacheKey = `rooms-${page}-${limit}`
    const cached = getCachedResponse<PaginatedResponse<Room>>(cacheKey)
    if (cached) return cached

    const result = await fetchWithAuth<PaginatedResponse<Room>>(`/rooms?page=${page}&limit=${limit}`)
    setCachedResponse(cacheKey, result)
    return result
  },

  getById: (id: number) => fetchWithAuth<Room>(`/rooms/${id}`),

  create: (data: Partial<Room>) =>
    fetchWithAuth<Room>("/rooms", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<Room>) => {
    return fetchWithAuth<Room>(`/rooms/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  delete: async (id: number) => {
    const result = await fetchWithAuth<void>(`/rooms/${id}`, { method: "DELETE" })
    responseCache.delete("rooms-1-100")
    responseCache.delete("dashboard-stats")
    responseCache.delete("dashboard-rooms")
    return result
  },

  getReadings: (id: number, params?: { from?: string; to?: string; limit?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.from) searchParams.append("from", params.from)
    if (params?.to) searchParams.append("to", params.to)
    if (params?.limit) searchParams.append("limit", params.limit.toString())
    else searchParams.append("limit", "100")

    const queryString = searchParams.toString()
    return fetchWithAuth<Reading[]>(`/rooms/${id}/readings${queryString ? `?${queryString}` : ""}`)
  },

  getAlerts: (id: number) => fetchWithAuth<Alert[]>(`/rooms/${id}/alerts`),

  // Removed toggleAcAlert function - use updateRoom through Configure dialog instead
}

// Alerts API with caching
export const alertsApi = {
  getAll: async (params?: {
    status?: AlertStatus
    type?: AlertType
    roomId?: number
    page?: number
    limit?: number
    from?: string
    to?: string
  }) => {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.append("status", params.status)
    if (params?.type) searchParams.append("type", params.type)
    if (params?.roomId) searchParams.append("roomId", params.roomId.toString())
    if (params?.page) searchParams.append("page", params.page.toString())
    if (params?.limit) searchParams.append("limit", params.limit.toString())
    if (params?.from) searchParams.append("from", params.from)
    if (params?.to) searchParams.append("to", params.to)
    const queryString = searchParams.toString()

    const cacheKey = `alerts-all`
    const cached = getCachedResponse<PaginatedResponse<Alert>>(cacheKey)
    if (cached) return cached

    const result = await fetchWithAuth<PaginatedResponse<Alert>>(`/alerts?${queryString}`)
    setCachedResponse(cacheKey, result)
    return result
  },

  getHistory: async (params?: {
    alertId?: number
    from?: string
    to?: string
    page?: number
    limit?: number
  }) => {
    const searchParams = new URLSearchParams()
    if (params?.alertId) searchParams.append("alertId", params.alertId.toString())
    if (params?.from) searchParams.append("from", params.from)
    if (params?.to) searchParams.append("to", params.to)
    if (params?.page) searchParams.append("page", params.page.toString())
    if (params?.limit) searchParams.append("limit", params.limit.toString())
    const queryString = searchParams.toString()

    const cacheKey = `alerts-history-${queryString}`
    const cached = getCachedResponse<PaginatedResponse<AlertHistory>>(cacheKey)
    if (cached) return cached

    const result = await fetchWithAuth<PaginatedResponse<AlertHistory>>(`/alerts/history?${queryString}`)
    setCachedResponse(cacheKey, result)
    return result
  },

  getById: (id: number) => fetchWithAuth<Alert>(`/alerts/${id}`),

  acknowledge: async (id: number) => {
    const result = await fetchWithAuth<Alert>(`/alerts/${id}/acknowledge`, { method: "POST" })
    // Clear alerts cache
    responseCache.delete("alerts-all")
    responseCache.delete("dashboard-stats")
    return result
  },

  resolve: async (id: number) => {
    const result = await fetchWithAuth<Alert>(`/alerts/${id}/resolve`, { method: "POST" })
    // Clear alerts cache
    responseCache.delete("alerts-all")
    responseCache.delete("dashboard-stats")
    return result
  },

  updateStatus: async (id: number, status: AlertStatus) => {
    const result = await fetchWithAuth<Alert>(`/alerts/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    })
    // Clear alerts cache
    responseCache.delete("alerts-all")
    return result
  },
}

// Export API functions for CSV downloads
export const exportApi = {
  downloadReadingsCSV: async (params?: { from?: string; to?: string; roomId?: number }) => {
    await waitForRateLimit()
    const token = getAccessToken()

    const searchParams = new URLSearchParams()
    if (params?.from) searchParams.append("from", params.from)
    if (params?.to) searchParams.append("to", params.to)
    if (params?.roomId) searchParams.append("roomId", params.roomId.toString())

    const response = await fetchOnce(`${API_BASE_URL}/rooms/export/readings?${searchParams.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new ApiError(response.status, "Failed to export readings")
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `readings-export-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  },

  downloadAlertsCSV: async (params?: { from?: string; to?: string; roomId?: number; status?: AlertStatus }) => {
    await waitForRateLimit()
    const token = getAccessToken()

    const searchParams = new URLSearchParams()
    if (params?.from) searchParams.append("from", params.from)
    if (params?.to) searchParams.append("to", params.to)
    if (params?.roomId) searchParams.append("roomId", params.roomId.toString())
    if (params?.status) searchParams.append("status", params.status)

    const response = await fetchOnce(`${API_BASE_URL}/rooms/export/alerts?${searchParams.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new ApiError(response.status, "Failed to export alerts")
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `alerts-export-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  },

  downloadAlertsHistoryCSV: async (params?: { from?: string; to?: string; roomId?: number }) => {
    await waitForRateLimit()
    const token = getAccessToken()

    const searchParams = new URLSearchParams()
    if (params?.from) searchParams.append("from", params.from)
    if (params?.to) searchParams.append("to", params.to)
    if (params?.roomId) searchParams.append("roomId", params.roomId.toString())

    const response = await fetchOnce(`${API_BASE_URL}/rooms/export/alerts-history?${searchParams.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new ApiError(response.status, "Failed to export alert history")
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `alert-history-export-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  },
}

// Profile API for password changes
export const profileApi = {
  get: () => fetchWithAuth<User>("/users/profile"),

  update: (data: {
    username?: string
    name?: string
    currentPassword?: string
    newPassword?: string
    phones?: Array<{ phone_number: string; is_primary?: boolean }>
  }) =>
    fetchWithAuth<User>("/users/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
}

// Settings API
export const settingsApi = {
  getAll: () => fetchWithAuth<{ success: boolean; settings: Record<string, string> }>("/settings"),

  update: (settings: Record<string, string | boolean | number>) =>
    fetchWithAuth<{ success: boolean; message: string }>("/settings", {
      method: "PUT",
      body: JSON.stringify({ settings }),
    }),

  getSetting: (key: string) =>
    fetchWithAuth<{ success: boolean; setting: { key: string; value: string; description: string } }>(
      `/settings/${key}`,
    ),

  updateSetting: (key: string, value: string | boolean | number) =>
    fetchWithAuth<{ success: boolean; setting: { key: string; value: string; description: string } }>(
      `/settings/${key}`,
      {
        method: "PUT",
        body: JSON.stringify({ value }),
      },
    ),
}

// User Preferences API for ADMIN users to manage their own notification preferences
export const userPreferencesApi = {
  get: () =>
    fetchWithAuth<{
      success: boolean
      preferences: {
        alert_temp_enabled: boolean
        alert_humidity_enabled: boolean
        alert_ac1_enabled: boolean
        alert_ac2_enabled: boolean
      }
    }>("/user/preferences"),

  update: (preferences: {
    alert_temp_enabled?: boolean
    alert_humidity_enabled?: boolean
    alert_ac1_enabled?: boolean
    alert_ac2_enabled?: boolean
  }) =>
    fetchWithAuth<{
      success: boolean
      message: string
      preferences: {
        alert_temp_enabled: boolean
        alert_humidity_enabled: boolean
        alert_ac1_enabled: boolean
        alert_ac2_enabled: boolean
      }
    }>("/user/preferences", {
      method: "PUT",
      body: JSON.stringify(preferences),
    }),
}
