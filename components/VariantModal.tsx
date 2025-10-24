// "use client";
// import React, { useState, useEffect } from "react";
// import { apiService } from "@/services/apiService";
// import { ProductVariant } from "@/services/types";

// interface VariantModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   productId: string | null;
//   onVariantAdded: (variant: ProductVariant) => void;
// }

// const VariantModal: React.FC<VariantModalProps> = ({
//   isOpen,
//   onClose,
//   productId,
//   onVariantAdded,
// }) => {
//   const [variants, setVariants] = useState<ProductVariant[]>([]);
//   const [currentVariant, setCurrentVariant] = useState<ProductVariant>({
//     unitPrice: 0,
//     variantId: 0,
//   });
//   const [errors, setErrors] = useState<{ [key: string]: string }>({});
//   const [editingIndex, setEditingIndex] = useState<number | null>(null);
//   const [showAdvanced, setShowAdvanced] = useState(false);

//   useEffect(() => {
//     if (productId) {
//       const fetchVariants = async () => {
//         try {
//           const product = await apiService.getProductById(productId);
//           setVariants(product.variantsDTO || []);
//         } catch (err) {
//           console.error("Failed to fetch variants:", err);
//         }
//       };
//       fetchVariants();
//     }
//   }, [productId]);

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const { name, value } = e.target;
//     setCurrentVariant({
//       ...currentVariant,
//       [name]: ["unitPrice", "shelfLifeDays", "alcoholByVolume", "weightGrams", "calories", "carbs", "ibuValue", "sugars", "addedSugars"].includes(name)
//         ? Number(value)
//         : value,
//     });
//   };

//   const validate = () => {
//     const newErrors: { [key: string]: string } = {};
//     if (!currentVariant.unitPrice || currentVariant.unitPrice <= 0)
//       newErrors.unitPrice = "Unit Price must be greater than 0";
//     return newErrors;
//   };

// const handleSubmit = async () => {
//   const validationErrors = validate();
//   if (Object.keys(validationErrors).length > 0) {
//     setErrors(validationErrors);
//     return;
//   }

//   if (!productId) return;

//   try {
//     let savedVariant;
//     if (editingIndex !== null) {
//       // Updating existing variant
//       const variantToUpdate = variants[editingIndex];
//       savedVariant = await apiService.updateVariant(
//         variantToUpdate.variantId,
//         currentVariant
//       );
//       const newVariants = [...variants];
//       newVariants[editingIndex] = savedVariant;
//       setVariants(newVariants);
//     } else {
//       // Creating new variant using productId (number)
//       savedVariant = await apiService.createVariant(Number(productId), currentVariant);
//       setVariants([...variants, savedVariant]);
//     }

//     setCurrentVariant({ unitPrice: 0, variantId: 0 });
//     setEditingIndex(null);
//     onVariantAdded(savedVariant);
//   } catch (err) {
//     console.error(err);
//     alert("Failed to save variant");
//   }
// };


//   const handleEdit = (index: number) => {
//     setEditingIndex(index);
//     setCurrentVariant(variants[index]);
//     setShowAdvanced(true); // Show advanced fields on edit
//   };

//   const handleDelete = async (index: number) => {
//     const variantToDelete = variants[index];
//     if (!confirm(`Are you sure you want to delete variant "${variantToDelete.packageName}"?`))
//       return;
//     try {
//       await apiService.deleteVariant(variantToDelete.variantId);
//       setVariants(variants.filter((_, i) => i !== index));
//     } catch (err) {
//       console.error(err);
//       alert("Failed to delete variant");
//     }
//   };

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
//       <div className="bg-white p-6 rounded-lg max-h-[90vh] overflow-y-auto w-[700px]">
//         <h2 className="text-xl font-semibold mb-4">Manage Product Variants</h2>

//         {variants.length > 0 && (
//           <div className="mb-4">
//             <h3 className="font-semibold mb-2">Existing Variants</h3>
//             <table className="w-full border-collapse text-black">
//               <thead>
//                 <tr className="bg-gray-200">
//                   <th className="border p-2">Package Name</th>
//                   <th className="border p-2">UPC</th>
//                   <th className="border p-2">Unit Price</th>
//                   <th className="border p-2">Actions</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {variants.map((v, i) => (
//                   <tr key={v.variantId}>
//                     <td className="border p-2">{v.packageName}</td>
//                     <td className="border p-2">{v.upc}</td>
//                     <td className="border p-2">{v.unitPrice}</td>
//                     <td className="border p-2 flex gap-2">
//                       <button
//                         className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
//                         onClick={() => handleEdit(i)}
//                       >
//                         Update
//                       </button>
//                       <button
//                         className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
//                         onClick={() => handleDelete(i)}
//                       >
//                         Delete
//                       </button>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}

//         <div className="space-y-3">
//           <h3 className="font-semibold">{editingIndex !== null ? "Edit Variant" : "Add New Variant"}</h3>

