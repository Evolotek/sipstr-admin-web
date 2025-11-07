// components/OrdersModule.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiService } from "@/services/apiService";
import type { RecentOrder, Order } from "@/services/types";

/* -------------------- Helpers -------------------- */
const fmt = (n?: number) => (n ?? 0).toFixed(2);
type RefundType = "full" | "partial";

/* -------------------- Small UI primitives (modals/toasts) -------------------- */
const ConfirmModal = ({ open, title, message, onCancel, onConfirm }: {
  open: boolean; title?: string; message: string; onCancel: () => void; onConfirm: () => void;
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-5 rounded-xl shadow-2xl w-[520px] max-w-full">
        {title && <h3 className="text-lg font-bold mb-2">{title}</h3>}
        <p className="text-sm text-gray-700 mb-4">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">Confirm</button>
        </div>
      </div>
    </div>
  );
};

const AlertToast = ({ open, message, type = "info", onClose }: {
  open: boolean; message: string; type?: "info" | "success" | "error"; onClose: () => void;
}) => {
  if (!open) return null;
  const bg = type === "success" ? "bg-green-50 border-green-200 text-green-800" : type === "error" ? "bg-red-50 border-red-200 text-red-800" : "bg-gray-50 border-gray-200 text-gray-800";
  return (
    <div className="fixed top-4 right-4 z-50 pointer-events-none">
      <div className={`pointer-events-auto ${bg} border p-3 rounded-lg shadow`}>
        <div className="flex items-start justify-between gap-4">
          <div className="text-sm">{message}</div>
          <button onClick={onClose} className="text-sm text-gray-600 hover:text-gray-900">✕</button>
        </div>
      </div>
    </div>
  );
};

