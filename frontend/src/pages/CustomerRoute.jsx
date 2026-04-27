import React, { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { UserContext } from "./context/UserContext";
import { isAdminUser } from "../utils/auth";

export default function CustomerRoute({ children }) {
  const { user, authLoading } = useContext(UserContext);
  const location = useLocation();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (isAdminUser(user)) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}
