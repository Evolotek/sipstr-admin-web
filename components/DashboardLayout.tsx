"use client"

import { useState } from "react"
import type { AdminSession } from "../app"

import { Sidebar } from "./Sidebar" // Assuming Sidebar is a named export for structure
import{ UsersModule } from "./UsersModule"
import{ OrdersModule }from "./OrdersModule"
import ProductsModule from "./ProductsModule"
import{ BCPModule }from "./BrandsModule"
import{ CouponsModule }from "./CouponModule"
import{ StoresModule }from "./StoresModule"
import{ RolesModule }from "./RolesModule"
import{ TopPicksModule }from "./TopPicksModule"
import{ ReportsModule }from "./ReportsModule"
import DeliveryZonesPage from "./Delivery"
import { SubstituteModule } from "./SubstituteModule"

interface DashboardLayoutProps {
  session: AdminSession
  onLogout: () => void
}

type ModuleType =
  | "dashboard"
  | "users"
  |  "substitute"
  | "orders"
  | "products"
  | "brands"
  | "coupon"
  | "stores"
  | "roles"
  | "top-picks"
  | "reports"
  |  "zones"

export function DashboardLayout({ session, onLogout }: DashboardLayoutProps) {
  const [activeModule, setActiveModule] = useState<ModuleType>("dashboard")
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const renderModule = () => {
    switch (activeModule) {
      case "users":
        return <UsersModule />
      case "substitute":
        return <SubstituteModule />
      case "orders":
        return <OrdersModule />
      case "zones":
        return <DeliveryZonesPage />
      case "products":
        return <ProductsModule />
      case "brands":
        return <BCPModule />
      case "coupon":
        return <CouponsModule />
      case "stores":
        return <StoresModule />
      case "roles":
        return <RolesModule />
      case "top-picks":
        return <TopPicksModule />
      case "reports":
        return <ReportsModule />
      default:
        return <DashboardHome />
    }
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        backgroundColor: "#f5f5f5",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <Sidebar
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        session={session}
        onLogout={onLogout}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          marginLeft: sidebarOpen ? "0" : "50px", // <-- shift content right when sidebar open
          transition: "margin-left 0.3s ease",      // smooth transition
        }}
      >
        <header
          style={{
            backgroundColor: "white",
            borderBottom: "1px solid #e0e0e0",
            padding: "16px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "20px",
              fontWeight: "600",
              color: "#333",
              textTransform: "capitalize",
            }}
          >
            {activeModule === "dashboard" ? "Dashboard" : activeModule.replace("-", " ")}
          </h2>
          <div style={{ fontSize: "14px", color: "#666" }}>{session.email}</div>
        </header>

        <main
          style={{
            flex: 1,
            overflow: "auto",
            padding: "24px",
          }}
        >
          {renderModule()}
        </main>
      </div>
    </div>
  )
}

function DashboardHome() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: "20px",
      }}
    >
      {[
        { title: "Total Users", value: "1,234", color: "#FF6600" },
        { title: "Total Orders", value: "5,678", color: "#FF6600" },
        { title: "Total Products", value: "342", color: "#FF6600" },
        { title: "Total Stores", value: "28", color: "#FF6600" },
      ].map((stat, idx) => (
        <div
          key={idx}
          style={{
            backgroundColor: "white",
            padding: "24px",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            borderLeft: `4px solid ${stat.color}`,
          }}
        >
          <p style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#666" }}>{stat.title}</p>
          <p style={{ margin: 0, fontSize: "32px", fontWeight: "bold", color: "#333" }}>{stat.value}</p>
        </div>
      ))}
    </div>
  )
}
