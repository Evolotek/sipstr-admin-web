import React, { useState, useEffect, useCallback } from 'react';

// =================================================================
// 1. API SERVICE DEFINITIONS
// =================================================================

// The base URL for the API.
const API_BASE_URL = "http://localhost:8080"

// JWT Token Management (using localStorage)
const getToken = (): string | null => {
  if (typeof window !== "undefined") return localStorage.getItem("auth_token")
  return null
}

const setToken = (token: string): void => {
  if (typeof window !== "undefined") localStorage.setItem("auth_token", token)
}

const clearToken = (): void => {
  if (typeof window !== "undefined") localStorage.removeItem("auth_token")
}

// API Request Helper with JWT Authorization and Error Handling
// Added exponential backoff implementation to handle potential throttling.
async function apiCall<T>(method: string, endpoint: string, body?: unknown, maxRetries = 3): Promise<T> {
  const headers: HeadersInit = { "Content-Type": "application/json" }
  const token = getToken()
  if (token) headers["Authorization"] = `Bearer ${token}`

  const options: RequestInit = { method, headers }
  if (body) options.body = JSON.stringify(body)

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, options)

      if (!response.ok) {
        if (response.status === 401) {
          clearToken()
          // Throw immediately on auth error
          throw new Error("Unauthorized access. Please log in again.")
        }

        // If not 401, parse error and potentially retry on transient errors (e.g., 5xx)
        if (response.status >= 500 && attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000 // 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, delay))
          continue; // Go to next attempt
        }

        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || `API Error: ${response.status} on ${endpoint}`)
      }

      // Handle 204 No Content
      if (response.status === 204 || response.headers.get("Content-Length") === "0") {
        return {} as T
      }

      return response.json()
    } catch (error) {
      // Re-throw the error if it's the last attempt or a non-retryable error
      if (attempt === maxRetries - 1 || error instanceof Error && error.message.includes("Unauthorized")) {
        throw error
      }
      // If retry, the continue will handle the delay and loop
    }
  }
  // Should be unreachable, but here for type safety
  throw new Error("API call failed after maximum retries.")
}


// --- Interfaces for Data Consistency ---

/**
 * Minimal interface for a product variant returned by the API (to get the unitPrice).
 */
interface ProductVariantDTO {
    unitPrice: number | null;
    // ... potentially other fields
}

/**
 * Interface representing the structure of a Product item from the *GET* response.
 */
interface Product { 
  uuid: string | null; 
  productId?: number | null; 
  productName: string; 
  categoryName: string; 
  brand: string;
  variantsDTO?: ProductVariantDTO[]; // Nested structure for price
}

/**
 * Interface for product input data (simple fields from the form).
*/
interface ProductInput {
    name: string; 
    price: string | number; // Input field handles string/number
    category: string; 
    brand: string;
}

/**
 * Interface representing the standard paginated response object from the API.
 */
interface PaginatedResponse<T> {
  content: T[]; // The actual list of items
  pageable: unknown;
  last: boolean;
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  sort: unknown;
  first: boolean;
  numberOfElements: number;
  empty: boolean;
}


// --- API Service Implementation (Product-specific functions) ---
const apiService = {
  /** Retrieves all products from the backend, returning a paginated object. */
  async getProducts(): Promise<PaginatedResponse<Product>> { 
    return apiCall<PaginatedResponse<Product>>("GET", "/products") 
},
  
  /**    * Creates a new product. 
   * NOTE: We are building a DTO that mirrors the expected structure (productName, categoryName, nested price)
   * to mitigate potential API structure issues, although the 404 is a server-side route error.
   */
  async createProduct(data: ProductInput): Promise<Product> { 
    const unitPrice = Number.parseFloat(data.price as string);
    
    // Construct a DTO that aligns with the fields found in the GET response
    const payload = {
        productName: data.name,
        brand: data.brand,
        categoryName: data.category, 
        // Assuming price must be nested within a variant array for creation
        variantsDTO: [ 
            { unitPrice: unitPrice }
        ]
    };
    
    return apiCall<Product>("POST", "/products", payload) 
  },
  
  /** Deletes a product using its UUID. */
  async deleteProduct(uuid: string): Promise<void> { return apiCall<void>("DELETE", `/products/${uuid}`) },
};


// =================================================================
// 2. HELPER COMPONENTS (CrudTable and InputGroup)
// =================================================================

interface Action { label: string; onClick: () => void; }
interface CrudTableProps {
    columns: string[];
    data: { id: string | null, cells: React.ReactNode[], actions: Action[] }[];
    loading: boolean;
}

const CrudTable: React.FC<CrudTableProps> = ({ columns, data, loading }) => {
    if (loading) return <div className="text-center py-8 text-orange-500 font-medium bg-white rounded-xl shadow-lg">Loading products from API...</div>;
    if (data.length === 0) return <div className="text-center py-8 text-gray-500 bg-white rounded-xl shadow-lg">No products found.</div>;
    return (
        <div className="overflow-x-auto rounded-xl shadow-2xl bg-white border border-gray-100">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-orange-100">
                    <tr>
                        {columns.map((col, index) => (
                            <th key={index} scope="col" className="px-6 py-3 text-left text-xs font-bold text-orange-800 uppercase tracking-wider">{col}</th>
                        ))}
                    </tr>
                </thead>
                {/* FIX: Hydration error often caused by whitespace between <tbody> and {data.map} */}
                <tbody className="bg-white divide-y divide-gray-100">{data.map((row) => (
                        <tr key={row.id || `temp-${Math.random()}`} className="hover:bg-orange-50 transition duration-150">
                            {row.cells.map((cell, cellIndex) => (
                                <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cell}</td>
                            ))}
                            {/* Actions are only available if the ID is present for deletion */}
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                {row.id && row.actions.map((action, actionIndex) => (
                                    <button 
                                        key={actionIndex} 
                                        onClick={action.onClick} 
                                        className="text-red-600 hover:text-red-900 ml-3 font-semibold transition duration-150 p-1 rounded-md hover:bg-red-100"
                                    >
                                        {action.label}
                                    </button>
                                ))}
                                {!row.id && <span className="text-gray-400">N/A</span>}
                            </td>
                        </tr>
                    ))}</tbody>
            </table>
        </div>
    );
};