//           <div>
//             <label className="block font-medium">Package Name</label>
//             <input
//               name="packageName"
//               value={currentVariant.packageName || ""}
//               onChange={handleChange}
//               className="border w-full p-2 rounded"
//             />
//           </div>

//           <div>
//             <label className="block font-medium">Unit Price *</label>
//             <input
//               name="unitPrice"
//               type="number"
//               value={currentVariant.unitPrice}
//               onChange={handleChange}
//               className="border w-full p-2 rounded"
//             />
//             {errors.unitPrice && <p className="text-red-500">{errors.unitPrice}</p>}
//           </div>

//           <div>
//             <label className="block font-medium">UPC</label>
//             <input
//               name="upc"
//               value={currentVariant.upc || ""}
//               onChange={handleChange}
//               className="border w-full p-2 rounded"
//             />
//           </div>

//           <div>
//             <label className="block font-medium">Thumbnail Image URL</label>
//             <input
//               name="thumbnailImageUrl"
//               value={currentVariant.thumbnailImageUrl || ""}
//               onChange={handleChange}
//               className="border w-full p-2 rounded"
//             />
//           </div>

//           <div>
//             <label className="block font-medium">Full Size Image URL</label>
//             <input
//               name="fullSizeImageUrl"
//               value={currentVariant.fullSizeImageUrl || ""}
//               onChange={handleChange}
//               className="border w-full p-2 rounded"
//             />
//           </div>

//           <button
//             type="button"
//             onClick={() => setShowAdvanced(!showAdvanced)}
//             className="mt-2 text-blue-600 underline"
//           >
//             {showAdvanced ? "Hide Advanced Details" : "Show Advanced Details"}
//           </button>

//           {showAdvanced && (
//             <div className="mt-3 space-y-2 border-t pt-2">
//               {[
//                 { label: "Shelf Life (Days)", name: "shelfLifeDays" },
//                 { label: "Alcohol By Volume", name: "alcoholByVolume" },
//                 { label: "Weight (grams)", name: "weightGrams" },
//                 { label: "Calories", name: "calories" },
//                 { label: "Carbs", name: "carbs" },
//                 { label: "IBU Value", name: "ibuValue" },
//                 { label: "Sugars", name: "sugars" },
//                 { label: "Added Sugars", name: "addedSugars" },
//               ].map((field) => (
//                 <div key={field.name}>
//                   <label className="block font-medium">{field.label}</label>
//                   <input
//                     name={field.name}
//                     type="number"
//                     value={(currentVariant as any)[field.name] || ""}
//                     onChange={handleChange}
//                     className="border w-full p-2 rounded"
//                   />
//                 </div>
//               ))}

//               <div>
//                 <label className="block font-medium">Dimensions (cm)</label>
//                 <input
//                   name="dimensionsCm"
//                   value={currentVariant.dimensionsCm || ""}
//                   onChange={handleChange}
//                   className="border w-full p-2 rounded"
//                 />
//               </div>

//               <div>
//                 <label className="block font-medium">Storage Instructions</label>
//                 <input
//                   name="storageInstructions"
//                   value={currentVariant.storageInstructions || ""}
//                   onChange={handleChange}
//                   className="border w-full p-2 rounded"
//                 />
//               </div>
//             </div>
//           )}
//         </div>

//         <div className="mt-4 flex justify-end gap-2">
//           <button
//             onClick={onClose}
//             className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
//           >
//             Cancel
//           </button>
//           <button
//             onClick={handleSubmit}
//             className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
//           >
//             {editingIndex !== null ? "Update Variant" : "Add Variant"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default VariantModal;

"use client";

import React, { useState, useEffect } from "react";
import { apiService } from "@/services/apiService";
import { ProductVariant } from "@/services/types";

interface VariantModalProps {
  isOpen: boolean;
  onClose: () => void;
  productUuid: string | null;   // for fetching existing variants
  productId: number | null;     // numeric ID for creating variants
  onVariantAdded: (variant: ProductVariant) => void;
}

