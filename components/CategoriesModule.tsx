"use client"

import { useState, useEffect } from "react"
import { apiService } from "@/services/apiService"
import { CrudTable } from "./CrudTable"

export function CategoriesModule() {
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: "", description: "" })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiService.getCategories()
      setCategories(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories")
      console.error("Failed to load categories:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!formData.name) return
    try {
      const newCategory = await apiService.createCategory(formData)
      setCategories([...categories, newCategory])
      setFormData({ name: "", description: "" })
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add category")
      console.error("Failed to add category:", err)
    }
  }

  const handleUpdate = async () => {
    if (!editingId) return
    try {
      const updated = await apiService.updateCategory(editingId, formData)
      setCategories(categories.map((c) => (c.id === editingId ? updated : c)))
      setFormData({ name: "", description: "" })
      setEditingId(null)
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update category")
      console.error("Failed to update category:", err)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await apiService.deleteCategory(id)
      setCategories(categories.filter((c) => c.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category")
      console.error("Failed to delete category:", err)
    }
  }

  const handleEdit = (category: any) => {
    setFormData({ name: category.name, description: category.description })
    setEditingId(category.id)
    setShowForm(true)
  }

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={() => {
            setShowForm(!showForm)
            if (showForm) {
              setEditingId(null)
              setFormData({ name: "", description: "" })
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
          {showForm ? "Cancel" : "+ Add Category"}
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
            <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
              Category Name
            </label>
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
            <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
                boxSizing: "border-box",
                minHeight: "80px",
              }}
            />
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
            {editingId ? "Update" : "Add"} Category
          </button>
        </div>
      )}

      <CrudTable
        columns={["ID", "Name", "Description", "Actions"]}
        data={categories.map((c) => ({
          id: c.id,
          cells: [c.id.slice(0, 8), c.name, c.description.slice(0, 50)],
          actions: [
            { label: "Edit", onClick: () => handleEdit(c) },
            { label: "Delete", onClick: () => handleDelete(c.id) },
          ],
        }))}
        loading={loading}
      />
    </div>
  )
}
