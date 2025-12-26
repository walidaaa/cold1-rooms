"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  MessageSquare,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Loader2,
  Activity,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { format, formatDistanceToNow, subMonths, startOfDay, endOfDay, subDays, subYears } from "date-fns"
import { smsApi, type SmsLog } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { StatCard } from "@/components/ui/stat-card"

type TimePeriod = "all" | "today" | "week" | "month" | "3months" | "6months" | "year"

const SmsLogs = () => {
  const [logs, setLogs] = useState<SmsLog[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [testDialogOpen, setTestDialogOpen] = useState(false)
  const [testPhone, setTestPhone] = useState("")
  const [testMessage, setTestMessage] = useState("")
  const [sending, setSending] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const getDateRange = (period: TimePeriod): { from?: string; to?: string } => {
    const now = new Date()
    const to = endOfDay(now).toISOString()

    switch (period) {
      case "today":
        return { from: startOfDay(now).toISOString(), to }
      case "week":
        return { from: startOfDay(subDays(now, 7)).toISOString(), to }
      case "month":
        return { from: startOfDay(subMonths(now, 1)).toISOString(), to }
      case "3months":
        return { from: startOfDay(subMonths(now, 3)).toISOString(), to }
      case "6months":
        return { from: startOfDay(subMonths(now, 6)).toISOString(), to }
      case "year":
        return { from: startOfDay(subYears(now, 1)).toISOString(), to }
      default:
        return {}
    }
  }

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const dateRange = getDateRange(timePeriod)
      const response = await smsApi.getAll({
        page: 1,
        limit: 500,
        ...dateRange,
      })
      setLogs(response.data)
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to load SMS logs",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [timePeriod])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, timePeriod, itemsPerPage])

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.room?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.phoneNumber.includes(searchQuery) ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || log.status.toUpperCase() === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case "SENT":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "FAILED":
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-amber-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "SENT":
        return { variant: "success" as const, label: "Sent" }
      case "FAILED":
        return { variant: "destructive" as const, label: "Failed" }
      default:
        return { variant: "warning" as const, label: "Pending" }
    }
  }

  const handleSendTest = async () => {
    if (!testPhone || !testMessage) {
      toast({ title: "Error", description: "Please fill in all fields.", variant: "destructive" })
      return
    }

    try {
      setSending(true)
      await smsApi.sendTest(testPhone, testMessage)
      toast({ title: "SMS Sent", description: `Test SMS sent to ${testPhone}` })
      setTestDialogOpen(false)
      setTestPhone("")
      setTestMessage("")
      fetchLogs()
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to send SMS",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  const sentCount = logs.filter((l) => l.status.toUpperCase() === "SENT").length
  const failedCount = logs.filter((l) => l.status.toUpperCase() === "FAILED").length

  const getTimePeriodLabel = (period: TimePeriod): string => {
    switch (period) {
      case "today":
        return "Today"
      case "week":
        return "Last 7 Days"
      case "month":
        return "Last 30 Days"
      case "3months":
        return "Last 3 Months"
      case "6months":
        return "Last 6 Months"
      case "year":
        return "Last Year"
      default:
        return "All Time"
    }
  }

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage)

  return (
    <DashboardLayout title="SMS Logs" subtitle="Track all SMS notifications and delivery status">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-in">
        <StatCard title="Total" value={logs.length} subtitle="Messages sent" icon={MessageSquare} variant="default" />
        <StatCard
          title="Delivered"
          value={sentCount}
          subtitle="Successfully sent"
          icon={CheckCircle}
          variant="success"
        />
        <StatCard title="Failed" value={failedCount} subtitle="Failed delivery" icon={XCircle} variant="warning" />
        <StatCard
          title="Success Rate"
          value={`${logs.length > 0 ? Math.round((sentCount / logs.length) * 100) : 0}%`}
          subtitle="Delivery rate"
          icon={Activity}
          variant="info"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <Input
            placeholder="Search by room, user, phone, or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 focus:border-cyan-500 dark:focus:border-orange-500 focus:ring-2 focus:ring-cyan-500/20 dark:focus:ring-orange-500/20 h-11"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={timePeriod} onValueChange={(value) => setTimePeriod(value as TimePeriod)}>
            <SelectTrigger className="w-[160px] border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 h-11">
              <Calendar className="h-4 w-4 mr-2 text-slate-500 dark:text-slate-400" />
              <SelectValue placeholder="Time Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 h-11">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm h-11 gap-2">
                <Send className="h-4 w-4" />
                Test SMS
              </Button>
            </DialogTrigger>
            <DialogContent className="border-slate-200 bg-white">
              <DialogHeader>
                <DialogTitle>Send Test SMS</DialogTitle>
                <DialogDescription>Send a test SMS to verify your SMS gateway configuration.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    placeholder="+213671776343"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="border-slate-200 bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    placeholder="Enter test message..."
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="border-slate-200 bg-white"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTestDialogOpen(false)} className="border-slate-200">
                  Cancel
                </Button>
                <Button onClick={handleSendTest} disabled={sending} className="bg-cyan-600 hover:bg-cyan-700">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Send Test
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {timePeriod !== "all" && (
        <div className="mb-4 flex items-center gap-2">
          <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200 dark:border-cyan-800">
            <Calendar className="h-3 w-3 mr-1.5" />
            Showing: {getTimePeriodLabel(timePeriod)}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTimePeriod("all")}
            className="text-slate-500 hover:text-slate-700 h-7 px-2"
          >
            Clear filter
          </Button>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <th className="text-left p-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left p-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  User
                </th>
                <th className="text-left p-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Room
                </th>
                <th className="text-left p-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Phone
                </th>
                <th className="text-left p-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Message
                </th>
                <th className="text-left p-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Time
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0 ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-700">
                    <td className="p-4" colSpan={6}>
                      <Skeleton className="h-12 w-full rounded-lg bg-slate-100/50 dark:bg-slate-800/30" />
                    </td>
                  </tr>
                ))
              ) : (
                paginatedLogs.map((log, index) => {
                  const badge = getStatusBadge(log.status)
                  return (
                    <tr
                      key={log.id}
                      className={cn(
                        "border-b border-slate-100 dark:border-slate-700 transition-colors hover:bg-cyan-50/30 dark:hover:bg-cyan-900/20",
                      )}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "p-2 rounded-xl border",
                              log.status.toUpperCase() === "SENT" &&
                                "bg-green-50 dark:bg-green-900/30 border-green-100 dark:border-green-800",
                              log.status.toUpperCase() === "FAILED" &&
                                "bg-red-50 dark:bg-red-900/30 border-red-100 dark:border-red-800",
                            )}
                          >
                            {getStatusIcon(log.status)}
                          </div>
                          <Badge variant={badge.variant} className="font-medium">
                            {badge.label}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {log.user ? (
                            <>
                              <div className="h-8 w-8 rounded-full bg-cyan-100 dark:bg-cyan-900/30 border border-cyan-200 dark:border-cyan-800 flex items-center justify-center">
                                <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-400">
                                  {log.user.username.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                {log.user.username}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm text-slate-400 dark:text-slate-500 italic">System</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {log.room ? (
                          <Badge
                            variant="outline"
                            className="font-mono text-xs border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                          >
                            {log.room.name}
                          </Badge>
                        ) : (
                          <span className="text-sm text-slate-400 dark:text-slate-500 italic">-</span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-sm text-slate-900 dark:text-slate-100 tabular-nums">
                        {log.phoneNumber}
                      </td>
                      <td className="p-4 max-w-md">
                        <p className="text-sm text-slate-600 dark:text-slate-300 truncate" title={log.message}>
                          {log.message}
                        </p>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                            {format(new Date(log.sentAt), "MMM d, HH:mm")}
                          </span>
                          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                            {formatDistanceToNow(new Date(log.sentAt), { addSuffix: true })}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filteredLogs.length === 0 && (
          <div className="text-center py-16">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-600 dark:text-slate-300 font-medium">No SMS logs found</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Try adjusting your search or filters</p>
          </div>
        )}

        {filteredLogs.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-center gap-4">
              <p className="text-sm font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                Showing {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredLogs.length)} of{" "}
                {filteredLogs.length}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">Show:</span>
                <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(Number(v))}>
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
                  onClick={() => setCurrentPage(currentPage - 1)}
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
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="gap-1.5 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default SmsLogs