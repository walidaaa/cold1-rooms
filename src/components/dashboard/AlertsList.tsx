"use client"

import { cn } from "@/lib/utils"
import type { Alert } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertTriangle,
  Thermometer,
  Droplets,
  Check,
  Bell,
  Clock,
  Zap,
  ChevronRight,
  AlertCircle,
  DoorOpen,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface AlertsListProps {
  alerts: Alert[]
  onAcknowledge?: (alertId: number) => void
  maxItems?: number
}

export function AlertsList({ alerts, onAcknowledge, maxItems = 6 }: AlertsListProps) {
  const activeAlerts = alerts.filter((a) => a.status === "ACTIVE")
  const displayAlerts = alerts.slice(0, maxItems)

  const getStatusBadge = (status: Alert["status"]) => {
    switch (status) {
      case "ACTIVE":
        return { variant: "destructive" as const, label: "Active", dot: "bg-rose-400" }
      case "RESOLVED":
        return { variant: "success" as const, label: "Resolved", dot: "bg-emerald-400" }
      case "ACKNOWLEDGED":
        return { variant: "warning" as const, label: "Ack", dot: "bg-amber-400" }
      default:
        return { variant: "secondary" as const, label: status, dot: "bg-slate-400" }
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "TEMPERATURE":
        return Thermometer
      case "HUMIDITY":
        return Droplets
      case "POWER":
        return Zap
      case "DOOR":
        return DoorOpen
      case "SENSOR":
        return AlertCircle
      default:
        return AlertTriangle
    }
  }

  const getIconColor = (type: string) => {
    switch (type) {
      case "TEMPERATURE":
        return "text-sky-500"
      case "HUMIDITY":
        return "text-slate-500"
      case "POWER":
        return "text-amber-500"
      case "DOOR":
        return "text-purple-500"
      case "SENSOR":
        return "text-rose-500"
      default:
        return "text-gray-500"
    }
  }

  const getIconBgColor = (type: string) => {
    switch (type) {
      case "TEMPERATURE":
        return "bg-gradient-to-br from-sky-500/20 to-sky-600/10 border-sky-500/20"
      case "HUMIDITY":
        return "bg-gradient-to-br from-slate-500/20 to-slate-600/10 border-slate-500/20"
      case "POWER":
        return "bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/20"
      case "DOOR":
        return "bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/20"
      case "SENSOR":
        return "bg-gradient-to-br from-rose-500/20 to-rose-600/10 border-rose-500/20"
      default:
        return "bg-gradient-to-br from-gray-500/20 to-gray-600/10 border-gray-500/20"
    }
  }

  const AlertItem = ({ alert, index }: { alert: Alert; index: number }) => {
    const badge = getStatusBadge(alert.status)
    const Icon = getAlertIcon(alert.type)
    const isActive = alert.status === "ACTIVE"
    const isLow = (alert.value || 0) < (alert.threshold || 0)
    const staggerClass = `stagger-${Math.min(index + 1, 6)}`

    return (
      <div
        className={cn(
          "p-3 transition-all duration-300 animate-slide-up opacity-0",
          "hover:bg-slate-500/5",
          staggerClass,
          isActive && "bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent",
        )}
      >
        <div className="flex items-start gap-2.5">
          <div
            className={cn(
              "relative p-2 rounded-lg shrink-0 transition-all duration-300",
              "border",
              getIconBgColor(alert.type),
              isActive && "animate-pulse",
            )}
          >
            <Icon className={cn("h-3.5 w-3.5 relative z-10", getIconColor(alert.type))} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="font-semibold text-xs truncate">{alert.room?.name || "Unknown"}</span>
              <Badge variant={badge.variant} className="shrink-0 text-[9px] px-1.5 py-0 h-4">
                {badge.label}
              </Badge>
            </div>

            <p className="text-[11px] text-muted-foreground leading-tight">
              {alert.type === "POWER" ? (
                <span className="font-medium text-amber-600">Power lost</span>
              ) : alert.type === "DOOR" ? (
                <span className="font-medium text-purple-600">Door alert</span>
              ) : alert.type === "SENSOR" ? (
                <span className="font-medium text-rose-600">Sensor alert</span>
              ) : (
                <>
                  {alert.type === "TEMPERATURE" ? "Temp" : "Humidity"}{" "}
                  <span className={cn("font-medium", isLow ? "text-sky-500" : "text-rose-500")}>
                    {isLow ? "below" : "above"}
                  </span>{" "}
                  threshold
                </>
              )}
            </p>

            <div className="flex items-center gap-2 mt-1.5">
              {(alert.type === "TEMPERATURE" || alert.type === "HUMIDITY") && (
                <>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-500/10">
                    <Zap className="h-2.5 w-2.5 text-amber-500" />
                    <span className="font-mono text-[10px] font-semibold">
                      {alert.value}
                      {alert.type === "TEMPERATURE" ? "°C" : "%"}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    Limit: {alert.threshold}
                    {alert.type === "TEMPERATURE" ? "°C" : "%"}
                  </span>
                </>
              )}
              {alert.type === "POWER" && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10">
                  <span className="text-[10px] font-semibold text-amber-600">
                    AC Input {alert.message?.includes("Input 1") ? "1" : "2"} OFF
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
              <span>{formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}</span>
            </div>
          </div>

          {isActive && onAcknowledge && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAcknowledge(alert.id)}
              className="shrink-0 h-7 px-2 text-[10px] bg-transparent hover:bg-emerald-500/15 hover:text-emerald-600 hover:border-emerald-500/40"
            >
              <Check className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card/90 backdrop-blur-md rounded-xl shadow-lg border border-border/50 overflow-hidden animate-slide-in-right h-full flex flex-col">
      <div className="p-3 border-b border-border/50 bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-sky-500/20 to-sky-500/10 border border-sky-500/20">
              <Bell className="h-3.5 w-3.5 text-sky-500" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Recent Alerts</h3>
              <p className="text-[10px] text-muted-foreground">Real-time notifications</p>
            </div>
          </div>
          {activeAlerts.length > 0 && (
            <Badge variant="destructive" className="gap-1 text-[10px] px-2 py-0.5 animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
              {activeAlerts.length}
            </Badge>
          )}
        </div>
      </div>

      <div className="divide-y divide-border/30 overflow-y-auto flex-1" style={{ maxHeight: "calc(100vh - 380px)" }}>
        {displayAlerts.length === 0 ? (
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 mb-3">
              <AlertTriangle className="h-6 w-6 text-emerald-500/40" />
            </div>
            <p className="text-sm text-muted-foreground font-semibold">No alerts</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">All systems normal</p>
          </div>
        ) : (
          displayAlerts.map((alert, index) => <AlertItem key={alert.id} alert={alert} index={index} />)
        )}
      </div>

      {alerts.length > maxItems && (
        <div className="p-2 border-t border-border/30 bg-slate-500/5">
          <button className="w-full flex items-center justify-center gap-1 text-[11px] text-muted-foreground hover:text-sky-500 transition-colors py-1">
            View all {alerts.length} alerts
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}