/* -------------------- OrderDetailsDialog -------------------- */
const OrderDetailsDialog = ({ order }: { order: Order }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <h3 className="text-xl font-bold mb-4">
        Order Details: <span className="text-gray-500 font-mono text-sm">{order.orderShortId ?? order.orderUuid}</span>
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm border-t pt-4">
        <div>
          <p className="mb-2"><strong>Customer:</strong> {order.userName}</p>
          <p className="mb-2"><strong>Address:</strong> <span className="text-gray-600">{order.address ?? "—"}</span></p>
          <p className="mb-2"><strong>Order Status:</strong> <span className="text-gray-600">{order.orderStatus}</span></p>
          <p className="mb-2"><strong>Items:</strong> <span className="text-gray-600">{order.itemOrderedCount ?? (order.items?.length ?? 0)}</span></p>
        </div>

        <div>
          <p className="mb-2"><strong>Delivery ETA:</strong> <span className="text-gray-600">{order.estimatedDeliveryTime ?? "—"}</span></p>
          <p className="mb-2"><strong>Refund Status:</strong> <span className="text-gray-600">{order.refundStatus ?? "—"}</span></p>
        </div>
      </div>

      <hr className="my-4" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <h4 className="font-semibold mb-2">Totals</h4>
          <div className="text-sm text-gray-700">
            <div className="flex justify-between py-1"><span>Subtotal</span><span className="font-medium">${fmt(order.subtotal)}</span></div>
            <div className="flex justify-between py-1"><span>Total Tax</span><span className="font-medium">${fmt(order.totalTax)}</span></div>
            <div className="flex justify-between py-1"><span>Delivery Fee</span><span className="font-medium">${fmt(order.totalDeliveryFee)}</span></div>
            <div className="flex justify-between py-1"><span>Bag Fee</span><span className="font-medium">${fmt(order.totalCheckoutBagFee)}</span></div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Fees & Extras</h4>
          <div className="text-sm text-gray-700">
            <div className="flex justify-between py-1"><span>Bottle Deposit Fee</span><span className="font-medium">${fmt(order.totalBottleDepositFee)}</span></div>
            <div className="flex justify-between py-1"><span>Service Fee</span><span className="font-medium">${fmt(order.serviceFee)}</span></div>
            <div className="flex justify-between py-1"><span>Tip</span><span className="font-medium">${fmt(order.tip)}</span></div>
            <div className="flex justify-between py-1"><span>Refunded</span><span className="font-medium text-red-600">-${fmt(order.refundAmount)}</span></div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Summary & Discounts</h4>
          <div className="text-sm text-gray-700">
            <div className="flex justify-between py-1"><span>Store Discount</span><span className="font-medium">-${fmt(order.totalStoreDiscount)}</span></div>
            <div className="flex justify-between py-1"><span>Platform Discount</span><span className="font-medium">-${fmt(order.totalSipstrDiscount)}</span></div>
            <div className="flex justify-between py-1"><span>Original Total</span><span className="font-medium">${fmt(order.originalTotal)}</span></div>
            <div className="flex justify-between py-1"><span>Adjusted Total</span><span className="font-medium">${fmt(order.adjustedTotal)}</span></div>
            <div className="flex justify-between py-1"><span>Difference</span><span className="font-medium">${fmt(order.differenceTotal)}</span></div>
          </div>
        </div>
      </div>

      {order.stores?.length ? (
        <div className="space-y-3 mt-4">
          <h4 className="font-semibold">Store breakdown</h4>
          <div className="max-h-44 overflow-y-auto border p-3 rounded bg-gray-50 text-sm">
            {order.stores.map((s, idx) => (
              <div key={s.storeUuid ?? idx} className="mb-3">
                <div className="flex justify-between font-medium"><span>{s.storeName}</span><span>${fmt((s as any).originalStoreTotal ?? (s as any).storeTotal ?? 0)}</span></div>
                <div className="text-xs text-gray-600">{s.storeAddress ?? ""}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

/* -------------------- OrderPreviewList -------------------- */
interface OrderPreviewListProps {
  orders: RecentOrder[];
  loading: boolean;
  onViewOrder: (shortId: string) => void;
}

const OrderPreviewList: React.FC<OrderPreviewListProps> = ({ orders, loading, onViewOrder }) => {
  if (loading) return <div className="text-center p-8 text-lg text-gray-600">Loading recent orders...</div>;
  if (!orders || orders.length === 0) return <div className="text-center p-8 text-lg text-gray-600">No recent orders found.</div>;

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <h3 className="text-xl font-bold p-5 border-b text-gray-800">Recent Orders (Last 45)</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ETA</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map(o => (
              <tr key={o.orderShortId} className="hover:bg-orange-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{o.orderShortId}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{o.customerName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">{o.address ?? "—"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">${(o.storeTotal ?? 0).toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{o.deliveryTime ? new Date(o.deliveryTime).toLocaleString() : (o.updatedAt ? new Date(o.updatedAt).toLocaleString() : '—')}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${String(o.orderStatus ?? "").toUpperCase().includes('REFUND') ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                    {o.orderStatus}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => onViewOrder(o.orderShortId)} className="text-orange-600 hover:text-orange-900">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* -------------------- FullRefundDetail -------------------- */
const FullRefundDetail = ({ order, onBack, onProcessRefund }: {
  order: Order; onBack: () => void; onProcessRefund: (orderId: string) => Promise<void>;
}) => {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleConfirm = async () => {
    setShowConfirm(false);
    setLoading(true);
    try { await onProcessRefund(order.orderShortId ?? order.orderUuid); } finally { setLoading(false); }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-4xl mx-auto my-8">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h3 className="text-2xl font-bold text-red-600">Full Refund Confirmation</h3>
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700">&larr; Back to List</button>
      </div>

      <OrderDetailsDialog order={order} />

      <div className="mt-8 pt-4 border-t flex justify-end">
        <button onClick={() => setShowConfirm(true)} disabled={loading} className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 disabled:opacity-50 transition">
          {loading ? "Processing..." : `Process Full Refund ($${fmt(order.originalTotal)})`}
        </button>
      </div>

      <ConfirmModal open={showConfirm} title="Confirm Full Refund"
        message={`Are you absolutely sure you want to process a FULL refund of $${fmt(order.originalTotal)} for order ${order.orderShortId ?? order.orderUuid.slice(0, 8)}? This action cannot be undone.`}
        onCancel={() => setShowConfirm(false)} onConfirm={handleConfirm} />
    </div>
  );
};

/* -------------------- PartialRefundDetail -------------------- */
type RefundItem = { id: number; name: string; price?: number; finalPrice?: number };

const PartialRefundDetail = ({ order, onBack, onProcessRefund }: {
  order: Order; onBack: () => void; onProcessRefund: (orderId: string, itemIds: number[], deliveryFee: boolean, tip: boolean) => Promise<void>;
}) => {
  const allItems: RefundItem[] = useMemo(() =>
    (order.stores ?? []).flatMap(store => (store.items ?? []).map(i => ({ id: i.itemId, name: i.itemName, price: i.price, finalPrice: i.finalPrice })))
  , [order]);

  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [refundDeliveryFee, setRefundDeliveryFee] = useState(false);
  const [refundTip, setRefundTip] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const toggleItem = (id: number) => setSelectedItemIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const totalItemRefund = useMemo(() => allItems.filter(item => selectedItemIds.includes(item.id)).reduce((sum, item) => sum + (item.finalPrice ?? 0), 0), [selectedItemIds, allItems]);

  const totalRefundAmount = useMemo(() => {
  let total = totalItemRefund ?? 0; // subtotal + tax + bottle deposit already included in totalItemRefund

  if (refundDeliveryFee) total += (order.totalDeliveryFee ?? 0);
  if (refundTip) total += (order.tip ?? 0);

  // Add checkout bag fee if backend includes it in refunds
  if (order.totalCheckoutBagFee) total += order.totalCheckoutBagFee;

  return total;
}, [totalItemRefund, refundDeliveryFee, refundTip, order.totalDeliveryFee, order.tip, order.totalCheckoutBagFee]);


  const handleProcessPartialRefund = async () => {
    if (totalRefundAmount === 0) { alert("Select items, delivery fee, or tip to refund."); return; }
    setShowConfirm(false);
    setLoading(true);
    try { await onProcessRefund(order.orderShortId ?? order.orderUuid, selectedItemIds, refundDeliveryFee, refundTip); } finally { setLoading(false); }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-5xl mx-auto my-8">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h3 className="text-2xl font-bold text-yellow-600">Partial Refund Configuration</h3>
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700">&larr; Back to List</button>
      </div>

      <OrderDetailsDialog order={order} />

      <div className="mt-8 border-t pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h4 className="text-lg font-semibold mb-3">Select Items to Refund</h4>
          <div className="max-h-64 overflow-y-auto border p-3 rounded-lg bg-gray-50">
            {allItems.length > 0 ? allItems.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-2 py-1 border-b last:border-b-0">
                <label className="text-sm cursor-pointer flex-grow">{item.name}</label>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">${fmt(item.finalPrice)}</span>
                  <input type="checkbox" checked={selectedItemIds.includes(item.id)} onChange={() => toggleItem(item.id)} className="w-4 h-4 text-yellow-600 border-gray-300 rounded" />
                </div>
              </div>
            )) : <p className="text-sm text-gray-500">No refundable items in this order.</p>}
          </div>

          <h4 className="text-lg font-semibold mt-6 mb-3">Select Fees to Refund</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 border rounded-lg">
              <label className="text-sm font-medium">Delivery Fee (${fmt(order.totalDeliveryFee)})</label>
              <input type="checkbox" checked={refundDeliveryFee} onChange={() => setRefundDeliveryFee(p => !p)} className="w-4 h-4 text-yellow-600 border-gray-300 rounded" />
            </div>
            <div className="flex items-center justify-between p-2 border rounded-lg">
              <label className="text-sm font-medium">Tip (${fmt(order.tip)})</label>
              <input type="checkbox" checked={refundTip} onChange={() => setRefundTip(p => !p)} className="w-4 h-4 text-yellow-600 border-gray-300 rounded" />
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 p-5 rounded-xl shadow-inner h-fit">
          <h4 className="text-lg font-bold mb-3 text-yellow-700">Refund Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Original Total:</span><span className="font-semibold">${fmt(order.originalTotal)}</span></div>
            <div className="flex justify-between"><span>Refunded Previously:</span><span className="font-semibold text-red-600">-${fmt(order.refundAmount)}</span></div>
            <hr className="my-2"/>
            <div className="flex justify-between text-base font-semibold"><span>Items Selected:</span><span className="text-yellow-700">${fmt(totalItemRefund)}</span></div>
            <div className="flex justify-between"><span>Delivery Fee Refund:</span><span className="text-yellow-700">${refundDeliveryFee ? fmt(order.totalDeliveryFee) : "0.00"}</span></div>
            <div className="flex justify-between"><span>Tip Refund:</span><span className="text-yellow-700">${refundTip ? fmt(order.tip) : "0.00"}</span></div>
            <hr className="my-3 border-yellow-300"/>
            <div className="flex justify-between text-xl font-extrabold text-red-600"><span>Total New Refund:</span><span>-${fmt(totalRefundAmount)}</span></div>
            <div className="flex justify-between text-sm mt-3"><span>Remaining Total:</span><span className="font-bold text-green-600">${fmt(order.originalTotal - (order.refundAmount ?? 0) - totalRefundAmount)}</span></div>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-4 border-t flex justify-end">
        <button onClick={() => setShowConfirm(true)} disabled={loading || totalRefundAmount === 0} className="px-6 py-3 bg-yellow-600 text-white font-semibold rounded-lg shadow-md hover:bg-yellow-700 disabled:opacity-50 transition">
          {loading ? "Processing..." : `Process Partial Refund ($${fmt(totalRefundAmount)})`}
        </button>
      </div>

      <ConfirmModal open={showConfirm} title="Confirm Partial Refund" message={`Are you sure you want to process a PARTIAL refund of $${fmt(totalRefundAmount)} for order ${order.orderShortId ?? order.orderUuid.slice(0,8)}?`} onCancel={() => setShowConfirm(false)} onConfirm={handleProcessPartialRefund} />
    </div>
  );
};

/* -------------------- OrdersModule -------------------- */
function useDebounce<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function OrdersModule() {
  const [view, setView] = useState<'landing' | 'list' | 'full_detail' | 'partial_detail'>('landing');
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [pendingRefundType, setPendingRefundType] = useState<RefundType | null>(null);

  const [storeQuery, setStoreQuery] = useState("");
  const debouncedQuery = useDebounce(storeQuery, 300);
  const [storeSuggestions, setStoreSuggestions] = useState<any[]>([]);
  const [storeLoading, setStoreLoading] = useState(false);
  const [selectedStore, setSelectedStore] = useState<{ uuid: string; storeName: string; storeAddress?: string } | null>(null);
  const suggestionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!suggestionRef.current) return;
      if (!suggestionRef.current.contains(e.target as Node)) setStoreSuggestions([]);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const storesCacheRef = useRef<any[] | null>(null);
  const fetchStoresIfNeeded = useCallback(async () => {
    if (storesCacheRef.current) return storesCacheRef.current;
    try {
      setStoreLoading(true);
      const stores = await apiService.getStores();
      const mapped = (stores || []).map((s: any) => ({
        uuid: s.uuid ?? s.storeUuid ?? s.id,
        storeName: s.storeName ?? s.name ?? "Unknown Store",
        storeAddress: s.storeAddress ?? s.address ?? ""
      }));
      storesCacheRef.current = mapped;
      return mapped;
    } finally { setStoreLoading(false); }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!debouncedQuery || debouncedQuery.trim().length === 0) {
        setStoreSuggestions([]);
        return;
      }
      const list = await fetchStoresIfNeeded();
      if (!mounted) return;
      const q = debouncedQuery.toLowerCase().trim();
      const matches = list.filter(s => s.storeName.toLowerCase().includes(q) || (s.storeAddress || "").toLowerCase().includes(q));
      setStoreSuggestions(matches.slice(0, 10));
    })();
    return () => { mounted = false; };
  }, [debouncedQuery, fetchStoresIfNeeded]);

const fetchRecentOrders = useCallback(async (type: RefundType, limit = 45) => {
  setLoading(true); setAlert(null); setPendingRefundType(type); setView('list');
  try {
    const previews = await apiService.getRecentOrders(limit); // <- call new endpoint
    setOrders(previews ?? []);
  } catch (err) {
    setAlert({ message: `Failed to load recent orders: ${(err as any).responseBody?.message || (err as Error).message}`, type: 'error' });
    setOrders([]);
  } finally { setLoading(false); }
}, []);


  const handleViewOrder = useCallback(async (orderShortId: string) => {
    setLoading(true); setAlert(null);
    try {
      const full = await apiService.getTrackedOrder(orderShortId);
      setSelectedOrder(full);
      setView(pendingRefundType === 'full' ? 'full_detail' : 'partial_detail');
    } catch (err) {
      setAlert({ message: `Failed to load order details: ${(err as any).responseBody?.message || (err as Error).message}`, type: 'error' });
    } finally { setLoading(false); }
  }, [pendingRefundType]);

  const handleBackToLanding = () => {
    setOrders([]); setSelectedOrder(null); setPendingRefundType(null); setView('landing'); setAlert(null);
  };

  const handleProcessFullRefund = useCallback(async (orderId: string) => {
    try {
      await apiService.refundOrderFull(orderId);
      setAlert({ message: `Full refund successfully processed for order ${orderId.slice(0, 8)}.`, type: 'success' });
      setSelectedOrder(null);
      await fetchRecentOrders('full', 45);
    } catch (err) {
      setAlert({ message: `Full refund failed: ${(err as any).responseBody?.message || (err as Error).message}`, type: 'error' });
      setView('list');
    }
  }, [fetchRecentOrders, selectedStore?.uuid]);

  const handleProcessPartialRefund = useCallback(async (orderId: string, itemIds: number[], deliveryFee: boolean, tip: boolean) => {
    try {
      await apiService.refundOrderPartial(orderId, itemIds, deliveryFee, tip);
      setAlert({ message: `Partial refund successfully processed for order ${orderId.slice(0, 8)}.`, type: 'success' });
      setSelectedOrder(null);
      await fetchRecentOrders('partial', 45);
    } catch (err) {
      setAlert({ message: `Partial refund failed: ${(err as any).responseBody?.message || (err as Error).message}`, type: 'error' });
      setView('list');
    }
  }, [fetchRecentOrders, selectedStore?.uuid]);

  // RENDER
  if (view === 'landing') {
    return (
      <div className="p-8 md:p-12 min-h-screen bg-gray-50 flex flex-col items-center">
        <h2 className="text-4xl font-extrabold text-gray-800 mb-4">💰 Refund Management</h2>
        <p className="text-lg text-gray-600 mb-6 text-center max-w-lg">Select the store to manage refunds for, then choose whether to process a full or partial refund.</p>

        <div className="w-full max-w-2xl">
          {selectedStore ? (
            <div className="flex items-center justify-between bg-white border rounded-lg p-3 mb-4">
              <div>
                <div className="font-semibold">{selectedStore.storeName}</div>
                {selectedStore.storeAddress && <div className="text-sm text-gray-500">{selectedStore.storeAddress}</div>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setSelectedStore(null); setStoreQuery(""); }} className="text-sm text-gray-600 underline">Change</button>
              </div>
            </div>
          ) : (
            <div className="relative mb-4" ref={suggestionRef}>
              <input value={storeQuery} onChange={(e) => setStoreQuery(e.target.value)} placeholder="Search for store by name or address..." className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-200" />
              {storeLoading && <div className="absolute left-3 top-3 text-xs text-gray-500">loading...</div>}
              {storeSuggestions.length > 0 && (
                <div className="absolute z-40 mt-1 w-full bg-white border rounded-md shadow-lg max-h-56 overflow-auto">
                  {storeSuggestions.map(s => (
                    <div key={s.uuid} onClick={() => { setSelectedStore(s); setStoreQuery(""); setStoreSuggestions([]); }} className="px-4 py-3 hover:bg-gray-100 cursor-pointer">
                      <div className="font-medium">{s.storeName}</div>
                      {s.storeAddress && <div className="text-xs text-gray-500 mt-1">{s.storeAddress}</div>}
                    </div>
                  ))}
                </div>
              )}
              {debouncedQuery && !storeLoading && storeSuggestions.length === 0 && (
                <div className="absolute z-40 mt-1 w-full bg-white border rounded-md shadow-lg p-3 text-sm text-gray-600">
                  No stores match “{debouncedQuery}”
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <button 
  onClick={() => fetchRecentOrders('full', 45)} 
  className="px-6 py-3 w-full sm:w-1/2 bg-red-600 text-white font-bold rounded-xl shadow hover:bg-red-700 transition">
  Process Full Refund
</button>

<button 
  onClick={() => fetchRecentOrders('partial', 45)} 
  className="px-6 py-3 w-full sm:w-1/2 bg-yellow-600 text-white font-bold rounded-xl shadow hover:bg-yellow-700 transition">
  Process Partial Refund
</button>
          </div>

          <p className="text-sm text-gray-500 mt-3">Tip: start typing a store name and select it from the suggestions. The recent orders query will be filtered by that store.</p>

          {alert && <div className="mt-6"><div className={`border p-3 rounded ${alert.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>{alert.message}</div></div>}
        </div>
      </div>
    );
  }

  if (view === 'list') {
    return (
      <div className="p-4 md:p-6 min-h-screen bg-gray-50">
        <div className="flex justify-between items-center mb-6 border-b pb-2">
          <h2 className="text-3xl font-extrabold text-gray-800">
            Orders
            {selectedStore && <span className="ml-3 text-base text-gray-600"> · {selectedStore.storeName}</span>}
          </h2>
          <div>
            <button onClick={handleBackToLanding} className="text-sm text-gray-500 hover:text-gray-700 underline">&larr; Change Store / Refund Type</button>
          </div>
        </div>

        {alert && <div className="mb-4"><div className={`border p-3 rounded ${alert.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>{alert.message}</div></div>}

        <OrderPreviewList orders={orders} loading={loading} onViewOrder={handleViewOrder} />
      </div>
    );
  }

  if (view === 'full_detail' && selectedOrder) {
    return <FullRefundDetail order={selectedOrder} onBack={() => setView('list')} onProcessRefund={handleProcessFullRefund} />;
  }

  if (view === 'partial_detail' && selectedOrder) {
    return <PartialRefundDetail order={selectedOrder} onBack={() => setView('list')} onProcessRefund={handleProcessPartialRefund} />;
  }

  return null;
}
