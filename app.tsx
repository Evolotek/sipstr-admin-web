"use client"

import { useState, useCallback } from "react"
import { LoginPage } from "./components/LoginPage"
import { DashboardLayout } from "./components/DashboardLayout"
import { apiService } from "./services/apiService"

export interface AdminSession {
  id: string
  email: string
  role: string
  token: string
}

export default function App() {
  const [session, setSession] = useState<AdminSession | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiService.login(email, password)
      setSession(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }, [])

  const handleLogout = useCallback(() => {
    apiService.logout()
    setSession(null)
    setError(null)
  }, [])

  if (!session) {
    return <LoginPage onLogin={handleLogin} loading={loading} error={error} />
  }

  return <DashboardLayout session={session} onLogout={handleLogout} />
}
