import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/SignUp";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import ProductList from "./pages/ProductList";
import AdminProductPage from "./pages/Admin";
import "./index.css";
import { UserProvider } from "./pages/context/UserContext";
import AdminRoute from "./pages/AdminRoutes";

function App() {
  return (
    <div className="App">
      <UserProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/products" element={<ProductList />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminProductPage />
              </AdminRoute>
            }
          />
        </Routes>
      </UserProvider>
    </div>
  );
}

export default App;