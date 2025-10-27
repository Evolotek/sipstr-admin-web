"use client";

import { useEffect, useState } from "react";
import { apiService } from "@/services/apiService";
import { CrudTable } from "./CrudTable";
import { Store } from "@/services/types";

export function StoresModule() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Store>>({});

  const fetchStores = async () => {
    setLoading(true);
    const res = await apiService.getStores();
    setStores(res);
    setLoading(false);
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const handleUpdate = async (uuid: string) => {
    const store = await apiService.getStoreByUuid(uuid);
    setSelectedStore(store);
    setFormData(store);
    setShowModal(true);
  };

  const handleDelete = async (uuid: string) => {
    await apiService.deleteStore(uuid);
    fetchStores();
  };

  const handleSave = async () => {
    if (!selectedStore) return;
    await apiService.updateStore(selectedStore.uuid, formData);
    setShowModal(false);
    fetchStores();
  };

  const handleChange = (field: keyof Store, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="p-4 md:p-6 min-h-screen bg-gray-50">
      <h2 className="text-3xl font-extrabold text-gray-800 mb-8 border-b pb-2">
        Store Management
      </h2>

      <CrudTable
        columns={[
          "Store Name",
          "Corporation Name",
          "Contact Email",
          "Contact Phone",
          "Is Active",
          "Actions",
        ]}
        data={stores.map((store) => ({
          id: store.uuid,
          cells: [
            store.storeName,
            store.corporationName ?? "-",
            store.contactEmail ?? "-",
            store.contactPhone ?? "-",
            store.isActive ? "Yes" : "No",
          ],
          actions: [
            { label: "Update", onClick: () => handleUpdate(store.uuid) },
            { label: "Delete", onClick: () => handleDelete(store.uuid) },
          ],
        }))}
        loading={loading}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div
            className="bg-white p-6 rounded-xl shadow-lg w-full max-w-3xl"
            style={{ maxHeight: "85vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4">
              Update Store — {selectedStore?.storeName}
            </h3>

            {/* BASIC DETAILS */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-700 w-1/2">Store Name:</span>
                <input
                  type="text"
                  value={formData.storeName ?? ""}
                  onChange={(e) => handleChange("storeName", e.target.value)}
                  className="border border-gray-300 p-2 rounded w-1/2"
                />
              </div>

              <div className="flex justify-between">
                <span className="font-semibold text-gray-700 w-1/2">Corporation Name:</span>
                <input
                  type="text"
                  value={formData.corporationName ?? ""}
                  onChange={(e) => handleChange("corporationName", e.target.value)}
                  className="border border-gray-300 p-2 rounded w-1/2"
                />
              </div>

              <div className="flex justify-between">
                <span className="font-semibold text-gray-700 w-1/2">EIN:</span>
                <input
                  type="number"
                  value={formData.ein ?? ""}
                  onChange={(e) => handleChange("ein", Number(e.target.value))}
                  className="border border-gray-300 p-2 rounded w-1/2"
                />
              </div>

              <div className="flex justify-between">
                <span className="font-semibold text-gray-700 w-1/2">License Number:</span>
                <input
                  type="text"
                  value={formData.licenseNumber ?? ""}
                  onChange={(e) => handleChange("licenseNumber", e.target.value)}
                  className="border border-gray-300 p-2 rounded w-1/2"
                />
              </div>  
            </div>

            {/* ADVANCED OPTIONS */}
            <details className="mt-4">
              <summary className="cursor-pointer text-orange-600 font-semibold select-none">
                Advanced Options
              </summary>
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
                  <div key={field} className="flex justify-between">
                    <span className="font-semibold text-gray-700 w-1/2">{label}:</span>
                    <input
                      type={type}
                      value={(formData as any)[field] ?? ""}
                      onChange={(e) =>
                        handleChange(field as keyof Store, Number.isNaN(Number(e.target.value))
                          ? e.target.value
                          : Number(e.target.value))
                      }
                      className="border border-gray-300 p-2 rounded w-1/2"
                    />
                  </div>
                ))}

                <div className="flex justify-between">
                  <span className="font-semibold text-gray-700 w-1/2">
                    Currently Accepting Orders:
                  </span>
                  <input
                    type="checkbox"
                    checked={formData.isCurrentlyAcceptingOrders ?? false}
                    onChange={(e) =>
                      handleChange("isCurrentlyAcceptingOrders", e.target.checked)
                    }
                    className="w-5 h-5 mt-1"
                  />
                </div>

                <div className="flex justify-between">
                  <span className="font-semibold text-gray-700 w-1/2">Active:</span>
                  <input
                    type="checkbox"
                    checked={formData.isActive ?? false}
                    onChange={(e) => handleChange("isActive", e.target.checked)}
                    className="w-5 h-5 mt-1"
                  />
                </div>
              </div>
            </details>

            {/* FOOTER BUTTONS */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
