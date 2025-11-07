// // src/components/RecentOrdersAndSubstitute.tsx
// "use client";

// import React, { useEffect, useMemo, useState } from "react";
// import { apiService } from "@/services/apiService";
// import type {
//   RecentOrder,
//   GroupedStoreInventoryResponseDTO,
//   StoreInventoryVariantDTO,
//   SubstitutionItemRequest,
//   SubstitutionRequest,
// } from "@/services/types";

// /**
//  * SubstituteModule (ready-to-paste)
//  * - fixes shared-input bug by using inventoryQtyMap per variant
//  * - shows cancellations separately (not as substitute rows with qty=0)
//  * - supports multi-store orders (columns per store)
//  */

// export function SubstituteModule() {
//   // recent orders
//   const [orders, setOrders] = useState<RecentOrder[]>([]);
//   const [loadingOrders, setLoadingOrders] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   // modal & context
//   const [modalOpen, setModalOpen] = useState(false);
//   const [resolvingStore, setResolvingStore] = useState(false);
//   const [activeOrderShortId, setActiveOrderShortId] = useState<string | null>(null);
//   const [orderFull, setOrderFull] = useState<any | null>(null);
//   const [loadingOrderFull, setLoadingOrderFull] = useState(false);

//   // inventory per-store
//   const [inventoryMap, setInventoryMap] = useState<Record<string, GroupedStoreInventoryResponseDTO[] | null>>({});
//   const [loadingInventoryMap, setLoadingInventoryMap] = useState<Record<string, boolean>>({});

//   // interactions
//   const [itemsCancelled, setItemsCancelled] = useState<Record<number, boolean>>({});
//   type LocalPreview = SubstitutionItemRequest & { storeUuid?: string };
//   const [previewSubs, setPreviewSubs] = useState<LocalPreview[]>([]);
//   const [activeOriginalId, setActiveOriginalId] = useState<number | null>(null);

//   // inventory modal
//   const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
//   const [inventoryModalStoreUuid, setInventoryModalStoreUuid] = useState<string | null>(null);
//   const [selectedInventoryPick, setSelectedInventoryPick] = useState<{
//     storeInventoryId: number;
//     variant?: StoreInventoryVariantDTO | null;
//     productName?: string;
//     qty: number;
//     storeUuid?: string;
//   } | null>(null);

//   // per-variant qty map: storeInventoryId => number | ''
//   const [inventoryQtyMap, setInventoryQtyMap] = useState<Record<number, number | ''>>({});

//   const [submitting, setSubmitting] = useState(false);

//   // -------- Load recent orders ----------
//   useEffect(() => {
//     loadRecent();
//   }, []);

//   async function loadRecent() {
//     setLoadingOrders(true);
//     setError(null);
//     try {
//       const res = await apiService.getRecentOrders(45);
//       setOrders(res || []);
//     } catch (err: any) {
//       console.error("loadRecent", err);
//       setError(err?.message ?? "Failed to load recent orders");
//     } finally {
//       setLoadingOrders(false);
//     }
//   }

//   // ---------- Open modal for an order ----------
//   async function openSubstituteFor(order: RecentOrder) {
//     if (!order?.orderShortId) {
//       alert("Order is missing short id");
//       return;
//     }
//     setResolvingStore(true);
//     try {
//       setActiveOrderShortId(order.orderShortId);
//       await openModalAndLoad(order.orderShortId);
//     } catch (err: any) {
//       console.error("openSubstituteFor", err);
//       alert("Failed to open substitute modal: " + (err?.message ?? err));
//     } finally {
//       setResolvingStore(false);
//     }
//   }

//   // open modal and load full order + inventories for each store in the order
//   async function openModalAndLoad(orderShortId: string) {
//     setModalOpen(true);
//     setOrderFull(null);
//     setInventoryMap({});
//     setItemsCancelled({});
//     setPreviewSubs([]);
//     setActiveOriginalId(null);
//     setSelectedInventoryPick(null);
//     setInventoryQtyMap({});

