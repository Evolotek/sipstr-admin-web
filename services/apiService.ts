const API_BASE_URL = "http://localhost:8080"

// JWT Token Management (using localStorage as specified in original file)
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

const HARDCODED_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhY2NvdW50U3RhdHVzIjoiQUNUSVZFIiwicm9sZSI6IkFETUlOIiwibW9iaWxlTnVtYmVyIjoiKzkxMTIzNDU2Nzg5OSIsInV1aWQiOiI5MjQ3ZDI5OS01MWQ4LTQyZGItOTRlZi0wN2Y2M2Q3NWNkZTAiLCJlbWFpbCI6InByYXRpay5kaGFuZUBldm9sb3Rlay5haSIsInN1YiI6InByYXRpay5kaGFuZUBldm9sb3Rlay5haSIsImlhdCI6MTc2MTIyNjg2NiwiZXhwIjoxNzYxMjMwNDY2fQ.IdY_XlGil8QAUyV-WYIqaL_zRUQCrGAAsU_EoLSnrlY"

// API Request Helper with JWT Authorization and Error Handling
async function apiCall<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
  const headers: HeadersInit = { "Content-Type": "application/json" }
  const token = getToken()
  if (token) headers["Authorization"] = `Bearer ${HARDCODED_TOKEN}`

  const options: RequestInit = { method, headers }
  if (body) options.body = JSON.stringify(body)

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options)

  if (!response.ok) {
    if (response.status === 401) {
      clearToken()
      // Note: In a real React app, you'd use React Router history or state to redirect
      // window.location.href = "/login" 
    }
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `API Error: ${response.status} on ${endpoint}`)
  }

  // Handle 204 No Content for DELETE or certain PUT/PATCH operations
  if (response.status === 204 || response.headers.get("Content-Length") === "0") {
    return {} as T
  }

  return response.json()
}

// --- Interfaces for Data Consistency ---

interface LoginResponse { 
  token: string; 
  id: string; 
  email: string; 
  role: string 
}

interface User { 
  uuid?: string; 
  id?: string; 
  name: string; 
  email: string; 
  role: string 
}

// Interface for creating a new user or admin (requires more fields than just 'User')
interface UserCreationData {
  name: string;
  email: string;
  password?: string;
  mobileNumber?: string;
  roleName: 'ADMIN' | 'SUPER_ADMIN' | 'STORE_OWNER' | 'USER'; 
}

interface Order { 
  id: string; 
  shortID?: string; 
  customer: string; 
  amount: number; 
  status: string; 
  date: string 
}

interface Product { 
  id: string; 
  uuid?: string; 
  name: string; 
  price: number; 
  category: string; 
  brand: string 
}

interface Brand { 
  id: string; 
  name: string; 
  description: string 
}

interface Category { 
  id: string; 
  name: string; 
  description: string 
}

interface Store { 
  id: string; 
  name: string; 
  location: string; 
  phone: string 
}

interface Role { 
  id: string; 
  name: string; 
  permissions: string[] 
}

interface TopPick { 
  id: string; 
  productId: string; 
  productUuid?: string; 
  productName: string; 
  rank: number 
}

interface Report { 
  store: string; 
  orders: number; 
  revenue: number; 
  date: string 
}

// Interface based on Postman Collection for Delivery Zones (complex body)
interface DeliveryZone {
  zoneName: string;
  baseDeliveryFee: number;
  perMileFee: number;
  minOrderAmount: number;
  estimatedPreparationTime: number;
  isRestricted: boolean;
  coordinates: number[][]; // Array of [lat, lon] pairs
  storeUuid: string;
}

// --- Add this interface for the response ---
interface StoreItemDTO {
  storeUuid: string;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeEmail?: string;
}

