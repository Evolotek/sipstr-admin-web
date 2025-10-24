// src/services/types.ts
export interface LoginResponse {
  token: string;
  id: string;
  email: string;
  role: string;
}

export interface User {
  uuid?: string;
  id?: string;
  name: string;
  email: string;
  role: string;
}

export interface UserCreationData {
  name: string;
  email: string;
  password?: string;
  mobileNumber?: string;
  roleName: 'ADMIN' | 'SUPER_ADMIN' | 'STORE_OWNER' | 'USER';
}

export interface Order {
  id: string;
  shortID?: string;
  customer: string;
  amount: number;
  status: string;
  date: string;
}

export interface Product {
  id: string;
  uuid?: string;
  name: string;
  price: number;
  category: string;
  brand: string;
}

export interface Brand {
  id: string;
  name: string;
  description: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
}

export interface Store {
  id: string;
  name: string;
  location: string;
  phone: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
}

export interface TopPick {
  id: string;
  productId: string;
  productUuid?: string;
  productName: string;
  rank: number;
}

export interface Report {
  store: string;
  orders: number;
  revenue: number;
  date: string;
}

export interface DeliveryZone {
  zoneId: number; // use camelCase, matches backend
  zoneName: string;
  baseDeliveryFee: number;
  perMileFee: number;
  minOrderAmount: number;
  estimatedPreparationTime: number | null;
  isRestricted: boolean;
  coordinates: [number, number][];
  storeUuid: string;
  createdAt?: string;
  updatedAt?: string;
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
  storeUuid: string;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeEmail?: string;
}

export type OrderStatus =
  | "CREATED" | "PAYMENT_PENDING" | "ACCEPTED_BY_STORE" | "PARTIALLY_ACCEPTED_BY_STORE"
  | "SCHEDULED" | "READY_TO_PICKUP" | "CANCELLED_BY_CUSTOMER" | "OUT_FOR_DELIVERY"
  | "PARTIAL_DELIVERED" | "CANCELLED_BY_STORE" | "PARTIALLY_CANCELLED" | "DAMAGED"
  | "DELIVERED" | "REFUNDED" | "PARTIALLY_REFUNDED";

export type PaymentStatus =
  | "PAYMENT_INITIATED" | "PAYMENT_PENDING" | "PAYMENT_PROCESSING" | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED" | "REFUND_INITIATED"
  | "PARTIALLY_REFUND_INITIATED" | "STRIPE_ACCOUNT_NOT_CONNECTED" | "PAYMENT_ENQUEUED";

export interface OrderResponseDTO {
  orderUuid: string;
  userUuid: string;
  userName: string;
  userEmail: string;
  address: string;
  mobileNumber: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
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
