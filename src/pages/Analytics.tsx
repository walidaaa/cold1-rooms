"use client"

import { useState, useMemo, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useDataCache } from "@/contexts/DataCacheContext"
import { StatCard } from "@/components/dashboard/StatCard"
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import {
  Thermometer,
  Droplets,
  Activity,
  AlertTriangle,
  Calendar,
  RefreshCw,
  BarChart3,
  Download,
  Zap,
} from "lucide-react"
import { roomsApi, exportApi, type Reading } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

const COLORS = {
  temperature: "#0ea5e9", // Sky blue
  temperatureGradient: "#06b6d4", // Cyan
  humidity: "#8b5cf6", // Purple
  humidityGradient: "#a78bfa", // Light purple
  success: "#10b981", // Emerald
  warning: "#f59e0b", // Amber
  critical: "#ef4444", // Red
  background: "#ffffff",
  text: "#0f172a",
  border: "#e2e8f0",
}

const ALERT_COLORS: Record<string, string> = {
  TEMPERATURE: "#ef4444",
  HUMIDITY: "#8b5cf6",
  DOOR: "#f59e0b",
  POWER: "#ec4899",
  SENSOR: "#64748b",
}

const BAR_COLORS = [
  "#0ea5e9", // Sky blue
  "#06b6d4", // Cyan
  "#14b8a6", // Teal
  "#10b981", // Emerald
  "#84cc16", // Lime
  "#eab308", // Yellow
  "#f97316", // Orange
  "#ef4444", // Red
  "#ec4899", // Pink
  "#a855f7", // Purple
]

const getTemperatureColor = (temp: number, minTemp = 2, maxTemp = 8) => {
  if (temp < minTemp) return "#3b82f6" // Blue - too cold
  if (temp <= maxTemp * 0.5) return "#06b6d4" // Cyan - cold optimal
  if (temp <= maxTemp * 0.75) return "#14b8a6" // Teal - optimal
  if (temp <= maxTemp) return "#22c55e" // Green - optimal high
  if (temp <= maxTemp * 1.25) return "#f59e0b" // Amber - warning
  return "#ef4444" // Red - critical
}

