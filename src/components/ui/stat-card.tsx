import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  variant?: "default" | "temperature" | "humidity" | "warning" | "success" | "info"
  className?: string
  index?: number
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  className,
  index = 0,
}: StatCardProps) {
  const iconVariants = {
    default: {
      // Light mode styles
      lightCardBg: "bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800",
      lightBorder: "border-slate-500",
      lightIconBg: "bg-white/20",
      lightIconColor: "text-white",
      lightTitleColor: "text-slate-200",
      lightValueColor: "text-white",
      lightSubtitleColor: "text-slate-300",
      lightAccent: "bg-white/50",
      // Dark mode styles
      darkCardBg: "dark:bg-gradient-to-br dark:from-slate-800 dark:via-slate-800 dark:to-slate-900",
      darkBorder: "dark:border-orange-500/40",
      darkIconBg: "dark:bg-orange-500/30",
      darkIconColor: "dark:text-orange-400",
      darkTitleColor: "dark:text-slate-300",
      darkValueColor: "dark:text-orange-400",
      darkSubtitleColor: "dark:text-slate-400",
      darkAccent: "dark:bg-orange-500",
    },
    temperature: {
      lightCardBg: "bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700",
      lightBorder: "border-blue-400",
      lightIconBg: "bg-white/20",
      lightIconColor: "text-white",
      lightTitleColor: "text-blue-100",
      lightValueColor: "text-white",
      lightSubtitleColor: "text-blue-200",
      lightAccent: "bg-white/50",
      darkCardBg: "dark:bg-gradient-to-br dark:from-slate-800 dark:via-slate-800 dark:to-slate-900",
      darkBorder: "dark:border-cyan-500/40",
      darkIconBg: "dark:bg-cyan-500/30",
      darkIconColor: "dark:text-cyan-400",
      darkTitleColor: "dark:text-slate-300",
      darkValueColor: "dark:text-cyan-400",
      darkSubtitleColor: "dark:text-slate-400",
      darkAccent: "dark:bg-cyan-500",
    },
    humidity: {
      lightCardBg: "bg-gradient-to-br from-cyan-500 via-cyan-600 to-teal-600",
      lightBorder: "border-cyan-400",
      lightIconBg: "bg-white/20",
      lightIconColor: "text-white",
      lightTitleColor: "text-cyan-100",
      lightValueColor: "text-white",
      lightSubtitleColor: "text-cyan-200",
      lightAccent: "bg-white/50",
      darkCardBg: "dark:bg-gradient-to-br dark:from-slate-800 dark:via-slate-800 dark:to-slate-900",
      darkBorder: "dark:border-teal-500/40",
      darkIconBg: "dark:bg-teal-500/30",
      darkIconColor: "dark:text-teal-400",
      darkTitleColor: "dark:text-slate-300",
      darkValueColor: "dark:text-teal-400",
      darkSubtitleColor: "dark:text-slate-400",
      darkAccent: "dark:bg-teal-500",
    },
    warning: {
      lightCardBg: "bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600",
      lightBorder: "border-amber-400",
      lightIconBg: "bg-white/20",
      lightIconColor: "text-white",
      lightTitleColor: "text-amber-100",
      lightValueColor: "text-white",
      lightSubtitleColor: "text-amber-200",
      lightAccent: "bg-white/50",
      darkCardBg: "dark:bg-gradient-to-br dark:from-slate-800 dark:via-slate-800 dark:to-slate-900",
      darkBorder: "dark:border-amber-500/40",
      darkIconBg: "dark:bg-amber-500/30",
      darkIconColor: "dark:text-amber-400",
      darkTitleColor: "dark:text-slate-300",
      darkValueColor: "dark:text-amber-400",
      darkSubtitleColor: "dark:text-slate-400",
      darkAccent: "dark:bg-amber-500",
    },
    success: {
      lightCardBg: "bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-600",
      lightBorder: "border-emerald-400",
      lightIconBg: "bg-white/20",
      lightIconColor: "text-white",
      lightTitleColor: "text-emerald-100",
      lightValueColor: "text-white",
      lightSubtitleColor: "text-emerald-200",
      lightAccent: "bg-white/50",
      darkCardBg: "dark:bg-gradient-to-br dark:from-slate-800 dark:via-slate-800 dark:to-slate-900",
      darkBorder: "dark:border-emerald-500/40",
      darkIconBg: "dark:bg-emerald-500/30",
      darkIconColor: "dark:text-emerald-400",
      darkTitleColor: "dark:text-slate-300",
      darkValueColor: "dark:text-emerald-400",
      darkSubtitleColor: "dark:text-slate-400",
      darkAccent: "dark:bg-emerald-500",
    },
    info: {
      lightCardBg: "bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600",
      lightBorder: "border-indigo-400",
      lightIconBg: "bg-white/20",
      lightIconColor: "text-white",
      lightTitleColor: "text-indigo-100",
      lightValueColor: "text-white",
      lightSubtitleColor: "text-indigo-200",
      lightAccent: "bg-white/50",
      darkCardBg: "dark:bg-gradient-to-br dark:from-slate-800 dark:via-slate-800 dark:to-slate-900",
      darkBorder: "dark:border-indigo-500/40",
      darkIconBg: "dark:bg-indigo-500/30",
      darkIconColor: "dark:text-indigo-400",
      darkTitleColor: "dark:text-slate-300",
      darkValueColor: "dark:text-indigo-400",
      darkSubtitleColor: "dark:text-slate-400",
      darkAccent: "dark:bg-indigo-500",
    },
  }

  const config = iconVariants[variant]
  const staggerClass = `stagger-${Math.min(index + 1, 6)}`

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-0.5 hover:shadow-xl",
        "animate-slide-up opacity-0",
        staggerClass,
        className,
      )}
    >
      <div
        className={cn(
          "relative h-full p-5 rounded-xl border-2",
          config.lightCardBg,
          config.darkCardBg,
          config.lightBorder,
          config.darkBorder,
          "shadow-lg",
        )}
      >
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

        <div className="relative flex items-start justify-between">
          <div className="space-y-2">
            <p
              className={cn(
                "text-xs font-bold tracking-wider uppercase",
                config.lightTitleColor,
                config.darkTitleColor,
              )}
            >
              {title}
            </p>
            <p
              className={cn(
                "text-3xl font-bold tracking-tight tabular-nums",
                config.lightValueColor,
                config.darkValueColor,
              )}
            >
              {value}
            </p>
            {subtitle && (
              <p className={cn("text-sm font-medium", config.lightSubtitleColor, config.darkSubtitleColor)}>
                {subtitle}
              </p>
            )}
            {trend && (
              <div
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md",
                  trend.isPositive
                    ? "bg-emerald-500/30 text-emerald-100 dark:bg-emerald-500/25 dark:text-emerald-300"
                    : "bg-rose-500/30 text-rose-100 dark:bg-rose-500/25 dark:text-rose-300",
                )}
              >
                <span>{trend.isPositive ? "↑" : "↓"}</span>
                {Math.abs(trend.value)}%
              </div>
            )}
          </div>

          <div
            className={cn(
              "p-4 rounded-xl transition-all duration-300",
              config.lightIconBg,
              config.darkIconBg,
              "group-hover:scale-110 shadow-lg backdrop-blur-sm",
            )}
          >
            <Icon className={cn("h-7 w-7", config.lightIconColor, config.darkIconColor)} strokeWidth={2} />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-1.5 overflow-hidden rounded-b-xl">
          <div
            className={cn(
              "h-full w-1/3",
              config.lightAccent,
              config.darkAccent,
              "group-hover:w-full transition-all duration-500 ease-out",
            )}
          />
        </div>
      </div>
    </div>
  )
}
