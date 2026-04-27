import React, { createContext, useState, useEffect } from "react";
import api from "../../utils/api";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const clearAuthState = () => {
    localStorage.removeItem("userInfo");
    localStorage.removeItem("token");
    setUser(null);
    setToken(null);
  };

  // Load auth state on app start
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    let cancelled = false;

    const loadAuthState = async () => {
      if (!storedToken) {
        if (localStorage.getItem("userInfo")) {
          clearAuthState();
        }
        if (!cancelled) setAuthLoading(false);
        return;
      }

      setToken(storedToken);

      try {
        const { data } = await api.get("/auth/me", {
          headers: { Authorization: `Bearer ${storedToken}` },
        });

        if (cancelled) return;

        const nextUser = data?.user || null;
        if (!nextUser) {
          clearAuthState();
        } else {
          localStorage.setItem("userInfo", JSON.stringify(nextUser));
          setUser(nextUser);
        }
      } catch (error) {
        console.error("Failed to restore auth state from server", error);
        if (!cancelled) {
          clearAuthState();
        }
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    };

    loadAuthState();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = (userData, jwtToken) => {
    localStorage.setItem("userInfo", JSON.stringify(userData));
    localStorage.setItem("token", jwtToken);
    setUser(userData);
    setToken(jwtToken);
  };

  const logout = () => {
    clearAuthState();
  };

  const updateUser = (nextUser) => {
    if (!nextUser) return;
    localStorage.setItem("userInfo", JSON.stringify(nextUser));
    setUser(nextUser);
  };

  return (
    <UserContext.Provider
      value={{
        user,
        token,
        login,
        updateUser,
        logout,
        authLoading, // 🔥 important
        isAuthenticated: !!user,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
