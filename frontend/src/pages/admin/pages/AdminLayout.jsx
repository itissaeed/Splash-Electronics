// src/pages/admin/pages/AdminLayout.jsx
import React, { useMemo, useState } from "react";
import { Routes, Route, NavLink, Navigate, Link } from "react-router-dom";
import {
  FaHome,
  FaTachometerAlt,
  FaBox,
  FaShoppingCart,
  FaBoxes,
  FaUsers,
  FaTags,
  FaChartBar,
  FaChartLine,
  FaCog,
  FaBars,
} from "react-icons/fa";

import AdminOverview from "./AdminOverview";
import AdminProducts from "./AdminProducts";
import AdminOrders from "./AdminOrders";
import AdminInventory from "./AdminInventory";
import AdminCustomers from "./AdminCustomers";
import AdminCoupons from "./AdminCoupons";
import AdminAnalytics from "./AdminAnalytics";
import AdminForecasting from "./AdminForecasting";

const nav = [
  { to: "/", label: "Store Home", icon: FaHome, external: true }, // ✅ go back to site
  { to: "/admin/overview", label: "Overview", icon: FaTachometerAlt },
  { to: "/admin/products", label: "Products", icon: FaBox },
  { to: "/admin/orders", label: "Orders", icon: FaShoppingCart },
  { to: "/admin/inventory", label: "Inventory", icon: FaBoxes },
  { to: "/admin/customers", label: "Customers", icon: FaUsers },
  { to: "/admin/coupons", label: "Coupons", icon: FaTags },
  { to: "/admin/analytics", label: "Analytics", icon: FaChartBar },
  { to: "/admin/forecasting", label: "Forecasting", icon: FaChartLine },
  { to: "/admin/settings", label: "Settings", icon: FaCog },
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
            <Link
              to="/admin/overview"
              className={`font-extrabold text-gray-900 ${
                collapsed ? "text-xs" : "text-lg"
              }`}
              title="Go to Admin Overview"
            >
              {collapsed ? "SE" : "Splash Admin"}
            </Link>

            <button
              className="p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setCollapsed((s) => !s)}
              aria-label="Toggle sidebar"
              type="button"
            >
              <FaBars size={18} />
            </button>
          </div>

          <nav className="p-2 space-y-1">
            {nav.map((item) => {
              const Icon = item.icon;

              // ✅ Store/Home link shouldn't highlight like NavLink
              if (item.external) {
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                  >
                    <Icon size={18} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              }

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

          {/* Bottom area */}
          <div className="absolute bottom-0 left-0 right-0 p-3 border-t bg-white">
            <div className="text-xs text-gray-500">
              {!collapsed ? "Splash Electronics Admin" : "Admin"}
            </div>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Topbar */}
          <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
            <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
              <div className="font-bold text-gray-900">Admin Dashboard</div>

              <div className="flex items-center gap-2">
                {/* ✅ Always visible home button */}
                <Link
                  to="/"
                  className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  ← Back to Store
                </Link>

                <input
                  placeholder="Search in admin…"
                  className="hidden md:block w-80 rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                />

                <div
                  className="h-9 w-9 rounded-full bg-gray-200"
                  title="Admin"
                />
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