interface OrderResponseDTO {
  orderUuid: string;
  userUuid: string;
  userName: string;
  userEmail: string;
  address: string;
  mobileNumber: string;
  orderStatus: 
    | "CREATED" | "PAYMENT_PENDING" | "ACCEPTED_BY_STORE" | "PARTIALLY_ACCEPTED_BY_STORE"
    | "SCHEDULED" | "READY_TO_PICKUP" | "CANCELLED_BY_CUSTOMER" | "OUT_FOR_DELIVERY"
    | "PARTIAL_DELIVERED" | "CANCELLED_BY_STORE" | "PARTIALLY_CANCELLED" | "DAMAGED"
    | "DELIVERED" | "REFUNDED" | "PARTIALLY_REFUNDED";
  paymentStatus: 
    | "PAYMENT_INITIATED" | "PAYMENT_PENDING" | "PAYMENT_PROCESSING" | "PAYMENT_SUCCESS"
    | "PAYMENT_FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED" | "REFUND_INITIATED"
    | "PARTIALLY_REFUND_INITIATED" | "STRIPE_ACCOUNT_NOT_CONNECTED" | "PAYMENT_ENQUEUED";
  subtotal: number;
  totalTax: number;
  totalStoreDiscount: number;
  totalSipstrDiscount: number;
  totalDeliveryFee: number;
  serviceFee: number;
  tip: number;
  totalCheckoutBagFee: number;
  totalBottleDepositFee: number;
  originalTotal: number;
  adjustedTotal: number;
  differenceTotal: number;
  itemOrderedCount: number;
  totalQuantity: number;
  specialInstructions: string;
  estimatedDeliveryTime: string;
  actualDeliveryTime: string;
  isScheduled: boolean;
  scheduledTime: string;
  refundStatus?: string;
  orderInitiatedAt?: string;
  deliveredAt?: string;
  orderedAt?: string;
  refundedAt?: string;
  clientSecret?: string;
  deliveryOtp?: string;
  stores: StoreItemDTO[];
}

