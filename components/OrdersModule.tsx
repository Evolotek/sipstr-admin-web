"use client"

import React, { useState, useCallback } from "react"
import { apiService } from "@/services/apiService"
import { Order } from "@/services/types"

interface ApiError extends Error { responseBody?: any; status?: number }

// ------------------- Reusable Confirm Modal -------------------
const ConfirmModal = ({ open, title, message, onCancel, onConfirm }: {
  open: boolean
  title?: string
  message: string
  onCancel: () => void
  onConfirm: () => void
}) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-[460px] max-w-full">
        {title && <h3 className="text-lg font-bold mb-2">{title}</h3>}
        <p className="text-sm text-gray-700 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Confirm</button>
        </div>
      </div>
    </div>
  )
}

// ------------------- Reusable Alert Toast (centered) -------------------
const AlertToast = ({ open, message, type = "info", onClose }: {
  open: boolean
  message: string
  type?: "info" | "success" | "error"
  onClose: () => void
}) => {
  if (!open) return null
  const bg = type === "success" ? "bg-green-100 border-green-300 text-green-800"
            : type === "error" ? "bg-red-100 border-red-300 text-red-800"
            : "bg-gray-100 border-gray-300 text-gray-800"

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className={`pointer-events-auto ${bg} border p-4 rounded-lg shadow-lg max-w-xl w-[90%]`}>
        <div className="flex justify-between items-start gap-4">
          <div className="text-sm">{message}</div>
          <button onClick={onClose} className="ml-4 text-sm font-medium text-gray-600 hover:text-gray-900">✕</button>
        </div>
      </div>
    </div>
  )
}

// ------------------- Partial Refund Dialog -------------------

interface PartialRefundDialogProps {
  order: Order
  onClose: () => void
  // when user chooses items and clicks "Refund Selected" this callback sends the selected item ids to parent
  onRequestConfirm: (itemIds: number[]) => void
}

