// src/services/types.ts
export interface LoginResponse { 
  token: string; 
  refreshToken: string; 
  id: string; 
  email: string; role: string 
}

export interface User {
  id?: number;
  uuid?: string;
  email: string
  password?: string
  fullName: string
  mobileNumber?: string
  dob?: string // Use ISO string when sending to backend (e.g., "2003-05-21")
  roleName: "CUSTOMER" | "STORE_OWNER" | "ADMIN"
}

export interface ProductPage {
  content: Product[];
  totalElements: number;
  totalPages: number;
  number: number; // current page
  size: number;
}


export interface ProductVariant {
  packageName?: string;
  thumbnailImageUrl?: string;
  fullSizeImageUrl?: string;
  upc?: string;
  unitPrice: number;
  shelfLifeDays?: number;
  alcoholByVolume?: number;
  weightGrams?: number;
  calories?: number;
  carbs?: number;
  ibuValue?: number;
  sugars?: number;
  addedSugars?: number;
  dimensionsCm?: string;
  storageInstructions?: string;
  variantId: number;
}

export interface Product {
  productName: string;
  description: string;
  brand: string;
  categoryName: string;
  taxCategory?: string;
  isAlcoholic?: boolean;
  isGlutenFree?: boolean;
  isKosher?: boolean;
  isWine?: boolean;
  hasTobacco?: boolean;
  hasCannabis?: boolean;
  isReturnable?: boolean;
  isPerishable?: boolean;
  allergenInfo?: string;
  nutritionalInfo?: string;
  isActive?: boolean;
  productId: number;
  uuid: string;
  variantsDTO?: ProductVariant[];
}


export interface Brand { 
  id: string; 
  name: string 
}

export interface Category { 
  id: string; 
  name: string; 
  description: string 
}


export interface Store {
  uuid: string;
  storeName: string;
  corporationName?: string;
  ein?: number;
  licenseNumber?: string;
  liquorLicenseUrl?: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  deliveryRadiusKm?: number;
  minimumOrderAmount?: number;
  averagePreparationTime?: number;
  isCurrentlyAcceptingOrders?: boolean;
  rating?: number;
  taxRate?: number;
  commissionRate?: number;
  isActive?: boolean;
  latitude?: number;
  longitude?: number;
}

export interface Role {
  id: string;
  name: string;
  description:string;
  permissions: string[];
}

export interface RolePermissionsResponse {
  roleId: number;
  roleName: string;
  permissions: string[];
}

export interface TopPick {
  id: number
  productId: number
  uuid?: string
  productName: string
  rankingScore: number
  isFeatured: boolean
  updatedAt?: string
  thumbnailImageUrl?: string
}


export interface Report { 
  store: string; 
  orders: number; 
  revenue: number; 
  date: string 
}

export interface DeliveryZone { 
  zoneId:number; 
  zoneName: string; 
  baseDeliveryFee: number;
  perMileFee: number; 
  minOrderAmount: number; 
  estimatedPreparationTime: number; 
  isRestricted: boolean; 
  coordinates: number[][]; 
  storeUuid: string 
}


export interface CreateDeliveryZoneRequest {
  zoneName: string;
  baseDeliveryFee: number;
  perMileFee: number;
  minOrderAmount: number;
  estimatedPreparationTime: number;
  isRestricted: boolean;
  coordinates: [number, number][]; // [lat, lng]
  storeUuid: string;
}


export interface StoreItemDTO {
  storeUuid: string
  storeName: string
  storeAddress: string
  storePhone: string
  storeEmail?: string
  storeDeliveryFee?: number
  items?: {
    itemId: number
    itemName: string
    quantity: number
    price: number
    finalPrice: number
    status: string
  }[]
}

export interface OrderItem {
  id: number
  name: string
  price: number
}

export interface Order {
  orderUuid: string
  userUuid: string
  userName: string
  userEmail: string
  address: string
  mobileNumber: string
  orderStatus: string
  paymentStatus: string
  subtotal: number
  totalTax: number
  totalStoreDiscount: number
  totalSipstrDiscount: number
  totalDeliveryFee: number
  serviceFee: number
  tip: number
  totalCheckoutBagFee: number
  totalBottleDepositFee: number
  originalTotal: number
  adjustedTotal: number
  differenceTotal: number
  itemOrderedCount: number
  refundAmount: number
  totalQuantity: number
  specialInstructions: string
  estimatedDeliveryTime: string
  actualDeliveryTime?: string
  isScheduled: boolean
  stores: StoreItemDTO[]
  items?: OrderItem[]
}

export interface PackageUnit {
  packageId: number;
  packageName: string;
  description?: string;
  packageType: "CAN" | "GLASS_BOTTLE" | "KEG" | "PLASTIC_BOTTLE" | "TETRA_PAK" | "OTHER";
}

export interface StoreReportItemDTO {
  storeName: string;
  orderUuid: string;
  subtotal: string; // backend BigDecimal -> string in JSON
  deliveryFee: string;
  checkoutBagFee: string;
  bottleDepositFee: string;
  tax: string;
  tip: string;
  storeTotal: string;
  refundedAmount: string;
  paymentGatewayFee: string;
  withheldTax: string;
  targetedPromotion: string;
  netTotal: string;
  storeStatus: string; // OrderStatusEnum as string
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // current page (0-indexed)
  size: number;
}

export interface OfferDetailResponse {
  offerId: number;
  storeId: number;
  couponId: number;
  couponCode: string;
  users: Array<{
    id: number;
    uuid: string;
    fullName?: string;
    mobileNumber?: string;
    email?: string;
    usedAt?: string[]; // list of timestamps
  }>;
}

export interface OfferDetailRequest {
  offerId?: number | null;
  storeId?: number | null;
  name: string;
  type?:"FLAT" | "PERCENTAGE"
  method: "COUPON" | "VOUCHER" | string;
  startDateTime?: string;
  endDateTime?: string;
  discount?: number;
  allowedMaxDiscount?: number;
  minSpendAmount?: number;
  maxTotalUsage?: number;
  requiredVoucherCount?: number;
  description?: string;
  couponDetail?: CouponDetailDTO | null;
}

export interface CouponDetailDTO {
  id: number;
  offerId: number;
  code: string;
  websiteDisplayMessage: string;
  maxUsagePerUser: number;
  totalUsabilityCount: number;
  usabilityOption: "MONTH" | "QUARTER" | "HALF_YEAR" | "YEAR";
}
export interface OfferListItem {
  offerId: number;
  storeId?: number | null;
  name: string;
  type?: string;
  method?: string;
  startDateTime?: string;
  endDateTime?: string;
  discount?: number;
  allowedMaxDiscount?: number;
  minSpendAmount?: number;
  maxTotalUsage?: number;
  requiredVoucherCount?: number;
  description?: string;
  isActive?: boolean;
  status?: string;
  coupons?: CouponDetailDTO | null;
}
