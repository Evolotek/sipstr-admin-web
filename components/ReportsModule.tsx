"use client"

import { useState, useEffect } from "react"
import { apiService } from "@/services/apiService"

export function ReportsModule() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState({ start: "", end: "" })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiService.getReports(undefined, dateRange.start || undefined)
      setReports(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports")
      console.error("Failed to load reports:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div
        style={{
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "8px",
          marginBottom: "20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <h3 style={{ margin: "0 0 15px 0", color: "#333" }}>Filter Reports</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
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
              End Date
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
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
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              onClick={loadReports}
              style={{
                width: "100%",
                padding: "8px 12px",
                backgroundColor: "#FF6600",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              Generate Report
            </button>
          </div>
        </div>
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

      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          overflow: "hidden",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f5f5f5", borderBottom: "1px solid #e0e0e0" }}>
              <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600", color: "#333" }}>
                Store
              </th>
              <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600", color: "#333" }}>
                Total Orders
              </th>
              <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600", color: "#333" }}>
                Revenue
              </th>
              <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600", color: "#333" }}>
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ padding: "20px", textAlign: "center", color: "#666" }}>
                  Loading...
                </td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: "20px", textAlign: "center", color: "#666" }}>
                  No reports available
                </td>
              </tr>
            ) : (
              reports.map((report, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #e0e0e0" }}>
                  <td style={{ padding: "12px", fontSize: "14px", color: "#333" }}>{report.store}</td>
                  <td style={{ padding: "12px", fontSize: "14px", color: "#333" }}>{report.orders}</td>
                  <td style={{ padding: "12px", fontSize: "14px", color: "#333" }}>${report.revenue}</td>
                  <td style={{ padding: "12px", fontSize: "14px", color: "#333" }}>{report.date}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