// Helper component for form inputs
const InputGroup: React.FC<{ label: string, type: string, value: string | number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ label, type, value, onChange }) => (
    <div>
        <label className="block mb-2 text-sm font-semibold text-gray-700">
            {label}
        </label>
        <input
            type={type}
            value={value}
            onChange={onChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition duration-150 shadow-inner"
            style={{ boxSizing: "border-box" }} 
        />
    </div>
);


// =================================================================
// 3. MAIN PRODUCTS MODULE COMPONENT
// =================================================================

/**
 * ProductsModule component for CRUD operations on product inventory.
 */
export default function ProductsModule() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  // Retain simple form fields for the UI
  const [formData, setFormData] = useState<ProductInput>({ name: "", price: "", category: "", brand: "" });
  const [error, setError] = useState<string | null>(null);

  /**
   * Loads products from the API.
   */
  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // The API is expected to return a PaginatedResponse object
      const data = await apiService.getProducts();

      // Extract the actual product array from the 'content' field
      if (data && Array.isArray(data.content)) {
        setProducts(data.content);
      } else {
        console.error("API returned unexpected data structure:", data);
        setProducts([]); 
        throw new Error("Invalid data format received from server (missing 'content' array).");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  }, []); 

  // Load products on component mount
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleAdd = async () => {
    // Input validation
    if (!formData.name || !formData.price || isNaN(Number(formData.price))) {
        setError("Please enter a valid product name and numeric price.");
        return;
    }
    
    setLoading(true);
    setError(null);
    try {
      // Direct call to the robust API service
      await apiService.createProduct(formData);
      
      // Reload all products on successful creation
      setFormData({ name: "", price: "", category: "", brand: "" });
      setShowForm(false);
      await loadProducts();

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add product");
      console.error("Failed to add product:", err);
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (id: string | null) => {
    if (!id) {
        console.error("Cannot delete product: ID is missing.");
        setError("Cannot delete product: ID is missing.");
        return;
    }
    
    // Confirmation logic is logged instead of using window.confirm
    console.log(`Attempting to delete product ID/UUID: ${id}. (Confirmation logic skipped)`);
    
    setLoading(true);
    setError(null);
    try {
      // Direct call to the robust API service
      await apiService.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.uuid !== id && p.productId?.toString() !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product");
      console.error("Failed to delete product:", err);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen font-sans">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-6 border-b-4 border-orange-500 pb-3">
            Product Inventory Management
        </h1>

      <div className="mb-6">
        <button
          onClick={() => {
            setShowForm(!showForm);
            if (!showForm) {
              setFormData({ name: "", price: "", category: "", brand: "" });
              setError(null); 
            }
          }}
          className="flex items-center space-x-2 px-6 py-2 bg-orange-600 text-white font-bold rounded-xl shadow-lg hover:bg-orange-700 transition duration-300 transform hover:scale-[1.02]"
        >
          {showForm ? "Cancel Creation" : "+ Add New Product"}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-xl mb-6 border border-red-200 shadow-md transition duration-300">
          <p className="font-bold">API Error:</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-2xl mb-8 border border-gray-100 transition duration-500 ease-in-out transform scale-100">
          <p className="text-xl font-semibold mb-4 text-gray-800">New Product Details</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <InputGroup 
                label="Product Name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <InputGroup
                label="Price ($)"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
            <InputGroup 
                label="Category"
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
            <InputGroup 
                label="Brand"
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            />
          </div>
          <button
            onClick={handleAdd}
            className="w-full md:w-auto px-8 py-3 bg-green-600 text-white font-bold rounded-xl shadow-md hover:bg-green-700 transition duration-300 disabled:bg-gray-400 disabled:shadow-none transform hover:scale-[1.01]"
            disabled={loading}
          >
            {loading ? 'Adding Product...' : 'Create Product'}
          </button>
        </div>
      )}

      <CrudTable
        columns={["ID/UUID", "Name", "Price", "Category", "Brand", "Actions"]}
        data={products.map((p) => {
            // 1. Determine the ID for display and deletion (prioritize UUID, then productId)
            const idForDeletion = p.uuid || p.productId?.toString() || null;
            const safeId = typeof idForDeletion === 'string' ? idForDeletion : 'N/A';
            const truncatedId = safeId.length > 15 ? safeId.slice(0, 15) + '...' : safeId;
            
            // 2. Safely extract price from the nested variantsDTO 
            const safePrice = typeof p.variantsDTO?.[0]?.unitPrice === 'number' ? p.variantsDTO[0].unitPrice : 0;

            return {
                // Use the resolved ID for key and deletion
                id: idForDeletion, 
                cells: [
                    <span className={safeId === 'N/A' ? 'text-red-500 font-bold' : 'font-mono text-xs'}>{truncatedId}</span>, 
                    p.productName, // Use 'productName' from API
                    `$${safePrice.toFixed(2)}`, // Use safePrice and toFixed(2)
                    p.categoryName, // Use 'categoryName' from API
                    p.brand
                ],
                // handleDelete uses the resolved ID
                actions: [{ label: "Delete", onClick: () => handleDelete(idForDeletion) }],
            };
        })}
        loading={loading}
      />
    </div>
  );
}
