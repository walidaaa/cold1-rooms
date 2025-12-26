"use client"

import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react"
import {
  dashboardApi,
  alertsApi,
  roomsApi,
  isApiRateLimited,
  type Alert,
  type Room,
  type RoomOverview,
  type DashboardStats,
} from "@/lib/api"
import { useConnection } from "@/contexts/ConnectionContext"
import { useAuth } from "@/contexts/AuthContext"

interface CachedData {
  stats: DashboardStats | null
  rooms: Room[]
  roomsOverview: RoomOverview[]
  alerts: Alert[]
  lastUpdated: number
  userId?: number // Track which user this cache belongs to
}

interface DataCacheContextType {
  data: CachedData
  isRefreshing: boolean
  refreshAll: () => Promise<void>
  refreshAlerts: () => Promise<void>
  refreshRooms: () => Promise<void>
  updateAlert: (alertId: number, updates: Partial<Alert>) => void
  updateRoom: (roomId: number, updates: Partial<Room>) => void
  removeRoom: (roomId: number) => void
  addRoom: (room: Room) => void
}

const DataCacheContext = createContext<DataCacheContextType | undefined>(undefined)

const CACHE_KEY = "cold-room-data-cache"
const REFRESH_INTERVAL = 30000 // 30 seconds for real-time feel
const MIN_FETCH_INTERVAL = 5000 // 5 seconds minimum between fetches

const loadCachedData = (userId?: number): CachedData => {
  const emptyData: CachedData = {
    stats: null,
    rooms: [],
    roomsOverview: [],
    alerts: [],
    lastUpdated: 0,
  }

  try {
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (cached) {
      const parsed = JSON.parse(cached)
      if (parsed.userId === userId && Date.now() - parsed.lastUpdated < 300000) {
        return parsed
      }
      // Clear invalid cache
      sessionStorage.removeItem(CACHE_KEY)
    }
  } catch (e) {
    // Ignore errors
  }
  return emptyData
}

// Save data to sessionStorage
const saveCachedData = (data: CachedData) => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch (e) {
    // Ignore errors
  }
}

