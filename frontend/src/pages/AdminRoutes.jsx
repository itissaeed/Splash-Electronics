import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { UserContext } from "./context/UserContext";

export default function AdminRoute({ children }) {
  const { user } = useContext(UserContext);

  // Not logged in
  if (!user) return <Navigate to="/login" />;

  // Logged in but not admin
  if (!user.isAdmin) return <Navigate to="/" />;

  // Admin is allowed
  return children;
}
