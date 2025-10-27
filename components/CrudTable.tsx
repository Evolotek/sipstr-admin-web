// "use client"

// interface CrudTableProps {
//   columns: string[]
//   data: Array<{
//     id: string
//     cells: (string | number)[]
//     actions?: Array<{ label: string; onClick: () => void }>
//   }>
//   loading: boolean
// }

// export function CrudTable({ columns, data, loading }: CrudTableProps) {
//   return (
//     <div
//       style={{
//         backgroundColor: "white",
//         borderRadius: "8px",
//         boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
//         overflow: "hidden",
//       }}
//     >
//       <table
//         style={{
//           width: "100%",
//           borderCollapse: "collapse",
//         }}
//       >
//         <thead>
//           <tr style={{ backgroundColor: "#f5f5f5", borderBottom: "1px solid #e0e0e0" }}>
//             {columns.map((col, idx) => (
//               <th
//                 key={idx}
//                 style={{
//                   padding: "12px",
//                   textAlign: "left",
//                   fontSize: "14px",
//                   fontWeight: "600",
//                   color: "#333",
//                 }}
//               >
//                 {col}
//               </th>
//             ))}
//           </tr>
//         </thead>
//         {/* <tbody>
//           {loading ? (
//             <tr>
//               <td colSpan={columns.length} style={{ padding: "20px", textAlign: "center", color: "#666" }}>
//                 Loading...
//               </td>
//             </tr>
//           ) : data.length === 0 ? (
//             <tr>
//               <td colSpan={columns.length} style={{ padding: "20px", textAlign: "center", color: "#666" }}>
//                 No data available
//               </td>
//             </tr>
//           ) : (
//             data.map((row) => (
//               <tr key={row.id} style={{ borderBottom: "1px solid #e0e0e0" }}>
//                 {row.cells.map((cell, idx) => (
//                   <td
//                     key={idx}
//                     style={{
//                       padding: "12px",
//                       fontSize: "14px",
//                       color: "#333",
//                     }}
//                   >
//                     {cell}
//                   </td>
//                 ))}
//                 {row.actions && row.actions.length > 0 && (
//                   <td style={{ padding: "12px", fontSize: "14px" }}>
//                     <div style={{ display: "flex", gap: "8px" }}>
//                       {row.actions.map((action, idx) => (
//                         <button
//                           key={idx}
//                           onClick={action.onClick}
//                           style={{
//                             padding: "6px 12px",
//                             backgroundColor: "#FF6600",
//                             color: "white",
//                             border: "none",
//                             borderRadius: "4px",
//                             cursor: "pointer",
//                             fontSize: "12px",
//                             fontWeight: "500",
//                           }}
//                         >
//                           {action.label}
//                         </button>
//                       ))}
//                     </div>
//                   </td>
//                 )}
//               </tr>
//             ))
//           )}
//         </tbody> */}
//         <tbody>
//   {loading ? (
//     <tr key="loading">
//       <td colSpan={columns.length} style={{ padding: "20px", textAlign: "center", color: "#666" }}>
//         Loading...
//       </td>
//     </tr>
//   ) : data.length === 0 ? (
//     <tr key="empty">
//       <td colSpan={columns.length} style={{ padding: "20px", textAlign: "center", color: "#666" }}>
//         No data available
//       </td>
//     </tr>
//   ) : (
//     data.map((row) => (
//       <tr key={row.id} style={{ borderBottom: "1px solid #e0e0e0" }}>
//         {row.cells.map((cell, idx) => (
//           <td
//             key={idx}
//             style={{
//               padding: "12px",
//               fontSize: "14px",
//               color: "#333",
//             }}
//           >
//             {cell}
//           </td>
//         ))}
//         {row.actions && row.actions.length > 0 && (
//           <td style={{ padding: "12px", fontSize: "14px" }}>
//             <div style={{ display: "flex", gap: "8px" }}>
//               {row.actions.map((action, idx) => (
//                 <button
//                   key={idx}
//                   onClick={action.onClick}
//                   style={{
//                     padding: "6px 12px",
//                     backgroundColor: "#FF6600",
//                     color: "white",
//                     border: "none",
//                     borderRadius: "4px",
//                     cursor: "pointer",
//                     fontSize: "12px",
//                     fontWeight: "500",
//                   }}
//                 >
//                   {action.label}
//                 </button>
//               ))}
//             </div>
//           </td>
//         )}
//       </tr>
//     ))
//   )}
// </tbody>

//       </table>
//     </div>
//   )
// }

"use client"

interface CrudTableProps {
  columns: string[]
  data: Array<{
    id?: string
    cells: (string | number)[]
    actions?: Array<{ label: string; onClick: () => void }>
  }>
  loading: boolean
}

export function CrudTable({ columns, data, loading }: CrudTableProps) {
  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "8px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        overflow: "hidden",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
        }}
      >
        <thead>
          <tr style={{ backgroundColor: "#f5f5f5", borderBottom: "1px solid #e0e0e0" }}>
            {columns.map((col, idx) => (
              <th
                key={idx}
                style={{
                  padding: "12px",
                  textAlign: "left",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#333",
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr key="loading">
              <td colSpan={columns.length} style={{ padding: "20px", textAlign: "center", color: "#666" }}>
                Loading...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr key="empty">
              <td colSpan={columns.length} style={{ padding: "20px", textAlign: "center", color: "#666" }}>
                No data available
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => {
              // defensive unique key: prefer provided id, otherwise fallback to row index
              const rowKey = row.id && row.id !== "" ? row.id : `row-${rowIdx}`;

              return (
                <tr key={rowKey} style={{ borderBottom: "1px solid #e0e0e0" }}>
                  {row.cells.map((cell, cellIdx) => (
                    // include rowIdx in key to avoid duplicate keys across different rows/cells
                    <td
                      key={`r${rowIdx}-c${cellIdx}`}
                      style={{
                        padding: "12px",
                        fontSize: "14px",
                        color: "#333",
                      }}
                    >
                      {cell}
                    </td>
                  ))}

                  {row.actions && row.actions.length > 0 && (
                    <td style={{ padding: "12px", fontSize: "14px" }}>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {row.actions.map((action, actionIdx) => (
                          <button
                            key={`r${rowIdx}-a${actionIdx}`}
                            onClick={action.onClick}
                            style={{
                              padding: "6px 12px",
                              backgroundColor: "#FF6600",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "500",
                            }}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
