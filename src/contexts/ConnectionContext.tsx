"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react"
import { healthApi, isApiRateLimited } from "@/lib/api"

interface ConnectionContextType {
  isConnected: boolean
  isChecking: boolean
  lastConnected: Date | null
  retryCount: number
  checkConnection: () => Promise<boolean>
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined)

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(true)
  const [isChecking, setIsChecking] = useState(false)
  const [lastConnected, setLastConnected] = useState<Date | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const healthIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastCheckRef = useRef<number>(0)
  const mountedRef = useRef(true)

  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (isApiRateLimited()) {
      return isConnected
    }

    const now = Date.now()
    if (now - lastCheckRef.current < 30000) {
      return isConnected
    }
    lastCheckRef.current = now

    if (isChecking) return isConnected

    setIsChecking(true)
    try {
      await healthApi.check()
      if (mountedRef.current) {
        setIsConnected(true)
        setLastConnected(new Date())
        setRetryCount(0)
      }
      return true
    } catch {
      if (mountedRef.current) {
        setIsConnected(false)
        setRetryCount((prev) => prev + 1)
      }
      return false
    } finally {
      if (mountedRef.current) {
        setIsChecking(false)
      }
    }
  }, [isConnected, isChecking])

  useEffect(() => {
    mountedRef.current = true

    const initialTimeout = setTimeout(() => {
      checkConnection()
    }, 2000)

    healthIntervalRef.current = setInterval(() => {
      if (isConnected && !isApiRateLimited()) {
        checkConnection()
      }
    }, 120000)

    return () => {
      mountedRef.current = false
      clearTimeout(initialTimeout)
      if (healthIntervalRef.current) clearInterval(healthIntervalRef.current)
    }
  }, [])

  useEffect(() => {
    if (isConnected) {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      return
    }

    const attemptReconnect = async () => {
      if (!mountedRef.current || isApiRateLimited()) return
      const connected = await checkConnection()
      if (!connected && mountedRef.current) {
        const delay = Math.min(30000 * Math.pow(2, Math.min(retryCount, 3)), 300000)
        reconnectTimeoutRef.current = setTimeout(attemptReconnect, delay)
      }
    }

    reconnectTimeoutRef.current = setTimeout(attemptReconnect, 15000)

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
    }
  }, [isConnected, retryCount, checkConnection])

  return (
    <ConnectionContext.Provider
      value={{
        isConnected,
        isChecking,
        lastConnected,
        retryCount,
        checkConnection,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  )
}

export function useConnection() {
  const context = useContext(ConnectionContext)
  if (context === undefined) {
    throw new Error("useConnection must be used within a ConnectionProvider")
  }
  return context
}
