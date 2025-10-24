"use client"

import { useState, useEffect } from "react"
import { apiService } from "@/services/apiService"
import { CrudTable } from "./CrudTable"

export function BrandsModule() {
  const [brands, setBrands] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: "", description: "" })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadBrands()
  }, [])

  const loadBrands = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiService.getBrands()
      setBrands(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load brands")
      console.error("Failed to load brands:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!formData.name) return
    try {
      const newBrand = await apiService.createBrand(formData)
      setBrands([...brands, newBrand])
      setFormData({ name: "", description: "" })
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add brand")
      console.error("Failed to add brand:", err)
    }
  }

  const handleUpdate = async () => {
    if (!editingId) return
    try {
      const updated = await apiService.updateBrand(editingId, formData)
      setBrands(brands.map((b) => (b.id === editingId ? updated : b)))
      setFormData({ name: "", description: "" })
      setEditingId(null)
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update brand")
      console.error("Failed to update brand:", err)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await apiService.deleteBrand(id)
      setBrands(brands.filter((b) => b.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete brand")
      console.error("Failed to delete brand:", err)
    }
  }

  const handleEdit = (brand: any) => {
    setFormData({ name: brand.name, description: brand.description })
    setEditingId(brand.id)
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
          {showForm ? "Cancel" : "+ Add Brand"}
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
              Brand Name
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
            {editingId ? "Update" : "Add"} Brand
          </button>
        </div>
      )}

      <CrudTable
        columns={["ID", "Name", "Description", "Actions"]}
        data={brands.map((b) => ({
          id: b.id,
          cells: [b.id.slice(0, 8), b.name, b.description.slice(0, 50)],
          actions: [
            { label: "Edit", onClick: () => handleEdit(b) },
            { label: "Delete", onClick: () => handleDelete(b.id) },
          ],
        }))}
        loading={loading}
      />
    </div>
  )
}
