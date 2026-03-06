// src/pages/admin/pages/AdminLayout.jsx
import React, { useContext, useEffect, useMemo, useState } from "react";
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
  User,
  TicketPercent,
  BarChart3,
  LineChart,
  RotateCcw,
  Settings as SettingsIcon,
  Bell,
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
import AdminReturns from "./AdminReturns";
import AdminProfile from "./AdminProfile";

import { UserContext } from "../../context/UserContext";
import api from "../../../utils/api";

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
  { to: "/admin/returns", label: "Returns", icon: RotateCcw },
  { to: "/admin/profile", label: "Profile", icon: User },
  { to: "/admin/settings", label: "Settings", icon: SettingsIcon },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [newOrders, setNewOrders] = useState([]);

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
     ${
       isActive
         ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200"
         : "text-gray-700 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-800"
     }`;

  useEffect(() => {
    if (!user?.isAdmin) return;

    const key = "admin_order_notif_last_seen_at";
    const nowIso = new Date().toISOString();
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, nowIso);
    }

    let unmounted = false;

    const loadNotifications = async () => {
      try {
        const since = localStorage.getItem(key) || nowIso;
        const { data } = await api.get("/admin/orders/notifications", {
          params: { since, limit: 8 },
        });

        if (unmounted) return;

        setNotificationCount(data?.count || 0);
        setNewOrders(data?.orders || []);

      } catch (e) {
        console.error("Failed to fetch admin notifications", e);
      }
    };

    loadNotifications();
    const id = setInterval(loadNotifications, 20000);

    return () => {
      unmounted = true;
      clearInterval(id);
    };
  }, [user?.isAdmin]);

  const openOrdersFromNotif = () => {
    localStorage.setItem("admin_order_notif_last_seen_at", new Date().toISOString());
    setNotifOpen(false);
    setNotificationCount(0);
    setNewOrders([]);
    navigate("/admin/orders");
  };

  const markAllNotificationsRead = () => {
    localStorage.setItem("admin_order_notif_last_seen_at", new Date().toISOString());
    setNotificationCount(0);
    setNewOrders([]);
  };

  useEffect(() => {
    if (location.pathname === "/admin/orders") {
      localStorage.setItem("admin_order_notif_last_seen_at", new Date().toISOString());
      setNotificationCount(0);
      setNewOrders([]);
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`sticky top-0 h-screen border-r bg-white dark:bg-slate-900 dark:border-slate-800 transition-all
          ${collapsed ? "w-20" : "w-64"}`}
        >
          <div className="flex items-center justify-between p-4 border-b dark:border-slate-800">
            <div
              className={`font-extrabold text-gray-900 dark:text-slate-100 ${
                collapsed ? "text-xs" : "text-lg"
              }`}
            >
              {collapsed ? "SE" : "Splash Admin"}
            </div>

            <button
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
              onClick={() => setCollapsed((s) => !s)}
              aria-label="Toggle sidebar"
            >
              <Menu size={18} className="text-gray-700 dark:text-slate-200" />
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
          <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/90 backdrop-blur border-b dark:border-slate-800">
            <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-500 dark:text-slate-300">
                  Admin Dashboard
                </span>
                <span className="text-xs text-gray-400 dark:text-slate-500">
                  {location.pathname.replace("/admin", "") || "/overview"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Search (just visual for now) */}
                <input
                  placeholder="Search in admin…"
                  className="hidden md:block w-64 rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                />

                {/* Order notifications */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setNotifOpen((o) => !o)}
                    className="relative h-10 w-10 rounded-full border bg-white hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 flex items-center justify-center"
                    aria-label="Order notifications"
                  >
                    <Bell size={18} className="text-gray-700 dark:text-slate-200" />
                    {notificationCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-600 text-white text-[11px] leading-[18px] text-center px-1 font-bold">
                        {notificationCount > 99 ? "99+" : notificationCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 shadow-lg text-sm z-40 overflow-hidden">
                      <div className="px-3 py-2 border-b dark:border-slate-700 flex items-center justify-between">
                        <div className="font-semibold text-gray-900 dark:text-slate-100">
                          New Orders
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={markAllNotificationsRead}
                            className="text-xs font-semibold text-gray-600 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200"
                          >
                            Mark all read
                          </button>
                          <button
                            type="button"
                            onClick={openOrdersFromNotif}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-300 dark:hover:text-indigo-200"
                          >
                            Open Orders
                          </button>
                        </div>
                      </div>

                      {newOrders.length === 0 ? (
                        <div className="px-3 py-4 text-gray-500 dark:text-slate-400 text-xs">
                          No new orders since last check.
                        </div>
                      ) : (
                        <div className="max-h-80 overflow-y-auto">
                          {newOrders.map((o) => (
                            <button
                              key={o._id}
                              type="button"
                              onClick={openOrdersFromNotif}
                              className="w-full text-left px-3 py-3 border-b dark:border-slate-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-slate-800"
                            >
                              <div className="font-semibold text-gray-900 dark:text-slate-100">
                                {o.orderNo}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                                {new Date(o.createdAt).toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-700 dark:text-slate-300 mt-1">
                                {o.shippingAddress?.division || "-"},{" "}
                                {o.shippingAddress?.district || "-"} - ৳
                                {Number(
                                  o.pricing?.grandTotal || 0
                                ).toLocaleString("en-BD")}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* User avatar + dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((o) => !o)}
                    className="flex items-center gap-2 rounded-full px-1 py-1 hover:bg-gray-100 dark:hover:bg-slate-800"
                  >
                    <div className="h-9 w-9 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                      {initials}
                    </div>
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-52 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 shadow-lg text-sm z-40">
                      <div className="px-3 py-2 border-b dark:border-slate-700">
                        <div className="font-semibold text-gray-900 dark:text-slate-100">
                          {user?.name || "Admin"}
                        </div>
                        {user?.email && (
                          <div className="text-[11px] text-gray-500 dark:text-slate-400 break-all">
                            {user.email}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigate("/admin/profile");
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200"
                      >
                        <User size={16} />
                        <span>Profile</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigate("/");
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200"
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
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-800 text-red-600"
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
              <Route path="/returns" element={<AdminReturns />} />
              <Route path="/profile" element={<AdminProfile />} />
              <Route path="/settings" element={<AdminSettings />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}
