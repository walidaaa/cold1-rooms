"use client"

import { cn } from "@/lib/utils"
import { NavLink } from "@/components/NavLink"
import {
  LayoutDashboard,
  Warehouse,
  AlertTriangle,
  Users,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  BarChart3,
  ShieldCheck,
  UserCog,
  Crown,
} from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/", adminOnly: false },
    { icon: Warehouse, label: "Cold Rooms", path: "/rooms", adminOnly: false },
    { icon: BarChart3, label: "Analytics", path: "/analytics", adminOnly: false },
    { icon: AlertTriangle, label: "Alerts", path: "/alerts", adminOnly: false },
    { icon: MessageSquare, label: "SMS Logs", path: "/sms-logs", adminOnly: false },
    { icon: Settings, label: "Settings", path: "/settings", adminOnly: false },
    { icon: Users, label: "Users", path: "/users", adminOnly: true },
  ]

  const filteredNavItems = navItems.filter((item) => {
    if (!item.adminOnly) return true
    return user?.role === "SUPER_ADMIN" || user?.role === "ADMIN"
  })

  const handleLogout = async () => {
    await logout()
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    })
    navigate("/login")
  }

  const getRoleDisplay = () => {
    if (user?.role === "SUPER_ADMIN") {
      return {
        label: "Super Admin",
        icon: Crown,
        color: "text-amber-400",
      }
    }
    if (user?.role === "ADMIN") {
      return {
        label: "Admin",
        icon: ShieldCheck,
        color: "text-violet-400",
      }
    }
    return {
      label: "User",
      icon: UserCog,
      color: "text-emerald-400",
    }
  }

  const roleDisplay = getRoleDisplay()

  return (
    <aside
      className={cn(
        "bg-sidebar flex flex-col transition-all duration-300 border-r border-sidebar-border sticky top-0 h-screen",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="p-4 border-b border-sidebar-border shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white shadow-md flex items-center justify-center p-1.5 shrink-0">
              <img src="/hikma-logo.png" alt="Hikma" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-bold text-sidebar-foreground leading-tight text-sm">Hikma Pharmaceutical</h1>
              <p className="text-xs text-sidebar-foreground/60">Cold Room Monitor</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 transition-all hover:bg-sidebar-accent hover:text-sidebar-foreground",
              collapsed && "justify-center px-2",
            )}
            activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {!collapsed && user && (
        <div className="px-4 py-3 border-t border-sidebar-border shrink-0">
          <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name || user.username}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <roleDisplay.icon className={cn("h-3.5 w-3.5", roleDisplay.color)} />
            <p className={cn("text-xs font-medium", roleDisplay.color)}>{roleDisplay.label}</p>
          </div>
        </div>
      )}

      <div className="p-3 border-t border-sidebar-border space-y-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent h-9",
            collapsed && "px-2 justify-center",
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Collapse
            </>
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className={cn(
            "w-full justify-start text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 h-9",
            collapsed && "px-2 justify-center",
          )}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sign Out</span>}
        </Button>
      </div>
    </aside>
  )
}