//     setLoadingOrderFull(true);
//     try {
//       const full = await apiService.getTrackedOrder(orderShortId);
//       setOrderFull(full);

//       // derive store list: try common shapes
//       let storesArray: any[] = [];
//       const sCandidates = (full as any)?.stores ?? (full as any)?.orderStores ?? (full as any)?.orderStoresDTO ?? null;
//       if (Array.isArray(sCandidates) && sCandidates.length > 0) storesArray = sCandidates;
//       else {
//         const storeUuid = (full as any)?.storeUuid ?? (full as any)?.store?.uuid ?? null;
//         if (storeUuid) {
//           storesArray = [{ storeUuid, storeName: (full as any)?.store?.storeName ?? (full as any)?.storeName ?? "Store", items: (full as any)?.items ?? [] }];
//         }
//       }

//       // fetch inventory for each store (concurrently)
//       const invMap: Record<string, GroupedStoreInventoryResponseDTO[] | null> = {};
//       const loadFlags: Record<string, boolean> = {};
//       await Promise.all(
//         storesArray.map(async (s) => {
//           const uuid = s.storeUuid ?? s.uuid ?? s.store?.uuid ?? s.store?.storeUuid;
//           if (!uuid) return;
//           loadFlags[uuid] = true;
//           try {
//             const pg = await apiService.getStoreInventory(uuid, 0, 200);
//             const content = (pg as any)?.content ?? pg;
//             invMap[uuid] = Array.isArray(content) ? content : [];
//           } catch (err) {
//             console.warn(`Failed loading inventory for ${uuid}`, err);
//             invMap[uuid] = null;
//           } finally {
//             loadFlags[uuid] = false;
//           }
//         })
//       );
//       setInventoryMap(invMap);
//       setLoadingInventoryMap(loadFlags);
//     } catch (err: any) {
//       console.error("load full order", err);
//       alert("Failed to load order details: " + (err?.message ?? err));
//       setModalOpen(false);
//       return;
//     } finally {
//       setLoadingOrderFull(false);
//     }
//   }

//   // ---------- Order-items extraction per store ----------
//   const storesInOrder = useMemo(() => {
//     if (!orderFull) return [] as any[];
//     const stores = (orderFull as any)?.stores ?? (orderFull as any)?.orderStores ?? (orderFull as any)?.orderStoresDTO ?? [];
//     if (Array.isArray(stores) && stores.length > 0) return stores;
//     const storeUuid = (orderFull as any)?.storeUuid ?? (orderFull as any)?.store?.uuid ?? null;
//     if (storeUuid) {
//       return [{ storeUuid, storeName: (orderFull as any)?.store?.storeName ?? (orderFull as any)?.storeName ?? "Store", items: (orderFull as any)?.items ?? [] }];
//     }
//     return [] as any[];
//   }, [orderFull]);

//   function itemsForStore(s: any) {
//     return Array.isArray(s.items) ? s.items : [];
//   }

//   // ---------- UI actions ----------
//   function toggleCancel(itemId: number) {
//     setItemsCancelled((prev) => {
//       const next = { ...prev };
//       if (next[itemId]) delete next[itemId];
//       else next[itemId] = true;
//       return next;
//     });
//     setPreviewSubs((p) => p.filter((s) => s.originalOrderItemId !== itemId));
//   }

//   function startAddSub(originalOrderItemId: number, storeUuid?: string) {
//     setActiveOriginalId(originalOrderItemId);
//     setInventoryModalStoreUuid(storeUuid ?? null);
//     setSelectedInventoryPick(null);
//     setInventoryModalOpen(true);
//   }

//   function addAdhocSub(storeUuid?: string) {
//     setActiveOriginalId(-1);
//     setInventoryModalStoreUuid(storeUuid ?? null);
//     setSelectedInventoryPick(null);
//     setInventoryModalOpen(true);
//   }

