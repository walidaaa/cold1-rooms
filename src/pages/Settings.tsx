"use client"

import type React from "react"

import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Bell, Smartphone, Save, KeyRound, Eye, EyeOff, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { profileApi, settingsApi, userPreferencesApi } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"

const Settings = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const [isLoadingSettings, setIsLoadingSettings] = useState(false)
  const [isSavingSettings, setIsSavingSettings] = useState(false)

  const [tempAlertEnabled, setTempAlertEnabled] = useState(true)
  const [humidityAlertEnabled, setHumidityAlertEnabled] = useState(true)
  const [ac1AlertEnabled, setAc1AlertEnabled] = useState(true)
  const [ac2AlertEnabled, setAc2AlertEnabled] = useState(true)

  const [smsUrl, setSmsUrl] = useState("https://www.traccar.org/sms")
  const [smsAuthToken, setSmsAuthToken] = useState("")
  const [smsApiKey, setSmsApiKey] = useState("")
  const [smsDefaultRecipient, setSmsDefaultRecipient] = useState("+213671776343")
  const [smsCooldownSeconds, setSmsCooldownSeconds] = useState("30")

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setIsLoadingSettings(true)

      if (user?.role === "SUPER_ADMIN") {
        const response = await settingsApi.getAll()
        if (response.success && response.settings) {
          const s = response.settings
          setSmsUrl(s.sms_url || "https://www.traccar.org/sms")
          setSmsAuthToken(s.sms_auth_token || "")
          setSmsApiKey(s.sms_api_key || "")
          setSmsDefaultRecipient(s.sms_default_recipient || "+213671776343")
          setSmsCooldownSeconds(s.sms_cooldown_seconds || "30")
        }
      }

      const prefsResponse = await userPreferencesApi.get()
      if (prefsResponse.success && prefsResponse.preferences) {
        const p = prefsResponse.preferences
        setTempAlertEnabled(p.alert_temp_enabled)
        setHumidityAlertEnabled(p.alert_humidity_enabled)
        setAc1AlertEnabled(p.alert_ac1_enabled)
        setAc2AlertEnabled(p.alert_ac2_enabled)
      }
    } catch (error: any) {
      console.error("Failed to load settings:", error)
      toast({
        title: "Error",
        description: "Failed to load settings. Using default values.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingSettings(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New password and confirm password do not match",
        variant: "destructive",
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      })
      return
    }

    setIsChangingPassword(true)

    try {
      await profileApi.update({
        currentPassword,
        newPassword,
      })

      toast({
        title: "Success",
        description: "Password changed successfully",
      })

      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleSaveSettings = async () => {
    try {
      setIsSavingSettings(true)

      if (user?.role === "SUPER_ADMIN") {
        const settings = {
          sms_url: smsUrl,
          sms_auth_token: smsAuthToken,
          sms_api_key: smsApiKey,
          sms_default_recipient: smsDefaultRecipient,
          sms_cooldown_seconds: smsCooldownSeconds,
        }
        await settingsApi.update(settings)
      }

      await userPreferencesApi.update({
        alert_temp_enabled: tempAlertEnabled,
        alert_humidity_enabled: humidityAlertEnabled,
        alert_ac1_enabled: ac1AlertEnabled,
        alert_ac2_enabled: ac2AlertEnabled,
      })

      toast({
        title: "Success",
        description: "Settings saved successfully",
      })
    } catch (error: any) {
      console.error("Failed to save settings:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      })
    } finally {
      setIsSavingSettings(false)
    }
  }

  return (
    <DashboardLayout title="Settings" subtitle="Configure system preferences and notifications">
      <div className="max-w-3xl space-y-6">
        {/* Password Reset Section */}
        {(user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") && (
          <div className="bg-card backdrop-blur-sm rounded-xl p-6 border border-border shadow-card">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                <KeyRound className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-card-foreground">Change Password</h3>
                <p className="text-sm text-muted-foreground">Update your account password</p>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <Label className="font-semibold text-foreground">Current Password</Label>
                <div className="relative mt-1">
                  <Input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label className="font-semibold text-foreground">New Password</Label>
                <div className="relative mt-1">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Minimum 6 characters</p>
              </div>

              <div>
                <Label className="font-semibold text-foreground">Confirm New Password</Label>
                <div className="relative mt-1">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={isChangingPassword}
                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg text-white"
                >
                  {isChangingPassword ? "Changing..." : "Change Password"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Notification Preferences Section */}
        {user?.role === "ADMIN" && (
          <div className="bg-card backdrop-blur-sm rounded-xl p-6 border border-border shadow-card">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 shadow-lg">
                <Bell className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-card-foreground">My Notification Preferences</h3>
                <p className="text-sm text-muted-foreground">Choose which alerts you want to receive via SMS</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                  <div>
                    <Label className="font-medium text-foreground">Temperature Alerts</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Get notified on temperature violations</p>
                  </div>
                  <Switch checked={tempAlertEnabled} onCheckedChange={setTempAlertEnabled} />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                  <div>
                    <Label className="font-medium text-foreground">Humidity Alerts</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Get notified on humidity violations</p>
                  </div>
                  <Switch checked={humidityAlertEnabled} onCheckedChange={setHumidityAlertEnabled} />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                  <div>
                    <Label className="font-medium text-foreground">AC Input 1 Alerts</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Get notified on AC1 power issues</p>
                  </div>
                  <Switch checked={ac1AlertEnabled} onCheckedChange={setAc1AlertEnabled} />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                  <div>
                    <Label className="font-medium text-foreground">AC Input 2 Alerts</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Get notified on AC2 power issues</p>
                  </div>
                  <Switch checked={ac2AlertEnabled} onCheckedChange={setAc2AlertEnabled} />
                </div>

                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-sky-100 to-teal-100 dark:from-sky-900/30 dark:to-teal-900/30 rounded-lg border border-sky-300 dark:border-sky-500/30">
                  <div>
                    <Label className="font-semibold text-sky-900 dark:text-sky-100">Enable All Alerts</Label>
                    <p className="text-xs text-sky-700 dark:text-sky-300 mt-0.5">Quick toggle for all alert types</p>
                  </div>
                  <Switch
                    checked={tempAlertEnabled && humidityAlertEnabled && ac1AlertEnabled && ac2AlertEnabled}
                    onCheckedChange={(checked) => {
                      setTempAlertEnabled(checked)
                      setHumidityAlertEnabled(checked)
                      setAc1AlertEnabled(checked)
                      setAc2AlertEnabled(checked)
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SMS Configuration Section */}
        {user?.role === "SUPER_ADMIN" && (
          <div className="bg-card backdrop-blur-sm rounded-xl p-6 border border-border shadow-card">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                <Smartphone className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-card-foreground">SMS Configuration</h3>
                <p className="text-sm text-muted-foreground">Configure your SMS gateway settings</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="font-semibold text-foreground">SMS API Endpoint URL</Label>
                <Input
                  value={smsUrl}
                  onChange={(e) => setSmsUrl(e.target.value)}
                  placeholder="https://www.traccar.org/sms"
                  className="mt-1 bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">Your SMS gateway API endpoint</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold text-foreground">Authentication Token</Label>
                  <Input
                    type="password"
                    value={smsAuthToken}
                    onChange={(e) => setSmsAuthToken(e.target.value)}
                    placeholder="Enter auth token"
                    className="mt-1 bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
                <div>
                  <Label className="font-semibold text-foreground">
                    API Key <span className="text-muted-foreground text-xs">(Optional)</span>
                  </Label>
                  <Input
                    type="password"
                    value={smsApiKey}
                    onChange={(e) => setSmsApiKey(e.target.value)}
                    placeholder="Enter API key"
                    className="mt-1 bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold text-foreground">Default Recipient</Label>
                  <Input
                    value={smsDefaultRecipient}
                    onChange={(e) => setSmsDefaultRecipient(e.target.value)}
                    placeholder="+213XXXXXXXXX"
                    className="mt-1 bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Fallback number for test SMS</p>
                </div>
                <div>
                  <Label className="font-semibold text-foreground">Cooldown Period (seconds)</Label>
                  <Input
                    type="number"
                    value={smsCooldownSeconds}
                    onChange={(e) => setSmsCooldownSeconds(e.target.value)}
                    min="0"
                    placeholder="30"
                    className="mt-1 bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Time between SMS to same number</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSaveSettings}
            disabled={isSavingSettings || isLoadingSettings}
            className="bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700 shadow-lg px-8 text-white"
          >
            {isSavingSettings ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default Settings