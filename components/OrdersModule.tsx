"use client"

import React, { useState, useCallback } from "react"

// ------------------- API Service -------------------

const API_BASE_URL = "http://localhost:8080"

const getToken = (): string | null =>
  typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
const clearToken = (): void => { if (typeof window !== "undefined") localStorage.removeItem("auth_token") }

interface ApiError extends Error { responseBody?: any; status?: number }

async function apiCall<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
  const headers: HeadersInit = { "Content-Type": "application/json" }
  const token = getToken()
  if (token) headers["Authorization"] = `Bearer ${token}`

  const options: RequestInit = { method, headers }
  if (body) options.body = JSON.stringify(body)

  let response: Response
  try { response = await fetch(`${API_BASE_URL}${endpoint}`, options) }
  catch (err) { const e = new Error(`Network Error: Could not connect to API`) as any; e.status = 0; throw e }

  if (!response.ok) {
    if (response.status === 401) clearToken()
    let errorBody: any = {}
    try { errorBody = await response.json() } catch { errorBody.message = await response.text() }
    const e = new Error(errorBody.message || `API Error: ${response.status}`) as any
    e.responseBody = errorBody
    e.status = response.status
    throw e
  }

  if (response.status === 204 || response.headers.get("Content-Length") === "0") return {} as T
  return response.json()
}

// ------------------- Types -------------------

interface StoreItemDTO {
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

interface OrderItem {
  id: number
  name: string
  price: number
}

interface Order {
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
  totalQuantity: number
  specialInstructions: string
  estimatedDeliveryTime: string
  actualDeliveryTime?: string
  isScheduled: boolean
  stores: StoreItemDTO[]
  items?: OrderItem[]
}

// ------------------- API Service -------------------

const apiService = {
  trackOrder: (shortID: string): Promise<Order> =>
    apiCall<Order>("GET", `/orders/track?orderShortId=${shortID}`),
  refundOrderFull: (id: string) =>
    apiCall<void>("POST", "/orders/refund", { orderShortId: id }),
  refundOrderPartial: (id: string, itemIds: number[]) =>
    apiCall<void>("POST", "/orders/refund/partial", { orderShortId: id, itemIds }),
}

// ------------------- Partial Refund Dialog -------------------

interface PartialRefundDialogProps {
  order: Order
  onClose: () => void
  onRefund: (itemIds: number[]) => void
}

const PartialRefundDialog = ({ order, onClose, onRefund }: PartialRefundDialogProps) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const toggleItem = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const handleSubmit = () => {
    if (selectedIds.length === 0) { alert("Select at least one item."); return }
    const confirmRefund = confirm(`Are you sure you want to refund ${selectedIds.length} item(s)?`)
    if (confirmRefund) onRefund(selectedIds)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-96">
        <h3 className="text-lg font-bold mb-4">Partial Refund: Order {order.orderUuid.slice(0, 8)}</h3>
        <div className="max-h-64 overflow-y-auto mb-4">
          {order.items?.map(item => (
            <div key={item.id} className="flex items-center gap-2 mb-2">
              <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleItem(item.id)} />
              <span>{item.name} (${item.price.toFixed(2)})</span>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400">Cancel</button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">Refund Selected</button>
        </div>
      </div>
    </div>
  )
}

// ------------------- Order Details Dialog -------------------

interface OrderDetailsDialogProps {
  order: Order
  onClose: () => void
}

const OrderDetailsDialog = ({ order, onClose }: OrderDetailsDialogProps) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-96 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">Order Details: {order.orderUuid}</h3>

        <div className="mb-4">
          <p><span className="font-semibold">Customer:</span> {order.userName}</p>
          <p><span className="font-semibold">Email:</span> {order.userEmail}</p>
          <p><span className="font-semibold">Phone:</span> {order.mobileNumber}</p>
          <p><span className="font-semibold">Address:</span> {order.address}</p>
        </div>

        {order.stores.map(store => (
          <div key={store.storeUuid} className="mb-4 border-t pt-2">
            <h4 className="font-semibold text-orange-600">{store.storeName}</h4>
            {store.items && store.items.length > 0 && (
              <ul className="ml-4 list-disc mt-1">
                {store.items.map(item => (
                  <li key={item.itemId}>{item.itemName} x {item.quantity} — ${item.finalPrice.toFixed(2)}</li>
                ))}
              </ul>
            )}
            <p className="mt-1 text-sm text-gray-600">Delivery Fee: ${store.storeDeliveryFee?.toFixed(2) ?? 0}</p>
          </div>
        ))}

        <div className="border-t pt-2 mt-2">
          <p><span className="font-semibold">Subtotal:</span> ${order.subtotal.toFixed(2)}</p>
          <p><span className="font-semibold">Total Tax:</span> ${order.totalTax.toFixed(2)}</p>
          <p><span className="font-semibold">Delivery Fee:</span> ${order.totalDeliveryFee.toFixed(2)}</p>
          <p><span className="font-semibold">Service Fee:</span> ${order.serviceFee.toFixed(2)}</p>
          <p><span className="font-semibold">Tip:</span> ${order.tip.toFixed(2)}</p>
          <p className="font-bold mt-1"><span className="font-semibold">Total Amount:</span> ${order.originalTotal.toFixed(2)}</p>
        </div>

        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400">Close</button>
        </div>
      </div>
    </div>
  )
}

