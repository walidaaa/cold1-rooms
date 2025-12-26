"use client"

import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { alertsApi, type Alert, type AlertStatus, type AlertHistory } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  AlertTriangle,
  Thermometer,
  Droplets,
  Check,
  Clock,
  History,
  Loader2,
  ArrowRight,
  User,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Zap,
  DoorOpen,
  AlertCircle,
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { useState, useCallback, useRef, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDataCache } from "@/contexts/DataCacheContext"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StatCard } from "@/components/dashboard/StatCard"

const Alerts = () => {
  const [alertsHistory, setAlertsHistory] = useState<AlertHistory[]>([])
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyPage, setHistoryPage] = useState(1)
  const [alertsPerPage, setAlertsPerPage] = useState(10)
  const [historyPerPage, setHistoryPerPage] = useState(10)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [acknowledging, setAcknowledging] = useState<number | null>(null)
  const [alertsPage, setAlertsPage] = useState(1)
  const { toast } = useToast()
  const mountedRef = useRef(true)

  const { data, isRefreshing, updateAlert, refreshAlerts } = useDataCache()
  const alerts = data.alerts

  const fetchAlertsHistory = useCallback(
    async (page = 1, limit = historyPerPage) => {
      try {
        setLoadingHistory(true)
        const response = await alertsApi.getHistory({ page, limit })
        if (!mountedRef.current) return
        setAlertsHistory(response.data)
        setHistoryTotal(response.total)
        setHistoryPage(page)
        setHistoryLoaded(true)
      } catch (err: any) {
        if (!mountedRef.current) return
        toast({
          title: "Error",
          description: err.message || "Failed to load alerts history",
          variant: "destructive",
        })
      } finally {
        if (mountedRef.current) {
          setLoadingHistory(false)
        }
      }
    },
    [toast, historyPerPage],
  )

  useEffect(() => {
    fetchAlertsHistory(1, historyPerPage)

    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    setHistoryPage(1)
    fetchAlertsHistory(1, historyPerPage)
  }, [historyPerPage])

  useEffect(() => {
    setAlertsPage(1)
  }, [alertsPerPage])

  const activeAlerts = alerts.filter((a) => a.status === "ACTIVE")
  const acknowledgedAlerts = alerts.filter((a) => a.status === "ACKNOWLEDGED")
  const resolvedAlerts = alerts.filter((a) => a.status === "RESOLVED")

  const handleAcknowledge = async (alertId: number) => {
    try {
      setAcknowledging(alertId)
      await alertsApi.acknowledge(alertId)
      updateAlert(alertId, {
        status: "ACKNOWLEDGED" as AlertStatus,
        acknowledgedAt: new Date().toISOString(),
      })
      toast({
        title: "Alert Acknowledged",
        description: "The alert has been acknowledged.",
      })
      // Refresh in background
      refreshAlerts()
      if (alertsHistory.length > 0) {
        fetchAlertsHistory(historyPage)
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to acknowledge alert",
        variant: "destructive",
      })
    } finally {
      setAcknowledging(null)
    }
  }

  const handleResolve = async (alertId: number) => {
    try {
      setAcknowledging(alertId)
      await alertsApi.resolve(alertId)
      updateAlert(alertId, {
        status: "RESOLVED" as AlertStatus,
        resolvedAt: new Date().toISOString(),
      })
      toast({
        title: "Alert Resolved",
        description: "The alert has been resolved.",
      })
      // Refresh in background
      refreshAlerts()
      if (alertsHistory.length > 0) {
        fetchAlertsHistory(historyPage)
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to resolve alert",
        variant: "destructive",
      })
    } finally {
      setAcknowledging(null)
    }
  }

  const getStatusBadge = (status: AlertStatus | string) => {
    switch (status) {
      case "ACTIVE":
        return { variant: "destructive" as const, label: "Active" }
      case "ACKNOWLEDGED":
        return { variant: "warning" as const, label: "Acknowledged" }
      case "RESOLVED":
        return { variant: "success" as const, label: "Resolved" }
      default:
        return { variant: "secondary" as const, label: status }
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

  const getAlertIconColor = (type: string) => {
    switch (type) {
      case "TEMPERATURE":
        return "text-orange-600"
      case "HUMIDITY":
        return "text-cyan-600"
      case "POWER":
        return "text-amber-600"
      case "DOOR":
        return "text-purple-600"
      case "SENSOR":
        return "text-rose-600"
      default:
        return "text-slate-600"
    }
  }

  const getAlertIconBg = (type: string) => {
    switch (type) {
      case "TEMPERATURE":
        return "bg-orange-50 border-orange-100"
      case "HUMIDITY":
        return "bg-cyan-50 border-cyan-100"
      case "POWER":
        return "bg-amber-50 border-amber-100"
      case "DOOR":
        return "bg-purple-50 border-purple-100"
      case "SENSOR":
        return "bg-rose-50 border-rose-100"
      default:
        return "bg-slate-50 border-slate-100"
    }
  }

  const AlertTable = ({
    alertsList,
    showActions = false,
    currentPage,
    onPageChange,
    onItemsPerPageChange,
  }: {
    alertsList: Alert[]
    showActions?: boolean
    currentPage: number
    onPageChange: (page: number) => void
    onItemsPerPageChange: (value: number) => void
  }) => {
    const startIndex = (currentPage - 1) * alertsPerPage
    const paginatedAlerts = alertsList.slice(startIndex, startIndex + alertsPerPage)

    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <th className="text-left p-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="text-left p-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Room
                </th>
                <th className="text-left p-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Value
                </th>
                <th className="text-left p-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Threshold
                </th>
                <th className="text-left p-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left p-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="text-left p-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Time
                </th>
                {showActions && (
                  <th className="text-left p-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedAlerts.map((alert, index) => {
                const badge = getStatusBadge(alert.status)
                const Icon = getAlertIcon(alert.type)
                const assignedTo = alert.resolvedByName || alert.acknowledgedByName

                return (
                  <tr
                    key={alert.id}
                    className={cn(
                      "border-b border-slate-100 dark:border-slate-700 transition-colors",
                      alert.status === "ACTIVE" && "bg-red-50/30 dark:bg-red-900/10",
                      "hover:bg-cyan-50/30 dark:hover:bg-cyan-900/20",
                    )}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2.5 rounded-xl border", getAlertIconBg(alert.type))}>
                          <Icon className={cn("h-4 w-4", getAlertIconColor(alert.type))} />
                        </div>
                        <span className="font-medium capitalize text-slate-900 dark:text-slate-100">
                          {alert.type.toLowerCase()}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 font-medium text-slate-900 dark:text-slate-100">
                      {alert.room?.name || `Room ${alert.roomId}`}
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {alert.type === "TEMPERATURE" || alert.type === "HUMIDITY" ? (
                        <>
                          {alert.value}
                          {alert.type === "TEMPERATURE" ? "°C" : "%"}
                        </>
                      ) : alert.type === "POWER" ? (
                        <span className="text-amber-600 dark:text-amber-400">Power Lost</span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">-</span>
                      )}
                    </td>
                    <td className="p-4 font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                      {alert.type === "TEMPERATURE" || alert.type === "HUMIDITY" ? (
                        <>
                          {alert.threshold}
                          {alert.type === "TEMPERATURE" ? "°C" : "%"}
                        </>
                      ) : alert.type === "POWER" ? (
                        <span className="text-amber-600 dark:text-amber-400">
                          AC {alert.message?.includes("Input 1") ? "Input 1" : "Input 2"}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <Badge variant={badge.variant} className="font-medium">
                        {badge.label}
                      </Badge>
                    </td>
                    <td className="p-4">
                      {assignedTo ? (
                        <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <User className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                          <span>{assignedTo}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-sm">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="font-mono tabular-nums">
                            {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        {alert.resolvedAt && (
                          <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                            <Check className="h-3 w-3" />
                            <span className="font-mono">
                              Resolved {formatDistanceToNow(new Date(alert.resolvedAt), { addSuffix: true })}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    {showActions && (
                      <td className="p-4">
                        <div className="flex gap-2">
                          {alert.status === "ACTIVE" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAcknowledge(alert.id)}
                              disabled={acknowledging === alert.id}
                              className="border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-amber-300 text-amber-700 dark:text-amber-400"
                            >
                              {acknowledging === alert.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <>
                                  <Check className="h-3.5 w-3.5 mr-1.5" />
                                  Acknowledge
                                </>
                              )}
                            </Button>
                          )}
                          {alert.status === "ACKNOWLEDGED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResolve(alert.id)}
                              disabled={acknowledging === alert.id}
                              className="border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-300 text-green-700 dark:text-green-400"
                            >
                              {acknowledging === alert.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <>
                                  <Check className="h-3.5 w-3.5 mr-1.5" />
                                  Resolve
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {alertsList.length === 0 && (
          <div className="text-center py-16">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No alerts found</p>
          </div>
        )}

        <PaginationControls
          currentPage={currentPage}
          totalItems={alertsList.length}
          itemsPerPage={alertsPerPage}
          onPageChange={onPageChange}
          onItemsPerPageChange={onItemsPerPageChange}
        />
      </div>
    )
  }

  const PaginationControls = ({
    currentPage,
    totalItems,
    itemsPerPage,
    onPageChange,
    onItemsPerPageChange,
  }: {
    currentPage: number
    totalItems: number
    itemsPerPage: number
    onPageChange: (page: number) => void
    onItemsPerPageChange: (value: number) => void
  }) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage)
    if (totalItems === 0) return null

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
        <div className="flex items-center gap-4">
          <p className="text-sm font-mono text-slate-600 dark:text-slate-400 tabular-nums">
            Showing {totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} -{" "}
            {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">Show:</span>
            <Select value={itemsPerPage.toString()} onValueChange={(v) => onItemsPerPageChange(Number(v))}>
              <SelectTrigger className="w-[80px] h-8 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="30">30</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {totalPages > 1 && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="gap-1.5 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-sm font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                Page {currentPage} of {totalPages}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="gap-1.5 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    )
  }

  const HistoryTable = () => (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <th className="text-left p-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Room
              </th>
              <th className="text-left p-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Alert Type
              </th>
              <th className="text-left p-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Status Change
              </th>
              <th className="text-left p-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Changed By
              </th>
              <th className="text-left p-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Reason
              </th>
              <th className="text-left p-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {alertsHistory.map((history, index) => {
              const prevBadge = getStatusBadge(history.previousStatus)
              const newBadge = getStatusBadge(history.newStatus)

              return (
                <tr
                  key={history.id}
                  className={cn(
                    "border-b border-slate-100 dark:border-slate-700 transition-colors",
                    "hover:bg-cyan-50/30 dark:hover:bg-cyan-900/20",
                  )}
                >
                  <td className="p-4 font-medium text-slate-900 dark:text-slate-100">
                    {history.roomName || `Room ${history.roomId}`}
                  </td>
                  <td className="p-4">
                    <span className="capitalize text-slate-600 dark:text-slate-400">
                      {history.alertType?.toLowerCase() || "N/A"}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2.5">
                      <Badge variant={prevBadge.variant} className="font-medium">
                        {prevBadge.label}
                      </Badge>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                      <Badge variant={newBadge.variant} className="font-medium">
                        {newBadge.label}
                      </Badge>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <User className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                      <span>{history.changedByName || `User ${history.changedBy}`}</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-400">{history.changeReason || "-"}</td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                        {format(new Date(history.createdAt), "MMM d, yyyy")}
                      </span>
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                        {format(new Date(history.createdAt), "HH:mm:ss")}
                      </span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {alertsHistory.length === 0 && !loadingHistory && (
        <div className="text-center py-16">
          <History className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">No history records found</p>
        </div>
      )}

      {loadingHistory && (
        <div className="text-center py-16">
          <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium">Loading history...</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
        <div className="flex items-center gap-4">
          <p className="text-sm font-mono text-slate-600 dark:text-slate-400 tabular-nums">
            Showing {historyTotal > 0 ? (historyPage - 1) * historyPerPage + 1 : 0} -{" "}
            {Math.min(historyPage * historyPerPage, historyTotal)} of {historyTotal}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">Show:</span>
            <Select value={historyPerPage.toString()} onValueChange={(v) => setHistoryPerPage(Number(v))}>
              <SelectTrigger className="w-[80px] h-8 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="30">30</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {Math.ceil(historyTotal / historyPerPage) > 1 && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchAlertsHistory(historyPage - 1, historyPerPage)}
              disabled={historyPage === 1 || loadingHistory}
              className="gap-1.5 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-sm font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                Page {historyPage} of {Math.ceil(historyTotal / historyPerPage)}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchAlertsHistory(historyPage + 1, historyPerPage)}
              disabled={historyPage >= Math.ceil(historyTotal / historyPerPage) || loadingHistory}
              className="gap-1.5 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <DashboardLayout
      title="Alert Management"
      subtitle="Monitor and manage critical temperature, humidity, and power alerts"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-in">
        <StatCard
          title="Active"
          value={activeAlerts.length}
          subtitle="Requires attention"
          icon={AlertTriangle}
          variant="warning"
          index={0}
        />
        <StatCard
          title="Acknowledged"
          value={acknowledgedAlerts.length}
          subtitle="In progress"
          icon={Clock}
          variant="warning"
          index={1}
        />
        <StatCard
          title="Resolved"
          value={resolvedAlerts.length}
          subtitle="Completed"
          icon={Check}
          variant="success"
          index={2}
        />
        <StatCard
          title="Total"
          value={alerts.length}
          subtitle="All alerts"
          icon={AlertCircle}
          variant="info"
          index={3}
        />
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="bg-card border border-border p-1">
            <TabsTrigger
              value="active"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Active ({activeAlerts.length})
            </TabsTrigger>
            <TabsTrigger
              value="acknowledged"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Clock className="h-4 w-4 mr-2" />
              Acknowledged ({acknowledgedAlerts.length})
            </TabsTrigger>
            <TabsTrigger
              value="resolved"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Check className="h-4 w-4 mr-2" />
              Resolved ({resolvedAlerts.length})
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <History className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refreshAlerts()
              if (alertsHistory.length > 0) fetchAlertsHistory(historyPage)
            }}
            disabled={isRefreshing}
            className="gap-2 border-border hover:bg-accent"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>

        <TabsContent value="active" className="mt-6">
          <AlertTable
            alertsList={activeAlerts}
            showActions={true}
            currentPage={alertsPage}
            onPageChange={setAlertsPage}
            onItemsPerPageChange={setAlertsPerPage}
          />
        </TabsContent>

        <TabsContent value="acknowledged" className="mt-6">
          <AlertTable
            alertsList={acknowledgedAlerts}
            showActions={true}
            currentPage={alertsPage}
            onPageChange={setAlertsPage}
            onItemsPerPageChange={setAlertsPerPage}
          />
        </TabsContent>

        <TabsContent value="resolved" className="mt-6">
          <AlertTable
            alertsList={resolvedAlerts}
            showActions={false}
            currentPage={alertsPage}
            onPageChange={setAlertsPage}
            onItemsPerPageChange={setAlertsPerPage}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <HistoryTable />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  )
}

export default Alerts