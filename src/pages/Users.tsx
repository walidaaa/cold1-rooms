"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { usersApi, roomsApi, type User, type Role, type Room } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Plus,
  MoreHorizontal,
  UserCog,
  MessageSquare,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Search,
  UsersIcon,
  ShieldCheck,
  Calendar,
  Filter,
  Edit,
  Crown,
} from "lucide-react"
import { CreateUserDialog } from "@/components/dialogs/CreateUserDialog"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { StatCard } from "@/components/ui/stat-card"

const Users = () => {
  const [users, setUsers] = useState<User[]>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("users_cache")
      return cached ? JSON.parse(cached) : []
    }
    return []
  })
  const [rooms, setRooms] = useState<Room[]>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("rooms_cache")
      return cached ? JSON.parse(cached) : []
    }
    return []
  })
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(() => {
    if (typeof window !== "undefined") {
      return !localStorage.getItem("users_cache")
    }
    return true
  })
  const hasFetched = useRef(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [smsFilter, setSmsFilter] = useState<string>("all")
  const { toast } = useToast()
  const { user: currentUser } = useAuth()

  const fetchData = async () => {
    try {
      if (!hasFetched.current && !localStorage.getItem("users_cache")) {
        setLoading(true)
      }
      const [usersResponse, roomsResponse] = await Promise.all([usersApi.getAll(1, 100), roomsApi.getAll(1, 100)])
      setUsers(usersResponse.data)
      setRooms(roomsResponse.data)
      localStorage.setItem("users_cache", JSON.stringify(usersResponse.data))
      localStorage.setItem("rooms_cache", JSON.stringify(roomsResponse.data))
      hasFetched.current = true
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to load data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setInitialLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        searchQuery === "" ||
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesRole = roleFilter === "all" || user.role === roleFilter
      const matchesSms =
        smsFilter === "all" ||
        (smsFilter === "enabled" && user.smsEnabled) ||
        (smsFilter === "disabled" && !user.smsEnabled)

      return matchesSearch && matchesRole && matchesSms
    })
  }, [users, searchQuery, roleFilter, smsFilter])

  const stats = useMemo(
    () => ({
      total: users.length,
      superAdmins: users.filter((u) => u.role === "SUPER_ADMIN").length,
      admins: users.filter((u) => u.role === "ADMIN").length,
      regularUsers: users.filter((u) => u.role === "USER").length,
      smsEnabled: users.filter((u) => u.smsEnabled).length,
    }),
    [users],
  )

  const handleSaveUser = async (userData: any) => {
    try {
      if (userData.id) {
        await usersApi.update(userData.id, {
          name: userData.name || userData.username,
          username: userData.username,
          role: userData.role,
          smsEnabled: userData.smsEnabled,
          assignedRoomIds: userData.assignedRoomIds || [],
          phones: userData.phones || [],
        })
        toast({ title: "User Updated", description: "User has been updated successfully." })
      } else {
        await usersApi.create({
          name: userData.name || userData.username,
          username: userData.username,
          password: userData.password,
          role: userData.role as Role,
          smsEnabled: userData.smsEnabled,
          assignedRoomIds: userData.assignedRoomIds || [],
          phones: userData.phones || [],
        })
        toast({ title: "User Created", description: "New user has been created successfully." })
      }
      fetchData()
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save user",
        variant: "destructive",
      })
    }
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setCreateDialogOpen(true)
  }

  const handleDeleteUser = async () => {
    if (!deleteUserId) return

    if (deleteUserId === currentUser?.id) {
      toast({
        title: "Error",
        description: "You cannot delete your own account",
        variant: "destructive",
      })
      setDeleteUserId(null)
      return
    }

    try {
      await usersApi.delete(deleteUserId)
      toast({ title: "User Deleted", description: "User has been deleted successfully." })
      setUsers((prev) => prev.filter((u) => u.id !== deleteUserId))
    } catch (err: any) {
      let errorMessage = err.message || "Failed to delete user"
      if (err.statusCode === 400) {
        errorMessage = "Cannot delete user - they may have active alerts or room assignments."
      } else if (err.statusCode === 403) {
        errorMessage = "You don't have permission to delete this user."
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setDeleteUserId(null)
    }
  }

  const handleToggleSms = async (user: User) => {
    try {
      await usersApi.update(user.id, { smsEnabled: !user.smsEnabled })
      toast({
        title: user.smsEnabled ? "SMS Deactivated" : "SMS Activated",
        description: `SMS alerts have been ${user.smsEnabled ? "disabled" : "enabled"} for this user.`,
      })
      fetchData()
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update SMS settings",
        variant: "destructive",
      })
    }
  }

  const handleCloseDialog = (open: boolean) => {
    setCreateDialogOpen(open)
    if (!open) setEditingUser(null)
  }

  const getRoomName = (roomId: number) => {
    const room = rooms.find((r) => r.id === roomId)
    return room?.name || `Room ${roomId}`
  }

  const getInitials = (name: string, username: string) => {
    const displayName = name || username
    return displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const availableRooms = useMemo(() => {
    // If current user has assigned rooms, only show those rooms
    if (currentUser?.assignedRoomIds && currentUser.assignedRoomIds.length > 0) {
      return rooms.filter((room) => currentUser.assignedRoomIds!.includes(room.id))
    }
    // Otherwise (super admin with no assignments), show all rooms
    return rooms
  }, [rooms, currentUser])

  const getRoleDisplay = (role: Role) => {
    switch (role) {
      case "SUPER_ADMIN":
        return {
          label: "Super Admin",
          icon: Crown,
          bgClass: "bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/20",
          iconClass: "text-amber-600",
        }
      case "ADMIN":
        return {
          label: "Admin",
          icon: ShieldCheck,
          bgClass: "bg-violet-500/15 text-violet-600 border-violet-500/30 hover:bg-violet-500/20",
          iconClass: "text-violet-600",
        }
      default:
        return {
          label: "User",
          icon: UserCog,
          bgClass: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20",
          iconClass: "text-emerald-600",
        }
    }
  }

  const canManageUser = (targetUser: User) => {
    // Super Admin users cannot be edited or deleted by anyone (including other Super Admins)
    if (targetUser.role === "SUPER_ADMIN") return false
    
    // Current user is Super Admin and target is not Super Admin
    if (currentUser?.role === "SUPER_ADMIN") return true
    
    // Current user is Admin and target is regular User
    if (currentUser?.role === "ADMIN" && targetUser.role === "USER") return true
    
    return false
  }

  if (initialLoading && users.length === 0) {
    return (
      <DashboardLayout title="User Management" subtitle="Manage team members, permissions, and access control">
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl bg-slate-200 dark:bg-slate-800" />
            ))}
          </div>
          <Skeleton className="h-[500px] rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="User Management" subtitle="Manage team members, permissions, and access control">
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total" value={stats.total} subtitle="Team members" icon={UsersIcon} variant="default" />
          <StatCard
            title="Super Admins"
            value={stats.superAdmins}
            subtitle="Full access"
            icon={Crown}
            variant="warning"
          />
          <StatCard title="Admins" value={stats.admins} subtitle="Moderators" icon={ShieldCheck} variant="info" />
          <StatCard
            title="Users"
            value={stats.regularUsers}
            subtitle="Standard access"
            icon={UserCog}
            variant="success"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full sm:w-auto">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 focus:border-cyan-500 dark:focus:border-orange-500 focus:ring-2 focus:ring-cyan-500/20 dark:focus:ring-orange-500/20 h-11"
              />
            </div>
            <div className="flex gap-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[180px] border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 h-11">
                  <Filter className="h-4 w-4 mr-2 text-slate-400 dark:text-slate-500" />
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="USER">User</SelectItem>
                </SelectContent>
              </Select>
              <Select value={smsFilter} onValueChange={setSmsFilter}>
                <SelectTrigger className="w-[140px] border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 h-11">
                  <MessageSquare className="h-4 w-4 mr-2 text-slate-400 dark:text-slate-500" />
                  <SelectValue placeholder="SMS" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All SMS</SelectItem>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {(currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "ADMIN") && (
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="gap-2 h-11 px-5 bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                <TableHead className="font-semibold text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  User
                </TableHead>
                <TableHead className="font-semibold text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Role
                </TableHead>
                <TableHead className="font-semibold text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  SMS Status
                </TableHead>
                <TableHead className="font-semibold text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Assigned Rooms
                </TableHead>
                <TableHead className="font-semibold text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Created
                </TableHead>
                {(currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "ADMIN") && (
                  <TableHead className="font-semibold text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider text-right">
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "ADMIN" ? 6 : 5}
                    className="h-32 text-center"
                  >
                    <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                      <UsersIcon className="h-12 w-12 mb-4 text-slate-300 dark:text-slate-600" />
                      <p className="font-medium">No users found</p>
                      <p className="text-sm">Try adjusting your search or filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user, index) => {
                  const roleDisplay = getRoleDisplay(user.role)
                  const RoleIcon = roleDisplay.icon

                  return (
                    <TableRow
                      key={user.id}
                      className={cn(
                        "border-b border-slate-100 dark:border-slate-700 transition-colors hover:bg-cyan-50/30 dark:hover:bg-cyan-900/20",
                        "animate-slide-up",
                      )}
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar
                            className={cn(
                              "h-10 w-10 border-2 transition-all",
                              user.role === "SUPER_ADMIN"
                                ? "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30"
                                : user.role === "ADMIN"
                                  ? "border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/30"
                                  : "border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-900/30",
                            )}
                          >
                            <AvatarFallback
                              className={cn(
                                "font-semibold text-sm",
                                user.role === "SUPER_ADMIN"
                                  ? "text-amber-600 dark:text-amber-400"
                                  : user.role === "ADMIN"
                                    ? "text-violet-600 dark:text-violet-400"
                                    : "text-cyan-600 dark:text-cyan-400",
                              )}
                            >
                              {getInitials(user.name || "", user.username)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100">
                              {user.name || user.username}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">@{user.username}</p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="secondary" className={cn("font-medium text-xs gap-1.5", roleDisplay.bgClass)}>
                          <RoleIcon className="h-3 w-3" />
                          {roleDisplay.label}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              "h-2 w-2 rounded-full",
                              user.smsEnabled ? "bg-green-500 animate-pulse" : "bg-slate-300 dark:bg-slate-600",
                            )}
                          />
                          <span
                            className={cn(
                              "text-sm font-medium",
                              user.smsEnabled
                                ? "text-green-600 dark:text-green-400"
                                : "text-slate-500 dark:text-slate-400",
                            )}
                          >
                            {user.smsEnabled ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        {user.assignedRoomIds && user.assignedRoomIds.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                            {user.assignedRoomIds.slice(0, 2).map((roomId) => (
                              <Badge
                                key={roomId}
                                variant="outline"
                                className="text-xs border-slate-200 dark:border-slate-600 dark:text-slate-300"
                              >
                                {getRoomName(roomId)}
                              </Badge>
                            ))}
                            {user.assignedRoomIds.length > 2 && (
                              <Badge
                                variant="outline"
                                className="text-xs border-slate-200 dark:border-slate-600 dark:text-slate-300"
                              >
                                +{user.assignedRoomIds.length - 2} more
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-500 dark:text-slate-400">No rooms</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                          <span className="font-mono text-slate-600 dark:text-slate-300 tabular-nums">
                            {format(new Date(user.createdAt), "MMM d, yyyy")}
                          </span>
                        </div>
                      </TableCell>

                      {(currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "ADMIN") && (
                        <TableCell className="text-right">
                          {canManageUser(user) ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-700 data-[state=open]:bg-slate-100 dark:data-[state=open]:bg-slate-700"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-48 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                              >
                                <DropdownMenuItem
                                  onClick={() => handleEditUser(user)}
                                  className="hover:bg-slate-100 dark:hover:bg-slate-700"
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleToggleSms(user)}
                                  className="hover:bg-slate-100 dark:hover:bg-slate-700"
                                >
                                  {user.smsEnabled ? (
                                    <>
                                      <ToggleRight className="h-4 w-4 mr-2" />
                                      Disable SMS
                                    </>
                                  ) : (
                                    <>
                                      <ToggleLeft className="h-4 w-4 mr-2" />
                                      Enable SMS
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700" />
                                <DropdownMenuItem
                                  onClick={() => setDeleteUserId(user.id)}
                                  className="text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : user.role === "SUPER_ADMIN" ? (
                            <div className="flex items-center justify-end gap-2 text-xs text-amber-600 dark:text-amber-400">
                              <Crown className="h-3.5 w-3.5" />
                              <span className="font-medium">Protected</span>
                            </div>
                          ) : null}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={handleCloseDialog}
        user={editingUser}
        onSave={handleSaveUser}
        rooms={availableRooms}
        currentUser={currentUser}
      />

      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be undone. All associated data and
              permissions will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  )
}

export default Users