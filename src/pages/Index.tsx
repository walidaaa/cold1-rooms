"use client"

import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { StatCard } from "@/components/dashboard/StatCard"
import { RoomCard } from "@/components/dashboard/RoomCard"
import {
  Warehouse,
  Thermometer,
  AlertTriangle,
  Users,
  MessageSquare,
  Activity,
  RefreshCw,
  Snowflake,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useConnection } from "@/contexts/ConnectionContext"
import { useDataCache } from "@/contexts/DataCacheContext"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"

const Index = () => {
  const { toast } = useToast()
  const { isConnected } = useConnection()
  const { data, isRefreshing } = useDataCache()
  const { user } = useAuth()
  const isAdmin = user?.role === "ADMIN"

  const { stats, roomsOverview: rooms, alerts } = data

  const avgTemp =
    rooms.length > 0
      ? rooms
          .filter((r) => r.temperature !== undefined && r.temperature !== null)
          .reduce((acc, r) => acc + (r.temperature || 0), 0) /
        (rooms.filter((r) => r.temperature !== undefined && r.temperature !== null).length || 1)
      : 0

  return (
    <DashboardLayout
      title={
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-lg border-2 border-sky-100">
            <img src="/cold-logo.jpg" alt="Cold Monitoring" className="w-16 h-16 object-contain" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-base text-muted-foreground font-medium">
              Monitor your pharmaceutical cold rooms in real-time
            </p>
          </div>
        </div>
      }
      subtitle=""
    >
      {isRefreshing && (
        <div className="fixed top-20 right-4 z-50 animate-fade-in">
          <div className="flex items-center gap-2 glass px-4 py-2 rounded-full border border-border/50 shadow-lg">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Syncing data...</span>
          </div>
        </div>
      )}

      <div
        className={cn(
          "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 mb-6",
          isAdmin ? "xl:grid-cols-6" : "xl:grid-cols-5",
        )}
      >
        <StatCard
          title="Total Rooms"
          value={stats?.totalRooms || rooms.length || 0}
          subtitle={`${rooms.filter((r) => r.status === "ACTIVE").length} active`}
          icon={Warehouse}
          variant="default"
          index={0}
        />
        <StatCard
          title="Avg Temperature"
          value={`${avgTemp.toFixed(1)}°C`}
          subtitle="All rooms"
          icon={Thermometer}
          variant="temperature"
          index={1}
        />
        <StatCard
          title="Active Alerts"
          value={stats?.activeAlerts || alerts.filter((a) => a.status === "ACTIVE").length || 0}
          subtitle={stats?.roomsInAlert ? `${stats.roomsInAlert} rooms affected` : "All rooms normal"}
          icon={AlertTriangle}
          variant={(stats?.activeAlerts || 0) > 0 ? "warning" : "success"}
          index={2}
        />
        {isAdmin && (
          <StatCard
            title="Total Users"
            value={stats?.totalUsers || 0}
            subtitle="Registered users"
            icon={Users}
            variant="default"
            index={3}
          />
        )}
        <StatCard
          title="SMS Today"
          value={stats?.smsSentToday || 0}
          subtitle="Notifications sent"
          icon={MessageSquare}
          variant="info"
          index={isAdmin ? 4 : 3}
        />
        <StatCard
          title="System Status"
          value={!isConnected ? "Offline" : "Online"}
          subtitle={!isConnected ? "Reconnecting..." : "All sensors operational"}
          icon={Activity}
          variant={!isConnected ? "warning" : "success"}
          index={isAdmin ? 5 : 4}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center p-2">
              <img src="/cold-logo.jpg" alt="Cold" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Cold Rooms Overview</h2>
              <p className="text-sm text-muted-foreground">Real-time monitoring</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/50 text-xs text-sky-700 dark:text-sky-400 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
            {rooms.length} rooms total
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch auto-rows-fr">
          {rooms.map((room, index) => (
            <RoomCard
              key={room.id}
              index={index}
              room={{
                id: room.id,
                name: room.name,
                location: "",
                hardwareId: "",
                status: room.status,
                temperature: room.temperature,
                humidity: room.humidity,
                tempMin: room.tempMin,
                tempMax: room.tempMax,
                humidityMin: room.humidityMin,
                humidityMax: room.humidityMax,
                activeAlerts: room.activeAlerts,
                isOnline: room.isOnline,
                lastReading: room.lastReading,
                acInput1: room.acInput1,
                acInput2: room.acInput2,
                acInput1Name: room.acInput1Name,
                acInput2Name: room.acInput2Name,
                gpsLatitude: room.gpsLatitude,
                gpsLongitude: room.gpsLongitude,
              }}
            />
          ))}
        </div>
        {rooms.length === 0 && (
          <div className="text-center py-16 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-muted/50 mb-4">
              <Snowflake className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground font-medium">No rooms found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Create your first room to get started</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default Index