const VariantModal: React.FC<VariantModalProps> = ({
  isOpen,
  onClose,
  productUuid,
  productId,
  onVariantAdded,
}) => {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [currentVariant, setCurrentVariant] = useState<ProductVariant>({
    unitPrice: 0,
    variantId: 0,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fetch existing variants using productUuid
  useEffect(() => {
    if (productUuid) {
      const fetchVariants = async () => {
        try {
          const product = await apiService.getProductById(productUuid);
          setVariants(product.variantsDTO || []);
        } catch (err) {
          console.error("Failed to fetch variants:", err);
        }
      };
      fetchVariants();
    }
  }, [productUuid]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentVariant({
      ...currentVariant,
      [name]: [
        "unitPrice",
        "shelfLifeDays",
        "alcoholByVolume",
        "weightGrams",
        "calories",
        "carbs",
        "ibuValue",
        "sugars",
        "addedSugars",
      ].includes(name)
        ? Number(value)
        : value,
    });
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!currentVariant.unitPrice || currentVariant.unitPrice <= 0)
      newErrors.unitPrice = "Unit Price must be greater than 0";
    return newErrors;
  };

  const handleSubmit = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      let savedVariant;
      if (editingIndex !== null) {
        // Update existing variant (no change needed)
        const variantToUpdate = variants[editingIndex];
        savedVariant = await apiService.updateVariant(
          variantToUpdate.variantId,
          currentVariant
        );
        const newVariants = [...variants];
        newVariants[editingIndex] = savedVariant;
        setVariants(newVariants);
      } else {
        // Create new variant using numeric productId
        if (!productId) throw new Error("Numeric productId is missing");
        savedVariant = await apiService.createVariant(productId, currentVariant);
        setVariants([...variants, savedVariant]);
      }

      setCurrentVariant({ unitPrice: 0, variantId: 0 });
      setEditingIndex(null);
      onVariantAdded(savedVariant);
    } catch (err) {
      console.error(err);
      alert("Failed to save variant");
    }
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setCurrentVariant(variants[index]);
    setShowAdvanced(true);
  };

  const handleDelete = async (index: number) => {
    const variantToDelete = variants[index];
    if (!confirm(`Are you sure you want to delete variant "${variantToDelete.packageName}"?`))
      return;
    try {
      await apiService.deleteVariant(variantToDelete.variantId);
      setVariants(variants.filter((_, i) => i !== index));
    } catch (err) {
      console.error(err);
      alert("Failed to delete variant");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-h-[90vh] overflow-y-auto w-[700px]">
        <h2 className="text-xl font-semibold mb-4">Manage Product Variants</h2>

        {variants.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Existing Variants</h3>
            <table className="w-full border-collapse text-black">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2">Package Name</th>
                  <th className="border p-2">UPC</th>
                  <th className="border p-2">Unit Price</th>
                  <th className="border p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v, i) => (
                  <tr key={v.variantId}>
                    <td className="border p-2">{v.packageName}</td>
                    <td className="border p-2">{v.upc}</td>
                    <td className="border p-2">{v.unitPrice}</td>
                    <td className="border p-2 flex gap-2">
                      <button
                        className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        onClick={() => handleEdit(i)}
                      >
                        Update
                      </button>
                      <button
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                        onClick={() => handleDelete(i)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Variant form */}
        <div className="space-y-3">
          <h3 className="font-semibold">{editingIndex !== null ? "Edit Variant" : "Add New Variant"}</h3>

          <div>
            <label className="block font-medium">Package Name</label>
            <input
              name="packageName"
              value={currentVariant.packageName || ""}
              onChange={handleChange}
              className="border w-full p-2 rounded"
            />
          </div>

          <div>
            <label className="block font-medium">Unit Price *</label>
            <input
              name="unitPrice"
              type="number"
              value={currentVariant.unitPrice}
              onChange={handleChange}
              className="border w-full p-2 rounded"
            />
            {errors.unitPrice && <p className="text-red-500">{errors.unitPrice}</p>}
          </div>

          <div>
            <label className="block font-medium">UPC</label>
            <input
              name="upc"
              value={currentVariant.upc || ""}
              onChange={handleChange}
              className="border w-full p-2 rounded"
            />
          </div>

          <div>
            <label className="block font-medium">Thumbnail Image URL</label>
            <input
              name="thumbnailImageUrl"
              value={currentVariant.thumbnailImageUrl || ""}
              onChange={handleChange}
              className="border w-full p-2 rounded"
            />
          </div>

          <div>
            <label className="block font-medium">Full Size Image URL</label>
            <input
              name="fullSizeImageUrl"
              value={currentVariant.fullSizeImageUrl || ""}
              onChange={handleChange}
              className="border w-full p-2 rounded"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="mt-2 text-blue-600 underline"
          >
            {showAdvanced ? "Hide Advanced Details" : "Show Advanced Details"}
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-2 border-t pt-2">
              {[
                { label: "Shelf Life (Days)", name: "shelfLifeDays" },
                { label: "Alcohol By Volume", name: "alcoholByVolume" },
                { label: "Weight (grams)", name: "weightGrams" },
                { label: "Calories", name: "calories" },
                { label: "Carbs", name: "carbs" },
                { label: "IBU Value", name: "ibuValue" },
                { label: "Sugars", name: "sugars" },
                { label: "Added Sugars", name: "addedSugars" },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block font-medium">{field.label}</label>
                  <input
                    name={field.name}
                    type="number"
                    value={(currentVariant as any)[field.name] || ""}
                    onChange={handleChange}
                    className="border w-full p-2 rounded"
                  />
                </div>
              ))}

              <div>
                <label className="block font-medium">Dimensions (cm)</label>
                <input
                  name="dimensionsCm"
                  value={currentVariant.dimensionsCm || ""}
                  onChange={handleChange}
                  className="border w-full p-2 rounded"
                />
              </div>

              <div>
                <label className="block font-medium">Storage Instructions</label>
                <input
                  name="storageInstructions"
                  value={currentVariant.storageInstructions || ""}
                  onChange={handleChange}
                  className="border w-full p-2 rounded"
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            {editingIndex !== null ? "Update Variant" : "Add Variant"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VariantModal;
