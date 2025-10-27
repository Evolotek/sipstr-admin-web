// src/components/ReportsModule.tsx
"use client";

import React, { useState } from "react";
import { apiService } from "@/services/apiService";
import { StoreReportItemDTO, PageResponse } from "@/services/types";
function formatDateToDDMMYYYY(isoDate: string) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}-${m}-${y}`;
}

function formatMoney(value?: string | number) {
  if (value === undefined || value === null || value === "") return "-";
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) return value;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ReportsModule() {
  const [storeUuid, setStoreUuid] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [reports, setReports] = useState<StoreReportItemDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // pagination state (we request page 0 on generate)
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const validateForm = () => {
    if (!storeUuid.trim()) {
      setError("Please provide store UUID.");
      return false;
    }
    if (!dateRange.start || !dateRange.end) {
      setError("Please provide both start and end dates.");
      return false;
    }
    // optional: ensure start <= end
    if (dateRange.start > dateRange.end) {
      setError("Start date must be before or equal to end date.");
      return false;
    }
    return true;
  };

  const generateReport = async () => {
    setError(null);
    if (!validateForm()) return;

    setLoading(true);
    try {
      const start = formatDateToDDMMYYYY(dateRange.start);
      const end = formatDateToDDMMYYYY(dateRange.end);

      const resp = await apiService.getReports(storeUuid.trim(), start, end, 0, size) as PageResponse<StoreReportItemDTO>;
      console.log(resp);
      setReports(resp.content ?? []);
      setPage(resp.number ?? 0);
      setTotalPages(resp.totalPages ?? 0);
      setTotalElements(resp.totalElements ?? 0);
    } catch (err) {
      console.error("Failed to fetch reports:", err);
      setError(err instanceof Error ? err.message : "Failed to load reports");
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const onPrev = () => {
    if (page > 0) loadPage(page - 1);
  };

  const onNext = () => {
    if (page < totalPages - 1) loadPage(page + 1);
  };

  const loadPage = async (pageToLoad: number) => {
    setLoading(true);
    setError(null);
    try {
      const start = formatDateToDDMMYYYY(dateRange.start);
      const end = formatDateToDDMMYYYY(dateRange.end);

      const resp = await apiService.getReports(storeUuid.trim(), start, end, pageToLoad, size) as PageResponse<StoreReportItemDTO>;

      setReports(resp.content ?? []);
      setPage(resp.number ?? pageToLoad);
      setTotalPages(resp.totalPages ?? 0);
      setTotalElements(resp.totalElements ?? 0);
    } catch (err) {
      console.error("Failed to fetch reports:", err);
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ backgroundColor: "white", padding: 20, borderRadius: 8, marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <h3 style={{ margin: "0 0 15px 0", color: "#333" }}>Generate Store Report</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 15 }}>
          <div>
            <label style={{ display: "block", marginBottom: 5, fontSize: 14, fontWeight: 500 }}>Store UUID</label>
            <input
              type="text"
              placeholder="enter store uuid"
              value={storeUuid}
              onChange={(e) => setStoreUuid(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14 }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 5, fontSize: 14, fontWeight: 500 }}>Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14 }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 5, fontSize: 14, fontWeight: 500 }}>End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14 }}
            />
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button
            onClick={generateReport}
            disabled={loading}
            style={{
              padding: "8px 16px",
              backgroundColor: "#FF6600",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Generating..." : "Generate Report"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: "#fee", color: "#c33", padding: 12, borderRadius: 4, marginBottom: 20 }}>
          {error}
        </div>
      )}

      <div style={{ backgroundColor: "white", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#f5f5f5", borderBottom: "1px solid #e0e0e0" }}>
              <th style={{ padding: 12, textAlign: "left", fontSize: 14, fontWeight: 600 }}>Store</th>
              <th style={{ padding: 12, textAlign: "left", fontSize: 14, fontWeight: 600 }}>Order</th>
              <th style={{ padding: 12, textAlign: "left", fontSize: 14, fontWeight: 600 }}>Subtotal</th>
              <th style={{ padding: 12, textAlign: "left", fontSize: 14, fontWeight: 600 }}>Store Total</th>
              <th style={{ padding: 12, textAlign: "left", fontSize: 14, fontWeight: 600 }}>Net Total</th>
              <th style={{ padding: 12, textAlign: "left", fontSize: 14, fontWeight: 600 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#666" }}>Loading...</td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#666" }}>No reports available</td>
              </tr>
            ) : (
              reports.map((r, idx) => (
                <tr key={`${r.orderUuid}-${idx}`} style={{ borderBottom: "1px solid #e0e0e0" }}>
                  <td style={{ padding: 12, fontSize: 14 }}>{r.storeName}</td>
                  <td style={{ padding: 12, fontSize: 14 }}>{r.orderUuid}</td>
                  <td style={{ padding: 12, fontSize: 14 }}>{formatMoney(r.subtotal)}</td>
                  <td style={{ padding: 12, fontSize: 14 }}>{formatMoney(r.storeTotal)}</td>
                  <td style={{ padding: 12, fontSize: 14 }}>{formatMoney(r.netTotal)}</td>
                  <td style={{ padding: 12, fontSize: 14 }}>{r.storeStatus}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <div style={{ color: "#666" }}>
          {totalElements > 0 ? `Showing page ${page + 1} of ${totalPages} — ${totalElements} items` : ""}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onPrev} disabled={page === 0 || loading} style={{ padding: "8px 12px", borderRadius: 4, border: "1px solid #ddd", backgroundColor: page === 0 ? "#f7f7f7" : "white" }}>
            Prev
          </button>
          <button onClick={onNext} disabled={page >= totalPages - 1 || loading} style={{ padding: "8px 12px", borderRadius: 4, border: "1px solid #ddd", backgroundColor: page >= totalPages - 1 ? "#f7f7f7" : "white" }}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
