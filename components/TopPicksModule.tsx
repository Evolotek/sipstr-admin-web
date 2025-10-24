"use client"

import { useState, useEffect } from "react"
import { apiService } from "@/services/apiService"
import { CrudTable } from "./CrudTable"

export function TopPicksModule() {
  const [topPicks, setTopPicks] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ productUuid: "", rank: "" })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTopPicks()
  }, [])

  const loadTopPicks = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiService.getTopPicks()
      setTopPicks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load top picks")
      console.error("Failed to load top picks:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!formData.productUuid) return
    try {
      const newPick = await apiService.addTopPick(formData.productUuid, Number.parseInt(formData.rank) || 1)
      setTopPicks([...topPicks, newPick])
      setFormData({ productUuid: "", rank: "" })
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add top pick")
      console.error("Failed to add top pick:", err)
    }
  }

  const handleDelete = async (productUuid: string) => {
    try {
      await apiService.removeTopPick(productUuid)
      setTopPicks(topPicks.filter((t) => t.productUuid !== productUuid))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove top pick")
      console.error("Failed to remove top pick:", err)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={() => {
            setShowForm(!showForm)
            if (showForm) {
              setFormData({ productUuid: "", rank: "" })
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
          {showForm ? "Cancel" : "+ Add Top Pick"}
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
              <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>Rank</label>
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

      <CrudTable
        columns={["ID", "Product", "Rank", "Actions"]}
        data={topPicks.map((t) => ({
          id: t.productUuid || t.id,
          cells: [(t.productUuid || t.id).slice(0, 8), t.productName, t.rank],
          actions: [{ label: "Delete", onClick: () => handleDelete(t.productUuid || t.id) }],
        }))}
        loading={loading}
      />
    </div>
  )
}
