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
    `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition
     ${
       isActive
         ? "bg-[rgba(255,255,255,0.96)] text-slate-950 shadow-[0_12px_30px_rgba(8,15,30,0.18)] ring-1 ring-white/60"
         : "text-slate-200/88 hover:bg-white/10 hover:text-white"
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
    <div className="admin-shell min-h-screen">
      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`sticky top-0 h-screen border-r border-white/10 bg-gradient-to-b from-[#08111f] via-[#0c1d33] to-[#102a43] text-white transition-all
          ${collapsed ? "w-20" : "w-64"}`}
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div
              className={`font-extrabold tracking-tight text-white ${
                collapsed ? "text-xs" : "text-lg"
              }`}
            >
              {collapsed ? "SE" : "Splash Admin"}
            </div>

            <button
              className="p-2 rounded-xl hover:bg-white/10"
              onClick={() => setCollapsed((s) => !s)}
              aria-label="Toggle sidebar"
            >
              <Menu size={18} className="text-slate-100" />
            </button>
          </div>

          <div className="px-4 pt-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200/70">
                Control Room
              </p>
              {!collapsed && (
                <p className="mt-2 text-sm text-slate-300">
                  Premium operations for inventory, orders, and revenue.
                </p>
              )}
            </div>
          </div>

          <nav className="p-3 space-y-1.5">
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
          <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/72 backdrop-blur-xl">
            <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="section-kicker">
                  Admin Dashboard
                </span>
                <span className="text-xs text-slate-500">
                  {location.pathname.replace("/admin", "") || "/overview"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Search (just visual for now) */}
                <input
                  placeholder="Search in admin…"
                  className="hidden md:block w-64 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-400"
                />

                {/* Order notifications */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setNotifOpen((o) => !o)}
                    className="relative h-10 w-10 rounded-full border border-slate-200 bg-white/90 hover:bg-white flex items-center justify-center"
                    aria-label="Order notifications"
                  >
                    <Bell size={18} className="text-slate-700" />
                    {notificationCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-600 text-white text-[11px] leading-[18px] text-center px-1 font-bold">
                        {notificationCount > 99 ? "99+" : notificationCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white/95 shadow-xl text-sm z-40 overflow-hidden backdrop-blur">
                      <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                        <div className="font-semibold text-slate-900">
                          New Orders
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={markAllNotificationsRead}
                            className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                          >
                            Mark all read
                          </button>
                          <button
                            type="button"
                            onClick={openOrdersFromNotif}
                            className="text-xs font-semibold text-cyan-700 hover:text-cyan-900"
                          >
                            Open Orders
                          </button>
                        </div>
                      </div>

                      {newOrders.length === 0 ? (
                        <div className="px-3 py-4 text-slate-500 text-xs">
                          No new orders since last check.
                        </div>
                      ) : (
                        <div className="max-h-80 overflow-y-auto">
                          {newOrders.map((o) => (
                            <button
                              key={o._id}
                              type="button"
                              onClick={openOrdersFromNotif}
                              className="w-full text-left px-3 py-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                            >
                              <div className="font-semibold text-slate-900">
                                {o.orderNo}
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                {new Date(o.createdAt).toLocaleString()}
                              </div>
                              <div className="text-xs text-slate-700 mt-1">
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
                    className="flex items-center gap-2 rounded-full px-1 py-1 hover:bg-slate-100"
                  >
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-cyan-500 to-slate-900 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                      {initials}
                    </div>
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-slate-200 bg-white/95 shadow-lg text-sm z-40 backdrop-blur">
                      <div className="px-3 py-2 border-b border-slate-200">
                        <div className="font-semibold text-slate-900">
                          {user?.name || "Admin"}
                        </div>
                        {user?.email && (
                          <div className="text-[11px] text-slate-500 break-all">
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
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-slate-700"
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
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-slate-700"
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