// function quickAddFromInventory(v: StoreInventoryVariantDTO, storeUuid: string) {
//   if (activeOriginalId == null) {
//     alert("No target order item selected. Choose an order item first or use ad-hoc mode.");
//     return;
//   }

//   // read per-variant qty, fallback to 1
//   const qRaw = inventoryQtyMap[v.storeInventoryId];
//   const qty = qRaw === '' || qRaw == null ? 1 : Number(qRaw);
//   const safeQty = Math.max(0, Math.floor(qty));
//   // if qty is 0, treat as invalid for quick-add (we don't add zero-qty substitutes to preview)
//   if (safeQty <= 0) {
//     alert("Please enter a quantity >= 1 to add a substitute.");
//     return;
//   }

//   const chosenQty = Math.min(safeQty, v.quantity ?? safeQty);

//   // de-duplicate: if preview already has same originalOrderItemId, update it
//   setPreviewSubs((p) => {
//     const idx = p.findIndex((x) => x.originalOrderItemId === activeOriginalId);
//     const entry = {
//       originalOrderItemId: activeOriginalId!,
//       substituteStoreInventoryId: v.storeInventoryId,
//       substituteQuantity: chosenQty,
//       storeUuid,
//     } as LocalPreview;
//     if (idx >= 0) {
//       const next = [...p];
//       next[idx] = entry;
//       return next;
//     } else {
//       return [...p, entry];
//     }
//   });

//   setInventoryModalOpen(false);
//   setActiveOriginalId(null);
//   // clear qty for the variant (optional)
//   setInventoryQtyMap((prev) => ({ ...prev, [v.storeInventoryId]: '' }));
// }


// function confirmInventoryPick() {
//   if (!selectedInventoryPick) {
//     alert("Select inventory and quantity first.");
//     return;
//   }
//   if (activeOriginalId == null) {
//     alert("No order item selected (or choose ad-hoc).");
//     return;
//   }

//   const id = selectedInventoryPick.storeInventoryId;
//   const qRaw = inventoryQtyMap[id];
//   const qty = qRaw === '' || qRaw == null ? selectedInventoryPick.qty ?? 1 : Number(qRaw);
//   const safeQty = Math.max(0, Math.floor(qty));

//   // do not add zero-qty substitutes to preview — those are cancellations, handle separately
//   if (safeQty <= 0) {
//     alert("Please set a quantity of at least 1 to add as a substitute. Use Cancel button to cancel the item.");
//     return;
//   }

//   const avail = selectedInventoryPick.variant?.quantity ?? 0;
//   if (safeQty > avail) {
//     alert(`Selected quantity (${safeQty}) exceeds available (${avail})`);
//     return;
//   }

//   const entry: LocalPreview = {
//     originalOrderItemId: activeOriginalId,
//     substituteStoreInventoryId: id,
//     substituteQuantity: safeQty,
//     storeUuid: selectedInventoryPick.storeUuid,
//   };

//   setPreviewSubs((p) => {
//     const idx = p.findIndex((x) => x.originalOrderItemId === activeOriginalId);
//     if (idx >= 0) {
//       const next = [...p];
//       next[idx] = entry;
//       return next;
//     }
//     return [...p, entry];
//   });

//   setInventoryModalOpen(false);
//   setActiveOriginalId(null);
//   setSelectedInventoryPick(null);
//   setInventoryQtyMap((prev) => ({ ...prev, [id]: '' }));
// }


//   function removePreviewAt(index: number) {
//     setPreviewSubs((p) => p.filter((_, i) => i !== index));
//   }

//   // ---------- Submit logic (group by storeUuid) ----------
//   async function handleSubmitAll() {
//     // Build final substitutions list (previewSubs) + cancellations (converted at submit time)
//     // Build final substitutions list: start from previewSubs (these are actual replacements)
// const subs: LocalPreview[] = [...previewSubs];

