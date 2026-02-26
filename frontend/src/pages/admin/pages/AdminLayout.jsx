// src/pages/admin/pages/AdminLayout.jsx
import React, { useContext, useMemo, useState } from "react";
import {
  Routes,
  Route,
  NavLink,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";

import {
  LayoutDashboard,
  Package,
  Shapes,
  ShoppingCart,
  Boxes,
  Users,
  TicketPercent,
  BarChart3,
  LineChart,
  Settings as SettingsIcon,
  Menu,
  Home,
  LogOut,
} from "lucide-react";

import AdminOverview from "./AdminOverview";
import AdminProducts from "./AdminProducts";
import AdminOrders from "./AdminOrders";
import AdminInventory from "./AdminInventory";
import AdminCustomers from "./AdminCustomers";
import AdminCoupons from "./AdminCoupons";
import AdminAnalytics from "./AdminAnalytics";
import AdminForecasting from "./AdminForecasting";
import AdminSettings from "./AdminSettings";
import AdminCategories from "./AdminCategories";

import { UserContext } from "../../context/UserContext";

const navItems = [
  { to: "/admin/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/categories", label: "Categories", icon: Shapes },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/inventory", label: "Inventory", icon: Boxes },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/coupons", label: "Coupons", icon: TicketPercent },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/forecasting", label: "Forecasting", icon: LineChart },
  { to: "/admin/settings", label: "Settings", icon: SettingsIcon },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const { user, logout } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();

  const initials = useMemo(() => {
    if (!user?.name) return "SE"; // Splash Electronics fallback
    const parts = user.name.trim().split(" ");
    const first = parts[0]?.[0] || "";
    const second = parts[1]?.[0] || "";
    return (first + second).toUpperCase();
  }, [user]);

  const linkClass = (isActive) =>
    `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition
     ${isActive ? "bg-indigo-50 text-indigo-700" : "text-gray-700 hover:bg-gray-50"}`;

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
            >
              <Menu size={18} />
            </button>
          </div>

          <nav className="p-2 space-y-1">
            {navItems.map((item) => {
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

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Top bar */}
          <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
            <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-500">
                  Admin Dashboard
                </span>
                <span className="text-xs text-gray-400">
                  {location.pathname.replace("/admin", "") || "/overview"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Search (just visual for now) */}
                <input
                  placeholder="Search in admin…"
                  className="hidden md:block w-64 rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                />

                {/* User avatar + dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((o) => !o)}
                    className="flex items-center gap-2 rounded-full px-1 py-1 hover:bg-gray-100"
                  >
                    <div className="h-9 w-9 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                      {initials}
                    </div>
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-52 rounded-xl border bg-white shadow-lg text-sm z-40">
                      <div className="px-3 py-2 border-b">
                        <div className="font-semibold text-gray-900">
                          {user?.name || "Admin"}
                        </div>
                        {user?.email && (
                          <div className="text-[11px] text-gray-500 break-all">
                            {user.email}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigate("/");
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-700"
                      >
                        <Home size={16} />
                        <span>Back to store</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          logout();
                          navigate("/");
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-red-600"
                      >
                        <LogOut size={16} />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Admin pages */}
          <main className="p-4 sm:p-6">
            <Routes>
              <Route path="/" element={<Navigate to="/admin/overview" replace />} />
              <Route path="/overview" element={<AdminOverview />} />
              <Route path="/products" element={<AdminProducts />} />
              <Route path="/categories" element={<AdminCategories />} />
              <Route path="/orders" element={<AdminOrders />} />
              <Route path="/inventory" element={<AdminInventory />} />
              <Route path="/customers" element={<AdminCustomers />} />
              <Route path="/coupons" element={<AdminCoupons />} />
              <Route path="/analytics" element={<AdminAnalytics />} />
              <Route path="/forecasting" element={<AdminForecasting />} />
              <Route path="/settings" element={<AdminSettings />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}
