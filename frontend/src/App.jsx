import React from "react";
import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/SignUp";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

import ProductList from "./pages/ProductList";
import ProductDetails from "./pages/ProductDetails";
import SmartAdvisor from "./pages/SmartAdvisor";
import Profile from "./pages/Profile";
import AdminLayout from "./pages/admin/pages/AdminLayout";


import "./index.css";
import { UserProvider } from "./pages/context/UserContext";
import { ThemeProvider } from "./pages/context/ThemeContext";
import AdminRoute from "./pages/admin/AdminRoutes";
import ProtectedRoute from "./pages/ProtectedRoute";
import ThemeToggle from "./ThemeToggle";

import Cart from "./pages/cart/Cart";
import Checkout from "./pages/cart/Checkout";
import OrderSuccess from "./pages/cart/OrderSuccess";
import OrderDetails from "./pages/cart/OrderDetails";
import MyOrders from "./pages/orders/MyOrders";



function App() {
  return (
    <ThemeProvider>
      <div className="App min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
        <UserProvider>
          <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<ProductList />} />
          <Route path="/product/:slug" element={<ProductDetails />} />
          <Route path="/advisor" element={<SmartAdvisor />} />

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* Cart & Orders */}
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-success/:orderNo" element={<OrderSuccess />} />
          <Route path="/orders" element={<MyOrders />} />
          <Route path="/order/:orderNo" element={<OrderDetails />} />


          {/* User protected (examples) */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Admin */}
          <Route
            path="/admin/*"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          />

          </Routes>
        </UserProvider>
        <ThemeToggle />
      </div>
    </ThemeProvider>
  );
}

export default App;
