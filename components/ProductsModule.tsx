"use client";

import React, { useState, useEffect } from "react";
import { apiService } from "@/services/apiService";
import { Product } from "@/services/types";
import ProductModal from "@/components/ProductModal";
import VariantModal from "@/components/VariantModal";

const ProductModules = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProductUuid, setSelectedProductUuid] = useState<string | null>(null);
  const [selectedProductNumericId, setSelectedProductNumericId] = useState<number | null>(null);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

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

  // Filter products by name, brand, category
  useEffect(() => {
    if (!searchTerm) {
      setFilteredProducts(products);
      return;
    }
    const term = searchTerm.toLowerCase();
    setFilteredProducts(
      products.filter(
        (p) =>
          p.productName?.toLowerCase().includes(term) ||
          p.categoryName?.toLowerCase().includes(term) ||
          p.brand?.toLowerCase().includes(term)
      )
    );
  }, [searchTerm, products]);

  // Handle product save (add or update)
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

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold" style={{ color: "#FF6600" }}>Products</h1>
        <button
          className="px-4 py-2 bg-[#FF6600] text-white rounded hover:bg-[#e65c00]"
          onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }}
        >
          Add Product
        </button>
      </div>

      {/* Search Input */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by Name, Brand, Category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 w-full text-black"
        />
      </div>

      {/* Product Table */}
      <table className="w-full border-collapse shadow-lg">
        <thead>
          <tr className="bg-[#FF6600] text-white">
            <th className="border p-3 text-left">Product ID</th>
            <th className="border p-3 text-left">Name</th>
            <th className="border p-3 text-left">Category</th>
            <th className="border p-3 text-left">Brand</th>
            <th className="border p-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredProducts.map((product) => (
            <tr key={product.uuid} className="hover:bg-gray-100 text-black">
              <td className="border p-2">{product.uuid}</td>
              <td className="border p-2">{product.productName}</td>
              <td className="border p-2">{product.categoryName || "-"}</td>
              <td className="border p-2">{product.brand || "-"}</td>
              <td className="border p-2 text-center flex justify-center gap-2">
                <button
                  className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                   onClick={() => {
                    setSelectedProductUuid(product.uuid || null);  // UUID for fetching
                    setSelectedProductNumericId(product.productId); // numeric ID for createVariant
                    setIsVariantModalOpen(true);
                   }}
                >
                  View / Add Variants
                </button>

                <button
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  onClick={() => { setEditingProduct(product); setIsProductModalOpen(true); }}
                >
                  Update
                </button>

                <button
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  onClick={async () => {
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
                  }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
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
