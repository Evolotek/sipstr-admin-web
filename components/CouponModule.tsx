"use client";

import React, { useEffect, useState } from "react";
import { apiService } from "@/services/apiService";
import {
  OfferDetailRequest,
  OfferDetailResponse,
  OfferDetailRequest as OfferDetailRequestType,
} from "@/services/types";


/* ---------- helpers ---------- */
function toBackendDateString(datetimeLocal?: string | null): string {
  if (!datetimeLocal) return "";
  const [datePart, timePartRaw] = datetimeLocal.split("T");
  if (!datePart || !timePartRaw) return datetimeLocal;

  const [year, month, day] = datePart.split("-");

  const timeParts = timePartRaw.split(":");
  const hh = timeParts[0] ?? "00";
  const mm = timeParts[1] ?? "00";
  const ss = timeParts[2] ?? "00";

  return `${pad(day)}-${pad(month)}-${year} ${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}

function formatDate(dt?: string) {
  if (!dt) return "-";
  try {
    const d = new Date(dt);
    if (isNaN(d.getTime())) return String(dt);
    return d.toLocaleString(); // uses user's locale
  } catch {
    return String(dt);
  }
}


function pad(s: string | number) {
  const str = String(s);
  return str.length === 1 ? `0${str}` : str;
}

/* ---------- component ---------- */
export function CouponsModule() {
  const [storeId, setStoreId] = useState<string>("");
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Form & Modal
  const [showForm, setShowForm] = useState(false);
  const [isGlobalOffer, setIsGlobalOffer] = useState(false); // <-- NEW: whether the form is for a global (Sipstr) offer

  const initialForm: OfferDetailRequestType = {
    offerId: undefined,
    storeId: undefined,
    name: "",
    type: "FLAT",
    method: "COUPON",
    startDateTime: "",
    endDateTime: "",
    discount: 0,
    allowedMaxDiscount: 0,
    minSpendAmount: 0,
    maxTotalUsage: 0,
    requiredVoucherCount: 0,
    description: "",
    // couponDetail shape we will use across read/write:
    // { couponId?, offerId?, couponCode, websiteDisplayMsg, maxUsagePerUser, usabilityCount, usabilityOptions }
    couponDetail: null,
  };
  const [form, setForm] = useState<OfferDetailRequestType>(initialForm);
  const [isEditing, setIsEditing] = useState(false);

  // Consumption modal
  const [showConsumption, setShowConsumption] = useState(false);
  const [consumption, setConsumption] = useState<OfferDetailResponse | null>(null);
  const [consumptionLoading, setConsumptionLoading] = useState(false);

  useEffect(() => {
    // no-op
  }, []);

  /* ---------- load offers & normalize ---------- */
  async function loadOffersForStore(sid?: string) {
    setLoading(true);
    setError(null);
    try {
      const id = sid ?? storeId;
      if (!id) {
        setOffers([]);
        setError("Please enter a store id to search offers.");
        return;
      }
      const parsedId = Number(id);
      const data = await apiService.getAllOffers(parsedId);

      console.debug("raw offers:", data);

      const normalized = (Array.isArray(data) ? data : []).map((o: any) => ({
        offerId: o.offerId,
        storeId: o.storeId,
        name: o.offerName ?? o.name ?? "",
        method: o.method,
        type: o.type,
        startDateTime: o.startDateTime,
        endDateTime: o.endDateTime,
        isActive: o.isActive,
        status: o.status,
        // discount should be numeric or null - don't set it to offerCode
        discount: o.discount ?? null,
        couponCode: o.offerCode ?? (o.coupons?.couponCode ?? null),
        couponId: o.couponId ?? (o.coupons?.couponId ?? null),
        raw: o,
      }));

      setOffers(normalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load offers");
    } finally {
      setLoading(false);
    }
  }

  /* ---------- create flow ---------- */
  function openCreate() {
    setForm(initialForm);
    setIsEditing(false);
    setIsGlobalOffer(false);
    setShowForm(true);
  }

  // NEW: open Sipstr (global) offer create
  function openSipstrCreate() {
    setForm({ ...initialForm, storeId: undefined });
    setIsEditing(false);
    setIsGlobalOffer(true);
    setShowForm(true);
  }

  /* ---------- edit flow (fetch full details) ---------- */
  async function openEdit(offer: any) {
    if (!offer?.offerId) return;
    setEditLoading(true);
    setError(null);

    try {
      const detail = await apiService.getOfferDetailView(offer.offerId);
      console.debug("offer-details response for edit:", detail);

      const toInputValue = (s?: string | null) => {
        if (!s) return "";
        return s.length >= 16 ? s.slice(0, 16) : s.replace(" ", "T").slice(0, 16);
      };

      // Resolve coupon object (may be nested or top-level in different shapes)
      const couponObj = detail.coupons ?? detail.coupon ?? null;
      const couponId = couponObj?.couponId ?? detail.couponId ?? undefined;
      const couponCode = couponObj?.couponCode ?? detail.offerCode ?? detail.couponCode ?? "";
      const websiteMsg =
        couponObj?.websiteDisplayMsg ??
        couponObj?.websiteDisplayMessage ??
        detail.websiteDisplayMsg ??
        "";

      const mapped: OfferDetailRequestType = {
        offerId: detail.offerId ?? offer.offerId,
        storeId: detail.storeId ?? offer.storeId ?? undefined,
        name: detail.offerName ?? detail.name ?? "",
        type: (detail.type ?? offer.type ?? "FLAT") as any,
        method: (detail.method ?? offer.method ?? "COUPON") as any,
        startDateTime: toInputValue(detail.startDateTime ?? detail.start_date_time ?? detail.start),
        endDateTime: toInputValue(detail.endDateTime ?? detail.end_date_time ?? detail.end),
        discount: detail.discount ?? offer.discount ?? 0,
        allowedMaxDiscount: detail.allowedMaxDiscount ?? detail.allowed_max_discount ?? 0,
        minSpendAmount: detail.minSpendAmount ?? detail.min_spend_amount ?? 0,
        maxTotalUsage: detail.maxTotalUsage ?? detail.max_total_usage ?? 0,
        requiredVoucherCount: detail.requiredVoucherCount ?? detail.required_voucher_count ?? 0,
        description: detail.description ?? "",
        couponDetail:
          couponId || couponCode || websiteMsg
            ? {
                id: couponId,
                offerId: detail.offerId,
                code: couponCode ?? "",
                websiteDisplayMessage: websiteMsg ?? "",
                maxUsagePerUser: couponObj?.maxUsagePerUser ?? couponObj?.max_usage_per_user ?? 0,
                totalUsabilityCount: couponObj?.usabilityCount ?? couponObj?.usability_count ?? 0,
                usabilityOption: couponObj?.usabilityOptions ?? couponObj?.usabilityOption ?? undefined,
              }
            : null,
      };

      setForm(mapped);
      setIsEditing(true);
      // if offer has no storeId -> treat as global
      setIsGlobalOffer(mapped.storeId === undefined || mapped.storeId === null);
      setShowForm(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load offer detail for edit");
    } finally {
      setEditLoading(false);
    }
  }

  /* ---------- submit (create/update) ---------- */
  async function handleSubmit() {
    setError(null);

    if (!form.name?.trim()) {
      setError("Offer name is required");
      return;
    }
    if (!form.method) {
      setError("Offer method is required");
      return;
    }
    if (!form.startDateTime || !form.endDateTime) {
      setError("Start and end date/time are required");
      return;
    }

    // build payload and normalize couponDetail to backend schema
    const payload: OfferDetailRequest = {
      ...form,
      // If this is a global offer, ensure storeId is undefined so backend treats it as non-store specific
      storeId: isGlobalOffer ? undefined : form.storeId ?? (storeId ? Number(storeId) : undefined),
      startDateTime: toBackendDateString(form.startDateTime),
      endDateTime: toBackendDateString(form.endDateTime),
      discount: form.discount ?? 0,
      allowedMaxDiscount: form.allowedMaxDiscount ?? 0,
      minSpendAmount: form.minSpendAmount ?? 0,
      maxTotalUsage: form.maxTotalUsage ?? 0,
      requiredVoucherCount: form.requiredVoucherCount ?? 0,
      couponDetail:
        form.method === "COUPON" && form.couponDetail
          ? {
              // forward backend-expected keys
              id: (form.couponDetail as any).couponId ?? undefined,
              offerId: form.offerId??0,
              code: (form.couponDetail as any).couponCode ?? "",
              websiteDisplayMessage:
                (form.couponDetail as any).websiteDisplayMsg ??
                (form.couponDetail as any).websiteDisplayMessage ??
                "",
              maxUsagePerUser:
                (form.couponDetail as any).maxUsagePerUser ??
                (form.couponDetail as any).maxUsage ??
                0,
              totalUsabilityCount:
                (form.couponDetail as any).usabilityCount ??
                (form.couponDetail as any).totalUsabilityCount ??
                0,
              usabilityOption:
                (form.couponDetail as any).usabilityOptions ??
                (form.couponDetail as any).usabilityOption ??
                undefined,
            }
          : null,
    };

    try {
      if (isEditing && payload.offerId) {
        await apiService.updateOffer(payload);
      } else {
        await apiService.createOffer(payload);
      }
      // If it was a store-scoped search, refresh using the current storeId; otherwise reload nothing
      if (!isGlobalOffer) await loadOffersForStore(String(payload.storeId ?? storeId));
      setShowForm(false);
      setIsEditing(false);
      setIsGlobalOffer(false);
      setForm(initialForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save offer");
    }
  }

  /* ---------- delete / toggle / consumption ---------- */
  async function handleDelete(offerId: number) {
    if (!confirm("Are you sure you want to delete this offer? This will mark it expired.")) return;
    try {
      await apiService.deleteOffer(offerId);
      setOffers((prev) => prev.filter((x) => x.offerId !== offerId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete offer");
    }
  }

  async function handleToggle(offerId: number) {
    try {
      // Optimistically toggle in UI first
      setOffers((prev) =>
        prev.map((offer) =>
          offer.offerId === offerId
            ? { ...offer, isActive: !offer.isActive }
            : offer
        )
      );

      // Call backend
      await apiService.toggleOfferStatus(offerId);
    } catch (err) {
      // Revert if backend fails
      setOffers((prev) =>
        prev.map((offer) =>
          offer.offerId === offerId
            ? { ...offer, isActive: !offer.isActive }
            : offer
        )
      );
      setError(err instanceof Error ? err.message : "Failed to toggle offer status");
    }
  }

async function openConsumptionModal(offerId: number) {
  setConsumptionLoading(true);
  setShowConsumption(true);
  try {
    const data = await apiService.getConsumptionHistory(offerId);
    setConsumption(data);
  } catch (error: any) {
    // Backend probably returns a message like "Offer has not been used by any user yet."
    const message =
      error?.response?.data?.message ??
      error?.message ??
      "Offer has not been used by any user yet.";
    // close the consumption modal (we don't want to show the empty modal)
    setShowConsumption(false);
    // clear any stale consumption
    setConsumption(null);
    // show simple alert popup
    setAlertMessage(message);
  } finally {
    setConsumptionLoading(false);
  }
}


  /* ---------- render helpers ---------- */
  const renderRows = () =>
    offers.map((o) => (
      <tr key={o.offerId} style={{ borderBottom: "1px solid #eee" }}>
        <td style={{ padding: "10px" }}>{o.offerId}</td>
        <td style={{ padding: "10px" }}>{o.name}</td>
        <td style={{ padding: "10px" }}>{o.method}</td>
        <td style={{ padding: "10px" }}>{o.type}</td>
        <td style={{ padding: "10px" }}>{o.couponCode ?? "-"}</td>
        <td style={{ padding: "10px" }}>
          {o.startDateTime ? o.startDateTime.replace("T", " ") : "-"} → {o.endDateTime ? o.endDateTime.replace("T", " ") : "-"}
        </td>
        <td style={{ padding: "10px" }}>{o.isActive ? "✅ Active" : "⛔ Not Active"}</td>
        <td style={{ padding: "10px", display: "flex", gap: 8 }}>
          <button onClick={() => openEdit(o)} style={actionBtnStyle}>
            Edit
          </button>
          <button onClick={() => handleDelete(o.offerId)} style={{ ...actionBtnStyle, backgroundColor: "#ff4d4f" }}>
            Delete
          </button>
          <button onClick={() => handleToggle(o.offerId)} style={actionBtnStyle}>
            Toggle
          </button>
          <button onClick={() => openConsumptionModal(o.offerId)} style={actionBtnStyle}>
            Consumption
          </button>
        </td>
      </tr>
    ));

  return (
    <div>
      <h2 style={{ marginBottom: 12 }}>Coupons / Offers</h2>

      {/* Search bar */}
      <div style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
        <input
          placeholder="Enter storeId (number)"
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: 6, minWidth: 220 }}
        />
        <button onClick={() => loadOffersForStore()} style={primaryBtnStyle}>
          Search
        </button>
        <button onClick={openCreate} style={{ ...primaryBtnStyle, backgroundColor: "#2d8cff" }}>
          + Add Offer
        </button>
        {/* NEW button for Sipstr Offer (global) */}
        <button onClick={openSipstrCreate} style={{ ...primaryBtnStyle, backgroundColor: "#6c63ff" }}>
          Sipstr Offer
        </button>
      </div>

      {error && <div style={{ backgroundColor: "#fee", color: "#c33", padding: 12, borderRadius: 6, marginBottom: 12 }}>{error}</div>}

      {/* Offers table */}
      <div style={{ background: "white", borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#fafafa" }}>
            <tr>
              <th style={{ textAlign: "left", padding: 12 }}>ID</th>
              <th style={{ textAlign: "left", padding: 12 }}>Name</th>
              <th style={{ textAlign: "left", padding: 12 }}>Method</th>
              <th style={{ textAlign: "left", padding: 12 }}>Type</th>
              <th style={{ textAlign: "left", padding: 12 }}>Code</th>
              <th style={{ textAlign: "left", padding: 12 }}>Period</th>
              <th style={{ textAlign: "left", padding: 12 }}>Status</th>
              <th style={{ textAlign: "left", padding: 12 }}>Actions</th>
            </tr>
          </thead>
          <tbody>{loading ? <tr><td colSpan={8} style={{ padding: 20 }}>Loading...</td></tr> : renderRows()}</tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
        {showForm && (
        <div style={modalOverlayStyle}>
            <div style={modalStyle}>
            {/* Header (fixed at top of modal) */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <h3 style={{ margin: 0 }}>
                {isEditing ? "Edit Offer" : isGlobalOffer ? "Create Sipstr (Global) Offer" : "Create Offer"}
                </h3>
                <button
                onClick={() => {
                    setShowForm(false);
                    setIsEditing(false);
                    setIsGlobalOffer(false);
                    setForm(initialForm);
                }}
                style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    background: "#fff",
                    cursor: "pointer",
                }}
                aria-label="Close"
                >
                ✕
                </button>
            </div>

            {/* Scrollable body */}
            <div
                style={{
                overflowY: "auto",
                maxHeight: "65vh", // <-- controls scrollable height of the form
                paddingRight: 8,
                marginTop: 12,
                }}
            >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                    <label style={labelStyle}>Name</label>
                    <input value={form.name ?? ""} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} style={inputStyle} />
                </div>

                <div>
                    <label style={labelStyle}>Store ID</label>
                    {/* If this is a global offer, show a read-only badge instead of an editable store id */}
                    {isGlobalOffer ? (
                    <div style={{ padding: "8px 10px", border: "1px dashed #ddd", borderRadius: 6, background: "#fafafa" }}>
                        Global Offer — not store specific
                    </div>
                    ) : (
                    <input
                        type="number"
                        value={form.storeId ?? (storeId ? Number(storeId) : "")}
                        onChange={(e) => setForm((p) => ({ ...p, storeId: e.target.value ? Number(e.target.value) : undefined }))}
                        style={inputStyle}
                    />
                    )}
                </div>

                <div>
                    <label style={labelStyle}>Method</label>
                    <select
                    value={form.method}
                    onChange={(e) =>
                        setForm((prev) => {
                        const method = e.target.value;
                        if (method === "COUPON") {
                            return {
                            ...prev,
                            method,
                            couponDetail:
                                prev.couponDetail ??
                                ({
                                couponId: undefined,
                                offerId: prev.offerId,
                                couponCode: "",
                                websiteDisplayMsg: "",
                                maxUsagePerUser: 0,
                                usabilityCount: 0,
                                usabilityOptions: undefined,
                                } as any),
                            };
                        }
                        return { ...prev, method };
                        })
                    }
                    style={inputStyle}
                    >
                    <option value="COUPON">COUPON</option>
                    <option value="VOUCHER">VOUCHER</option>
                    </select>
                </div>

                <div>
                    <label style={labelStyle}>Type</label>
                    <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as any }))} style={inputStyle}>
                    <option value="FLAT">FLAT</option>
                    <option value="PERCENTAGE">PERCENTAGE</option>
                    </select>
                </div>

                <div>
                    <label style={labelStyle}>Discount</label>
                    <input type="number" value={form.discount ?? ""} onChange={(e) => setForm((p) => ({ ...p, discount: Number(e.target.value) }))} style={inputStyle} />
                </div>

                <div>
                    <label style={labelStyle}>Allowed Max Discount</label>
                    <input type="number" value={form.allowedMaxDiscount ?? ""} onChange={(e) => setForm((p) => ({ ...p, allowedMaxDiscount: Number(e.target.value) }))} style={inputStyle} />
                </div>

                <div>
                    <label style={labelStyle}>Min Spend Amount</label>
                    <input type="number" value={form.minSpendAmount ?? ""} onChange={(e) => setForm((p) => ({ ...p, minSpendAmount: Number(e.target.value) }))} style={inputStyle} />
                </div>

                <div>
                    <label style={labelStyle}>Max Total Usage</label>
                    <input type="number" value={form.maxTotalUsage ?? ""} onChange={(e) => setForm((p) => ({ ...p, maxTotalUsage: Number(e.target.value) }))} style={inputStyle} />
                </div>

                <div>
                    <label style={labelStyle}>Required Voucher Count</label>
                    <input type="number" value={form.requiredVoucherCount ?? ""} onChange={(e) => setForm((p) => ({ ...p, requiredVoucherCount: Number(e.target.value) }))} style={inputStyle} />
                </div>

                <div>
                    <label style={labelStyle}>Description</label>
                    <input value={form.description ?? ""} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} style={inputStyle} />
                </div>

                <div>
                    <label style={labelStyle}>Start Date & Time</label>
                    <input type="datetime-local" value={form.startDateTime ?? ""} onChange={(e) => setForm((p) => ({ ...p, startDateTime: e.target.value }))} style={inputStyle} />
                </div>

                <div>
                    <label style={labelStyle}>End Date & Time</label>
                    <input type="datetime-local" value={form.endDateTime ?? ""} onChange={(e) => setForm((p) => ({ ...p, endDateTime: e.target.value }))} style={inputStyle} />
                </div>

                {/* Coupon specific fields */}
                {form.method === "COUPON" && (
                    <div style={{ marginTop: 12, padding: 12, border: "1px solid #eee", borderRadius: 6, gridColumn: "1 / -1" }}>
                    <h4 style={{ margin: "0 0 8px 0" }}>Coupon Details</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div>
                        <label style={labelStyle}>Coupon Code</label>
                        <input
                            value={(form.couponDetail as any)?.couponCode ?? ""}
                            onChange={(e) => setForm((prev) => ({ ...prev, couponDetail: { ...(prev.couponDetail ?? {}), couponCode: e.target.value } }))}
                            style={inputStyle}
                        />
                        </div>

                        <div>
                        <label style={labelStyle}>Website Display Message</label>
                        <input
                            value={(form.couponDetail as any)?.websiteDisplayMsg ?? ""}
                            onChange={(e) => setForm((prev) => ({ ...prev, couponDetail: { ...(prev.couponDetail ?? {}), websiteDisplayMsg: e.target.value } }))}
                            style={inputStyle}
                        />
                        </div>

                        <div>
                        <label style={labelStyle}>Max Usage Per User</label>
                        <input
                            type="number"
                            value={(form.couponDetail as any)?.maxUsagePerUser ?? ""}
                            onChange={(e) => setForm((prev) => ({ ...prev, couponDetail: { ...(prev.couponDetail ?? {}), maxUsagePerUser: Number(e.target.value) } }))}
                            style={inputStyle}
                        />
                        </div>

                        <div>
                        <label style={labelStyle}>Usability Count</label>
                        <input
                            type="number"
                            value={(form.couponDetail as any)?.usabilityCount ?? ""}
                            onChange={(e) => setForm((prev) => ({ ...prev, couponDetail: { ...(prev.couponDetail ?? {}), usabilityCount: Number(e.target.value) } }))}
                            style={inputStyle}
                        />
                        </div>

                        <div>
                        <label style={labelStyle}>Usability Option</label>
                        <select
                            value={(form.couponDetail as any)?.usabilityOptions ?? ""}
                            onChange={(e) => setForm((prev) => ({ ...prev, couponDetail: { ...(prev.couponDetail ?? {}), usabilityOptions: e.target.value as any } }))}
                            style={inputStyle}
                        >
                            <option value="">Select</option>
                            <option value="MONTH">MONTH</option>
                            <option value="QUARTER">QUARTER</option>
                            <option value="HALF_YEAR">HALF_YEAR</option>
                            <option value="YEAR">YEAR</option>
                        </select>
                        </div>
                    </div>
                    </div>
                )}
                </div>
            </div>

            {/* Sticky footer (always visible) */}
            <div
                style={{
                position: "sticky",
                bottom: 0,
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                paddingTop: 12,
                paddingBottom: 6,
                background: "linear-gradient(180deg, rgba(255,255,255,0), rgba(255,255,255,1))",
                }}
            >
                <button
                onClick={() => {
                    setShowForm(false);
                    setIsEditing(false);
                    setIsGlobalOffer(false);
                    setForm(initialForm);
                }}
                style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", background: "white" }}
                >
                Cancel
                </button>
                <button onClick={handleSubmit} style={{ ...primaryBtnStyle }}>
                {isEditing ? "Update Offer" : "Create Offer"}
                </button>
            </div>
            </div>
        </div>
        )}


      {/* Consumption modal */}
      {showConsumption && (
  <div style={modalOverlayStyle} onClick={() => setShowConsumption(false)}>
    <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>Consumption History</h3>
          <div style={{ marginTop: 8, color: "#475569", fontSize: 13 }}>
            <strong>Offer ID:</strong> {consumption?.offerId ?? "-"}{" "}
            <span style={{ marginLeft: 12, display: "inline-flex", gap: 8, alignItems: "center" }}>
              <span style={{ background: "#eef2ff", color: "#4f46e5", padding: "4px 8px", borderRadius: 999, fontSize: 12 }}>
                Coupon: {consumption?.couponCode ?? "-"}
              </span>
              <span style={{ background: "#f1f5f9", color: "#344e6f", padding: "4px 8px", borderRadius: 999, fontSize: 12 }}>
                Store: {consumption?.storeId ?? "-"}
              </span>
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => { setShowConsumption(false); }}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              cursor: "pointer",
              fontWeight: 600,
            }}
            aria-label="Close"
          >
            X
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ borderRadius: 8, overflow: "hidden", background: "#fff", boxShadow: "inset 0 1px 0 rgba(0,0,0,0.02)" }}>
        {consumptionLoading ? (
          <div style={{ padding: 28, textAlign: "center", color: "#64748b" }}>Loading...</div>
        ) : (consumption && (consumption.users ?? []).length > 0) ? (
          <div style={{ overflow: "auto", maxHeight: "60vh" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
              <thead style={{ position: "sticky", top: 0, background: "#f8fafc", zIndex: 2 }}>
                <tr>
                  <th style={{ textAlign: "left", padding: "12px 14px", fontSize: 13, color: "#0f172a" }}>User ID</th>
                  <th style={{ textAlign: "left", padding: "12px 14px", fontSize: 13, color: "#0f172a" }}>UUID</th>
                  <th style={{ textAlign: "left", padding: "12px 14px", fontSize: 13, color: "#0f172a" }}>Name</th>
                  <th style={{ textAlign: "left", padding: "12px 14px", fontSize: 13, color: "#0f172a" }}>Phone</th>
                  <th style={{ textAlign: "left", padding: "12px 14px", fontSize: 13, color: "#0f172a" }}>Used At</th>
                </tr>
              </thead>
              <tbody>
                    {consumption.users.map((u, idx) => (
                        <tr key={u.uuid ?? idx} style={{ background: idx % 2 === 0 ? "#ffffff" : "#fbfdff" }}>
                        <td style={{ padding: "10px 14px", color: "#0f172a", fontSize: 13 }}>{u.id ?? "-"}</td>
                        <td
                            style={{
                            padding: "10px 14px",
                            color: "#0b1220",
                            fontSize: 13,
                            maxWidth: 220,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            }}
                        >
                            {String(u.uuid ?? "-")}
                        </td>
                        <td style={{ padding: "10px 14px", color: "#0b1220", fontSize: 13 }}>{u.fullName ?? "-"}</td>
                        <td style={{ padding: "10px 14px", color: "#0b1220", fontSize: 13 }}>
                            {u.mobileNumber ?? "-"}
                        </td>

                        {/* ↓ This is the updated part */}
                        <td style={{ padding: "10px 14px", color: "#0b1220", fontSize: 13, lineHeight: "1.6em" }}>
                            {(() => {
                                const usedAt = u.usedAt ?? [];
                                return usedAt.length > 0 ? (
                                <ul style={{ margin: 0, paddingLeft: 18 }}>
                                    {usedAt.map((t, i) => (
                                    <li key={i} style={{ listStyleType: "disc" }}>
                                        {formatDate(t)}
                                    </li>
                                    ))}
                                </ul>
                                ) : (
                                "-"
                                );
                            })()}
                            </td>

                        </tr>
                    ))}
                    </tbody>

            </table>
          </div>
            ) : (
            <div style={{ padding: 28, textAlign: "center", color: "#475569" }}>
                <div style={{ fontSize: 16, marginBottom: 8 }}>No users have used this offer yet.</div>
                <div style={{ fontSize: 13 }}>Once a user redeems the coupon, their details will appear here.</div>
            </div>
            )}
        </div>
        </div>
    </div>
    )}

      {/* Simple centered alert popup */}
{alertMessage && (
  <div
    style={{
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      background: "white",
      padding: "20px 28px",
      borderRadius: 10,
      boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
      zIndex: 10000,
      textAlign: "center",
      minWidth: 300,
    }}
    role="dialog"
    aria-modal="true"
  >
    <div style={{ marginBottom: 12, color: "#222", fontSize: 15 }}>{alertMessage}</div>
    <div style={{ display: "flex", justifyContent: "center" }}>
      <button
        onClick={() => setAlertMessage(null)}
        style={{
          padding: "8px 16px",
          borderRadius: 6,
          border: "none",
          background: "#2563eb",
          color: "white",
          cursor: "pointer",
        }}
      >
        OK
      </button>
    </div>
  </div>
)}

    </div>
  );
}

/* ---------- styles ---------- */
const primaryBtnStyle: React.CSSProperties = {
  padding: "8px 14px",
  backgroundColor: "#FF6600",
  color: "white",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};

const actionBtnStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #ddd",
  cursor: "pointer",
  background: "white",
};

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(2,6,23,0.45)", // slightly darker backdrop
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  padding: 20,
};

const modalStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, #ffffff, #fbfbfd)",
  padding: 18,
  borderRadius: 12,
  width: "min(920px, 96vw)",
  maxWidth: "920px",
  maxHeight: "86vh",
  overflow: "hidden",
  boxShadow: "0 12px 40px rgba(2,6,23,0.28)",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};
const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, marginBottom: 6, fontWeight: 600 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, boxSizing: "border-box" };
