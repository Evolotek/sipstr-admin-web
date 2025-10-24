"use client"

import { useState, useEffect } from "react"
import { apiService } from "@/services/apiService"
import { CrudTable } from "./CrudTable"

export function RolesModule() {
  const [roles, setRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadRoles()
  }, [])

  const loadRoles = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiService.getRoles()
      setRoles(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roles")
      console.error("Failed to load roles:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await apiService.deleteRole(id)
      setRoles(roles.filter((r) => r.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete role")
      console.error("Failed to delete role:", err)
    }
  }

  return (
    <div>
      {error && (
        <div
          style={{
            backgroundColor: "#fee",
            color: "#c33",
            padding: "12px",
            borderRadius: "4px",
            marginBottom: "20px",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}
      <CrudTable
        columns={["ID", "Name", "Permissions", "Actions"]}
        data={roles.map((r) => ({
          id: r.id,
          cells: [r.id.slice(0, 8), r.name, r.permissions.join(", ")],
          actions: [{ label: "Delete", onClick: () => handleDelete(r.id) }],
        }))}
        loading={loading}
      />
    </div>
  )
}