// ------------------- CrudTable -------------------

const CrudTable = ({ columns, data, loading, emptyMessage }: { columns: string[], data: any[], loading: boolean, emptyMessage: string }) => (
  <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
    <h4 className="text-xl font-bold mb-4 text-gray-800">Search Results</h4>
    {loading && <div className="text-center p-8 text-orange-500">Loading...</div>}
    {!loading && data.length === 0 && <p className="text-center p-8 text-gray-500 bg-gray-50 rounded-lg">{emptyMessage}</p>}
    {!loading && data.length > 0 && (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>{columns.map((col, i) => <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{col}</th>)}</tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, rowIndex) => (
              <tr key={row.id}>
                {row.cells.map((cell: React.ReactNode, cellIndex: number) => (
                  <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cell}</td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {row.actions?.map((action: { label: string, onClick: () => void }, actionIndex: number) => (
                    <button key={actionIndex} onClick={action.onClick} className="text-orange-600 hover:text-orange-900 ml-3">{action.label}</button>
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

// ------------------- OrdersModule -------------------

export function OrdersModule() {
  const [orders, setOrders] = useState<Order[]>([])
  const [searchId, setSearchId] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPartialDialog, setShowPartialDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState<Order | null>(null)

  const fetchOrderById = useCallback(async (idToSearch: string) => {
    if (!idToSearch.trim()) { setError("Enter an Order Short ID."); setOrders([]); setSelectedOrder(null); return }
    setLoading(true); setError(null); setSelectedOrder(null)
    try {
      const data = await apiService.trackOrder(idToSearch)
      setOrders([data])
      setSelectedOrder(data)
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.responseBody?.message || apiErr.message || `Failed to find order: ${idToSearch}`)
      setOrders([]); setSelectedOrder(null)
    } finally { setLoading(false) }
  }, [])

  const handleRefundClick = (order: Order, type: "full" | "partial") => {
    if (type === "full") handleRefund(order.orderUuid, "full")
    else setShowPartialDialog(true)
  }

  const handleRefund = async (orderId: string, type: "full" | "partial", itemIds?: number[]) => {
    setLoading(true); setError(null)
    try {
      if (type === "full") {
        await apiService.refundOrderFull(orderId)
        alert(`Full refund successfully processed for order ${orderId}.`)
      } else if (itemIds) {
        await apiService.refundOrderPartial(orderId, itemIds)
        alert(`Partial refund successfully processed for order ${orderId}.`)
      }
      if (selectedOrder) fetchOrderById(selectedOrder.orderUuid)
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.responseBody?.message || apiErr.message || `Failed to process ${type} refund.`)
    } finally { setLoading(false); setShowPartialDialog(false) }
  }

  const partialRefundItems = selectedOrder
    ? selectedOrder.stores.flatMap(store =>
        store.items?.map(i => ({
          id: i.itemId,
          name: i.itemName,
          price: i.finalPrice
        })) || []
      )
    : []

  return (
    <div className="p-4 md:p-6 min-h-screen bg-gray-50">
      <h2 className="text-3xl font-extrabold text-gray-800 mb-8 border-b pb-2">Order Management & Refunds</h2>

      {/* Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-8 p-5 bg-white rounded-xl shadow-lg border border-orange-100">
        <input type="text" placeholder="Enter Order Short ID" value={searchId} onChange={(e) => setSearchId(e.target.value)} onKeyDown={e => e.key === "Enter" && fetchOrderById(searchId)} className="flex-grow p-3 border border-gray-300 rounded-lg" />
        <button onClick={() => fetchOrderById(searchId)} disabled={loading || !searchId.trim()} className="sm:w-40 w-full px-6 py-3 bg-orange-600 text-white rounded-lg">{loading ? "Searching..." : "Search Order"}</button>
      </div>

      {error && <div className={`p-4 mb-6 text-sm rounded-lg border shadow-sm ${error.includes('successfully') ? 'text-green-700 bg-green-100 border-green-300' : 'text-red-700 bg-red-100 border-red-300'}`} role="alert">{error}</div>}

      {selectedOrder && (
        <div className="bg-white p-6 rounded-xl shadow-2xl mb-8 border border-gray-200">
          <div className="flex justify-between items-start mb-4 border-b pb-4">
            <h3 className="text-xl font-bold text-gray-800">Found Order: <span className="text-orange-600">{selectedOrder.orderUuid}</span></h3>
            <button onClick={() => setSelectedOrder(null)} className="text-gray-500 hover:text-gray-700">✖</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6 mb-6">
            <div className="flex flex-col"><span className="text-xs text-gray-500 uppercase">Customer</span><span className="font-semibold">{selectedOrder.userName}</span></div>
            <div className="flex flex-col"><span className="text-xs text-gray-500 uppercase">Amount</span><span className="text-green-600 font-semibold">${selectedOrder.originalTotal.toFixed(2)}</span></div>
            <div className="flex flex-col"><span className="text-xs text-gray-500 uppercase">Order Status</span><span className={`font-bold uppercase ${selectedOrder.orderStatus.includes('REFUND') || selectedOrder.orderStatus === 'CANCELLED_BY_CUSTOMER' ? 'text-red-500' : 'text-blue-500'}`}>{selectedOrder.orderStatus}</span></div>
            <div className="flex flex-col"><span className="text-xs text-gray-500 uppercase">Payment Status</span><span className="font-semibold">{selectedOrder.paymentStatus}</span></div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center pt-4 border-t">
            <span className="text-sm font-semibold text-gray-600">Actions:</span>
            <div className="flex gap-3">
              <button onClick={() => handleRefundClick(selectedOrder, "full")} disabled={loading} className="px-4 py-2 bg-red-600 text-white rounded-lg">Full Refund</button>
              <button onClick={() => handleRefundClick(selectedOrder, "partial")} disabled={loading || partialRefundItems.length === 0} className="px-4 py-2 bg-yellow-600 text-white rounded-lg">Partial Refund</button>
              <button onClick={() => setShowDetailsDialog(selectedOrder)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">View Details</button>
            </div>
          </div>
        </div>
      )}

      <CrudTable
        columns={["Order ID", "Customer", "Amount", "Status", "Payment", "Actions"]}
        data={orders.map(o => ({
          id: o.orderUuid,
          cells: [o.orderUuid, o.userName, `$${o.subtotal.toFixed(2)}`, o.orderStatus, o.paymentStatus],
          actions: [
            { label: "View Details", onClick: () => setShowDetailsDialog(o) }
          ]
        }))}
        loading={loading}
        emptyMessage={'Use the search bar above to find an order.'}
      />

      {showPartialDialog && selectedOrder && (
        <PartialRefundDialog 
          order={{ ...selectedOrder, items: partialRefundItems }} 
          onClose={() => setShowPartialDialog(false)} 
          onRefund={(itemIds) => handleRefund(selectedOrder.orderUuid, "partial", itemIds)} 
        />
      )}

      {showDetailsDialog && showDetailsDialog && (
        <OrderDetailsDialog order={showDetailsDialog} onClose={() => setShowDetailsDialog(null)} />
      )}
    </div>
  )
}