// --- API Service Implementation ---
export const apiService = {
    async getTrackedOrder(orderShortId: string): Promise<OrderResponseDTO> {
  const params = new URLSearchParams({ orderShortId });
  return apiCall<OrderResponseDTO>("GET", `/orders/track?${params.toString()}`);
},

  // --- Authentication ---
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await apiCall<LoginResponse>("POST", "/auth/login", {
      identifier: email,
      password,
      // Using "SUPER_ADMIN" based on the Postman collection.
      roleName: "ADMIN", 
    })
    setToken(response.token)
    return response
  },
  logout(): void { clearToken() },

  // --- Users & Admin Management ---

  /**
   * Creates a new Admin account.
   * Based on Admin Doc: "Create a new admin account (POST)".
   * Assumes the creation happens via the general /users endpoint with a specific role.
   */
  async createAdmin(data: Omit<UserCreationData, 'roleName'>): Promise<User> { 
    const adminData: UserCreationData = {
      ...data,
      roleName: 'ADMIN', // Set role explicitly
    };
    // The documentation implies creating an admin uses a POST method, likely to /users
    return apiCall<User>("POST", "/users", adminData);
  },

  async getUsers(): Promise<User[]> { return apiCall<User[]>("GET", "/users") },
  async createUser(data: Omit<UserCreationData, 'roleName'>): Promise<User> { 
    // Default user creation, assuming role is 'USER' or set by backend
    const userData: UserCreationData = {
      ...data,
      roleName: 'USER', 
    };
    return apiCall<User>("POST", "/users", userData); 
  },
  async updateUser(uuid: string, data: Partial<User>): Promise<User> { return apiCall<User>("PATCH", `/users/${uuid}`, data) },
  async deleteUser(uuid: string): Promise<void> { return apiCall<void>("DELETE", `/users/${uuid}`) },

  // --- Orders ---
  async getOrderByShortId(shortID: string): Promise<Order> { return apiCall<Order>("GET", `/orders/${shortID}`) },
  // These refund endpoints are implied by the documentation and are often POST requests
  async refundOrderFull(shortId: string): Promise<void> {  return apiCall<void>("POST", "/orders/refund", { orderShortId: shortId });},
  async refundOrderPartial(shortId: string, itemIds: number[]): Promise<void> { return apiCall<void>("POST", "/orders/refund/partial", { orderShortId: shortId, itemIds });},

  async updateOrderStatus(id: string, status: string): Promise<Order> { return apiCall<Order>("PUT", "/orders/update-status", { id, status }) },

  // --- Products ---
  async getProducts(): Promise<Product[]> { return apiCall<Product[]>("GET", "/products") },
  async getProductById(uuid: string): Promise<Product> { return apiCall<Product>("GET", `/products/${uuid}`) },
  async createProduct(data: Partial<Product>): Promise<Product> { return apiCall<Product>("POST", "/products", data) },
  async updateProduct(uuid: string, data: Partial<Product>): Promise<Product> { return apiCall<Product>("PATCH", `/products/${uuid}`, data) },
  async deleteProduct(uuid: string): Promise<void> { return apiCall<void>("DELETE", `/products/${uuid}`) },

  // --- Product Variants (Burger Options) ---
  // Assuming variants are created/managed under a product ID
  async createVariant(productId: string, data: unknown): Promise<unknown> { return apiCall("POST", `/products/${productId}/variants`, data) },
  async updateVariant(variantId: string, data: unknown): Promise<unknown> { return apiCall("PATCH", `/products/variants/${variantId}`, data) },
  async deleteVariant(variantId: string): Promise<void> { return apiCall<void>("DELETE", `/products/variants/${variantId}`) },

  // --- Brands ---
  async getBrands(): Promise<Brand[]> { return apiCall<Brand[]>("GET", "/brands") },
  async createBrand(data: Partial<Brand>): Promise<Brand> { return apiCall<Brand>("POST", "/brands", data) },
  async updateBrand(id: string, data: Partial<Brand>): Promise<Brand> { return apiCall<Brand>("PATCH", `/brands/${id}`, data) },
  async deleteBrand(id: string): Promise<void> { return apiCall<void>("DELETE", `/brands/${id}`) },

  // --- Categories ---
  async getCategories(): Promise<Category[]> { return apiCall<Category[]>("GET", "/categories") },
  async createCategory(data: Partial<Category>): Promise<Category> { return apiCall<Category>("POST", "/categories", data) },
  async updateCategory(id: string, data: Partial<Category>): Promise<Category> { return apiCall<Category>("PATCH", `/categories/${id}`, data) },
  async deleteCategory(id: string): Promise<void> { return apiCall<void>("DELETE", `/categories/${id}`) },

  // --- Stores / Zones ---
  async getStores(): Promise<Store[]> { return apiCall<Store[]>("GET", "/stores") },
  async createStore(data: Partial<Store>): Promise<Store> { return apiCall<Store>("POST", "/stores", data) },
  async createZone(data: DeliveryZone): Promise<DeliveryZone> { return apiCall<DeliveryZone>("POST", "/vendor/zones", data) },
  async updateZone(zoneId: string, data: Partial<DeliveryZone>): Promise<DeliveryZone> { return apiCall<DeliveryZone>("PATCH", `/stores/zones/${zoneId}`, data) },
  async deleteZone(zoneId: string): Promise<void> { return apiCall<void>("DELETE", `/stores/zones/${zoneId}`) },

  // --- Roles ---
  async getRoles(): Promise<Role[]> { return apiCall<Role[]>("GET", "/roles") },
  async getRoleById(id: string): Promise<Role> { return apiCall<Role>("GET", `/roles/${id}`) },
  async getRolePermissions(): Promise<unknown> { return apiCall("GET", "/roles/permissions") },
  async addRolePermission(roleId: string, permission: string): Promise<unknown> { return apiCall("POST", `/roles/${roleId}/permissions`, { permission }) },
  async removeRolePermission(roleId: string, permission: string): Promise<void> { return apiCall<void>("DELETE", `/roles/${roleId}/permissions`, { permission }) },
  async deleteRole(id: string): Promise<void> { return apiCall<void>("DELETE", `/roles/${id}`) },

  // --- Top Picks ---
  async getTopPicks(): Promise<TopPick[]> { return apiCall<TopPick[]>("GET", "/top-picks") },
  async addTopPick(productUuid: string, rank: number): Promise<TopPick> { return apiCall<TopPick>("POST", `/top-picks/${productUuid}`, { rank }) },
  async updateTopPick(productUuid: string, rank: number): Promise<TopPick> { return apiCall<TopPick>("PATCH", `/top-picks/${productUuid}`, { rank }) },
  async removeTopPick(productUuid: string): Promise<void> { return apiCall<void>("DELETE", `/top-picks/${productUuid}`) },

  // --- Reports ---
  async getReports(storeId?: string, date?: string): Promise<Report[]> {
    let endpoint = "/vendor/report"
    const params = new URLSearchParams()
    if (storeId) params.append("storeId", storeId)
    if (date) params.append("date", date)
    if (params.toString()) endpoint += `?${params.toString()}`
    return apiCall<Report[]>("GET", endpoint)
  },
}
