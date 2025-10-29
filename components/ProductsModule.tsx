"use client";

import React, { useState, useEffect } from "react";
import { apiService } from "@/services/apiService";
import { Product } from "@/services/types";
import ProductModal from "@/components/ProductModal";
import VariantModal from "@/components/VariantModal";

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
  const [filter, setFilter] = useState<FilterOption>("ALL"); // <-- new filter state

  // Fetch products
  const fetchProducts = async () => {
    try {
      const data = await apiService.getProducts();
      setProducts(data);
      setFilteredProducts(data);
    } catch (err) {
      console.error("Failed to fetch products:", err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Filtering logic: search + active/inactive filter
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
      return !Boolean(isActive); // INACTIVE
    };

    setFilteredProducts(products.filter((p) => matchesSearch(p) && matchesFilter(p)));
  }, [searchTerm, filter, products]);

  // Handle product save (add or update) — parent receives full product object
  const handleProductSaved = (savedProduct: Product) => {
    setProducts((prev) => {
      const exists = prev.find((p) => p.uuid === savedProduct.uuid);
      if (exists) {
        return prev.map((p) => (p.uuid === savedProduct.uuid ? savedProduct : p));
      } else {
        return [savedProduct, ...prev];
      }
    });

    setFilteredProducts((prev) => {
      const exists = prev.find((p) => p.uuid === savedProduct.uuid);
      if (exists) {
        return prev.map((p) => (p.uuid === savedProduct.uuid ? savedProduct : p));
      } else {
        return [savedProduct, ...prev];
      }
    });
  };

  // Handle variant added
  const handleVariantAdded = (newVariant: any) => {
    setProducts((prev) =>
      prev.map((product) =>
        product.uuid === selectedProductUuid
          ? { ...product, variantsDTO: [...(product.variantsDTO || []), newVariant] }
          : product
      )
    );
  };

  // Toggle active status quickly from table (uses isActive with fallback to active)
  const toggleActive = async (product: Product) => {
    try {
      const current = (product as any).isActive ?? (product as any).active ?? false;
      const desired = !current;
      // Send the backend the field it expects: isActive
      const updated = await apiService.updateProduct(product.uuid!, { isActive: desired });
      const newProduct =
        updated && (updated as Product).uuid
          ? (updated as Product)
          : { ...product, isActive: desired, active: desired };
      setProducts((prev) => prev.map((p) => (p.uuid === product.uuid ? newProduct : p)));
      setFilteredProducts((prev) => prev.map((p) => (p.uuid === product.uuid ? newProduct : p)));
    } catch (err) {
      console.error("Failed to toggle active:", err);
      alert("Failed to update product status");
    }
  };

  // Delete product
  const handleDelete = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete "${product.productName}"?`)) return;
    try {
      await apiService.deleteProduct(product.uuid!);
      setProducts((prev) => prev.filter((p) => p.uuid !== product.uuid));
      setFilteredProducts((prev) => prev.filter((p) => p.uuid !== product.uuid));
      alert("Product deleted successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to delete product");
    }
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

        {/* Filter select */}
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

                {/* Active column: quick toggle */}
                <td className="border p-2 text-center">
                  <button
                    className={`px-3 py-1 rounded ${
                      isActive ? "bg-green-500 text-white" : "bg-gray-300 text-black"
                    }`}
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
                    onClick={() => handleDelete(product)}
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
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        product={editingProduct}
        onProductSaved={handleProductSaved}
      />

      <VariantModal
        isOpen={isVariantModalOpen}
        onClose={() => setIsVariantModalOpen(false)}
        productUuid={selectedProductUuid}
        productId={selectedProductNumericId}
        onVariantAdded={handleVariantAdded}
      />
    </div>
  );
};

export default ProductModules;
