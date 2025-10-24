const API_BASE_URL = "http://localhost:8080"

// --- Token Management ---
const getToken = (): string | null => typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
const setToken = (token: string): void => { if (typeof window !== "undefined") localStorage.setItem("auth_token", token) }
const getRefreshToken = (): string | null => typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null
const setRefreshToken = (token: string): void => { if (typeof window !== "undefined") localStorage.setItem("refresh_token", token) }
const clearToken = (): void => { if (typeof window !== "undefined") { localStorage.removeItem("auth_token"); localStorage.removeItem("refresh_token") } }

// --- Refresh Token Handler ---
async function refreshToken(): Promise<void> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new Error("No refresh token available")

  const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${refreshToken}`,
    },
  })
    
  if (!response.ok) {
    clearToken()
    throw new Error("Failed to refresh token")
  }

  const data = await response.json() as { token: string; refreshToken: string; expiresIn: number }
  setToken(data.token)
  setRefreshToken(data.refreshToken)
}

// --- API Request Helper ---
async function apiCall<T>(method: string, endpoint: string, body?: unknown, retry = true): Promise<T> {
  const headers: HeadersInit = { "Content-Type": "application/json" }
  const token = getToken()
  if (token) headers["Authorization"] = `Bearer ${token}`

  const options: RequestInit = { method, headers }
  if (body) options.body = JSON.stringify(body)

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options)

  if (!response.ok) {
    if (response.status === 401 && retry) {
      try {
        await refreshToken()
        return apiCall<T>(method, endpoint, body, false) // retry once
      } catch (err) {
        clearToken()
        throw new Error("Unauthorized. Please login again.")
      }
    }
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `API Error: ${response.status} on ${endpoint}`)
  }

  if (response.status === 204 || response.headers.get("Content-Length") === "0") return {} as T
  return response.json()
}

// --- Interfaces ---
interface LoginResponse { token: string; refreshToken: string; id: string; email: string; role: string }
interface User { uuid?: string; id?: string; name: string; email: string; role: string }
interface UserCreationData { name: string; email: string; password?: string; mobileNumber?: string; roleName: 'ADMIN' | 'SUPER_ADMIN' | 'STORE_OWNER' | 'USER'; }
interface Order { id: string; shortID?: string; customer: string; amount: number; status: string; date: string }
interface Product { id: string; uuid?: string; name: string; price: number; category: string; brand: string }
interface Brand { id: string; name: string; description: string }
interface Category { id: string; name: string; description: string }
interface Store { id: string; name: string; location: string; phone: string }
interface Role { id: string; name: string; permissions: string[] }
interface TopPick { id: string; productId: string; productUuid?: string; productName: string; rank: number }
interface Report { store: string; orders: number; revenue: number; date: string }
interface DeliveryZone { zoneId:number; zoneName: string; baseDeliveryFee: number; perMileFee: number; minOrderAmount: number; estimatedPreparationTime: number; isRestricted: boolean; coordinates: number[][]; storeUuid: string }
interface StoreItemDTO { storeUuid: string; storeName: string; storeAddress: string; storePhone: string; storeEmail?: string }
interface OrderResponseDTO {
  orderUuid: string; userUuid: string; userName: string; userEmail: string; address: string; mobileNumber: string;
  orderStatus: "CREATED" | "PAYMENT_PENDING" | "ACCEPTED_BY_STORE" | "PARTIALLY_ACCEPTED_BY_STORE"
    | "SCHEDULED" | "READY_TO_PICKUP" | "CANCELLED_BY_CUSTOMER" | "OUT_FOR_DELIVERY"
    | "PARTIAL_DELIVERED" | "CANCELLED_BY_STORE" | "PARTIALLY_CANCELLED" | "DAMAGED"
    | "DELIVERED" | "REFUNDED" | "PARTIALLY_REFUNDED";
  paymentStatus: "PAYMENT_INITIATED" | "PAYMENT_PENDING" | "PAYMENT_PROCESSING" | "PAYMENT_SUCCESS"
    | "PAYMENT_FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED" | "REFUND_INITIATED"
    | "PARTIALLY_REFUND_INITIATED" | "STRIPE_ACCOUNT_NOT_CONNECTED" | "PAYMENT_ENQUEUED";
  subtotal: number; totalTax: number; totalStoreDiscount: number; totalSipstrDiscount: number;
  totalDeliveryFee: number; serviceFee: number; tip: number; totalCheckoutBagFee: number; totalBottleDepositFee: number;
  originalTotal: number; adjustedTotal: number; differenceTotal: number; itemOrderedCount: number; totalQuantity: number;
  specialInstructions: string; estimatedDeliveryTime: string; actualDeliveryTime: string; isScheduled: boolean;
  scheduledTime: string; refundStatus?: string; orderInitiatedAt?: string; deliveredAt?: string; orderedAt?: string; refundedAt?: string;
  clientSecret?: string; deliveryOtp?: string; stores: StoreItemDTO[];
}

// --- API Service ---
export const apiService = {
  // --- Authentication ---
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await apiCall<LoginResponse>("POST", "/auth/login", { identifier: email, password, roleName: "ADMIN" })
    setToken(response.token)
    setRefreshToken(response.refreshToken)
    return response
  },
  logout(): void { clearToken() },

  // --- Users ---
  async createAdmin(data: Omit<UserCreationData,'roleName'>): Promise<User> { return apiCall<User>("POST","/users",{...data, roleName:'ADMIN'}) },
  async getUsers(): Promise<User[]> { return apiCall<User[]>("GET","/users") },
  async createUser(data: Omit<UserCreationData,'roleName'>): Promise<User> { return apiCall<User>("POST","/users",{...data, roleName:'USER'}) },
  async updateUser(uuid: string, data: Partial<User>): Promise<User> { return apiCall<User>("PATCH", `/users/${uuid}`, data) },
  async deleteUser(uuid: string): Promise<void> { return apiCall<void>( "DELETE", `/users/${uuid}` ) },

  // --- Orders ---
  async getTrackedOrder(orderShortId: string): Promise<OrderResponseDTO> { 
    const params = new URLSearchParams({ orderShortId })
    return apiCall<OrderResponseDTO>("GET", `/orders/track?${params.toString()}`) 
  },
  async refundOrderFull(shortId: string): Promise<void> { return apiCall<void>("POST","/orders/refund",{orderShortId:shortId}) },
  async refundOrderPartial(shortId: string, itemIds: number[]): Promise<void> { return apiCall<void>("POST","/orders/refund/partial",{orderShortId:shortId,itemIds}) },
  async updateOrderStatus(id: string, status: string): Promise<Order> { return apiCall<Order>("PUT","/orders/update-status",{id,status}) },

  // --- Products ---
  async getProducts(): Promise<Product[]> { return apiCall<Product[]>("GET","/products") },
  async getProductById(uuid: string): Promise<Product> { return apiCall<Product>("GET", `/products/${uuid}`) },
  async createProduct(data: Partial<Product>): Promise<Product> { return apiCall<Product>("POST","/products",data) },
  async updateProduct(uuid: string, data: Partial<Product>): Promise<Product> { return apiCall<Product>("PATCH", `/products/${uuid}`, data) },
  async deleteProduct(uuid: string): Promise<void> { return apiCall<void>("DELETE", `/products/${uuid}`) },

  // --- Variants ---
  async createVariant(productId: string, data: unknown): Promise<unknown> { return apiCall("POST", `/products/${productId}/variants`, data) },
  async updateVariant(variantId: string, data: unknown): Promise<unknown> { return apiCall("PATCH", `/products/variants/${variantId}`, data) },
  async deleteVariant(variantId: string): Promise<void> { return apiCall<void>("DELETE", `/products/variants/${variantId}`) },

  // --- Brands ---
  async getBrands(): Promise<Brand[]> { return apiCall<Brand[]>("GET","/brands") },
  async createBrand(data: Partial<Brand>): Promise<Brand> { return apiCall<Brand>("POST","/brands",data) },
  async updateBrand(id: string, data: Partial<Brand>): Promise<Brand> { return apiCall<Brand>("PATCH", `/brands/${id}`, data) },
  async deleteBrand(id: string): Promise<void> { return apiCall<void>("DELETE", `/brands/${id}`) },

  // --- Categories ---
  async getCategories(): Promise<Category[]> { return apiCall<Category[]>("GET","/categories") },
  async createCategory(data: Partial<Category>): Promise<Category> { return apiCall<Category>("POST","/categories",data) },
  async updateCategory(id: string, data: Partial<Category>): Promise<Category> { return apiCall<Category>("PATCH", `/categories/${id}`, data) },
  async deleteCategory(id: string): Promise<void> { return apiCall<void>("DELETE", `/categories/${id}`) },

  // --- Stores & Zones ---
  async getStores(): Promise<Store[]> { return apiCall<Store[]>("GET","/stores") },
  async createStore(data: Partial<Store>): Promise<Store> { return apiCall<Store>("POST","/stores",data) },
  async createZone(data: DeliveryZone): Promise<DeliveryZone> { return apiCall<DeliveryZone>("POST","/vendor/zones",data) },
  async updateZone(zoneId: string, data: Partial<DeliveryZone>): Promise<DeliveryZone> { return apiCall<DeliveryZone>("PATCH", `/stores/zones/${zoneId}`, data) },
  async deleteZone(zoneId: string): Promise<void> { return apiCall<void>("DELETE", `/stores/zones/${zoneId}`) },
  async getZonesByStoreUuid(storeUuid: string): Promise<DeliveryZone[]> { return apiCall<DeliveryZone[]>("GET", `/zones/${storeUuid}`) },

  // --- Roles ---
  async getRoles(): Promise<Role[]> { return apiCall<Role[]>("GET","/roles") },
  async getRoleById(id: string): Promise<Role> { return apiCall<Role>("GET", `/roles/${id}`) },
  async getRolePermissions(): Promise<unknown> { return apiCall("GET","/roles/permissions") },
  async addRolePermission(roleId: string, permission: string): Promise<unknown> { return apiCall("POST", `/roles/${roleId}/permissions`, { permission }) },
  async removeRolePermission(roleId: string, permission: string): Promise<void> { return apiCall<void>("DELETE", `/roles/${roleId}/permissions`, { permission }) },
  async deleteRole(id: string): Promise<void> { return apiCall<void>("DELETE", `/roles/${id}`) },

  // --- Top Picks ---
  async getTopPicks(): Promise<TopPick[]> { return apiCall<TopPick[]>("GET","/top-picks") },
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
  }
}
