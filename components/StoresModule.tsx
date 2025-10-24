"use client"

import React, { useState, useEffect, useCallback } from "react"

// --- API Configuration and Token Management (Integrated from user's request) ---
const API_BASE_URL = "http://localhost:8080" 

// JWT Token Management (using localStorage as specified in original file)
const getToken = (): string | null => {
  if (typeof window !== "undefined") return localStorage.getItem("auth_token")
  return null
}

const clearToken = (): void => {
  if (typeof window !== "undefined") localStorage.removeItem("auth_token")
}

interface ApiErrorBody {
    message?: string;
    detail?: string;
    // Add other common error fields if needed
}

// API Request Helper with JWT Authorization and Error Handling
async function apiCall<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
  const headers: HeadersInit = { "Content-Type": "application/json" }
  const token = getToken()
  if (token) headers["Authorization"] = `Bearer ${token}`

  const options: RequestInit = { method, headers }
  if (body) options.body = JSON.stringify(body)

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options)
  
  if (!response.ok) {
    if (response.status === 401) {
      clearToken()
    }
    
    let errorBody: ApiErrorBody = {}
    try {
        errorBody = await response.json()
    } catch (e) {
        errorBody.message = await response.text()
    }

    // Create a custom error object that the component can parse
    const error = new Error(errorBody.message || `API Error: ${response.status} on ${endpoint}`) as any;
    error.responseBody = errorBody;
    throw error;
  }

  // Handle 204 No Content
  if (response.status === 204 || response.headers.get("Content-Length") === "0") {
    return {} as T
  }

  return response.json()
}
// ----------------------------

// --- Updated Store Interface to match detailed API response fields ---
// This interface MUST contain all fields used by the payload in createStore
interface Store {
  id: number; // The large numerical ID (Used for internal tracking/DB)
  uuid: string; // The primary UUID for actions
  storeName: string; 
  address1: string; 
  address2: string; 
  city: string; 
  state: string;
  zipcode: string;
  country: string;
  contactPhone: string; 
  
  // Required fields for POST /stores (using the detailed structure from the component's previous logic)
  corporationName: string;
  ein: number;
  licenseNumber: string;
  liquorLicenseUrl: string;
  description: string;
  contactEmail: string;
  deliveryRadiusKm: number;
  minimumOrderAmount: number;
  averagePreparationTime: number;
  isCurrentlyAcceptingOrders: boolean;
  taxRate: number;
  commissionRate: number;
  isActive: boolean;
  ownerName: string;
}

// --- Updated API SERVICE IMPLEMENTATION using new apiCall ---
const apiService = {
    /**
     * Fetches all stores from the /stores GET endpoint.
     */
    getStores: async (): Promise<Store[]> => {
        console.log(`API: Fetching stores from ${API_BASE_URL}/stores`);
        return apiCall<Store[]>("GET", "/stores");
    },

    /**
     * Creates a new store via the /stores POST endpoint.
     */
    createStore: async (storeData: { storeName: string, address1: string, city: string, contactPhone: string }): Promise<Store> => {
        console.log(`API: Creating store via ${API_BASE_URL}/stores`);
        
        // We send all required fields for a new store, populated with placeholders/defaults
        const payload: Partial<Store> = {
            ...storeData,
            corporationName: "Default Corp",
            ein: 9007199254740991, // Large number placeholder
            licenseNumber: "LIC-TEMP-001",
            liquorLicenseUrl: "",
            description: "New store added via Admin App",
            // Generate contact email from store name
            contactEmail: `contact_${storeData.storeName.toLowerCase().replace(/\s/g, '_')}@example.com`,
            deliveryRadiusKm: 5,
            minimumOrderAmount: 0,
            averagePreparationTime: 1800, // 30 minutes in seconds
            isCurrentlyAcceptingOrders: true,
            taxRate: 0.08,
            commissionRate: 0.15,
            isActive: true,
            ownerName: "Admin User",
            address2: "",
            state: "NY", 
            zipcode: "00000",
            country: "USA",
        };

        // apiCall handles headers, token, and JSON stringification
        return apiCall<Store>("POST", "/stores", payload);
    },
}
// ----------------------------


