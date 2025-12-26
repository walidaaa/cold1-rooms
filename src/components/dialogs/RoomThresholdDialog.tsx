"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Thermometer, Droplets, Settings2, Plug, MapPin, Info } from "lucide-react"
import type { RoomStatus } from "@/lib/api"
import { toast } from "sonner"

interface Room {
  id?: number
  name: string
  location: string
  hardwareId: string
  status: RoomStatus
  minTemp: number
  maxTemp: number
  minHumidity: number
  maxHumidity: number
  acInput1?: number
  acInput2?: number
  acInput1Name?: string
  acInput2Name?: string
  gpsLatitude?: number
  gpsLongitude?: number
  activeAlerts?: number
  createdAt: Date
  updatedAt: Date
}

interface RoomThresholdDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  room: Room | null
  onSave: (room: any) => void
}

export function RoomThresholdDialog({ open, onOpenChange, room, onSave }: RoomThresholdDialogProps) {
  const [name, setName] = useState("")
  const [location, setLocation] = useState("")
  const [hardwareId, setHardwareId] = useState("")
  const [status, setStatus] = useState<RoomStatus>("ACTIVE")
  const [minTemp, setMinTemp] = useState("")
  const [maxTemp, setMaxTemp] = useState("")
  const [minHumidity, setMinHumidity] = useState("")
  const [maxHumidity, setMaxHumidity] = useState("")
  const [acInput1Name, setAcInput1Name] = useState("")
  const [acInput2Name, setAcInput2Name] = useState("")

  useEffect(() => {
    if (room) {
      setName(room.name)
      setLocation(room.location)
      setHardwareId(room.hardwareId)
      setStatus(room.status)
      setMinTemp(room.minTemp.toString())
      setMaxTemp(room.maxTemp.toString())
      setMinHumidity(room.minHumidity.toString())
      setMaxHumidity(room.maxHumidity.toString())
      setAcInput1Name(room.acInput1Name || "AC Input 1")
      setAcInput2Name(room.acInput2Name || "AC Input 2")
    } else {
      resetForm()
    }
  }, [room, open])

  const resetForm = () => {
    setName("")
    setLocation("")
    setHardwareId("")
    setStatus("ACTIVE")
    setMinTemp("2")
    setMaxTemp("8")
    setMinHumidity("35")
    setMaxHumidity("65")
    setAcInput1Name("AC Input 1")
    setAcInput2Name("AC Input 2")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("Room name is required")
      return
    }

    if (!hardwareId.trim()) {
      toast.error("Hardware ID is required")
      return
    }

    const minTempNum = Number.parseFloat(minTemp)
    const maxTempNum = Number.parseFloat(maxTemp)
    const minHumNum = Number.parseFloat(minHumidity)
    const maxHumNum = Number.parseFloat(maxHumidity)

    if (isNaN(minTempNum) || isNaN(maxTempNum) || isNaN(minHumNum) || isNaN(maxHumNum)) {
      toast.error("All threshold values must be valid numbers")
      return
    }

    if (minTempNum >= maxTempNum) {
      toast.error("Min temperature must be less than max temperature")
      return
    }

    if (minHumNum >= maxHumNum) {
      toast.error("Min humidity must be less than max humidity")
      return
    }

    const roomData = {
      id: room?.id,
      name,
      location,
      hardwareId,
      status,
      minTemp: minTempNum,
      maxTemp: maxTempNum,
      minHumidity: minHumNum,
      maxHumidity: maxHumNum,
      acInput1Name: acInput1Name.trim() || "AC Input 1",
      acInput2Name: acInput2Name.trim() || "AC Input 2",
    }

    onSave(roomData)

    onOpenChange(false)
  }

  const isEdit = !!room

  const ac1Enabled = typeof room?.acInput1 === "number" ? room.acInput1 === 1 : !!room?.acInput1
  const ac2Enabled = typeof room?.acInput2 === "number" ? room.acInput2 === 1 : !!room?.acInput2

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            {isEdit ? "Edit Room & Thresholds" : "Create New Room"}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? "Update room information and threshold limits" : "Add a new cold room to the system"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Room Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Room Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Cold Room A1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Building 1, Floor 1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hardware">Hardware ID</Label>
              <Input
                id="hardware"
                value={hardwareId}
                onChange={(e) => setHardwareId(e.target.value)}
                placeholder="e.g., HW-001"
                disabled={isEdit}
                className={isEdit ? "bg-muted cursor-not-allowed" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v: RoomStatus) => setStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Temperature Thresholds */}
          <div className="p-4 border rounded-lg bg-temperature/5 space-y-3">
            <div className="flex items-center gap-2 text-temperature">
              <Thermometer className="h-4 w-4" />
              <Label className="font-medium">Temperature Thresholds (°C)</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minTemp" className="text-sm text-muted-foreground">
                  Minimum
                </Label>
                <Input
                  id="minTemp"
                  type="number"
                  step="0.1"
                  value={minTemp}
                  onChange={(e) => setMinTemp(e.target.value)}
                  placeholder="-20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxTemp" className="text-sm text-muted-foreground">
                  Maximum
                </Label>
                <Input
                  id="maxTemp"
                  type="number"
                  step="0.1"
                  value={maxTemp}
                  onChange={(e) => setMaxTemp(e.target.value)}
                  placeholder="8"
                />
              </div>
            </div>
          </div>

          {/* Humidity Thresholds */}
          <div className="p-4 border rounded-lg bg-humidity/5 space-y-3">
            <div className="flex items-center gap-2 text-humidity">
              <Droplets className="h-4 w-4" />
              <Label className="font-medium">Humidity Thresholds (%)</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minHumidity" className="text-sm text-muted-foreground">
                  Minimum
                </Label>
                <Input
                  id="minHumidity"
                  type="number"
                  step="1"
                  value={minHumidity}
                  onChange={(e) => setMinHumidity(e.target.value)}
                  placeholder="30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxHumidity" className="text-sm text-muted-foreground">
                  Maximum
                </Label>
                <Input
                  id="maxHumidity"
                  type="number"
                  step="1"
                  value={maxHumidity}
                  onChange={(e) => setMaxHumidity(e.target.value)}
                  placeholder="65"
                />
              </div>
            </div>
          </div>

          {isEdit && (
            <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20 space-y-3">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <Plug className="h-4 w-4" />
                <Label className="font-medium">AC Power Input Names</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="acInput1Name" className="text-sm text-muted-foreground">
                    AC Input 1 Name
                  </Label>
                  <Input
                    id="acInput1Name"
                    value={acInput1Name}
                    onChange={(e) => setAcInput1Name(e.target.value)}
                    placeholder="e.g., Main Power"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="acInput2Name" className="text-sm text-muted-foreground">
                    AC Input 2 Name
                  </Label>
                  <Input
                    id="acInput2Name"
                    value={acInput2Name}
                    onChange={(e) => setAcInput2Name(e.target.value)}
                    placeholder="e.g., Backup Generator"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between px-3 py-2 rounded-md bg-white dark:bg-slate-900 border">
                  <span className="text-sm font-medium">{acInput1Name || "AC Input 1"}</span>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      ac1Enabled
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {ac1Enabled ? "Alerts ON" : "Alerts OFF"}
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-2 rounded-md bg-white dark:bg-slate-900 border">
                  <span className="text-sm font-medium">{acInput2Name || "AC Input 2"}</span>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      ac2Enabled
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {ac2Enabled ? "Alerts ON" : "Alerts OFF"}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <p>Customize the names for your AC power inputs. Alert activation is managed by the hardware device.</p>
              </div>
            </div>
          )}

          {isEdit && room?.gpsLatitude !== null && room?.gpsLatitude !== undefined && (
            <div className="p-4 border rounded-lg bg-emerald-50 dark:bg-emerald-950/20 space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <MapPin className="h-4 w-4" />
                <Label className="font-medium">GPS Location</Label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Latitude</Label>
                  <div className="px-3 py-2 rounded-md bg-white dark:bg-slate-900 border">
                    <span className="text-sm font-mono">{room.gpsLatitude?.toFixed(6)}°</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Longitude</Label>
                  <div className="px-3 py-2 rounded-md bg-white dark:bg-slate-900 border">
                    <span className="text-sm font-mono">{room.gpsLongitude?.toFixed(6)}°</span>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <p>GPS coordinates are provided by the hardware device and are read-only.</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{isEdit ? "Save Changes" : "Create Room"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
