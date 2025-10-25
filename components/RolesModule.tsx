"use client"

import { useState, useEffect, useRef } from "react"
import { apiService } from "@/services/apiService"
import { CrudTable } from "./CrudTable"
import { Role } from "@/services/types"

export function RolesModule() {
  const [roles, setRoles] = useState<Role[]>([])
  const [allPermissions, setAllPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState<{ name: string; description: string; permissions: string[] }>({
    name: "",
    description: "",
    permissions: [],
  })

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState("")
  const [activeRoleId, setActiveRoleId] = useState<string | null>(null)

  useEffect(() => {
    loadRoles()
    loadPermissions()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const loadRoles = async () => {
    setLoading(true)
    try {
      const data = await apiService.getRoles()
      setRoles(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roles")
    } finally {
      setLoading(false)
    }
  }

  const loadPermissions = async () => {
    try {
      const perms = await apiService.getRolePermissions()
      setAllPermissions(perms)
    } catch (err) {
      console.error("Failed to load permissions:", err)
    }
  }

  // --- Add Role ---
  const handleAddRole = async () => {
    if (!formData.name.trim()) {
      alert("Role name is required")
      return
    }
    try {
      const newRole = await apiService.addRole({
        name: formData.name,
        description: formData.description,
        permissions: formData.permissions,
      })
      setRoles((prev) => [...prev, { ...newRole, permissions: formData.permissions }])
      setFormData({ name: "", description: "", permissions: [] })
      setShowAddModal(false)
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : "Failed to add role")
    }
  }

  // --- Delete Role ---
  const handleDeleteRole = async (roleId: string) => {
    if (!confirm("Are you sure you want to delete this role?")) return
    try {
      await apiService.deleteRole(roleId)
      setRoles((prev) => prev.filter((r) => r.id !== roleId))
    } catch (err) {
      console.error(err)
    }
  }

  // --- Manage Permissions ---
  const handleAddPermission = async (roleId: string, permission: string) => {
    try {
      await apiService.addRolePermission(roleId, permission)
      setRoles((prev) =>
        prev.map((r) => (r.id === roleId ? { ...r, permissions: [...r.permissions, permission] } : r))
      )
    } catch (err) {
      console.error(err)
    }
  }

  const handleRemovePermission = async (roleId: string, permission: string) => {
    try {
      await apiService.removeRolePermission(roleId, [permission])
      setRoles((prev) =>
        prev.map((r) => (r.id === roleId ? { ...r, permissions: r.permissions.filter((p) => p !== permission) } : r))
      )
    } catch (err) {
      console.error(err)
    }
  }

  // --- Filter roles ---
  const filteredRoles = roles.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))

  // --- Table Data ---
  const tableData = filteredRoles.map((role) => ({
    id: role.id,
    cells: [role.id, role.name, role.description || "-", role.permissions.join(", ")],
    actions: [
      {
        label: "Manage Permissions",
        onClick: () => setActiveRoleId(activeRoleId === role.id ? null : role.id),
      },
      {
        label: "Delete",
        onClick: () => handleDeleteRole(role.id),
      },
    ],
    extraComponent:
      activeRoleId === role.id ? (
        <div ref={dropdownRef} style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {allPermissions.map((p) => {
            const hasPermission = role.permissions.includes(p)
            return (
              <button
                key={p}
                onClick={() => (hasPermission ? handleRemovePermission(role.id, p) : handleAddPermission(role.id, p))}
                style={{
                  padding: "4px 8px",
                  borderRadius: 4,
                  border: "1px solid #ccc",
                  background: hasPermission ? "#eee" : "#fff",
                  cursor: "pointer",
                }}
              >
                {p} {hasPermission ? "✓" : "+"}
              </button>
            )
          })}
        </div>
      ) : null,
  }))

  return (
    <div>
      {error && (
        <div
          style={{
            backgroundColor: "#fee",
            color: "#c33",
            padding: "12px",
            borderRadius: "4px",
            marginBottom: "16px",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search by role name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #ccc", flex: 1 }}
        />
        <button
          onClick={() => setShowAddModal(true)}
          style={{ padding: "10px 16px", backgroundColor: "#FF6600", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
        >
          + Add Role
        </button>
      </div>

      {/* --- Add Role Modal --- */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.3)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 100,
          }}
        >
          <div
            style={{
              width: 400,
              background: "#fff",
              borderRadius: 8,
              padding: 20,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              position: "relative",
            }}
          >
            <h3 style={{ marginBottom: 16 }}>Add Role</h3>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 4 }}>Role Name</label>
              <input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter role name"
                style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #ccc", width: "100%" }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 4 }}>Description</label>
              <input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description"
                style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #ccc", width: "100%" }}
              />
            </div>

            <div style={{ marginBottom: 12, position: "relative" }} ref={dropdownRef}>
              <label style={{ display: "block", marginBottom: 4 }}>Permissions</label>
              <div
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid #ccc",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#fff",
                }}
              >
                <span>{formData.permissions.length ? formData.permissions.join(", ") : "Select permissions"}</span>
                <span style={{ fontWeight: "bold" }}>{dropdownOpen ? "▲" : "▼"}</span>
              </div>

              {dropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    maxHeight: 150,
                    overflowY: "auto",
                    border: "1px solid #ccc",
                    borderRadius: 6,
                    background: "#fff",
                    zIndex: 10,
                    marginTop: 4,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                    padding: 8,
                  }}
                >
                  {allPermissions.map((p) => (
                    <label
                      key={p}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 6px",
                        cursor: "pointer",
                        borderRadius: 4,
                        background: formData.permissions.includes(p) ? "#f0f0f0" : "transparent",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(p)}
                        onChange={() => {
                          if (formData.permissions.includes(p)) {
                            setFormData({ ...formData, permissions: formData.permissions.filter((x) => x !== p) })
                          } else {
                            setFormData({ ...formData, permissions: [...formData.permissions, p] })
                          }
                        }}
                      />
                      {p}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: "10px 16px",
                  backgroundColor: "#ccc",
                  color: "#000",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddRole}
                style={{
                  padding: "10px 16px",
                  backgroundColor: "#FF6600",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Add Role
              </button>
            </div>
          </div>
        </div>
      )}

      <CrudTable
        columns={["ID", "Name", "Description", "Permissions", "Actions"]}
        data={tableData}
        loading={loading}
      />
    </div>
  )
}