// --- CrudTable Component (Helper component) ---
function CrudTable({ columns, data, loading, emptyMessage }: { columns: string[], data: any[], loading: boolean, emptyMessage?: string }) {
    return (
        <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
            <h4 className="text-xl font-bold mb-4 text-gray-800">Stores List</h4>
            {loading && (
                <div className="text-center p-8 text-orange-500 flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-3 inline-block" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading Stores...
                </div>
            )}
            {!loading && data.length === 0 && (
                <p className="text-center p-8 text-gray-500 bg-gray-50 rounded-lg">{emptyMessage || "No data available."}</p>
            )}
            {!loading && data.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {columns.map((col, index) => (
                                    <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {data.map((row, rowIndex) => (
                                <tr key={row.id}>
                                    {row.cells.map((cell: React.ReactNode, cellIndex: number) => (
                                        <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {cell}
                                        </td>
                                    ))}
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {row.actions?.map((action: { label: string, onClick: () => void }, actionIndex: number) => (
                                            <button 
                                                key={actionIndex} 
                                                onClick={action.onClick}
                                                className="text-orange-600 hover:text-orange-900 ml-3 disabled:opacity-50"
                                                disabled={loading}
                                            >
                                                {action.label}
                                            </button>
                                        ))}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
// ----------------------------


export function StoresModule() {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  
  // Updated formData to match the API's input fields we care about
  const [formData, setFormData] = useState({ 
    storeName: "", 
    address1: "", // Using address1 for the main location input
    city: "", 
    contactPhone: "" 
  })
  const [error, setError] = useState<string | null>(null)

  const loadStores = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Use the newly defined apiService
      const data = await apiService.getStores()
      setStores(data)
    } catch (err) {
        console.error("Failed to load stores:", err);
        let errorMessage = "Failed to load stores. Check your console for details.";

        if (err instanceof Error) {
            errorMessage = err.message;
            // Extract error details from the custom error structure
            if ((err as any).responseBody?.detail) {
                errorMessage = (err as any).responseBody.detail;
            } else if ((err as any).responseBody?.message) {
                 errorMessage = (err as any).responseBody.message;
            }
        }
        // Check for common connection errors
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Connection refused')) {
            errorMessage = `Connection Error: Failed to connect to ${API_BASE_URL}. Ensure the backend is running and accessible.`;
        }
        setError(errorMessage);
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Note: You must ensure an 'auth_token' is set in localStorage (e.g., via a login component) 
    // for this API call to succeed, as it now relies on the JWT stored there.
    loadStores()
  }, [loadStores])

  const handleAdd = async () => {
    // Check required fields based on the form
    if (!formData.storeName || !formData.address1 || !formData.city || !formData.contactPhone) {
        setError("Please fill in all store details.")
        return
    }
    setError(null)
    try {
      setLoading(true)
      // Use the newly defined apiService
      const newStore = await apiService.createStore(formData)
      setStores((prev) => [...prev, newStore])
      
      // Show success message
      setError(`Store "${newStore.storeName}" added successfully!`);

      // Reset form
      setFormData({ storeName: "", address1: "", city: "", contactPhone: "" })
      setShowForm(false)
    } catch (err) {
        console.error("Failed to add store:", err);
        let errorMessage = "Failed to add store. Check your console for details.";

        if (err instanceof Error) {
            errorMessage = err.message;
            // Extract error details from the custom error structure
            if ((err as any).responseBody?.detail) {
                errorMessage = (err as any).responseBody.detail;
            } else if ((err as any).responseBody?.message) {
                errorMessage = (err as any).responseBody.message;
            }
        }
        setError(errorMessage);
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-6 min-h-screen bg-gray-50">
      <h2 className="text-3xl font-extrabold text-gray-800 mb-8 border-b pb-2">Store Management</h2>
      
      {/* Add Store Button */}
      <div className="mb-5">
        <button
          onClick={() => {
            setShowForm(!showForm)
            if (showForm) {
              setFormData({ storeName: "", address1: "", city: "", contactPhone: "" })
            }
          }}
          className="px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg shadow-md hover:bg-orange-700 transition duration-150 transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          disabled={loading}
        >
          {showForm ? "Cancel" : "+ Add Store"}
        </button>
      </div>

      {/* Error/Message Display */}
      {error && (
        <div
          className={`p-3 mb-5 text-sm rounded-lg border shadow-sm ${error.includes('successfully') ? 'text-green-700 bg-green-100 border-green-300' : 'text-red-700 bg-red-100 border-red-300'}`}
          role="alert"
        >
          <span className="font-semibold">{error.includes('successfully') ? 'Success:' : 'Error:'}</span> {error}
        </div>
      )}

      {/* Add Store Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-2xl mb-6 border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">New Store Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            
            {/* Store Name (API: storeName) */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Store Name</label>
              <input
                type="text"
                value={formData.storeName}
                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500 shadow-sm"
              />
            </div>
            
            {/* Address Line 1 (API: address1) */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Address Line 1</label>
              <input
                type="text"
                value={formData.address1}
                onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500 shadow-sm"
              />
            </div>

            {/* City (API: city) */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500 shadow-sm"
              />
            </div>

            {/* Contact Phone (API: contactPhone) */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Contact Phone</label>
              <input
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500 shadow-sm"
              />
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={loading}
            className="px-6 py-2 bg-orange-600 text-white font-semibold rounded-lg shadow-md hover:bg-orange-700 transition duration-150 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Adding...' : 'Add Store'}
          </button>
        </div>
      )}

      {/* Stores Table */}
      <CrudTable
        columns={["UUID", "Name", "Location", "Phone", "Actions"]}
        data={stores.map((s) => ({
          id: s.uuid, // Use uuid as the unique key
          cells: [
            // Display sliced UUID
            String(s.uuid).slice(0, 8), 
            // Display storeName
            s.storeName, 
            // Combine address1 and city for location display
            `${s.address1}, ${s.city}`, 
            // Display contactPhone
            s.contactPhone
          ], 
          actions: [], // Action buttons would go here (e.g., Edit, Delete)
        }))}
        loading={loading}
        emptyMessage="No stores found. Use the 'Add Store' button to create one."
      />
    </div>
  )
}