// // Add cancellations: create canonical list of cancelled ids that are not covered by previewSubs
// const cancelledIds = Object.keys(itemsCancelled)
//   .map((k) => Number(k))
//   .filter((id) => !subs.some((s) => s.originalOrderItemId === id));

// // Create a single cancellation DTO per item, referencing a candidate inventoryId as required by backend
// for (const id of cancelledIds) {
//   // find store containing the item
//   let parentStoreUuid: string | undefined;
//   for (const s of storesInOrder) {
//     const its = itemsForStore(s) || [];
//     if (its.some((it: any) => (it.itemId ?? it.id) === id)) {
//       parentStoreUuid = s.storeUuid ?? s.uuid ?? s.store?.uuid;
//       break;
//     }
//   }

//   let candidate: number | null = null;
//   if (parentStoreUuid && inventoryMap[parentStoreUuid] && inventoryMap[parentStoreUuid]?.length) {
//     const firstInv = inventoryMap[parentStoreUuid]![0];
//     if (firstInv && firstInv.variants && firstInv.variants.length) {
//       candidate = firstInv.variants[0].storeInventoryId;
//     }
//   }

//   // fallback globally once
//   if (!candidate) {
//     const anyStore = Object.keys(inventoryMap)[0];
//     const firstInv = anyStore ? inventoryMap[anyStore] : null;
//     if (firstInv && firstInv.length && firstInv[0].variants && firstInv[0].variants.length) {
//       candidate = firstInv[0].variants[0].storeInventoryId;
//     }
//   }

//   if (!candidate) {
//     alert(`Cannot cancel item ${id}: no inventory found to reference for cancellation.`);
//     return;
//   }

//   // push a single cancellation DTO (qty = 0). We purposefully do NOT push it into the visible previewSubs earlier.
//   subs.push({ originalOrderItemId: id, substituteStoreInventoryId: candidate, substituteQuantity: 0, storeUuid: parentStoreUuid });
// }


//     if (subs.length === 0) {
//       alert("No substitutions or cancellations to submit.");
//       return;
//     }

//     // group by storeUuid
//     const groups = new Map<string, SubstitutionItemRequest[]>();
//     for (const s of subs) {
//       const store = s.storeUuid ?? (Object.keys(inventoryMap)[0] ?? "");
//       if (!groups.has(store)) groups.set(store, []);
//       groups.get(store)!.push({ originalOrderItemId: s.originalOrderItemId, substituteStoreInventoryId: s.substituteStoreInventoryId, substituteQuantity: s.substituteQuantity });
//     }

//     if (!activeOrderShortId) {
//       alert("Internal error: missing order context.");
//       return;
//     }

//     setSubmitting(true);
//     try {
//       const promises: Promise<any>[] = [];
//       for (const [storeUuid, items] of groups.entries()) {
//         const payload: SubstitutionRequest = { orderShortId: activeOrderShortId!, storeUuid, substitutions: items };
//         promises.push(apiService.substituteItems(payload));
//       }
//       await Promise.all(promises);
//       alert("Substitution(s) submitted successfully.");

//       // refresh
//       setPreviewSubs([]);
//       setItemsCancelled({});
//       setModalOpen(false);
//       await loadRecent();
//     } catch (err: any) {
//       console.error("submit substitution", err);
//       alert("Failed to submit substitution: " + (err?.message ?? err));
//     } finally {
//       setSubmitting(false);
//     }
//   }

//   // ---------- Render ----------
//   return (
//     <div className="p-6 bg-gray-50 min-h-screen">
//       <div className="flex items-center justify-between mb-4">
//         <h2 className="text-2xl font-bold text-[#FF6600]">Recent Orders</h2>
//         <div className="flex gap-2">
//           <button onClick={loadRecent} className="px-3 py-1 rounded bg-[#FF6600] text-white" disabled={loadingOrders}>
//             {loadingOrders ? "Refreshing..." : "Refresh"}
//           </button>
//         </div>
//       </div>

