"use client"

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { useState } from "react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { RoomCard } from "@/components/dashboard/RoomCard"
import { roomsApi, type Room } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Filter, RefreshCw, Building2, CheckCircle2, Wrench, XCircle } from "lucide-react"
import { RoomThresholdDialog } from "@/components/dialogs/RoomThresholdDialog"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { useConnection } from "@/contexts/ConnectionContext"
import { useDataCache } from "@/contexts/DataCacheContext"
import { cn } from "@/lib/utils"
import { StatCard } from "@/components/ui/stat-card"
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

const Rooms = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [thresholdDialogOpen, setThresholdDialogOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [deleteRoomId, setDeleteRoomId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  const { isConnected } = useConnection()
  const { data, isRefreshing, refreshRooms, removeRoom, addRoom, updateRoom, refreshAll } = useDataCache()

  const rooms = data.rooms

  const filteredRooms = rooms.filter((room) => {
    const matchesSearch =
      room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.hardwareId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      false

    const matchesStatus = statusFilter === "all" || room.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const handleSaveRoom = async (roomData: any) => {
    try {
      if (roomData.id) {
        await roomsApi.update(roomData.id, {
          name: roomData.name,
          location: roomData.location,
          hardwareId: roomData.hardwareId,
          status: roomData.status,
          tempMin: roomData.minTemp,
          tempMax: roomData.maxTemp,
          humidityMin: roomData.minHumidity,
          humidityMax: roomData.maxHumidity,
          acInput1Name: roomData.acInput1Name,
          acInput2Name: roomData.acInput2Name,
        })
        toast({ title: "Room Updated", description: "Room settings have been updated successfully." })
      } else {
        await roomsApi.create({
          name: roomData.name,
          location: roomData.location,
          hardwareId: roomData.hardwareId,
          status: roomData.status,
          tempMin: roomData.minTemp,
          tempMax: roomData.maxTemp,
          humidityMin: roomData.minHumidity,
          maxHumidity: roomData.maxHumidity,
        })
        toast({ title: "Room Created", description: "New cold room has been created successfully." })
      }
      refreshAll()
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save room",
        variant: "destructive",
      })
    }
  }

  const handleDeleteRoom = async () => {
    if (!deleteRoomId || isDeleting) return

    setIsDeleting(true)
    try {
      await roomsApi.delete(deleteRoomId)
      removeRoom(deleteRoomId)
      toast({ title: "Room Deleted", description: "Cold room has been deleted successfully." })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete room",
        variant: "destructive",
      })
    } finally {
      setDeleteRoomId(null)
      setIsDeleting(false)
    }
  }

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room)
    setThresholdDialogOpen(true)
  }

  const handleCloseDialog = (open: boolean) => {
    setThresholdDialogOpen(open)
    if (!open) setEditingRoom(null)
  }

  const handleAddRoom = () => {
    setEditingRoom(null)
    setThresholdDialogOpen(true)
  }

  const activeCount = rooms.filter((r) => r.status === "ACTIVE").length
  const maintenanceCount = rooms.filter((r) => r.status === "MAINTENANCE").length
  const inactiveCount = rooms.filter((r) => r.status === "INACTIVE").length

  const canManageRooms = user?.role === "ADMIN" && isConnected && !isDeleting

  return (
    <DashboardLayout title="Cold Rooms" subtitle="Manage and monitor all pharmaceutical cold rooms">
      {/* Subtle refresh indicator */}
      {isRefreshing && (
        <div className="fixed top-20 right-4 z-50">
          <div className="flex items-center gap-2 bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border/50 shadow-sm">
            <RefreshCw className="h-3 w-3 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Updating...</span>
          </div>
        </div>
      )}

      <div
        className={cn(
          "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6",
          isRefreshing && "opacity-95 transition-opacity",
        )}
      >
        <StatCard title="Total Rooms" value={rooms.length} subtitle="All cold rooms" icon={Building2} variant="info" />
        <StatCard
          title="Active"
          value={activeCount}
          subtitle="Running normally"
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Maintenance"
          value={maintenanceCount}
          subtitle="Under service"
          icon={Wrench}
          variant="warning"
        />
        <StatCard
          title="Inactive"
          value={inactiveCount}
          subtitle="Currently offline"
          icon={XCircle}
          variant="default"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search rooms by name, location, or hardware ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
          {canManageRooms && (
            <Button onClick={handleAddRoom}>
              <Plus className="h-4 w-4 mr-2" />
              Add Room
            </Button>
          )}
        </div>
      </div>

      <div
        className={cn(
          "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
          isRefreshing && "opacity-95 transition-opacity",
        )}
      >
        {filteredRooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            onEdit={canManageRooms ? () => handleEditRoom(room) : undefined}
            onDelete={canManageRooms ? () => setDeleteRoomId(room.id) : undefined}
          />
        ))}
      </div>

      {filteredRooms.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No rooms found matching your search.</p>
        </div>
      )}

      <RoomThresholdDialog
        open={thresholdDialogOpen}
        onOpenChange={handleCloseDialog}
        room={
          editingRoom
            ? {
                id: editingRoom.id,
                name: editingRoom.name,
                location: editingRoom.location || "",
                minTemp: editingRoom.tempMin,
                maxTemp: editingRoom.tempMax,
                minHumidity: editingRoom.humidityMin,
                maxHumidity: editingRoom.humidityMax,
                hardwareId: editingRoom.hardwareId,
                status: editingRoom.status,
                acInput1: editingRoom.acInput1,
                acInput2: editingRoom.acInput2,
                acInput1Name: editingRoom.acInput1Name,
                acInput2Name: editingRoom.acInput2Name,
                gpsLatitude: editingRoom.gpsLatitude,
                gpsLongitude: editingRoom.gpsLongitude,
                activeAlerts: editingRoom.activeAlerts,
                createdAt: new Date(),
                updatedAt: new Date(),
              }
            : null
        }
        onSave={handleSaveRoom}
      />

      <AlertDialog open={!!deleteRoomId} onOpenChange={() => !isDeleting && setDeleteRoomId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Room</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this room? This will also delete all associated readings and alerts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRoom}
              className="bg-destructive text-destructive-foreground"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  )
}

export default Rooms
