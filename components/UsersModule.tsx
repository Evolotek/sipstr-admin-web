"use client"

import { useState, useEffect } from "react"
import { apiService } from "@/services/apiService"
import { CrudTable } from "./CrudTable"

export function UsersModule() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: "", email: "", role: "user" })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiService.getUsers()
      setUsers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users")
      console.error("Failed to load users:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!formData.name || !formData.email) return
    try {
      const newUser = await apiService.createUser(formData)
      setUsers([...users, newUser])
      setFormData({ name: "", email: "", role: "user" })
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add user")
      console.error("Failed to add user:", err)
    }
  }

  const handleUpdate = async () => {
    if (!editingId) return
    try {
      const uuid = editingId
      const updated = await apiService.updateUser(uuid, formData)
      setUsers(users.map((u) => (u.uuid === uuid || u.id === uuid ? updated : u)))
      setFormData({ name: "", email: "", role: "user" })
      setEditingId(null)
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user")
      console.error("Failed to update user:", err)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await apiService.deleteUser(id)
      setUsers(users.filter((u) => u.uuid !== id && u.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user")
      console.error("Failed to delete user:", err)
    }
  }

  const handleEdit = (user: any) => {
    setFormData({ name: user.name, email: user.email, role: user.role })
    setEditingId(user.uuid || user.id)
    setShowForm(true)
  }

  return (
    <div>
      <div style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
        <button
          onClick={() => {
            setShowForm(!showForm)
            if (showForm) {
              setEditingId(null)
              setFormData({ name: "", email: "", role: "user" })
            }
          }}
          style={{
            padding: "10px 16px",
            backgroundColor: "#FF6600",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "500",
          }}
        >
          {showForm ? "Cancel" : "+ Add User"}
        </button>
      </div>

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

      {showForm && (
        <div
          style={{
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "8px",
            marginBottom: "20px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="moderator">Moderator</option>
            </select>
          </div>
          <button
            onClick={editingId ? handleUpdate : handleAdd}
            style={{
              padding: "10px 16px",
              backgroundColor: "#FF6600",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            {editingId ? "Update" : "Add"} User
          </button>
        </div>
      )}

      <CrudTable
        columns={["ID", "Name", "Email", "Role", "Actions"]}
        data={users.map((u) => ({
          id: u.uuid || u.id,
          cells: [(u.uuid || u.id).slice(0, 8), u.name, u.email, u.role],
          actions: [
            { label: "Edit", onClick: () => handleEdit(u) },
            { label: "Delete", onClick: () => handleDelete(u.uuid || u.id) },
          ],
        }))}
        loading={loading}
      />
    </div>
  )
}
