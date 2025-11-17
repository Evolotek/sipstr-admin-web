"use client";

import { useEffect, useState } from "react";
import { apiService } from "@/services/apiService";
import { CrudTable } from "./CrudTable";
import { Store } from "@/services/types";

/* --- Tiny Toast + ConfirmDialog components --- */
type ToastType = "success" | "error" | "info";
function Toast({ open, message, type = "info", onClose }: { open: boolean; message: string; type?: ToastType; onClose: () => void }) {
  if (!open) return null;
  const bg = type === "success" ? "bg-emerald-600" : type === "error" ? "bg-rose-600" : "bg-sky-600";
  return (
    <div className={`fixed right-4 bottom-4 z-50 ${bg} text-white px-4 py-2 rounded shadow-lg cursor-pointer`} onClick={onClose} role="status">
      {message}
    </div>
  );
}

function ConfirmDialog({ open, title, message, onConfirm, onCancel }: { open: boolean; title?: string; message?: string; onConfirm: () => void; onCancel: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40" onClick={onCancel}>
      <div className="bg-white rounded-lg p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-2">{title ?? "Confirm"}</h3>
        <p className="text-sm text-gray-700">{message}</p>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onCancel} className="px-3 py-1 rounded border">Cancel</button>
          <button onClick={onConfirm} className="px-3 py-1 rounded bg-orange-600 text-white">Confirm</button>
        </div>
      </div>
    </div>
  );
}

