"use client"

import { useState, useMemo } from "react"
import {
  Bell,
  Search,
  User,
  AlertTriangle,
  Thermometer,
  Droplets,
  ShieldCheck,
  UserCog,
  Moon,
  Sun,
  ShieldAlert,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ConnectionStatus } from "@/components/ConnectionStatus"
import { useAuth } from "@/contexts/AuthContext"
import { useDataCache } from "@/contexts/DataCacheContext"
import { useTheme } from "@/contexts/ThemeContext"
import { useNavigate } from "react-router-dom"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"

interface HeaderProps {
  title: string
  subtitle?: string
  alertCount?: number
}

export function Header({ title, subtitle }: HeaderProps) {
  const { user } = useAuth()
  const { data } = useDataCache()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const [searchOpen, setSearchOpen] = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(false)

  // Get active alerts count
  const activeAlerts = useMemo(() => data.alerts.filter((a) => a.status === "ACTIVE"), [data.alerts])

  // Combined search results for rooms and alerts
  const searchResults = useMemo(() => {
    const rooms = data.roomsOverview.map((room) => ({
      type: "room" as const,
      id: room.id,
      name: room.name,
      status: room.status,
      temperature: room.temperature,
    }))

    const alerts = activeAlerts.map((alert) => ({
      type: "alert" as const,
      id: alert.id,
      name: `Alert: ${alert.type}`,
      room: alert.room,
      message: alert.message,
    }))

    return { rooms, alerts }
  }, [data.roomsOverview, activeAlerts])

  const handleSearchSelect = (type: string, id: number) => {
    setSearchOpen(false)
    if (type === "room") {
      navigate(`/rooms`)
    } else {
      navigate(`/alerts`)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "TEMPERATURE":
        return <Thermometer className="h-4 w-4 text-destructive" />
      case "HUMIDITY":
        return <Droplets className="h-4 w-4 text-blue-500" />
      case "POWER":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />
      case "DOOR":
        return <AlertTriangle className="h-4 w-4 text-purple-500" />
      case "SENSOR":
        return <AlertTriangle className="h-4 w-4 text-rose-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-amber-500" />
    }
  }

  const getRoleDisplay = () => {
    if (user?.role === "SUPER_ADMIN") {
      return {
        label: "Super Admin",
        icon: ShieldAlert,
        color: "text-amber-500",
      }
    }
    if (user?.role === "ADMIN") {
      return {
        label: "Admin",
        icon: ShieldCheck,
        color: "text-violet-500",
      }
    }
    return {
      label: "Operator",
      icon: UserCog,
      color: "text-emerald-500",
    }
  }

  const roleDisplay = getRoleDisplay()

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-4">
          <ConnectionStatus />

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="relative overflow-hidden"
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            <Sun
              className={cn(
                "h-5 w-5 transition-all duration-300",
                theme === "dark" ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100",
              )}
            />
            <Moon
              className={cn(
                "absolute h-5 w-5 transition-all duration-300 text-orange-400",
                theme === "dark" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0",
              )}
            />
          </Button>

          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search rooms, alerts..."
                  className="pl-9 w-64 bg-background cursor-pointer"
                  readOnly
                />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <Command>
                <CommandInput placeholder="Search rooms, alerts..." />
                <CommandList>
                  <CommandEmpty>No results found.</CommandEmpty>
                  {searchResults.rooms.length > 0 && (
                    <CommandGroup heading="Rooms">
                      {searchResults.rooms.map((room) => (
                        <CommandItem
                          key={`room-${room.id}`}
                          onSelect={() => handleSearchSelect("room", room.id)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <Thermometer className="h-4 w-4 text-primary" />
                              <span>{room.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{room.temperature?.toFixed(1)}°C</span>
                              <Badge variant={room.status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
                                {room.status}
                              </Badge>
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {searchResults.alerts.length > 0 && (
                    <CommandGroup heading="Active Alerts">
                      {searchResults.alerts.map((alert) => (
                        <CommandItem
                          key={`alert-${alert.id}`}
                          onSelect={() => handleSearchSelect("alert", alert.id)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                            <div>
                              <span className="font-medium">{alert.room?.name || `Room ${alert.roomId}`}</span>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{alert.message}</p>
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Popover open={alertsOpen} onOpenChange={setAlertsOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {activeAlerts.length > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {activeAlerts.length > 9 ? "9+" : activeAlerts.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h4 className="font-semibold">Notifications</h4>
                {activeAlerts.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {activeAlerts.length} active
                  </Badge>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {activeAlerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Bell className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">No active alerts</p>
                    <p className="text-xs">All systems are running normally</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {activeAlerts.slice(0, 10).map((alert) => (
                      <div
                        key={alert.id}
                        className="flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => {
                          setAlertsOpen(false)
                          navigate("/alerts")
                        }}
                      >
                        <div className="mt-0.5">{getAlertIcon(alert.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium truncate">{alert.room?.name || `Room ${alert.roomId}`}</p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatTimeAgo(alert.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{alert.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {activeAlerts.length > 0 && (
                <div className="border-t border-border p-2">
                  <Button
                    variant="ghost"
                    className="w-full text-sm"
                    onClick={() => {
                      setAlertsOpen(false)
                      navigate("/alerts")
                    }}
                  >
                    View all alerts
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-3 pl-4 border-l border-border">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{user?.name || "User"}</p>
              <div className="flex items-center justify-end gap-1.5">
                <roleDisplay.icon className={cn("h-3.5 w-3.5", roleDisplay.color)} />
                <p className={cn("text-xs font-medium", roleDisplay.color)}>{roleDisplay.label}</p>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
