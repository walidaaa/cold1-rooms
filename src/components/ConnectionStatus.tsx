"use client"

import { useConnection } from "@/contexts/ConnectionContext"
import { isApiRateLimited } from "@/lib/api"
import { Wifi, WifiOff, Loader2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"

export function ConnectionStatus() {
  const { isConnected, isChecking, retryCount } = useConnection()
  const rateLimited = isApiRateLimited()

  return (
    <TooltipProvider>
      <Tooltip>
        {isConnected && !rateLimited ? (
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-xs text-success">
              <Wifi className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Connected</span>
            </div>
          </TooltipTrigger>
        ) : (
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              {isChecking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <WifiOff className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">
                {rateLimited ? "Rate limited" : isChecking ? "Reconnecting..." : "Disconnected"}
              </span>
            </div>
          </TooltipTrigger>
        )}
        <TooltipContent>
          <p>
            {rateLimited
              ? "Too many requests - waiting before retry"
              : isConnected
                ? "Backend connection active"
                : isChecking
                  ? "Attempting to reconnect..."
                  : `Disconnected - auto-reconnecting (attempt ${retryCount})`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
