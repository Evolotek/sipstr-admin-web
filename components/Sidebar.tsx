"use client"
import type { AdminSession } from "../app"

interface SidebarProps {
  activeModule: string
  onModuleChange: (module: any) => void
  isOpen: boolean
  onToggle: () => void
  session: AdminSession
  onLogout: () => void
}

const MODULES = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "users", label: "Users", icon: "👥" },
  { id: "orders", label: "Orders", icon: "📦" },
  { id: "products", label: "Products", icon: "🛍️" },
  { id: "brands", label: "Brands", icon: "🏷️" },
  { id: "categories", label: "Categories", icon: "📂" },
  { id: "stores", label: "Stores", icon: "🏪" },
  { id: "roles", label: "Roles", icon: "🔐" },
  { id: "top-picks", label: "Top Picks", icon: "⭐" },
  { id: "reports", label: "Reports", icon: "📈" },
]

export function Sidebar({ activeModule, onModuleChange, isOpen, onToggle, session, onLogout }: SidebarProps) {
  return (
    <>
      <aside
        style={{
          width: isOpen ? "250px" : "0",
          backgroundColor: "#333",
          color: "white",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.3s ease",
          overflow: "hidden",
          borderRight: "1px solid #222",
        }}
      >
        <div
          style={{
            padding: "20px",
            borderBottom: "1px solid #444",
            minHeight: "60px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: "bold",
              color: "#FF6600",
            }}
          >
            Admin
          </h1>
        </div>

        <nav
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px 0",
          }}
        >
          {MODULES.map((module) => (
            <button
              key={module.id}
              onClick={() => onModuleChange(module.id)}
              style={{
                width: "100%",
                padding: "12px 20px",
                backgroundColor: activeModule === module.id ? "#FF6600" : "transparent",
                color: "white",
                border: "none",
                textAlign: "left",
                cursor: "pointer",
                fontSize: "14px",
                transition: "background-color 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
              onMouseEnter={(e) => {
                if (activeModule !== module.id) {
                  e.currentTarget.style.backgroundColor = "#444"
                }
              }}
              onMouseLeave={(e) => {
                if (activeModule !== module.id) {
                  e.currentTarget.style.backgroundColor = "transparent"
                }
              }}
            >
              <span>{module.icon}</span>
              <span>{module.label}</span>
            </button>
          ))}
        </nav>

        <div
          style={{
            borderTop: "1px solid #444",
            padding: "12px 20px",
          }}
        >
          <button
            onClick={onLogout}
            style={{
              width: "100%",
              padding: "10px",
              backgroundColor: "#FF6600",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      {isOpen && (
        <button
          onClick={onToggle}
          style={{
            position: "fixed",
            top: "16px",
            left: "16px",
            zIndex: 1000,
            backgroundColor: "#FF6600",
            color: "white",
            border: "none",
            width: "40px",
            height: "40px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "20px",
          }}
        >
          ✕
        </button>
      )}

      {!isOpen && (
        <button
          onClick={onToggle}
          style={{
            position: "fixed",
            top: "16px",
            left: "16px",
            zIndex: 1000,
            backgroundColor: "#FF6600",
            color: "white",
            border: "none",
            width: "40px",
            height: "40px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "20px",
          }}
        >
          ☰
        </button>
      )}
    </>
  )
}
