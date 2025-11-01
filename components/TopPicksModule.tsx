"use client"

import { useState, useEffect } from "react"
import { apiService } from "@/services/apiService"
import { CrudTable } from "./CrudTable"
import { TopPick } from "@/services/types"


export function TopPicksModule() {
  const [topPicks, setTopPicks] = useState<TopPick[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ productUuid: "", rank: "" })
  const [error, setError] = useState<string | null>(null)

  // Modal Edit
  const [editingPick, setEditingPick] = useState<TopPick | null>(null)
  const [editData, setEditData] = useState({ rank: 0, isFeatured: false })

  useEffect(() => {
    loadTopPicks()
  }, [])

  const loadTopPicks = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiService.getTopPicks()
      const mapped = data.map((t: any) => ({
        ...t,
        rankingScore: t.rankingScore ?? 0,
        uuid: t.uuid,
      }))
      setTopPicks(mapped)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load top picks")
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!formData.productUuid) {
      alert("Product UUID is required")
      return
    }

    try {
      const numericRank = Number.parseFloat(formData.rank) || 0
      await apiService.addTopPick(formData.productUuid, numericRank)
      await loadTopPicks()
      setFormData({ productUuid: "", rank: "" })
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add top pick")
    }
  }

  const handleDelete = async (t: TopPick) => {
    const productUuid = t.uuid
    if (!productUuid) {
      alert("Cannot delete: missing product UUID")
      return
    }
    if (!confirm("Are you sure you want to remove this top pick?")) return

    try {
      await apiService.removeTopPick(productUuid)
      setTopPicks(prev => prev.filter(x => x.uuid !== productUuid))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove top pick")
    }
  }

  const openEditModal = (t: TopPick) => {
    setEditingPick(t)
    setEditData({ rank: t.rankingScore, isFeatured: t.isFeatured })
  }

  const handleUpdate = async () => {
    if (!editingPick || !editingPick.uuid) return
    try {
      await apiService.updateTopPick(editingPick.uuid, editData.rank, editData.isFeatured)
      await loadTopPicks()
      setEditingPick(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update top pick")
    }
  }

  return (
    <div>
      {/* Add Top Pick Button */}
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={() => {
            setShowForm(!showForm)
            if (showForm) setFormData({ productUuid: "", rank: "" })
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
          {showForm ? "Cancel" : "+ Add Top Pick"}
        </button>
      </div>

      {/* Error */}
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

      {/* Add Top Pick Form */}
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                Product UUID
              </label>
              <input
                type="text"
                value={formData.productUuid}
                onChange={(e) => setFormData({ ...formData, productUuid: e.target.value })}
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
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
                Rank
              </label>
              <input
                type="number"
                value={formData.rank}
                onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
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
          </div>
          <button
            onClick={handleAdd}
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
            Add Top Pick
          </button>
        </div>
      )}

      {/* CRUD Table */}
      <CrudTable
        columns={["ID", "Product", "Rank", "Featured", "Actions"]}
        data={topPicks.map((t) => ({
          id: String(t.uuid || t.productId),
          cells: [t.productId, t.productName, t.rankingScore, t.isFeatured ? "✅" : "❌"],
          actions: [
            { label: "Update", onClick: () => openEditModal(t) },
            { label: "Delete", onClick: () => handleDelete(t) },
          ],
        }))}
        loading={loading}
      />

      {/* Edit Modal */}
      {editingPick && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "25px",
              borderRadius: "8px",
              width: "400px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            <h2 style={{ marginBottom: "15px" }}>Edit Top Pick</h2>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>Product Name</label>
              <input
                type="text"
                value={editingPick.productName}
                readOnly
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  backgroundColor: "#f5f5f5",
                }}
              />
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>Rank</label>
              <input
                type="number"
                value={editData.rank}
                onChange={(e) => setEditData({ ...editData, rank: Number(e.target.value) })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                }}
              />
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "500" }}>
                <input
                  type="checkbox"
                  checked={editData.isFeatured}
                  onChange={(e) => setEditData({ ...editData, isFeatured: e.target.checked })}
                />
                Featured
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => setEditingPick(null)}
                style={{
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                style={{
                  padding: "8px 12px",
                  backgroundColor: "#FF6600",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
