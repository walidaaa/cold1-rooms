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
import { Switch } from "@/components/ui/switch"
import type { User, Role, Room, UserPhone } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Shield,
  UserIcon,
  Bell,
  Warehouse,
  Lock,
  User2,
  AtSign,
  Check,
  ShieldCheck,
  UserCog,
  Crown,
  Phone,
  Plus,
  Trash2,
  Star,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface CreateUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: User | null
  onSave: (user: Partial<User> & { password?: string; assignedRoomIds?: number[]; phones?: UserPhone[] }) => void
  rooms?: Room[]
  currentUser?: User | null
}

export function CreateUserDialog({ open, onOpenChange, user, onSave, rooms = [], currentUser }: CreateUserDialogProps) {
  const [username, setUsername] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<Role>("USER")
  const [smsEnabled, setSmsEnabled] = useState(true)
  const [assignedRoomIds, setAssignedRoomIds] = useState<number[]>([])
  const [phones, setPhones] = useState<UserPhone[]>([])

  const canCreateSuperAdmin = currentUser?.role === "SUPER_ADMIN"
  const canCreateAdmin = currentUser?.role === "SUPER_ADMIN"

  useEffect(() => {
    if (open) {
      if (user) {
        setUsername(user.username)
        setName(user.name || "")
        setPassword("")
        setRole(user.role)
        setSmsEnabled(user.smsEnabled)
        setAssignedRoomIds(user.assignedRoomIds || [])
        setPhones(user.phones || [])
      } else {
        resetForm()
      }
    }
  }, [open, user])

  const isEdit = !!user

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!username.trim()) {
      toast.error("Username is required")
      return
    }

    if (!isEdit && !password.trim()) {
      toast.error("Password is required")
      return
    }

    if (smsEnabled && phones.length === 0) {
      toast.error("Warning: SMS alerts enabled but no phone numbers added. User won't receive alerts.", {
        duration: 5000,
      })
    }

    const userData: Partial<User> & { password?: string; assignedRoomIds?: number[]; phones?: UserPhone[] } = {
      id: user?.id,
      username,
      name: name || username,
      role,
      smsEnabled,
      assignedRoomIds,
      phones,
    }

    if (!isEdit && password) {
      userData.password = password
    }

    onSave(userData)
    onOpenChange(false)
    resetForm()
  }

  const resetForm = () => {
    setUsername("")
    setName("")
    setPassword("")
    setRole("USER")
    setSmsEnabled(true)
    setAssignedRoomIds([])
    setPhones([])
  }

  const toggleRoom = (roomId: number) => {
    setAssignedRoomIds((prev) => (prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]))
  }

  const addPhone = () => {
    setPhones([...phones, { phone_number: "", is_primary: phones.length === 0, assigned_rooms: [] }])
  }

  const removePhone = (index: number) => {
    const newPhones = phones.filter((_, i) => i !== index)
    if (newPhones.length > 0 && !newPhones.some((p) => p.is_primary)) {
      newPhones[0].is_primary = true
    }
    setPhones(newPhones)
  }

  const updatePhone = (index: number, field: keyof UserPhone, value: any) => {
    const newPhones = [...phones]
    if (field === "is_primary" && value === true) {
      newPhones.forEach((p, i) => {
        p.is_primary = i === index
      })
    } else {
      newPhones[index] = { ...newPhones[index], [field]: value }
    }
    setPhones(newPhones)
  }

  const togglePhoneRoom = (phoneIndex: number, roomId: number) => {
    const newPhones = [...phones]
    const currentRooms = newPhones[phoneIndex].assigned_rooms || []
    if (currentRooms.includes(roomId)) {
      newPhones[phoneIndex].assigned_rooms = currentRooms.filter((id) => id !== roomId)
    } else {
      newPhones[phoneIndex].assigned_rooms = [...currentRooms, roomId]
    }
    setPhones(newPhones)
  }

  const getRoomName = (roomId: number) => {
    return rooms.find((r) => r.id === roomId)?.name || `Room ${roomId}`
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto border-border/50 p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            {isEdit ? (
              <>
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <UserIcon className="h-4 w-4 text-primary" />
                </div>
                Edit User
              </>
            ) : (
              <>
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <User2 className="h-4 w-4 text-emerald-500" />
                </div>
                Create New User
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEdit ? "Update user information and permissions" : "Add a new team member to the system"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 p-6 pt-4">
          {/* User Info Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium flex items-center gap-2">
                <AtSign className="h-3.5 w-3.5 text-muted-foreground" />
                Username
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                disabled={isEdit}
                className="bg-muted/30 border-border/50 focus:border-primary/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                <User2 className="h-3.5 w-3.5 text-muted-foreground" />
                Full Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter full name (optional)"
                className="bg-muted/30 border-border/50 focus:border-primary/50"
              />
            </div>

            {!isEdit && (
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  minLength={6}
                  className="bg-muted/30 border-border/50 focus:border-primary/50"
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-muted-foreground" />
              Role
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {canCreateSuperAdmin && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setRole("SUPER_ADMIN")}
                  onKeyDown={(e) => e.key === "Enter" && setRole("SUPER_ADMIN")}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all cursor-pointer",
                    role === "SUPER_ADMIN"
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-border/50 bg-muted/20 hover:border-border",
                  )}
                >
                  <div
                    className={cn(
                      "h-9 w-9 rounded-lg flex items-center justify-center",
                      role === "SUPER_ADMIN" ? "bg-amber-500/20" : "bg-muted/50",
                    )}
                  >
                    <Crown
                      className={cn("h-4 w-4", role === "SUPER_ADMIN" ? "text-amber-500" : "text-muted-foreground")}
                    />
                  </div>
                  <div className="text-center">
                    <p
                      className={cn(
                        "font-medium text-xs",
                        role === "SUPER_ADMIN" ? "text-amber-500" : "text-foreground",
                      )}
                    >
                      Super Admin
                    </p>
                    <p className="text-[10px] text-muted-foreground">Full access</p>
                  </div>
                </div>
              )}

              {canCreateAdmin && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setRole("ADMIN")}
                  onKeyDown={(e) => e.key === "Enter" && setRole("ADMIN")}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all cursor-pointer",
                    role === "ADMIN"
                      ? "border-violet-500 bg-violet-500/10"
                      : "border-border/50 bg-muted/20 hover:border-border",
                  )}
                >
                  <div
                    className={cn(
                      "h-9 w-9 rounded-lg flex items-center justify-center",
                      role === "ADMIN" ? "bg-violet-500/20" : "bg-muted/50",
                    )}
                  >
                    <ShieldCheck
                      className={cn("h-4 w-4", role === "ADMIN" ? "text-violet-500" : "text-muted-foreground")}
                    />
                  </div>
                  <div className="text-center">
                    <p className={cn("font-medium text-xs", role === "ADMIN" ? "text-violet-500" : "text-foreground")}>
                      Admin
                    </p>
                    <p className="text-[10px] text-muted-foreground">Manage users</p>
                  </div>
                </div>
              )}

              <div
                role="button"
                tabIndex={0}
                onClick={() => setRole("USER")}
                onKeyDown={(e) => e.key === "Enter" && setRole("USER")}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all cursor-pointer",
                  !canCreateSuperAdmin && !canCreateAdmin && "col-span-3",
                  canCreateSuperAdmin && canCreateAdmin && "",
                  role === "USER"
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-border/50 bg-muted/20 hover:border-border",
                )}
              >
                <div
                  className={cn(
                    "h-9 w-9 rounded-lg flex items-center justify-center",
                    role === "USER" ? "bg-emerald-500/20" : "bg-muted/50",
                  )}
                >
                  <UserCog className={cn("h-4 w-4", role === "USER" ? "text-emerald-500" : "text-muted-foreground")} />
                </div>
                <div className="text-center">
                  <p className={cn("font-medium text-xs", role === "USER" ? "text-emerald-500" : "text-foreground")}>
                    User
                  </p>
                  <p className="text-[10px] text-muted-foreground">Limited access</p>
                </div>
              </div>
            </div>
          </div>

          {/* SMS Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Bell className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <Label htmlFor="sms" className="text-sm font-medium cursor-pointer">
                  SMS Alerts
                </Label>
                <p className="text-xs text-muted-foreground">Receive SMS notifications for alerts</p>
              </div>
            </div>
            <Switch id="sms" checked={smsEnabled} onCheckedChange={setSmsEnabled} />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Warehouse className="h-3.5 w-3.5 text-muted-foreground" />
              Assigned Rooms
              <span className="ml-auto text-xs text-muted-foreground font-normal">
                {assignedRoomIds.length} selected
              </span>
            </Label>
            {rooms.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-3 rounded-xl border border-border/50 bg-muted/20">
                {rooms.map((room) => {
                  const isSelected = assignedRoomIds.includes(room.id)
                  return (
                    <div
                      key={room.id}
                      role="checkbox"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onClick={() => toggleRoom(room.id)}
                      onKeyDown={(e) => e.key === "Enter" && toggleRoom(room.id)}
                      className={cn(
                        "flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all",
                        isSelected
                          ? "bg-primary/10 border border-primary/30"
                          : "bg-background/50 border border-transparent hover:bg-muted/50",
                      )}
                    >
                      <div
                        className={cn(
                          "h-4 w-4 rounded border flex items-center justify-center transition-colors",
                          isSelected ? "bg-primary border-primary" : "border-muted-foreground/30 bg-background",
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <span className="text-sm leading-none flex-1 truncate">{room.name}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground p-4 rounded-xl border border-border/50 bg-muted/20 text-center">
                No rooms available. Create rooms first to assign them to users.
              </div>
            )}
          </div>

          {/* Phone Numbers Section */}
          {smsEnabled && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  Phone Numbers
                  <span className="text-xs text-muted-foreground font-normal">({phones.length})</span>
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPhone}
                  className="h-8 gap-1 bg-transparent"
                >
                  <Plus className="h-3 w-3" />
                  Add Phone
                </Button>
              </div>

              {phones.length === 0 ? (
                <div className="text-sm text-muted-foreground p-4 rounded-xl border border-border/50 bg-muted/20 text-center">
                  No phone numbers added. Click "Add Phone" to add a phone number.
                </div>
              ) : (
                <div className="space-y-3">
                  {phones.map((phone, index) => (
                    <div key={index} className="p-4 rounded-xl border border-border/50 bg-muted/20 space-y-3">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="+1234567890"
                              value={phone.phone_number}
                              onChange={(e) => updatePhone(index, "phone_number", e.target.value)}
                              className="flex-1 h-9"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => updatePhone(index, "is_primary", true)}
                              className={cn(
                                "h-9 w-9",
                                phone.is_primary ? "text-amber-500" : "text-muted-foreground hover:text-amber-500",
                              )}
                              title={phone.is_primary ? "Primary phone" : "Set as primary"}
                            >
                              <Star className={cn("h-4 w-4", phone.is_primary && "fill-current")} />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removePhone(index)}
                              className="h-9 w-9 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          {phone.is_primary && (
                            <Badge variant="secondary" className="text-xs">
                              Primary
                            </Badge>
                          )}
                        </div>
                      </div>

                      {assignedRoomIds.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">
                            Assigned Rooms for this phone{" "}
                            <span className="text-muted-foreground/70">
                              (leave empty to receive alerts from all assigned rooms)
                            </span>
                          </Label>
                          <div className="flex flex-wrap gap-2">
                            {assignedRoomIds.map((roomId) => {
                              const isAssigned = phone.assigned_rooms?.includes(roomId)
                              return (
                                <Badge
                                  key={roomId}
                                  variant={isAssigned ? "default" : "outline"}
                                  className={cn(
                                    "cursor-pointer transition-all text-xs",
                                    isAssigned
                                      ? "bg-primary/90 hover:bg-primary"
                                      : "hover:bg-muted-foreground/10 text-muted-foreground",
                                  )}
                                  onClick={() => togglePhoneRoom(index, roomId)}
                                >
                                  {getRoomName(roomId)}
                                </Badge>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-4 gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border/50">
              Cancel
            </Button>
            <Button type="submit" className="shadow-lg shadow-primary/20">
              {isEdit ? "Save Changes" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