const PartialRefundDialog = ({ order, onClose, onRequestConfirm }: PartialRefundDialogProps) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const toggleItem = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const handleSubmit = () => {
    if (selectedIds.length === 0) { alert("Select at least one item."); return }
    // delegate confirmation to parent: parent will show ConfirmModal
    onRequestConfirm(selectedIds)
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
  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(order.orderUuid)
      // you can replace this with your AlertToast if you want a styled message
      alert("Order ID copied to clipboard")
    } catch {
      alert("Failed to copy")
    }
  }

  const fmt = (n?: number) => ((n ?? 0).toFixed(2))

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Order details for ${order.orderUuid}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* backdrop */}
      <div className="fixed inset-0 bg-black opacity-40" onClick={onClose} />

      {/* modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto z-10">
        {/* header */}
        <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-100 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Order Details</h3>
            <div className="text-xs text-gray-500">{order.orderUuid}</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyId}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700 hover:bg-gray-100"
              title="Copy Order ID"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M8 7h8v10H8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="4" y="4" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Copy ID</span>
            </button>

            <button
              onClick={onClose}
              aria-label="Close"
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* body */}
        <div className="px-6 py-6 space-y-6">
          {/* Customer info */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm text-gray-500 uppercase tracking-wide"><b>Customer</b></h4>
              <div className="mt-2 text-sm text-gray-800 font-medium">{order.userName}</div>
              <div className="text-sm text-gray-600 mt-1">{order.userEmail}</div>
              <div className="text-sm text-gray-600 mt-1">{order.mobileNumber}</div>
              <div className="text-sm text-gray-600 mt-1">{order.address}</div>
            </div>

            <div>
              <h4 className="text-sm text-gray-500 uppercase tracking-wide"><b>Status</b></h4>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${order.orderStatus.includes('REFUND') || order.orderStatus === 'CANCELLED_BY_CUSTOMER' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                  {order.orderStatus}
                </span>
              </div>

              <div className="mt-4">
                <h5 className="text-xs text-gray-500 uppercase tracking-wide"><b>Order Short ID</b></h5>
                <div className="mt-1 text-sm font-mono text-gray-700">{order.orderUuid}</div>
              </div>
            </div>
          </section>

          {/* Stores & items */}
          <section className="space-y-4">
            {order.stores.map((store) => (
              <div key={store.storeUuid} className="border rounded-xl p-4 bg-white shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-semibold text-orange-600">{store.storeName}</div>
                    {/* <div className="text-xs text-gray-500">{store.storeUuid}</div> */}
                  </div>
                </div>

                {/* items table */}
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b">
                        <th className="py-2 pr-4">Item</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Qty</th>
                        <th className="py-2 pr-4">Individual Price</th>
                                                
                        <th className="py-2 pr-4 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {store.items && store.items.length > 0 ? store.items.map(item => (
                        <tr key={item.itemId} className="border-b last:border-b-0">
                          <td className="py-3 pr-4">{item.itemName}</td>
                          <td className="py-3 pr-4">{item.status==='ORIGINAL_ITEM'?"ORIGINAL ITEM":"SUBSTITUTE ITEM"}</td>
                          <td className="py-3 pr-4">{item.quantity}</td>
                          <td className="py-3 pr-4">{item.price ?? "-"}</td>
                          <td className="py-3 pr-4 text-right font-medium">${fmt(item.finalPrice)}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={4} className="py-3 text-sm text-gray-500">No items for this store.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </section>

          {/* Totals */}
          <section className="border-t pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="text-sm text-gray-600">
                <div className="flex justify-between py-1"><span>Subtotal</span><span className="font-medium">${fmt(order.subtotal)}</span></div>
                <div className="flex justify-between py-1"><span>Total Tax</span><span className="font-medium">${fmt(order.totalTax)}</span></div>
                <div className="flex justify-between py-1"><span>Delivery Fee</span><span className="font-medium">${fmt(order.totalDeliveryFee)}</span></div>
                <div className="flex justify-between py-1"><span>Bag Fee</span><span className="font-medium">${fmt(order.totalCheckoutBagFee)}</span></div>
              </div>

              <div className="text-sm text-gray-600">
                <div className="flex justify-between py-1"><span>Bottle Deposit Fee</span><span className="font-medium">${fmt(order.totalBottleDepositFee)}</span></div>
                <div className="flex justify-between py-1"><span>Service Fee</span><span className="font-medium">${fmt(order.serviceFee)}</span></div>
                <div className="flex justify-between py-1"><span>Tip</span><span className="font-medium">${fmt(order.tip)}</span></div>
                <div className="flex justify-between py-1"><span>Refunded</span><span className="font-medium text-red-600">${fmt(order.refundAmount)}</span></div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-4">
              <div className="text-sm text-gray-500">Original Total</div>
              <div className="text-2xl font-bold text-gray-900">${fmt(order.originalTotal)}</div>
            </div>
          </section>

          {/* footer actions */}
          <div className="pt-4 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ------------------- OrdersModule -------------------

export function OrdersModule() {
  const [orders, setOrders] = useState<Order[]>([])
  const [searchId, setSearchId] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPartialDialog, setShowPartialDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState<Order | null>(null)

  // confirm modal state
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState("")
  const confirmCallbackRef = React.useRef<(() => void) | null>(null)

  // alert toast state
  const [alertOpen, setAlertOpen] = useState(false)
  const [alertMessage, setAlertMessage] = useState("")
  const [alertType, setAlertType] = useState<"info"|"success"|"error">("info")

  const openConfirm = (message: string, cb: () => void) => {
    confirmCallbackRef.current = cb
    setConfirmMessage(message)
    setConfirmOpen(true)
  }

  const handleConfirm = () => {
    setConfirmOpen(false)
    const cb = confirmCallbackRef.current
    confirmCallbackRef.current = null
    if (cb) cb()
  }

  const showAlert = (message: string, type: "info"|"success"|"error" = "info") => {
    setAlertMessage(message)
    setAlertType(type)
    setAlertOpen(true)
    // optional auto-close after 3.5s
    setTimeout(() => setAlertOpen(false), 3500)
  }

  const fetchOrderById = useCallback(async (idToSearch: string) => {
    if (!idToSearch.trim()) { setError("Enter an Order Short ID."); setOrders([]); setSelectedOrder(null); return }
    setLoading(true); setError(null); setSelectedOrder(null)
    try {
      const data = await apiService.getTrackedOrder(idToSearch)
      setOrders([data])
      setSelectedOrder(data)
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.responseBody?.message || apiErr.message || `Failed to find order: ${idToSearch}`)
      setOrders([]); setSelectedOrder(null)
    } finally { setLoading(false) }
  }, [])

  const handleRefundClick = (order: Order, type: "full" | "partial") => {
    if (type === "full") {
      openConfirm(`Are you sure you want to FULL refund order ${order.orderUuid}?`, () => handleRefund(order.orderUuid, "full"))
    } else {
      // open partial dialog; that dialog will call back into onRequestConfirm which will open ConfirmModal
      setShowPartialDialog(true)
    }
  }

  // parent-level partial-refund confirmation handler (called from PartialRefundDialog via onRequestConfirm)
  const handlePartialRequestConfirm = (itemIds: number[]) => {
    if (!selectedOrder) return
    openConfirm(`Are you sure you want to refund ${itemIds.length} item(s) from order ${selectedOrder.orderUuid}?`, () => handleRefund(selectedOrder.orderUuid, "partial", itemIds))
  }

  const handleRefund = async (orderId: string, type: "full" | "partial", itemIds?: number[]) => {
    setLoading(true); setError(null)
    try {
      if (type === "full") {
        await apiService.refundOrderFull(orderId)
        showAlert(`Full refund successfully processed for order ${orderId}.`, "success")
      } else if (itemIds) {
        await apiService.refundOrderPartial(orderId, itemIds)
        showAlert(`Partial refund successfully processed for order ${orderId}.`, "success")
      }
      if (selectedOrder) fetchOrderById(selectedOrder.orderUuid)
    } catch (err) {
      const apiErr = err as ApiError
      const message = apiErr.responseBody?.message || apiErr.message || `Failed to process ${type} refund.`
      setError(message)
      showAlert(message, "error")
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-y-4 gap-x-6 mb-6">
            <div className="flex flex-col"><span className="text-xs text-gray-500 uppercase">Customer</span><span className="font-semibold">{selectedOrder.userName}</span></div>
            <div className="flex flex-col"><span className="text-xs text-gray-500 uppercase">Amount</span><span className="text-green-600 font-semibold">${selectedOrder.originalTotal.toFixed(2)}</span></div>
            <div className="flex flex-col"><span className="text-xs text-gray-500 uppercase">Refund Amount</span><span className="text-green-600 font-semibold">${(selectedOrder.refundAmount ?? 0).toFixed(2)}</span></div>
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

      {showPartialDialog && selectedOrder && (
        <PartialRefundDialog
          order={{ ...selectedOrder, items: partialRefundItems }}
          onClose={() => setShowPartialDialog(false)}
          onRequestConfirm={(itemIds) => handlePartialRequestConfirm(itemIds)}
        />
      )}

      {showDetailsDialog && showDetailsDialog && (
        <OrderDetailsDialog order={showDetailsDialog} onClose={() => setShowDetailsDialog(null)} />
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        open={confirmOpen}
        title="Please confirm"
        message={confirmMessage}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
      />

      {/* Centered Alert */}
      <AlertToast open={alertOpen} message={alertMessage} type={alertType} onClose={() => setAlertOpen(false)} />
    </div>
  )
}
