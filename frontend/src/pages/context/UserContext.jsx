import React, { createContext, useState, useEffect } from "react";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Load auth state on app start
  useEffect(() => {
    const storedUser = localStorage.getItem("userInfo");
    const storedToken = localStorage.getItem("token");

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }

    setAuthLoading(false);
  }, []);

  const login = (userData, jwtToken) => {
    localStorage.setItem("userInfo", JSON.stringify(userData));
    localStorage.setItem("token", jwtToken);
    setUser(userData);
    setToken(jwtToken);
  };

  const logout = () => {
    localStorage.removeItem("userInfo");
    localStorage.removeItem("token");
    setUser(null);
    setToken(null);
  };

  return (
    <UserContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        authLoading, // 🔥 important
        isAuthenticated: !!user,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