const Analytics = () => {
  const { data, refreshAll, isRefreshing } = useDataCache()
  const [selectedRoom, setSelectedRoom] = useState<string>("all")
  const [timeRange, setTimeRange] = useState("24h")
  const [readings, setReadings] = useState<Reading[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()

  const rooms = data?.roomsOverview || []
  const alerts = data?.alerts || []

  const getDateRange = () => {
    const now = new Date()
    const to = now.toISOString()
    let from: string

    switch (timeRange) {
      case "1h":
        from = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
        break
      case "6h":
        from = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString()
        break
      case "24h":
        from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
        break
      case "7d":
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
        break
      case "30d":
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
        break
      case "1m":
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
        break
      case "3m":
        from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
        break
      case "6m":
        from = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString()
        break
      case "1y":
        from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString()
        break
      default:
        from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    }

    return { from, to }
  }

  const handleExportReadings = async () => {
    setIsExporting(true)
    try {
      const { from, to } = getDateRange()

      const params: { from?: string; to?: string; roomId?: number } = {
        from: from,
        to: to,
      }

      if (selectedRoom !== "all") {
        params.roomId = Number.parseInt(selectedRoom)
      }

      await exportApi.downloadReadingsCSV(params)

      toast({
        title: "Export successful",
        description: "Temperature and humidity readings exported to CSV",
      })
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Failed to export data",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportAlerts = async () => {
    setIsExporting(true)
    try {
      const { from, to } = getDateRange()

      const params: { from?: string; to?: string; roomId?: number } = {
        from,
        to,
      }

      if (selectedRoom !== "all") {
        params.roomId = Number.parseInt(selectedRoom)
      }

      await exportApi.downloadAlertsHistoryCSV(params)

      toast({
        title: "Export successful",
        description: "Alert history exported to CSV",
      })
    } catch (error) {
      console.error("[v0] Alert history export error:", error)
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Failed to export alert history",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  useEffect(() => {
    const fetchReadings = async () => {
      if (rooms.length === 0) return

      try {
        const { from, to } = getDateRange()

        if (selectedRoom === "all") {
          // Fetch readings from all rooms with time filter
          const allReadings = await Promise.all(
            rooms.map((room) => roomsApi.getReadings(room.id, { from, to, limit: 1000 })),
          )
          const combined = allReadings.flat()
          setReadings(combined)
        } else {
          const roomId = Number.parseInt(selectedRoom)
          const data = await roomsApi.getReadings(roomId, { from, to, limit: 1000 })
          setReadings(data)
        }
      } catch (error) {
        console.error("Failed to fetch readings:", error)
        setReadings([])
      }
    }

    fetchReadings()
  }, [selectedRoom, rooms, timeRange])

  const chartData = useMemo(() => {
    if (readings.length > 0) {
      return readings
        .map((reading) => {
          const date = new Date(reading.recordedAt)
          return {
            time: date.toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            temperature: reading.temperature,
            humidity: reading.humidity,
          }
        })
        .reverse() // Reverse to show chronological order (oldest to newest)
    } else if (rooms.length > 0) {
      // Fallback: create a single data point from current values
      return [
        {
          time: "Current",
          temperature:
            selectedRoom === "all"
              ? rooms.reduce((sum, r) => sum + (r.temperature || 0), 0) / rooms.length
              : rooms.find((r) => r.id === Number.parseInt(selectedRoom))?.temperature || 0,
          humidity:
            selectedRoom === "all"
              ? rooms.reduce((sum, r) => sum + (r.humidity || 0), 0) / rooms.length
              : rooms.find((r) => r.id === Number.parseInt(selectedRoom))?.humidity || 0,
        },
      ]
    }
    return []
  }, [readings, rooms, selectedRoom])

  // Calculate stats from current room data
  const stats = useMemo(() => {
    if (rooms.length === 0) {
      return { avgTemp: 0, avgHumidity: 0, minTemp: 0, maxTemp: 0 }
    }

    const temps = rooms.map((r) => r.temperature || 0)
    const humidities = rooms.map((r) => r.humidity || 0)

    return {
      avgTemp: (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1),
      avgHumidity: (humidities.reduce((a, b) => a + b, 0) / humidities.length).toFixed(1),
      minTemp: Math.min(...temps).toFixed(1),
      maxTemp: Math.max(...temps).toFixed(1),
    }
  }, [rooms])

  // Alert statistics
  const alertStats = useMemo(() => {
    const byType: Record<string, number> = {}
    const byRoom: Record<string, number> = {}
    const alertsByType: Record<string, typeof alerts> = {}

    alerts.forEach((alert) => {
      byType[alert.type] = (byType[alert.type] || 0) + 1
      byRoom[alert.roomId] = (byRoom[alert.roomId] || 0) + 1

      // Group alerts by type for detailed view
      if (!alertsByType[alert.type]) {
        alertsByType[alert.type] = []
      }
      alertsByType[alert.type].push(alert)
    })

    return {
      total: alerts.length,
      byType,
      byRoom,
      alertsByType,
      pieData: Object.entries(byType).map(([name, value]) => ({
        name,
        value,
        color: ALERT_COLORS[name] || COLORS.warning,
      })),
    }
  }, [alerts])

  // Room temperature comparison data
  const roomComparisonData = useMemo(() => {
    return rooms.map((room, index) => ({
      name: room.name,
      temperature: room.temperature || 0,
      // Use temperature-based coloring for semantic meaning
      fill: getTemperatureColor(room.temperature || 0, room.minTemp, room.maxTemp),
      // Alternative: use index-based colors for variety
      // fill: BAR_COLORS[index % BAR_COLORS.length],
    }))
  }, [rooms])

  // Radial chart data for room status
  const radialData = useMemo(() => {
    let normal = 0
    let warning = 0
    let critical = 0

    rooms.forEach((room) => {
      // Check if room is offline - that's critical
      if (!room.isOnline) {
        critical++
        return
      }

      // Check if room has active alerts
      if (room.activeAlerts > 0) {
        warning++
        return
      }

      // Check if temperature/humidity is out of range
      const temp = room.temperature ?? 0
      const humidity = room.humidity ?? 0
      const minTemp = room.minTemp ?? 2
      const maxTemp = room.maxTemp ?? 8
      const minHumidity = room.minHumidity ?? 35
      const maxHumidity = room.maxHumidity ?? 65

      const tempOutOfRange = temp < minTemp || temp > maxTemp
      const humidityOutOfRange = humidity < minHumidity || humidity > maxHumidity

      if (tempOutOfRange || humidityOutOfRange) {
        warning++
      } else {
        normal++
      }
    })

    return [
      { name: "Normal", value: normal, fill: COLORS.success },
      { name: "Warning", value: warning, fill: COLORS.warning },
      { name: "Critical", value: critical, fill: COLORS.critical },
    ]
  }, [rooms])

  // Rooms in range count - use the calculated normal count
  const roomsInRange = radialData.find((d) => d.name === "Normal")?.value ?? 0

  const acPowerStats = useMemo(() => {
    if (rooms.length === 0) {
      return {
        ac1Online: 0,
        ac1Offline: 0,
        ac2Online: 0,
        ac2Offline: 0,
        totalAcOnline: 0,
        totalAcOffline: 0,
        ac1Percentage: 0,
        ac2Percentage: 0,
        overallPercentage: 0,
      }
    }

    let ac1Online = 0
    let ac1Offline = 0
    let ac2Online = 0
    let ac2Offline = 0

    rooms.forEach((room) => {
      // AC1 status - handle both boolean and number values
      if (room.acInput1 === true || room.acInput1 === 1) {
        ac1Online++
      } else {
        ac1Offline++
      }

      // AC2 status - handle both boolean and number values
      if (room.acInput2 === true || room.acInput2 === 1) {
        ac2Online++
      } else {
        ac2Offline++
      }
    })

    const totalAcOnline = ac1Online + ac2Online
    const totalAcOffline = ac1Offline + ac2Offline
    const totalAcInputs = rooms.length * 2

    return {
      ac1Online,
      ac1Offline,
      ac2Online,
      ac2Offline,
      totalAcOnline,
      totalAcOffline,
      ac1Percentage: rooms.length > 0 ? Math.round((ac1Online / rooms.length) * 100) : 0,
      ac2Percentage: rooms.length > 0 ? Math.round((ac2Online / rooms.length) * 100) : 0,
      overallPercentage: totalAcInputs > 0 ? Math.round((totalAcOnline / totalAcInputs) * 100) : 0,
    }
  }, [rooms])

  const acPowerComparisonData = useMemo(() => {
    return rooms.map((room) => ({
      name: room.name,
      ac1: room.acInput1 === true || room.acInput1 === 1 ? 1 : 0,
      ac2: room.acInput2 === true || room.acInput2 === 1 ? 1 : 0,
      roomId: room.id,
    }))
  }, [rooms])

  const acPowerPieData = useMemo(() => {
    return [
      {
        name: "AC1 Online",
        value: acPowerStats.ac1Online,
        color: "#6366f1",
      },
      {
        name: "AC1 Offline",
        value: acPowerStats.ac1Offline,
        color: "#ef4444",
      },
      {
        name: "AC2 Online",
        value: acPowerStats.ac2Online,
        color: "#f59e0b",
      },
      {
        name: "AC2 Offline",
        value: acPowerStats.ac2Offline,
        color: "#dc2626",
      },
    ].filter((item) => item.value > 0) // Only show non-zero values
  }, [acPowerStats])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gradient-to-br from-white to-slate-50 border-2 border-slate-200 rounded-xl shadow-2xl p-4 backdrop-blur-sm dark:bg-slate-800 dark:border-slate-700">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 pb-2 border-b border-slate-200 dark:border-slate-600">
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-3 text-sm mb-2 last:mb-0">
              <div
                className="w-4 h-4 rounded-md shadow-sm"
                style={{
                  backgroundColor: entry.color,
                  boxShadow: `0 0 8px ${entry.color}40`,
                }}
              />
              <span className="text-slate-600 dark:text-slate-400 font-medium">{entry.name}:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 ml-auto">
                {typeof entry.value === "number" ? entry.value.toFixed(1) : entry.value}
                {entry.name === "Temperature" || entry.dataKey === "temperature"
                  ? "°C"
                  : entry.name === "Humidity" || entry.dataKey === "humidity"
                    ? "%"
                    : ""}
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-slide-up">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-900 dark:text-white">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center shadow-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              Analytics
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Temperature, humidity, AC power, and alert analytics for your cold rooms
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger className="w-[200px] bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 shadow-sm">
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rooms</SelectItem>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id.toString()}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[200px] bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 shadow-sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="6h">Last 6 Hours</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="1m">Last 1 Month</SelectItem>
                  <SelectItem value="3m">Last 3 Months</SelectItem>
                  <SelectItem value="6m">Last 6 Months</SelectItem>
                  <SelectItem value="1y">Last 1 Year</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={refreshAll}
                disabled={isRefreshing}
                variant="outline"
                size="icon"
                className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleExportReadings}
                disabled={isExporting}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Readings
              </Button>
              <Button
                onClick={handleExportAlerts}
                disabled={isExporting}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Alerts
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Avg Temperature"
            value={`${stats.avgTemp}°C`}
            subtitle={`Range: ${stats.minTemp}°C - ${stats.maxTemp}°C`}
            icon={Thermometer}
            variant="temperature"
            index={0}
          />
          <StatCard
            title="Avg Humidity"
            value={`${stats.avgHumidity}%`}
            subtitle={`${rooms.length} rooms monitored`}
            icon={Droplets}
            variant="humidity"
            index={1}
          />
          <StatCard
            title="Active Alerts"
            value={alertStats.total}
            subtitle={`${Object.keys(alertStats.byRoom).length} rooms affected`}
            icon={AlertTriangle}
            variant="warning"
            index={2}
          />
          <StatCard
            title="AC Power Online"
            value={`${acPowerStats.totalAcOnline}/${rooms.length * 2}`}
            subtitle={`${acPowerStats.overallPercentage}% operational`}
            icon={Zap}
            variant="success"
            index={3}
          />
        </div>

        {/* Main Charts */}
        <Tabs defaultValue="temperature" className="space-y-4">
          <TabsList className="bg-gradient-to-r from-slate-100 to-slate-50 p-1 rounded-xl border border-slate-200 dark:from-slate-800 dark:to-slate-900 dark:border-slate-700">
            <TabsTrigger
              value="temperature"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-sky-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg"
            >
              <Thermometer className="h-4 w-4 mr-2" />
              Temperature
            </TabsTrigger>
            <TabsTrigger
              value="humidity"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg"
            >
              <Droplets className="h-4 w-4 mr-2" />
              Humidity
            </TabsTrigger>
            <TabsTrigger
              value="acpower"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg"
            >
              <Zap className="h-4 w-4 mr-2" />
              AC Power
            </TabsTrigger>
            <TabsTrigger
              value="combined"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg"
            >
              <Activity className="h-4 w-4 mr-2" />
              Combined
            </TabsTrigger>
            <TabsTrigger
              value="alerts"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Alerts
            </TabsTrigger>
          </TabsList>

          {/* Temperature Chart */}
          <TabsContent value="temperature" className="space-y-4">
            <Card className="bg-white dark:bg-slate-800 border-2 border-transparent dark:border-slate-700 bg-gradient-to-br from-white to-sky-50/30 dark:from-slate-800 dark:to-slate-900 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader className="border-b border-sky-100 dark:border-slate-700 bg-gradient-to-r from-sky-50 to-cyan-50 dark:from-slate-900/50 dark:to-slate-900/30">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg">
                    <Thermometer className="h-5 w-5 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-orange-600 to-amber-600 dark:from-orange-400 dark:to-amber-400 bg-clip-text text-transparent font-bold">
                    Temperature History
                  </span>
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400 font-medium">
                  {selectedRoom === "all"
                    ? "Average temperature across all rooms"
                    : `Temperature readings for selected room`}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 bg-white dark:bg-slate-800">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f97316" stopOpacity={0.4} />
                          <stop offset="50%" stopColor="#fb923c" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#fdba74" stopOpacity={0.05} />
                        </linearGradient>
                        <filter id="tempGlow">
                          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                          <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e2e8f0"
                        className="dark:stroke-slate-700"
                        strokeOpacity={0.5}
                      />
                      <XAxis
                        dataKey="time"
                        stroke="#64748b"
                        className="dark:stroke-slate-400"
                        fontSize={12}
                        fontWeight={500}
                        tick={{ fill: "#f97316" }}
                      />
                      <YAxis
                        stroke="#64748b"
                        className="dark:stroke-slate-400"
                        fontSize={12}
                        fontWeight={500}
                        unit="°C"
                        domain={["auto", "auto"]}
                        tick={{ fill: "#f97316" }}
                      />
                      <Tooltip
                        content={<CustomTooltip />}
                        contentStyle={{
                          backgroundColor: "rgba(30, 41, 59, 0.95)",
                          border: "1px solid #475569",
                          borderRadius: "8px",
                          color: "#f1f5f9",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="temperature"
                        name="Temperature"
                        stroke="#f97316"
                        strokeWidth={3}
                        fill="url(#tempGradient)"
                        dot={{ fill: "#f97316", strokeWidth: 2, r: 4, stroke: "#fff" }}
                        activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff", fill: "#f97316", filter: "url(#tempGlow)" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Humidity Chart */}
          <TabsContent value="humidity" className="space-y-4">
            <Card className="bg-white dark:bg-slate-800 border-2 border-transparent dark:border-slate-700 bg-gradient-to-br from-white to-purple-50/30 dark:from-slate-800 dark:to-slate-900 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader className="border-b border-purple-100 dark:border-slate-700 bg-gradient-to-r from-purple-50 to-purple-100/50 dark:from-slate-900/50 dark:to-slate-900/30">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg">
                    <Droplets className="h-5 w-5 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-yellow-600 to-amber-600 dark:from-yellow-400 dark:to-amber-400 bg-clip-text text-transparent font-bold">
                    Humidity History
                  </span>
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400 font-medium">
                  {selectedRoom === "all" ? "Average humidity across all rooms" : `Humidity readings for selected room`}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 bg-white dark:bg-slate-800">
                <div className="h-[450px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="humidityGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#eab308" stopOpacity={0.4} />
                          <stop offset="50%" stopColor="#fbbf24" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#fcd34d" stopOpacity={0.05} />
                        </linearGradient>
                        <filter id="humidityGlow">
                          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                          <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e2e8f0"
                        className="dark:stroke-slate-700"
                        strokeOpacity={0.5}
                      />
                      <XAxis
                        dataKey="time"
                        stroke="#64748b"
                        className="dark:stroke-slate-400"
                        fontSize={12}
                        fontWeight={500}
                        tick={{ fill: "#eab308" }}
                      />
                      <YAxis
                        stroke="#64748b"
                        className="dark:stroke-slate-400"
                        fontSize={12}
                        fontWeight={500}
                        unit="%"
                        domain={["auto", "auto"]}
                        tick={{ fill: "#eab308" }}
                      />
                      <Tooltip
                        content={<CustomTooltip />}
                        contentStyle={{
                          backgroundColor: "rgba(30, 41, 59, 0.95)",
                          border: "1px solid #475569",
                          borderRadius: "8px",
                          color: "#f1f5f9",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="humidity"
                        name="Humidity"
                        stroke="#eab308"
                        strokeWidth={3}
                        fill="url(#humidityGradient)"
                        dot={{ fill: "#eab308", strokeWidth: 2, r: 4, stroke: "#fff" }}
                        activeDot={{
                          r: 6,
                          strokeWidth: 2,
                          stroke: "#fff",
                          fill: "#eab308",
                          filter: "url(#humidityGlow)",
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="acpower" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* AC Power Status by Device - Bar Chart */}
              <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-indigo-50/50 dark:from-slate-900/50 dark:to-slate-900/30">
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg">
                      <Zap className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-slate-800 dark:text-slate-100 font-bold">AC Power Status by Device</span>
                  </CardTitle>
                  <CardDescription className="text-slate-500 dark:text-slate-400 font-medium">
                    Real-time AC power input status for all devices
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 bg-white dark:bg-slate-800">
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={acPowerComparisonData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e2e8f0"
                          className="dark:stroke-slate-700"
                          strokeOpacity={0.5}
                        />
                        <XAxis
                          dataKey="name"
                          stroke="#64748b"
                          className="dark:stroke-slate-400"
                          fontSize={11}
                          fontWeight={500}
                          tick={{ fill: "#f97316" }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis
                          stroke="#64748b"
                          className="dark:stroke-slate-400"
                          fontSize={12}
                          fontWeight={500}
                          domain={[0, 1]}
                          ticks={[0, 1]}
                          tickFormatter={(value) => (value === 1 ? "Online" : "Offline")}
                          tick={{ fill: "#f97316" }}
                        />
                        <Tooltip
                          formatter={(value: number, name: string) => [value === 1 ? "Online" : "Offline", name]}
                          contentStyle={{
                            backgroundColor: "rgba(30, 41, 59, 0.95)",
                            border: "1px solid #475569",
                            borderRadius: "8px",
                            color: "#f1f5f9",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          }}
                        />
                        <Legend
                          wrapperStyle={{ paddingTop: "10px" }}
                          iconType="circle"
                          formatter={(value) => (value === "ac1" ? "AC Input 1" : "AC Input 2")}
                        />
                        <Bar dataKey="ac1" name="ac1" fill="#f97316" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="ac2" name="ac2" fill="#eab308" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* AC Power Distribution - Pie Chart */}
              <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-amber-50/50 dark:from-slate-900/50 dark:to-slate-900/30">
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg">
                      <Activity className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-slate-800 dark:text-slate-100 font-bold">AC Power Distribution</span>
                  </CardTitle>
                  <CardDescription className="text-slate-500 dark:text-slate-400 font-medium">
                    Overall AC input status across all devices
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 bg-white dark:bg-slate-800">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={acPowerPieData}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={90}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {acPowerPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [value, "Count"]}
                          contentStyle={{
                            backgroundColor: "rgba(30, 41, 59, 0.95)",
                            border: "1px solid #475569",
                            borderRadius: "8px",
                            color: "#f1f5f9",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* AC Power Stats Summary */}
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 dark:bg-slate-700 dark:border-slate-600">
                      <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium mb-1">AC1 Online</p>
                      <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                        {acPowerStats.ac1Online}/{rooms.length}
                      </p>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">{acPowerStats.ac1Percentage}%</p>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-slate-700 dark:border-slate-600">
                      <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-1">AC2 Online</p>
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        {acPowerStats.ac2Online}/{rooms.length}
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{acPowerStats.ac2Percentage}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Device AC Status Table */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <Zap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  Detailed AC Power Status
                </CardTitle>
                <CardDescription>Complete AC input status for all {rooms.length} devices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-400">
                          Device
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-400">
                          AC Input 1
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-400">
                          AC Input 2
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-400">
                          Overall Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rooms.map((room) => {
                        const ac1Status = room.acInput1 === true || room.acInput1 === 1
                        const ac2Status = room.acInput2 === true || room.acInput2 === 1
                        const overallStatus =
                          ac1Status && ac2Status ? "Operational" : !ac1Status && !ac2Status ? "Degraded" : "Warning"

                        return (
                          <tr
                            key={room.id}
                            className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-900 dark:text-slate-100">{room.name}</span>
                                {room.isOnline && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">
                                    Online
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                  ac1Status
                                    ? "bg-indigo-100 text-indigo-800 border border-indigo-200 dark:bg-indigo-900 dark:text-indigo-300 dark:border-indigo-700"
                                    : "bg-red-100 text-red-800 border border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-700"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${ac1Status ? "bg-indigo-500 animate-pulse dark:bg-indigo-400" : "bg-red-500 dark:bg-red-400"}`}
                                />
                                {ac1Status ? "Online" : "Offline"}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                  ac2Status
                                    ? "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900 dark:text-amber-300 dark:border-amber-700"
                                    : "bg-red-100 text-red-800 border border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-700"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${ac2Status ? "bg-amber-500 animate-pulse dark:bg-amber-400" : "bg-red-500 dark:bg-red-400"}`}
                                />
                                {ac2Status ? "Online" : "Offline"}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {overallStatus === "Operational" && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
                                  <Activity className="h-3 w-3" />
                                  Operational
                                </span>
                              )}
                              {overallStatus === "Warning" && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700">
                                  <AlertTriangle className="h-3 w-3" />
                                  Warning
                                </span>
                              )}
                              {overallStatus === "Degraded" && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 border border-red-200 dark:border-red-700">
                                  <AlertTriangle className="h-3 w-3" />
                                  Degraded
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Combined Chart */}
          <TabsContent value="combined" className="space-y-4">
            <Card className="bg-white dark:bg-slate-800 border-2 border-transparent dark:border-slate-700 bg-gradient-to-br from-white to-emerald-50/30 dark:from-slate-800 dark:to-slate-900 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader className="border-b border-emerald-100 dark:border-slate-700 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-900/50 dark:to-slate-900/30">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-600 flex items-center justify-center shadow-lg">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-slate-900 dark:text-slate-100 font-bold">Temperature & Humidity Combined</span>
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400 font-medium">
                  Compare temperature and humidity trends over time
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 bg-white dark:bg-slate-800">
                <div className="h-[450px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e2e8f0"
                        className="dark:stroke-slate-700"
                        strokeOpacity={0.5}
                      />
                      <XAxis
                        dataKey="time"
                        stroke="#64748b"
                        className="dark:stroke-slate-400"
                        fontSize={12}
                        fontWeight={500}
                        tick={{ fill: "#f97316" }}
                      />
                      <YAxis
                        yAxisId="temp"
                        stroke="#f97316"
                        fontSize={12}
                        fontWeight={500}
                        unit="°C"
                        tick={{ fill: "#f97316" }}
                      />
                      <YAxis
                        yAxisId="humidity"
                        orientation="right"
                        stroke="#eab308"
                        fontSize={12}
                        fontWeight={500}
                        unit="%"
                        tick={{ fill: "#eab308" }}
                      />
                      <Tooltip
                        content={<CustomTooltip />}
                        contentStyle={{
                          backgroundColor: "rgba(30, 41, 59, 0.95)",
                          border: "1px solid #475569",
                          borderRadius: "8px",
                          color: "#f1f5f9",
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
                      <Line
                        yAxisId="temp"
                        type="monotone"
                        dataKey="temperature"
                        name="Temperature"
                        stroke="#f97316"
                        strokeWidth={3}
                        dot={{ fill: "#f97316", strokeWidth: 2, r: 5, stroke: "#fff" }}
                        activeDot={{ r: 7, strokeWidth: 3, stroke: "#fff", fill: "#f97316" }}
                      />
                      <Line
                        yAxisId="humidity"
                        type="monotone"
                        dataKey="humidity"
                        name="Humidity"
                        stroke="#eab308"
                        strokeWidth={3}
                        dot={{ fill: "#eab308", strokeWidth: 2, r: 5, stroke: "#fff" }}
                        activeDot={{ r: 7, strokeWidth: 3, stroke: "#fff", fill: "#eab308" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Chart */}
          <TabsContent value="alerts" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-5 w-5" />
                    Alerts by Type
                  </CardTitle>
                  <CardDescription>
                    Distribution of active alerts by category ({alertStats.total} total)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={alertStats.pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                          labelLine={false}
                        >
                          {alertStats.pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name: string) => [value, name]}
                          contentStyle={{
                            backgroundColor: "rgba(30, 41, 59, 0.95)",
                            border: "1px solid #475569",
                            borderRadius: "8px",
                            color: "#f1f5f9",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Alert Details by Type */}
                  <div className="mt-4 space-y-3 max-h-[200px] overflow-y-auto">
                    {Object.entries(alertStats.alertsByType).map(([type, typeAlerts]) => (
                      <div
                        key={type}
                        className="border rounded-lg p-3 dark:bg-slate-800 dark:border-slate-700"
                        style={{ borderColor: ALERT_COLORS[type] || COLORS.warning }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: ALERT_COLORS[type] || COLORS.warning }}
                          />
                          <span
                            className="font-semibold text-sm"
                            style={{ color: ALERT_COLORS[type] || COLORS.warning }}
                          >
                            {type} ({typeAlerts.length})
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {typeAlerts.map((alert) => {
                            const room = rooms.find((r) => r.id === alert.roomId)
                            return (
                              <span
                                key={alert.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full text-white"
                                style={{ backgroundColor: ALERT_COLORS[type] || COLORS.warning }}
                                title={`Alert #${alert.id} - ${room?.name || "Unknown Room"} - ${alert.message}`}
                              >
                                #{alert.id} {room?.name}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                    {alertStats.total === 0 && (
                      <div className="text-center text-slate-500 py-4">
                        <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                        <p>No active alerts</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <Activity className="h-5 w-5" />
                    Room Status Overview
                  </CardTitle>
                  <CardDescription>Current status distribution of all rooms</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart
                        cx="50%"
                        cy="50%"
                        innerRadius="30%"
                        outerRadius="90%"
                        data={radialData}
                        startAngle={180}
                        endAngle={0}
                      >
                        <RadialBar minAngle={15} background clockWise dataKey="value" cornerRadius={10} />
                        <Legend iconSize={10} layout="horizontal" verticalAlign="bottom" />
                        <Tooltip />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Room Temperature Comparison */}
        <Card className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-blue-50/30 dark:from-slate-900/50 dark:to-slate-900/30">
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <span className="text-slate-900 dark:text-slate-100 font-bold">Room Temperature Comparison</span>
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400 font-medium">
              Current temperature readings across all rooms
            </CardDescription>
            <div className="flex flex-wrap gap-3 mt-3">
              {[
                { color: "#3b82f6", label: "Too Cold" },
                { color: "#06b6d4", label: "Cold Optimal" },
                { color: "#14b8a6", label: "Optimal" },
                { color: "#22c55e", label: "Optimal High" },
                { color: "#f59e0b", label: "Warning" },
                { color: "#ef4444", label: "Critical" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
                >
                  <div
                    className="w-4 h-4 rounded shadow-sm"
                    style={{
                      backgroundColor: item.color,
                      boxShadow: `0 0 10px ${item.color}40`,
                    }}
                  />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{item.label}</span>
                </div>
              ))}
            </div>
          </CardHeader>
          <CardContent className="pt-6 bg-white dark:bg-slate-800">
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roomComparisonData} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                    className="dark:stroke-slate-700"
                    strokeOpacity={0.5}
                  />
                  <XAxis
                    type="number"
                    unit="°C"
                    stroke="#64748b"
                    className="dark:stroke-slate-400"
                    fontSize={12}
                    fontWeight={500}
                    tick={{ fill: "#475569" }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={120}
                    stroke="#64748b"
                    className="dark:stroke-slate-400"
                    fontSize={12}
                    fontWeight={500}
                    tick={{ fill: "#475569" }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="temperature" name="Temperature" radius={[0, 10, 10, 0]} maxBarSize={40}>
                    {roomComparisonData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.fill}
                        style={{
                          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
                        }}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default Analytics