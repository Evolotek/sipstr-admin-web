// ProductModules.tsx
"use client";

import React, { useState, useEffect } from "react";
import { apiService } from "@/services/apiService";
import { Product } from "@/services/types";
import ProductModal from "@/components/ProductModal";
import VariantModal from "@/components/VariantModal";

/* ---------------- BCP-style AlertDialog (used by ProductModules) ---------------- */
type CustomAlert = {
  isOpen: boolean;
  message: string;
  isConfirm: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
};

const AlertDialog: React.FC<{ alert: CustomAlert; onClose: () => void }> = ({ alert, onClose }) => {
  if (!alert.isOpen) return null;

  const handleConfirm = async () => {
    try {
      if (alert.onConfirm) await alert.onConfirm();
    } finally {
      onClose();
    }
  };

  const handleCancel = () => {
    if (alert.onCancel) alert.onCancel();
    onClose();
  };

  return (
    <div
      role={alert.isConfirm ? "dialog" : "alertdialog"}
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        background: "rgba(0,0,0,0.35)",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420,
          maxWidth: "100%",
          background: "#fff",
          borderRadius: 10,
          padding: 20,
          boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
        }}
      >
        <div style={{ marginBottom: 8, fontSize: 18, fontWeight: 700, color: "#222" }}>
          {alert.isConfirm ? "Please confirm" : "Note"}
        </div>

        <div style={{ marginBottom: 18, color: "#333", lineHeight: 1.35 }}>{alert.message}</div>

        <div style={{ display: "flex", gap: 10, justifyContent: alert.isConfirm ? "flex-end" : "center" }}>
          {alert.isConfirm && (
            <button
              onClick={handleCancel}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #ccc",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          )}

          <button
            onClick={handleConfirm}
            style={{
              padding: "8px 14px",
              borderRadius: 6,
              border: "none",
              background: "#FF6600",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(255,102,0,0.12)",
            }}
          >
            {alert.isConfirm ? "Confirm" : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
};
/* ------------------------------------------------------------------------------- */

type FilterOption = "ALL" | "ACTIVE" | "INACTIVE";

const ProductModules: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProductUuid, setSelectedProductUuid] = useState<string | null>(null);
  const [selectedProductNumericId, setSelectedProductNumericId] = useState<number | null>(null);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<FilterOption>("ALL");

  // Custom alert state (BCP-style)
  const [customAlert, setCustomAlert] = useState<CustomAlert>({
    isOpen: false,
    message: "",
    isConfirm: false,
  });

  const showAlert = (message: string, isConfirm = false, onConfirm?: () => void, onCancel?: () => void) => {
    setCustomAlert({ isOpen: true, message, isConfirm, onConfirm, onCancel });
  };
  const closeAlert = () => setCustomAlert((s) => ({ ...s, isOpen: false }));

  // Fetch products
  const fetchProducts = async () => {
    try {
      const data = await apiService.getProducts();
      setProducts(data);
      setFilteredProducts(data);
    } catch (err) {
      console.error("Failed to fetch products:", err);
      showAlert("Failed to fetch products.", false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Filtering logic
  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();

    const matchesSearch = (p: Product) => {
      if (!term) return true;
      return (
        (p.productName ?? "").toLowerCase().includes(term) ||
        (p.categoryName ?? "").toLowerCase().includes(term) ||
        (p.brand ?? "").toLowerCase().includes(term)
      );
    };

    const matchesFilter = (p: Product) => {
      const isActive = (p as any).isActive ?? (p as any).active ?? false;
      if (filter === "ALL") return true;
      if (filter === "ACTIVE") return Boolean(isActive);
      return !Boolean(isActive);
    };

    setFilteredProducts(products.filter((p) => matchesSearch(p) && matchesFilter(p)));
  }, [searchTerm, filter, products]);

  // Product create/update handler (shows success)
  const handleProductSaved = (savedProduct: Product) => {
    const existed = products.some((p) => p.uuid === savedProduct.uuid);

    setProducts((prev) => {
      const exists = prev.find((p) => p.uuid === savedProduct.uuid);
      if (exists) return prev.map((p) => (p.uuid === savedProduct.uuid ? savedProduct : p));
      return [savedProduct, ...prev];
    });

    setFilteredProducts((prev) => {
      const exists = prev.find((p) => p.uuid === savedProduct.uuid);
      if (exists) return prev.map((p) => (p.uuid === savedProduct.uuid ? savedProduct : p));
      return [savedProduct, ...prev];
    });

    const verb = existed ? "updated" : "created";
    showAlert(`${savedProduct.productName ?? "Product"} ${verb} successfully.`, false);
  };

  // UPDATED: parent owns variant success messages (add/update)
  const handleVariantAdded = (incomingVariant: any, productUuidArg?: string) => {
    const ownerUuid = productUuidArg ?? selectedProductUuid;
    if (!ownerUuid) return;

    let isNew = true;

    setProducts((prev) =>
      prev.map((product) => {
        if (product.uuid !== ownerUuid) return product;

        const variants = product.variantsDTO ?? [];
        const exists = variants.find((v: any) => v.variantId === incomingVariant.variantId);

        let newVariants;
        if (exists) {
          isNew = false;
          newVariants = variants.map((v: any) => (v.variantId === incomingVariant.variantId ? incomingVariant : v));
        } else {
          newVariants = [...variants, incomingVariant];
        }

        return { ...product, variantsDTO: newVariants };
      })
    );

    setFilteredProducts((prev) =>
      prev.map((product) => {
        if (product.uuid !== ownerUuid) return product;

        const variants = product.variantsDTO ?? [];
        const exists = variants.find((v: any) => v.variantId === incomingVariant.variantId);

        let newVariants;
        if (exists) {
          newVariants = variants.map((v: any) => (v.variantId === incomingVariant.variantId ? incomingVariant : v));
        } else {
          newVariants = [...variants, incomingVariant];
        }

        return { ...product, variantsDTO: newVariants };
      })
    );

    if (isNew) showAlert("Variant added successfully!", false);
    else showAlert("Variant updated successfully!", false);
  };

  // Toggle active
  const toggleActive = async (product: Product) => {
    try {
      const current = (product as any).isActive ?? (product as any).active ?? false;
      const desired = !current;
      const updated = await apiService.updateProduct(product.uuid!, { isActive: desired });
      const newProduct =
        updated && (updated as Product).uuid ? (updated as Product) : { ...product, isActive: desired, active: desired };
      setProducts((prev) => prev.map((p) => (p.uuid === product.uuid ? newProduct : p)));
      setFilteredProducts((prev) => prev.map((p) => (p.uuid === product.uuid ? newProduct : p)));
    } catch (err) {
      console.error("Failed to toggle active:", err);
      showAlert("Failed to update product status", false);
    }
  };

  // Delete product
  const handleDeleteProduct = async (product: Product) => {
    showAlert(
      `Are you sure you want to delete "${product.productName}"?`,
      true,
      async () => {
        try {
          await apiService.deleteProduct(product.uuid!);
          setProducts((prev) => prev.filter((p) => p.uuid !== product.uuid));
          setFilteredProducts((prev) => prev.filter((p) => p.uuid !== product.uuid));
          showAlert("Product deleted successfully!", false);
        } catch (err) {
          console.error(err);
          showAlert("Failed to delete product", false);
        }
      }
    );
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold" style={{ color: "#FF6600" }}>
          Products
        </h1>
        <button
          className="px-4 py-2 bg-[#FF6600] text-white rounded hover:bg-[#e65c00]"
          onClick={() => {
            setEditingProduct(null);
            setIsProductModalOpen(true);
          }}
        >
          Add Product
        </button>
      </div>

      {/* Search + Filter Row */}
      <div className="mb-4 flex gap-3 items-center">
        <input
          type="text"
          placeholder="Search by Name, Brand, Category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 w-full text-black"
        />

        <div>
          <label htmlFor="activeFilter" className="sr-only">
            Filter Active
          </label>
          <select
            id="activeFilter"
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterOption)}
            className="border border-gray-300 rounded px-3 py-2 bg-white text-black"
            title="Filter by active/inactive"
          >
            <option value="ALL">All</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Product Table */}
      <table className="w-full border-collapse shadow-lg">
        <thead>
          <tr className="bg-[#FF6600] text-white">
            <th className="border p-3 text-left">Product ID</th>
            <th className="border p-3 text-left">Name</th>
            <th className="border p-3 text-left">Category</th>
            <th className="border p-3 text-left">Brand</th>
            <th className="border p-3 text-center">Active</th>
            <th className="border p-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredProducts.length === 0 && (
            <tr>
              <td colSpan={6} className="p-6 text-center text-gray-600">
                No products found.
              </td>
            </tr>
          )}

          {filteredProducts.map((product) => {
            const isActive = (product as any).isActive ?? (product as any).active ?? false;
            return (
              <tr key={product.uuid} className="hover:bg-gray-100 text-black">
                <td className="border p-2">{product.uuid}</td>
                <td className="border p-2">{product.productName}</td>
                <td className="border p-2">{product.categoryName || "-"}</td>
                <td className="border p-2">{product.brand || "-"}</td>

                <td className="border p-2 text-center">
                  <button
                    className={`px-3 py-1 rounded ${isActive ? "bg-green-500 text-white" : "bg-gray-300 text-black"}`}
                    onClick={() => toggleActive(product)}
                  >
                    {isActive ? "Active" : "Inactive"}
                  </button>
                </td>

                <td className="border p-2 text-center flex justify-center gap-2">
                  <button
                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                    onClick={() => {
                      setSelectedProductUuid(product.uuid || null);
                      setSelectedProductNumericId(product.productId ?? null);
                      setIsVariantModalOpen(true);
                    }}
                  >
                    View / Add Variants
                  </button>

                  <button
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    onClick={() => {
                      setEditingProduct(product);
                      setIsProductModalOpen(true);
                    }}
                  >
                    Update
                  </button>

                  <button
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    onClick={() => handleDeleteProduct(product)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Modals */}
      <ProductModal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} product={editingProduct} onProductSaved={handleProductSaved} />

      <VariantModal
        isOpen={isVariantModalOpen}
        onClose={() => setIsVariantModalOpen(false)}
        productUuid={selectedProductUuid}
        productId={selectedProductNumericId}
        onVariantAdded={(variant) => handleVariantAdded(variant, selectedProductUuid ?? undefined)}
      />

      {/* AlertDialog */}
      <AlertDialog alert={customAlert} onClose={closeAlert} />
    </div>
  );
};

export default ProductModules;
