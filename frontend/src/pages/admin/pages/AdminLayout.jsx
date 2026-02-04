import React, { useMemo, useState } from "react";
import { Routes, Route, NavLink, Navigate } from "react-router-dom";

import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Boxes,
  Users,
  TicketPercent,
  BarChart3,
  LineChart,
  Settings,
  Menu,
} from "lucide-react";

import AdminOverview from "./AdminOverview";
import AdminProducts from "./AdminProducts";
import AdminOrders from "./AdminOrders";
import AdminInventory from "./AdminInventory";
import AdminCustomers from "./AdminCustomers";
import AdminCoupons from "./AdminCoupons";
import AdminAnalytics from "./AdminAnalytics";
import AdminForecasting from "./AdminForecasting";

const nav = [
  { to: "/admin/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/inventory", label: "Inventory", icon: Boxes },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/coupons", label: "Coupons", icon: TicketPercent },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/forecasting", label: "Forecasting", icon: LineChart },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);

  const linkClass = useMemo(
    () => (isActive) =>
      `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition
       ${isActive ? "bg-indigo-50 text-indigo-700" : "text-gray-700 hover:bg-gray-50"}`,
    []
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`sticky top-0 h-screen border-r bg-white transition-all
          ${collapsed ? "w-20" : "w-64"}`}
        >
          <div className="flex items-center justify-between p-4 border-b">
            <div
              className={`font-extrabold text-gray-900 ${
                collapsed ? "text-xs" : "text-lg"
              }`}
            >
              {collapsed ? "SE" : "Splash Admin"}
            </div>

            <button
              className="p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setCollapsed((s) => !s)}
              aria-label="Toggle sidebar"
              type="button"
            >
              <Menu size={18} />
            </button>
          </div>

          <nav className="p-2 space-y-1">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => linkClass(isActive)}
                >
                  <Icon size={18} />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Topbar */}
          <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
            <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
              <div className="font-bold text-gray-900">Admin Dashboard</div>

              <div className="flex items-center gap-2">
                <input
                  placeholder="Search in admin…"
                  className="hidden md:block w-80 rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <div className="h-9 w-9 rounded-full bg-gray-200" />
              </div>
            </div>
          </header>

          {/* Routes */}
          <main className="p-4 sm:p-6">
            <Routes>
              <Route path="/" element={<Navigate to="/admin/overview" replace />} />
              <Route path="/overview" element={<AdminOverview />} />
              <Route path="/products" element={<AdminProducts />} />
              <Route path="/orders" element={<AdminOrders />} />
              <Route path="/inventory" element={<AdminInventory />} />
              <Route path="/customers" element={<AdminCustomers />} />
              <Route path="/coupons" element={<AdminCoupons />} />
              <Route path="/analytics" element={<AdminAnalytics />} />
              <Route path="/forecasting" element={<AdminForecasting />} />
              <Route
                path="/settings"
                element={
                  <div className="bg-white border rounded-2xl p-6">
                    Settings coming soon
                  </div>
                }
              />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}