export function DataCacheProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [data, setData] = useState<CachedData>(() => loadCachedData(user?.id))
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { isConnected } = useConnection()
  const lastFetchRef = useRef<number>(0)
  const fetchingRef = useRef(false)
  const mountedRef = useRef(true)
  const previousUserIdRef = useRef<number | undefined>(user?.id)

  useEffect(() => {
    if (user?.id !== previousUserIdRef.current) {
      previousUserIdRef.current = user?.id
      // User changed - clear local state and force refresh
      setData({
        stats: null,
        rooms: [],
        roomsOverview: [],
        alerts: [],
        lastUpdated: 0,
      })
      lastFetchRef.current = 0
      // Trigger immediate refresh for new user
      if (user?.id) {
        refreshAll()
      }
    }
  }, [user?.id])

  // Refresh all data in background
  const refreshAll = useCallback(async () => {
    if (fetchingRef.current || isApiRateLimited()) return

    const now = Date.now()
    if (now - lastFetchRef.current < MIN_FETCH_INTERVAL) return

    fetchingRef.current = true
    lastFetchRef.current = now
    setIsRefreshing(true)

    try {
      // Fetch all data in parallel for speed
      const [statsRes, roomsOverviewRes, roomsRes, alertsRes] = await Promise.all([
        dashboardApi.getStats().catch(() => null),
        dashboardApi.getRoomsOverview().catch(() => ({ rooms: [] })),
        roomsApi.getAll(1, 100).catch(() => ({ data: [] })),
        alertsApi.getAll({ limit: 100 }).catch(() => ({ data: [] })),
      ])

      if (!mountedRef.current) return

      const newData: CachedData = {
        stats: statsRes || data.stats,
        rooms: roomsRes.data.length > 0 ? roomsRes.data : data.rooms,
        roomsOverview: roomsOverviewRes.rooms.length > 0 ? roomsOverviewRes.rooms : data.roomsOverview,
        alerts: alertsRes.data.length > 0 ? alertsRes.data : data.alerts,
        lastUpdated: now,
        userId: user?.id, // Store user ID with cache
      }

      setData(newData)
      saveCachedData(newData)
    } catch (err) {
      // Silent fail - keep cached data
    } finally {
      if (mountedRef.current) {
        setIsRefreshing(false)
      }
      fetchingRef.current = false
    }
  }, [data, user?.id])

  // Refresh only alerts (faster for real-time updates)
  const refreshAlerts = useCallback(async () => {
    if (isApiRateLimited()) return

    try {
      const alertsRes = await alertsApi.getAll({ limit: 100 })
      if (!mountedRef.current) return

      setData((prev) => {
        const newAlerts = prev.alerts.map((a) => (a.id === alertsRes.id ? { ...a, ...alertsRes.updates } : a))
        const newData = { ...prev, alerts: newAlerts, lastUpdated: Date.now(), userId: user?.id }
        saveCachedData(newData)
        return newData
      })
    } catch (err) {
      // Silent fail
    }
  }, [user?.id])

  // Refresh only rooms
  const refreshRooms = useCallback(async () => {
    if (isApiRateLimited()) return

    try {
      const [roomsOverviewRes, roomsRes] = await Promise.all([
        dashboardApi.getRoomsOverview().catch(() => ({ rooms: [] })),
        roomsApi.getAll(1, 100).catch(() => ({ data: [] })),
      ])

      if (!mountedRef.current) return

      setData((prev) => {
        const newRooms = roomsRes.data.length > 0 ? roomsRes.data : prev.rooms
        const newRoomsOverview = roomsOverviewRes.rooms.length > 0 ? roomsOverviewRes.rooms : prev.roomsOverview
        const newData = {
          ...prev,
          rooms: newRooms,
          roomsOverview: newRoomsOverview,
          lastUpdated: Date.now(),
          userId: user?.id,
        }
        saveCachedData(newData)
        return newData
      })
    } catch (err) {
      // Silent fail
    }
  }, [user?.id])

  // Update single alert in cache (for optimistic updates)
  const updateAlert = useCallback((alertId: number, updates: Partial<Alert>) => {
    setData((prev) => {
      const newAlerts = prev.alerts.map((a) => (a.id === alertId ? { ...a, ...updates } : a))
      const newData = { ...prev, alerts: newAlerts }
      saveCachedData(newData)
      return newData
    })
  }, [])

  // Update single room in cache
  const updateRoom = useCallback((roomId: number, updates: Partial<Room>) => {
    setData((prev) => {
      const newRooms = prev.rooms.map((r) => (r.id === roomId ? { ...r, ...updates } : r))
      // Also update roomsOverview for Dashboard sync
      const newRoomsOverview = prev.roomsOverview.map((r) => {
        if (r.id === roomId) {
          return {
            ...r,
            name: updates.name ?? r.name,
            // Map threshold fields from room to roomOverview format
            tempMin: updates.tempMin ?? r.tempMin,
            tempMax: updates.tempMax ?? r.tempMax,
            humidityMin: updates.humidityMin ?? r.humidityMin,
            humidityMax: updates.humidityMax ?? r.humidityMax,
          }
        }
        return r
      })
      const newData = { ...prev, rooms: newRooms, roomsOverview: newRoomsOverview }
      saveCachedData(newData)
      return newData
    })
  }, [])

  // Remove room from cache
  const removeRoom = useCallback((roomId: number) => {
    setData((prev) => {
      const newRooms = prev.rooms.filter((r) => r.id !== roomId)
      const newRoomsOverview = prev.roomsOverview.filter((r) => r.id !== roomId)
      const newData = { ...prev, rooms: newRooms, roomsOverview: newRoomsOverview }
      saveCachedData(newData)
      return newData
    })
  }, [])

  // Add room to cache
  const addRoom = useCallback((room: Room) => {
    setData((prev) => {
      const newRooms = [room, ...prev.rooms]
      const newData = { ...prev, rooms: newRooms }
      saveCachedData(newData)
      return newData
    })
  }, [])

  // Initial fetch on mount
  useEffect(() => {
    mountedRef.current = true

    // If no cached data or cache is old, fetch immediately
    if (!data.lastUpdated || Date.now() - data.lastUpdated > 60000) {
      refreshAll()
    }

    return () => {
      mountedRef.current = false
    }
  }, []) // Empty deps - only run once on mount

  // Auto-refresh interval
  useEffect(() => {
    if (!isConnected) return

    const interval = setInterval(() => {
      if (!isApiRateLimited()) {
        refreshAll()
      }
    }, REFRESH_INTERVAL)

    return () => clearInterval(interval)
  }, [isConnected, refreshAll])

  return (
    <DataCacheContext.Provider
      value={{
        data,
        isRefreshing,
        refreshAll,
        refreshAlerts,
        refreshRooms,
        updateAlert,
        updateRoom,
        removeRoom,
        addRoom,
      }}
    >
      {children}
    </DataCacheContext.Provider>
  )
}

export function useDataCache() {
  const context = useContext(DataCacheContext)
  if (context === undefined) {
    throw new Error("useDataCache must be used within a DataCacheProvider")
  }
  return context
}
