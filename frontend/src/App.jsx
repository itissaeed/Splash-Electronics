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
import Compare from "./pages/Compare";
import Profile from "./pages/Profile";
import AdminLayout from "./pages/admin/pages/AdminLayout";


import "./index.css";
import { UserProvider } from "./pages/context/UserContext";
import { ThemeProvider } from "./pages/context/ThemeContext";
import AdminRoute from "./pages/admin/AdminRoutes";
import ProtectedRoute from "./pages/ProtectedRoute";
import CustomerRoute from "./pages/CustomerRoute";
import ThemeToggle from "./ThemeToggle";
import CompareBar from "./components/CompareBar";

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
          <Route path="/compare" element={<Compare />} />

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* Cart & Orders */}
          <Route
            path="/cart"
            element={
              <CustomerRoute>
                <Cart />
              </CustomerRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <CustomerRoute>
                <Checkout />
              </CustomerRoute>
            }
          />
          <Route
            path="/order-success/:orderNo"
            element={
              <CustomerRoute>
                <OrderSuccess />
              </CustomerRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <CustomerRoute>
                <MyOrders />
              </CustomerRoute>
            }
          />
          <Route
            path="/order/:orderNo"
            element={
              <CustomerRoute>
                <OrderDetails />
              </CustomerRoute>
            }
          />


          {/* User protected (examples) */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <CustomerRoute>
                  <Profile />
                </CustomerRoute>
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
          <CompareBar />
        </UserProvider>
        <ThemeToggle />
      </div>
    </ThemeProvider>
  );
}

export default App;
