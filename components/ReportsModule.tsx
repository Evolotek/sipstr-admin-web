// src/components/ReportsModule.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { apiService } from "@/services/apiService";
import { StoreReportItemDTO, PageResponse } from "@/services/types";

/* ------------------ Helpers ------------------ */
function formatDateToDDMMYYYY(isoDate: string) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}-${m}-${y}`;
}

function formatMoney(value?: string | number) {
  if (value === undefined || value === null || value === "") return "-";
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) return String(value);
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ------------------ Toast ------------------ */
function Toast({
  open,
  message,
  type = "info",
  onClose,
}: {
  open: boolean;
  message?: string;
  type?: "info" | "success" | "error";
  onClose: () => void;
}) {
  if (!open || !message) return null;
  const bg = type === "success" ? "#16a34a" : type === "error" ? "#dc2626" : "#0ea5e9";
  return (
    <div
      role="status"
      onClick={onClose}
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        background: bg,
        color: "#fff",
        padding: "10px 14px",
        borderRadius: 8,
        boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
        zIndex: 9999,
        cursor: "pointer",
        maxWidth: 420,
      }}
    >
      {message}
    </div>
  );
}

/* ------------------ Component ------------------ */
export function ReportsModule() {
  // store typed name + resolved uuid (uuid kept internal, not shown to user)
  const [storeName, setStoreName] = useState("");
  const [stores, setStores] = useState<{ uuid: string; storeName: string }[]>([]);
  const [selectedStoreUuid, setSelectedStoreUuid] = useState<string | null>(null);

  // suggestions visibility
  const [showSuggestions, setShowSuggestions] = useState(false);

  // form inputs
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  // results
  const [reports, setReports] = useState<StoreReportItemDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // pagination
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Toast
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | undefined>();
  const [toastType, setToastType] = useState<"info" | "success" | "error">("info");
  const openToast = (msg: string, type: "info" | "success" | "error" = "info") => {
    setToastMsg(msg);
    setToastType(type);
    setToastOpen(true);
    setTimeout(() => setToastOpen(false), 4200);
  };

  // Load stores once (for autocomplete)
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await apiService.getStores();
        if (!mounted) return;
        const mapped = (res as any[]).map((s) => ({
          uuid: s.uuid ?? s.storeUuid ?? s.storeId ?? s.id,
          storeName: s.storeName ?? s.name ?? s.store_name ?? s.name ?? "",
        }));
        setStores(mapped.filter((x) => x.storeName));
      } catch (err) {
        console.warn("Failed to load stores for reports autocomplete", err);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // resolve storeName -> uuid whenever storeName changes (exact / prefix)
  useEffect(() => {
    if (!storeName.trim()) {
      setSelectedStoreUuid(null);
      return;
    }
    const lower = storeName.trim().toLowerCase();
    const exact = stores.find((s) => s.storeName.toLowerCase() === lower);
    if (exact) {
      setSelectedStoreUuid(exact.uuid);
      return;
    }
    const prefix = stores.find((s) => s.storeName.toLowerCase().startsWith(lower));
    if (prefix) {
      setSelectedStoreUuid(prefix.uuid);
      return;
    }
    setSelectedStoreUuid(null);
  }, [storeName, stores]);

  const storeSuggestions = useMemo(() => {
    const q = storeName.trim().toLowerCase();
    if (!q) return stores.slice(0, 10);
    return stores.filter((s) => s.storeName.toLowerCase().includes(q)).slice(0, 12);
  }, [storeName, stores]);

  // validation
  const validateForm = () => {
    setError(null);
    if (!selectedStoreUuid) {
      setError("Please select a valid store from suggestions.");
      return false;
    }
    if (!dateRange.start || !dateRange.end) {
      setError("Please provide both start and end dates.");
      return false;
    }
    if (dateRange.start > dateRange.end) {
      setError("Start date must be before or equal to end date.");
      return false;
    }
    return true;
  };

  // generate first page
const generateReport = async () => {
  setError(null);

  // FORM VALIDATION
  if (!validateForm()) {
    openToast("Validation failed", "error");
    return;
  }

  setLoading(true);

  try {
    const start = formatDateToDDMMYYYY(dateRange.start);
    const end = formatDateToDDMMYYYY(dateRange.end);

    const resp = (await apiService.getReports(
      selectedStoreUuid!,
      start,
      end,
      0,
      size
    )) as PageResponse<StoreReportItemDTO>;

    setReports(resp.content ?? []);
    setPage(resp.number ?? 0);
    setTotalPages(resp.totalPages ?? 0);
    setTotalElements(resp.totalElements ?? 0);

  } catch (err: any) {
    console.error("Failed to fetch reports:", err);

    // Extract meaningful error message
    const status = err?.response?.status;
    const backendMsg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message;

    const shortMsg =
      backendMsg ||
      (status ? `Request failed with status ${status}` : "Failed to load reports");

    setError(shortMsg);
    openToast(shortMsg, "error");
    setReports([]);

    // OPTIONALLY log full detail (not shown to user)
    const fullLog = safeStringify(err?.response?.data);
    console.log("Backend error payload:", fullLog);

  } finally {
    setLoading(false);
  }
};

// Helper for safe JSON stringify (avoids crashes)
function safeStringify(value: any) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}


  const loadPage = async (pageToLoad: number) => {
    if (!validateForm()) return;
    setLoading(true);
    setError(null);
    try {
      const start = formatDateToDDMMYYYY(dateRange.start);
      const end = formatDateToDDMMYYYY(dateRange.end);
      const resp = (await apiService.getReports(selectedStoreUuid!, start, end, pageToLoad, size)) as PageResponse<
        StoreReportItemDTO
      >;
      setReports(resp.content ?? []);
      setPage(resp.number ?? pageToLoad);
      setTotalPages(resp.totalPages ?? 0);
      setTotalElements(resp.totalElements ?? 0);
    } catch (err: any) {
      console.error("Pagination load failed:", err);
      const msg = (err && (err.message || err?.response?.data?.message)) ?? "Failed to load page";
      setError(String(msg));
      openToast(String(msg), "error");
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

  // whether generate button should be enabled
  const isFormValid = Boolean(selectedStoreUuid && dateRange.start && dateRange.end && dateRange.start <= dateRange.end);

  return (
    <div>
      <div style={{ backgroundColor: "#fff", padding: 20, borderRadius: 8, marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <h3 style={{ margin: "0 0 15px 0", color: "#333" }}>Generate Store Report</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 15 }}>
          <div style={{ position: "relative" }}>
            <label style={{ display: "block", marginBottom: 5, fontSize: 14, fontWeight: 500 }}>Store Name</label>
            <input
              type="text"
              placeholder="Type store name and pick from suggestions"
              value={storeName}
              onChange={(e) => {
                setStoreName(e.target.value);
                setShowSuggestions(true);
                setError(null);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                // allow click on suggestion
                setTimeout(() => setShowSuggestions(false), 150);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const candidate =
                    stores.find((s) => s.storeName.toLowerCase() === storeName.trim().toLowerCase()) ??
                    stores.find((s) => s.storeName.toLowerCase().startsWith(storeName.trim().toLowerCase()));
                  if (candidate) {
                    setSelectedStoreUuid(candidate.uuid);
                    setStoreName(candidate.storeName);
                    openToast(`Resolved store "${candidate.storeName}"`, "success");
                  } else {
                    setSelectedStoreUuid(null);
                    openToast("Store not found — please choose from suggestions.", "error");
                  }
                  setShowSuggestions(false);
                }
              }}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: 14 }}
            />

            {/* Suggestion dropdown now positioned with calc(100% + small gap) so it won't overlay input */}
            {showSuggestions && storeSuggestions.length > 0 && storeName.trim() !== "" && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  right: 0,
                  background: "#fff",
                  border: "1px solid #ddd",
                  zIndex: 1200,
                  maxHeight: "220px",
                  overflowY: "auto",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
                  borderRadius: 6,
                }}
              >
                {storeSuggestions.map((s, i) => (
                  <div
                    key={i}
                    onMouseDown={(ev) => {
                      // prevent blur -> select safely
                      ev.preventDefault();
                      setStoreName(s.storeName);
                      setSelectedStoreUuid(s.uuid);
                      setShowSuggestions(false);
                      openToast(`Selected "${s.storeName}"`, "success");
                    }}
                    style={{ padding: "8px 10px", cursor: "pointer", borderBottom: "1px solid #f7f7f7" }}
                  >
                    {/* only show store name (no UUID) as requested */}
                    <div style={{ fontSize: 14 }}>{s.storeName}</div>
                  </div>
                ))}
              </div>
            )}
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
            disabled={loading || !isFormValid}
            style={{
              padding: "8px 16px",
              backgroundColor: "#FF6600",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: loading || !isFormValid ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Generating..." : "Generate Report"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: "#fee", color: "#c33", padding: 12, borderRadius: 4, marginBottom: 20 }}>{error}</div>
      )}

      <div style={{ backgroundColor: "#fff", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
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
                <td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#666" }}>
                  Loading...
                </td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#666" }}>
                  No reports available
                </td>
              </tr>
            ) : (
              reports.map((r, idx) => (
                <tr key={`${r.orderUuid ?? idx}`} style={{ borderBottom: "1px solid #e0e0e0" }}>
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
        <div style={{ color: "#666" }}>{totalElements > 0 ? `Showing page ${page + 1} of ${totalPages} — ${totalElements} items` : ""}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onPrev}
            disabled={page === 0 || loading}
            style={{
              padding: "8px 12px",
              borderRadius: 4,
              border: "1px solid #ddd",
              backgroundColor: page === 0 ? "#f7f7f7" : "white",
            }}
          >
            Prev
          </button>
          <button
            onClick={onNext}
            disabled={page >= totalPages - 1 || loading}
            style={{
              padding: "8px 12px",
              borderRadius: 4,
              border: "1px solid #ddd",
              backgroundColor: page >= totalPages - 1 ? "#f7f7f7" : "white",
            }}
          >
            Next
          </button>
        </div>
      </div>

      <Toast open={toastOpen} message={toastMsg} type={toastType} onClose={() => setToastOpen(false)} />
    </div>
  );
}
