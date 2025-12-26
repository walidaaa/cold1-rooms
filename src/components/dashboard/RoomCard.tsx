"use client"

import type { Room } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Thermometer, Droplets, Clock, Settings, Trash2, Plug, MapPin, AlertTriangle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface RoomCardProps {
  room: Room & {
    currentTemp?: number
    currentHumidity?: number
    _count?: { readings: number; alerts: number }
    isOnline?: boolean
    acInput1?: number | boolean
    acInput2?: number | boolean
    acInput1Name?: string
    acInput2Name?: string
    gpsLatitude?: number
    gpsLongitude?: number
  }
  onEdit?: () => void
  onDelete?: () => void
  index?: number
}

export function RoomCard({ room, onEdit, onDelete, index = 0 }: RoomCardProps) {
  const temperature = room.temperature ?? room.currentTemp
  const humidity = room.currentHumidity ?? room.humidity

  const isOnline = room.isOnline ?? false

  const tempMin = room.tempMin !== undefined && room.tempMin !== null ? Number(room.tempMin) : null
  const tempMax = room.tempMax !== undefined && room.tempMax !== null ? Number(room.tempMax) : null
  const humidityMin = room.humidityMin !== undefined && room.humidityMin !== null ? Number(room.humidityMin) : null
  const humidityMax = room.humidityMax !== undefined && room.humidityMax !== null ? Number(room.humidityMax) : null

  const hasValidTempThresholds = tempMin !== null && tempMax !== null
  const hasValidHumidityThresholds = humidityMin !== null && humidityMax !== null

  const tempInRange =
    !hasValidTempThresholds ||
    (temperature !== undefined && temperature !== null && temperature >= tempMin! && temperature <= tempMax!)

  const humidityInRange =
    !hasValidHumidityThresholds ||
    (humidity !== undefined && humidity !== null && humidity >= humidityMin! && humidity <= humidityMax!)

  const hasTempAlert = hasValidTempThresholds && !tempInRange
  const hasHumidityAlert = hasValidHumidityThresholds && !humidityInRange

  const alertsCount = room.activeAlerts ?? room._count?.alerts ?? 0

  // Real-time threshold violations will create alerts in the database via MQTT service
  const hasDbAlerts = alertsCount > 0

  const ac1Value = typeof room.acInput1 === "number" ? room.acInput1 === 1 : !!room.acInput1
  const ac2Value = typeof room.acInput2 === "number" ? room.acInput2 === 1 : !!room.acInput2

  // AC power loss alerts are created in the database by the MQTT service
  const hasAcAlert = !ac1Value || !ac2Value

  const hasGps =
    room.gpsLatitude !== null &&
    room.gpsLatitude !== undefined &&
    room.gpsLongitude !== null &&
    room.gpsLongitude !== undefined

  const showAlertBanner = hasDbAlerts

  return (
    <div
      className={cn(
        "group relative rounded-xl overflow-hidden h-full flex flex-col",
        "bg-white dark:bg-slate-900",
        "border-2",
        showAlertBanner
          ? "border-red-500 dark:border-red-500 animate-alert-blink"
          : "border-slate-200 dark:border-slate-700 hover:border-cyan-300 dark:hover:border-cyan-500/50",
        "shadow-sm hover:shadow-lg",
        "transition-all duration-300",
      )}
    >
      {/* Alert Banner - only show if there are active alerts */}
      {showAlertBanner && (
        <div className="bg-red-500 dark:bg-red-600 px-4 py-1.5 flex items-center justify-center gap-2 animate-pulse">
          <AlertTriangle className="h-4 w-4 text-white" />
          <span className="text-xs font-bold text-white uppercase tracking-wide">
            {alertsCount} Alert{alertsCount > 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between p-4 border-b",
          showAlertBanner
            ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
            : "bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/80 border-slate-200 dark:border-slate-700",
        )}
      >
        <div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white">{room.name}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">ID: {room.hardwareId || room.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn("w-2.5 h-2.5 rounded-full", isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
          <span
            className={cn(
              "text-xs font-semibold",
              isOnline ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500",
            )}
          >
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Temperature & Humidity */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Temperature */}
          <div
            className={cn(
              "rounded-lg p-3 text-center border",
              hasTempAlert
                ? "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700"
                : "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800/50",
            )}
          >
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <Thermometer
                className={cn("h-4 w-4", hasTempAlert ? "text-red-500" : "text-cyan-500 dark:text-cyan-400")}
              />
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider",
                  hasTempAlert ? "text-red-600 dark:text-red-400" : "text-slate-600 dark:text-slate-300",
                )}
              >
                Temp
              </span>
            </div>
            <p
              className={cn(
                "text-2xl font-black",
                hasTempAlert ? "text-red-600 dark:text-red-400" : "text-cyan-600 dark:text-cyan-400",
              )}
            >
              {temperature !== undefined && temperature !== null ? `${Number(temperature).toFixed(1)}°` : "--"}
            </p>
            <p
              className={cn(
                "text-[10px] mt-1",
                hasTempAlert ? "text-red-500 dark:text-red-400" : "text-slate-500 dark:text-slate-400",
              )}
            >
              {hasValidTempThresholds ? `${tempMin}° — ${tempMax}°C` : "No threshold"}
            </p>
          </div>

          {/* Humidity */}
          <div
            className={cn(
              "rounded-lg p-3 text-center border",
              hasHumidityAlert
                ? "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700"
                : "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800/50",
            )}
          >
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <Droplets
                className={cn("h-4 w-4", hasHumidityAlert ? "text-red-500" : "text-violet-500 dark:text-violet-400")}
              />
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider",
                  hasHumidityAlert ? "text-red-600 dark:text-red-400" : "text-slate-600 dark:text-slate-300",
                )}
              >
                Humidity
              </span>
            </div>
            <p
              className={cn(
                "text-2xl font-black",
                hasHumidityAlert ? "text-red-600 dark:text-red-400" : "text-violet-600 dark:text-violet-400",
              )}
            >
              {humidity !== undefined && humidity !== null ? `${Number(humidity).toFixed(1)}%` : "--"}
            </p>
            <p
              className={cn(
                "text-[10px] mt-1",
                hasHumidityAlert ? "text-red-500 dark:text-red-400" : "text-slate-500 dark:text-slate-400",
              )}
            >
              {hasValidHumidityThresholds ? `${humidityMin}% — ${humidityMax}%` : "No threshold"}
            </p>
          </div>
        </div>

        {/* AC Power Status */}
        <div
          className={cn(
            "rounded-lg p-3 mb-3 border",
            hasAcAlert
              ? "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 animate-ac-blink"
              : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700",
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <Plug className={cn("h-4 w-4", hasAcAlert ? "text-red-500" : "text-slate-400")} />
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider",
                hasAcAlert ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400",
              )}
            >
              AC Power Status
            </span>
          </div>
          <div className="flex items-center justify-center gap-4">
            {/* AC Input 1 */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                  ac1Value
                    ? "bg-emerald-500 border-emerald-400 shadow-lg shadow-emerald-500/50"
                    : "bg-red-500 border-red-400 shadow-lg shadow-red-500/50 animate-led-blink",
                )}
              >
                <div className={cn("w-3 h-3 rounded-full", ac1Value ? "bg-emerald-300" : "bg-red-300")} />
              </div>
              <span
                className={cn(
                  "text-[10px] font-semibold",
                  ac1Value ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
                )}
              >
                {room.acInput1Name || "AC1"} {ac1Value ? "ON" : "OFF"}
              </span>
            </div>

            {/* AC Input 2 */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                  ac2Value
                    ? "bg-emerald-500 border-emerald-400 shadow-lg shadow-emerald-500/50"
                    : "bg-red-500 border-red-400 shadow-lg shadow-red-500/50 animate-led-blink",
                )}
              >
                <div className={cn("w-3 h-3 rounded-full", ac2Value ? "bg-emerald-300" : "bg-red-300")} />
              </div>
              <span
                className={cn(
                  "text-[10px] font-semibold",
                  ac2Value ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
                )}
              >
                {room.acInput2Name || "AC2"} {ac2Value ? "ON" : "OFF"}
              </span>
            </div>
          </div>
        </div>

        {/* GPS Location */}
        {hasGps && (
          <div className="flex items-center gap-2 mb-3 px-1">
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              GPS
            </span>
            <div className="flex-1 flex items-center justify-end">
              <span className="text-[10px] font-mono text-slate-600 dark:text-slate-300">
                {room.gpsLatitude?.toFixed(4)}°, {room.gpsLongitude?.toFixed(4)}°
              </span>
            </div>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />
      </div>

      {/* Footer */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3 border-t mt-auto",
          showAlertBanner
            ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
            : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700",
        )}
      >
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
          <Clock className="h-3 w-3" />
          {room.lastReading ? (
            <span>{formatDistanceToNow(new Date(room.lastReading), { addSuffix: true })}</span>
          ) : (
            <span>No data</span>
          )}
        </div>
        <span
          className={cn(
            "px-2 py-0.5 rounded text-[10px] font-bold",
            showAlertBanner
              ? "bg-red-500 text-white animate-pulse"
              : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400",
          )}
        >
          {showAlertBanner ? `${alertsCount} Alert${alertsCount > 1 ? "s" : ""}` : "OK"}
        </span>
      </div>

      {/* Action Buttons */}
      {(onEdit || onDelete) && (
        <div className="flex gap-2 p-4 pt-0">
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs font-medium bg-transparent"
              onClick={onEdit}
            >
              <Settings className="h-3 w-3 mr-1" />
              Configure
            </Button>
          )}
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 bg-transparent"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