//       {error && <div className="text-red-600 mb-3">Error: {error}</div>}

//       {loadingOrders ? (
//         <div>Loading recent orders...</div>
//       ) : orders.length === 0 ? (
//         <div className="text-gray-500">No recent orders.</div>
//       ) : (
//         <div className="overflow-auto shadow rounded bg-white">
//           <table className="w-full border-collapse">
//             <thead>
//               <tr className="bg-[#FF6600] text-white">
//                 <th className="p-2 text-left">Sub</th>
//                 <th className="p-2 text-left">Short ID</th>
//                 <th className="p-2 text-left">Customer</th>
//                 <th className="p-2 text-left">Address</th>
//                 <th className="p-2 text-left">Store</th>
//                 <th className="p-2 text-left">Status</th>
//                 <th className="p-2 text-left">Updated</th>
//               </tr>
//             </thead>
//             <tbody>
//               {orders.map((o) => (
//                 <tr key={o.orderShortId} className="hover:bg-gray-100 text-black">
//                   <td className="p-2">
//                     <button className="px-2 py-1 rounded bg-[#FF6600] text-white text-sm" onClick={() => openSubstituteFor(o)} disabled={resolvingStore}>
//                       Substitute
//                     </button>
//                   </td>
//                   <td className="p-2 text-sm">{o.orderShortId}</td>
//                   <td className="p-2 text-sm">{o.customerName ?? "-"}</td>
//                   <td className="p-2 text-sm">{o.address ?? "-"}</td>
//                   <td className="p-2 text-sm">{o.storeUuid ?? "-"}</td>
//                   <td className="p-2 text-sm">{o.orderStatus ?? "-"}</td>
//                   <td className="p-2 text-sm">{o.updatedAt ? new Date(o.updatedAt).toLocaleString() : "-"}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}

//       {/* Modal: multi-store columns */}
//       {modalOpen && orderFull && (
//         <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4">
//           <div className="absolute inset-0 bg-black opacity-40" onClick={() => setModalOpen(false)} />
//           <div className="relative bg-white rounded shadow-lg z-60 w-full max-w-7xl p-6 overflow-auto max-h-[90vh]">
//             <div className="flex justify-between items-center mb-4">
//               <h3 className="text-lg font-semibold text-[#FF6600]">Substitute — Order {activeOrderShortId}</h3>
//               <div>
//                 <button onClick={() => setModalOpen(false)} className="text-sm text-gray-600">
//                   Close
//                 </button>
//               </div>
//             </div>