/* --- StoresModule --- */
export function StoresModule() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Store>>({});

  // Toast state
  const [toast, setToast] = useState<{ open: boolean; message: string; type?: ToastType }>({ open: false, message: "" });

  // Confirm state
  const [confirm, setConfirm] = useState<{ open: boolean; message?: string; onConfirm?: () => void }>({ open: false });

  // helper: show toast
  const showToast = (message: string, type: ToastType = "info", duration = 3000) => {
    setToast({ open: true, message, type });
    setTimeout(() => setToast({ open: false, message: "" }), duration);
  };

  // helper: show confirm
  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirm({ open: true, message, onConfirm });
  };

  const fetchStores = async () => {
    setLoading(true);
    try {
      const res = await apiService.getStores();
      setStores(res || []);
    } catch (err) {
      console.error("Failed to fetch stores:", err);
      showToast("Failed to fetch stores", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const handleUpdate = async (uuid: string) => {
    try {
      setLoading(true);
      const store = await apiService.getStoreByUuid(uuid);
      setSelectedStore(store);
      setFormData(store);
      setShowModal(true);
    } catch (err) {
      console.error("Failed to load store:", err);
      showToast("Failed to load store details", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (uuid: string) => {
    // show confirm dialog first
    showConfirm("Are you sure you want to delete this store? This action cannot be undone.", async () => {
      setConfirm({ open: false });
      try {
        setLoading(true);
        await apiService.deleteStore(uuid);
        showToast("Store deleted", "success");
        await fetchStores();
      } catch (err) {
        console.error("Failed to delete store:", err);
        showToast("Failed to delete store", "error");
      } finally {
        setLoading(false);
      }
    });
  };

  const handleSave = async () => {
    if (!selectedStore) return;
    try {
      setLoading(true);
      // Only send the fields you want to update — this passes formData as partial update
      await apiService.updateStore(selectedStore.uuid, formData);
      showToast("Store updated", "success");
      setShowModal(false);
      await fetchStores();
    } catch (err) {
      console.error("Failed to update store:", err);
      showToast("Failed to update store", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof Store, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-4 md:p-6 min-h-screen bg-gray-50">
      <h2 className="text-3xl font-extrabold text-gray-800 mb-8 border-b pb-2">Store Management</h2>

      <CrudTable
        columns={["Store Name", "Corporation Name", "Contact Email", "Contact Phone", "Is Active", "Actions"]}
        data={stores.map((store) => ({
          id: store.uuid,
          cells: [store.storeName, store.corporationName ?? "-", store.contactEmail ?? "-", store.contactPhone ?? "-", store.isActive ? "Yes" : "No"],
          actions: [
            { label: "Update", onClick: () => handleUpdate(store.uuid) },
            { label: "Delete", onClick: () => handleDelete(store.uuid) },
          ],
        }))}
        loading={loading}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div
            className="bg-white p-6 rounded-xl shadow-lg w-full max-w-3xl"
            style={{ maxHeight: "85vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4">Update Store — {selectedStore?.storeName}</h3>

            {/* BASIC DETAILS */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-700 w-1/2">Store Name:</span>
                <input type="text" value={formData.storeName ?? ""} onChange={(e) => handleChange("storeName", e.target.value)} className="border border-gray-300 p-2 rounded w-1/2" />
              </div>

              <div className="flex justify-between">
                <span className="font-semibold text-gray-700 w-1/2">Corporation Name:</span>
                <input type="text" value={formData.corporationName ?? ""} onChange={(e) => handleChange("corporationName", e.target.value)} className="border border-gray-300 p-2 rounded w-1/2" />
              </div>

              <div className="flex justify-between">
                <span className="font-semibold text-gray-700 w-1/2">EIN:</span>
                <input type="number" value={formData.ein ?? ""} onChange={(e) => handleChange("ein", Number(e.target.value))} className="border border-gray-300 p-2 rounded w-1/2" />
              </div>

              <div className="flex justify-between">
                <span className="font-semibold text-gray-700 w-1/2">License Number:</span>
                <input type="text" value={formData.licenseNumber ?? ""} onChange={(e) => handleChange("licenseNumber", e.target.value)} className="border border-gray-300 p-2 rounded w-1/2" />
              </div>
            </div>

            {/* ADVANCED OPTIONS */}
            <details className="mt-4">
              <summary className="cursor-pointer text-orange-600 font-semibold select-none">Advanced Options</summary>
              <div className="mt-3 space-y-3">
                {[
                  ["Description", "description", "text"],
                  ["Contact Email", "contactEmail", "email"],
                  ["Contact Phone", "contactPhone", "text"],
                  ["Delivery Radius (km)", "deliveryRadiusKm", "number"],
                  ["Minimum Order Amount", "minimumOrderAmount", "number"],
                  ["Average Preparation Time (min)", "averagePreparationTime", "number"],
                  ["Rating", "rating", "number"],
                  ["Tax Rate (%)", "taxRate", "number"],
                  ["Commission Rate (%)", "commissionRate", "number"],
                  ["Latitude", "latitude", "number"],
                  ["Longitude", "longitude", "number"],
                ].map(([label, field, type]) => (
                  <div key={field as string} className="flex justify-between">
                    <span className="font-semibold text-gray-700 w-1/2">{label}:</span>
                    <input
                      type={type}
                      value={(formData as any)[field as string] ?? ""}
                      onChange={(e) =>
                        handleChange(field as keyof Store, Number.isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))
                      }
                      className="border border-gray-300 p-2 rounded w-1/2"
                    />
                  </div>
                ))}

                <div className="flex justify-between">
                  <span className="font-semibold text-gray-700 w-1/2">Currently Accepting Orders:</span>
                  <input type="checkbox" checked={formData.isCurrentlyAcceptingOrders ?? false} onChange={(e) => handleChange("isCurrentlyAcceptingOrders", e.target.checked)} className="w-5 h-5 mt-1" />
                </div>

                <div className="flex justify-between">
                  <span className="font-semibold text-gray-700 w-1/2">Active:</span>
                  <input type="checkbox" checked={formData.isActive ?? false} onChange={(e) => handleChange("isActive", e.target.checked)} className="w-5 h-5 mt-1" />
                </div>
              </div>
            </details>

            {/* FOOTER BUTTONS */}
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-300 rounded-md">
                Cancel
              </button>
              <button onClick={handleSave} className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast & Confirm Dialog */}
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast({ open: false, message: "" })} />
      <ConfirmDialog
        open={confirm.open}
        title="Delete Store"
        message={confirm.message}
        onConfirm={() => {
          setConfirm({ open: false });
          confirm.onConfirm?.();
        }}
        onCancel={() => setConfirm({ open: false })}
      />
    </div>
  );
}
