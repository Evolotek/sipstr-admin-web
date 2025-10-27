// src/services/api.ts (updated)
import { Product, PackageUnit, Role, TopPick, User, Store, StoreItemDTO, StoreReportItemDTO, PageResponse,
  OfferDetailRequest, OfferDetailResponse
 } from "./types";

export const API_BASE_URL = "http://localhost:8080";

// --- Token Helpers ---
export const getToken = (): string | null => typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
export const setToken = (token: string): void => { if (typeof window !== "undefined") localStorage.setItem("auth_token", token); };
export const getRefreshToken = (): string | null => typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null;
export const setRefreshToken = (token: string): void => { if (typeof window !== "undefined") localStorage.setItem("refresh_token", token); };
export const clearToken = (): void => { if (typeof window !== "undefined") { localStorage.removeItem("auth_token"); localStorage.removeItem("refresh_token"); } };

// helper to detect auth/public endpoints where access token should NOT be sent
const isAuthEndpoint = (endpoint: string) => {
  // normalize (endpoint might include querystring) and check the path start
  const path = endpoint.split('?')[0].toLowerCase();
  return path === '/auth/login' || path === '/auth/refresh-token' || path.startsWith('/auth/');
};

// --- Refresh Token Handler ---
async function refreshToken(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token available");

  const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${refreshToken}` },
    // If your backend expects the refresh token in the body instead, change to:
    // body: JSON.stringify({ refreshToken })
  });

  if (!response.ok) {
    clearToken();
    throw new Error("Failed to refresh token");
  }

  const data = await response.json() as { token: string; refreshToken: string; expiresIn: number };
  setToken(data.token);
  setRefreshToken(data.refreshToken);
}

// --- Generic API Call ---
// note: this function will not attach the access token for auth endpoints (login/refresh)
export async function apiCall<T>(method: string, endpoint: string, body?: unknown, retry = true): Promise<T> {
  const headers: HeadersInit = { "Content-Type": "application/json" };

  // Only attach the access token for non-auth endpoints
  try {
    if (!isAuthEndpoint(endpoint)) {
      const token = getToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
  } catch (err) {
    // Defensive: localStorage might throw in some environments; ignore and proceed
    console.debug("apiCall: token read error", err);
  }

  const options: RequestInit = { method, headers };
  if (body !== undefined && body !== null) options.body = JSON.stringify(body);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

  if (!response.ok) {
    if (response.status === 401 && retry) {
      // attempt refresh only when the call was protected (non-auth) — but safe to try anyway
      try {
        await refreshToken();
        return apiCall<T>(method, endpoint, body, false);
      } catch (refreshErr) {
        clearToken();
        throw new Error("Unauthorized. Please login again.");
      }
    }

    const parsed = await response.json().catch(() => null);
    const msg = parsed?.message || parsed?.error || `API Error: ${response.status} ${response.statusText}`;
    throw new Error(msg);
  }

  // no content
  if (response.status === 204 || response.headers.get("content-length") === "0") return {} as T;
  const text = await response.text();
  if (!text) return {} as T;
  try { return JSON.parse(text) as T; } 
  catch { return (text as unknown) as T; }
}

// --- Small api wrapper ---
export const api = {
  get: <T = any>(endpoint: string) => apiCall<T>("GET", endpoint),
  post: <T = any>(endpoint: string, body?: unknown) => apiCall<T>("POST", endpoint, body),
  put: <T = any>(endpoint: string, body?: unknown) => apiCall<T>("PUT", endpoint, body),
  patch: <T = any>(endpoint: string, body?: unknown) => apiCall<T>("PATCH", endpoint, body),
  delete: <T = any>(endpoint: string, body?: unknown) => apiCall<T>("DELETE", endpoint, body),
};

// --- Interfaces ---
export interface LoginResponse { token: string; refreshToken: string; id: string; email: string; role: string }

export interface UserCreationData { name: string; email: string; password?: string; mobileNumber?: string; roleName: 'ADMIN' | 'SUPER_ADMIN' | 'STORE_OWNER' | 'USER'; }
export interface Order { id: string; shortID?: string; customer: string; amount: number; status: string; date: string }
export interface Brand { id: string; name: string }
export interface Category { id: string; name: string; description: string }
export interface Report { store: string; orders: number; revenue: number; date: string }
export interface DeliveryZone { zoneId:number; zoneName: string; baseDeliveryFee: number; perMileFee: number; minOrderAmount: number; estimatedPreparationTime: number; isRestricted: boolean; coordinates: number[][]; storeUuid: string }
export interface OrderResponseDTO {
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
  // --- Auth ---
  login: async (email: string, password: string) => {
    const res = await apiCall<LoginResponse>("POST", "/auth/login", { identifier: email, password, roleName: "ADMIN" });
    setToken(res.token);
    setRefreshToken(res.refreshToken);
    return res;
  },
  logout: () => clearToken(),

  // --- Users ---
  createAdmin: async (data: Omit<UserCreationData,'roleName'>) => apiCall<User>("POST","/users",{...data, roleName:'ADMIN'}),
  getUsers: async (page: number = 0, size: number = 10) => {
    const qs = `?page=${encodeURIComponent(page)}&size=${encodeURIComponent(size)}`;
    return apiCall<User[]>("GET", `/users${qs}`);
  },
  getUserByUuid: async (uuid: string) => apiCall<User>("GET", `/users/${uuid}`),
  createUser: async (
    data: Omit<UserCreationData, "roleName">,
    roleName: "CUSTOMER" | "STORE_OWNER" | "ADMIN" = "CUSTOMER"
  ) => apiCall<User>("POST", "/users", { ...data, roleName }),
  updateUser: async (uuid: string, data: Partial<User>) => {
    const response = await apiCall<any>("PATCH", `/users/${uuid}`, data);
    return response?.data ?? response;
  },
  deleteUser: async (uuid: string) => apiCall<void>("DELETE", `/users/${uuid}`),

  // --- Orders ---
  getTrackedOrder: async (orderShortId: string) => apiCall<OrderResponseDTO>("GET", `/orders/track?${new URLSearchParams({ orderShortId })}`),
  refundOrderFull: async (shortId: string) => apiCall<void>("POST","/orders/refund",{orderShortId:shortId}),
  refundOrderPartial: async (shortId: string, itemIds: number[]) => apiCall<void>("POST","/orders/refund/partial",{orderShortId:shortId,itemIds}),
  updateOrderStatus: async (id: string, status: string) => apiCall<Order>("PUT","/orders/update-status",{id,status}),

  // --- Products ---
  getProducts: async (): Promise<Product[]> => {
    let allProducts: Product[] = [];
    let page = 0;
    const size = 50; // adjust page size as needed
    let totalPages = 1;

    do {
      const raw = await apiCall<any>("GET", `/products?page=${page}&size=${size}`);
      console.debug(`apiService.getProducts raw page ${page}:`, raw);

      const content: Product[] = Array.isArray(raw) ? raw : raw?.content ?? [];
      allProducts = allProducts.concat(content);

      totalPages = raw?.totalPages ?? 1;
      page++;
    } while (page < totalPages);

    return allProducts;
  },

  getProductById: async (uuid: string) => apiCall<Product>("GET", `/products/${uuid}`),
  createProduct: async (data: Partial<Product>) =>
    apiCall<Product>("POST", "/products", {
      productName: data.productName,
      description: data.description ?? "",
      brand: data.brand,
      categoryName: data.categoryName,
      taxCategory: data.taxCategory ?? "General",
      isAlcoholic: false,
      isGlutenFree: false,
      isKosher: false,
      isWine: false,
      hasTobacco: false,
      hasCannabis: false,
      isReturnable: true,
      isPerishable: false,
      allergenInfo: "",
      nutritionalInfo: ""
    }),

  updateProduct: async (uuid: string, data: Partial<Product>) => apiCall<Product>("PATCH", `/products/${uuid}`, data),
  deleteProduct: async (uuid: string) => apiCall<void>("DELETE", `/products/${uuid}`),

  // --- Variants ---
  createVariant: async (productId: number, data: unknown) => apiCall("POST", `/products/${productId}/variants`, data),
  updateVariant: async (variantId: string, data: unknown) => apiCall("PATCH", `/products/variants/${variantId}`, data),
  deleteVariant: async (variantId: string) => apiCall<void>("DELETE", `/products/variants/${variantId}`),

  // --- Brands ---
  getBrands: async () => apiCall<Brand[]>("GET","/brands"),
  createBrand: async (data: Partial<Brand>) => apiCall<Brand>("POST","/brands",data),
  updateBrand: async (id: string, data: Partial<Brand>) => apiCall("PATCH", `/brands/${id}`, data),
  deleteBrand: async (id: string) => apiCall<void>("DELETE", `/brands/${id}`),

  // --- Categories ---
  getCategories: async () => apiCall<Category[]>("GET","/categories"),
  createCategory: async (data: Partial<Category>) => apiCall<Category>("POST","/categories",data),
  updateCategory: async (id: string, data: Partial<Category>) => apiCall<Category>("PUT", `/categories/${id}`, data),
  deleteCategory: async (id: string) => apiCall<void>("DELETE", `/categories/${id}`),

  // --- Package-Unit
  getPackageUnits: async (page = 0, size = 50): Promise<PackageUnit[]> => {
    let all: PackageUnit[] = []
    let currentPage = page
    let totalPages = 1

    do {
      const res = await apiCall<{ content: PackageUnit[]; totalPages: number }>(
        "GET",
        `/package-units?page=${currentPage}&size=${size}`
      )
      all = all.concat(res.content)
      totalPages = res.totalPages
      currentPage++
    } while (currentPage < totalPages)

    return all
  },
  createPackageUnit: async (data: Partial<PackageUnit>) => apiCall<PackageUnit>("POST", "/package-units", data),
  updatePackageUnit: async (id: number, data: Partial<PackageUnit>) => apiCall<PackageUnit>("PUT", `/package-units/${id}`, data),
  deletePackageUnit: async (id: number) => apiCall<void>("DELETE", `/package-units/${id}`),

  // --- Stores & Zones ---
  getStores: async () => apiCall<Store[]>("GET","/stores"),
  getStoreByUuid: async (uuid: string): Promise<Store> =>  apiCall("GET", `/stores/${uuid}`),
  updateStore: async (storeUuid: string, updateData: Partial<Store>): Promise<Store> => {
    console.log(`API: Updating store ${storeUuid}`);
    return apiCall<Store>("PATCH", `/stores/${storeUuid}`, updateData);
  },
  deleteStore: async (storeUuid: string): Promise<void> => {
    console.log(`API: Deleting store ${storeUuid}`);
    return apiCall<void>("DELETE", `/stores/${storeUuid}`);
  },
  createZone: async (data: DeliveryZone) => apiCall<DeliveryZone>("POST","/vendor/zones",data),
  updateZone: async (zoneId: string, data: Partial<DeliveryZone>) => apiCall<DeliveryZone>("PATCH", `/stores/zones/${zoneId}`, data),
  deleteZone: async (zoneId: string) => apiCall<void>("DELETE", `/stores/zones/${zoneId}`),
  getZonesByStoreUuid: async (storeUuid: string) => apiCall<DeliveryZone[]>("GET", `/zones/${storeUuid}`),

  // --- Roles ---
  getRoles: async () => apiCall<Role[]>("GET","/roles"),
  getRoleById: async (id: string) => apiCall<Role>("GET", `/roles/${id}`),
  addRole: async (role: { name: string; description: string; permissions: string[] }) => apiCall<Role>("POST", "/roles", role),
  updateRole: async (id: string, role: { name: string; description: string; permissions: string[] }) => apiCall<Role>("PUT", `/roles/${id}`, role),

  deleteRole: async (id: string) => apiCall<void>("DELETE", `/roles/${id}`),

  //Role-permission
  getRolePermissions: async () => apiCall("GET","/roles/permissions"),
  addRolePermissions: async (roleId: string, permissions: string[]) =>
  apiCall( "POST",`/roles/${roleId}/permissions`,{ permissions }),
  removeRolePermission: async (roleId: string, permissions: string[]) =>
  apiCall<void>("DELETE", `/roles/${roleId}/permissions`, { permissions }),

  

  // --- Top Picks ---
  getTopPicks: async () => {
    const data = await apiCall<TopPick[]>("GET", "/top-picks");
    return data.map(tp => ({ ...tp, rank: tp.rankingScore }));
  },
  addTopPick: async (productUuid: string, rank: number) =>
    apiCall<TopPick>("POST", `/top-picks/${productUuid}?rankingScore=${encodeURIComponent(rank)}`),
  updateTopPick: async (productUuid: string, rank: number, isFeatured?: boolean) =>
    apiCall<TopPick>("PATCH", `/top-picks/${productUuid}`, {
      rankingScore: rank,
      ...(isFeatured !== undefined ? { isFeatured } : {}),
    }),
  removeTopPick: async (productUuid: string) =>
    apiCall<void>("DELETE", `/top-picks/${productUuid}`),

  // ---Coupon and Offer---
    createOffer: async (offer: OfferDetailRequest): Promise<number> => {
    const res = await apiCall<any>("POST", "/offers", offer);
    return (res?.data ?? res?.offerId ?? res?.id ?? res) as number;
  },

  updateOffer: async (offer: OfferDetailRequest): Promise<void> => {
    await apiCall<any>("PUT", "/update-offer-detail", offer);
  },

  getConsumptionHistory: async (offerId: number): Promise<OfferDetailResponse> => {
    return apiCall<OfferDetailResponse>(
      "GET",
      `/consumption-history-detail?offerId=${encodeURIComponent(String(offerId))}`
    );
  },

  deleteOffer: async (offerId: number): Promise<void> => {
    await apiCall<any>("POST", `/offers/${encodeURIComponent(String(offerId))}`);
  },

  toggleOfferStatus: async (offerId: number): Promise<void> => {
    await apiCall<any>("PATCH", `/offers/${encodeURIComponent(String(offerId))}/status`);
  },
  getAllOffers: async (storeId: number) => {
    return apiCall<any[]>("GET", `/offers?storeId=${encodeURIComponent(String(storeId))}`);
  },
  getOfferDetailView: async (offerId: number): Promise<any> => {
  return apiCall<any>("GET", `/offer-details?offerId=${encodeURIComponent(String(offerId))}`);
},



  // --- Reports ---
getReports: async (
    storeUuid?: string,
    startDate?: string, // dd-MM-yyyy
    endDate?: string,   // dd-MM-yyyy
    page: number = 0,
    size: number = 10
  ): Promise<PageResponse<StoreReportItemDTO>> => {
    const params = new URLSearchParams();
    if (storeUuid) params.append("storeUuid", storeUuid);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    params.append("page", String(page));
    params.append("size", String(size));

    const endpoint = `/vendor/report${params.toString() ? `?${params.toString()}` : ""}`;
    return apiCall<PageResponse<StoreReportItemDTO>>("GET", endpoint);
  },
};