//             {loadingOrderFull ? (
//               <div>Loading order...</div>
//             ) : (
//               <div className="space-y-4">
//                 {/* grid of stores */}
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                   {storesInOrder.map((s: any) => {
//                     const storeUuid = s.storeUuid ?? s.uuid ?? s.store?.uuid ?? s.store?.storeUuid;
//                     const items = itemsForStore(s) || [];
//                     const invForStore = inventoryMap[storeUuid];
//                     const loadingInv = loadingInventoryMap[storeUuid];
//                     return (
//                       <div key={storeUuid ?? Math.random()} className="bg-white border rounded p-3 shadow-sm">
//                         <div className="flex justify-between items-center mb-2">
//                           <div>
//                             <div className="font-medium text-sm">{s.storeName ?? s.store?.storeName ?? `Store ${storeUuid}`}</div>
//                             <div className="text-xs text-gray-500">{storeUuid}</div>
//                           </div>
//                           <div className="flex gap-2">
//                             <button onClick={() => addAdhocSub(storeUuid)} className="px-2 py-1 border rounded text-sm">
//                               + Ad-hoc
//                             </button>
//                             <button
//                               onClick={() => {
//                                 setInventoryModalStoreUuid(storeUuid);
//                                 setInventoryModalOpen(true);
//                               }}
//                               className="px-2 py-1 rounded bg-[#FF6600] text-white text-sm"
//                             >
//                               Browse
//                             </button>
//                           </div>
//                         </div>

//                         <div className="mb-2">
//                           <div className="text-xs text-gray-500 mb-1">Ordered items</div>
//                           {items.length === 0 ? (
//                             <div className="text-gray-500 text-sm">No items</div>
//                           ) : (
//                             <ul className="space-y-2">
//                               {items.map((it: any) => {
//                                 const itemId = it.itemId ?? it.id;
//                                 const cancelled = !!itemsCancelled[itemId];
//                                 return (
//                                   <li key={itemId} className={`flex items-center justify-between gap-2 p-2 border rounded ${cancelled ? "opacity-60" : ""}`}>
//                                     <div>
//                                       <div className="text-sm font-medium">{it.itemName ?? it.name ?? it.displayName ?? "Item"}</div>
//                                       <div className="text-xs text-gray-500">Qty: {it.quantity ?? it.qty ?? 1}</div>
//                                     </div>
//                                     <div className="flex items-center gap-2">
//                                       <button onClick={() => toggleCancel(itemId)} className={`px-2 py-1 rounded text-sm ${cancelled ? "bg-red-600 text-white" : "bg-gray-200"}`}>
//                                         −
//                                       </button>
//                                       <button onClick={() => startAddSub(itemId, storeUuid)} className="px-2 py-1 rounded bg-[#FF6600] text-white text-sm">
//                                         +
//                                       </button>
//                                     </div>
//                                   </li>
//                                 );
//                               })}
//                             </ul>
//                           )}
//                         </div>

//                         <div>
//                           <div className="text-xs text-gray-500 mb-1">Inventory preview</div>
//                           {loadingInv ? (
//                             <div className="text-sm">Loading inventory...</div>
//                           ) : !invForStore || invForStore.length === 0 ? (
//                             <div className="text-gray-500 text-sm">No inventory for this store</div>
//                           ) : (
//                             <div className="space-y-2 max-h-36 overflow-auto">
//                               {invForStore.slice(0, 6).map((g) => (
//                                 <div key={g.productId} className="p-2 border rounded bg-gray-50">
//                                   <div className="text-sm font-medium">{g.productName}</div>
//                                   <div className="text-xs text-gray-600">Variants: {g.variants.length}</div>
//                                 </div>
//                               ))}
//                               {invForStore.length > 6 && <div className="text-xs text-gray-400">...and more. Use Browse to see all.</div>}
//                             </div>
//                           )}
//                         </div>
//                       </div>
//                     );
//                   })}
//                 </div>

//                 {/* Preview area spanning full width */}
//                 <div className="bg-white border rounded p-3 shadow-sm">
//                   <h4 className="font-medium mb-2">Preview</h4>

//                   {/* Substitutions */}
//                   {previewSubs.length === 0 ? (
//                     <div className="text-gray-500">No substitutions yet.</div>
//                   ) : (
//                     <div className="overflow-auto">
//                       <table className="w-full text-sm">
//                         <thead>
//                           <tr className="bg-gray-100">
//                             <th className="p-2 text-left">Store</th>
//                             <th className="p-2 text-left">Original</th>
//                             <th className="p-2 text-left">Inventory</th>
//                             <th className="p-2">Qty</th>
//                             <th className="p-2">Remove</th>
//                           </tr>
//                         </thead>
//                         <tbody>
//                           {previewSubs.map((p, i) => (
//                             <tr key={`${p.substituteStoreInventoryId}-${i}`} className="hover:bg-gray-50">
//                               <td className="p-2">{p.storeUuid ?? "(unknown)"}</td>
//                               <td className="p-2">{p.originalOrderItemId}</td>
//                               <td className="p-2">{p.substituteStoreInventoryId}</td>
//                               <td className="p-2">{p.substituteQuantity}</td>
//                               <td className="p-2 text-center">
//                                 <button onClick={() => removePreviewAt(i)} className="px-2 py-1 rounded bg-red-500 text-white text-xs">
//                                   Remove
//                                 </button>
//                               </td>
//                             </tr>
//                           ))}
//                         </tbody>
//                       </table>
//                     </div>
//                   )}

//                   {/* Cancellations (separate) */}
//                   {Object.keys(itemsCancelled).length > 0 && (
//                     <div className="mt-4">
//                       <h5 className="font-medium">Cancellations</h5>
//                       <ul className="text-sm text-gray-600 space-y-1 mt-2">
//                         {Object.keys(itemsCancelled).map((k) => (
//                           <li key={k}>
//                             Item <strong>{k}</strong> — <span className="text-red-600">Cancelled</span>{" "}
//                             <button onClick={() => toggleCancel(Number(k))} className="ml-3 text-xs px-2 py-1 border rounded">
//                               Undo
//                             </button>
//                           </li>
//                         ))}
//                       </ul>
//                     </div>
//                   )}

//                   <div className="mt-3 flex gap-2">
//                     <button onClick={() => addAdhocSub()} className="px-3 py-1 rounded border">
//                       + Add from inventory (global)
//                     </button>
//                     <button onClick={() => setInventoryModalOpen(true)} className="px-3 py-1 rounded bg-[#FF6600] text-white">
//                       Browse Inventory
//                     </button>
//                   </div>
//                 </div>

//                 <div className="flex justify-end gap-3">
//                   <button onClick={() => setModalOpen(false)} className="px-3 py-1 border rounded">
//                     Cancel
//                   </button>
//                   <button onClick={handleSubmitAll} className={`px-4 py-2 rounded text-white ${submitting ? "bg-gray-400" : "bg-[#FF6600]"}`} disabled={submitting}>
//                     {submitting ? "Submitting..." : "Submit All"}
//                   </button>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
//       )}

//       {/* Inventory modal (scoped to chosen store) */}
//       {inventoryModalOpen && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center">
//           <div className="absolute inset-0 bg-black opacity-40" onClick={() => setInventoryModalOpen(false)} />
//           <div className="bg-white rounded shadow-lg z-60 w-[95%] max-w-4xl p-5 max-h-[85vh] overflow-auto">
//             <div className="flex justify-between items-center mb-3">
//               <h4 className="font-semibold">Select inventory to substitute {inventoryModalStoreUuid ? `(store: ${inventoryModalStoreUuid})` : ""}</h4>
//               <button onClick={() => setInventoryModalOpen(false)} className="text-sm text-gray-600">
//                 Close
//               </button>
//             </div>

//             {inventoryModalStoreUuid && loadingInventoryMap[inventoryModalStoreUuid] ? (
//               <div>Loading inventory...</div>
//             ) : (
//               <div className="space-y-3">
//                 {/* gather items to iterate: either specific store list or flatten all stores */}
//                 {(
//                   inventoryModalStoreUuid
//                     ? inventoryMap[inventoryModalStoreUuid] ?? []
//                     : Object.values(inventoryMap).flatMap((x) => (x ?? []))
//                 ).map((g: any) => (
//                   <div key={g.productId} className="border p-3 rounded flex items-center gap-3">
//                     <div className="w-14 h-14 flex-shrink-0">
//                       {g.variants?.[0]?.thumbnailImageUrl ? (
//                         <img src={g.variants[0].thumbnailImageUrl} alt={g.productName} className="w-14 h-14 object-cover rounded" />
//                       ) : (
//                         <div className="w-14 h-14 bg-gray-100 flex items-center justify-center text-xs">IMG</div>
//                       )}
//                     </div>
//                     <div className="flex-1">
//                       <div className="font-medium">{g.productName}</div>
//                       <div className="text-xs text-gray-500">Variants: {g.variants.length}</div>
//                     </div>

//                     <div className="flex flex-col items-end gap-2">
//                       <select
//                         className="border rounded px-2 py-1 text-sm"
//                         onChange={(e) => {
//                           const vid = Number(e.target.value);
//                           const v = g.variants.find((x: any) => x.storeInventoryId === vid);
//                           if (!v) return;
//                           setSelectedInventoryPick({ storeInventoryId: v.storeInventoryId, variant: v, productName: g.productName, qty: 1, storeUuid: inventoryModalStoreUuid ?? undefined });
//                         }}
//                         value={selectedInventoryPick?.storeInventoryId ?? ""}
//                       >
//                         <option value="">Select variant</option>
//                         {g.variants.map((v: any) => (
//                           <option key={v.storeInventoryId} value={v.storeInventoryId}>
//                             {v.packageName ?? `Variant ${v.variantId}`} — avail: {v.quantity}
//                           </option>
//                         ))}
//                       </select>

//                       {/* per-variant qty input */}
//                       <input
//                         type="number"
//                         min={0}
//                         value={
//                           // if selectedInventoryPick is for this variant, show its qty; otherwise show map value for first variant if any
//                           (selectedInventoryPick?.storeInventoryId === g.variants?.[0]?.storeInventoryId && selectedInventoryPick?.qty) ||
//                           (g.variants?.[0] ? inventoryQtyMap[g.variants[0].storeInventoryId] ?? "" : "")
//                         }
//                         onChange={(e) => {
//                           const raw = e.target.value;
//                           // allow empty string to let user clear
//                           const value = raw === "" ? "" : Math.max(0, Number(raw || 0));
//                           // if a variant was selected, map to that id; else map to first variant's id (common case)
//                           const id = selectedInventoryPick?.storeInventoryId ?? g.variants?.[0]?.storeInventoryId;
//                           if (!id) return;
//                           setInventoryQtyMap((prev) => ({ ...prev, [id]: value }));
//                         }}
//                         className="w-24 border rounded px-2 py-1 text-sm"
//                       />

//                       <div className="flex gap-2">
//                         <button
//                           onClick={() => {
//                             // select first variant by default if none chosen
//                             const v = selectedInventoryPick?.variant ?? g.variants?.[0];
//                             if (!v) return alert("Select a variant first");
//                             setSelectedInventoryPick({ storeInventoryId: v.storeInventoryId, variant: v, productName: g.productName, qty: inventoryQtyMap[v.storeInventoryId] === "" ? 1 : Number(inventoryQtyMap[v.storeInventoryId] ?? 1), storeUuid: inventoryModalStoreUuid ?? undefined });
//                           }}
//                           className={`px-3 py-1 rounded text-white ${selectedInventoryPick?.storeInventoryId && inventoryQtyMap[selectedInventoryPick.storeInventoryId] ? "bg-green-600" : "bg-[#FF6600]"}`}
//                         >
//                           Select
//                         </button>

//                         <button
//                           onClick={() => {
//                             const id = selectedInventoryPick?.storeInventoryId ?? g.variants?.[0]?.storeInventoryId;
//                             const v = selectedInventoryPick?.variant ?? g.variants?.[0];
//                             if (!id || !v) return alert("Select a variant first");
//                             quickAddFromInventory(v, inventoryModalStoreUuid ?? Object.keys(inventoryMap)[0] ?? "");
//                           }}
//                           className="px-3 py-1 rounded border"
//                         >
//                           Quick Add
//                         </button>
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//                 {(!inventoryModalStoreUuid && Object.keys(inventoryMap).length === 0) && <div className="text-gray-500">No inventory loaded.</div>}
//               </div>
//             )}

//             <div className="mt-4 flex justify-end gap-2">
//               <button onClick={() => setInventoryModalOpen(false)} className="px-3 py-1 border rounded">
//                 Cancel
//               </button>
//               <button onClick={confirmInventoryPick} className="px-4 py-2 rounded bg-[#FF6600] text-white" disabled={!selectedInventoryPick}>
//                 Add to Preview
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
